/**
 * i18n Configuration
 *
 * Initializes i18next with:
 * - expo-localization for device locale detection
 * - AsyncStorage-backed language persistence
 * - 4 languages: English, Telugu, Hindi, Kannada
 * - Fallback to English for missing keys
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import te from './locales/te';
import hi from './locales/hi';
import kn from './locales/kn';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const SUPPORTED_LANGUAGE_CODES: LanguageCode[] = LANGUAGES.map((l) => l.code);

const STORAGE_KEY = 'kshetra-language';

/** Get the device's preferred language if we support it, else 'en' */
function getDeviceLanguage(): LanguageCode {
  try {
    // Dynamic require — expo-localization needs a native module that may not
    // be present in every dev-client build. Gracefully fall back to 'en'.
    const { getLocales } = require('expo-localization');
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const deviceLang = locales[0].languageCode;
      if (deviceLang && SUPPORTED_LANGUAGE_CODES.includes(deviceLang as LanguageCode)) {
        return deviceLang as LanguageCode;
      }
    }
  } catch {
    // Native module unavailable or getLocales() threw — use fallback
  }
  return 'en';
}

/** Load saved language preference, or fall back to device locale */
async function getSavedLanguage(): Promise<LanguageCode> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGE_CODES.includes(saved as LanguageCode)) {
      return saved as LanguageCode;
    }
  } catch {
    // AsyncStorage error — use device default
  }
  return getDeviceLanguage();
}

/** Save language preference */
export async function setLanguage(code: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

/** Get the current active language code */
export function getCurrentLanguage(): LanguageCode {
  return (i18n.language as LanguageCode) ?? 'en';
}

/** Map state codes to their recommended language */
export const STATE_LANGUAGE_MAP: Record<string, LanguageCode> = {
  TS: 'te',
  AP: 'te',
  KA: 'kn',
  MH: 'hi',
};

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    hi: { translation: hi },
    kn: { translation: kn },
  },
  lng: getDeviceLanguage(), // sync fallback — async override below
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Avoid suspense flickers on language switch
  },
});

// Async language restore (runs after init, updates if user had a saved preference)
getSavedLanguage().then((lang) => {
  if (lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
