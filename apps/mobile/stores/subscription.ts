import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IS_LIVE_ENVIRONMENT } from '../lib/environment';

// ─── Subscription Tiers ───

export type SubscriptionTier = 'free' | 'pro' | 'institutional';

export interface TierConfig {
  label: string;
  color: string;
  icon: string;
  maxExportsPerMonth: number;
  exportFormats: ExportFormat[];
  maxIssuesPerExport: number;
  pdfBranding: boolean;
  analyticsAccess: boolean;
  apiAccess: boolean;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    label: 'Free',
    color: '#6B7280',
    icon: 'person',
    maxExportsPerMonth: 3,
    exportFormats: ['csv'],
    maxIssuesPerExport: 10,
    pdfBranding: false,
    analyticsAccess: false,
    apiAccess: false,
  },
  pro: {
    label: 'Pro',
    color: '#4F8EF7',
    icon: 'star',
    maxExportsPerMonth: 10,
    exportFormats: ['csv', 'xlsx', 'pdf'],
    maxIssuesPerExport: 50,
    pdfBranding: true,
    analyticsAccess: true,
    apiAccess: false,
  },
  institutional: {
    label: 'Institutional',
    color: '#F59E0B',
    icon: 'business',
    maxExportsPerMonth: -1, // unlimited
    exportFormats: ['csv', 'xlsx', 'pdf'],
    maxIssuesPerExport: -1, // unlimited
    pdfBranding: true,
    analyticsAccess: true,
    apiAccess: true,
  },
};

/**
 * Production has no server-backed subscription or entitlement service yet.
 * Export formats are local file generation, so keep them available without
 * pretending a locally persisted tier or a checkout-backed paywall exists.
 */
export function getEffectiveTierConfig(
  tier: SubscriptionTier,
  isLive = IS_LIVE_ENVIRONMENT,
): TierConfig {
  if (!isLive) return TIER_CONFIG[tier];

  return {
    ...TIER_CONFIG.free,
    exportFormats: ['csv', 'xlsx', 'pdf'],
    maxExportsPerMonth: -1,
    maxIssuesPerExport: -1,
  };
}

// ─── Store ───

interface SubscriptionState {
  tier: SubscriptionTier;
  exportsThisMonth: number;
  exportResetDate: string; // ISO date of next reset

  getTierConfig: () => TierConfig;
  canExport: (format: ExportFormat) => { allowed: boolean; reason?: string };
  recordExport: () => void;
  setTier: (tier: SubscriptionTier) => void;
}

function getNextResetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
}

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      exportsThisMonth: 0,
      exportResetDate: getNextResetDate(),

      getTierConfig: () => getEffectiveTierConfig(get().tier),

      canExport: (format) => {
        const { tier, exportsThisMonth, exportResetDate } = get();
        const config = getEffectiveTierConfig(tier);

        // Reset monthly counter if past reset date
        if (new Date() >= new Date(exportResetDate)) {
          set({ exportsThisMonth: 0, exportResetDate: getNextResetDate() });
          return get().canExport(format);
        }

        if (!config.exportFormats.includes(format)) {
          return {
            allowed: false,
            reason: `${format.toUpperCase()} export requires ${format === 'pdf' ? 'Pro' : 'Pro'} plan`,
          };
        }

        if (config.maxExportsPerMonth !== -1 && exportsThisMonth >= config.maxExportsPerMonth) {
          return {
            allowed: false,
            reason: `Monthly export limit reached (${config.maxExportsPerMonth}). Upgrade for more.`,
          };
        }

        return { allowed: true };
      },

      recordExport: () =>
        set((s) => ({ exportsThisMonth: s.exportsThisMonth + 1 })),

      setTier: (tier) => set({ tier: IS_LIVE_ENVIRONMENT ? 'free' : tier }),
    }),
    {
      name: 'kshetra-subscription',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => IS_LIVE_ENVIRONMENT ? {} : state,
      merge: (persistedState, currentState) => {
        if (IS_LIVE_ENVIRONMENT) return { ...currentState, tier: 'free' };
        return { ...currentState, ...(persistedState as Partial<SubscriptionState>) };
      },
    },
  ),
);
