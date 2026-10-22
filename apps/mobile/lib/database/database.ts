/**
 * SQLite Local Database Service & Connection Manager
 * Automatically selects expo-sqlite when running on device, BetterSqliteAdapter
 * when running under Node.js CLI / unit test runners with persistent disk storage,
 * or MemorySqliteAdapter only when explicitly requested.
 * Master Execution Framework — W021.5-I-01 / CTO Directive 138
 */

import type { DatabaseAdapter } from './types';
import { MemorySqliteAdapter } from './memoryAdapter';
import { BetterSqliteAdapter } from './betterSqliteAdapter';
import { MigrationRunner, type MigrationStatus } from './migrations';

let instance: DatabaseAdapter | null = null;
let migrationStatus: MigrationStatus | null = null;

export interface DatabaseOptions {
  forceMemory?: boolean;
  dbPath?: string;
}

export function getDatabaseAdapter(options?: DatabaseOptions | boolean): DatabaseAdapter {
  const forceMemory = typeof options === 'boolean' ? options : options?.forceMemory ?? false;
  const dbPath = typeof options === 'object' ? options.dbPath : undefined;

  if (instance && !forceMemory && !dbPath) {
    return instance;
  }

  if (forceMemory) {
    return new MemorySqliteAdapter();
  }

  // 1. Attempt to load expo-sqlite if available in the mobile runtime environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoSQLite = require('expo-sqlite');
    if (ExpoSQLite && typeof ExpoSQLite.openDatabaseSync === 'function') {
      const nativeDb = ExpoSQLite.openDatabaseSync(dbPath || 'kshetra_offline.db');
      const adapter: DatabaseAdapter = {
        execSync: (sql: string) => nativeDb.execSync(sql),
        runSync: (sql: string, params: unknown[] = []) => nativeDb.runSync(sql, params as any),
        getFirstSync: <T>(sql: string, params: unknown[] = []) => nativeDb.getFirstSync(sql, params as any) as T | null,
        getAllSync: <T>(sql: string, params: unknown[] = []) => nativeDb.getAllSync(sql, params as any) as T[],
        withTransactionSync: <T>(fn: () => T) => nativeDb.withTransactionSync(fn),
        closeSync: () => nativeDb.closeSync?.()
      };
      if (!dbPath) instance = adapter;
      return adapter;
    }
  } catch {
    // Expo-sqlite native bindings unavailable in non-mobile runtime
  }

  // 2. Attempt to load BetterSqliteAdapter for persistent on-disk SQLite under Node/CLI/Test runner
  try {
    const adapter = new BetterSqliteAdapter(dbPath || 'kshetra_offline.db');
    if (!dbPath) instance = adapter;
    return adapter;
  } catch {
    // Fall back to MemorySqliteAdapter only if better-sqlite3 native bindings fail
  }

  const memoryAdapter = new MemorySqliteAdapter();
  if (!dbPath) instance = memoryAdapter;
  return memoryAdapter;
}

export function resetDatabaseInstance(): void {
  if (instance && typeof instance.closeSync === 'function') {
    instance.closeSync();
  }
  instance = null;
  migrationStatus = null;
}

export function initLocalDatabase(adapter?: DatabaseAdapter): { db: DatabaseAdapter; migration: MigrationStatus } {
  const db = adapter || getDatabaseAdapter();
  const runner = new MigrationRunner(db);
  migrationStatus = runner.migrateToLatest();
  return { db, migration: migrationStatus };
}

export function getMigrationStatus(): MigrationStatus | null {
  return migrationStatus;
}
