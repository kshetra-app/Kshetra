import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ContributorKYCStatusRecord,
  KYCStatus,
  KYCSubmission,
  ContributorDevice,
  ActionFingerprint,
  ContentActionType,
  ForensicSnapshot,
} from '../lib/contentAccountabilityTypes';
import {
  canPerformAction,
  simpleContentHash,
} from '../lib/contentAccountabilityTypes';

// ─── State Interface ────────────────────────────────────────────────────────

interface ContributorVerificationState {
  ownerUserId: string | null;
  kycLoadState: 'idle' | 'loading' | 'ready' | 'unavailable';

  // KYC state
  kycRecord: ContributorKYCStatusRecord | null;
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
  setOwnerUserId: (userId: string | null) => void;
  setKYCLoadState: (userId: string, state: 'loading' | 'ready' | 'unavailable') => void;
  setKYCRecord: (record: ContributorKYCStatusRecord) => void;
  setKYCSubmission: (submission: KYCSubmission | null) => void;
  setShowKYCSheet: (show: boolean) => void;
  setKYCLoading: (loading: boolean) => void;
  addDevice: (device: ContributorDevice) => void;
  logActionFingerprint: (fingerprint: ActionFingerprint) => void;
  clearKYC: () => void;

  // Gate function — call before any content action
  requestAction: (action: ContentActionType) => {
    allowed: boolean;
    reason:
      | 'verified'
      | 'kyc_required'
      | 'kyc_pending'
      | 'kyc_rejected'
      | 'suspended'
      | 'verification_loading'
      | 'verification_unavailable';
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

export const useContributorVerificationStore = create<ContributorVerificationState>()(
    (set, get) => ({
      ownerUserId: null,
      kycLoadState: 'idle',
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

      setOwnerUserId: (userId) =>
        set((state) => {
          if (state.ownerUserId === userId) return {};
          return {
            ownerUserId: userId,
            kycLoadState: userId ? 'loading' : 'idle',
            kycRecord: null,
            kycSubmission: null,
            isKYCRequired: false,
            devices: [],
            recentFingerprints: [],
            showKYCSheet: false,
            kycLoading: false,
          };
        }),

      setKYCLoadState: (userId, state) => {
        if (get().ownerUserId === userId) set({ kycLoadState: state });
      },

      setKYCRecord: (record) => {
        if (record.userId !== get().ownerUserId) return;
        set({ kycRecord: record, kycLoadState: 'ready' });
      },

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
          kycLoadState: 'ready',
          devices: [],
          recentFingerprints: [],
          showKYCSheet: false,
        }),

      // ─── Gate Function ──────────────────────────────────────────

      requestAction: (action: ContentActionType) => {
        const kyc = get().kycRecord;

        if (!kyc) {
          const loadState = get().kycLoadState;
          set({
            isKYCRequired: true,
            showKYCSheet: loadState === 'ready',
          });
          if (loadState === 'loading') {
            return { allowed: false, reason: 'verification_loading' as const };
          }
          if (loadState !== 'ready') {
            return { allowed: false, reason: 'verification_unavailable' as const };
          }
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
);

/** Remove the legacy unscoped cache, which contained identity and device data. */
export async function clearLegacyContributorVerificationCache(): Promise<void> {
  await AsyncStorage.removeItem('kshetra-contributor-verification').catch(() => undefined);
}

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
