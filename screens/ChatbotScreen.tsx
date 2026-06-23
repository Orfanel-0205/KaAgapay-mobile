// screens/ChatbotScreen.tsx
// Ka-Agapay Mobile Chatbot Screen
// Fixed:
// - Keyboard no longer covers the chat input.
// - Bottom tab bar hides when keyboard opens.
// - ChatGPT-style history drawer.
// - Full bot responses are readable and not trimmed.
// - Adaptive UI for small phones, large phones, and tablets.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  deleteMobileChatSession,
  endMobileChatSession,
  fetchMobileChatMessages,
  fetchMobileChatSessions,
  sendMobileChatMessage,
  type ChatMessage,
  type ChatSessionSummary,
  type MobileSuggestedAction,
  type TutorialCard,
} from "../services/api/chatbot";

import { useLanguageStore, type Lang } from "../store/useLanguageStore";

const CHATBOT_ICON = require("../assets/chatbotdoctorquack.png");

const BRAND = "#0D9488";
const BRAND_DARK = "#0F766E";
const BRAND_SOFT = "#CCFBF1";
const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const TEXT = "#111827";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const BORDER = "#E5E7EB";

const QUICK_CHIPS: Record<Lang, string[]> = {
  en: [
    "Book appointment",
    "View records",
    "Upload ID",
    "I have fever",
    "RHU events",
  ],
  tl: [
    "Mag-book ng appointment",
    "Tingnan ang records",
    "Mag-upload ng ID",
    "May lagnat ako",
    "RHU events",
  ],
  pag: [
    "Man-book na appointment",
    "Nengnengen so rekord",
    "Man-upload na ID",
    "Walay petang ko",
    "RHU events",
  ],
};

const TEXTS: Record<string, Record<Lang, string>> = {
  chatbot: {
    en: "Chat",
    tl: "Chat",
    pag: "Chat",
  },
  active_chat: {
    en: "Active chat",
    tl: "Aktibong chat",
    pag: "Aktibo ya chat",
  },
  new_chat: {
    en: "New chat",
    tl: "Bagong chat",
    pag: "Balon chat",
  },
  recents: {
    en: "Past Chats",
    tl: "Mga Nakaraang Chat",
    pag: "Saray Apalabas ya Chat",
  },
  no_history: {
    en: "No chat history yet",
    tl: "Wala pang chat history",
    pag: "Anggapo ni chat history",
  },
  no_history_sub: {
    en: "Your past chats will appear here.",
    tl: "Lalabas dito ang mga nakaraang chat mo.",
    pag: "Ompaway dia so saray apalabas ya chat mo.",
  },
  loading_history: {
    en: "Loading chat history...",
    tl: "Kinukuha ang chat history...",
    pag: "Aala-la so chat history...",
  },
  loading_chat: {
    en: "Loading chat...",
    tl: "Kinukuha ang chat...",
    pag: "Aala-la so chat...",
  },
  typing: {
    en: "Dr. Quack is typing...",
    tl: "Nagta-type si Dr. Quack...",
    pag: "On-type si Dr. Quack...",
  },
  placeholder: {
    en: "Type your question...",
    tl: "I-type ang tanong mo...",
    pag: "I-type so tepet mo...",
  },
  welcome: {
    en:
      "Hello! I am Dr. Quack Bot 🦆\n\n" +
      "I can help you with appointments, RHU services, events, medical records, telemedicine, and ID verification.\n\n" +
      "What do you need today?",
    tl:
      "Kamusta! Ako si Dr. Quack Bot 🦆\n\n" +
      "Matutulungan kita sa appointment, RHU services, events, medical records, telemedicine, at ID verification.\n\n" +
      "Ano ang kailangan mo ngayon?",
    pag:
      "Kumusta! Siak si Dr. Quack Bot 🦆\n\n" +
      "Matulongan ta ka ed appointment, RHU services, events, medical records, telemedicine, tan ID verification.\n\n" +
      "Anto so kaukolan mo natan?",
  },
  delete_chat_title: {
    en: "Delete chat?",
    tl: "Burahin ang chat?",
    pag: "Delete so chat?",
  },
  delete_chat_body: {
    en: "This will permanently remove this chat history.",
    tl: "Mabubura ang chat history na ito.",
    pag: "Nadedelete iya ya chat history.",
  },
  cancel: {
    en: "Cancel",
    tl: "Cancel",
    pag: "Cancel",
  },
  delete: {
    en: "Delete",
    tl: "Burahin",
    pag: "Delete",
  },
  unable_load_chat: {
    en: "Unable to load this chat.",
    tl: "Hindi ma-load ang chat na ito.",
    pag: "Ag naload iya ya chat.",
  },
  unable_delete_chat: {
    en: "Unable to delete this chat.",
    tl: "Hindi mabura ang chat na ito.",
    pag: "Ag nadelete iya ya chat.",
  },
  offline_error: {
    en: "I cannot connect right now. Please try again later.",
    tl: "Hindi ako makakonekta ngayon. Pakisubukan ulit mamaya.",
    pag: "Agak makakonekta natan. Padasen lamet kayari.",
  },
  book_appointment: {
    en: "Book Appointment",
    tl: "Mag-book ng Appointment",
    pag: "Man-book na Appointment",
  },
  view_records: {
    en: "View Records",
    tl: "Tingnan ang Records",
    pag: "Nengnengen so Rekord",
  },
  open_events: {
    en: "Open Events",
    tl: "Buksan ang Events",
    pag: "Lukasan so Events",
  },
  upload_id: {
    en: "Upload ID",
    tl: "Mag-upload ng ID",
    pag: "Man-upload na ID",
  },
  call_emergency: {
    en: "Emergency Help",
    tl: "Emergency Help",
    pag: "Emergency Help",
  },
};

