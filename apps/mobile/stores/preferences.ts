import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '../lib/storage';

export type ThemeMode = 'dark' | 'light' | 'system';
export type AppLanguage = 'en' | 'hi' | 'te';

interface PreferencesState {
  theme: ThemeMode;
  language: AppLanguage;
  notificationsEnabled: boolean;
  hapticFeedback: boolean;

  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: AppLanguage) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      notificationsEnabled: false,
      hapticFeedback: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
    }),
    {
      name: 'kshetra-preferences',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
