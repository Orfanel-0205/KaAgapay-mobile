// Components/LanguageSwitcher.tsx
// Global language switcher.
// Works anywhere in the app because it updates useLanguageStore.

import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguageStore } from "../store/useLanguageStore";
import {
  getSafeLang,
  LANGUAGE_OPTIONS,
  tr,
  type Lang,
} from "../constants/i18n";
import { COLORS, FONTS } from "../constants/theme";
import { useResponsive, type Responsive } from "../utils/responsive";

type Props = {
  compact?: boolean;
  light?: boolean;
};

export default function LanguageSwitcher({
  compact = false,
  light = false,
}: Props) {
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);

  const currentLang = useLanguageStore((s) => getSafeLang(s.lang));
  const setLang = useLanguageStore((s) => s.setLang);

  const [open, setOpen] = useState(false);

  const current =
    LANGUAGE_OPTIONS.find((item) => item.code === currentLang) ??
    LANGUAGE_OPTIONS[0];

  const selectLang = async (lang: Lang) => {
    await setLang(lang);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        style={[
          styles.button,
          compact ? styles.buttonCompact : null,
          light ? styles.buttonLight : null,
        ]}
      >
        <Ionicons
          name="language-outline"
          size={compact ? r.s(18) : r.s(20)}
          color={light ? "#FFFFFF" : COLORS.primary}
        />

        <Text
          style={[
            styles.buttonText,
            compact ? styles.buttonTextCompact : null,
            light ? styles.buttonTextLight : null,
          ]}
        >
          {current.shortLabel}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {tr("choose_language", currentLang)}
                </Text>

                <Text style={styles.modalSub}>
                  {tr("language_applies_all", currentLang)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={r.s(22)} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            {LANGUAGE_OPTIONS.map((option) => {
              const active = option.code === currentLang;

              return (
                <TouchableOpacity
                  key={option.code}
                  onPress={() => selectLang(option.code)}
                  activeOpacity={0.85}
                  style={[
                    styles.option,
                    active ? styles.optionActive : null,
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <Text style={styles.optionShort}>
                      {option.shortLabel}
                    </Text>
                  </View>

                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionLabel}>{option.label}</Text>

                    <Text style={styles.optionNative}>
                      {option.nativeLabel}
                    </Text>
                  </View>

                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={r.s(24)}
                      color={COLORS.primary}
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={r.s(24)}
                      color={COLORS.faint}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (r: Responsive) =>
  StyleSheet.create({
    button: {
      minWidth: r.s(72),
      height: r.s(40),
      borderRadius: 999,
      paddingHorizontal: r.s(12),
      backgroundColor: COLORS.primarySofter,
      borderWidth: 1,
      borderColor: COLORS.primarySoft,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: r.s(5),
    },
    buttonCompact: {
      minWidth: r.s(58),
      height: r.s(34),
      paddingHorizontal: r.s(9),
    },
    buttonLight: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderColor: "rgba(255,255,255,0.28)",
    },
    buttonText: {
      fontSize: r.fs(13),
      fontFamily: FONTS.bold,
      color: COLORS.primary,
    },
    buttonTextCompact: {
      fontSize: r.fs(12),
    },
    buttonTextLight: {
      color: "#FFFFFF",
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: r.screenGutter,
    },
    sheet: {
      width: "100%",
      maxWidth: r.isTablet ? 420 : undefined,
      backgroundColor: "#FFFFFF",
      borderRadius: r.s(24),
      padding: r.s(16),
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: r.vs(12),
      gap: r.s(12),
    },
    modalTitle: {
      fontSize: r.fs(20),
      fontFamily: FONTS.bold,
      color: COLORS.ink,
    },
    modalSub: {
      fontSize: r.fs(13),
      fontFamily: FONTS.regular,
      color: COLORS.muted,
      marginTop: r.vs(2),
    },
    closeButton: {
      width: r.s(36),
      height: r.s(36),
      borderRadius: 999,
      backgroundColor: "#F1F5F9",
      alignItems: "center",
      justifyContent: "center",
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: r.vs(12),
      paddingHorizontal: r.s(12),
      borderRadius: r.s(16),
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: r.vs(9),
      backgroundColor: "#FFFFFF",
    },
    optionActive: {
      backgroundColor: COLORS.primarySofter,
      borderColor: COLORS.primarySoft,
    },
    optionIcon: {
      width: r.s(46),
      height: r.s(46),
      borderRadius: r.s(15),
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: r.s(11),
    },
    optionShort: {
      color: "#FFFFFF",
      fontSize: r.fs(13),
      fontFamily: FONTS.bold,
    },
    optionTextWrap: {
      flex: 1,
    },
    optionLabel: {
      fontSize: r.fs(16),
      fontFamily: FONTS.bold,
      color: COLORS.ink,
    },
    optionNative: {
      fontSize: r.fs(13),
      fontFamily: FONTS.regular,
      color: COLORS.muted,
      marginTop: r.vs(1),
    },
  });