function t(key: string, lang: Lang): string {
  return TEXTS[key]?.[lang] ?? TEXTS[key]?.en ?? key;
}

function createWelcomeMessage(lang: Lang): ChatMessage {
  return {
    id: "welcome-mobile",
    role: "assistant",
    content: t("welcome", lang),
    timestamp: new Date().toISOString(),
  };
}

function formatTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSessionTime(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function actionLabel(action: Exclude<MobileSuggestedAction, null>, lang: Lang) {
  if (action === "book_appointment") return t("book_appointment", lang);
  if (action === "view_records") return t("view_records", lang);
  if (action === "open_events") return t("open_events", lang);
  if (action === "upload_id") return t("upload_id", lang);
  if (action === "call_emergency") return t("call_emergency", lang);

  return "";
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

function MessageBubble({ item }: { item: ChatMessage }) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const isUser = item.role === "user";

  return (
    <View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowBot,
      ]}
    >
      {!isUser ? (
        <Image
          source={CHATBOT_ICON}
          style={styles.messageAvatar}
          resizeMode="contain"
        />
      ) : null}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.userBubbleText : styles.botBubbleText,
          ]}
        >
          {item.content}
        </Text>

        <Text
          style={[
            styles.timeText,
            isUser ? styles.userTimeText : styles.botTimeText,
          ]}
        >
          {formatTime(item.timestamp)}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator({ lang }: { lang: Lang }) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  return (
    <View style={styles.typingBox}>
      <ActivityIndicator color={BRAND} size="small" />

      <Text style={styles.typingText}>{t("typing", lang)}</Text>
    </View>
  );
}

function TutorialCards({ cards }: { cards: TutorialCard[] }) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  if (!cards.length) return null;

  return (
    <View style={styles.tutorialWrap}>
      {cards.map((card, index) => (
        <View key={`${card.title}-${index}`} style={styles.tutorialCard}>
          <Text style={styles.tutorialTitle}>{card.title}</Text>

          <Text style={styles.tutorialBody}>{card.body}</Text>
        </View>
      ))}
    </View>
  );
}

