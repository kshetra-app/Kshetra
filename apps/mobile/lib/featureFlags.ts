/**
 * Mobile Feature Flags Store & Hook
 *
 * Provides reactive access to feature flags with:
 * 1. Default flags from @kshetra/shared
 * 2. MMKV local persistence for instant startup
 * 3. In-App Developer override switches
 * 4. Background remote sync with Fastify /api/v1/config/flags
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import {
  type AppFeatureFlags,
  DEFAULT_FEATURE_FLAGS,
} from '@kshetra/shared';
import { API_BASE_URL } from './constants';

interface FeatureFlagsState extends AppFeatureFlags {
  /** Timestamp of last remote sync */
  lastSyncedAt: number | null;
  /** Toggle an individual feature flag */
  setFlag: <K extends keyof AppFeatureFlags>(key: K, value: boolean) => void;
  /** Batch update multiple flags */
  setFlags: (flags: Partial<AppFeatureFlags>) => void;
  /** Reset all flags to default configuration */
  resetFlags: () => void;
  /** Fetch latest remote flags from server */
  syncRemoteFlags: () => Promise<void>;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_FEATURE_FLAGS,
      lastSyncedAt: null,

      setFlag: (key, value) => {
        set({ [key]: value } as unknown as Partial<FeatureFlagsState>);
      },

      setFlags: (flags) => {
        set(flags as unknown as Partial<FeatureFlagsState>);
      },

      resetFlags: () => {
        set({
          ...DEFAULT_FEATURE_FLAGS,
        });
      },

      syncRemoteFlags: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/config/flags`, {
            headers: { Accept: 'application/json' },
          });
          if (res.ok) {
            const data = (await res.json()) as { flags: Partial<AppFeatureFlags> };
            if (data && data.flags) {
              set({
                ...data.flags,
                lastSyncedAt: Date.now(),
              } as unknown as Partial<FeatureFlagsState>);
            }
          }
        } catch {
          // Offline fallback — keep persisted/default flags
        }
      },
    }),
    {
      name: 'kshetra-feature-flags',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);

/**
 * Convenient selector hook to consume feature flags in UI components.
 */
export function useFeatureFlags(): AppFeatureFlags {
  return useFeatureFlagsStore((state) => ({
    enableMap: state.enableMap,
    enableExploreSearch: state.enableExploreSearch,
    enableElectionHistory: state.enableElectionHistory,
    enableTriviaEngine: state.enableTriviaEngine,
    enableMultiLanguage: state.enableMultiLanguage,

    enableFeed: state.enableFeed,
    enableCivicDashboard: state.enableCivicDashboard,
    enableNotifications: state.enableNotifications,

    enableLiveTab: state.enableLiveTab,
    enableNewsTab: state.enableNewsTab,
    enableShortsTab: state.enableShortsTab,

    enableDelimitation: state.enableDelimitation,
    enableDeepAnalytics: state.enableDeepAnalytics,

    enablePoliticianPortal: state.enablePoliticianPortal,
    enableAspirants: state.enableAspirants,
    enableCampaignManager: state.enableCampaignManager,
    enableLeadershipAcademy: state.enableLeadershipAcademy,

    enableInvestorDemo: state.enableInvestorDemo,
    enableEnterpriseApis: state.enableEnterpriseApis,
  }));
}
