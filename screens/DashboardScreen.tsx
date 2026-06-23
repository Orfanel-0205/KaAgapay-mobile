// screens/DashboardScreen.tsx
// Ka-Agapay Mobile Dashboard
// Clean responsive UI for low digital literacy users.
// Fixes:
// - No oversized hero.
// - No overlapping floating SOS/chat buttons.
// - Queue and event cards do not overlap.
// - Dashboard adapts to small phones, large phones, and tablets.
// - Global language switch works through useLanguageStore.

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useQuery } from "@tanstack/react-query";

import apiClient from "../services/api/client";
import { fetchMyQueueTicket } from "../services/api/queue";
import {
  fetchMyEventRegistrations,
  type MyEventRegistration,
} from "../services/api/eventRegistrations";
import { fetchUnreadNotificationCount } from "../services/api/notifications";
import type { DashboardData, QueueStatus } from "../types/api";

import { useAuthStore } from "../store/useAuthStore";
import { useLanguageStore, type Lang } from "../store/useLanguageStore";

const DOCTOR_DUCK = require("../assets/chatbotdoctorquack.png");

const BRAND = "#0D9488";
const BRAND_DARK = "#0F766E";
const BRAND_CARD = "#2F8E82";
const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const BORDER = "#E5E7EB";
const GREEN_SOFT = "#ECFDF5";
const RED = "#DC2626";

const EMPTY_QUEUE: QueueStatus = {
  ticket_number: null,
  position: null,
  estimated_wait_minutes: null,
  status: null,
};

