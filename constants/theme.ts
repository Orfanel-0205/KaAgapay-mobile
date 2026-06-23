// constants/theme.ts
// Central design tokens for KaAgapay — mirrors the Ka-Agapay RHU Admin
// web dashboard (teal brand, soft color-badge icons, rounded cards) so the
// mobile app and the web admin feel like the same product.

export const COLORS = {
  // Brand / primary (teal)
  primary: "#0D9488",
  primaryDark: "#0F766E",
  primaryLight: "#14B8A6",
  primarySoft: "#CCFBF1",
  primarySofter: "#F0FDFA",

  // Neutrals
  ink: "#111827",
  body: "#374151",
  muted: "#6B7280",
  faint: "#9CA3AF",
  border: "#F3F4F6",
  borderStrong: "#E5E7EB",
  bg: "#F9FAFB",
  card: "#FFFFFF",

  // Status / accent badges (matches the dashboard's stat-card colors)
  blue: "#3B82F6",
  blueSoft: "#DBEAFE",
  green: "#10B981",
  greenSoft: "#D1FAE5",
  purple: "#8B5CF6",
  purpleSoft: "#EDE9FE",
  orange: "#F59E0B",
  orangeSoft: "#FEF3C7",
  pink: "#EC4899",
  pinkSoft: "#FCE7F3",
  red: "#EF4444",
  redSoft: "#FEE2E2",
} as const;

// Poppins weights loaded via @expo-google-fonts/poppins in app/_layout.tsx
export const FONTS = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semiBold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;
