// Components/Draggablechatfab.tsx
// Adaptive draggable chatbot FAB.
// Fixes position on small phones, large phones, tablets, and rotation.

import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive, type Responsive } from "../utils/responsive";

const CHATBOT_ICON = require("../assets/chatboticon2.png");

interface Props {
  onOpen: () => void;
}

export default function DraggableChatFAB({ onOpen }: Props) {
  const insets = useSafeAreaInsets();
  const r = useResponsive();
  const styles = useMemo(() => makeStyles(r), [r.width, r.height]);

  const FAB_SIZE = r.isSmallPhone ? 52 : r.isTablet ? 64 : 56;
  const rightGap = r.isTablet ? 28 : 16;
  const bottomGap = r.isTablet ? 120 : 98 + insets.bottom;

  const startX = r.width - FAB_SIZE - rightGap;
  const startY = r.height - FAB_SIZE - bottomGap;

  const baseX = useRef(startX);
  const baseY = useRef(startY);

  const animX = useRef(new Animated.Value(startX)).current;
  const animY = useRef(new Animated.Value(startY)).current;

  const didDrag = useRef(false);

  useEffect(() => {
    const nextX = r.width - FAB_SIZE - rightGap;
    const nextY = r.height - FAB_SIZE - bottomGap;

    baseX.current = nextX;
    baseY.current = nextY;

    animX.setValue(nextX);
    animY.setValue(nextY);
  }, [r.width, r.height, FAB_SIZE, rightGap, bottomGap, animX, animY]);

  const clampX = (value: number) =>
    Math.max(8, Math.min(r.width - FAB_SIZE - 8, value));

  const clampY = (value: number) =>
    Math.max(
      insets.top + 8,
      Math.min(r.height - FAB_SIZE - insets.bottom - 8, value)
    );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        didDrag.current = false;
      },

      onPanResponderMove: (_, gesture) => {
        const distance = Math.abs(gesture.dx) + Math.abs(gesture.dy);

        if (distance > 6) {
          didDrag.current = true;
        }

        animX.setValue(clampX(baseX.current + gesture.dx));
        animY.setValue(clampY(baseY.current + gesture.dy));
      },

      onPanResponderRelease: (_, gesture) => {
        const rawX = baseX.current + gesture.dx;
        const rawY = baseY.current + gesture.dy;

        const snapX =
          rawX + FAB_SIZE / 2 < r.width / 2
            ? rightGap
            : r.width - FAB_SIZE - rightGap;

        const snapY = clampY(rawY);

        Animated.spring(animX, {
          toValue: snapX,
          useNativeDriver: false,
          bounciness: 5,
          speed: 15,
        }).start();

        Animated.spring(animY, {
          toValue: snapY,
          useNativeDriver: false,
          bounciness: 5,
          speed: 15,
        }).start();

        baseX.current = snapX;
        baseY.current = snapY;

        if (!didDrag.current) {
          onOpen();
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(animX, {
          toValue: baseX.current,
          useNativeDriver: false,
        }).start();

        Animated.spring(animY, {
          toValue: baseY.current,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.fab,
        {
          left: animX,
          top: animY,
          width: FAB_SIZE,
          height: FAB_SIZE,
          borderRadius: FAB_SIZE / 2,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        onPress={() => {
          if (!didDrag.current) {
            onOpen();
          }
        }}
        activeOpacity={0.85}
        style={styles.inner}
      >
        <Image
          source={CHATBOT_ICON}
          style={{
            width: Math.round(FAB_SIZE * 0.55),
            height: Math.round(FAB_SIZE * 0.55),
          }}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const makeStyles = (_r: Responsive) =>
  StyleSheet.create({
    fab: {
      position: "absolute",
      zIndex: 999,
      elevation: 8,
      backgroundColor: "#0D9488",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      alignItems: "center",
      justifyContent: "center",
    },
    inner: {
      width: "100%",
      height: "100%",
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
  });