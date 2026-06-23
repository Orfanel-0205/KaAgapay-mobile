// Components/ScreenHeader.tsx
// Adaptive reusable header with global language switcher.

import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS, FONTS } from "../constants/theme";
import { useResponsive, type Responsive } from "../utils/responsive";
import LanguageSwitcher from "./LanguageSwitcher";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showLanguage?: boolean;
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  showLanguage = true,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/home");
  };

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + r.vs(10),
        },
      ]}
    >
      <View style={styles.maxWrap}>
        <View style={styles.row}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-back"
              size={r.s(27)}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.rightSlot}>
            {showLanguage ? (
              <LanguageSwitcher compact light />
            ) : (
              <View style={styles.rightSpacer} />
            )}
          </View>
        </View>

        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const makeStyles = (r: Responsive) =>
  StyleSheet.create({
    header: {
      backgroundColor: COLORS.primary,
      paddingBottom: r.vs(18),
      paddingHorizontal: r.horizontalPadding,
      borderBottomLeftRadius: r.s(24),
      borderBottomRightRadius: r.s(24),
    },
    maxWrap: {
      width: "100%",
      maxWidth: r.maxContentWidth,
      alignSelf: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: r.s(8),
    },
    backButton: {
      width: r.s(40),
      height: r.s(40),
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
    },
    title: {
      color: "#FFFFFF",
      fontFamily: FONTS.bold,
      fontSize: r.fs(r.isSmallPhone ? 19 : 22),
      textAlign: "center",
    },
    rightSlot: {
      minWidth: r.s(58),
      alignItems: "flex-end",
    },
    rightSpacer: {
      width: r.s(40),
      height: r.s(40),
    },
    subtitle: {
      color: COLORS.primarySoft,
      fontFamily: FONTS.regular,
      fontSize: r.fs(14),
      textAlign: "center",
      marginTop: r.vs(7),
      lineHeight: r.fs(19),
    },
  });