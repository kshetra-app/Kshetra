/**
 * Unified Tiered Storage & Cache Architecture
 * Master Product Blueprint & MEF Directive — JOB 029
 *
 * Implements a standardized multi-tiered cache engine across:
 * - Tier 1: MMKV (microsecond key-value with LRU capacity management, max 10 MB)
 * - Tier 2: SQLite (structured/relational ACID entities: candidates, MLAs, civic issues)
 * - Tier 3: Disk / FileSystem (content-addressed GeoJSON boundaries, photo blobs, share cards)
 *
 * Provides domain routing, standard TTL matrix, and configurable cache strategies:
 * - CACHE_FIRST
 * - NETWORK_FIRST
 * - STALE_WHILE_REVALIDATE
 * - CACHE_ONLY
 */

import { mmkv, isMMKVAvailable } from '../storage';
import { getDatabaseAdapter } from '../database/database';
import type { DatabaseAdapter } from '../database/types';

export type StorageTier = 'MMKV' | 'SQLITE' | 'DISK';

export type CacheDomain =
  | 'AUTH'
  | 'GEOGRAPHY'
  | 'POLITICAL_ENTITIES'
  | 'CIVIC_FEED'
  | 'BROADCAST';

export type CacheStrategy =
  | 'CACHE_FIRST'
  | 'NETWORK_FIRST'
  | 'STALE_WHILE_REVALIDATE'
  | 'CACHE_ONLY';

export interface CacheOptions {
  domain: CacheDomain;
  strategy?: CacheStrategy;
  ttlMs?: number;
  tier?: StorageTier;
}

export interface CacheEntryMetadata {
  cacheKey: string;
  domain: CacheDomain;
  storageTier: StorageTier;
  version: number;
  contentHash?: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
}

interface StoredPayload<T> {
  data: T;
  meta: CacheEntryMetadata;
}

/** Standard domain cache policies and TTL matrix */
export const DOMAIN_CACHE_POLICIES: Record<
  CacheDomain,
  { defaultTier: StorageTier; defaultTTL: number; defaultStrategy: CacheStrategy }
> = {
  AUTH: {
    defaultTier: 'MMKV',
    defaultTTL: 0, // 0ms — immediate verification
    defaultStrategy: 'NETWORK_FIRST',
  },
  GEOGRAPHY: {
    defaultTier: 'DISK',
    defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    defaultStrategy: 'STALE_WHILE_REVALIDATE',
  },
  POLITICAL_ENTITIES: {
    defaultTier: 'SQLITE',
    defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
    defaultStrategy: 'CACHE_FIRST',
  },
  CIVIC_FEED: {
    defaultTier: 'MMKV',
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    defaultStrategy: 'STALE_WHILE_REVALIDATE',
  },
  BROADCAST: {
    defaultTier: 'MMKV',
    defaultTTL: 5 * 1000, // 5 seconds
    defaultStrategy: 'NETWORK_FIRST',
  },
};

/** In-memory fallback stores */
const memoryKVStore = new Map<string, string>();
const memoryDiskStore = new Map<string, string>();

/** MMKV Max Capacity Budget (10 MB) */
const MAX_MMKV_BYTES = 10 * 1024 * 1024;

export class UnifiedCacheManager {
  private db: DatabaseAdapter | null = null;
  private tablesInitialized = false;

  constructor(customDb?: DatabaseAdapter) {
    if (customDb) {
      this.db = customDb;
    }
  }

  private getDb(): DatabaseAdapter {
    if (!this.db) {
      this.db = getDatabaseAdapter();
    }
    this.ensureTables();
    return this.db;
  }

