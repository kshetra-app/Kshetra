/**
 * Responsive utility — adapts UI to any device screen size, safe areas, and system chrome.
 *
 * Provides:
 * - useResponsive() hook: safe area insets + responsive scaling functions
 * - scale() / verticalScale() / moderateScale(): pixel scaling based on a 375×812 base
 * - Device category detection (small / normal / large / tablet)
 *
 * Usage:
 *   const { insets, s, vs, ms, isSmall, isTablet } = useResponsive();
 *   <View style={{ paddingTop: insets.top, fontSize: ms(16) }}>
 */
import { Dimensions, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';

// ─── Base design dimensions (iPhone 13 / 375×812) ──────────────────────
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ─── Static helpers (for StyleSheet.create where hooks can't be used) ───

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Horizontal scale — proportional to screen width vs base design width */
export function scale(size: number): number {
  return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
}

/** Vertical scale — proportional to screen height vs base design height */
export function verticalScale(size: number): number {
  return Math.round((SCREEN_HEIGHT / BASE_HEIGHT) * size);
}

/** Moderate scale — blended scaling (factor 0.5 by default) to avoid extremes */
export function moderateScale(size: number, factor = 0.5): number {
  return Math.round(size + (scale(size) - size) * factor);
}

/** Short aliases */
export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;

// ─── Device category ────────────────────────────────────────────────────

export type DeviceCategory = 'small' | 'normal' | 'large' | 'tablet';

export function getDeviceCategory(): DeviceCategory {
  if (SCREEN_WIDTH >= 768) return 'tablet';
  if (SCREEN_WIDTH >= 414) return 'large';
  if (SCREEN_WIDTH >= 375) return 'normal';
  return 'small';
}

export const DEVICE = getDeviceCategory();
export const IS_SMALL = DEVICE === 'small';
export const IS_TABLET = DEVICE === 'tablet';

// ─── Android status bar height fallback ─────────────────────────────────

export function getStatusBarHeight(): number {
  if (Platform.OS === 'ios') return 0; // handled by safe area
  return StatusBar.currentHeight ?? 24;
}

// ─── Tab bar height helper ──────────────────────────────────────────────

/** Compute tab bar height based on bottom inset */
export function getTabBarHeight(bottomInset: number): number {
  const base = IS_TABLET ? 70 : 56;
  return base + bottomInset;
}

// ─── Hook: useResponsive ────────────────────────────────────────────────

export interface ResponsiveContext {
  /** Safe area insets (top / bottom / left / right) — accounts for notch, punch-hole, nav bar */
  insets: EdgeInsets;
  /** Screen width */
  width: number;
  /** Screen height */
  height: number;
  /** Horizontal scale */
  s: (size: number) => number;
  /** Vertical scale */
  vs: (size: number) => number;
  /** Moderate scale */
  ms: (size: number, factor?: number) => number;
  /** Device category */
  device: DeviceCategory;
  isSmall: boolean;
  isTablet: boolean;
  /** Content padding bottom (clears tab bar + safe area) */
  contentPaddingBottom: number;
  /** Header padding top (clears status bar / notch) */
  headerPaddingTop: number;
}

export function useResponsive(): ResponsiveContext {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const device = width >= 768 ? 'tablet' : width >= 414 ? 'large' : width >= 375 ? 'normal' : 'small';

  // Minimum top inset for Android (some devices report 0)
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);

  const safeInsets: EdgeInsets = {
    top: topInset,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
  };

  return {
    insets: safeInsets,
    width,
    height,
    s: scale,
    vs: verticalScale,
    ms: moderateScale,
    device,
    isSmall: device === 'small',
    isTablet: device === 'tablet',
    contentPaddingBottom: getTabBarHeight(insets.bottom) + 16,
    headerPaddingTop: topInset + 8,
  };
}
