// Components/ProfileSelectModal.tsx
// Reusable large-option select modal for Profile screen fields.

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { COLORS, FONTS } from "../constants/theme";
import { useResponsive, type Responsive } from "../utils/responsive";

export type ProfileSelectOption = {
  label: string;
  value: string;
};

type ProfileSelectModalProps = {
  visible: boolean;
  title: string;
  options: ProfileSelectOption[];
  selectedValue?: string | null;
  loading?: boolean;
  searchable?: boolean;
  onSelect: (value: string) => void;
  onClose: () => void;
};

function normalizeText(value?: string | null): string {
  return String(value ?? "").trim();
}

export default function ProfileSelectModal({
  visible,
  title,
  options,
  selectedValue,
  loading = false,
  searchable = false,
  onSelect,
  onClose,
}: ProfileSelectModalProps) {
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);
  const [search, setSearch] = useState("");

  const safeSelectedValue = normalizeText(selectedValue);

  useEffect(() => {
    if (visible) {
      setSearch("");
    }
  }, [visible]);

  const safeOptions = useMemo(() => {
    const cleaned = options
      .map((option) => ({
        label: normalizeText(option.label),
        value: normalizeText(option.value),
      }))
      .filter((option) => option.label !== "" && option.value !== "");

    const hasCurrentValue =
      safeSelectedValue !== "" &&
      cleaned.some(
        (option) =>
          option.value.toLowerCase() === safeSelectedValue.toLowerCase()
      );

    if (safeSelectedValue !== "" && !hasCurrentValue) {
      return [
        {
          label: `${safeSelectedValue} (current saved value)`,
          value: safeSelectedValue,
        },
        ...cleaned,
      ];
    }

    return cleaned;
  }, [options, safeSelectedValue]);

  const filteredOptions = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return safeOptions;
    }

    return safeOptions.filter((option) => {
      return (
        option.label.toLowerCase().includes(keyword) ||
        option.value.toLowerCase().includes(keyword)
      );
    });
  }, [safeOptions, search]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={r.s(22)} color={COLORS.muted} />
            </TouchableOpacity>
          </View>

          {searchable ? (
            <View style={styles.searchWrap}>
              <Ionicons name="search" size={r.s(18)} color={COLORS.faint} />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search..."
                placeholderTextColor={COLORS.faint}
                style={styles.searchInput}
              />
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.loadingText}>Loading options...</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.optionScroll}
              contentContainerStyle={styles.optionContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const selected =
                    option.value.toLowerCase() ===
                    safeSelectedValue.toLowerCase();

                  return (
                    <TouchableOpacity
                      key={`${option.value}-${option.label}`}
                      activeOpacity={0.85}
                      style={[
                        styles.optionRow,
                        selected ? styles.optionRowSelected : null,
                      ]}
                      onPress={() => onSelect(option.value)}
                    >
                      <View style={styles.optionTextWrap}>
                        <Text
                          style={[
                            styles.optionLabel,
                            selected ? styles.optionLabelSelected : null,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </View>

                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={r.s(24)}
                          color={COLORS.primary}
                        />
                      ) : (
                        <View style={styles.emptyCircle} />
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No choices found.</Text>
                </View>
              )}
            </ScrollView>
          )}

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.85}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (r: Responsive) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(15,23,42,0.45)",
    },
    sheet: {
      maxHeight: "82%",
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: r.s(28),
      borderTopRightRadius: r.s(28),
      paddingHorizontal: r.s(18),
      paddingTop: r.vs(18),
      paddingBottom: r.vs(24),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: r.s(12),
      marginBottom: r.vs(12),
    },
    title: {
      flex: 1,
      color: COLORS.ink,
      fontSize: r.fs(20),
      fontFamily: FONTS.bold,
    },
    closeButton: {
      width: r.s(42),
      height: r.s(42),
      borderRadius: r.s(21),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#F8FAFC",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: r.s(8),
      borderWidth: 1,
      borderColor: COLORS.borderStrong,
      borderRadius: r.s(16),
      backgroundColor: "#F8FAFC",
      paddingHorizontal: r.s(14),
      marginBottom: r.vs(12),
    },
    searchInput: {
      flex: 1,
      color: COLORS.ink,
      fontSize: r.fs(15),
      fontFamily: FONTS.regular,
      paddingVertical: r.vs(12),
    },
    optionScroll: {
      maxHeight: r.vs(430),
    },
    optionContent: {
      paddingBottom: r.vs(8),
    },
    optionRow: {
      minHeight: r.vs(58),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: r.s(12),
      paddingHorizontal: r.s(14),
      paddingVertical: r.vs(13),
      borderRadius: r.s(16),
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: "#FFFFFF",
      marginBottom: r.vs(9),
    },
    optionRowSelected: {
      backgroundColor: COLORS.primarySofter,
      borderColor: COLORS.primary,
    },
    optionTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    optionLabel: {
      color: COLORS.ink,
      fontSize: r.fs(16),
      fontFamily: FONTS.semiBold,
      lineHeight: r.fs(22),
    },
    optionLabelSelected: {
      color: COLORS.primary,
      fontFamily: FONTS.bold,
    },
    emptyCircle: {
      width: r.s(22),
      height: r.s(22),
      borderRadius: r.s(11),
      borderWidth: 2,
      borderColor: "#CBD5E1",
    },
    loadingWrap: {
      minHeight: r.vs(190),
      alignItems: "center",
      justifyContent: "center",
      gap: r.vs(10),
    },
    loadingText: {
      color: COLORS.muted,
      fontSize: r.fs(14),
      fontFamily: FONTS.regular,
    },
    emptyWrap: {
      minHeight: r.vs(120),
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      color: COLORS.muted,
      fontSize: r.fs(14),
      fontFamily: FONTS.regular,
    },
    cancelButton: {
      marginTop: r.vs(8),
      borderWidth: 1,
      borderColor: COLORS.borderStrong,
      borderRadius: r.s(16),
      paddingVertical: r.vs(14),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#FFFFFF",
    },
    cancelText: {
      color: COLORS.muted,
      fontSize: r.fs(15),
      fontFamily: FONTS.bold,
    },
  });