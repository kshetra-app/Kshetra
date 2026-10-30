/**
 * Offline Sync Queue
 *
 * Queues write operations when offline and replays them when connectivity returns.
 * Persisted in MMKV so pending ops survive app restarts.
 *
 * Implements canonical 4-state mutation lifecycle:
 * - SYNCING: in-flight request to backend
 * - QUEUED: stored in local queue awaiting connectivity
 * - SYNCED: authoritative server commit with returned UUID
 * - FAILED: retries exhausted or terminal error, available for user retry
 *
 * Strategy: last-write-wins for simple operations.
 */

import { mmkv, isMMKVAvailable } from './storage';
import { isOnline } from './networkStatus';

function readQueue(): string | null {
  if (isMMKVAvailable && mmkv) return mmkv.getString(QUEUE_KEY) ?? null;
  return null;
}

function writeQueue(data: string): void {
  if (isMMKVAvailable && mmkv) mmkv.set(QUEUE_KEY, data);
}

export type SyncStatus = 'FAILED' | 'QUEUED' | 'SYNCING' | 'SYNCED';

export type SyncOpType =
  | 'upvote_issue'
  | 'follow_issue'
  | 'react_post'
  | 'follow_promise'
  | 'submit_evidence'
  | 'favorite_toggle'
  | 'report_issue'
  | 'compose_post'
  | 'add_comment'
  | 'issue_comment'
  | 'upload_short'
  | 'approve_short'
  | 'flag_short'
  | 'register_aspirant'
  | 'start_module'
  | 'complete_module'
  | 'join_challenge'
  | 'endorse_aspirant'
  | 'submit_kyc'
  | 'update_profile';

export interface SyncOperation {
  id: string;
  clientToken?: string;
  type: SyncOpType;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
  lastError?: string;
}

export interface SyncEvent {
  opType: SyncOpType;
  clientToken?: string;
  status: SyncStatus;
  serverId?: string | null;
  error?: string;
}

type SyncListener = (event: SyncEvent) => void;

const listeners = new Set<SyncListener>();

