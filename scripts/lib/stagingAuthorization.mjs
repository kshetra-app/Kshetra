/**
 * scripts/lib/stagingAuthorization.mjs
 *
 * Cryptographic Write Authorization & Anti-Replay Verification Contract
 * Task: W021.5 / CTO Directive 141 Section 4
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Invariants:
 * 1. Authenticity verified against independent trust anchor (never caller-invented or self-certified).
 * 2. Strict issuer ('kshetra-cto-governance') and audience ('kshetra-staging-execution').
 * 3. Exact target project binding ('fkpigozcqnmcvofuksar'), strictly rejecting production ('ehfafcnimmjusyvplbah').
 * 4. Granular criterion & operation scope enforcement.
 * 5. Temporal validity interval (nbf <= now <= exp).
 * 6. Nonce-based anti-replay verification and revocation checks.
 * 7. Fails closed when trust anchor is absent or unconfigured.
 */

import crypto from 'node:crypto';

export const ALLOWED_STAGING_PROJECT_REF = 'fkpigozcqnmcvofuksar';
export const PROHIBITED_PRODUCTION_REF = 'ehfafcnimmjusyvplbah';
export const EXPECTED_ISSUER = 'kshetra-cto-governance';
export const EXPECTED_AUDIENCE = 'kshetra-staging-execution';

// Persistent or process-level consumed nonces for anti-replay
const GLOBAL_CONSUMED_NONCES = new Set();
const GLOBAL_REVOKED_NONCES = new Set();

/**
 * Base64URL encode buffer/string
 */
function base64UrlEncode(str) {
  const buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'utf8');
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64URL decode string
 */
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Helper to construct and sign an authorization token (used by CTO issuer & test fixtures)
 */
export function createSignedAuthorizationToken(payload, trustAnchor, options = {}) {
  if (!trustAnchor) {
    throw new Error('TRUST_ANCHOR_REQUIRED: A valid key or secret is required to issue an authorization token');
  }

  const alg = options.alg || 'HS256';
  const header = {
    alg,
    typ: 'KSHETRA-AUTH+JWT',
    kid: options.kid || 'cto-w021.5-staging-anchor-1'
  };

  const fullPayload = {
    iss: EXPECTED_ISSUER,
    aud: EXPECTED_AUDIENCE,
    project_ref: ALLOWED_STAGING_PROJECT_REF,
    iat: Math.floor(Date.now() / 1000),
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (options.expiresInSeconds || 3600),
    nonce: options.nonce || crypto.randomUUID(),
    ...payload
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${headerB64}.${payloadB64}`;

  let signatureB64;
  if (alg === 'HS256') {
    const hmac = crypto.createHmac('sha256', trustAnchor);
    hmac.update(signingInput);
    signatureB64 = base64UrlEncode(hmac.digest());
  } else {
    throw new Error(`UNSUPPORTED_ALGORITHM: Algorithm "${alg}" is not implemented in this provider`);
  }

  return `${signingInput}.${signatureB64}`;
}

/**
 * Verifies a staging write authorization token under the strict verification contract.
 * Fails closed on any inconsistency, missing trust anchor, or invalid signature.
 */
export function verifyStagingWriteAuthorization(params) {
  const {
    token,
    trustAnchor = process.env.STAGING_WRITE_TRUST_ANCHOR,
    targetProject = ALLOWED_STAGING_PROJECT_REF,
    requestedCriteria = [],
    requestedOperations = [],
    consumedNonces = GLOBAL_CONSUMED_NONCES,
    revokedNonces = GLOBAL_REVOKED_NONCES,
    now = Date.now(),
    consumeNonceOnSuccess = true
  } = params;

  // 1. Trust Anchor Presence (Fail closed if not configured)
  if (!trustAnchor || typeof trustAnchor !== 'string' || trustAnchor.trim().length === 0) {
    const err = new Error('TRUST_ANCHOR_UNCONFIGURED: Staging write trust anchor is not configured. External authorization required.');
    err.code = 'TRUST_ANCHOR_UNCONFIGURED';
    throw err;
  }

  // 2. Token Presence
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    const err = new Error('MISSING_AUTHORIZATION_TOKEN: Staging write authorization token is required.');
    err.code = 'MISSING_AUTHORIZATION_TOKEN';
    throw err;
  }

  // 3. Token Structure
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    const err = new Error('MALFORMED_AUTHORIZATION_TOKEN: Token must be in standard signed JWS format (header.payload.signature).');
    err.code = 'MALFORMED_AUTHORIZATION_TOKEN';
    throw err;
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // 4. Decode Header & Reject Unsigned or Malformed Header
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

  if (header.alg !== 'HS256') {
    const err = new Error(`UNSUPPORTED_ALGORITHM: Algorithm "${header.alg}" is not recognized.`);
    err.code = 'UNSUPPORTED_ALGORITHM';
    throw err;
  }

  // 5. Signature Verification
  const signingInput = `${headerB64}.${payloadB64}`;
  const hmac = crypto.createHmac('sha256', trustAnchor);
  hmac.update(signingInput);
  const expectedSigB64 = base64UrlEncode(hmac.digest());

  const sigBuf = Buffer.from(signatureB64);
  const expectedBuf = Buffer.from(expectedSigB64);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    const err = new Error('INVALID_SIGNATURE: Cryptographic signature mismatch against staging trust anchor.');
    err.code = 'INVALID_SIGNATURE';
    throw err;
  }

  // 6. Decode Payload
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

  // 9. Temporal Validity (exp & nbf)
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

  // 10. Nonce & Anti-Replay Verification
  if (!payload.nonce || typeof payload.nonce !== 'string' || payload.nonce.trim().length === 0) {
    const err = new Error('MISSING_NONCE: Unique nonce is mandatory for replay protection.');
    err.code = 'MISSING_NONCE';
    throw err;
  }

  if (revokedNonces.has(payload.nonce)) {
    const err = new Error(`TOKEN_REVOKED: Authorization token nonce "${payload.nonce}" is explicitly revoked.`);
    err.code = 'TOKEN_REVOKED';
    throw err;
  }

  if (consumedNonces.has(payload.nonce)) {
    const err = new Error(`NONCE_ALREADY_CONSUMED: Token with nonce "${payload.nonce}" was already consumed. Replay rejected.`);
    err.code = 'NONCE_ALREADY_CONSUMED';
    throw err;
  }

  // 11. Criteria & Operation Scope Verification
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

  // 12. Consume Nonce (Anti-replay registration)
  if (consumeNonceOnSuccess) {
    consumedNonces.add(payload.nonce);
  }

  return {
    valid: true,
    issuer: payload.iss,
    audience: payload.aud,
    projectRef: payload.project_ref,
    nonce: payload.nonce,
    criteria: payload.criteria,
    operations: payload.operations,
    expiresAt: new Date(payload.exp * 1000).toISOString()
  };
}

export function revokeAuthorizationNonce(nonce) {
  GLOBAL_REVOKED_NONCES.add(nonce);
}

export function resetConsumedNonces() {
  GLOBAL_CONSUMED_NONCES.clear();
  GLOBAL_REVOKED_NONCES.clear();
}
