/**
 * Persistent SQLite Database Adapter using better-sqlite3
 * Provides actual file-backed SQLite persistence for CLI, test runner, and Node.js environments.
 * Master Execution Framework — W021.5-I-01 / CTO Directive 138
 */

import type { DatabaseAdapter } from './types';

export class BetterSqliteAdapter implements DatabaseAdapter {
  private db: any;
  private readonly dbPath: string;

  constructor(dbPath: string = 'kshetra_offline.db') {
    this.dbPath = dbPath;
    // Lazy require so environments without better-sqlite3 don't fail at import time
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Database = require('better-sqlite3');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  getFilePath(): string {
    return this.dbPath;
  }

  execSync(sql: string): void {
    this.db.exec(sql);
  }

  runSync(sql: string, params: unknown[] = []): { changes: number; lastInsertRowId: number } {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowId: Number(result.lastInsertRowid)
    };
  }

  getFirstSync<T>(sql: string, params: unknown[] = []): T | null {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params);
    return (row as T) || null;
  }

  getAllSync<T>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  withTransactionSync<T>(fn: () => T): T {
    const tx = this.db.transaction(fn);
    return tx();
  }

  closeSync(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }
}
