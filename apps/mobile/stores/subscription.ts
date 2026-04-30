import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  monthlyPrice: number; // INR, 0 = free
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
    monthlyPrice: 0,
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
    monthlyPrice: 99,
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
    monthlyPrice: 499,
  },
};

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

      getTierConfig: () => TIER_CONFIG[get().tier],

      canExport: (format) => {
        const { tier, exportsThisMonth, exportResetDate } = get();
        const config = TIER_CONFIG[tier];

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

      setTier: (tier) => set({ tier }),
    }),
    {
      name: 'kshetra-subscription',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