const TEXTS: Record<string, Record<Lang, string>> = {
  greeting_morning: {
    en: "Good morning,",
    tl: "Magandang umaga,",
    pag: "Maabig ya kabwasan,",
  },
  greeting_afternoon: {
    en: "Good afternoon,",
    tl: "Magandang hapon,",
    pag: "Maabig ya ngarem,",
  },
  greeting_evening: {
    en: "Good evening,",
    tl: "Magandang gabi,",
    pag: "Maabig ya labi,",
  },
  companion: {
    en: "Your RHU health companion",
    tl: "Kaagapay mo sa kalusugan ng RHU",
    pag: "Kaabay yo ed salun-at na RHU",
  },
  queue_status: {
    en: "Queue Status",
    tl: "Status ng Pila",
    pag: "Estado na Pila",
  },
  active_event_ticket: {
    en: "Active Event Ticket",
    tl: "Aktibong Event Ticket",
    pag: "Aktibo ya Event Ticket",
  },
  no_queue: {
    en: "No active queue ticket",
    tl: "Walang aktibong queue ticket",
    pag: "Anggapo aktibo a ticket ed pila",
  },
  position: {
    en: "Position",
    tl: "Puwesto",
    pag: "Puesto",
  },
  wait: {
    en: "Est. wait",
    tl: "Tinatayang hintay",
    pag: "Tantya ya panalagar",
  },
  minutes: {
    en: "mins",
    tl: "minuto",
    pag: "minuto",
  },
  event_tickets: {
    en: "My Event Tickets",
    tl: "Mga Event Ticket Ko",
    pag: "Saray Event Ticket Ko",
  },
  active: {
    en: "active",
    tl: "aktibo",
    pag: "aktibo",
  },
  queue_no: {
    en: "Queue No.",
    tl: "Queue No.",
    pag: "Queue No.",
  },
  status: {
    en: "Status",
    tl: "Status",
    pag: "Status",
  },
  no_event_ticket: {
    en: "No active event tickets",
    tl: "Walang aktibong event tickets",
    pag: "Anggapo aktibo ya event tickets",
  },
  quick_actions: {
    en: "Quick Actions",
    tl: "Mabilis na Gawa",
    pag: "Mabilis a Gawa",
  },
  book: {
    en: "Book",
    tl: "Mag-book",
    pag: "Ireserba",
  },
  schedule: {
    en: "Schedule",
    tl: "Schedule",
    pag: "Schedule",
  },
  chat: {
    en: "Chat",
    tl: "Chat",
    pag: "Chat",
  },
  ask_bot: {
    en: "Ask Dr. Quack",
    tl: "Magtanong kay Dr. Quack",
    pag: "Mantepet ed Dr. Quack",
  },
  records: {
    en: "Records",
    tl: "Records",
    pag: "Rekord",
  },
  medical_history: {
    en: "Medical history",
    tl: "Medical history",
    pag: "Medikal a kasalayan",
  },
  events: {
    en: "Events",
    tl: "Events",
    pag: "Events",
  },
  programs: {
    en: "Programs",
    tl: "Programs",
    pag: "Programs",
  },
  announcements: {
    en: "Announcements",
    tl: "Announcements",
    pag: "Announcements",
  },
  notices: {
    en: "RHU notices",
    tl: "RHU notices",
    pag: "RHU notices",
  },
  notifications: {
    en: "Notifications",
    tl: "Notifications",
    pag: "Notifications",
  },
  alerts: {
    en: "Alerts",
    tl: "Alerts",
    pag: "Alerts",
  },
  emergency: {
    en: "Emergency",
    tl: "Emergency",
    pag: "Emergency",
  },
  sos: {
    en: "SOS Help",
    tl: "SOS Help",
    pag: "SOS Help",
  },
  sos_title: {
    en: "Emergency SOS",
    tl: "Emergency SOS",
    pag: "Emergency SOS",
  },
  sos_body: {
    en: "For emergencies, call your local emergency hotline or proceed to the nearest RHU or ER immediately.",
    tl: "Kung emergency, tumawag agad sa emergency hotline o pumunta sa pinakamalapit na RHU o ER.",
    pag: "No emergency, ontawag ed emergency hotline odino onla ed asingger ya RHU o ER.",
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

async function fetchDashboard(): Promise<DashboardData> {
  const response = await apiClient.get("/dashboard");
  const payload = response.data?.data ?? response.data;

  return {
    queue: payload?.queue ?? EMPTY_QUEUE,
    upcoming_appointment: payload?.upcoming_appointment ?? null,
    unread_notifications: Number(payload?.unread_notifications ?? 0),
    last_consultation_summary: payload?.last_consultation_summary ?? null,
  };
}

function hasQueueTicket(queue?: QueueStatus | null): boolean {
  return !!queue?.ticket_number;
}

function isActiveEventTicket(item: MyEventRegistration): boolean {
  return item.status === "registered";
}

function formatEventDate(value?: string | null): string {
  if (!value) return "Date to be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date to be announced";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getGreeting(lang: Lang): string {
  const hour = new Date().getHours();

  if (hour < 12) return t("greeting_morning", lang);
  if (hour < 18) return t("greeting_afternoon", lang);

  return t("greeting_evening", lang);
}

function nextLang(lang: Lang): Lang {
  if (lang === "en") return "tl";
  if (lang === "tl") return "pag";
  return "en";
}

function langLabel(lang: Lang): string {
  if (lang === "tl") return "TAG";
  if (lang === "pag") return "PAG";
  return "EN";
}

function getShortName(value?: string | null): string {
  const safe = String(value || "User").trim();

  if (!safe) return "User";

  return safe.split(/\s+/)[0];
}

function QueueOrTicketCard({
  queue,
  eventTicket,
  lang,
}: {
  queue: QueueStatus | null;
  eventTicket: MyEventRegistration | null;
  lang: Lang;
}) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const hasQueue = hasQueueTicket(queue);
  const hasEvent = !!eventTicket;

  if (hasQueue) {
    return (
      <View style={styles.statusCard}>
        <View style={styles.statusTextWrap}>
          <Text style={styles.statusLabel}>
            {t("queue_status", lang).toUpperCase()}
          </Text>

          <Text style={styles.statusMain} numberOfLines={1}>
            {queue?.ticket_number}
          </Text>

          <View style={styles.statusMetaRow}>
            {queue?.position ? (
              <Text style={styles.statusMeta}>
                {t("position", lang)}: {queue.position}
              </Text>
            ) : null}

            {queue?.estimated_wait_minutes ? (
              <Text style={styles.statusMeta}>
                {t("wait", lang)}: {queue.estimated_wait_minutes}{" "}
                {t("minutes", lang)}
              </Text>
            ) : null}

            {queue?.status ? (
              <Text style={styles.statusMeta}>
                {t("status", lang)}: {queue.status}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statusIcon}>
          <Ionicons name="people" size={adaptive.size(24)} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  if (hasEvent) {
    return (
      <View style={styles.statusCard}>
        <View style={styles.statusTextWrap}>
          <Text style={styles.statusLabel}>
            {t("active_event_ticket", lang).toUpperCase()}
          </Text>

          <Text style={styles.statusMain} numberOfLines={1}>
            {eventTicket.queue_number ?? "Event Ticket"}
          </Text>

          <Text style={styles.statusMeta} numberOfLines={1}>
            {eventTicket.event_title}
          </Text>

          <Text style={styles.statusMeta}>
            {t("status", lang)}: {eventTicket.status}
          </Text>
        </View>

        <View style={styles.statusIcon}>
          <Ionicons name="ticket" size={adaptive.size(24)} color="#FFFFFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.statusCard}>
      <View style={styles.statusTextWrap}>
        <Text style={styles.statusLabel}>
          {t("queue_status", lang).toUpperCase()}
        </Text>

        <Text style={styles.statusMainSmall}>{t("no_queue", lang)}</Text>
      </View>

      <View style={styles.statusIcon}>
        <Ionicons
          name="checkmark-circle"
          size={adaptive.size(25)}
          color="#FFFFFF"
        />
      </View>
    </View>
  );
}

function EventTicketsSection({
  tickets,
  lang,
}: {
  tickets: MyEventRegistration[];
  lang: Lang;
}) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const activeTickets = tickets.filter(isActiveEventTicket);

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {t("event_tickets", lang).toUpperCase()}
        </Text>

        <Text style={styles.sectionCount}>
          {activeTickets.length} {t("active", lang)}
        </Text>
      </View>

      {activeTickets.length === 0 ? (
        <View style={styles.emptyTicketBox}>
          <Ionicons
            name="ticket-outline"
            size={adaptive.size(32)}
            color={FAINT}
          />

          <Text style={styles.emptyTicketText}>
            {t("no_event_ticket", lang)}
          </Text>
        </View>
      ) : (
        activeTickets.slice(0, 2).map((ticket) => (
          <View key={ticket.id} style={styles.eventTicketCard}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {ticket.event_title}
            </Text>

            <Text style={styles.eventTicketNumber} numberOfLines={1}>
              {ticket.queue_number ?? "EVT"}
            </Text>

            <Text style={styles.eventMeta}>
              {t("queue_no", lang)} · {t("status", lang)}: {ticket.status}
            </Text>

            <View style={styles.eventInfoRow}>
              <Ionicons
                name="calendar-outline"
                size={adaptive.size(19)}
                color={MUTED}
              />

              <Text style={styles.eventInfoText}>
                {formatEventDate(ticket.event_date)}
              </Text>
            </View>

            {ticket.location ? (
              <View style={styles.eventInfoRow}>
                <Ionicons
                  name="location-outline"
                  size={adaptive.size(19)}
                  color={MUTED}
                />

                <Text style={styles.eventInfoText} numberOfLines={1}>
                  {ticket.location}
                </Text>
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  tint,
  bg,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  tint: string;
  bg: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      style={[styles.quickCard, danger ? styles.quickCardDanger : null]}
    >
      <View style={[styles.quickIconBox, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={adaptive.size(28)} color={tint} />
      </View>

      <Text
        style={[styles.quickTitle, danger ? styles.quickTitleDanger : null]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.quickSubtitle,
          danger ? styles.quickSubtitleDanger : null,
        ]}
        numberOfLines={2}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const user = useAuthStore((state) => state.user);
  const lang = useLanguageStore((state) => state.lang);
  const setLang = useLanguageStore((state) => state.setLang);

  const [refreshing, setRefreshing] = useState(false);

  const {
    data: dashboard,
    isLoading,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["mobile-dashboard"],
    queryFn: fetchDashboard,
    retry: false,
    refetchInterval: 15000,
  });

  const {
    data: myQueueTicket = null,
    refetch: refetchMyQueueTicket,
  } = useQuery({
    queryKey: ["mobile-my-queue-ticket"],
    queryFn: fetchMyQueueTicket,
    retry: false,
    refetchInterval: 10000,
  });

  const {
    data: eventTickets = [],
    refetch: refetchMyEventTickets,
  } = useQuery({
    queryKey: ["mobile-my-event-registrations"],
    queryFn: fetchMyEventRegistrations,
    retry: false,
    refetchInterval: 15000,
  });

  const {
    data: unreadNotifications = 0,
    refetch: refetchUnreadNotifications,
  } = useQuery({
    queryKey: ["mobile-unread-notifications"],
    queryFn: fetchUnreadNotificationCount,
    retry: false,
    refetchInterval: 15000,
  });

  const clinicQueue = hasQueueTicket(myQueueTicket)
    ? myQueueTicket
    : hasQueueTicket(dashboard?.queue)
      ? dashboard?.queue ?? null
      : null;

  const activeEventTicket = eventTickets.find(isActiveEventTicket) ?? null;

  useFocusEffect(
    useCallback(() => {
      refetchDashboard();
      refetchMyQueueTicket();
      refetchMyEventTickets();
      refetchUnreadNotifications();
    }, [
      refetchDashboard,
      refetchMyQueueTicket,
      refetchMyEventTickets,
      refetchUnreadNotifications,
    ])
  );

  const refreshAll = async () => {
    setRefreshing(true);

    try {
      await Promise.all([
        refetchDashboard(),
        refetchMyQueueTicket(),
        refetchMyEventTickets(),
        refetchUnreadNotifications(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const displayName = getShortName(user?.first_name);

  const quickActions = [
    {
      icon: "alert-circle-outline" as const,
      title: t("emergency", lang),
      subtitle: t("sos", lang),
      tint: RED,
      bg: "#FEE2E2",
      danger: true,
      onPress: () => router.push("/emergency" as any),
    },
    {
      icon: "chatbubble-ellipses-outline" as const,
      title: t("chat", lang),
      subtitle: t("ask_bot", lang),
      tint: BRAND,
      bg: "#CCFBF1",
      onPress: () => router.push("/chatbot" as any),
    },
    {
      icon: "calendar-outline" as const,
      title: t("book", lang),
      subtitle: t("schedule", lang),
      tint: BRAND,
      bg: "#ECFDF5",
      onPress: () => router.push("/appointments/create" as any),
    },
    {
      icon: "document-text-outline" as const,
      title: t("records", lang),
      subtitle: t("medical_history", lang),
      tint: "#2563EB",
      bg: "#EFF6FF",
      onPress: () => router.push("/records" as any),
    },
    {
      icon: "ticket-outline" as const,
      title: t("events", lang),
      subtitle: t("programs", lang),
      tint: "#D97706",
      bg: "#FEF3C7",
      onPress: () => router.push("/events" as any),
    },
    {
      icon: "megaphone-outline" as const,
      title: t("announcements", lang),
      subtitle: t("notices", lang),
      tint: "#16A34A",
      bg: "#DCFCE7",
      onPress: () => router.push("/announcements" as any),
    },
  ];

  if (isLoading && !dashboard) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={BRAND} />

        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + adaptive.size(95),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshAll} />
        }
      >
        <View
          style={[
            styles.hero,
            {
              paddingTop: insets.top + adaptive.size(18),
            },
          ]}
        >
          <View style={styles.heroInner}>
            <View style={styles.heroTextArea}>
              <Text style={styles.greeting} numberOfLines={1}>
                {getGreeting(lang)}
              </Text>

              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>

              <Text style={styles.companionText} numberOfLines={2}>
                {t("companion", lang)}
              </Text>
            </View>

            <View style={styles.heroRightArea}>
              <TouchableOpacity
                onPress={() => setLang(nextLang(lang))}
                activeOpacity={0.85}
                style={styles.langButton}
              >
                <Ionicons
                  name="language-outline"
                  size={adaptive.size(18)}
                  color="#FFFFFF"
                />

                <Text style={styles.langText}>{langLabel(lang)}</Text>
              </TouchableOpacity>

              <Image
                source={DOCTOR_DUCK}
                style={styles.duckImage}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>

        <View style={styles.mainContent}>
          <QueueOrTicketCard
            queue={clinicQueue}
            eventTicket={activeEventTicket}
            lang={lang}
          />

          <EventTicketsSection tickets={eventTickets} lang={lang} />

          <View style={styles.quickHeaderRow}>
            <Text style={styles.quickHeader}>{t("quick_actions", lang)}</Text>

            {unreadNotifications > 0 ? (
              <TouchableOpacity
                onPress={() => router.push("/notifications" as any)}
                activeOpacity={0.85}
                style={styles.notifPill}
              >
                <Ionicons
                  name="notifications"
                  size={adaptive.size(16)}
                  color={BRAND_DARK}
                />

                <Text style={styles.notifPillText}>
                  {String(unreadNotifications)}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <QuickAction
                key={action.title}
                icon={action.icon}
                title={action.title}
                subtitle={action.subtitle}
                tint={action.tint}
                bg={action.bg}
                danger={action.danger}
                onPress={action.onPress}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (adaptive: ReturnType<typeof useAdaptive>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: BG,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      backgroundColor: BG,
    },
    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: BG,
    },
    loadingText: {
      marginTop: adaptive.size(10),
      color: MUTED,
      fontSize: adaptive.font(14),
    },
    hero: {
      backgroundColor: "#55B8AC",
      borderBottomLeftRadius: adaptive.size(28),
      borderBottomRightRadius: adaptive.size(28),
      paddingHorizontal: adaptive.horizontal,
      paddingBottom: adaptive.size(20),
    },
    heroInner: {
      width: "100%",
      maxWidth: adaptive.maxWidth,
      alignSelf: "center",
      minHeight: adaptive.size(158),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroTextArea: {
      flex: 1,
      minWidth: 0,
      paddingRight: adaptive.size(10),
    },
    greeting: {
      color: "#EAFDF9",
      fontSize: adaptive.font(17),
      letterSpacing: 1.1,
      marginBottom: adaptive.size(7),
    },
    userName: {
      color: "#FFFFFF",
      fontSize: adaptive.font(38),
      fontWeight: "900",
      letterSpacing: 0.5,
      lineHeight: adaptive.font(45),
    },
    companionText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(15),
      lineHeight: adaptive.font(21),
      letterSpacing: 0.5,
      marginTop: adaptive.size(9),
      maxWidth: adaptive.size(245),
    },
    heroRightArea: {
      width: adaptive.size(126),
      alignItems: "flex-end",
      justifyContent: "center",
    },
    langButton: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.45)",
      backgroundColor: "rgba(255,255,255,0.14)",
      borderRadius: 999,
      paddingHorizontal: adaptive.size(10),
      paddingVertical: adaptive.size(7),
      marginBottom: adaptive.size(8),
    },
    langText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(13),
      fontWeight: "900",
      marginLeft: adaptive.size(6),
    },
    duckImage: {
      width: adaptive.size(118),
      height: adaptive.size(98),
    },
    mainContent: {
      width: "100%",
      maxWidth: adaptive.maxWidth,
      alignSelf: "center",
      paddingHorizontal: adaptive.horizontal,
      paddingTop: adaptive.size(16),
    },
    statusCard: {
      backgroundColor: BRAND_CARD,
      borderRadius: adaptive.size(22),
      paddingHorizontal: adaptive.size(18),
      paddingVertical: adaptive.size(16),
      minHeight: adaptive.size(96),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: adaptive.size(16),
    },
    statusTextWrap: {
      flex: 1,
      minWidth: 0,
      paddingRight: adaptive.size(12),
    },
    statusLabel: {
      color: "#DFFAF5",
      fontSize: adaptive.font(13),
      fontWeight: "900",
      letterSpacing: 1.4,
    },
    statusMain: {
      color: "#FFFFFF",
      fontSize: adaptive.font(25),
      fontWeight: "900",
      letterSpacing: 0.7,
      marginTop: adaptive.size(7),
    },
    statusMainSmall: {
      color: "#FFFFFF",
      fontSize: adaptive.font(18),
      letterSpacing: 0.7,
      marginTop: adaptive.size(8),
      lineHeight: adaptive.font(25),
    },
    statusMetaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: adaptive.size(7),
    },
    statusMeta: {
      color: "#DFFAF5",
      fontSize: adaptive.font(12),
      marginRight: adaptive.size(10),
      marginTop: adaptive.size(3),
      letterSpacing: 0.3,
    },
    statusIcon: {
      width: adaptive.size(44),
      height: adaptive.size(44),
      borderRadius: 999,
      backgroundColor: "rgba(116,227,211,0.75)",
      alignItems: "center",
      justifyContent: "center",
    },
    sectionCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(20),
      borderWidth: 1,
      borderColor: "#DDFBEF",
      padding: adaptive.size(15),
      marginBottom: adaptive.size(22),
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: adaptive.size(12),
    },
    sectionTitle: {
      color: "#2E7D4F",
      fontSize: adaptive.font(14),
      fontWeight: "900",
      letterSpacing: 0.8,
      flex: 1,
    },
    sectionCount: {
      color: "#2E7D4F",
      fontSize: adaptive.font(13),
      fontWeight: "900",
      marginLeft: adaptive.size(10),
    },
    emptyTicketBox: {
      backgroundColor: GREEN_SOFT,
      borderRadius: adaptive.size(16),
      paddingVertical: adaptive.size(26),
      paddingHorizontal: adaptive.size(14),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTicketText: {
      color: "#374151",
      fontSize: adaptive.font(14),
      marginTop: adaptive.size(8),
      fontWeight: "800",
      textAlign: "center",
    },
    eventTicketCard: {
      backgroundColor: GREEN_SOFT,
      borderWidth: 1,
      borderColor: "#DCFCE7",
      borderRadius: adaptive.size(16),
      padding: adaptive.size(15),
      marginBottom: adaptive.size(10),
    },
    eventTitle: {
      color: TEXT,
      fontSize: adaptive.font(16),
      fontWeight: "900",
      lineHeight: adaptive.font(22),
    },
    eventTicketNumber: {
      color: "#14532D",
      fontSize: adaptive.font(28),
      fontWeight: "900",
      letterSpacing: 1,
      marginTop: adaptive.size(10),
    },
    eventMeta: {
      color: "#2E7D4F",
      fontSize: adaptive.font(12),
      marginTop: adaptive.size(2),
      letterSpacing: 0.4,
    },
    eventInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: adaptive.size(8),
    },
    eventInfoText: {
      color: MUTED,
      fontSize: adaptive.font(12),
      marginLeft: adaptive.size(7),
      flex: 1,
    },
    quickHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: adaptive.size(13),
    },
    quickHeader: {
      color: TEXT,
      fontSize: adaptive.font(24),
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    notifPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#ECFDF5",
      borderRadius: 999,
      paddingHorizontal: adaptive.size(10),
      paddingVertical: adaptive.size(7),
    },
    notifPillText: {
      color: BRAND_DARK,
      fontSize: adaptive.font(13),
      fontWeight: "900",
      marginLeft: adaptive.size(5),
    },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    quickCard: {
      width: adaptive.isTablet ? "48.5%" : "48%",
      backgroundColor: CARD,
      borderRadius: adaptive.size(18),
      borderWidth: 1,
      borderColor: "#F1F5F9",
      padding: adaptive.size(15),
      minHeight: adaptive.size(132),
      marginBottom: adaptive.size(13),
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 2,
    },
    quickCardDanger: {
      borderColor: "#FEE2E2",
    },
    quickIconBox: {
      width: adaptive.size(56),
      height: adaptive.size(56),
      borderRadius: adaptive.size(17),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: adaptive.size(13),
    },
    quickTitle: {
      color: TEXT,
      fontSize: adaptive.font(18),
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    quickTitleDanger: {
      color: "#991B1B",
    },
    quickSubtitle: {
      color: FAINT,
      fontSize: adaptive.font(13),
      marginTop: adaptive.size(3),
      lineHeight: adaptive.font(18),
    },
    quickSubtitleDanger: {
      color: "#B91C1C",
    },
  });