function HistoryModal({
  visible,
  lang,
  sessions,
  activeSessionId,
  loading,
  refreshing,
  onClose,
  onRefresh,
  onNewChat,
  onOpenChat,
  onDeleteChat,
}: {
  visible: boolean;
  lang: Lang;
  sessions: ChatSessionSummary[];
  activeSessionId: string | null;
  loading: boolean;
  refreshing: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onNewChat: () => void;
  onOpenChat: (session: ChatSessionSummary) => void;
  onDeleteChat: (session: ChatSessionSummary) => void;
}) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.historyPanel}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleWrap}>
              <Text style={styles.historyTitle}>{t("recents", lang)}</Text>

              <Text style={styles.historySubtitle}>
                {String(sessions.length)} {sessions.length === 1 ? "chat" : "chats"}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={adaptive.size(22)} color={MUTED} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onNewChat}
            activeOpacity={0.85}
            style={styles.newChatButton}
          >
            <Ionicons
              name="add-circle-outline"
              size={adaptive.size(22)}
              color="#FFFFFF"
            />

            <Text style={styles.newChatText}>{t("new_chat", lang)}</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.historyLoading}>
              <ActivityIndicator color={BRAND} />

              <Text style={styles.historyLoadingText}>
                {t("loading_history", lang)}
              </Text>
            </View>
          ) : sessions.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons
                name="chatbubbles-outline"
                size={adaptive.size(42)}
                color={FAINT}
              />

              <Text style={styles.emptyHistoryTitle}>
                {t("no_history", lang)}
              </Text>

              <Text style={styles.emptyHistoryBody}>
                {t("no_history_sub", lang)}
              </Text>
            </View>
          ) : (
            <FlatList
              data={sessions}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              renderItem={({ item }) => {
                const isActive = item.id === activeSessionId;

                return (
                  <TouchableOpacity
                    activeOpacity={0.86}
                    onPress={() => onOpenChat(item)}
                    style={[
                      styles.historyItem,
                      isActive ? styles.historyItemActive : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.historyIconBox,
                        isActive ? styles.historyIconBoxActive : null,
                      ]}
                    >
                      <Ionicons
                        name="chatbubble-ellipses-outline"
                        size={adaptive.size(20)}
                        color={isActive ? "#FFFFFF" : BRAND}
                      />
                    </View>

                    <View style={styles.historyTextWrap}>
                      <Text
                        style={[
                          styles.historyItemTitle,
                          isActive ? styles.historyItemTitleActive : null,
                        ]}
                        numberOfLines={1}
                      >
                        {item.title || t("new_chat", lang)}
                      </Text>

                      <Text
                        style={[
                          styles.historyPreview,
                          isActive ? styles.historyPreviewActive : null,
                        ]}
                        numberOfLines={2}
                      >
                        {item.preview || ""}
                      </Text>

                      <Text
                        style={[
                          styles.historyDate,
                          isActive ? styles.historyDateActive : null,
                        ]}
                      >
                        {formatSessionTime(item.last_activity_at || item.created_at)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => onDeleteChat(item)}
                      style={styles.deleteHistoryButton}
                      hitSlop={{
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10,
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={adaptive.size(18)}
                        color={isActive ? "#FFFFFF" : FAINT}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ChatbotScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const lang = useLanguageStore((state) => state.lang);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(lang),
  ]);
  const [input, setInput] = useState("");
  const [tutorialCards, setTutorialCards] = useState<TutorialCard[]>([]);
  const [suggestedAction, setSuggestedAction] =
    useState<MobileSuggestedAction>(null);

  const [sending, setSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      listRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages.length, tutorialCards.length, suggestedAction, sending, scrollToEnd]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      scrollToEnd();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToEnd]);

  useEffect(() => {
    if (currentSessionId) return;

    setMessages((previous) => {
      const isOnlyWelcome =
        previous.length === 1 && previous[0]?.id === "welcome-mobile";

      if (!isOnlyWelcome) return previous;

      const nextWelcome = createWelcomeMessage(lang);

      if (previous[0]?.content === nextWelcome.content) {
        return previous;
      }

      return [nextWelcome];
    });
  }, [lang, currentSessionId]);

  const loadSessions = useCallback(async () => {
    try {
      const rows = await fetchMobileChatSessions();
      setSessions(rows);
      return rows;
    } catch (error) {
      console.log("[ChatbotScreen] loadSessions failed:", error);
      setSessions([]);
      return [];
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function run() {
        setHistoryLoading(true);

        try {
          const rows = await fetchMobileChatSessions();

          if (mounted) {
            setSessions(rows);
          }
        } catch (error) {
          console.log("[ChatbotScreen] focus load failed:", error);

          if (mounted) {
            setSessions([]);
          }
        } finally {
          if (mounted) {
            setHistoryLoading(false);
          }
        }
      }

      run();

      return () => {
        mounted = false;
      };
    }, [])
  );

  const refreshHistory = async () => {
    setHistoryRefreshing(true);

    try {
      await loadSessions();
    } finally {
      setHistoryRefreshing(false);
    }
  };

  const startNewChat = async () => {
    try {
      if (currentSessionId) {
        await endMobileChatSession(currentSessionId);
      }
    } catch {
      // Still allow local reset.
    }

    setCurrentSessionId(null);
    setMessages([createWelcomeMessage(lang)]);
    setInput("");
    setTutorialCards([]);
    setSuggestedAction(null);
    setHistoryVisible(false);

    await loadSessions();
  };

  const openChat = async (session: ChatSessionSummary) => {
    setHistoryVisible(false);
    setChatLoading(true);

    try {
      const response = await fetchMobileChatMessages(session.id);

      setCurrentSessionId(session.id);
      setMessages(
        response.messages.length > 0
          ? response.messages
          : [createWelcomeMessage(lang)]
      );
      setTutorialCards([]);
      setSuggestedAction(null);
    } catch (error) {
      console.log("[ChatbotScreen] openChat failed:", error);
      Alert.alert("Chat", t("unable_load_chat", lang));
    } finally {
      setChatLoading(false);
    }
  };

  const deleteChat = (session: ChatSessionSummary) => {
    Alert.alert(t("delete_chat_title", lang), t("delete_chat_body", lang), [
      {
        text: t("cancel", lang),
        style: "cancel",
      },
      {
        text: t("delete", lang),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMobileChatSession(session.id);

            if (currentSessionId === session.id) {
              setCurrentSessionId(null);
              setMessages([createWelcomeMessage(lang)]);
              setTutorialCards([]);
              setSuggestedAction(null);
            }

            await loadSessions();
          } catch (error) {
            console.log("[ChatbotScreen] delete failed:", error);
            Alert.alert("Chat", t("unable_delete_chat", lang));
          }
        },
      },
    ]);
  };

  const sendMessage = async (manualText?: string) => {
    const text = (manualText ?? input).trim();

    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setTutorialCards([]);
    setSuggestedAction(null);

    try {
      const response = await sendMobileChatMessage({
        message: text,
        sessionId: currentSessionId,
        history: nextMessages.filter(
          (message) => message.id !== "welcome-mobile"
        ),
        appSection: "chatbot",
        language: lang,
      });

      if (response.session_id) {
        setCurrentSessionId(response.session_id);
      }

      setMessages((previous) => [...previous, response.message]);
      setTutorialCards(response.tutorial_cards ?? []);
      setSuggestedAction(response.suggested_action ?? null);

      await loadSessions();
    } catch (error: any) {
      console.log("[ChatbotScreen] send failed:", error?.response?.data || error);

      const errorMessage: ChatMessage = {
        id: `local-error-${Date.now()}`,
        role: "assistant",
        content: error?.response?.data?.message ?? t("offline_error", lang),
        timestamp: new Date().toISOString(),
      };

      setMessages((previous) => [...previous, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const openSuggestedAction = () => {
    if (!suggestedAction) return;

    if (suggestedAction === "book_appointment") {
      router.push("/appointments/create" as any);
      return;
    }

    if (suggestedAction === "view_records") {
      router.push("/records" as any);
      return;
    }

    if (suggestedAction === "open_events") {
      router.push("/events" as any);
      return;
    }

    if (suggestedAction === "upload_id") {
      router.push("/ocr-upload" as any);
      return;
    }

    if (suggestedAction === "call_emergency") {
      router.push("/emergency" as any);
    }
  };

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + adaptive.size(8),
          },
        ]}
      >
        <View style={styles.headerInner}>
          <TouchableOpacity
            onPress={() => setHistoryVisible(true)}
            style={styles.headerButton}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={adaptive.size(24)} color={TEXT} />
          </TouchableOpacity>

          <Image
            source={CHATBOT_ICON}
            style={styles.headerAvatar}
            resizeMode="contain"
          />

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>{t("chatbot", lang)}</Text>

            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {currentSessionId
                ? sessions.find((item) => item.id === currentSessionId)?.title ||
                  t("active_chat", lang)
                : t("new_chat", lang)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={startNewChat}
            style={styles.headerButton}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={adaptive.size(26)} color={BRAND_DARK} />
          </TouchableOpacity>
        </View>
      </View>

      {chatLoading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator color={BRAND} size="large" />

          <Text style={styles.centerLoadingText}>
            {t("loading_chat", lang)}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <MessageBubble item={item} />}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.quickWrap}>
                {QUICK_CHIPS[lang].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => sendMessage(chip)}
                    activeOpacity={0.82}
                    disabled={sending}
                    style={styles.quickChip}
                  >
                    <Text style={styles.quickChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
            ListFooterComponent={
              <View>
                {sending ? <TypingIndicator lang={lang} /> : null}

                <TutorialCards cards={tutorialCards} />

                {suggestedAction ? (
                  <TouchableOpacity
                    onPress={openSuggestedAction}
                    activeOpacity={0.85}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>
                      {actionLabel(
                        suggestedAction as Exclude<MobileSuggestedAction, null>,
                        lang
                      )}
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={adaptive.size(18)}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            }
          />

          <View
            style={[
              styles.inputArea,
              {
                paddingBottom: keyboardVisible
                  ? adaptive.size(10)
                  : Math.max(insets.bottom, adaptive.size(12)),
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t("placeholder", lang)}
              placeholderTextColor={FAINT}
              style={styles.input}
              multiline
              maxLength={2000}
            />

            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={sending || !input.trim()}
              activeOpacity={0.85}
              style={[
                styles.sendButton,
                sending || !input.trim() ? styles.sendButtonDisabled : null,
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={adaptive.size(20)}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      <HistoryModal
        visible={historyVisible}
        lang={lang}
        sessions={sessions}
        activeSessionId={currentSessionId}
        loading={historyLoading}
        refreshing={historyRefreshing}
        onClose={() => setHistoryVisible(false)}
        onRefresh={refreshHistory}
        onNewChat={startNewChat}
        onOpenChat={openChat}
        onDeleteChat={deleteChat}
      />
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
      paddingBottom: adaptive.size(10),
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
    headerButton: {
      width: adaptive.size(48),
      height: adaptive.size(48),
      borderRadius: 999,
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
    },
    headerAvatar: {
      width: adaptive.size(42),
      height: adaptive.size(42),
      marginLeft: adaptive.size(12),
      marginRight: adaptive.size(10),
    },
    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      color: TEXT,
      fontSize: adaptive.font(22),
      fontWeight: "900",
    },
    headerSubtitle: {
      color: MUTED,
      fontSize: adaptive.font(13),
      marginTop: 1,
    },
    chatArea: {
      flex: 1,
    },
    centerLoading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    centerLoadingText: {
      color: MUTED,
      fontSize: adaptive.font(13),
      marginTop: adaptive.size(10),
    },
    messagesContent: {
      width: "100%",
      maxWidth: adaptive.maxWidth,
      alignSelf: "center",
      paddingHorizontal: adaptive.horizontal,
      paddingTop: adaptive.size(14),
      paddingBottom: adaptive.size(22),
    },
    quickWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: adaptive.size(16),
    },
    quickChip: {
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: BORDER,
      paddingHorizontal: adaptive.size(13),
      paddingVertical: adaptive.size(9),
      borderRadius: 999,
      marginRight: adaptive.size(8),
      marginBottom: adaptive.size(8),
    },
    quickChipText: {
      color: "#374151",
      fontSize: adaptive.font(13),
      fontWeight: "800",
    },
    messageRow: {
      flexDirection: "row",
      marginBottom: adaptive.size(12),
    },
    messageRowUser: {
      justifyContent: "flex-end",
    },
    messageRowBot: {
      justifyContent: "flex-start",
      alignItems: "flex-end",
    },
    messageAvatar: {
      width: adaptive.size(32),
      height: adaptive.size(32),
      marginRight: adaptive.size(7),
      marginBottom: adaptive.size(3),
    },
    bubble: {
      maxWidth: adaptive.isTablet ? "76%" : "84%",
      borderRadius: adaptive.size(19),
      paddingHorizontal: adaptive.size(15),
      paddingVertical: adaptive.size(12),
      flexShrink: 1,
    },
    userBubble: {
      backgroundColor: BRAND,
      borderBottomRightRadius: adaptive.size(6),
    },
    botBubble: {
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: "#F1F5F9",
      borderBottomLeftRadius: adaptive.size(6),
    },
    bubbleText: {
      fontSize: adaptive.font(15),
      lineHeight: adaptive.font(23),
      flexShrink: 1,
    },
    userBubbleText: {
      color: "#FFFFFF",
    },
    botBubbleText: {
      color: "#374151",
    },
    timeText: {
      fontSize: adaptive.font(10),
      marginTop: adaptive.size(7),
      alignSelf: "flex-end",
    },
    userTimeText: {
      color: BRAND_SOFT,
    },
    botTimeText: {
      color: FAINT,
    },
    typingBox: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: "#F1F5F9",
      borderRadius: adaptive.size(16),
      paddingHorizontal: adaptive.size(12),
      paddingVertical: adaptive.size(9),
      marginBottom: adaptive.size(8),
    },
    typingText: {
      color: MUTED,
      fontSize: adaptive.font(12),
      marginLeft: adaptive.size(8),
    },
    tutorialWrap: {
      marginTop: adaptive.size(6),
    },
    tutorialCard: {
      backgroundColor: "#ECFDF5",
      borderWidth: 1,
      borderColor: "#A7F3D0",
      borderRadius: adaptive.size(16),
      padding: adaptive.size(13),
      marginBottom: adaptive.size(8),
    },
    tutorialTitle: {
      color: "#065F46",
      fontSize: adaptive.font(14),
      fontWeight: "900",
    },
    tutorialBody: {
      color: "#374151",
      fontSize: adaptive.font(13),
      lineHeight: adaptive.font(20),
      marginTop: adaptive.size(4),
    },
    actionButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: BRAND,
      borderRadius: 999,
      paddingHorizontal: adaptive.size(15),
      paddingVertical: adaptive.size(10),
      marginTop: adaptive.size(8),
      marginBottom: adaptive.size(4),
    },
    actionButtonText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(13),
      fontWeight: "900",
      marginRight: adaptive.size(7),
    },
    inputArea: {
      width: "100%",
      maxWidth: adaptive.maxWidth,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "flex-end",
      backgroundColor: CARD,
      borderTopWidth: 1,
      borderTopColor: "#F1F5F9",
      paddingHorizontal: adaptive.horizontal,
      paddingTop: adaptive.size(10),
    },
    input: {
      flex: 1,
      minHeight: adaptive.size(48),
      maxHeight: adaptive.size(120),
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: BORDER,
      borderRadius: adaptive.size(18),
      color: TEXT,
      fontSize: adaptive.font(15),
      paddingHorizontal: adaptive.size(14),
      paddingVertical: adaptive.size(10),
      marginRight: adaptive.size(8),
      textAlignVertical: "top",
    },
    sendButton: {
      width: adaptive.size(50),
      height: adaptive.size(50),
      borderRadius: 999,
      backgroundColor: BRAND,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: {
      backgroundColor: "#99F6E4",
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: adaptive.size(16),
    },
    historyPanel: {
      width: "100%",
      maxWidth: adaptive.isTablet ? 480 : undefined,
      maxHeight: "84%",
      backgroundColor: CARD,
      borderRadius: adaptive.size(24),
      padding: adaptive.size(16),
    },
    historyHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: adaptive.size(12),
    },
    historyTitleWrap: {
      flex: 1,
      minWidth: 0,
    },
    historyTitle: {
      color: TEXT,
      fontSize: adaptive.font(22),
      fontWeight: "900",
    },
    historySubtitle: {
      color: MUTED,
      fontSize: adaptive.font(12),
      marginTop: 2,
    },
    closeButton: {
      width: adaptive.size(38),
      height: adaptive.size(38),
      borderRadius: 999,
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
    },
    newChatButton: {
      backgroundColor: BRAND,
      borderRadius: adaptive.size(16),
      paddingVertical: adaptive.size(13),
      paddingHorizontal: adaptive.size(14),
      marginBottom: adaptive.size(12),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    newChatText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(15),
      fontWeight: "900",
      marginLeft: adaptive.size(8),
    },
    historyLoading: {
      alignItems: "center",
      paddingVertical: adaptive.size(38),
    },
    historyLoadingText: {
      color: MUTED,
      fontSize: adaptive.font(13),
      marginTop: adaptive.size(8),
    },
    emptyHistory: {
      alignItems: "center",
      paddingVertical: adaptive.size(36),
      paddingHorizontal: adaptive.size(20),
    },
    emptyHistoryTitle: {
      color: "#374151",
      fontSize: adaptive.font(16),
      fontWeight: "900",
      textAlign: "center",
      marginTop: adaptive.size(10),
    },
    emptyHistoryBody: {
      color: MUTED,
      fontSize: adaptive.font(13),
      lineHeight: adaptive.font(19),
      textAlign: "center",
      marginTop: adaptive.size(4),
    },
    historyItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: CARD,
      borderWidth: 1,
      borderColor: "#F1F5F9",
      borderRadius: adaptive.size(16),
      padding: adaptive.size(11),
      marginBottom: adaptive.size(8),
    },
    historyItemActive: {
      backgroundColor: BRAND,
      borderColor: BRAND,
    },
    historyIconBox: {
      width: adaptive.size(40),
      height: adaptive.size(40),
      borderRadius: adaptive.size(13),
      backgroundColor: "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: adaptive.size(10),
    },
    historyIconBoxActive: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    historyTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    historyItemTitle: {
      color: TEXT,
      fontSize: adaptive.font(14),
      fontWeight: "900",
    },
    historyItemTitleActive: {
      color: "#FFFFFF",
    },
    historyPreview: {
      color: MUTED,
      fontSize: adaptive.font(12),
      marginTop: 2,
      lineHeight: adaptive.font(17),
    },
    historyPreviewActive: {
      color: BRAND_SOFT,
    },
    historyDate: {
      color: FAINT,
      fontSize: adaptive.font(10),
      marginTop: 3,
    },
    historyDateActive: {
      color: "#A7F3D0",
    },
    deleteHistoryButton: {
      padding: adaptive.size(6),
    },
  });