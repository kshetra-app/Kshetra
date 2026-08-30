/**
 * i18n Configuration
 *
 * Initializes i18next with:
 * - expo-localization for device locale detection
 * - AsyncStorage-backed language persistence
 * - 5 languages: English, Telugu, Hindi, Kannada, Marathi
 * - Fallback to English for missing keys
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en';
import te from './locales/te';
import hi from './locales/hi';
import kn from './locales/kn';
import mr from './locales/mr';
import ta from './locales/ta';
import ml from './locales/ml';
import bn from './locales/bn';
import gu from './locales/gu';
import pa from './locales/pa';
import or_ from './locales/or';  // 'or' is a JS reserved word, use or_
import as_ from './locales/as';  // 'as' is a JS reserved word, use as_
import ne from './locales/ne';

export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', script: 'Latin' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', script: 'Telugu' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', script: 'Devanagari' },
  { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', script: 'Devanagari' },
  { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', script: 'Tamil' },
  { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', script: 'Malayalam' },
  { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', script: 'Bengali' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'or', label: 'Odia', nativeLabel: 'ଓଡ଼ିଆ', script: 'Odia' },
  { code: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া', script: 'Assamese' },
  { code: 'ne', label: 'Nepali', nativeLabel: 'नेपाली', script: 'Devanagari' },
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
  // South India
  TS: 'te',
  AP: 'te',
  KA: 'kn',
  TN: 'ta',
  KL: 'ml',
  // West India
  MH: 'mr',
  GJ: 'gu',
  GA: 'mr',
  // North India (Hindi belt)
  UP: 'hi',
  BR: 'hi',
  HR: 'hi',
  RJ: 'hi',
  MP: 'hi',
  CG: 'hi',
  JH: 'hi',
  UK: 'hi',
  DL: 'hi',
  HP: 'hi',
  JK: 'hi',
  // East India
  WB: 'bn',
  OD: 'or',
  // Punjab
  PB: 'pa',
  // Northeast
  AS: 'as',
  SK: 'ne',
  TR: 'bn',
  MN: 'en',  // Manipuri (Meitei script) not supported yet
  ML: 'en',  // Khasi — no locale yet
  MZ: 'en',  // Mizo — no locale yet
  NL: 'en',  // Nagamese/English
  AR: 'en',  // English widely used
  // UT
  PY: 'ta',
};

// Initialize i18next
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
    hi: { translation: hi },
    kn: { translation: kn },
    mr: { translation: mr },
    ta: { translation: ta },
    ml: { translation: ml },
    bn: { translation: bn },
    gu: { translation: gu },
    pa: { translation: pa },
    or: { translation: or_ },
    as: { translation: as_ },
    ne: { translation: ne },
  },
  lng: getDeviceLanguage(), // sync fallback — async override below
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false, // Avoid suspense flickers on language switch
  },
  parseMissingKeyHandler: (key: string, defaultValue?: string) => {
    if (defaultValue) return defaultValue;
    // Permanent safety guard: if any key is missing in all locales,
    // convert dot-path (e.g. 'parliament.screenTitle') to human-readable 'Screen Title'
    const lastPart = key.split('.').pop() || key;
    return lastPart
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  },
});

// Async language restore (runs after init, updates if user had a saved preference)
getSavedLanguage().then((lang) => {
  if (lang !== i18n.language) {
    i18n.changeLanguage(lang);
  }
});

export default i18n;
