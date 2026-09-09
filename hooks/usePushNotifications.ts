// hooks/usePushNotifications.ts
// Registers device push token and retries after login/app resume.

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import { registerDeviceToken } from "../services/api/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldShowAlert: true,
    } as any),
});

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined
  );
}

function routeFromNotificationData(data: Record<string, any>) {
  const type = String(data?.type ?? "").toLowerCase();
  const screen = String(data?.screen ?? "").toLowerCase();

  if (type === "queue_called" || screen === "queue") {
    return "/queue";
  }

  if (screen === "notifications") {
    return "/notifications";
  }

  if (screen === "appointments") {
    return "/appointments";
  }

  return null;
}

/**
 * Every channel id the backend can send on.
 *
 * THIS LIST MUST STAY IN SYNC WITH THE SERVER. On Android 8+ a notification
 * addressed to a channel that does not exist on the device is discarded by the
 * system -- silently. No error reaches the app, nothing is logged, and every
 * upstream signal still reports success: the backend logs "accepted by Expo",
 * Expo returns an ok ticket, and the delivery receipt reads "delivered to
 * FCM". The notification simply never appears.
 *
 * That is exactly what was happening. This app created only "queue-alerts",
 * while App\Services\Notification\NotificationService sends on four ids:
 *
 *   queue-alerts        queue position called        (worked -- channel existed)
 *   default             general notifications        (silently dropped)
 *   telemedicine-calls  incoming consultation call   (silently dropped)
 *   follow-up-reminders follow-up due                (silently dropped)
 *
 * Verified against the server on 2026-09-06 by grepping every `channelId:`
 * argument passed to ExpoPushService::sendToUser. If a new channel id is added
 * there, add it here in the same change or those notifications vanish.
 */
const ANDROID_CHANNELS: Array<{ id: string; name: string }> = [
  { id: "queue-alerts", name: "Queue Alerts" },
  { id: "default", name: "General Notifications" },
  { id: "telemedicine-calls", name: "Telemedicine Calls" },
  { id: "follow-up-reminders", name: "Follow-up Reminders" },
];

async function configureAndroidChannels() {
  if (Platform.OS !== "android") {
    return;
  }

  for (const channel of ANDROID_CHANNELS) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: channel.name,
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0F766E",
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  console.log(
    "[Ka-Agapay] Android notification channels configured:",
    ANDROID_CHANNELS.map((channel) => channel.id).join(", ")
  );
}

async function registerPushTokenOnce() {
  try {
    console.log("[Ka-Agapay] Push setup started");

    await configureAndroidChannels();

    const currentPermission = await Notifications.getPermissionsAsync();
    let finalStatus = currentPermission.status;

    if (finalStatus !== "granted") {
      const requestedPermission =
        await Notifications.requestPermissionsAsync();

      finalStatus = requestedPermission.status;
    }

    if (finalStatus !== "granted") {
      console.warn("[Ka-Agapay] Push permission not granted");
      return false;
    }

    const projectId = getProjectId();

    console.log("[Ka-Agapay] Push projectId:", projectId);

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const expoPushToken = tokenResult.data;

    console.log("[Ka-Agapay] Expo push token:", expoPushToken);

    const saved = await registerDeviceToken({
      token: expoPushToken,
      expo_push_token: expoPushToken,
      provider: "expo",
      platform: Platform.OS,
      device_name:
        Device.deviceName ??
        Device.modelName ??
        "Ka-Agapay mobile device",
    });

    console.log("[Ka-Agapay] Device token save result:", saved);

    return !!saved;
  } catch (error) {
    console.warn("[Ka-Agapay] push notification setup failed", error);
    return false;
  }
}

export function usePushNotifications() {
  const registeredRef = useRef(false);

  useEffect(() => {
    let responseSubscription: Notifications.EventSubscription | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function tryRegisterWithRetry() {
      if (registeredRef.current) {
        return;
      }

      const success = await registerPushTokenOnce();

      if (success) {
        registeredRef.current = true;
        return;
      }

      retryTimer = setTimeout(() => {
        tryRegisterWithRetry();
      }, 8000);
    }

    tryRegisterWithRetry();

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && !registeredRef.current) {
        tryRegisterWithRetry();
      }
    });

    responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<
          string,
          any
        >;

        const route = routeFromNotificationData(data);

        if (route) {
          router.push(route as any);
        }
      });

    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }

      appStateSubscription.remove();

      if (responseSubscription) {
        responseSubscription.remove();
      }
    };
  }, []);
}