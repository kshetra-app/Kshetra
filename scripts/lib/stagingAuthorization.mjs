/**
 * scripts/lib/stagingAuthorization.mjs
 *
 * Asymmetric Public-Key Cryptographic Write Authorization & Anti-Replay Verifier
 * Task: W021.5 / CTO Directive 142 Section 2
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Invariants:
 * 1. True asymmetric public-key signature verification (Ed25519 or RS256 with fixed algorithm allowlist).
 * 2. Governance private key NEVER enters repository, executor, logs, reports, or production code.
 * 3. Verifier verifies signatures using ONLY the authorized public key (never treated as HMAC secret).
 * 4. Fails closed if public key trust anchor is absent, malformed, or unconfigured.
 * 5. Strict issuer ('kshetra-cto-governance') and audience ('kshetra-staging-execution').
 * 6. Exact target project binding ('fkpigozcqnmcvofuksar'), strictly rejecting production ('ehfafcnimmjusyvplbah').
 * 7. Granular criterion, table-level, operation-level, and plan-digest scope enforcement.
 * 8. Replay protection persists across processes and restarts via durable atomic replay store.
 * 9. Explicit incident_closure_ref confirming external credential rotation prerequisite.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { reserveNonce } from './stagingReplayStore.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const ALLOWED_STAGING_PROJECT_REF = 'fkpigozcqnmcvofuksar';
export const PROHIBITED_PRODUCTION_REF = 'ehfafcnimmjusyvplbah';
export const EXPECTED_ISSUER = 'kshetra-cto-governance';
export const EXPECTED_AUDIENCE = 'kshetra-staging-execution';
export const ALLOWED_ALGORITHMS = ['Ed25519', 'RS256'];
export const DEFAULT_PUBLIC_KEY_PATH = path.join(REPO_ROOT, 'governance', 'keys', 'cto_staging_auth_public.pem');
export const DEFAULT_MAX_LIFETIME_SECONDS = 86400; // 24 hours maximum token lifetime

/**
 * Base64URL decode string
 */
export function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Resolves the operational or test trust anchor (asymmetric public key).
 * Fails closed if not found, malformed, or not an asymmetric public key.
 */
export function resolvePublicTrustAnchor(options = {}) {
  let keyMaterial = options.trustAnchor;

  // 1. Check explicit options
  if (!keyMaterial) {
    // 2. Check environment variable KSHETRA_CTO_PUBLIC_KEY
    if (process.env.KSHETRA_CTO_PUBLIC_KEY && process.env.KSHETRA_CTO_PUBLIC_KEY.trim().length > 0) {
      keyMaterial = process.env.KSHETRA_CTO_PUBLIC_KEY.trim();
    } else {
      // 3. Check governance public key file path
      const keyPath = options.publicKeyPath || DEFAULT_PUBLIC_KEY_PATH;
      if (fs.existsSync(keyPath)) {
        try {
          keyMaterial = fs.readFileSync(keyPath, 'utf8').trim();
        } catch (err) {
          const e = new Error(`TRUST_ANCHOR_READ_ERROR: Could not read public key file at ${keyPath}: ${err.message}`);
          e.code = 'TRUST_ANCHOR_READ_ERROR';
          throw e;
        }
      }
    }
  }

  if (!keyMaterial) {
    const err = new Error('TRUST_ANCHOR_UNCONFIGURED: Staging write public key trust anchor is not configured. External authorization required.');
    err.code = 'TRUST_ANCHOR_UNCONFIGURED';
    throw err;
  }

  // Parse key object using Node crypto
  let keyObject;
  try {
    if (crypto.isKeyObject && crypto.isKeyObject(keyMaterial)) {
      keyObject = keyMaterial;
    } else {
      keyObject = crypto.createPublicKey(keyMaterial);
    }
  } catch (err) {
    const e = new Error(`INVALID_TRUST_ANCHOR: Trust anchor is not a valid asymmetric public key: ${err.message}`);
    e.code = 'INVALID_TRUST_ANCHOR';
    throw e;
  }

  if (keyObject.type !== 'public') {
    const e = new Error(`INVALID_TRUST_ANCHOR: Trust anchor must be an asymmetric public key, but received type "${keyObject.type}"`);
    e.code = 'INVALID_TRUST_ANCHOR';
    throw e;
  }

  return keyObject;
}

/**
 * Verifies a staging write authorization token under the strict asymmetric verification contract.
 * Fails closed on any inconsistency, missing trust anchor, invalid signature, or replay.
 */
