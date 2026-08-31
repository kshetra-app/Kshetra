/**
 * Offline Sync Queue
 *
 * Queues write operations when offline and replays them when connectivity returns.
 * Persisted in MMKV so pending ops survive app restarts.
 *
 * Strategy: last-write-wins for simple operations.
 */

import { mmkv, isMMKVAvailable } from './storage';
import { isOnline } from './networkStatus';

const memQueue: SyncOperation[] = [];

function readQueue(): string | null {
  if (isMMKVAvailable && mmkv) return mmkv.getString(QUEUE_KEY) ?? null;
  return null;
}

function writeQueue(data: string): void {
  if (isMMKVAvailable && mmkv) mmkv.set(QUEUE_KEY, data);
}

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
  | 'join_challenge'
  | 'endorse_aspirant'
  | 'submit_kyc'
  | 'update_profile';

export interface SyncOperation {
  id: string;
  type: SyncOpType;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
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
export async function enqueue(type: SyncOpType, payload: Record<string, unknown>): Promise<void> {
  const op: SyncOperation = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
  };

  if (isOnline()) {
    const success = await executeOp(op);
    if (success) return; // Done — no need to queue
  }

  // Queue for later
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
    const success = await executeOp(op);
    if (success) {
      processed++;
    } else {
      op.retries++;
      if (op.retries < MAX_RETRIES) {
        remaining.push(op);
      } else {
        failed++; // Drop after max retries
      }
    }
  }

  writeQueue(JSON.stringify(remaining));
  return { processed, failed };
}

/**
 * Execute a single sync operation against the API.
 * Returns true on success, false on failure.
 */
async function executeOp(op: SyncOperation): Promise<boolean> {
  try {
    const svc = require('./supabaseDataService');
    const p = op.payload;
    switch (op.type) {
      case 'upvote_issue':
        return svc.upvoteIssue(p.issueId as string, p.userId as string);
      case 'follow_issue':
        return svc.followIssue(p.issueId as string, p.userId as string, p.follow as boolean);
      case 'react_post':
        return svc.reactToPost(p.postId as string, p.userId as string, p.reaction as string);
      case 'follow_promise':
        return svc.followPromise(p.promiseId as string, p.userId as string, p.follow as boolean);
      case 'submit_evidence':
        return svc.submitEvidence(p);
      case 'favorite_toggle':
        return svc.toggleFavorite(p.constituencyId as string, p.userId as string, p.isFavorite as boolean);
      case 'report_issue':
        return (await svc.reportIssue(p)).success;
      case 'compose_post':
        return (await svc.composePost(p)).success;
      case 'issue_comment':
        return (await svc.addIssueComment(p.issueId as string, p.userId as string, p.userName as string, p.body as string, p.imageUrl as string | undefined)).success;
      case 'upload_short':
        return (await svc.uploadShort(p as any)).success;
      case 'approve_short':
        return svc.approveShort(p.shortId as string, p.userId as string, p.constituencyId as string | undefined);
      case 'flag_short':
        return svc.flagShort(p.shortId as string, p.userId as string, p.reason as string | undefined);
      case 'register_aspirant':
        return (await svc.registerAspirant(p.userId as string, p as any)).success;
      case 'start_module':
        return svc.startModule(p.userId as string, p.moduleId as string);
      case 'join_challenge':
        return svc.joinChallenge(p.userId as string, p.challengeId as string);
      case 'endorse_aspirant':
        return svc.endorseAspirant(p.endorserId as string, p.aspirantId as string, p.message as string | undefined);
      case 'submit_kyc':
        return (await svc.submitKYC(p.userId as string, p as any)).success;
      case 'update_profile':
        return svc.updateUserProfile(p.userId as string, p as any);
      default:
        return true;
    }
  } catch {
    return false;
  }
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
