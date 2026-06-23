// utils/responsive.ts
// Global responsive helper for Ka-Agapay mobile screens.
// Use this on every screen to make layouts adapt to small phones,
// normal phones, large phones, foldables, and tablets.

import { PixelRatio, useWindowDimensions } from "react-native";

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function round(value: number) {
  return Math.round(PixelRatio.roundToNearestPixel(value));
}

export function scaleSize(size: number, width: number) {
  const scaled = (width / BASE_WIDTH) * size;
  return round(clamp(scaled, size * 0.82, size * 1.25));
}

export function verticalScale(size: number, height: number) {
  const scaled = (height / BASE_HEIGHT) * size;
  return round(clamp(scaled, size * 0.82, size * 1.22));
}

export function fontScale(size: number, width: number) {
  const scaled = (width / BASE_WIDTH) * size;
  return round(clamp(scaled, size * 0.86, size * 1.16));
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);

  const isSmallPhone = shortestSide < 360;
  const isCompactPhone = shortestSide >= 360 && shortestSide < 390;
  const isLargePhone = shortestSide >= 390 && shortestSide < 600;
  const isTablet = shortestSide >= 600;
  const isLandscape = width > height;

  const horizontalPadding = isTablet ? 28 : isSmallPhone ? 14 : 16;
  const screenGutter = isTablet ? 28 : isSmallPhone ? 12 : 16;
  const cardRadius = isTablet ? 28 : 22;
  const maxContentWidth = isTablet ? 760 : undefined;

  return {
    width,
    height,
    shortestSide,
    longestSide,

    isSmallPhone,
    isCompactPhone,
    isLargePhone,
    isTablet,
    isLandscape,

    horizontalPadding,
    screenGutter,
    cardRadius,
    maxContentWidth,

    s: (size: number) => scaleSize(size, width),
    vs: (size: number) => verticalScale(size, height),
    fs: (size: number) => fontScale(size, width),
  };
}

export type Responsive = ReturnType<typeof useResponsive>;