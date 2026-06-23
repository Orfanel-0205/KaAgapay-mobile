// app/emergency/index.tsx
// Ka-Agapay Emergency Services Screen
// Shows important local emergency contacts.
// Back button is consistent with Telemedicine and Announcements.

import React, { useMemo } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLanguageStore, type Lang } from "../../store/useLanguageStore";

const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const BRAND = "#0D9488";
const BRAND_DARK = "#0F766E";
const TEXT = "#111827";
const MUTED = "#6B7280";
const FAINT = "#9CA3AF";
const BORDER = "#E5E7EB";
const RED = "#DC2626";

type EmergencyContact = {
  group: string;
  name: string;
  numbers: string[];
  note?: string;
};

const CONTACTS: EmergencyContact[] = [
  {
    group: "Hospital",
    name: "Pangasinan Provincial Hospital",
    numbers: ["0918-906-9259", "0918-963-0322"],
  },
  {
    group: "Hospital",
    name: "Region I Medical Center",
    numbers: ["0932-706-9058", "0906-371-9386"],
  },
  {
    group: "Hotline",
    name: "Emergency Hotline",
    numbers: ["0960-898-7886", "0995-440-0121", "075-653-8888"],
  },
  {
    group: "Pediatric",
    name: "Pedia",
    numbers: ["0905-217-8775"],
  },
  {
    group: "Emergency Operations",
    name: "HEMS-OPCEN",
    numbers: ["075-632-8888"],
  },
  {
    group: "Emergency Operations",
    name: "PINAS Unit",
    numbers: ["09326036491"],
  },
  {
    group: "Dagupan",
    name: "DBP Dagupan",
    numbers: ["075-522-0986", "522-0547", "522-2696", "522-0597"],
  },
  {
    group: "Local",
    name: "ZAFRA",
    numbers: ["0922-890-3943"],
  },
  {
    group: "Local",
    name: "MSWD",
    numbers: ["536-5343"],
  },
  {
    group: "Transport / Medical",
    name: "RTMC",
    numbers: ["653-8000", "653-8888", "515-8901", "0915-906-63375"],
  },
  {
    group: "LGU",
    name: "Mayor's Office",
    numbers: ["632-2757", "632-2398"],
  },
  {
    group: "Local",
    name: "Copylandia",
    numbers: ["515-3306", "522-3267"],
  },
  {
    group: "Health Office",
    name: "PDOHO",
    numbers: ["515-6842"],
  },
  {
    group: "Local",
    name: "BICAL",
    numbers: ["592-2982"],
  },
  {
    group: "Health Insurance",
    name: "PhilHealth",
    numbers: ["532-1111"],
  },
  {
    group: "Health Insurance",
    name: "PhilHealth Mayombo",
    numbers: ["522-3122"],
  },
  {
    group: "Police",
    name: "PNP Malasiqui",
    numbers: ["536-4577"],
  },
  {
    group: "Local",
    name: "BINLOC",
    numbers: ["496"],
  },
  {
    group: "Local",
    name: "AKIA",
    numbers: ["649-9722", "649-9749", "649-9725", "515-1111", "515-3333"],
  },
  {
    group: "Hospital",
    name: "Malasiqui Municipal Hospital",
    numbers: ["0962-933-9935", "0907-965-8296"],
  },
  {
    group: "Ambulance / Rescue Driver",
    name: "Zaldy",
    numbers: ["0951-308-0784"],
  },
  {
    group: "Ambulance / Rescue Driver",
    name: "Nepthalie",
    numbers: ["0910-076-1917"],
  },
  {
    group: "Ambulance / Rescue Driver",
    name: "Julius",
    numbers: ["0909-556-7157"],
  },
  {
    group: "Ambulance / Rescue Driver",
    name: "Jun-Jun",
    numbers: ["0948-065-0798"],
  },
  {
    group: "Ambulance / Rescue Driver",
    name: "Jess",
    numbers: ["0931-758-9769"],
  },
  {
    group: "Ambulance / Rescue Driver",
    name: "Reneboy",
    numbers: ["0930-758-9022"],
  },
];

