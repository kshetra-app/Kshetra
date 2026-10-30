/**
 * JOB 029: Standardized Tiered Storage & Cache Architecture Test Suite
 * Master Execution Framework — Domain 2 Acceptance Gate
 *
 * Verifies:
 * 1. Domain routing and default TTL/tier configurations.
 * 2. Multi-tier read/write isolation (MMKV, SQLite, DISK).
 * 3. Cache strategy execution (CACHE_FIRST, NETWORK_FIRST, STALE_WHILE_REVALIDATE, CACHE_ONLY).
 * 4. Key and domain-wide invalidation.
 * 5. Automatic TTL expiration and background pruning.
 */

import assert from 'node:assert';
import {
  UnifiedCacheManager,
  DOMAIN_CACHE_POLICIES,
  type CacheDomain,
} from '../apps/mobile/lib/cache/unifiedCacheManager';
import { MemorySqliteAdapter } from '../apps/mobile/lib/database/memoryAdapter';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runJob029Tests() {
  console.log('=== RUNNING JOB 029 TIERED CACHE ARCHITECTURE BENCHMARK ===\n');
  const memoryDb = new MemorySqliteAdapter();
  const cache = new UnifiedCacheManager(memoryDb);

  // -------------------------------------------------------------
  // [CHECK 1] Verify Domain Policies & Default TTLs
  // -------------------------------------------------------------
  console.log('[CHECK 1] Validating Domain Cache Policies & Default TTLs...');

  assert.strictEqual(DOMAIN_CACHE_POLICIES.AUTH.defaultTier, 'MMKV');
  assert.strictEqual(DOMAIN_CACHE_POLICIES.AUTH.defaultTTL, 0);
  assert.strictEqual(DOMAIN_CACHE_POLICIES.AUTH.defaultStrategy, 'NETWORK_FIRST');

  assert.strictEqual(DOMAIN_CACHE_POLICIES.GEOGRAPHY.defaultTier, 'DISK');
  assert.strictEqual(DOMAIN_CACHE_POLICIES.GEOGRAPHY.defaultTTL, 7 * 24 * 60 * 60 * 1000);
  assert.strictEqual(DOMAIN_CACHE_POLICIES.GEOGRAPHY.defaultStrategy, 'STALE_WHILE_REVALIDATE');

  assert.strictEqual(DOMAIN_CACHE_POLICIES.POLITICAL_ENTITIES.defaultTier, 'SQLITE');
  assert.strictEqual(DOMAIN_CACHE_POLICIES.POLITICAL_ENTITIES.defaultTTL, 24 * 60 * 60 * 1000);
  assert.strictEqual(DOMAIN_CACHE_POLICIES.POLITICAL_ENTITIES.defaultStrategy, 'CACHE_FIRST');

  assert.strictEqual(DOMAIN_CACHE_POLICIES.CIVIC_FEED.defaultTier, 'MMKV');
  assert.strictEqual(DOMAIN_CACHE_POLICIES.CIVIC_FEED.defaultTTL, 15 * 60 * 1000);
  assert.strictEqual(DOMAIN_CACHE_POLICIES.CIVIC_FEED.defaultStrategy, 'STALE_WHILE_REVALIDATE');

  assert.strictEqual(DOMAIN_CACHE_POLICIES.BROADCAST.defaultTier, 'MMKV');
  assert.strictEqual(DOMAIN_CACHE_POLICIES.BROADCAST.defaultTTL, 5000);

  console.log('  [PASS] All 5 domain policies and default TTL values certified.');

  // -------------------------------------------------------------
  // [CHECK 2] Multi-Tier Storage Operations (MMKV, SQLite, DISK)
  // -------------------------------------------------------------
  console.log('[CHECK 2] Validating Multi-Tier Storage Operations...');

  // 1. Tier MMKV
  await cache.set('user_pref_1', { theme: 'dark', lang: 'te' }, { domain: 'CIVIC_FEED', tier: 'MMKV' });
  const mmkvResult = await cache.get<{ theme: string; lang: string }>('user_pref_1', { domain: 'CIVIC_FEED', tier: 'MMKV' });
  assert.deepStrictEqual(mmkvResult, { theme: 'dark', lang: 'te' });

  // 2. Tier SQLite
  await cache.set('candidate_001', { name: 'R. Sharma', ac_id: 'AC-101' }, { domain: 'POLITICAL_ENTITIES', tier: 'SQLITE' });
  const sqliteResult = await cache.get<{ name: string; ac_id: string }>('candidate_001', { domain: 'POLITICAL_ENTITIES', tier: 'SQLITE' });
  assert.deepStrictEqual(sqliteResult, { name: 'R. Sharma', ac_id: 'AC-101' });

  // 3. Tier DISK
  await cache.set('boundary_IN', { type: 'FeatureCollection', features: [] }, { domain: 'GEOGRAPHY', tier: 'DISK' });
  const diskResult = await cache.get<{ type: string }>('boundary_IN', { domain: 'GEOGRAPHY', tier: 'DISK' });
  assert.strictEqual(diskResult?.type, 'FeatureCollection');

  console.log('  [PASS] Read/write across MMKV, SQLite, and DISK passed.');

  // -------------------------------------------------------------
  // [CHECK 3] Cache Strategies (CACHE_FIRST, NETWORK_FIRST, SWR, CACHE_ONLY)
  // -------------------------------------------------------------
  console.log('[CHECK 3] Testing Cache Strategies...');

  // CACHE_FIRST
  let fetchCount1 = 0;
  const fetcher1 = async () => {
    fetchCount1++;
    return { data: 'live_v1' };
  };
  const cf1 = await cache.wrap('cf_key', { domain: 'POLITICAL_ENTITIES', strategy: 'CACHE_FIRST' }, fetcher1);
  assert.strictEqual(cf1.data, 'live_v1');
  assert.strictEqual(fetchCount1, 1);

  const cf2 = await cache.wrap('cf_key', { domain: 'POLITICAL_ENTITIES', strategy: 'CACHE_FIRST' }, fetcher1);
  assert.strictEqual(cf2.data, 'live_v1');
  assert.strictEqual(fetchCount1, 1, 'CACHE_FIRST must not re-fetch when cached');

  // NETWORK_FIRST with fallback
  let fetchCount2 = 0;
  const failingFetcher = async () => {
    fetchCount2++;
    throw new Error('Network timeout');
  };
  await cache.set('nf_key', { data: 'stale_backup' }, { domain: 'BROADCAST' });
  const nfResult = await cache.wrap('nf_key', { domain: 'BROADCAST', strategy: 'NETWORK_FIRST' }, failingFetcher);
  assert.strictEqual(nfResult.data, 'stale_backup');
  assert.strictEqual(fetchCount2, 1, 'NETWORK_FIRST must attempt network before falling back to cache');

  // STALE_WHILE_REVALIDATE
  let bgFetchCount = 0;
  await cache.set('swr_key', { version: 1 }, { domain: 'GEOGRAPHY', ttlMs: 10 });
  await sleep(20); // Make it stale

  const swrFetcher = async () => {
    bgFetchCount++;
    return { version: 2 };
  };

  const swr1 = await cache.wrap('swr_key', { domain: 'GEOGRAPHY', strategy: 'STALE_WHILE_REVALIDATE' }, swrFetcher);
  assert.strictEqual(swr1.version, 1, 'SWR must return stale version 1 immediately');

  // Allow background revalidation to complete
  await sleep(50);
  assert.strictEqual(bgFetchCount, 1, 'SWR background fetcher must have executed');

  const swr2 = await cache.get<{ version: number }>('swr_key', { domain: 'GEOGRAPHY' });
  assert.strictEqual(swr2?.version, 2, 'Cache must reflect revalidated version 2');

  // CACHE_ONLY
  await cache.set('co_key', { persistent: true }, { domain: 'CIVIC_FEED' });
  const coResult = await cache.wrap('co_key', { domain: 'CIVIC_FEED', strategy: 'CACHE_ONLY' }, async () => ({ persistent: false }));
  assert.strictEqual(coResult.persistent, true);

  console.log('  [PASS] All 4 caching strategies verified.');

  // -------------------------------------------------------------
  // [CHECK 4] Cache Invalidation & Domain Clear
  // -------------------------------------------------------------
  console.log('[CHECK 4] Testing Cache Invalidation & Domain Clearance...');

  await cache.set('inv_k1', { item: 1 }, { domain: 'CIVIC_FEED' });
  await cache.set('inv_k2', { item: 2 }, { domain: 'CIVIC_FEED' });
  await cache.set('inv_other', { item: 3 }, { domain: 'AUTH' });

  // Invalidate single key
  await cache.invalidate('inv_k1', 'CIVIC_FEED');
  const checkK1 = await cache.get('inv_k1', { domain: 'CIVIC_FEED' });
  assert.strictEqual(checkK1, null, 'Invalidated key must return null');

  // Invalidate entire domain
  await cache.invalidateDomain('CIVIC_FEED');
  const checkK2 = await cache.get('inv_k2', { domain: 'CIVIC_FEED' });
  assert.strictEqual(checkK2, null, 'Domain invalidation must purge all keys in domain');

  const checkOther = await cache.get('inv_other', { domain: 'AUTH' });
  assert.notStrictEqual(checkOther, null, 'Other domains must remain unaffected');

  console.log('  [PASS] Key and domain invalidations confirmed.');

  // -------------------------------------------------------------
  // [CHECK 5] Expiration & Pruning
  // -------------------------------------------------------------
  console.log('[CHECK 5] Testing TTL Expiration & Auto-Pruning...');

  await cache.set('expiring_item_1', { temp: true }, { domain: 'CIVIC_FEED', ttlMs: 25 });
  await cache.set('expiring_item_2', { temp: true }, { domain: 'POLITICAL_ENTITIES', ttlMs: 25 });
  await cache.set('expiring_item_3', { temp: true }, { domain: 'BROADCAST', ttlMs: 25 });
  await cache.set('permanent_item', { permanent: true }, { domain: 'GEOGRAPHY', ttlMs: 10000 });

  await sleep(35); // Wait for expiration

  // Proactive cleanup on read
  const expired1 = await cache.get('expiring_item_1', { domain: 'CIVIC_FEED' });
  assert.strictEqual(expired1, null, 'Expired item must return null on get and proactively purge');

  // Batch prune
  const pruneResult = await cache.pruneExpired();
  assert(pruneResult.prunedCount >= 2, `Expected at least 2 pruned items, got ${pruneResult.prunedCount}`);

  const perm = await cache.get<{ permanent: boolean }>('permanent_item', { domain: 'GEOGRAPHY' });
  assert.strictEqual(perm?.permanent, true, 'Non-expired items must survive prune');

  console.log(`  [PASS] Pruning successfully purged ${pruneResult.prunedCount} expired entries (${pruneResult.bytesReclaimed} bytes reclaimed).`);

  console.log('\n=============================================================');
  console.log('  JOB 029 NETWORK/CACHE ARCHITECTURE: ALL CHECKS PASSED!');
  console.log('=============================================================\n');
}

runJob029Tests().catch((err) => {
  console.error('Job 029 Benchmark failed:', err);
  process.exit(1);
});
