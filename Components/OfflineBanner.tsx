// Components/OfflineBanner.tsx
//
// The offline outbox, as residents see it (services/offlineOutbox): a small
// strip at the top of the app that says there is no internet and what is
// waiting to be sent, and -- if the RHU's server refused something once it
// was sent -- what and why, so the resident can book again. Nothing shows
// while all is well.

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useSyncExternalStore } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tr, useLang } from "../constants/i18n";
import {
  discardRefused,
  flushOutbox,
  getOutboxSnapshot,
  startOutbox,
  subscribeOutbox,
} from "../services/offlineOutbox";

export default function OfflineBanner() {
  useEffect(() => startOutbox(), []);

  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { online, items } = useSyncExternalStore(subscribeOutbox, getOutboxSnapshot, getOutboxSnapshot);

  const waiting = items.filter((item) => item.status === "waiting");
  const refused = items.filter((item) => item.status === "refused");

  if (online && waiting.length === 0 && refused.length === 0) return null;

  function showRefused() {
    const lines = refused.map((item) => `• ${item.label}: ${item.error ?? ""}`).join("\n\n");
    Alert.alert(tr("outbox_refused_title", lang), lines, [
      { text: tr("close", lang), style: "cancel" },
      { text: tr("outbox_remove", lang), style: "destructive", onPress: () => void discardRefused() },
    ]);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      {!online ? (
        <View style={[styles.pill, styles.offline]} accessibilityRole="alert">
          <Ionicons name="cloud-offline-outline" size={16} color="#92400E" />
          <Text style={[styles.text, { color: "#92400E" }]}>
            {tr("outbox_offline", lang)}
            {waiting.length ? ` ${tr("outbox_waiting", lang).replace("{n}", String(waiting.length))}` : ""}
          </Text>
        </View>
      ) : waiting.length ? (
        <Pressable
          onPress={() => void flushOutbox()}
          style={[styles.pill, styles.waiting]}
          accessibilityRole="button"
          accessibilityHint={tr("outbox_send_now", lang)}
        >
          <Ionicons name="cloud-upload-outline" size={16} color="#1E3A8A" />
          <Text style={[styles.text, { color: "#1E3A8A" }]}>
            {tr("outbox_waiting", lang).replace("{n}", String(waiting.length))} · {tr("outbox_send_now", lang)}
          </Text>
        </Pressable>
      ) : null}

      {refused.length ? (
        <Pressable onPress={showRefused} style={[styles.pill, styles.refused]} accessibilityRole="button">
          <Ionicons name="alert-circle-outline" size={16} color="#991B1B" />
          <Text style={[styles.text, { color: "#991B1B" }]}>
            {tr("outbox_refused", lang).replace("{n}", String(refused.length))}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 1000,
    gap: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  offline: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  waiting: { backgroundColor: "#EFF6FF", borderColor: "#93C5FD" },
  refused: { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" },
  text: { flex: 1, fontSize: 13, fontWeight: "700" },
});
