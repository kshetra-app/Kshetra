/**
 * Content Creator Accountability — Gate Logic
 *
 * Central module that gates ALL content creation actions behind KYC verification.
 *
 * Flow:
 *   1. User taps "Post" / "Comment" / "Report Issue" / etc.
 *   2. `gateContentAction(actionType)` is called
 *   3. If KYC not done → show KYC sheet, block action
 *   4. If KYC verified → capture forensic snapshot, log fingerprint, allow action
 *   5. For low-severity actions (votes, follows) → use lightweight snapshot
 *
 * Integration:
 *   - Call `gateContentAction()` at the START of any submit handler
 *   - Call `logContentAction()` AFTER successful content creation
 */

import { Alert } from 'react-native';
import { File } from 'expo-file-system';
import type {
  ContentActionType,
  ForensicSnapshot,
  ActionFingerprint,
} from './contentAccountabilityTypes';
import {
  isHighSeverityAction,
  GATED_ACTIONS,
} from './contentAccountabilityTypes';
import {
  captureForensicSnapshot,
  captureLightSnapshot,
} from './deviceFingerprint';
import {
  useContributorVerificationStore,
  buildActionFingerprint,
} from '../stores/contributorVerification';
import { useAuthStore } from '../stores/auth';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  submitKYC as submitKYCToSupabase,
  getContributorKYCStatus,
  insertActionFingerprint,
  upsertContributorDevice,
} from './supabaseDataService';

// ─── Gate Function ──────────────────────────────────────────────────────────

/**
 * Gate a content action. Returns true if the action is allowed.
 * If not allowed, shows appropriate UI (KYC sheet or alert).
 *
 * Usage in components:
 * ```
 * const allowed = gateContentAction('create_post');
 * if (!allowed) return; // KYC sheet will appear automatically
 * // ... proceed with post creation
 * ```
 */
export function gateContentAction(actionType: ContentActionType): boolean {
  // Non-gated actions always pass
  if (!GATED_ACTIONS.includes(actionType)) return true;

  const store = useContributorVerificationStore.getState();
  const result = store.requestAction(actionType);

  if (result.allowed) return true;

  // Show appropriate feedback based on reason
  switch (result.reason) {
    case 'kyc_required':
      // KYC sheet will be shown automatically by the store
      break;

    case 'verification_loading':
      Alert.alert('Checking Verification', 'Please wait while we check your contributor verification status.');
      break;

    case 'verification_unavailable':
      Alert.alert('Verification Unavailable', 'We could not check your verification status. Please try again when connected.');
      break;

    case 'kyc_pending':
      Alert.alert(
        'Verification Pending',
        'Your contributor verification is being reviewed. You will be able to post once verified.',
        [{ text: 'OK' }],
      );
      break;

    case 'kyc_rejected':
      Alert.alert(
        'Verification Rejected',
        'Your contributor verification was rejected. Please contact support or re-submit with correct details.',
        [{ text: 'OK' }],
      );
      break;

    case 'suspended':
      Alert.alert(
        'Account Suspended',
        'Your contributor privileges have been suspended. Contact support for more information.',
        [{ text: 'OK' }],
      );
      break;
  }

  return false;
}

// ─── Forensic Logging ───────────────────────────────────────────────────────

/**
 * Capture forensic snapshot and log the action fingerprint.
 * Call this AFTER a content action succeeds.
 *
 * For high-severity actions (posts, comments, issues):
 *   Full snapshot with GPS + public IP + network details
 *
 * For low-severity actions (votes, follows, reactions):
 *   Lightweight snapshot with device + session info only
 *
 * Usage:
 * ```
 * await logContentAction('create_post', {
 *   type: 'post',
 *   id: newPost.id,
 *   body: newPost.content,
 *   screenName: 'feed',
 * });
 * ```
 */
export async function logContentAction(
  actionType: ContentActionType,
  contentInfo?: {
    type?: string;
    id?: string;
    body?: string;
    screenName?: string;
  },
): Promise<ActionFingerprint | null> {
  const store = useContributorVerificationStore.getState();
  const kyc = store.kycRecord;

  if (!kyc) return null;

  try {
    // Choose snapshot depth based on action severity
    const highSeverity = isHighSeverityAction(actionType);
    const snapshot: ForensicSnapshot = highSeverity
      ? await captureForensicSnapshot()
      : await captureLightSnapshot();

    // Build the fingerprint record
    const fingerprint = buildActionFingerprint(
      kyc.userId,
      kyc.id,
      actionType,
      snapshot,
      contentInfo,
    );

    // Log locally
    store.logActionFingerprint(fingerprint);

    // Update device registry
    if (snapshot.device.deviceUniqueId) {
      store.addDevice({
        id: `dev_${Date.now().toString(36)}`,
        userId: kyc.userId,
        deviceBrand: snapshot.device.brand,
        deviceModel: snapshot.device.model,
        deviceOs: snapshot.device.os,
        deviceOsVersion: snapshot.device.osVersion,
        deviceUniqueId: snapshot.device.deviceUniqueId,
        deviceName: snapshot.device.deviceName,
        deviceMemoryMb: snapshot.device.totalMemoryMb,
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        actionCount: 1,
        isTrusted: true,
      });
    }

    // Sync to Supabase in background (non-blocking)
    insertActionFingerprint({
      userId: kyc.userId,
      kycId: kyc.id,
      actionType,
      contentType: contentInfo?.type ?? null,
      contentId: contentInfo?.id ?? null,
      contentHash: fingerprint.contentHash ?? null,
      deviceBrand: snapshot.device.brand,
      deviceModel: snapshot.device.model,
      deviceOs: snapshot.device.os,
      deviceOsVersion: snapshot.device.osVersion,
      deviceUniqueId: snapshot.device.deviceUniqueId,
      deviceName: snapshot.device.deviceName,
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
      actionAt: fingerprint.actionAt,
    }).catch((err) => {
      console.warn('[CCA] Failed to persist action fingerprint to Supabase:', err);
    });

    if (snapshot.device.deviceUniqueId) {
      upsertContributorDevice({
        userId: kyc.userId,
        deviceBrand: snapshot.device.brand,
        deviceModel: snapshot.device.model,
        deviceOs: snapshot.device.os,
        deviceOsVersion: snapshot.device.osVersion,
        deviceUniqueId: snapshot.device.deviceUniqueId,
        deviceName: snapshot.device.deviceName,
        deviceMemoryMb: snapshot.device.totalMemoryMb,
        isTrusted: true,
      }).catch((err) => {
        console.warn('[CCA] Failed to upsert contributor device to Supabase:', err);
      });
    }

    return fingerprint;
  } catch (error) {
    // Fingerprint capture failure should NOT block the content action
    console.warn('[CCA] Failed to capture forensic snapshot:', error);
    return null;
  }
}

