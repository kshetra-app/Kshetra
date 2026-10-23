/**
 * scripts/lib/stagingReplayStore.mjs
 *
 * Durable, Concurrency-Safe Anti-Replay & Revocation Store
 * Task: W021.5 / CTO Directive 142 Section 2.4
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Requirements:
 * 1. Checks token nonce/identifier against a persistent, trusted replay store.
 * 2. Atomic reservation ensuring two concurrent invocations cannot consume the same authorization.
 * 3. Replay protection survives process restart (persisted on disk).
 * 4. Revocation enforced from authoritative persistent source.
 * 5. Fails closed with REPLAY_STORE_UNAVAILABLE if store or lock cannot be accessed.
 * 6. Keeps operational state outside ordinary source-controlled application artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const DEFAULT_REPLAY_STORE_DIR = path.join(REPO_ROOT, '.kshetra_runtime');
export const DEFAULT_REPLAY_STORE_PATH = path.join(DEFAULT_REPLAY_STORE_DIR, 'staging_replay_store.json');

/**
 * Sleep helper for lock contention retry
 */
function sleepMs(ms) {
  const sab = new SharedArrayBuffer(4);
  const int32 = new Int32Array(sab);
  Atomics.wait(int32, 0, 0, ms);
}

/**
 * Acquire cross-process file-system lock.
 * Uses atomic directory creation (mkdirSync is atomic on POSIX and Windows).
 */
function acquireLock(storePath, options = {}) {
  const lockDir = `${storePath}.lock`;
  const timeoutMs = options.lockTimeoutMs || 5000;
  const pollIntervalMs = options.pollIntervalMs || 25;
  const maxStaleAgeMs = options.maxStaleAgeMs || 30000;
  const start = Date.now();

  // Ensure parent directory exists
  const parentDir = path.dirname(storePath);
  if (!fs.existsSync(parentDir)) {
    try {
      fs.mkdirSync(parentDir, { recursive: true });
    } catch (err) {
      const e = new Error(`REPLAY_STORE_UNAVAILABLE: Cannot create store directory: ${err.message}`);
      e.code = 'REPLAY_STORE_UNAVAILABLE';
      throw e;
    }
  }

  while (Date.now() - start < timeoutMs) {
    try {
      fs.mkdirSync(lockDir);
      return lockDir;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Check if existing lock is stale
        try {
          const stats = fs.statSync(lockDir);
          if (Date.now() - stats.mtimeMs > maxStaleAgeMs) {
            try {
              fs.rmdirSync(lockDir);
              continue;
            } catch (_) {}
          }
        } catch (_) {}

        sleepMs(pollIntervalMs);
      } else {
        const e = new Error(`REPLAY_STORE_UNAVAILABLE: Failed to acquire store lock: ${err.message}`);
        e.code = 'REPLAY_STORE_UNAVAILABLE';
        throw e;
      }
    }
  }

  const e = new Error(`REPLAY_STORE_UNAVAILABLE: Lock acquisition timed out after ${timeoutMs}ms on ${lockDir}`);
  e.code = 'REPLAY_STORE_UNAVAILABLE';
  throw e;
}

/**
 * Release lock directory
 */
function releaseLock(lockDir) {
  try {
    if (fs.existsSync(lockDir)) {
      fs.rmdirSync(lockDir);
    }
  } catch (_) {}
}

/**
 * Read store data from disk under lock
 */
function readStoreUnsafe(storePath) {
  if (!fs.existsSync(storePath)) {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      consumed: {},
      revoked: {}
    };
  }

  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      version: parsed.version || 1,
      createdAt: parsed.createdAt || new Date().toISOString(),
      consumed: parsed.consumed || {},
      revoked: parsed.revoked || {}
    };
  } catch (err) {
    const e = new Error(`REPLAY_STORE_UNAVAILABLE: Could not parse store file: ${err.message}`);
    e.code = 'REPLAY_STORE_UNAVAILABLE';
    throw e;
  }
}

/**
 * Atomically write store data to disk using temporary file replacement
 */
function writeStoreUnsafe(storePath, data) {
  const dir = path.dirname(storePath);
  const tempPath = path.join(dir, `store_tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`);

  try {
    const payload = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, payload, 'utf8');
    fs.renameSync(tempPath, storePath);
  } catch (err) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
    const e = new Error(`REPLAY_STORE_UNAVAILABLE: Could not write store file: ${err.message}`);
    e.code = 'REPLAY_STORE_UNAVAILABLE';
    throw e;
  }
}

