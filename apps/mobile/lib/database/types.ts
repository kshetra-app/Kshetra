/**
 * Mobile Local Database Types
 * Master Execution Framework — W021.5-I-01
 */

export interface MigrationRecord {
  id: number;
  version: number;
  name: string;
  applied_at: string;
}

export type MutationState = 'PENDING' | 'IN_FLIGHT' | 'SYNCED' | 'FAILED' | 'DEAD_LETTER';

export interface MutationQueueRecord {
  id: string;
  idempotency_key: string;
  op_type: string;
  entity_type: string;
  entity_id: string;
  payload: string; // JSON encoded
  state: MutationState;
  retry_count: number;
  max_retries: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CachedEntityRecord {
  entity_type: string;
  entity_id: string;
  data: string; // JSON encoded
  version: number;
  is_deleted: number; // 0 or 1 (tombstone)
  updated_at: string;
}

export interface SyncMetadataRecord {
  key: string;
  value: string;
  updated_at: string;
}

export interface DatabaseAdapter {
  execSync(sql: string): void;
  runSync(sql: string, params?: unknown[]): { changes: number; lastInsertRowId: number };
  getFirstSync<T>(sql: string, params?: unknown[]): T | null;
  getAllSync<T>(sql: string, params?: unknown[]): T[];
  withTransactionSync<T>(fn: () => T): T;
  closeSync?(): void;
}