export function verifyStagingWriteAuthorization(params = {}) {
  const {
    token,
    targetProject = ALLOWED_STAGING_PROJECT_REF,
    requestedCriteria = [],
    requestedTables = [],
    requestedOperations = [],
    requestedPlanDigest = null,
    now = Date.now(),
    maxLifetimeSeconds = DEFAULT_MAX_LIFETIME_SECONDS,
    consumeNonceOnSuccess = true,
    storePath = undefined
  } = params;

  // 1. Resolve Trust Anchor (Asymmetric Public Key) - Fails closed if unconfigured
  const publicKey = resolvePublicTrustAnchor(params);

  // 2. Token Presence
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    const err = new Error('MISSING_AUTHORIZATION_TOKEN: Staging write authorization token is required.');
    err.code = 'MISSING_AUTHORIZATION_TOKEN';
    throw err;
  }

  // 3. Token Structure (JWS 3-part: header.payload.signature)
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    const err = new Error('MALFORMED_AUTHORIZATION_TOKEN: Token must be in standard signed JWS format (header.payload.signature).');
    err.code = 'MALFORMED_AUTHORIZATION_TOKEN';
    throw err;
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 4. Decode Header & Enforce Fixed Algorithm Allowlist
  let header;
  try {
    header = JSON.parse(base64UrlDecode(headerB64));
  } catch (e) {
    const err = new Error('MALFORMED_HEADER: Could not parse token header JSON.');
    err.code = 'MALFORMED_HEADER';
    throw err;
  }

  if (!header || !header.alg || header.alg.toLowerCase() === 'none') {
    const err = new Error('UNSIGNED_AUTHORIZATION_TOKEN: Unsigned or algorithm "none" tokens are strictly prohibited.');
    err.code = 'UNSIGNED_AUTHORIZATION_TOKEN';
    throw err;
  }

  if (!ALLOWED_ALGORITHMS.includes(header.alg)) {
    const err = new Error(`UNSUPPORTED_ALGORITHM: Algorithm "${header.alg}" is not in the authorized algorithm allowlist (${ALLOWED_ALGORITHMS.join(', ')}).`);
    err.code = 'UNSUPPORTED_ALGORITHM';
    throw err;
  }

  // 5. Asymmetric Signature Verification
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  let signatureBuf;
  try {
    let base64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    signatureBuf = Buffer.from(base64, 'base64');
  } catch (err) {
    const e = new Error('MALFORMED_SIGNATURE: Could not decode base64url signature.');
    e.code = 'MALFORMED_SIGNATURE';
    throw e;
  }

  let signatureValid = false;
  try {
    if (header.alg === 'Ed25519') {
      signatureValid = crypto.verify(null, signingInput, publicKey, signatureBuf);
    } else if (header.alg === 'RS256') {
      signatureValid = crypto.verify('SHA256', signingInput, publicKey, signatureBuf);
    }
  } catch (err) {
    const e = new Error(`INVALID_SIGNATURE: Asymmetric signature verification failed: ${err.message}`);
    e.code = 'INVALID_SIGNATURE';
    throw e;
  }

  if (!signatureValid) {
    const err = new Error('INVALID_SIGNATURE: Cryptographic signature mismatch against staging public key trust anchor.');
    err.code = 'INVALID_SIGNATURE';
    throw err;
  }

  // 6. Decode Payload JSON
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch (e) {
    const err = new Error('MALFORMED_PAYLOAD: Could not parse token payload JSON.');
    err.code = 'MALFORMED_PAYLOAD';
    throw err;
  }

  // 7. Issuer & Audience Verification
  if (payload.iss !== EXPECTED_ISSUER) {
    const err = new Error(`INVALID_ISSUER: Expected issuer "${EXPECTED_ISSUER}", received "${payload.iss}".`);
    err.code = 'INVALID_ISSUER';
    throw err;
  }

  if (payload.aud !== EXPECTED_AUDIENCE) {
    const err = new Error(`INVALID_AUDIENCE: Expected audience "${EXPECTED_AUDIENCE}", received "${payload.aud}".`);
    err.code = 'INVALID_AUDIENCE';
    throw err;
  }

  // 8. Target Project Binding & Air-Gap Defense
  if (payload.project_ref !== targetProject) {
    const err = new Error(`PROJECT_MISMATCH: Token scoped to project "${payload.project_ref}", but target host is "${targetProject}".`);
    err.code = 'PROJECT_MISMATCH';
    throw err;
  }

  if (payload.project_ref === PROHIBITED_PRODUCTION_REF || JSON.stringify(payload).includes(PROHIBITED_PRODUCTION_REF)) {
    const err = new Error('AIR_GAP_VIOLATION: Production target detected in authorization token.');
    err.code = 'AIR_GAP_VIOLATION';
    throw err;
  }

  // 9. Temporal Validity (iat, nbf, exp, maxLifetime)
  const nowSeconds = Math.floor(now / 1000);

  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) {
    const err = new Error(`TOKEN_EXPIRED: Token expired at unix timestamp ${payload.exp} (current: ${nowSeconds}).`);
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  if (typeof payload.nbf === 'number' && payload.nbf > nowSeconds) {
    const err = new Error(`TOKEN_NOT_YET_VALID: Token not valid before unix timestamp ${payload.nbf} (current: ${nowSeconds}).`);
    err.code = 'TOKEN_NOT_YET_VALID';
    throw err;
  }

  const effectiveNbf = typeof payload.nbf === 'number' ? payload.nbf : (payload.iat || nowSeconds);
  if (payload.exp - effectiveNbf > maxLifetimeSeconds) {
    const err = new Error(`EXCESSIVE_TOKEN_LIFETIME: Authorization validity duration (${payload.exp - effectiveNbf}s) exceeds maximum permitted lifetime (${maxLifetimeSeconds}s).`);
    err.code = 'EXCESSIVE_TOKEN_LIFETIME';
    throw err;
  }

  // 10. Incident Closure Reference
  if (!payload.incident_closure_ref || typeof payload.incident_closure_ref !== 'string' || payload.incident_closure_ref.trim().length === 0) {
    const err = new Error('INCIDENT_CLOSURE_REF_REQUIRED: Authorization token must contain an incident_closure_ref confirming external credential rotation.');
    err.code = 'INCIDENT_CLOSURE_REF_REQUIRED';
    throw err;
  }

  // 11. Criteria Scope Enforcement
  if (requestedCriteria.length > 0) {
    const permittedCriteria = new Set(payload.criteria || []);
    for (const reqCrit of requestedCriteria) {
      if (!permittedCriteria.has(reqCrit)) {
        const err = new Error(`UNAUTHORIZED_CRITERION: Criterion "${reqCrit}" is not permitted by this authorization token.`);
        err.code = 'UNAUTHORIZED_CRITERION';
        throw err;
      }
    }
  }

  // 12. Table-Level Scope Enforcement
  if (requestedTables.length > 0) {
    const permittedTables = new Set(payload.tables || []);
    for (const reqTable of requestedTables) {
      if (!permittedTables.has(reqTable)) {
        const err = new Error(`UNAUTHORIZED_TABLE: Target table "${reqTable}" is not permitted by this authorization token.`);
        err.code = 'UNAUTHORIZED_TABLE';
        throw err;
      }
    }
  }

  // 13. Operation-Level Scope Enforcement & Prohibited Destructive Operations
  if (requestedOperations.length > 0) {
    const permittedOperations = new Set((payload.operations || []).map(o => o.toUpperCase()));
    for (const op of requestedOperations) {
      const normalizedOp = op.toUpperCase();
      if (!permittedOperations.has(normalizedOp)) {
        const err = new Error(`UNAUTHORIZED_OPERATION: Operation "${op}" is not permitted by this authorization token.`);
        err.code = 'UNAUTHORIZED_OPERATION';
        throw err;
      }
      if (normalizedOp === 'DELETE' || normalizedOp === 'DROP' || normalizedOp === 'TRUNCATE') {
        const err = new Error(`PROHIBITED_OPERATION: Destructive operation "${op}" is strictly forbidden on staging.`);
        err.code = 'PROHIBITED_OPERATION';
        throw err;
      }
    }
  }

  // 14. Plan Digest Binding Verification
  if (requestedPlanDigest) {
    if (!payload.plan_digest || payload.plan_digest !== requestedPlanDigest) {
      const err = new Error(`PLAN_DIGEST_MISMATCH: Execution plan digest mismatch. Token authorizes "${payload.plan_digest || 'none'}", requested execution is "${requestedPlanDigest}".`);
      err.code = 'PLAN_DIGEST_MISMATCH';
      throw err;
    }
  }

  // 15. Durable Cross-Process Anti-Replay Reservation
  const nonce = payload.nonce || payload.jti;
  if (!nonce || typeof nonce !== 'string' || nonce.trim().length === 0) {
    const err = new Error('MISSING_NONCE: Unique nonce is mandatory for anti-replay protection.');
    err.code = 'MISSING_NONCE';
    throw err;
  }

  if (consumeNonceOnSuccess) {
    reserveNonce(nonce, {
      planDigest: payload.plan_digest || null,
      criteria: payload.criteria || [],
      tables: payload.tables || []
    }, { storePath });
  }

  return {
    valid: true,
    issuer: payload.iss,
    audience: payload.aud,
    projectRef: payload.project_ref,
    nonce,
    incidentClosureRef: payload.incident_closure_ref,
    criteria: payload.criteria,
    tables: payload.tables,
    operations: payload.operations,
    planDigest: payload.plan_digest,
    expiresAt: new Date(payload.exp * 1000).toISOString()
  };
}
