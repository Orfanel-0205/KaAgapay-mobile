// Components/DuckOverlay.tsx
//
// Doctor Quack for the moments a plain alert explains badly:
//
//   403  "Hindi ito pinapayagan sa account mo", with the server's reason
//   5xx  "May problema sa server" -- so the resident knows it isn't them
//   503  "Inaayos ang Ka-Agapay" -- full screen while the system updates;
//        it checks every 30 seconds and goes away by itself.
//
// Mounted once in app/_layout.tsx. services/api/client.ts decides when.
//
// ONE MESSAGE, NOT TWO
// Most screens already show their own Alert when a request fails. While the
// duck is on screen those Alerts are held back (installAlertGuard), otherwise
// every refusal would pop a duck AND a grey box saying the same thing.

import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { DuckKind, onDuck } from "../services/api/duckBus";
import { API_BASE_URL } from "../services/api/client";
import { useLanguageStore } from "../store/useLanguageStore";

const IMAGES: Record<DuckKind, number> = {
  forbidden: require("../assets/ducks/duck-403.png"),
  server_error: require("../assets/ducks/duck-500.png"),
  maintenance: require("../assets/ducks/duck-maintenance.png"),
};

// Pangasinan falls back to Filipino, as the rest of the app's shared text does.
const TEXT = {
  en: {
    forbidden: ["You can't do this", "Your account isn't allowed to do this. Ask your RHU if you need it."],
    server_error: [
      "Something went wrong on our side",
      "The server couldn't finish that. Please try again in a moment. If it keeps happening, tell your RHU.",
    ],
    maintenance: [
      "Ka-Agapay is under maintenance",
      "We're updating the system. The app will come back by itself when it's done -- you don't need to do anything.",
    ],
    ok: "OK",
    retry: "Check again now",
  },
  tl: {
    forbidden: ["Hindi ito pinapayagan", "Hindi pinapayagan ang account mo na gawin ito. Magtanong sa RHU kung kailangan mo ito."],
    server_error: [
      "May problema sa server",
      "Hindi natapos ang request. Subukan ulit mamaya. Kung paulit-ulit, sabihan ang RHU.",
    ],
    maintenance: [
      "Inaayos ang Ka-Agapay",
      "Ina-update namin ang system. Babalik ang app nang kusa kapag tapos na -- wala kang kailangang gawin.",
    ],
    ok: "Sige",
    retry: "Tingnan ulit",
  },
};

const MAINTENANCE_POLL_MS = 30_000;

let duckOpen = false;
let guardInstalled = false;

/** Hold back screen Alerts while a duck is already explaining the same failure. */
function installAlertGuard(): void {
  if (guardInstalled) return;
  guardInstalled = true;

  const original = Alert.alert.bind(Alert);

  Alert.alert = ((...args: Parameters<typeof Alert.alert>) => {
    if (duckOpen) return;
    original(...args);
  }) as typeof Alert.alert;
}

export default function DuckOverlay() {
  const lang = useLanguageStore((s) => s.lang);
  const t = lang === "en" ? TEXT.en : TEXT.tl;
  const queryClient = useQueryClient();

  const [dialog, setDialog] = useState<{ kind: DuckKind; message?: string } | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    installAlertGuard();

    return onDuck((event) => {
      // Set before any screen's catch block runs, so its Alert is held back.
      duckOpen = true;

      if (event.kind === "maintenance") {
        setMaintenance(true);
      } else {
        setDialog({ kind: event.kind, message: event.message });
      }
    });
  }, []);

  useEffect(() => {
    duckOpen = dialog !== null || maintenance;
  }, [dialog, maintenance]);

  const checkNow = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);

      if (response.status !== 503) {
        setMaintenance(false);
        // Everything that failed during maintenance loads again.
        queryClient.invalidateQueries();
      }
    } catch {
      // Offline or still restarting: keep waiting.
    }
  };

  useEffect(() => {
    if (!maintenance) return;

    pollRef.current = setInterval(checkNow, MAINTENANCE_POLL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintenance]);

  if (maintenance) {
    const [title, body] = t.maintenance;

    return (
      <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <ScrollView contentContainerStyle={styles.fullScreen}>
          <Image source={IMAGES.maintenance} style={styles.imageLarge} resizeMode="contain" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable onPress={checkNow} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>{t.retry}</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    );
  }

  if (!dialog) return null;

  const [title, fallback] = t[dialog.kind];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDialog(null)}>
      <Pressable style={styles.backdrop} onPress={() => setDialog(null)}>
        <Pressable style={styles.card} onPress={() => {}} accessibilityRole="alert">
          <Image source={IMAGES[dialog.kind]} style={styles.image} resizeMode="contain" />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{dialog.message || fallback}</Text>
          <Pressable onPress={() => setDialog(null)} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>{t.ok}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  fullScreen: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8FAFC",
  },
  image: {
    width: 170,
    height: 170,
    marginBottom: 6,
  },
  imageLarge: {
    width: 240,
    height: 240,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
    marginBottom: 18,
  },
  button: {
    minWidth: 150,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: "#0D9488",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
