// features/telemedicine/Telemedicinescreen.tsx
// Ka-Agapay Telemedicine Screen
// Fixes:
// - Header no longer overlaps status bar.
// - Clean empty state.
// - Large readable text and buttons for low digital literacy users.
// - Adaptive layout.
// - Uses global language store.

import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { logActivity } from "../../services/api/logs";
import { useLanguageStore, type Lang } from "../../store/useLanguageStore";
import { useTelemedicine, type TelemedicineSession } from "./useTelemedicine";

const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const BRAND = "#0D9488";
const BRAND_DARK = "#0F766E";
const TEXT = "#111827";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const BORDER = "#E5E7EB";

const CAMERA_ICON = require("../../assets/Tele.png");

const TEXTS: Record<string, Record<Lang, string>> = {
  title: {
    en: "Telemedicine",
    tl: "Telemedicine",
    pag: "Telemedicine",
  },
  subtitle: {
    en: "Video consultation with your RHU doctor",
    tl: "Video consultation sa inyong doktor",
    pag: "Video consultation ed doktor yo",
  },
  no_schedule: {
    en: "No telemedicine schedule",
    tl: "Walang naka-schedule na telemedicine",
    pag: "Anggapo naka-schedule ya telemedicine",
  },
  no_schedule_body: {
    en: "Book an appointment first to access video consultation.",
    tl: "Mag-book muna ng appointment para ma-access ang video consultation.",
    pag: "Man-book nin appointment pian na-access so video consultation.",
  },
  book_now: {
    en: "Book Appointment",
    tl: "Mag-book ng Appointment",
    pag: "Man-book na Appointment",
  },
  loading: {
    en: "Loading telemedicine...",
    tl: "Kinukuha ang telemedicine...",
    pag: "Aala-la so telemedicine...",
  },
  join: {
    en: "Join Video Call",
    tl: "Sumali sa Video Call",
    pag: "Onla ed Video Call",
  },
  not_open: {
    en: "Not open yet",
    tl: "Hindi pa bukas",
    pag: "Ag ni lukas",
  },
  join_hint: {
    en: "You can join 15 minutes before the schedule.",
    tl: "Maaari kang sumali 15 minuto bago ang schedule.",
    pag: "Makaloob ka 15 minuto antis so schedule.",
  },
  live_now: {
    en: "Live now",
    tl: "Live ngayon",
    pag: "Live natan",
  },
  ended: {
    en: "Ended",
    tl: "Tapos na",
    pag: "Asumpal la",
  },
  upcoming: {
    en: "Upcoming",
    tl: "Paparating",
    pag: "Onsabi",
  },
  open_browser: {
    en: "The call will open in your browser. Allow camera and microphone when asked.",
    tl: "Magbubukas ang call sa browser. Pahintulutan ang camera at mikropono kapag hiningi.",
    pag: "Olukas so call ed browser. Ipaabuloy so camera tan mikropono no kerewen.",
  },
  emergency_note: {
    en: "For emergency symptoms, go to the nearest RHU or ER immediately.",
    tl: "Kung emergency ang sintomas, pumunta agad sa pinakamalapit na RHU o ER.",
    pag: "No emergency so sintomas, onla tampol ed asingger ya RHU o ER.",
  },
};

function t(key: string, lang: Lang): string {
  return TEXTS[key]?.[lang] ?? TEXTS[key]?.en ?? key;
}

function useAdaptive() {
  const { width, height } = useWindowDimensions();
  const shortest = Math.min(width, height);
  const isSmall = shortest < 360;
  const isTablet = shortest >= 700;

  return {
    width,
    height,
    isSmall,
    isTablet,
    horizontal: isTablet ? 28 : 16,
    maxWidth: isTablet ? 760 : undefined,
    font: (size: number) => {
      if (isSmall) return Math.max(11, size - 1);
      if (isTablet) return size + 1;
      return size;
    },
    size: (size: number) => {
      if (isSmall) return size * 0.92;
      if (isTablet) return size * 1.03;
      return size;
    },
  };
}

function formatSchedule(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Schedule to be announced";
  }

  return date.toLocaleString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getSessionState(session: TelemedicineSession, lang: Lang) {
  const scheduledDate = new Date(session.scheduled_at);
  const now = new Date();

  const minutesUntil = Math.floor(
    (scheduledDate.getTime() - now.getTime()) / 60_000
  );

  if (session.status === "ended") {
    return {
      label: t("ended", lang),
      bg: "#F3F4F6",
      text: "#6B7280",
      icon: "checkmark-circle-outline" as const,
      isJoinable: false,
      minutesUntil,
    };
  }

  if (session.status === "active") {
    return {
      label: t("live_now", lang),
      bg: "#DCFCE7",
      text: "#166534",
      icon: "radio-outline" as const,
      isJoinable: true,
      minutesUntil,
    };
  }

  if (minutesUntil <= 15) {
    return {
      label: t("live_now", lang),
      bg: "#DCFCE7",
      text: "#166534",
      icon: "radio-outline" as const,
      isJoinable: true,
      minutesUntil,
    };
  }

  return {
    label: t("upcoming", lang),
    bg: "#FEF3C7",
    text: "#92400E",
    icon: "calendar-outline" as const,
    isJoinable: false,
    minutesUntil,
  };
}

