/**
 * scripts/lib/stagingAuthorization.mjs
 *
 * Asymmetric Public-Key Cryptographic Write Authorization & Anti-Replay Verifier
 * Authority: CTO Directive 142 & CTO Directive 143 / Master Execution Framework Amendment v1.6
 *
 * Invariants:
 * 1. True asymmetric public-key signature verification (Ed25519 or RS256 with fixed algorithm allowlist).
 * 2. Governance signing credentials NEVER enter repository, executor, logs, reports, or test suites.
 * 3. Verifier operates strictly on public keys (never treated as HMAC secret).
 * 4. Fails closed if public key trust anchor is absent, malformed, or unconfigured.
 * 5. Strict issuer ('kshetra-cto-governance') and audience ('kshetra-staging-execution').
 * 6. Exact target project binding ('fkpigozcqnmcvofuksar'), strictly rejecting production ('ehfafcnimmjusyvplbah').
 * 7. Strict time claims: iat, exp, nbf internal consistency, clock-skew protection, and max lifetime.
 * 8. Strict operation grants: immediate rejection of tokens granting destructive operations (DELETE, DROP, TRUNCATE, ALTER).
 * 9. Strict table scope: tokens must not grant tables outside authorized staging tables.
 * 10. Mandatory execution plan digest: independently computes canonical plan digest and asserts exact match.
 * 11. Fail-closed administrative containment gate: requires authenticated administrator closure record.
 * 12. Durable cross-process anti-replay reservation store with restart persistence.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { reserveNonce } from './stagingReplayStore.mjs';
import { computeExecutionPlanDigest } from './stagingExecutionPlan.mjs';
import { verifyAdminIncidentClosure } from './stagingAdminContainment.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

export const ALLOWED_STAGING_PROJECT_REF = 'fkpigozcqnmcvofuksar';
export const PROHIBITED_PRODUCTION_REF = 'ehfafcnimmjusyvplbah';
export const EXPECTED_ISSUER = 'kshetra-cto-governance';
export const EXPECTED_AUDIENCE = 'kshetra-staging-execution';
export const ALLOWED_ALGORITHMS = ['Ed25519', 'RS256'];
export const DEFAULT_PUBLIC_KEY_PATH = path.join(REPO_ROOT, 'governance', 'keys', 'cto_staging_auth_public.pem');
export const DEFAULT_MAX_LIFETIME_SECONDS = 3600; // 1 hour hard maximum token lifetime (Directive 144 requirement 4)
export const CLOCK_SKEW_TOLERANCE_SECONDS = 60; // 60 seconds allowable clock skew

export const PERMITTED_OPERATIONS_ALLOWLIST = ['INSERT', 'UPDATE', 'UPSERT', 'SELECT'];
export const PROHIBITED_DESTRUCTIVE_OPERATIONS = ['DELETE', 'DROP', 'TRUNCATE', 'ALTER'];

export const ALL_AUTHORIZED_STAGING_TABLES = [
  // Stage 1: Political Organizations Catalog & Provenance (CRIT-C02-02)
  'public.datasets',
  'public.dataset_versions',
  'public.provenance_records',
  'public.political_organizations',
  'public.organization_relationships',
  'public.organization_multilingual_names',
  'public.organization_symbols',
  'public.organization_aliases',
  // Stage 2: Candidate Profiles & Contests (CRIT-D02-02)
  'public.candidacies',
  // Stage 3: Constituency Demographics Baseline (CRIT-E01-02)
  'public.constituency_demographics',
  // Stage 4: Historical Election Results (CRIT-F02-03)
  'public.election_results'
];

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
 * Fails closed on any inconsistency, missing trust anchor, invalid signature, scope violation, or replay.
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
    storePath = undefined,
    adminClosureRecord = undefined,
    adminRecordPath = undefined,
    repoRoot = REPO_ROOT
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

  // 9. Strict Time-Claim Validation (Directive 143 Section 4.2)
  const nowSeconds = Math.floor(now / 1000);

  // iat: must exist, must be an integer > 0
  if (typeof payload.iat !== 'number' || !Number.isInteger(payload.iat) || payload.iat <= 0) {
    const err = new Error('INVALID_IAT: Authorization token must contain a positive integer "iat" timestamp.');
    err.code = 'INVALID_IAT';
    throw err;
  }

  // Clock skew tolerance on iat
  if (payload.iat > nowSeconds + CLOCK_SKEW_TOLERANCE_SECONDS) {
    const err = new Error(`TOKEN_ISSUED_IN_FUTURE: Token iat (${payload.iat}) exceeds current time (${nowSeconds}) by more than ${CLOCK_SKEW_TOLERANCE_SECONDS}s.`);
    err.code = 'TOKEN_ISSUED_IN_FUTURE';
    throw err;
  }

  // exp: must exist, must be an integer > 0
  if (typeof payload.exp !== 'number' || !Number.isInteger(payload.exp) || payload.exp <= 0) {
    const err = new Error('INVALID_EXP: Authorization token must contain a positive integer "exp" timestamp.');
    err.code = 'INVALID_EXP';
    throw err;
  }

  // exp must be strictly greater than iat
  if (payload.exp <= payload.iat) {
    const err = new Error(`INVALID_EXPIRY_BEFORE_ISSUANCE: Token exp (${payload.exp}) must be strictly after iat (${payload.iat}).`);
    err.code = 'INVALID_EXPIRY_BEFORE_ISSUANCE';
    throw err;
  }

  // exp must be in the future
  if (payload.exp <= nowSeconds) {
    const err = new Error(`TOKEN_EXPIRED: Token expired at unix timestamp ${payload.exp} (current: ${nowSeconds}).`);
    err.code = 'TOKEN_EXPIRED';
    throw err;
  }

  // nbf: if present, must be integer > 0
  if (payload.nbf !== undefined) {
    if (typeof payload.nbf !== 'number' || !Number.isInteger(payload.nbf) || payload.nbf <= 0) {
      const err = new Error('INVALID_NBF: Token "nbf" claim must be a positive integer timestamp when present.');
      err.code = 'INVALID_NBF';
      throw err;
    }
    // Directive 144 requirement 4: Contradiction checks MUST precede temporal validity check
    // so contradictory time claims are tested and rejected directly without being masked by not-yet-valid.
    if (payload.nbf > payload.exp) {
      const err = new Error(`CONTRADICTORY_TIME_CLAIMS: Token nbf (${payload.nbf}) is after exp (${payload.exp}).`);
      err.code = 'CONTRADICTORY_TIME_CLAIMS';
      throw err;
    }
    if (payload.nbf < payload.iat - CLOCK_SKEW_TOLERANCE_SECONDS) {
      const err = new Error(`INCONSISTENT_TIME_CLAIMS: Token nbf (${payload.nbf}) precedes iat (${payload.iat}) beyond allowable clock skew.`);
      err.code = 'INCONSISTENT_TIME_CLAIMS';
      throw err;
    }
    if (payload.nbf > nowSeconds) {
      const err = new Error(`TOKEN_NOT_YET_VALID: Token not valid before unix timestamp ${payload.nbf} (current: ${nowSeconds}).`);
      err.code = 'TOKEN_NOT_YET_VALID';
      throw err;
    }
  }

  // Max lifetime verification (Directive 144 requirement 4: hard cap at DEFAULT_MAX_LIFETIME_SECONDS = 3600s)
  const effectiveMaxLifetime = Math.min(
    params.maxLifetimeSeconds !== undefined ? params.maxLifetimeSeconds : DEFAULT_MAX_LIFETIME_SECONDS,
    DEFAULT_MAX_LIFETIME_SECONDS
  );
  if (payload.exp - payload.iat > effectiveMaxLifetime) {
    const err = new Error(`EXCESSIVE_TOKEN_LIFETIME: Authorization validity duration (${payload.exp - payload.iat}s) exceeds maximum permitted lifetime (${effectiveMaxLifetime}s).`);
    err.code = 'EXCESSIVE_TOKEN_LIFETIME';
    throw err;
  }
  if (payload.nbf && (payload.exp - payload.nbf > effectiveMaxLifetime)) {
    const err = new Error(`EXCESSIVE_TOKEN_LIFETIME: Authorization validity duration (${payload.exp - payload.nbf}s) exceeds maximum permitted lifetime (${effectiveMaxLifetime}s).`);
    err.code = 'EXCESSIVE_TOKEN_LIFETIME';
    throw err;
  }

  // 10. Fail-Closed Administrative Credential-Containment Gate (Directive 143 Section 5 / Directive 144 Section 5)
  verifyAdminIncidentClosure(payload.incident_closure_ref, {
    adminClosureRecord,
    adminRecordPath,
    adminTrustAnchor: params.adminTrustAnchor,
    adminKeyPath: params.adminKeyPath,
    now
  });

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

  // 12. Strict Table Scope Enforcement (Directive 143 Section 4.3 & 4.4)
  if (!Array.isArray(payload.tables) || payload.tables.length === 0) {
    const err = new Error('MISSING_TABLE_GRANTS: Token must specify an explicit non-empty "tables" array.');
    err.code = 'MISSING_TABLE_GRANTS';
    throw err;
  }

  const allowedTableSet = new Set(ALL_AUTHORIZED_STAGING_TABLES);
  for (const table of payload.tables) {
    if (!allowedTableSet.has(table)) {
      const err = new Error(`UNAUTHORIZED_TABLE_GRANT: Token grants access to unauthorized table "${table}".`);
      err.code = 'UNAUTHORIZED_TABLE_GRANT';
      throw err;
    }
  }

  if (requestedTables.length > 0) {
    const permittedTables = new Set(payload.tables);
    for (const reqTable of requestedTables) {
      if (!permittedTables.has(reqTable)) {
        const err = new Error(`UNAUTHORIZED_TABLE: Target table "${reqTable}" is not permitted by this authorization token.`);
        err.code = 'UNAUTHORIZED_TABLE';
        throw err;
      }
    }
  }

  // 13. Strict Operation Grants Enforcement & Comprehensive Prohibited Destructive Operations (Directive 143 Section 4.3)
  if (!Array.isArray(payload.operations) || payload.operations.length === 0) {
    const err = new Error('MISSING_OPERATION_GRANTS: Token must specify an explicit non-empty "operations" array.');
    err.code = 'MISSING_OPERATION_GRANTS';
    throw err;
  }

  const permittedOpSet = new Set(PERMITTED_OPERATIONS_ALLOWLIST);
  const prohibitedOpSet = new Set(PROHIBITED_DESTRUCTIVE_OPERATIONS);

  for (const rawOp of payload.operations) {
    const op = String(rawOp).toUpperCase();
    if (prohibitedOpSet.has(op)) {
      const err = new Error(`PROHIBITED_DESTRUCTIVE_OPERATION_IN_TOKEN: Token contains prohibited destructive operation "${op}".`);
      err.code = 'PROHIBITED_DESTRUCTIVE_OPERATION_IN_TOKEN';
      throw err;
    }
    if (!permittedOpSet.has(op)) {
      const err = new Error(`UNAUTHORIZED_OPERATION_GRANT: Operation "${op}" is not in the authorized operations allowlist (${PERMITTED_OPERATIONS_ALLOWLIST.join(', ')}).`);
      err.code = 'UNAUTHORIZED_OPERATION_GRANT';
      throw err;
    }
  }

  if (requestedOperations.length > 0) {
    const tokenOpSet = new Set(payload.operations.map(o => String(o).toUpperCase()));
    for (const reqOp of requestedOperations) {
      const normalizedReqOp = String(reqOp).toUpperCase();
      if (!tokenOpSet.has(normalizedReqOp)) {
        const err = new Error(`UNAUTHORIZED_OPERATION: Requested operation "${reqOp}" is not permitted by this authorization token.`);
        err.code = 'UNAUTHORIZED_OPERATION';
        throw err;
      }
    }
  }

  // 14. Mandatory Execution Plan Digest Verification (Directive 143 Section 4.1)
  if (!payload.plan_digest || typeof payload.plan_digest !== 'string' || payload.plan_digest.trim().length === 0) {
    const err = new Error('MISSING_PLAN_DIGEST: Mode B authorization token must contain a non-empty "plan_digest" claim.');
    err.code = 'MISSING_PLAN_DIGEST';
    throw err;
  }

  const trimmedDigest = payload.plan_digest.trim();
  if (!/^[0-9a-f]{64}$/.test(trimmedDigest)) {
    const err = new Error(`MALFORMED_PLAN_DIGEST: Plan digest "${trimmedDigest}" is not a 64-character lowercase hex SHA-256 digest.`);
    err.code = 'MALFORMED_PLAN_DIGEST';
    throw err;
  }

  // Calculate expected canonical digest if not explicitly passed
  let expectedDigest = requestedPlanDigest;
  if (!expectedDigest) {
    try {
      expectedDigest = computeExecutionPlanDigest({
        repoRoot,
        targetProjectRef: targetProject
      });
    } catch (e) {
      const err = new Error(`PLAN_DIGEST_COMPUTATION_FAILED: Could not compute canonical execution plan digest: ${e.message}`);
      err.code = 'PLAN_DIGEST_COMPUTATION_FAILED';
      throw err;
    }
  }

  if (trimmedDigest !== expectedDigest) {
    const err = new Error(`PLAN_DIGEST_MISMATCH: Execution plan digest mismatch. Token authorizes "${trimmedDigest}", required canonical plan is "${expectedDigest}".`);
    err.code = 'PLAN_DIGEST_MISMATCH';
    throw err;
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
      planDigest: payload.plan_digest,
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
