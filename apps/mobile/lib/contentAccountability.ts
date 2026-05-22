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
import type {
  ContentActionType,
  ForensicSnapshot,
  ActionFingerprint,
} from './contentAccountabilityTypes';
import {
  isHighSeverityAction,
  KYC_STATUS_CONFIG,
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

    // In production: send to Supabase
    // await supabase.from('action_fingerprints').insert(fingerprintToRow(fingerprint));

    return fingerprint;
  } catch (error) {
    // Fingerprint capture failure should NOT block the content action
    console.warn('[CCA] Failed to capture forensic snapshot:', error);
    return null;
  }
}

// ─── KYC Submission Helper ──────────────────────────────────────────────────

/**
 * Submit KYC registration. Captures device/network/location and creates
 * the KYC record.
 *
 * In production, this would:
 *   1. Upload selfie to Supabase Storage
 *   2. Create creator_kyc_records row
 *   3. Trigger OTP verification for phone
 *   4. Auto-verify or queue for manual review
 *
 * For now, auto-verifies immediately for demo purposes.
 */
export async function submitKYC(
  userId: string,
  submission: {
    fullLegalName: string;
    phoneNumber: string;
    selfieUri: string | null;
  },
): Promise<boolean> {
  const store = useContributorVerificationStore.getState();
  store.setKYCLoading(true);

  try {
    // Capture full forensic snapshot at KYC time
    const snapshot = await captureForensicSnapshot();

    const now = new Date().toISOString();

    // Build KYC record
    const kycRecord = {
      id: `kyc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      fullLegalName: submission.fullLegalName.trim(),
      phoneNumber: submission.phoneNumber.trim(),
      phoneVerified: false, // Would be true after OTP in production
      selfieUrl: submission.selfieUri, // Would be Supabase Storage URL in production
      selfieHash: submission.selfieUri ? `hash_${Date.now()}` : null,
      device: snapshot.device,
      ipAddress: snapshot.network.publicIp,
      networkType: snapshot.network.networkType,
      carrierName: snapshot.network.carrierName,
      latitude: snapshot.location?.latitude ?? null,
      longitude: snapshot.location?.longitude ?? null,
      locationAccuracy: snapshot.location?.accuracy ?? null,
      locationAddress: snapshot.location?.address ?? null,
      appVersion: snapshot.app.version,
      appBuild: snapshot.app.build,
      // Auto-verify for demo; in production this would be 'pending'
      status: 'verified' as const,
      verifiedAt: now,
      rejectionReason: null,
      termsAcceptedAt: now,
      termsVersion: '1.0',
      createdAt: now,
      updatedAt: now,
    };

    // In production: upload to Supabase
    // const { error } = await supabase.from('creator_kyc_records').insert(kycRecordToRow(kycRecord));
    // if (error) throw error;

    store.setKYCRecord(kycRecord);
    store.setShowKYCSheet(false);
    store.setKYCLoading(false);

    // Register this device
    if (snapshot.device.deviceUniqueId) {
      store.addDevice({
        id: `dev_${Date.now().toString(36)}`,
        userId,
        deviceBrand: snapshot.device.brand,
        deviceModel: snapshot.device.model,
        deviceOs: snapshot.device.os,
        deviceOsVersion: snapshot.device.osVersion,
        deviceUniqueId: snapshot.device.deviceUniqueId,
        deviceName: snapshot.device.deviceName,
        deviceMemoryMb: snapshot.device.totalMemoryMb,
        firstSeenAt: now,
        lastSeenAt: now,
        actionCount: 0,
        isTrusted: true,
      });
    }

    return true;
  } catch (error) {
    console.error('[CCA] KYC submission failed:', error);
    store.setKYCLoading(false);
    Alert.alert(
      'Verification Failed',
      'Something went wrong. Please try again.',
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
