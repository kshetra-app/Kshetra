/**
 * Offline Sync Contracts (JOB 072)
 *
 * Implements canonical 5-state client-side mutation sync lifecycle:
 * - LOCAL_ONLY: Created on device, stored locally, visible in UI with optimistic badge.
 * - QUEUED: Persisted in local queue awaiting network dispatch.
 * - SYNCING: In-flight request to backend with idempotency token.
 * - SYNCED: Authoritative backend commit with returned entity UUID.
 * - FAILED: Retries exhausted or terminal error; retains local copy for manual retry.
 */

export type OfflineSyncState = 'LOCAL_ONLY' | 'QUEUED' | 'SYNCING' | 'SYNCED' | 'FAILED';

export type OfflineMutationType =
  | 'report_issue'
  | 'upvote_issue'
  | 'follow_issue'
  | 'submit_evidence'
  | 'react_post'
  | 'compose_post'
  | 'add_comment'
  | 'favorite_toggle'
  | 'upload_short'
  | 'flag_content'
  | 'register_aspirant'
  | 'submit_kyc'
  | 'update_profile';

export interface OfflineMutationRecord<T = Record<string, unknown>> {
  id: string; // Client-generated UUID v4
  clientToken: string; // Cryptographic verification token
  operationType: OfflineMutationType;
  payload: T;
  state: OfflineSyncState;
  createdAt: string; // ISO 8601
  updatedAt: string;
  retryCount: number;
  maxRetries: number;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  serverEntityId?: string; // Assigned upon successful sync
  serverCommittedAt?: string;
}

export interface OfflineSyncQueueSummary {
  total: number;
  localOnly: number;
  queued: number;
  syncing: number;
  synced: number;
  failed: number;
  isOnline: boolean;
  lastSyncTimestamp?: string;
}

export interface OfflineReconnectionResult {
  processed: number;
  succeeded: number;
  failed: number;
  remainingQueued: number;
  durationMs: number;
}
