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
  | 'compose_post';

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
    // In production, these would call real Supabase/API endpoints.
    // For now, we simulate success for all operations since
    // the actual data is managed locally by Zustand stores.
    switch (op.type) {
      case 'upvote_issue':
      case 'follow_issue':
      case 'react_post':
      case 'follow_promise':
      case 'submit_evidence':
      case 'favorite_toggle':
      case 'report_issue':
      case 'compose_post':
        // Zustand stores already applied the change locally.
        // This would push to Supabase when backend is wired.
        return true;
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
