/**
 * SQLite Local Schema & Migrations Definition
 * Master Execution Framework — W021.5-I-01
 */

export interface MigrationDefinition {
  version: number;
  name: string;
  up: string[];
}

export const MIGRATIONS: MigrationDefinition[] = [
  {
    version: 1,
    name: '001_initial_offline_sync_tables',
    up: [
      `CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS sync_mutation_queue (
        id TEXT PRIMARY KEY,
        idempotency_key TEXT UNIQUE NOT NULL,
        op_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'PENDING',
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 5,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`,

      `CREATE TABLE IF NOT EXISTS cached_entities (
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id)
      );`,

      `CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );`
    ]
  },
  {
    version: 2,
    name: '002_sync_indices_and_dead_letter_support',
    up: [
      `CREATE INDEX IF NOT EXISTS idx_mutation_queue_state_created 
        ON sync_mutation_queue (state, created_at);`,

      `CREATE INDEX IF NOT EXISTS idx_mutation_queue_idempotency 
        ON sync_mutation_queue (idempotency_key);`,

      `CREATE INDEX IF NOT EXISTS idx_cached_entities_lookup 
        ON cached_entities (entity_type, is_deleted, updated_at);`
    ]
  }
];
