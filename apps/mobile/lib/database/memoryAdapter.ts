/**
 * Deterministic In-Memory SQLite Adapter for Node.js / CLI Test Environments
 * Implements full DatabaseAdapter interface for fast, reproducible testing.
 * Master Execution Framework — W021.5-I-01
 */

import type { DatabaseAdapter } from './types';

interface TableRow {
  [key: string]: unknown;
}

export class MemorySqliteAdapter implements DatabaseAdapter {
  private tables: Map<string, TableRow[]> = new Map();
  private inTransaction: boolean = false;
  private transactionSnapshot: Map<string, string> | null = null;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.tables.clear();
  }

  execSync(sql: string): void {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      this.executeStatement(stmt);
    }
  }

  runSync(sql: string, params: unknown[] = []): { changes: number; lastInsertRowId: number } {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    if (/^INSERT INTO sync_mutation_queue/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      let id: unknown,
        idempotency_key: unknown,
        op_type: unknown,
        entity_type: unknown,
        entity_id: unknown,
        payload: unknown,
        state: unknown,
        retry_count: unknown,
        max_retries: unknown,
        error_message: unknown,
        created_at: unknown,
        updated_at: unknown;

      if (params.length === 12) {
        [id, idempotency_key, op_type, entity_type, entity_id, payload, state, retry_count, max_retries, error_message, created_at, updated_at] = params;
      } else if (params.length === 9) {
        [id, idempotency_key, op_type, entity_type, entity_id, payload, max_retries, created_at, updated_at] = params;
        state = 'PENDING';
        retry_count = 0;
        error_message = null;
      } else {
        [id, idempotency_key, op_type, entity_type, entity_id, payload] = params;
        state = 'PENDING';
        retry_count = 0;
        max_retries = 5;
        error_message = null;
        created_at = new Date().toISOString();
        updated_at = created_at;
      }

      const existing = rows.find(r => r.idempotency_key === idempotency_key || r.id === id);
      if (existing) {
        throw new Error(`UNIQUE constraint failed: sync_mutation_queue.idempotency_key (${idempotency_key})`);
      }

      rows.push({
        id,
        idempotency_key,
        op_type,
        entity_type,
        entity_id,
        payload,
        state: state || 'PENDING',
        retry_count: retry_count || 0,
        max_retries: max_retries || 5,
        error_message: error_message || null,
        created_at: created_at || new Date().toISOString(),
        updated_at: updated_at || new Date().toISOString()
      });
      return { changes: 1, lastInsertRowId: rows.length };
    }

    if (/^INSERT INTO cached_entities/i.test(cleanSql) || /^INSERT OR REPLACE INTO cached_entities/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('cached_entities');
      const [entity_type, entity_id, data, version, is_deleted, updated_at] = params;
      const idx = rows.findIndex(r => r.entity_type === entity_type && r.entity_id === entity_id);
      const row = {
        entity_type,
        entity_id,
        data,
        version: version || 1,
        is_deleted: is_deleted ? 1 : 0,
        updated_at: updated_at || new Date().toISOString()
      };
      if (idx !== -1) {
        rows[idx] = row;
      } else {
        rows.push(row);
      }
      return { changes: 1, lastInsertRowId: rows.length };
    }

    if (/^INSERT INTO _migrations/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('_migrations');
      const [version, name, applied_at] = params;
      rows.push({
        id: rows.length + 1,
        version,
        name,
        applied_at
      });
      return { changes: 1, lastInsertRowId: rows.length };
    }

    if (/^INSERT OR REPLACE INTO sync_metadata/i.test(cleanSql) || /^INSERT INTO sync_metadata/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_metadata');
      const [key, value, updated_at] = params;
      const idx = rows.findIndex(r => r.key === key);
      const row = { key, value, updated_at };
      if (idx !== -1) {
        rows[idx] = row;
      } else {
        rows.push(row);
      }
      return { changes: 1, lastInsertRowId: rows.length };
    }

    if (/^UPDATE sync_mutation_queue/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      let changes = 0;
      if (/SET state = \?, retry_count = retry_count \+ 1, error_message = \?, updated_at = \? WHERE id = \?/i.test(cleanSql)) {
        const [state, error_message, updated_at, id] = params;
        const target = rows.find(r => r.id === id);
        if (target) {
          target.state = state;
          target.retry_count = (Number(target.retry_count) || 0) + 1;
          target.error_message = error_message;
          target.updated_at = updated_at;
          changes++;
        }
      } else if (/SET state = \?, updated_at = \? WHERE id = \?/i.test(cleanSql)) {
        const [state, updated_at, id] = params;
        const target = rows.find(r => r.id === id);
        if (target) {
          target.state = state;
          target.updated_at = updated_at;
          changes++;
        }
      } else if (/SET state = 'SYNCED', updated_at = \? WHERE id = \?/i.test(cleanSql)) {
        const [updated_at, id] = params;
        const target = rows.find(r => r.id === id);
        if (target) {
          target.state = 'SYNCED';
          target.updated_at = updated_at;
          changes++;
        }
      } else if (/SET state = 'IN_FLIGHT', updated_at = \? WHERE id = \?/i.test(cleanSql)) {
        const [updated_at, id] = params;
        const target = rows.find(r => r.id === id);
        if (target) {
          target.state = 'IN_FLIGHT';
          target.updated_at = updated_at;
          changes++;
        }
      } else if (/SET state = \?, error_message = \?, updated_at = \? WHERE id = \?/i.test(cleanSql)) {
        const [state, error_message, updated_at, id] = params;
        const target = rows.find(r => r.id === id);
        if (target) {
          target.state = state;
          target.error_message = error_message;
          target.updated_at = updated_at;
          changes++;
        }
      }
      return { changes, lastInsertRowId: 0 };
    }

    if (/^DELETE FROM sync_mutation_queue WHERE id = \?/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      const [id] = params;
      const idx = rows.findIndex(r => r.id === id);
      if (idx !== -1) {
        rows.splice(idx, 1);
        return { changes: 1, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    if (/^DELETE FROM sync_mutation_queue WHERE state = 'SYNCED'/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      const before = rows.length;
      const kept = rows.filter(r => r.state !== 'SYNCED');
      this.tables.set('sync_mutation_queue', kept);
      return { changes: before - kept.length, lastInsertRowId: 0 };
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  getFirstSync<T>(sql: string, params: unknown[] = []): T | null {
    const all = this.getAllSync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }

  getAllSync<T>(sql: string, params: unknown[] = []): T[] {
    const cleanSql = sql.trim().replace(/\s+/g, ' ');

    if (/SELECT version FROM _migrations/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('_migrations');
      return rows.map(r => ({ version: r.version })) as unknown as T[];
    }

    if (/SELECT \* FROM sync_mutation_queue WHERE state = 'PENDING'/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      return rows
        .filter(r => r.state === 'PENDING')
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) as unknown as T[];
    }

    if (/SELECT \* FROM sync_mutation_queue WHERE id = \?/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      const [id] = params;
      return rows.filter(r => r.id === id) as unknown as T[];
    }

    if (/SELECT \* FROM sync_mutation_queue WHERE idempotency_key = \?/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      const [key] = params;
      return rows.filter(r => r.idempotency_key === key) as unknown as T[];
    }

    if (/SELECT \* FROM sync_mutation_queue ORDER BY created_at/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_mutation_queue');
      return [...rows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) as unknown as T[];
    }

    if (/SELECT \* FROM cached_entities WHERE entity_type = \? AND entity_id = \?/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('cached_entities');
      const [entity_type, entity_id] = params;
      return rows.filter(r => r.entity_type === entity_type && r.entity_id === entity_id) as unknown as T[];
    }

    if (/SELECT \* FROM cached_entities WHERE entity_type = \? AND is_deleted = 0/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('cached_entities');
      const [entity_type] = params;
      return rows.filter(r => r.entity_type === entity_type && !r.is_deleted) as unknown as T[];
    }

    if (/SELECT value FROM sync_metadata WHERE key = \?/i.test(cleanSql)) {
      const rows = this.getOrCreateTable('sync_metadata');
      const [key] = params;
      return rows.filter(r => r.key === key).map(r => ({ value: r.value })) as unknown as T[];
    }

    return [];
  }

  withTransactionSync<T>(fn: () => T): T {
    if (this.inTransaction) {
      return fn();
    }

    // Save snapshot for rollback
    this.inTransaction = true;
    this.transactionSnapshot = new Map();
    for (const [tName, rows] of this.tables.entries()) {
      this.transactionSnapshot.set(tName, JSON.stringify(rows));
    }

    try {
      const res = fn();
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return res;
    } catch (err) {
      // Rollback
      if (this.transactionSnapshot) {
        this.tables.clear();
        for (const [tName, raw] of this.transactionSnapshot.entries()) {
          this.tables.set(tName, JSON.parse(raw));
        }
      }
      this.inTransaction = false;
      this.transactionSnapshot = null;
      throw err;
    }
  }

  private executeStatement(stmt: string): void {
    const clean = stmt.replace(/\s+/g, ' ');
    if (/CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)/i.test(clean)) {
      const match = clean.match(/CREATE TABLE IF NOT EXISTS ([a-zA-Z0-9_]+)/i);
      if (match && !this.tables.has(match[1])) {
        this.tables.set(match[1], []);
      }
    }
  }

  private getOrCreateTable(name: string): TableRow[] {
    let rows = this.tables.get(name);
    if (!rows) {
      rows = [];
      this.tables.set(name, rows);
    }
    return rows;
  }
}