/**
 * Atomically reserve a nonce in the durable replay store.
 * Throws TOKEN_REVOKED if the nonce is revoked.
 * Throws NONCE_ALREADY_CONSUMED if the nonce was already consumed.
 * Throws REPLAY_STORE_UNAVAILABLE if store or lock cannot be accessed.
 */
export function reserveNonce(nonce, metadata = {}, options = {}) {
  if (!nonce || typeof nonce !== 'string' || nonce.trim().length === 0) {
    const err = new Error('MISSING_NONCE: Nonce string is required for reservation');
    err.code = 'MISSING_NONCE';
    throw err;
  }

  const storePath = options.storePath || process.env.STAGING_REPLAY_STORE_PATH || DEFAULT_REPLAY_STORE_PATH;
  const lockDir = acquireLock(storePath, options);

  try {
    const store = readStoreUnsafe(storePath);

    // 1. Check if explicitly revoked
    if (store.revoked[nonce]) {
      const err = new Error(`TOKEN_REVOKED: Authorization token nonce "${nonce}" is explicitly revoked.`);
      err.code = 'TOKEN_REVOKED';
      throw err;
    }

    // 2. Check if already consumed (Anti-replay violation)
    if (store.consumed[nonce]) {
      const err = new Error(`NONCE_ALREADY_CONSUMED: Token with nonce "${nonce}" was already consumed. Replay rejected.`);
      err.code = 'NONCE_ALREADY_CONSUMED';
      throw err;
    }

    // 3. Atomically record consumption
    store.consumed[nonce] = {
      consumedAt: new Date().toISOString(),
      processId: process.pid,
      planDigest: metadata.planDigest || null,
      criteria: metadata.criteria || [],
      tables: metadata.tables || []
    };

    writeStoreUnsafe(storePath, store);
    return true;
  } finally {
    releaseLock(lockDir);
  }
}

/**
 * Record a revoked nonce in the durable store.
 */
export function revokeNonce(nonce, reason = 'Administrative revocation', options = {}) {
  if (!nonce || typeof nonce !== 'string' || nonce.trim().length === 0) {
    const err = new Error('MISSING_NONCE: Nonce string is required for revocation');
    err.code = 'MISSING_NONCE';
    throw err;
  }

  const storePath = options.storePath || process.env.STAGING_REPLAY_STORE_PATH || DEFAULT_REPLAY_STORE_PATH;
  const lockDir = acquireLock(storePath, options);

  try {
    const store = readStoreUnsafe(storePath);
    store.revoked[nonce] = {
      revokedAt: new Date().toISOString(),
      reason
    };
    writeStoreUnsafe(storePath, store);
    return true;
  } finally {
    releaseLock(lockDir);
  }
}

/**
 * Inspect whether a nonce is consumed (read-only query under lock).
 */
export function isNonceConsumed(nonce, options = {}) {
  const storePath = options.storePath || process.env.STAGING_REPLAY_STORE_PATH || DEFAULT_REPLAY_STORE_PATH;
  const lockDir = acquireLock(storePath, options);
  try {
    const store = readStoreUnsafe(storePath);
    return Boolean(store.consumed[nonce]);
  } finally {
    releaseLock(lockDir);
  }
}

/**
 * Inspect whether a nonce is revoked (read-only query under lock).
 */
export function isNonceRevoked(nonce, options = {}) {
  const storePath = options.storePath || process.env.STAGING_REPLAY_STORE_PATH || DEFAULT_REPLAY_STORE_PATH;
  const lockDir = acquireLock(storePath, options);
  try {
    const store = readStoreUnsafe(storePath);
    return Boolean(store.revoked[nonce]);
  } finally {
    releaseLock(lockDir);
  }
}

/**
 * Clear the replay store (used exclusively in isolated test harnesses).
 */
export function clearReplayStore(options = {}) {
  const storePath = options.storePath || process.env.STAGING_REPLAY_STORE_PATH || DEFAULT_REPLAY_STORE_PATH;
  const lockDir = acquireLock(storePath, options);
  try {
    if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
    return true;
  } finally {
    releaseLock(lockDir);
  }
}
