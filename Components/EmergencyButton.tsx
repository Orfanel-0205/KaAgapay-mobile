// Components/EmergencyButton.tsx
// Adaptive SOS floating button with global language support.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageSourcePropType,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ContactIcon from "../assets/Contact.png";
import EmergencyIcon from "../assets/Emergency.png";
import SirenIcon from "../assets/Siren.png";

import { COLORS, FONTS } from "../constants/theme";
import { tr, useLang } from "../constants/i18n";
import { useResponsive, type Responsive } from "../utils/responsive";

interface EmergencyButtonProps {
  bottomOffset?: number;
}

interface EmergencyContact {
  label: string;
  number: string;
  icon: ImageSourcePropType;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    label: "RHU1 Emergency Hotline",
    number: "09338678423",
    icon: ContactIcon,
  },
  {
    label: "RHU2 Emergency Hotline",
    number: "(075) 632-7543",
    icon: EmergencyIcon,
  },
];

function usePulseAnimation() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
      pulseAnim.stopAnimation();
    };
  }, [pulseAnim]);

  return pulseAnim;
}

export default function EmergencyButton({
  bottomOffset,
}: EmergencyButtonProps) {
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);

  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const pulse = usePulseAnimation();
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fabSize = r.isSmallPhone ? 58 : r.isTablet ? 76 : 66;
  const computedBottom =
    bottomOffset ?? (r.isTablet ? 112 : 92 + insets.bottom);

  const openModal = () => {
    Vibration.vibrate(Platform.OS === "android" ? [0, 60, 60, 60] : 60);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);

    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    setCountdown(null);
  };

  const makeCall = async (number: string) => {
    try {
      Vibration.vibrate(200);

      const cleanedNumber = number.replace(/[^\d+]/g, "");

      await Linking.openURL(`tel:${cleanedNumber}`);

      closeModal();
    } catch (error) {
      console.log("Call failed:", error);
    }
  };

  const startAutoDial = (number: string) => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    setCountdown(5);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }

          makeCall(number);

          return null;
        }

        return prev - 1;
      });
    }, 1000);
  };

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          {
            width: fabSize,
            height: fabSize,
            borderRadius: fabSize / 2,
            right: r.isTablet ? 28 : 18,
            bottom: computedBottom,
            transform: [{ scale: pulse }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabInner}
          onPress={openModal}
          activeOpacity={0.85}
        >
          <Image
            source={SirenIcon}
            style={{
              width: Math.round(fabSize * 0.42),
              height: Math.round(fabSize * 0.42),
            }}
            resizeMode="contain"
          />

          <Text style={styles.fabLabel}>SOS</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.modalContainer}>
            <View style={styles.header}>
              <Image
                source={SirenIcon}
                style={styles.headerIconImage}
                resizeMode="contain"
              />

              <Text style={styles.headerTitle}>
                {tr("emergency_contacts", lang)}
              </Text>

              <Text style={styles.headerSubtitle}>
                {tr("emergency_subtitle", lang)}
              </Text>
            </View>

            <View style={styles.contactList}>
              {EMERGENCY_CONTACTS.map((contact) => (
                <View key={contact.number} style={styles.contactCard}>
                  <View style={styles.contactTopRow}>
                    <Image
                      source={contact.icon}
                      style={styles.contactIcon}
                      resizeMode="contain"
                    />

                    <View style={styles.contactTextWrap}>
                      <Text style={styles.contactLabel}>
                        {contact.label}
                      </Text>

                      <Text style={styles.contactNumber}>
                        {contact.number}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => makeCall(contact.number)}
                      activeOpacity={0.85}
                      style={styles.callButton}
                    >
                      <Text style={styles.callButtonText}>
                        {tr("call_now", lang)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => startAutoDial(contact.number)}
                      activeOpacity={0.85}
                      style={styles.autoButton}
                    >
                      <Text style={styles.autoButtonText}>
                        {tr("auto_call", lang)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {countdown !== null ? (
              <View style={styles.countdownBox}>
                <Text style={styles.countdownText}>
                  {"Calling in " + String(countdown) + "..."}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Text style={styles.closeText}>{tr("cancel", lang)}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const makeStyles = (r: Responsive) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      zIndex: 998,
      elevation: 9,
      backgroundColor: "#DC2626",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24,
      shadowRadius: 7,
    },
    fabInner: {
      width: "100%",
      height: "100%",
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    fabLabel: {
      color: "#FFFFFF",
      fontSize: r.fs(11),
      fontFamily: FONTS.bold,
      marginTop: r.vs(1),
    },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(15,23,42,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: r.screenGutter,
    },
    modalContainer: {
      width: "100%",
      maxWidth: r.isTablet ? 440 : undefined,
      backgroundColor: "#FFFFFF",
      borderRadius: r.s(26),
      padding: r.s(18),
    },
    header: {
      alignItems: "center",
      marginBottom: r.vs(14),
    },
    headerIconImage: {
      width: r.s(52),
      height: r.s(52),
      marginBottom: r.vs(8),
    },
    headerTitle: {
      fontSize: r.fs(22),
      fontFamily: FONTS.bold,
      color: COLORS.ink,
      textAlign: "center",
    },
    headerSubtitle: {
      fontSize: r.fs(14),
      fontFamily: FONTS.regular,
      color: COLORS.muted,
      textAlign: "center",
      marginTop: r.vs(4),
      lineHeight: r.fs(20),
    },
    contactList: {
      gap: r.vs(10),
    },
    contactCard: {
      borderWidth: 1,
      borderColor: COLORS.borderStrong,
      borderRadius: r.s(18),
      padding: r.s(13),
      backgroundColor: "#F8FAFC",
    },
    contactTopRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    contactIcon: {
      width: r.s(42),
      height: r.s(42),
      marginRight: r.s(10),
    },
    contactTextWrap: {
      flex: 1,
    },
    contactLabel: {
      fontSize: r.fs(15),
      fontFamily: FONTS.bold,
      color: COLORS.ink,
    },
    contactNumber: {
      fontSize: r.fs(14),
      fontFamily: FONTS.regular,
      color: COLORS.muted,
      marginTop: r.vs(2),
    },
    actionRow: {
      flexDirection: r.isSmallPhone ? "column" : "row",
      gap: r.s(8),
      marginTop: r.vs(12),
    },
    callButton: {
      flex: 1,
      backgroundColor: "#DC2626",
      borderRadius: r.s(14),
      paddingVertical: r.vs(11),
      alignItems: "center",
    },
    callButtonText: {
      color: "#FFFFFF",
      fontSize: r.fs(14),
      fontFamily: FONTS.bold,
    },
    autoButton: {
      flex: 1,
      backgroundColor: "#FEF2F2",
      borderColor: "#FECACA",
      borderWidth: 1,
      borderRadius: r.s(14),
      paddingVertical: r.vs(11),
      alignItems: "center",
    },
    autoButtonText: {
      color: "#B91C1C",
      fontSize: r.fs(14),
      fontFamily: FONTS.bold,
    },
    countdownBox: {
      backgroundColor: "#FEF3C7",
      borderRadius: r.s(14),
      padding: r.s(12),
      marginTop: r.vs(12),
      alignItems: "center",
    },
    countdownText: {
      fontSize: r.fs(15),
      fontFamily: FONTS.bold,
      color: "#92400E",
    },
    closeButton: {
      marginTop: r.vs(14),
      borderRadius: r.s(14),
      paddingVertical: r.vs(12),
      alignItems: "center",
      backgroundColor: "#F1F5F9",
    },
    closeText: {
      fontSize: r.fs(15),
      fontFamily: FONTS.bold,
      color: COLORS.muted,
    },
  });