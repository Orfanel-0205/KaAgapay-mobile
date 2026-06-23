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

async function registerPushTokenOnce() {
  try {
    console.log("[Ka-Agapay] Push setup started");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("queue-alerts", {
        name: "Queue Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0F766E",
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

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