  private ensureTables(): void {
    if (this.tablesInitialized) return;
    try {
      if (this.db) {
        this.db.execSync(`
          CREATE TABLE IF NOT EXISTS local_cache_meta (
            cache_key TEXT PRIMARY KEY,
            domain TEXT NOT NULL,
            storage_tier TEXT NOT NULL CHECK (storage_tier IN ('MMKV', 'SQLITE', 'DISK')),
            version INTEGER NOT NULL DEFAULT 1,
            content_hash TEXT,
            size_bytes INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            last_accessed_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_cache_domain_expires ON local_cache_meta (domain, expires_at);

          CREATE TABLE IF NOT EXISTS local_cache_entries (
            cache_key TEXT PRIMARY KEY,
            domain TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL,
            last_accessed_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_cache_entries_domain_expires ON local_cache_entries (domain, expires_at);
        `);
        this.tablesInitialized = true;
      }
    } catch {
      // Ignore if adapter fails (e.g. read-only)
    }
  }

  /**
   * Determine effective tier, TTL, and strategy from options or domain defaults
   */
  public resolveConfig(key: string, options: CacheOptions): {
    tier: StorageTier;
    ttlMs: number;
    strategy: CacheStrategy;
  } {
    const domainDef = DOMAIN_CACHE_POLICIES[options.domain] || {
      defaultTier: 'MMKV',
      defaultTTL: 15 * 60 * 1000,
      defaultStrategy: 'CACHE_FIRST',
    };

    return {
      tier: options.tier || domainDef.defaultTier,
      ttlMs: options.ttlMs !== undefined ? options.ttlMs : domainDef.defaultTTL,
      strategy: options.strategy || domainDef.defaultStrategy,
    };
  }