const TEXTS: Record<string, Record<Lang, string>> = {
  title: {
    en: "Emergency Services",
    tl: "Emergency Services",
    pag: "Emergency Services",
  },
  subtitle: {
    en: "Important contacts for urgent help.",
    tl: "Mahahalagang contact para sa agarang tulong.",
    pag: "Importanteng contacts parad tampol ya tulong.",
  },
  warning_title: {
    en: "For life-threatening emergencies",
    tl: "Para sa malubhang emergency",
    pag: "Parad delikado ya emergency",
  },
  warning_body: {
    en: "Call immediately or go to the nearest hospital, RHU, or emergency room.",
    tl: "Tumawag agad o pumunta sa pinakamalapit na ospital, RHU, o emergency room.",
    pag: "Ontawag tampol odino onla ed asingger ya ospital, RHU, odino emergency room.",
  },
  call: {
    en: "Call",
    tl: "Tawagan",
    pag: "Tawagan",
  },
  copied_from_notice: {
    en: "Numbers are based on the emergency contact sheet provided. Please verify before official deployment.",
    tl: "Ang numbers ay base sa emergency contact sheet na ibinigay. I-verify muna bago official deployment.",
    pag: "Saray numero et base ed emergency contact sheet ya impanengneng. I-verify ni antis official deployment.",
  },
  unable_call: {
    en: "Unable to open phone dialer.",
    tl: "Hindi mabuksan ang phone dialer.",
    pag: "Ag nalukasan so phone dialer.",
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

function dialableNumber(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function ContactCard({
  item,
  lang,
}: {
  item: EmergencyContact;
  lang: Lang;
}) {
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const callNumber = async (number: string) => {
    const url = `tel:${dialableNumber(number)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert(t("title", lang), t("unable_call", lang));
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(t("title", lang), t("unable_call", lang));
    }
  };

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactTopRow}>
        <View style={styles.contactIconBox}>
          <Ionicons name="call-outline" size={adaptive.size(22)} color={BRAND} />
        </View>

        <View style={styles.contactTextWrap}>
          <Text style={styles.contactGroup}>{item.group}</Text>

          <Text style={styles.contactName}>{item.name}</Text>
        </View>
      </View>

      <View style={styles.numberWrap}>
        {item.numbers.map((number) => (
          <TouchableOpacity
            key={`${item.name}-${number}`}
            onPress={() => callNumber(number)}
            activeOpacity={0.85}
            style={styles.numberButton}
          >
            <View style={styles.numberLeft}>
              <Ionicons
                name="call"
                size={adaptive.size(18)}
                color="#FFFFFF"
              />

              <Text style={styles.numberText}>{number}</Text>
            </View>

            <Text style={styles.callText}>{t("call", lang)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function EmergencyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const adaptive = useAdaptive();
  const styles = useMemo(
    () => makeStyles(adaptive),
    [adaptive.width, adaptive.height]
  );

  const lang = useLanguageStore((state) => state.lang);

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
              } else {
                router.replace("/(tabs)/home" as any);
              }
            }}
            activeOpacity={0.85}
            style={styles.backButton}
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
      >
        <View style={styles.contentInner}>
          <View style={styles.warningCard}>
            <View style={styles.warningIconBox}>
              <Ionicons
                name="alert-circle"
                size={adaptive.size(28)}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.warningTextWrap}>
              <Text style={styles.warningTitle}>{t("warning_title", lang)}</Text>

              <Text style={styles.warningBody}>{t("warning_body", lang)}</Text>
            </View>
          </View>

          <Text style={styles.noteText}>{t("copied_from_notice", lang)}</Text>

          {CONTACTS.map((item) => (
            <ContactCard
              key={`${item.group}-${item.name}`}
              item={item}
              lang={lang}
            />
          ))}
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
    warningCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: RED,
      borderRadius: adaptive.size(20),
      padding: adaptive.size(16),
      marginBottom: adaptive.size(12),
    },
    warningIconBox: {
      width: adaptive.size(46),
      height: adaptive.size(46),
      borderRadius: adaptive.size(16),
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: adaptive.size(12),
    },
    warningTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    warningTitle: {
      color: "#FFFFFF",
      fontSize: adaptive.font(17),
      fontWeight: "900",
    },
    warningBody: {
      color: "#FEE2E2",
      fontSize: adaptive.font(13),
      lineHeight: adaptive.font(19),
      marginTop: adaptive.size(5),
      fontWeight: "700",
    },
    noteText: {
      color: MUTED,
      fontSize: adaptive.font(12),
      lineHeight: adaptive.font(18),
      marginBottom: adaptive.size(14),
    },
    contactCard: {
      backgroundColor: CARD,
      borderRadius: adaptive.size(18),
      borderWidth: 1,
      borderColor: BORDER,
      padding: adaptive.size(15),
      marginBottom: adaptive.size(12),
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 1,
    },
    contactTopRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: adaptive.size(12),
    },
    contactIconBox: {
      width: adaptive.size(42),
      height: adaptive.size(42),
      borderRadius: adaptive.size(14),
      backgroundColor: "#ECFDF5",
      alignItems: "center",
      justifyContent: "center",
      marginRight: adaptive.size(11),
    },
    contactTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    contactGroup: {
      color: BRAND_DARK,
      fontSize: adaptive.font(12),
      fontWeight: "900",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    contactName: {
      color: TEXT,
      fontSize: adaptive.font(17),
      fontWeight: "900",
      marginTop: adaptive.size(2),
    },
    numberWrap: {
      gap: adaptive.size(8),
    },
    numberButton: {
      backgroundColor: BRAND,
      borderRadius: adaptive.size(14),
      minHeight: adaptive.size(48),
      paddingHorizontal: adaptive.size(13),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    numberLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      minWidth: 0,
    },
    numberText: {
      color: "#FFFFFF",
      fontSize: adaptive.font(15),
      fontWeight: "900",
      marginLeft: adaptive.size(8),
    },
    callText: {
      color: "#CCFBF1",
      fontSize: adaptive.font(12),
      fontWeight: "900",
      marginLeft: adaptive.size(10),
    },
  });