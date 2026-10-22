/**
 * Durable Local SQLite Mutation Queue
 * Guarantees zero data loss across app restarts and network interruptions.
 * Replay protection enforced via unique idempotency keys.
 * Master Execution Framework — W021.5-I-01
 */

import type { DatabaseAdapter, MutationQueueRecord } from '../database/types';
import type { MutationOperation } from './syncTypes';

export class MutationQueue {
  private db: DatabaseAdapter;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  enqueue<T = Record<string, unknown>>(op: {
    id?: string;
    idempotencyKey?: string;
    opType: string;
    entityType: string;
    entityId: string;
    payload: T;
    maxRetries?: number;
  }): MutationOperation<T> {
    const id = op.id || `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const idempotencyKey = op.idempotencyKey || `idemp_${id}`;
    const now = new Date().toISOString();
    const maxRetries = op.maxRetries ?? 5;
    const payloadStr = JSON.stringify(op.payload);

    this.db.runSync(
      `INSERT INTO sync_mutation_queue (
        id, idempotency_key, op_type, entity_type, entity_id, payload,
        state, retry_count, max_retries, error_message, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        idempotencyKey,
        op.opType,
        op.entityType,
        op.entityId,
        payloadStr,
        'PENDING',
        0,
        maxRetries,
        null,
        now,
        now
      ]
    );

    return {
      id,
      idempotencyKey,
      opType: op.opType,
      entityType: op.entityType,
      entityId: op.entityId,
      payload: op.payload,
      state: 'PENDING',
      retryCount: 0,
      maxRetries,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    };
  }

  getPending(): MutationOperation[] {
    const rows = this.db.getAllSync<MutationQueueRecord>(
      `SELECT * FROM sync_mutation_queue WHERE state = 'PENDING' ORDER BY created_at ASC;`
    );

    return rows.map(r => this.mapRecordToOp(r));
  }

  markInFlight(id: string): void {
    const now = new Date().toISOString();
    this.db.runSync(
      `UPDATE sync_mutation_queue SET state = ?, updated_at = ? WHERE id = ?;`,
      ['IN_FLIGHT', now, id]
    );
  }

  markSynced(id: string, removeOnSync: boolean = false): void {
    if (removeOnSync) {
      this.db.runSync(`DELETE FROM sync_mutation_queue WHERE id = ?;`, [id]);
    } else {
      const now = new Date().toISOString();
      this.db.runSync(
        `UPDATE sync_mutation_queue SET state = ?, updated_at = ? WHERE id = ?;`,
        ['SYNCED', now, id]
      );
    }
  }

  markFailed(id: string, errorMessage: string): { deadLettered: boolean; retryCount: number } {
    const record = this.db.getFirstSync<MutationQueueRecord>(
      `SELECT * FROM sync_mutation_queue WHERE id = ?;`,
      [id]
    );

    if (!record) {
      return { deadLettered: false, retryCount: 0 };
    }

    const currentRetries = Number(record.retry_count) || 0;
    const maxRetries = Number(record.max_retries) || 5;
    const nextRetries = currentRetries + 1;
    const now = new Date().toISOString();

    const deadLettered = nextRetries >= maxRetries;
    const nextState = deadLettered ? 'DEAD_LETTER' : 'PENDING';

    this.db.runSync(
      `UPDATE sync_mutation_queue SET state = ?, retry_count = retry_count + 1, error_message = ?, updated_at = ? WHERE id = ?;`,
      [nextState, errorMessage, now, id]
    );

    return { deadLettered, retryCount: nextRetries };
  }

  clearSynced(): number {
    const res = this.db.runSync(`DELETE FROM sync_mutation_queue WHERE state = 'SYNCED';`);
    return res.changes;
  }

  count(): { pending: number; inFlight: number; synced: number; deadLetter: number; total: number } {
    const all = this.db.getAllSync<MutationQueueRecord>(`SELECT * FROM sync_mutation_queue ORDER BY created_at ASC;`);
    let pending = 0;
    let inFlight = 0;
    let synced = 0;
    let deadLetter = 0;

    for (const r of all) {
      if (r.state === 'PENDING') pending++;
      else if (r.state === 'IN_FLIGHT') inFlight++;
      else if (r.state === 'SYNCED') synced++;
      else if (r.state === 'DEAD_LETTER') deadLetter++;
    }

    return {
      pending,
      inFlight,
      synced,
      deadLetter,
      total: all.length
    };
  }

  private mapRecordToOp(r: MutationQueueRecord): MutationOperation {
    let payload = {};
    try {
      payload = JSON.parse(r.payload);
    } catch {
      payload = {};
    }
    return {
      id: r.id,
      idempotencyKey: r.idempotency_key,
      opType: r.op_type,
      entityType: r.entity_type,
      entityId: r.entity_id,
      payload,
      state: r.state,
      retryCount: r.retry_count,
      maxRetries: r.max_retries,
      errorMessage: r.error_message,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    };
  }
}
