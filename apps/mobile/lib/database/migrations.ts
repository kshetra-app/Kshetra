/**
 * SQLite Local Migration Runner
 * Master Execution Framework — W021.5-I-01
 */

import type { DatabaseAdapter } from './types';
import { MIGRATIONS } from './schema';

export interface MigrationStatus {
  currentVersion: number;
  latestVersion: number;
  appliedCount: number;
}

export class MigrationRunner {
  private db: DatabaseAdapter;

  constructor(db: DatabaseAdapter) {
    this.db = db;
  }

  /**
   * Applies all pending migrations up to the latest version within a single transaction.
   */
  migrateToLatest(): MigrationStatus {
    // Ensure migrations tracking table exists
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    const applied = this.getAppliedVersions();
    let appliedCount = 0;

    this.db.withTransactionSync(() => {
      for (const migration of MIGRATIONS) {
        if (!applied.has(migration.version)) {
          for (const ddl of migration.up) {
            this.db.execSync(ddl);
          }
          this.db.runSync(
            `INSERT INTO _migrations (version, name, applied_at) VALUES (?, ?, ?);`,
            [migration.version, migration.name, new Date().toISOString()]
          );
          applied.add(migration.version);
          appliedCount++;
        }
      }
    });

    const currentVersion = Math.max(0, ...Array.from(applied));
    const latestVersion = Math.max(0, ...MIGRATIONS.map(m => m.version));

    return {
      currentVersion,
      latestVersion,
      appliedCount
    };
  }

  getAppliedVersions(): Set<number> {
    try {
      const rows = this.db.getAllSync<{ version: number }>(`SELECT version FROM _migrations ORDER BY version ASC;`);
      return new Set(rows.map(r => r.version));
    } catch {
      return new Set();
    }
  }
}
