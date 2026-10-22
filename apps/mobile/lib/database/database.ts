/**
 * SQLite Local Database Service & Connection Manager
 * Automatically selects expo-sqlite when running on device, or MemorySqliteAdapter
 * when running under Node.js CLI / unit test runners.
 * Master Execution Framework — W021.5-I-01
 */

import type { DatabaseAdapter } from './types';
import { MemorySqliteAdapter } from './memoryAdapter';
import { MigrationRunner, type MigrationStatus } from './migrations';

let instance: DatabaseAdapter | null = null;
let migrationStatus: MigrationStatus | null = null;

export function getDatabaseAdapter(forceMemory: boolean = false): DatabaseAdapter {
  if (instance && !forceMemory) {
    return instance;
  }

  if (forceMemory) {
    return new MemorySqliteAdapter();
  }

  // Attempt to load expo-sqlite if available in the runtime environment
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ExpoSQLite = require('expo-sqlite');
    if (ExpoSQLite && typeof ExpoSQLite.openDatabaseSync === 'function') {
      const nativeDb = ExpoSQLite.openDatabaseSync('kshetra_offline.db');
      instance = {
        execSync: (sql: string) => nativeDb.execSync(sql),
        runSync: (sql: string, params: unknown[] = []) => nativeDb.runSync(sql, params as any),
        getFirstSync: <T>(sql: string, params: unknown[] = []) => nativeDb.getFirstSync(sql, params as any) as T | null,
        getAllSync: <T>(sql: string, params: unknown[] = []) => nativeDb.getAllSync(sql, params as any) as T[],
        withTransactionSync: <T>(fn: () => T) => nativeDb.withTransactionSync(fn),
        closeSync: () => nativeDb.closeSync?.()
      };
      return instance;
    }
  } catch {
    // In Node.js testing environment, expo-sqlite native bindings will fail; fall back to MemorySqliteAdapter
  }

  instance = new MemorySqliteAdapter();
  return instance;
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