export function addSyncListener(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifySyncStateChange(event: SyncEvent): void {
  // Built-in store reconciliation
  defaultStoreReconciler(event);

  for (const listener of listeners) {
    try {
      listener(event);
    } catch (e) {
      console.warn('[SyncEngine] Listener dispatch error:', e);
    }
  }
}

function defaultStoreReconciler(event: SyncEvent): void {
  if (!event.clientToken) return;
  try {
    if (event.opType === 'compose_post') {
      const { useFeedStore } = require('../stores/feed');
      useFeedStore.getState().reconcilePostSync?.(event.clientToken, event.status, event.serverId);
    } else if (event.opType === 'report_issue') {
      const { useCivicStore } = require('../stores/civic');
      useCivicStore.getState().reconcileIssueSync?.(event.clientToken, event.status, event.serverId);
    } else if (event.opType === 'add_comment') {
      const { useFeedStore } = require('../stores/feed');
      useFeedStore.getState().reconcileCommentSync?.(event.clientToken, event.status, event.serverId);
    }
  } catch {
    // Ignore in tests or when stores are uninitialized
  }
}

const QUEUE_KEY = 'kshetra-sync-queue';
const MAX_RETRIES = 3;

/**
 * Get the current pending queue.
 */
export function getPendingOps(): SyncOperation[] {
  try {
    const raw = readQueue();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Enqueue an operation. If online, attempt immediate execution.
 */
export async function enqueue(
  type: SyncOpType,
  payload: Record<string, unknown>,
  clientToken?: string,
): Promise<void> {
  const token = clientToken ?? (payload.clientToken as string) ?? `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const op: SyncOperation = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clientToken: token,
    type,
    payload: { ...payload, clientToken: token },
    createdAt: Date.now(),
    retries: 0,
  };

  if (isOnline()) {
    notifySyncStateChange({ opType: type, clientToken: token, status: 'SYNCING' });
    const result = await executeOp(op);
    if (result.success) {
      notifySyncStateChange({ opType: type, clientToken: token, status: 'SYNCED', serverId: result.id });
      return; // Done — no need to queue
    }
  }

  // Queue for later
  notifySyncStateChange({ opType: type, clientToken: token, status: 'QUEUED' });
  const queue = getPendingOps();
  queue.push(op);
  writeQueue(JSON.stringify(queue));
}

/**
 * Attempt to flush the entire queue. Called when connectivity returns.
 */
export async function flushQueue(): Promise<{ processed: number; failed: number }> {
  const queue = getPendingOps();
  if (queue.length === 0) return { processed: 0, failed: 0 };
  if (!isOnline()) return { processed: 0, failed: queue.length };

  let processed = 0;
  let failed = 0;
  const remaining: SyncOperation[] = [];

  for (const op of queue) {
    const clientToken = op.clientToken ?? (op.payload?.clientToken as string) ?? op.id;
    notifySyncStateChange({
      opType: op.type,
      clientToken,
      status: 'SYNCING',
    });

    const result = await executeOp(op);
    if (result.success) {
      processed++;
      notifySyncStateChange({
        opType: op.type,
        clientToken,
        status: 'SYNCED',
        serverId: result.id,
      });
    } else {
      op.retries++;
      op.lastError = result.error;
      if (op.retries < MAX_RETRIES) {
        remaining.push(op);
        notifySyncStateChange({
          opType: op.type,
          clientToken,
          status: 'QUEUED',
          error: result.error,
        });
      } else {
        failed++; // Drop after max retries
        notifySyncStateChange({
          opType: op.type,
          clientToken,
          status: 'FAILED',
          error: result.error || 'Max retries exhausted',
        });
      }
    }
  }

  writeQueue(JSON.stringify(remaining));
  return { processed, failed };
}

/**
 * Execute a single sync operation against the API.
 * Returns { success, id?, error? }.
 */
export async function executeOp(op: SyncOperation): Promise<{ success: boolean; id?: string | null; error?: string }> {
  try {
    const svc = require('./supabaseDataService');
    const p = op.payload;
    switch (op.type) {
      case 'upvote_issue':
        return { success: await svc.upvoteIssue(p.issueId as string, p.userId as string) };
      case 'follow_issue':
        return { success: await svc.followIssue(p.issueId as string, p.userId as string, p.follow as boolean) };
      case 'react_post':
        return { success: await svc.reactToPost(p.postId as string, p.userId as string, p.reaction as string) };
      case 'follow_promise':
        return { success: await svc.followPromise(p.promiseId as string, p.userId as string, p.follow as boolean) };
      case 'submit_evidence':
        return { success: await svc.submitEvidence(p) };
      case 'favorite_toggle':
        return { success: await svc.toggleFavorite(p.constituencyId as string, p.userId as string, p.isFavorite as boolean) };
      case 'report_issue': {
        const res = await svc.reportIssue(p);
        return { success: res.success, id: res.id };
      }
      case 'compose_post': {
        const res = await svc.composePost(p);
        return { success: res.success, id: res.id };
      }
      case 'add_comment': {
        const res = await svc.addPostComment(p.postId as string, p.userId as string, p.content as string, p.language as string | undefined);
        return { success: res.success, id: res.id };
      }
      case 'issue_comment': {
        const res = await svc.addIssueComment(p.issueId as string, p.userId as string, p.userName as string, p.body as string, p.imageUrl as string | undefined);
        return { success: res.success, id: res.id };
      }
      case 'upload_short': {
        const res = await svc.uploadShort(p as any);
        return { success: res.success, id: res.id };
      }
      case 'approve_short':
        return { success: await svc.approveShort(p.shortId as string, p.userId as string, p.constituencyId as string | undefined) };
      case 'flag_short':
        return { success: await svc.flagShort(p.shortId as string, p.userId as string, p.reason as string | undefined) };
      case 'register_aspirant': {
        const res = await svc.registerAspirant(p.userId as string, p as any);
        return { success: res.success, id: res.id };
      }
      case 'start_module':
        return { success: await svc.startModule(p.userId as string, p.moduleId as string) };
      case 'complete_module':
        return { success: await svc.completeModule(p.userId as string, p.moduleId as string, p.quizScore as number | undefined) };
      case 'join_challenge':
        return { success: await svc.joinChallenge(p.userId as string, p.challengeId as string) };
      case 'endorse_aspirant':
        return { success: await svc.endorseAspirant(p.endorserId as string, p.aspirantId as string, p.message as string | undefined) };
      case 'submit_kyc': {
        const res = await svc.submitKYC(p.userId as string, p as any);
        return { success: res.success, id: res.id };
      }
      case 'update_profile':
        return { success: await svc.updateUserProfile(p.userId as string, p as any) };
      default:
        return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Execution exception' };
  }
}

/**
 * Manual retry for a failed operation.
 */
export async function retryFailedOp(clientToken: string): Promise<boolean> {
  const queue = getPendingOps();
  const existingIdx = queue.findIndex(
    (o) => o.clientToken === clientToken || o.payload?.clientToken === clientToken,
  );
  if (existingIdx !== -1) {
    queue[existingIdx].retries = 0;
    writeQueue(JSON.stringify(queue));
  }
  const result = await flushQueue();
  return result.processed > 0;
}

/**
 * Clear the entire queue (for debugging/reset).
 */
export function clearQueue(): void {
  writeQueue(JSON.stringify([]));
}

/**
 * Get queue size.
 */
export function getQueueSize(): number {
  return getPendingOps().length;
}
