import { useColorScheme } from 'react-native';
import { usePreferencesStore } from '../stores/preferences';
import { DARK_THEME, LIGHT_THEME, type ThemeColors, type ThemeMode } from './theme';

/**
 * Returns the resolved theme colors based on user preference (dark/light/system).
 * When mode is 'system', follows the OS appearance.
 */
export function useTheme(): {
  colors: ThemeColors;
  mode: ThemeMode;
  isDark: boolean;
} {
  const themePreference = usePreferencesStore((s) => s.theme) as ThemeMode;
  const systemScheme = useColorScheme();

  let isDark: boolean;
  if (themePreference === 'system') {
    isDark = systemScheme !== 'light';
  } else {
    isDark = themePreference === 'dark';
  }

  return {
    colors: isDark ? DARK_THEME : LIGHT_THEME,
    mode: themePreference,
    isDark,
  };
}