// ─── KYC Submission Helper ──────────────────────────────────────────────────

/**
 * Uploads a private selfie and creates a server-owned pending review record.
 * The app keeps only the returned review status in memory.
 */
export async function submitKYC(
  userId: string,
  submission: {
    fullLegalName: string;
    phoneNumber: string;
    selfieUri: string | null;
    selfieMimeType?: string | null;
    termsAccepted: boolean;
  },
): Promise<boolean> {
  const store = useContributorVerificationStore.getState();
  if (
    !userId ||
    useAuthStore.getState().user?.id !== userId ||
    store.ownerUserId !== userId ||
    !isSupabaseConfigured
  ) {
    Alert.alert('Verification Unavailable', 'Sign in and connect to the service before submitting verification.');
    return false;
  }
  if (!submission.selfieUri || submission.termsAccepted !== true) return false;

  store.setKYCLoading(true);

  try {
    const existing = await getContributorKYCStatus(userId);
    if (!existing.success) throw new Error('Verification status could not be checked');
    if (existing.record && existing.record.status !== 'rejected') {
      if (useAuthStore.getState().user?.id !== userId) return false;
      store.setKYCRecord(existing.record);
      if (existing.record.status === 'suspended' || existing.record.status === 'revoked') {
        throw new Error('This verification cannot be resubmitted. Please contact support if you believe this is an error.');
      }
      store.setShowKYCSheet(false);
      store.setKYCLoading(false);
      return true;
    }

    const contentType = submission.selfieMimeType ?? 'image/jpeg';
    if (contentType !== 'image/jpeg' && contentType !== 'image/png') {
      throw new Error('Choose a JPEG or PNG selfie image');
    }
    const extension = contentType === 'image/png' ? 'png' : 'jpg';
    const objectPath = `${userId}/kyc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
    const selfieFile = new File(submission.selfieUri);
    if (selfieFile.size <= 0 || selfieFile.size > 5 * 1024 * 1024) {
      throw new Error('The selfie image must be smaller than 5 MB');
    }
    const { error: uploadError } = await supabase.storage
      .from('kyc-selfies')
      .upload(objectPath, await selfieFile.arrayBuffer(), {
        contentType,
        cacheControl: '0',
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const result = await submitKYCToSupabase(userId, {
      fullLegalName: submission.fullLegalName.trim(),
      phoneNumber: submission.phoneNumber.trim(),
      selfiePath: objectPath,
      termsAccepted: submission.termsAccepted,
    });
    if (!result.success || !result.record) throw new Error('Verification submission could not be saved');
    if (useAuthStore.getState().user?.id !== userId || store.ownerUserId !== userId) return false;
    store.setKYCRecord(result.record);
    store.setShowKYCSheet(false);
    store.setKYCLoading(false);
    return true;
  } catch (error) {
    console.error('[CCA] KYC submission failed:', error);
    store.setKYCLoading(false);
    Alert.alert(
      'Submission Not Saved',
      error instanceof Error ? error.message : 'The service could not save your submission. Please try again.',
      [{ text: 'OK' }],
    );
    return false;
  }
}

// ─── Accountability Info (for admin/moderation views) ───────────────────────

export function getContributorAccountabilitySummary(): {
  isVerified: boolean;
  kycStatus: string | null;
  totalActions: number;
  deviceCount: number;
  lastActionAt: string | null;
  kycDate: string | null;
} {
  const store = useContributorVerificationStore.getState();
  const kyc = store.kycRecord;
  const fingerprints = store.recentFingerprints;

  return {
    isVerified: kyc?.status === 'verified',
    kycStatus: kyc?.status ?? null,
    totalActions: fingerprints.length,
    deviceCount: store.devices.length,
    lastActionAt: fingerprints.length > 0 ? fingerprints[0].actionAt : null,
    kycDate: kyc?.createdAt ?? null,
  };
}
