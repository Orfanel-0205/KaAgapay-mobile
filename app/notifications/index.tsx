// app/notifications/index.tsx
// Ka-Agapay Mobile Resident Notifications Screen

import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  GestureResponderEvent,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tr, useLang } from "../../constants/i18n";
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type MobileNotification,
} from "../../services/api/notifications";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function isBadRoute(route: string | null | undefined): boolean {
  const value = safeString(route).trim();

  return (
    !value ||
    value === "-" ||
    value === "/-" ||
    value === "/" ||
    value === "undefined" ||
    value === "null"
  );
}

function getNotificationRoute(notification: MobileNotification): string | null {
  const anyNotification = notification as any;
  const data = (notification.data ?? {}) as Record<string, any>;

  const title = safeString(notification.title).toLowerCase();
  const message = safeString(notification.message).toLowerCase();

  const typeText = safeString(
    anyNotification.type ??
      data.type ??
      notification.related_type ??
      data.related_type ??
      data.module ??
      data.screen
  ).toLowerCase();

  const relatedType = safeString(
    notification.related_type ?? data.related_type ?? data.module
  ).toLowerCase();

  const relatedId = notification.related_id ?? data.related_id ?? data.id;

  const actionUrl = safeString(
    notification.action_url ?? data.action_url ?? data.route
  ).trim();

  const screen = safeString(data.screen).toLowerCase();

  const isQueueNotification =
    typeText.includes("queue") ||
    relatedType.includes("queue") ||
    screen === "queue" ||
    title.includes("queue") ||
    message.includes("queue ticket") ||
    message.includes("being called");

  if (isQueueNotification) {
    return "/queue";
  }

  if (!isBadRoute(actionUrl) && actionUrl.startsWith("/")) {
    return actionUrl;
  }

  if (relatedType.includes("appointment")) {
    return "/appointments";
  }

  if (relatedType.includes("consultation") && relatedId) {
    return "/consultations/" + String(relatedId);
  }

  if (relatedType.includes("consultation")) {
    return "/consultations";
  }

  if (relatedType.includes("prescription")) {
    return "/records";
  }

  if (relatedType.includes("record")) {
    return "/records";
  }

  if (relatedType.includes("telemedicine")) {
    return "/(tabs)/telemedicine";
  }

  if (relatedType.includes("event") && relatedId) {
    return "/events/" + String(relatedId);
  }

  if (relatedType.includes("event")) {
    return "/events";
  }

  if (relatedType.includes("announcement")) {
    return "/(tabs)/home";
  }

  return null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const lang = useLang();

  const [unreadOnly, setUnreadOnly] = useState(false);

  const query = useQuery({
    queryKey: ["notifications", unreadOnly],
    queryFn: () =>
      fetchNotifications({
        per_page: 30,
        unread_only: unreadOnly,
      }),
    refetchInterval: 15000,
    retry: false,
  });

  const notifications = query.data?.data ?? [];
  const unreadCount = query.data?.unread_count ?? 0;

  const unreadOnPage = useMemo(() => {
    return notifications.filter((item) => !item.read_at).length;
  }, [notifications]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["mobile-dashboard"] });
    queryClient.invalidateQueries({
      queryKey: ["mobile-unread-notification-count"],
    });
    queryClient.invalidateQueries({ queryKey: ["my-queue-ticket"] });
  };

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: invalidate,
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: invalidate,
  });

  async function openNotification(item: MobileNotification) {
    try {
      if (!item.read_at) {
        await markReadMutation.mutateAsync(item.id);
      }

      const route = getNotificationRoute(item);

      if (route) {
        router.push(route as any);
      }
    } catch {
      Alert.alert("Notification", "Unable to open this notification.");
    }
  }

  function confirmDelete(id: string) {
    Alert.alert("Delete notification", "Remove this notification?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(id),
      },
    ]);
  }

  function handleMarkRead(event: GestureResponderEvent, id: string) {
    event.stopPropagation();
    markReadMutation.mutate(id);
  }

  function handleDelete(event: GestureResponderEvent, id: string) {
    event.stopPropagation();
    confirmDelete(id);
  }

  const unreadSummary =
    String(unreadCount) +
    " unread · " +
    String(unreadOnPage) +
    " unread shown";

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 18,
          paddingBottom: 16,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: "#F1F5F9",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 30,
                fontWeight: "800",
                color: "#0F172A",
              }}
            >
              {tr("notif_title", lang)}
            </Text>

            <Text style={{ color: "#64748B", fontSize: 20, marginTop: 2 }}>
              {unreadSummary}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <TouchableOpacity
            onPress={() => setUnreadOnly(false)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: unreadOnly ? "#FFFFFF" : "#0F766E",
              borderWidth: 1,
              borderColor: unreadOnly ? "#CBD5E1" : "#0F766E",
            }}
          >
            <Text
              style={{
                color: unreadOnly ? "#0F172A" : "#FFFFFF",
                fontWeight: "800",
              }}
            >
              {tr("notif_filter_all", lang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUnreadOnly(true)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: unreadOnly ? "#0F766E" : "#FFFFFF",
              borderWidth: 1,
              borderColor: unreadOnly ? "#0F766E" : "#CBD5E1",
            }}
          >
            <Text
              style={{
                color: unreadOnly ? "#FFFFFF" : "#0F172A",
                fontWeight: "800",
              }}
            >
              {tr("notif_filter_unread", lang)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
            style={{
              marginLeft: "auto",
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 999,
              backgroundColor: "#ECFDF5",
              borderWidth: 1,
              borderColor: "#99F6E4",
              opacity: markAllMutation.isPending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#0F766E", fontWeight: "800" }}>
              {tr("notif_read_all", lang)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {query.isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#0F766E" />

          <Text style={{ color: "#64748B", marginTop: 10 }}>
            {tr("loading_notif", lang)}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => query.refetch()}
              tintColor="#0F766E"
            />
          }
          ListEmptyComponent={
            <View
              style={{
                borderWidth: 1,
                borderColor: "#CBD5E1",
                borderStyle: "dashed",
                borderRadius: 18,
                padding: 20,
                backgroundColor: "#FFFFFF",
              }}
            >
              <Text
                style={{
                  color: "#64748B",
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {tr("empty_notif", lang)}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const unread = !item.read_at;
            const isQueue =
              getNotificationRoute(item) === "/queue" ||
              safeString(item.title).toLowerCase().includes("queue");

            return (
              <TouchableOpacity
                onPress={() => openNotification(item)}
                activeOpacity={0.82}
                style={{
                  backgroundColor: unread ? "#ECFDF5" : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: unread ? "#99F6E4" : "#E5E7EB",
                  borderRadius: 18,
                  padding: 15,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      backgroundColor: unread ? "#0F766E" : "#E5E7EB",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={isQueue ? "ticket" : "notifications"}
                      size={26}
                      color={unread ? "#FFFFFF" : "#64748B"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          color: "#0F172A",
                          fontSize: 20,
                          fontWeight: "800",
                        }}
                      >
                        {item.title || "Notification"}
                      </Text>

                      {unread ? (
                        <View
                          style={{
                            backgroundColor: "#0F766E",
                            borderRadius: 999,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontSize: 17,
                              fontWeight: "800",
                            }}
                          >
                            New
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text
                      style={{
                        color: "#475569",
                        fontSize: 20,
                        lineHeight: 24,
                        marginTop: 5,
                      }}
                    >
                      {item.message || "No message."}
                    </Text>

                    <Text
                      style={{
                        color: "#94A3B8",
                        fontSize: 19,
                        marginTop: 8,
                        fontWeight: "700",
                      }}
                    >
                      {formatDate(item.created_at)}
                    </Text>

                    <View
                      style={{ flexDirection: "row", gap: 10, marginTop: 10 }}
                    >
                      {!item.read_at ? (
                        <TouchableOpacity
                          onPress={(event) => handleMarkRead(event, item.id)}
                          disabled={markReadMutation.isPending}
                          style={{
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#99F6E4",
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            borderRadius: 999,
                            opacity: markReadMutation.isPending ? 0.6 : 1,
                          }}
                        >
                          <Text
                            style={{
                              color: "#0F766E",
                              fontSize: 19,
                              fontWeight: "800",
                            }}
                          >
                            Mark read
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        onPress={(event) => handleDelete(event, item.id)}
                        disabled={deleteMutation.isPending}
                        style={{
                          backgroundColor: "#FEF2F2",
                          borderWidth: 1,
                          borderColor: "#FECACA",
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 999,
                          opacity: deleteMutation.isPending ? 0.6 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: "#B91C1C",
                            fontSize: 19,
                            fontWeight: "800",
                          }}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}