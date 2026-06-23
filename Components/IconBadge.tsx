// Components/IconBadge.tsx
// Circular soft-color icon badge, matching the stat-card icons on the
// Ka-Agapay RHU Admin web dashboard (e.g. the blue "Total Patients" badge).

import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RADIUS } from "../constants/theme";

interface IconBadgeProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  backgroundColor: string;
  size?: number;
  iconSize?: number;
}

export default function IconBadge({
  name,
  color,
  backgroundColor,
  size = 52,
  iconSize,
}: IconBadgeProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: RADIUS.pill,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={iconSize ?? size * 0.5} color={color} />
    </View>
  );
}