function SessionCard({
  session,
  lang,
  isJoining,
  onJoin,
}: {
  session: TelemedicineSession;
  lang: Lang;
  isJoining: boolean;
  onJoin: () => void;
}) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const state = getSessionState(session, lang);

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionTopRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: state.bg,
            },
          ]}
        >
          <Ionicons
            name={state.icon}
            size={adaptive.size(16)}
            color={state.text}
          />

          <Text
            style={[
              styles.statusBadgeText,
              {
                color: state.text,
              },
            ]}
          >
            {state.label}
          </Text>
        </View>
      </View>

      <Text style={styles.doctorName}>{session.doctor_name}</Text>

      <Text style={styles.specialty}>{session.doctor_specialty}</Text>

      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <Ionicons name="time-outline" size={adaptive.size(20)} color={BRAND} />
        </View>

        <Text style={styles.infoText}>{formatSchedule(session.scheduled_at)}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoIcon}>
          <Ionicons
            name="hourglass-outline"
            size={adaptive.size(20)}
            color={BRAND}
          />
        </View>

        <Text style={styles.infoText}>{session.duration_minutes} minutes</Text>
      </View>

      {state.isJoinable && session.status !== "ended" ? (
        <View style={styles.noticeBox}>
          <Ionicons
            name="information-circle-outline"
            size={adaptive.size(19)}
            color="#1D4ED8"
          />

          <Text style={styles.noticeText}>{t("open_browser", lang)}</Text>
        </View>
      ) : null}

      {session.status !== "ended" ? (
        <TouchableOpacity
          onPress={onJoin}
          activeOpacity={0.85}
          disabled={!state.isJoinable || isJoining}
          style={[
            styles.joinButton,
            !state.isJoinable ? styles.joinButtonDisabled : null,
          ]}
        >
          {isJoining ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons
                name="videocam"
                size={adaptive.size(22)}
                color="#FFFFFF"
              />

              <Text style={styles.joinButtonText}>
                {state.isJoinable ? t("join", lang) : t("not_open", lang)}
              </Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      {!state.isJoinable && session.status !== "ended" ? (
        <Text style={styles.joinHint}>{t("join_hint", lang)}</Text>
      ) : null}
    </View>
  );
}

function EmptyState({ lang }: { lang: Lang }) {
  const router = useRouter();
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconBox}>
        <Image source={CAMERA_ICON} style={styles.emptyImage} resizeMode="contain" />
      </View>

      <Text style={styles.emptyTitle}>{t("no_schedule", lang)}</Text>

      <Text style={styles.emptyBody}>{t("no_schedule_body", lang)}</Text>

      <TouchableOpacity
        onPress={() => router.push("/appointments/create" as any)}
        activeOpacity={0.85}
        style={styles.bookButton}
      >
        <Ionicons
          name="calendar-outline"
          size={adaptive.size(21)}
          color="#FFFFFF"
        />

        <Text style={styles.bookButtonText}>{t("book_now", lang)}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TelemedicineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const lang = useLanguageStore((state) => state.lang);

  const {
    sessions,
    isLoading,
    isRefetching,
    refetch,
    joiningId,
    joinSession,
    user,
  } = useTelemedicine();

  useFocusEffect(
    useCallback(() => {
      logActivity("TELEMEDICINE_VIEW", {
        user_id: user?.user_id,
      });
    }, [user?.user_id])
  );

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + adaptive.size(12),
          },
        ]}
      >
        <View style={styles.headerInner}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              }
            }}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <Ionicons
              name="chevron-back"
              size={adaptive.size(26)}
              color={BRAND_DARK}
            />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{t("title", lang)}</Text>

            <Text style={styles.headerSubtitle}>{t("subtitle", lang)}</Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={BRAND} />

          <Text style={styles.loadingText}>{t("loading", lang)}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + adaptive.size(96),
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={BRAND}
            />
          }
        >
          <View style={styles.contentInner}>
            <View style={styles.emergencyNote}>
              <Ionicons
                name="alert-circle-outline"
                size={adaptive.size(20)}
                color="#B45309"
              />

              <Text style={styles.emergencyText}>
                {t("emergency_note", lang)}
              </Text>
            </View>

            {sessions.length === 0 ? (
              <EmptyState lang={lang} />
            ) : (
              sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  lang={lang}
                  isJoining={joiningId === session.id}
                  onJoin={() => joinSession(session.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (adaptive: ReturnType<typeof useAdaptive>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: BG,
    },
    header: {
      backgroundColor: CARD,
      paddingHorizontal: adaptive.horizontal,
      paddingBottom: adaptive.size(14),
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    headerInner: {
      width: "100%",
      maxWidth: adaptive.maxWidth,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
    },
    backButton: {
      width: adaptive.size(44),
      height: adaptive.size(44),
      borderRadius: 999,
      backgroundColor: "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: adaptive.size(12),
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      color: TEXT,
      fontSize: adaptive.font(24),
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    headerSubtitle: {
      color: MUTED,
      fontSize: adaptive.font(13),
      marginTop: adaptive.size(3),
      lineHeight: adaptive.font(19),
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: adaptive.horizontal,
      paddingTop: adaptive.size(16),
    },
    contentInner: {
      width: "100%",
      maxWidth: adaptive.maxWidth,
      alignSelf: "center",
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: adaptive.horizontal,
    },
    loadingText: {
      color: MUTED,
      fontSize: adaptive.font(14),
      marginTop: adaptive.size(10),
    },
    emergencyNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#FFFBEB",
      borderWidth: 1,
      borderColor: "#FDE68A",
      borderRadius: adaptive.size(16),
      padding: adaptive.size(13),
      marginBottom: adaptive.size(14),
    },
    emergencyText: {
      flex: 1,
      color: "#92400E",
      fontSize: adaptive.font(12),
      lineHeight: adaptive.font(18),
      marginLeft: adaptive.size(8),
      fontWeight: "700",
    },
    sessionCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(20),
      borderWidth: 1,
      borderColor: BORDER,
      padding: adaptive.size(16),
      marginBottom: adaptive.size(14),
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 2,
    },
    sessionTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: adaptive.size(10),
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: adaptive.size(10),
      paddingVertical: adaptive.size(6),
      borderRadius: 999,
    },
    statusBadgeText: {
      fontSize: adaptive.font(12),
      fontWeight: "900",
      marginLeft: adaptive.size(5),
    },
    doctorName: {
      color: TEXT,
      fontSize: adaptive.font(20),
      fontWeight: "900",
    },
    specialty: {
      color: MUTED,
      fontSize: adaptive.font(13),
      marginTop: adaptive.size(2),
      marginBottom: adaptive.size(12),
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: adaptive.size(8),
    },
    infoIcon: {
      width: adaptive.size(36),
      height: adaptive.size(36),
      borderRadius: adaptive.size(12),
      backgroundColor: "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: adaptive.size(9),
    },
    infoText: {
      flex: 1,
      color: "#374151",
      fontSize: adaptive.font(14),
      lineHeight: adaptive.font(20),
      fontWeight: "700",
    },
    noticeBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: "#EFF6FF",
      borderWidth: 1,
      borderColor: "#BFDBFE",
      borderRadius: adaptive.size(14),
      padding: adaptive.size(12),
      marginTop: adaptive.size(14),
    },
    noticeText: {
      flex: 1,
      color: "#1D4ED8",
      fontSize: adaptive.font(12),
      lineHeight: adaptive.font(18),
      marginLeft: adaptive.size(7),
      fontWeight: "700",
    },
    joinButton: {
      marginTop: adaptive.size(15),
      backgroundColor: BRAND,
      borderRadius: adaptive.size(15),
      minHeight: adaptive.size(52),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: adaptive.size(14),
    },
    joinButtonDisabled: {
      backgroundColor: "#CBD5E1",
    },
    joinButtonText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(15),
      fontWeight: "900",
      marginLeft: adaptive.size(8),
    },
    joinHint: {
      color: FAINT,
      fontSize: adaptive.font(12),
      textAlign: "center",
      marginTop: adaptive.size(9),
      lineHeight: adaptive.font(17),
    },
    emptyCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(24),
      borderWidth: 1,
      borderColor: BORDER,
      paddingVertical: adaptive.size(34),
      paddingHorizontal: adaptive.size(20),
      alignItems: "center",
      justifyContent: "center",
      minHeight: adaptive.size(360),
    },
    emptyIconBox: {
      width: adaptive.size(92),
      height: adaptive.size(92),
      borderRadius: adaptive.size(28),
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: adaptive.size(18),
    },
    emptyImage: {
      width: adaptive.size(58),
      height: adaptive.size(58),
    },
    emptyTitle: {
      color: TEXT,
      fontSize: adaptive.font(20),
      fontWeight: "900",
      textAlign: "center",
      lineHeight: adaptive.font(27),
    },
    emptyBody: {
      color: MUTED,
      fontSize: adaptive.font(14),
      textAlign: "center",
      lineHeight: adaptive.font(21),
      marginTop: adaptive.size(8),
      maxWidth: adaptive.size(300),
    },
    bookButton: {
      marginTop: adaptive.size(20),
      backgroundColor: BRAND,
      borderRadius: adaptive.size(16),
      minHeight: adaptive.size(52),
      paddingHorizontal: adaptive.size(18),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    bookButtonText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(15),
      fontWeight: "900",
      marginLeft: adaptive.size(8),
    },
  });