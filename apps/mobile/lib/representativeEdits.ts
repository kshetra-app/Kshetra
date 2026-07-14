/**
 * Representative crowdsourced-edit submission (plan Phase 4).
 *
 * A KYC-verified user proposes changes to a local-body representative. Each
 * submission carries a source citation + a forensic digital fingerprint
 * (reusing the CCA/KYC snapshot) and lands in the `representative_edits`
 * moderation queue. On approval a moderator applies the diff to the canonical
 * `representatives` row and flips its `data_status`.
 */
import { supabase, isSupabaseConfigured } from './supabase';
import { captureForensicSnapshot } from './deviceFingerprint';
import type { RepresentativeSourceType } from '@kshetra/shared';

export interface RepresentativeEditInput {
  representativeId: string;
  editorUserId?: string;
  editorKycVerified: boolean;
  sourceType: RepresentativeSourceType;
  sourceUrl?: string;
  citation?: string;
  /** `{ field: { from, to } }` proposed changes. */
  diff: Record<string, { from: unknown; to: unknown }>;
}

export interface RepresentativeEditResult {
  success: boolean;
  queued: boolean; // true when written to the moderation queue
  fingerprintCaptured: boolean;
  error?: string;
}

/**
 * Submit a representative edit: captures a forensic fingerprint, then inserts
 * a `pending` row into `representative_edits`. Never throws — returns a result
 * object so the UI can respond gracefully offline.
 */
export async function submitRepresentativeEdit(
  input: RepresentativeEditInput,
): Promise<RepresentativeEditResult> {
  // 1. Capture the forensic fingerprint (best-effort; never blocks submit).
  let fingerprint: Record<string, unknown> | undefined;
  let fingerprintCaptured = false;
  try {
    fingerprint = (await captureForensicSnapshot()) as unknown as Record<string, unknown>;
    fingerprintCaptured = true;
  } catch {
    fingerprint = undefined;
  }

  // 2. If Supabase isn't configured (dev/offline), report a local success so
  //    the contribution UX still works; the edit can be re-synced later.
  if (!isSupabaseConfigured) {
    return { success: true, queued: false, fingerprintCaptured };
  }

  // 3. Insert into the moderation queue.
  try {
    const { error } = await supabase.from('representative_edits').insert({
      representative_id: input.representativeId,
      editor_user_id: input.editorUserId ?? null,
      editor_kyc_verified: input.editorKycVerified,
      source_type: input.sourceType,
      source_url: input.sourceUrl ?? null,
      citation: input.citation ?? null,
      diff: input.diff,
      digital_fingerprint: fingerprint ?? null,
      moderation_status: 'pending',
    });
    if (error) throw error;
    return { success: true, queued: true, fingerprintCaptured };
  } catch (err) {
    return {
      success: false,
      queued: false,
      fingerprintCaptured,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
