import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreatorKYCRecord,
  KYCStatus,
  KYCSubmission,
  ContributorDevice,
  ActionFingerprint,
  ContentActionType,
  ForensicSnapshot,
} from '../lib/contentAccountabilityTypes';
import {
  canPerformAction,
  isHighSeverityAction,
  simpleContentHash,
} from '../lib/contentAccountabilityTypes';

// ─── State Interface ────────────────────────────────────────────────────────

interface ContributorVerificationState {
  // KYC state
  kycRecord: CreatorKYCRecord | null;
  kycSubmission: KYCSubmission | null;  // In-progress KYC form data
  isKYCRequired: boolean;                // True once user attempts first action

  // Registered devices
  devices: ContributorDevice[];

  // Recent action fingerprints (local cache, last 50)
  recentFingerprints: ActionFingerprint[];

  // UI state
  showKYCSheet: boolean;
  kycLoading: boolean;

  // Queries
  isVerifiedContributor: () => boolean;
  canDoAction: (action: ContentActionType) => boolean;
  getKYCStatus: () => KYCStatus | null;
  getActionCount: () => number;
  getDeviceCount: () => number;

  // Actions
  setKYCRecord: (record: CreatorKYCRecord) => void;
  updateKYCStatus: (status: KYCStatus) => void;
  setKYCSubmission: (submission: KYCSubmission | null) => void;
  setShowKYCSheet: (show: boolean) => void;
  setKYCLoading: (loading: boolean) => void;
  addDevice: (device: ContributorDevice) => void;
  logActionFingerprint: (fingerprint: ActionFingerprint) => void;
  clearKYC: () => void;

  // Gate function — call before any content action
  requestAction: (action: ContentActionType) => {
    allowed: boolean;
    reason: 'verified' | 'kyc_required' | 'kyc_pending' | 'kyc_rejected' | 'suspended';
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useContributorVerificationStore = create<ContributorVerificationState>()(
  persist(
    (set, get) => ({
      kycRecord: null,
      kycSubmission: null,
      isKYCRequired: false,
      devices: [],
      recentFingerprints: [],
      showKYCSheet: false,
      kycLoading: false,

      // ─── Queries ────────────────────────────────────────────────

      isVerifiedContributor: () => {
        const kyc = get().kycRecord;
        return kyc?.status === 'verified';
      },

      canDoAction: (action: ContentActionType) => {
        return canPerformAction(get().kycRecord, action);
      },

      getKYCStatus: () => {
        return get().kycRecord?.status ?? null;
      },

      getActionCount: () => {
        return get().recentFingerprints.length;
      },

      getDeviceCount: () => {
        return get().devices.length;
      },

      // ─── Actions ────────────────────────────────────────────────

      setKYCRecord: (record) => set({ kycRecord: record }),

      updateKYCStatus: (status) =>
        set((s) => ({
          kycRecord: s.kycRecord
            ? {
                ...s.kycRecord,
                status,
                verifiedAt: status === 'verified' ? new Date().toISOString() : s.kycRecord.verifiedAt,
                updatedAt: new Date().toISOString(),
              }
            : null,
        })),

      setKYCSubmission: (submission) => set({ kycSubmission: submission }),

      setShowKYCSheet: (show) => set({ showKYCSheet: show }),

      setKYCLoading: (loading) => set({ kycLoading: loading }),

      addDevice: (device) =>
        set((s) => {
          const existing = s.devices.find(
            (d) => d.deviceUniqueId === device.deviceUniqueId,
          );
          if (existing) {
            return {
              devices: s.devices.map((d) =>
                d.deviceUniqueId === device.deviceUniqueId
                  ? { ...d, lastSeenAt: new Date().toISOString(), actionCount: d.actionCount + 1 }
                  : d,
              ),
            };
          }
          return { devices: [...s.devices, device] };
        }),

      logActionFingerprint: (fingerprint) =>
        set((s) => ({
          recentFingerprints: [fingerprint, ...s.recentFingerprints].slice(0, 50),
        })),

      clearKYC: () =>
        set({
          kycRecord: null,
          kycSubmission: null,
          isKYCRequired: false,
          devices: [],
          recentFingerprints: [],
          showKYCSheet: false,
        }),

      // ─── Gate Function ──────────────────────────────────────────

      requestAction: (action: ContentActionType) => {
        const kyc = get().kycRecord;

        if (!kyc) {
          set({ isKYCRequired: true, showKYCSheet: true });
          return { allowed: false, reason: 'kyc_required' as const };
        }

        switch (kyc.status) {
          case 'verified':
            return { allowed: true, reason: 'verified' as const };
          case 'pending':
            return { allowed: false, reason: 'kyc_pending' as const };
          case 'rejected':
            return { allowed: false, reason: 'kyc_rejected' as const };
          case 'suspended':
          case 'revoked':
            return { allowed: false, reason: 'suspended' as const };
          default:
            return { allowed: false, reason: 'kyc_required' as const };
        }
      },
    }),
    {
      name: 'kshetra-contributor-verification',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        kycRecord: state.kycRecord,
        kycSubmission: state.kycSubmission,
        isKYCRequired: state.isKYCRequired,
        devices: state.devices,
        // Don't persist recentFingerprints (too large) or UI state
      }),
    },
  ),
);

// ─── Helper: Build ActionFingerprint from ForensicSnapshot ──────────────────

export function buildActionFingerprint(
  userId: string,
  kycId: string | null,
  actionType: ContentActionType,
  snapshot: ForensicSnapshot,
  contentInfo?: { type?: string; id?: string; body?: string; screenName?: string },
): ActionFingerprint {
  return {
    id: `fp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    kycId,

    actionType,
    contentType: contentInfo?.type ?? null,
    contentId: contentInfo?.id ?? null,
    contentHash: contentInfo?.body ? simpleContentHash(contentInfo.body) : null,

    device: snapshot.device,

    ipAddress: snapshot.network.publicIp,
    localIp: snapshot.network.localIp,
    networkType: snapshot.network.networkType,
    carrierName: snapshot.network.carrierName,
    wifiSsid: snapshot.network.wifiSsid,

    latitude: snapshot.location?.latitude ?? null,
    longitude: snapshot.location?.longitude ?? null,
    locationAccuracy: snapshot.location?.accuracy ?? null,

    appVersion: snapshot.app.version,
    appBuild: snapshot.app.build,
    sessionId: snapshot.app.sessionId,
    screenName: contentInfo?.screenName ?? null,

    actionAt: new Date().toISOString(),
  };
}
