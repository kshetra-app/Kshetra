/**
 * tests/helpers/stagingAuthTestHelper.mjs
 *
 * Isolated Test Helper for Asymmetric Cryptographic Staging Authorization
 * Task: W021.5 / CTO Directive 142 Section 2.2 Item 6 & Section 2.5
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * NOTE: Token-signing logic and private keys exist EXCLUSIVELY in this test fixture helper.
 * Production verification code has NO token-signing capability or private keys.
 */

import crypto from 'node:crypto';
import {
  EXPECTED_ISSUER,
  EXPECTED_AUDIENCE,
  ALLOWED_STAGING_PROJECT_REF,
  ALL_AUTHORIZED_STAGING_TABLES
} from '../../scripts/lib/stagingAuthorization.mjs';
import { canonicalizeObject } from '../../scripts/lib/stagingAdminContainment.mjs';

/**
 * Base64URL encode buffer or string
 */
export function base64UrlEncode(data) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Generate a fresh in-memory asymmetric key pair for test execution.
 * Supports 'Ed25519' (default) and 'RS256'.
 */
export function generateTestKeyPair(alg = 'Ed25519') {
  if (alg === 'Ed25519') {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return {
      alg: 'Ed25519',
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
      privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' })
    };
  }

  if (alg === 'RS256') {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048
    });
    return {
      alg: 'RS256',
      publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }),
      privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' })
    };
  }

  throw new Error(`UNSUPPORTED_TEST_ALGORITHM: ${alg}`);
}

export function generateTestAdminKeyPair(alg = 'Ed25519') {
  return generateTestKeyPair(alg);
}

/**
 * Computes SHA-256 fingerprint of an SPKI-exported public key
 * Required for KSHETRA_APPROVED_TRUST_ANCHOR_FINGERPRINT (Directive 146 Section 2)
 */
export function computeKeyFingerprint(keyMaterial) {
  const keyObject = (keyMaterial && typeof keyMaterial.export === 'function')
    ? keyMaterial
    : crypto.createPublicKey(keyMaterial);
  const spkiDer = keyObject.export({ type: 'spki', format: 'der' });
  return crypto.createHash('sha256').update(spkiDer).digest('hex');
}

/**
 * Creates an authentic signed test administrative closure record fixture
 */
export function createTestAdminClosureRecord(overrides = {}, adminPrivateKeyPem = null, options = {}) {
  const payload = {
    incidentId: 'INC-2026-W021.5-ROTATION-VERIFIED',
    targetProjectRef: ALLOWED_STAGING_PROJECT_REF,
    credentialRotated: true,
    jwtSecretRotated: true,
    serviceRoleKeyRotated: true,
    accessLogsAudited: true,
    unauthorizedMutationsInvestigated: true,
    exposureIntervalStart: '2026-10-21T00:00:00.000Z',
    authorizedAdmin: 'test-authorized-project-administrator',
    certifiedAt: (options.certifiedAt !== undefined) ? options.certifiedAt : new Date().toISOString(),
    ...overrides
  };

  if (options.unsigned) {
    return payload; // Return raw unsigned object for negative test
  }

  const keyPem = adminPrivateKeyPem;
  const alg = options.alg || 'Ed25519';
  const canonicalPayload = JSON.stringify(canonicalizeObject(payload));
  let sigBuf = null;
  if (keyPem) {
    if (alg === 'Ed25519') {
      sigBuf = crypto.sign(null, Buffer.from(canonicalPayload, 'utf8'), keyPem);
    } else if (alg === 'RS256') {
      sigBuf = crypto.sign('SHA256', Buffer.from(canonicalPayload, 'utf8'), keyPem);
    }
  }

  return {
    payload,
    algorithm: alg,
    signature: options.signature !== undefined ? options.signature : (sigBuf ? base64UrlEncode(sigBuf) : 'fake-signature'),
    keyId: options.keyId || 'test-admin-key-1'
  };
}

/**
 * Signs and constructs a standard JWS token using a test private key.
 * Used exclusively for testing verifier defenses.
 */
export function createTestSignedAuthorizationToken(payload, privateKeyPem, options = {}) {
  if (!privateKeyPem) {
    throw new Error('PRIVATE_KEY_REQUIRED: Test helper requires a private key to sign test tokens');
  }

  const alg = options.alg || 'Ed25519';
  const header = {
    alg,
    typ: 'KSHETRA-AUTH+JWS',
    kid: options.kid || `test-key-${alg.toLowerCase()}-1`
  };

  const nowSeconds = Math.floor((options.now || Date.now()) / 1000);
  const fullPayload = {
    iss: EXPECTED_ISSUER,
    aud: EXPECTED_AUDIENCE,
    project_ref: ALLOWED_STAGING_PROJECT_REF,
    iat: nowSeconds,
    nbf: nowSeconds,
    exp: nowSeconds + (options.expiresInSeconds || 3600),
    nonce: options.nonce || crypto.randomUUID(),
    incident_closure_ref: options.incidentClosureRef || 'INC-2026-W021.5-ROTATION-VERIFIED',
    criteria: options.criteria || ['CRIT-D02-02'],
    tables: options.tables || [...ALL_AUTHORIZED_STAGING_TABLES],
    operations: options.operations || ['INSERT', 'UPDATE', 'UPSERT'],
    plan_digest: options.planDigest || crypto.createHash('sha256').update('approved-plan-payload').digest('hex'),
    ...payload
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');

  let signatureBuf;
  if (alg === 'Ed25519') {
    signatureBuf = crypto.sign(null, signingInput, privateKeyPem);
  } else if (alg === 'RS256') {
    signatureBuf = crypto.sign('SHA256', signingInput, privateKeyPem);
  } else {
    throw new Error(`UNSUPPORTED_SIGNING_ALGORITHM: ${alg}`);
  }

  const signatureB64 = base64UrlEncode(signatureBuf);
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}
