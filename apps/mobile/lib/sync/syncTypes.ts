/**
 * Mobile Offline Synchronization Types
 * Master Execution Framework — W021.5-I-01
 */

export type SyncState = 'IDLE' | 'SYNCING' | 'SYNCED' | 'OFFLINE' | 'ERROR';

export type ConflictStrategy = 'CLIENT_WINS' | 'SERVER_WINS' | 'LAST_WRITE_WINS';

export interface MutationOperation<T = Record<string, unknown>> {
  id: string;
  idempotencyKey: string;
  opType: string;
  entityType: string;
  entityId: string;
  payload: T;
  state: 'PENDING' | 'IN_FLIGHT' | 'SYNCED' | 'FAILED' | 'DEAD_LETTER';
  retryCount: number;
  maxRetries: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  totalProcessed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  durationMs: number;
  errors: Array<{ id: string; error: string }>;
}

export interface SyncEngineConfig {
  conflictStrategy?: ConflictStrategy;
  maxRetries?: number;
  batchSize?: number;
}
