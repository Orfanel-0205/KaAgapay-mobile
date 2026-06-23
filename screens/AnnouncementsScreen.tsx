// screens/AnnouncementsScreen.tsx
// Ka-Agapay Announcements Screen
// Fixed:
// - This is the actual reusable Announcements UI.
// - Back button is consistent with Telemedicine.
// - Safe-area spacing prevents status bar overlap.
// - Responsive/adaptive UI for different screen sizes.
// - Better empty state so the screen does not look broken.
// - Global language support using useLanguageStore.

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

import {
  fetchAnnouncements,
  type MobileAnnouncement,
} from "../services/api/announcements";
import { useLanguageStore, type Lang } from "../store/useLanguageStore";

const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const BRAND = "#0D9488";
const BRAND_DARK = "#0F766E";
const TEXT = "#111827";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const BORDER = "#E5E7EB";

const TEXTS: Record<string, Record<Lang, string>> = {
  title: {
    en: "Announcements",
    tl: "Mga Anunsyo",
    pag: "Saray Anunsyo",
  },
  subtitle: {
    en: "Latest RHU notices and health advisories.",
    tl: "Pinakabagong abiso at health advisory mula sa RHU.",
    pag: "Saray balon ya abiso tan health advisory manlapud RHU.",
  },
  loading: {
    en: "Loading announcements...",
    tl: "Kinukuha ang mga anunsyo...",
    pag: "Aala-la so saray anunsyo...",
  },
  empty_title: {
    en: "No announcements yet",
    tl: "Wala pang anunsyo",
    pag: "Anggapo ni anunsyo",
  },
  empty_body: {
    en: "Important RHU notices, programs, and health advisories will appear here.",
    tl: "Dito lalabas ang mahahalagang abiso, programa, at health advisory mula sa RHU.",
    pag: "Ompaway dia so importanteng abiso, programa, tan health advisory manlapud RHU.",
  },
  pull_refresh: {
    en: "Pull down to refresh.",
    tl: "Hilahin pababa para mag-refresh.",
    pag: "Guyoren pa-baba pian ma-refresh.",
  },
  posted: {
    en: "Posted",
    tl: "Na-post",
    pag: "Na-post",
  },
  health_alert: {
    en: "Health Alert",
    tl: "Health Alert",
    pag: "Health Alert",
  },
  program: {
    en: "Program",
    tl: "Programa",
    pag: "Programa",
  },
  general: {
    en: "General",
    tl: "Pangkalahatan",
    pag: "Pangkadakelan",
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

function categoryLabel(category: string, lang: Lang): string {
  if (category === "health_alert") return t("health_alert", lang);
  if (category === "program") return t("program", lang);

  return t("general", lang);
}

function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adaptive = useAdaptive();

  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const lang = useLanguageStore((state) => state.lang);

  const [items, setItems] = useState<MobileAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchAnnouncements({
        per_page: 20,
      });

      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("[AnnouncementsScreen] failed:", error);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home" as any);
    }
  };

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
            onPress={goBack}
            activeOpacity={0.85}
            style={styles.backButton}
            hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            }}
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
      >
        <View style={styles.contentInner}>
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={BRAND} size="large" />

              <Text style={styles.loadingText}>{t("loading", lang)}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconBox}>
                <Ionicons
                  name="megaphone-outline"
                  size={adaptive.size(40)}
                  color={BRAND}
                />
              </View>

              <Text style={styles.emptyTitle}>{t("empty_title", lang)}</Text>

              <Text style={styles.emptyBody}>{t("empty_body", lang)}</Text>

              <View style={styles.refreshHintBox}>
                <Ionicons
                  name="refresh-outline"
                  size={adaptive.size(18)}
                  color={MUTED}
                />

                <Text style={styles.refreshHintText}>
                  {t("pull_refresh", lang)}
                </Text>
              </View>
            </View>
          ) : (
            items.map((item) => {
              const imageUri = item.banner_url || item.image_url || "";
              const postedDate = formatDate(item.published_at);

              return (
                <View key={item.id} style={styles.announcementCard}>
                  {!!imageUri && (
                    <Image
                      source={{
                        uri: imageUri,
                      }}
                      style={styles.announcementImage}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.cardBody}>
                    <View style={styles.categoryPill}>
                      <Text style={styles.categoryText}>
                        {categoryLabel(item.category, lang)}
                      </Text>
                    </View>

                    <Text style={styles.cardTitle}>{item.title}</Text>

                    <Text style={styles.cardText}>{item.body}</Text>

                    {!!postedDate && (
                      <Text style={styles.dateText}>
                        {t("posted", lang)} {postedDate}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
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

    header: {
      backgroundColor: CARD,
      paddingHorizontal: adaptive.horizontal,
      paddingBottom: adaptive.size(16),
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

    loadingCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(22),
      borderWidth: 1,
      borderColor: BORDER,
      minHeight: adaptive.size(260),
      alignItems: "center",
      justifyContent: "center",
      padding: adaptive.size(24),
    },

    loadingText: {
      color: MUTED,
      fontSize: adaptive.font(14),
      marginTop: adaptive.size(10),
      textAlign: "center",
    },

    emptyCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(24),
      borderWidth: 1,
      borderColor: BORDER,
      minHeight: adaptive.size(420),
      paddingVertical: adaptive.size(42),
      paddingHorizontal: adaptive.size(22),
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 2,
    },

    emptyIconBox: {
      width: adaptive.size(82),
      height: adaptive.size(82),
      borderRadius: adaptive.size(28),
      backgroundColor: "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: adaptive.size(16),
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
      marginTop: adaptive.size(8),
      lineHeight: adaptive.font(21),
      maxWidth: adaptive.size(330),
    },

    refreshHintBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 999,
      paddingHorizontal: adaptive.size(13),
      paddingVertical: adaptive.size(9),
      marginTop: adaptive.size(18),
    },

    refreshHintText: {
      color: MUTED,
      fontSize: adaptive.font(12),
      fontWeight: "800",
      marginLeft: adaptive.size(6),
    },

    announcementCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(20),
      borderWidth: 1,
      borderColor: "#F1F5F9",
      overflow: "hidden",
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

    announcementImage: {
      width: "100%",
      height: adaptive.size(170),
      backgroundColor: "#F1F5F9",
    },

    cardBody: {
      padding: adaptive.size(16),
    },

    categoryPill: {
      alignSelf: "flex-start",
      backgroundColor: "#ECFDF5",
      borderRadius: 999,
      paddingHorizontal: adaptive.size(10),
      paddingVertical: adaptive.size(5),
      marginBottom: adaptive.size(9),
    },

    categoryText: {
      color: BRAND_DARK,
      fontSize: adaptive.font(12),
      fontWeight: "900",
    },

    cardTitle: {
      color: TEXT,
      fontSize: adaptive.font(18),
      fontWeight: "900",
      lineHeight: adaptive.font(25),
    },

    cardText: {
      color: "#374151",
      fontSize: adaptive.font(14),
      lineHeight: adaptive.font(21),
      marginTop: adaptive.size(8),
    },

    dateText: {
      color: FAINT,
      fontSize: adaptive.font(12),
      marginTop: adaptive.size(12),
      fontWeight: "700",
    },
  });