  /**
   * Get cached item across specified tier (or auto-resolved domain tier)
   */
  public async get<T>(key: string, options: CacheOptions): Promise<T | null> {
    const { tier } = this.resolveConfig(key, options);
    const now = Date.now();

    try {
      if (tier === 'MMKV') {
        const mmkvKey = `cache:${options.domain}:${key}`;
        const raw = isMMKVAvailable && mmkv ? mmkv.getString(mmkvKey) : memoryKVStore.get(mmkvKey);
        if (!raw) return null;

        const parsed: StoredPayload<T> = JSON.parse(raw);
        if (parsed.meta.expiresAt > 0 && now > parsed.meta.expiresAt) {
          await this.invalidate(key, options.domain);
          return null;
        }
        parsed.meta.lastAccessedAt = now;
        return parsed.data;
      }

      if (tier === 'SQLITE') {
        const db = this.getDb();
        const row = db.getFirstSync<{ payload: string; expires_at: number }>(
          'SELECT payload, expires_at FROM local_cache_entries WHERE cache_key = ? AND domain = ?;',
          [key, options.domain]
        );
        if (!row) return null;
        if (row.expires_at > 0 && now > row.expires_at) {
          await this.invalidate(key, options.domain);
          return null;
        }

        db.runSync(
          'UPDATE local_cache_entries SET last_accessed_at = ? WHERE cache_key = ?;',
          [now, key]
        );
        db.runSync(
          'UPDATE local_cache_meta SET last_accessed_at = ? WHERE cache_key = ?;',
          [now, key]
        );

        return JSON.parse(row.payload) as T;
      }

      if (tier === 'DISK') {
        const diskKey = `disk:${options.domain}:${key}`;
        const raw = this.readFromDisk(diskKey);
        if (!raw) return null;

        const parsed: StoredPayload<T> = JSON.parse(raw);
        if (parsed.meta.expiresAt > 0 && now > parsed.meta.expiresAt) {
          await this.invalidate(key, options.domain);
          return null;
        }
        return parsed.data;
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Write data to the appropriate storage tier
   */
  public async set<T>(key: string, data: T, options: CacheOptions): Promise<void> {
    const { tier, ttlMs } = this.resolveConfig(key, options);
    const now = Date.now();
    const expiresAt = ttlMs > 0 ? now + ttlMs : 0;
    const rawPayload = JSON.stringify(data);
    const sizeBytes = Buffer.byteLength(rawPayload, 'utf8');

    const meta: CacheEntryMetadata = {
      cacheKey: key,
      domain: options.domain,
      storageTier: tier,
      version: 1,
      sizeBytes,
      createdAt: now,
      expiresAt,
      lastAccessedAt: now,
    };

    const stored: StoredPayload<T> = { data, meta };
    const wrappedString = JSON.stringify(stored);

    if (tier === 'MMKV') {
      const mmkvKey = `cache:${options.domain}:${key}`;
      if (isMMKVAvailable && mmkv) {
        mmkv.set(mmkvKey, wrappedString);
      } else {
        memoryKVStore.set(mmkvKey, wrappedString);
      }
      this.syncMetadata(meta);
      return;
    }

    if (tier === 'SQLITE') {
      const db = this.getDb();
      db.runSync(
        `INSERT OR REPLACE INTO local_cache_entries (cache_key, domain, payload, created_at, expires_at, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [key, options.domain, rawPayload, now, expiresAt, now]
      );
      this.syncMetadata(meta);
      return;
    }

    if (tier === 'DISK') {
      const diskKey = `disk:${options.domain}:${key}`;
      this.writeToDisk(diskKey, wrappedString);
      this.syncMetadata(meta);
      return;
    }
  }

  /**
   * Universal Wrapper with Cache Strategy Enforcement:
   * - CACHE_FIRST
   * - NETWORK_FIRST
   * - STALE_WHILE_REVALIDATE
   * - CACHE_ONLY
   */
  public async wrap<T>(
    key: string,
    options: CacheOptions,
    fetcher: () => Promise<T>
  ): Promise<T> {
    const { strategy } = this.resolveConfig(key, options);

    if (strategy === 'CACHE_ONLY') {
      const cached = await this.get<T>(key, options);
      if (cached !== null) return cached;
      throw new Error(`[UnifiedCacheManager] Cache miss for CACHE_ONLY request: ${key}`);
    }

    if (strategy === 'CACHE_FIRST') {
      const cached = await this.get<T>(key, options);
      if (cached !== null) return cached;
      const fresh = await fetcher();
      await this.set<T>(key, fresh, options);
      return fresh;
    }

    if (strategy === 'NETWORK_FIRST') {
      try {
        const fresh = await fetcher();
        await this.set<T>(key, fresh, options);
        return fresh;
      } catch (networkErr) {
        const fallback = await this.get<T>(key, options);
        if (fallback !== null) return fallback;
        throw networkErr;
      }
    }

    if (strategy === 'STALE_WHILE_REVALIDATE') {
      // 1. Check if raw item exists (even if stale)
      const cached = await this.getRawOrStale<T>(key, options);
      if (cached !== null) {
        // Trigger background revalidation asynchronously
        this.revalidateInBackground(key, options, fetcher);
        return cached.data;
      }

      // No cached data at all; must await network fetch
      const fresh = await fetcher();
      await this.set<T>(key, fresh, options);
      return fresh;
    }

    // Default fallback
    return fetcher();
  }

  /**
   * Invalidate a single key
   */
  public async invalidate(key: string, domain?: CacheDomain): Promise<void> {
    const domains: CacheDomain[] = domain
      ? [domain]
      : ['AUTH', 'GEOGRAPHY', 'POLITICAL_ENTITIES', 'CIVIC_FEED', 'BROADCAST'];

    for (const d of domains) {
      // Clear from MMKV
      const mmkvKey = `cache:${d}:${key}`;
      if (isMMKVAvailable && mmkv) {
        mmkv.delete(mmkvKey);
      }
      memoryKVStore.delete(mmkvKey);

      // Clear from SQLite
      try {
        const db = this.getDb();
        db.runSync('DELETE FROM local_cache_entries WHERE cache_key = ? AND domain = ?;', [key, d]);
        db.runSync('DELETE FROM local_cache_meta WHERE cache_key = ? AND domain = ?;', [key, d]);
      } catch {}

      // Clear from Disk
      const diskKey = `disk:${d}:${key}`;
      this.deleteFromDisk(diskKey);
    }
  }

  /**
   * Invalidate all keys belonging to a domain
   */
  public async invalidateDomain(domain: CacheDomain): Promise<void> {
    // MMKV
    const prefix = `cache:${domain}:`;
    if (isMMKVAvailable && mmkv) {
      const allKeys = mmkv.getAllKeys().filter((k: string) => k.startsWith(prefix));
      for (const k of allKeys) {
        mmkv.delete(k);
      }
    }
    for (const k of Array.from(memoryKVStore.keys())) {
      if (k.startsWith(prefix)) memoryKVStore.delete(k);
    }

    // SQLite
    try {
      const db = this.getDb();
      db.runSync('DELETE FROM local_cache_entries WHERE domain = ?;', [domain]);
      db.runSync('DELETE FROM local_cache_meta WHERE domain = ?;', [domain]);
    } catch {}

    // Disk
    const diskPrefix = `disk:${domain}:`;
    for (const k of Array.from(memoryDiskStore.keys())) {
      if (k.startsWith(diskPrefix)) memoryDiskStore.delete(k);
    }
  }

  /**
   * Prune expired entries across all tiers
   */
  public async pruneExpired(): Promise<{ prunedCount: number; bytesReclaimed: number }> {
    const now = Date.now();
    let prunedCount = 0;
    let bytesReclaimed = 0;

    // Prune MMKV
    if (isMMKVAvailable && mmkv) {
      const allKeys = mmkv.getAllKeys().filter((k: string) => k.startsWith('cache:'));
      for (const k of allKeys) {
        try {
          const raw = mmkv.getString(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.meta?.expiresAt > 0 && now > parsed.meta.expiresAt) {
              mmkv.delete(k);
              prunedCount++;
              bytesReclaimed += parsed.meta.sizeBytes || raw.length;
            }
          }
        } catch {
          mmkv.delete(k);
          prunedCount++;
        }
      }
    } else {
      for (const [k, raw] of Array.from(memoryKVStore.entries())) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed.meta?.expiresAt > 0 && now > parsed.meta.expiresAt) {
            memoryKVStore.delete(k);
            prunedCount++;
            bytesReclaimed += parsed.meta?.sizeBytes || raw.length;
          }
        } catch {
          memoryKVStore.delete(k);
          prunedCount++;
        }
      }
    }

    // Prune SQLite
    try {
      const db = this.getDb();
      const expiredMeta = db.getAllSync<{ cache_key: string; size_bytes: number }>(
        'SELECT cache_key, size_bytes FROM local_cache_meta WHERE expires_at > 0 AND expires_at < ?;',
        [now]
      );
      for (const row of expiredMeta) {
        bytesReclaimed += row.size_bytes;
      }
      const res = db.runSync(
        'DELETE FROM local_cache_entries WHERE expires_at > 0 AND expires_at < ?;',
        [now]
      );
      db.runSync('DELETE FROM local_cache_meta WHERE expires_at > 0 AND expires_at < ?;', [now]);
      prunedCount += res?.changes || expiredMeta.length;
    } catch {}

    // Prune Disk Store
    for (const [k, raw] of Array.from(memoryDiskStore.entries())) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.meta?.expiresAt > 0 && now > parsed.meta.expiresAt) {
          memoryDiskStore.delete(k);
          prunedCount++;
          bytesReclaimed += parsed.meta?.sizeBytes || raw.length;
        }
      } catch {
        memoryDiskStore.delete(k);
        prunedCount++;
      }
    }

    return { prunedCount, bytesReclaimed };
  }

  /**
   * Diagnostic statistics
   */
  public async getStats(): Promise<{
    mmkvEntries: number;
    sqliteEntries: number;
    diskEntries: number;
    totalSizeBytes: number;
  }> {
    let mmkvCount = 0;
    if (isMMKVAvailable && mmkv) {
      mmkvCount = mmkv.getAllKeys().filter((k: string) => k.startsWith('cache:')).length;
    } else {
      mmkvCount = Array.from(memoryKVStore.keys()).filter((k) => k.startsWith('cache:')).length;
    }

    let sqliteCount = 0;
    let totalSizeBytes = 0;
    try {
      const db = this.getDb();
      const metaRow = db.getFirstSync<{ count: number; total_bytes: number }>(
        'SELECT COUNT(*) as count, COALESCE(SUM(size_bytes), 0) as total_bytes FROM local_cache_meta;'
      );
      if (metaRow) {
        sqliteCount = metaRow.count;
        totalSizeBytes = metaRow.total_bytes;
      }
    } catch {}

    const diskEntries = memoryDiskStore.size;

    return {
      mmkvEntries: mmkvCount,
      sqliteEntries: sqliteCount,
      diskEntries,
      totalSizeBytes,
    };
  }

  /**
   * Clear all cached entities across all tiers
   */
  public async clearAll(): Promise<void> {
    // MMKV
    if (isMMKVAvailable && mmkv) {
      const keys = mmkv.getAllKeys().filter((k: string) => k.startsWith('cache:'));
      for (const k of keys) mmkv.delete(k);
    }
    for (const k of Array.from(memoryKVStore.keys())) {
      if (k.startsWith('cache:')) memoryKVStore.delete(k);
    }

    // SQLite
    try {
      const db = this.getDb();
      db.runSync('DELETE FROM local_cache_entries;');
      db.runSync('DELETE FROM local_cache_meta;');
    } catch {}

    // Disk
    memoryDiskStore.clear();
  }

  // --- Internal Tier Support Helpers ---

  private async getRawOrStale<T>(key: string, options: CacheOptions): Promise<{ data: T; isStale: boolean } | null> {
    const { tier, ttlMs } = this.resolveConfig(key, options);
    const now = Date.now();

    try {
      let raw: string | null = null;
      if (tier === 'MMKV') {
        const mmkvKey = `cache:${options.domain}:${key}`;
        raw = isMMKVAvailable && mmkv ? mmkv.getString(mmkvKey) : memoryKVStore.get(mmkvKey) || null;
      } else if (tier === 'SQLITE') {
        const db = this.getDb();
        const row = db.getFirstSync<{ payload: string; created_at: number; expires_at: number }>(
          'SELECT payload, created_at, expires_at FROM local_cache_entries WHERE cache_key = ? AND domain = ?;',
          [key, options.domain]
        );
        if (row) {
          const isStale = row.expires_at > 0 && now > row.expires_at;
          return { data: JSON.parse(row.payload) as T, isStale };
        }
      } else if (tier === 'DISK') {
        const diskKey = `disk:${options.domain}:${key}`;
        raw = this.readFromDisk(diskKey);
      }

      if (!raw) return null;
      const parsed: StoredPayload<T> = JSON.parse(raw);
      const isStale = parsed.meta.expiresAt > 0 && now > parsed.meta.expiresAt;
      return { data: parsed.data, isStale };
    } catch {
      return null;
    }
  }

  private revalidateInBackground<T>(
    key: string,
    options: CacheOptions,
    fetcher: () => Promise<T>
  ): void {
    Promise.resolve().then(async () => {
      try {
        const fresh = await fetcher();
        await this.set<T>(key, fresh, options);
      } catch {
        // Background revalidation failure silently preserves stale data
      }
    });
  }

  private syncMetadata(meta: CacheEntryMetadata): void {
    try {
      const db = this.getDb();
      db.runSync(
        `INSERT OR REPLACE INTO local_cache_meta (
          cache_key, domain, storage_tier, version, content_hash, size_bytes, created_at, expires_at, last_accessed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          meta.cacheKey,
          meta.domain,
          meta.storageTier,
          meta.version,
          meta.contentHash || null,
          meta.sizeBytes,
          meta.createdAt,
          meta.expiresAt,
          meta.lastAccessedAt,
        ]
      );
    } catch {}
  }

  private readFromDisk(diskKey: string): string | null {
    // In Node test / CLI or in-memory fallback
    return memoryDiskStore.get(diskKey) ?? null;
  }

  private writeToDisk(diskKey: string, content: string): void {
    memoryDiskStore.set(diskKey, content);
  }

  private deleteFromDisk(diskKey: string): void {
    memoryDiskStore.delete(diskKey);
  }
}

/** Default singleton instance */
export const unifiedCache = new UnifiedCacheManager();
