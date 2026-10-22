/**
 * tests/staging-authorization-verifier.test.mjs
 *
 * Automated Cryptographic Authorization & Anti-Replay Test Battery
 * Task: W021.5 / CTO Directive 141 Section 4
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Verifies:
 * 1. Missing trust anchor fails closed
 * 2. Unsigned / alg=none tokens fail closed
 * 3. Invalid signature / tampered payload fails closed
 * 4. Expired token fails closed
 * 5. Not-yet-valid token (nbf in future) fails closed
 * 6. Explicitly revoked authorization nonce fails closed
 * 7. Token scoped to another project fails closed
 * 8. Production project target rejected (air-gap defense)
 * 9. Unauthorized criterion scope fails closed
 * 10. Unauthorized or destructive operation (DELETE/DROP) fails closed
 * 11. Consumed nonce fails closed (anti-replay violation)
 * 12. Correctly signed valid token succeeds with all claims preserved
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  verifyStagingWriteAuthorization,
  createSignedAuthorizationToken,
  revokeAuthorizationNonce,
  resetConsumedNonces,
  ALLOWED_STAGING_PROJECT_REF,
  PROHIBITED_PRODUCTION_REF
} from '../scripts/lib/stagingAuthorization.mjs';

const TEST_TRUST_ANCHOR = 'mock_cto_trust_anchor_secret_for_test_harness_only_32_bytes!';

describe('CTO Directive 141 Section 4: Staging Write Authorization Cryptographic Battery', () => {

  beforeEach(() => {
    resetConsumedNonces();
  });

  // 1. Missing trust anchor
  it('1. Fails closed when trust anchor is missing or unconfigured', () => {
    const validToken = createSignedAuthorizationToken({
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({ token: validToken, trustAnchor: '' }),
      (err) => {
        assert.strictEqual(err.code, 'TRUST_ANCHOR_UNCONFIGURED');
        assert.match(err.message, /trust anchor is not configured/i);
        return true;
      }
    );
  });

  // 2. Unsigned / alg=none tokens
  it('2. Rejects unsigned or algorithm "none" tokens (UNSIGNED_AUTHORIZATION_TOKEN)', () => {
    const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'kshetra-cto-governance',
      aud: 'kshetra-staging-execution',
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'nonce-123'
    })).toString('base64url');
    const unsignedToken = `${unsignedHeader}.${payload}.`;

    assert.throws(
      () => verifyStagingWriteAuthorization({ token: unsignedToken, trustAnchor: TEST_TRUST_ANCHOR }),
      (err) => {
        assert.strictEqual(err.code, 'UNSIGNED_AUTHORIZATION_TOKEN');
        return true;
      }
    );
  });

  // 3. Invalid signature / tampered payload
  it('3. Rejects token with invalid cryptographic signature or tampered payload', () => {
    const token = createSignedAuthorizationToken({
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    // Tamper with payload
    const parts = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({
      iss: 'kshetra-cto-governance',
      aud: 'kshetra-staging-execution',
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      criteria: ['CRIT-C02-02', 'CRIT-D02-02'], // Added extra unauthorized criterion
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'tampered-nonce'
    })).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    assert.throws(
      () => verifyStagingWriteAuthorization({ token: tamperedToken, trustAnchor: TEST_TRUST_ANCHOR }),
      (err) => {
        assert.strictEqual(err.code, 'INVALID_SIGNATURE');
        return true;
      }
    );
  });

  // 4. Expired token
  it('4. Rejects expired authorization token (TOKEN_EXPIRED)', () => {
    const expiredToken = createSignedAuthorizationToken({
      exp: Math.floor(Date.now() / 1000) - 60, // Expired 1 minute ago
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({ token: expiredToken, trustAnchor: TEST_TRUST_ANCHOR }),
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_EXPIRED');
        return true;
      }
    );
  });

  // 5. Not-yet-valid token
  it('5. Rejects not-yet-valid token (TOKEN_NOT_YET_VALID)', () => {
    const futureToken = createSignedAuthorizationToken({
      nbf: Math.floor(Date.now() / 1000) + 300, // Valid 5 minutes in future
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({ token: futureToken, trustAnchor: TEST_TRUST_ANCHOR }),
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_NOT_YET_VALID');
        return true;
      }
    );
  });

  // 6. Explicitly revoked authorization nonce
  it('6. Rejects revoked authorization nonce (TOKEN_REVOKED)', () => {
    const revokedNonce = 'revoked-test-nonce-001';
    revokeAuthorizationNonce(revokedNonce);

    const token = createSignedAuthorizationToken({
      nonce: revokedNonce,
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({ token, trustAnchor: TEST_TRUST_ANCHOR }),
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_REVOKED');
        return true;
      }
    );
  });

  // 7. Token scoped to another project
  it('7. Rejects token scoped to a different project ref (PROJECT_MISMATCH)', () => {
    const wrongProjectToken = createSignedAuthorizationToken({
      project_ref: 'other-staging-project-ref',
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({
        token: wrongProjectToken,
        trustAnchor: TEST_TRUST_ANCHOR,
        targetProject: ALLOWED_STAGING_PROJECT_REF
      }),
      (err) => {
        assert.strictEqual(err.code, 'PROJECT_MISMATCH');
        return true;
      }
    );
  });

  // 8. Production project target rejected (air-gap defense)
  it('8. Rejects token targeting production database ref (AIR_GAP_VIOLATION)', () => {
    const prodToken = createSignedAuthorizationToken({
      project_ref: PROHIBITED_PRODUCTION_REF,
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({
        token: prodToken,
        trustAnchor: TEST_TRUST_ANCHOR,
        targetProject: PROHIBITED_PRODUCTION_REF
      }),
      (err) => {
        assert.strictEqual(err.code, 'AIR_GAP_VIOLATION');
        return true;
      }
    );
  });

  // 9. Unauthorized criterion scope
  it('9. Rejects execution when requested criterion is not in token scope (UNAUTHORIZED_CRITERION)', () => {
    const token = createSignedAuthorizationToken({
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({
        token,
        trustAnchor: TEST_TRUST_ANCHOR,
        requestedCriteria: ['CRIT-F02-03'] // Not granted
      }),
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_CRITERION');
        return true;
      }
    );
  });

  // 10. Unauthorized or destructive operation
  it('10. Rejects destructive operations like DELETE or DROP (PROHIBITED_OPERATION)', () => {
    const token = createSignedAuthorizationToken({
      criteria: ['CRIT-F02-03'],
      operations: ['INSERT', 'DELETE'] // Attempting to grant DELETE
    }, TEST_TRUST_ANCHOR);

    assert.throws(
      () => verifyStagingWriteAuthorization({
        token,
        trustAnchor: TEST_TRUST_ANCHOR,
        requestedCriteria: ['CRIT-F02-03'],
        requestedOperations: ['DELETE']
      }),
      (err) => {
        assert.strictEqual(err.code, 'PROHIBITED_OPERATION');
        return true;
      }
    );
  });

  // 11. Consumed nonce fails closed (anti-replay)
  it('11. Rejects replay of a previously consumed nonce (NONCE_ALREADY_CONSUMED)', () => {
    const nonce = 'unique-replay-test-nonce-456';
    const token = createSignedAuthorizationToken({
      nonce,
      criteria: ['CRIT-C02-02'],
      operations: ['INSERT']
    }, TEST_TRUST_ANCHOR);

    // First execution succeeds and consumes nonce
    const firstRes = verifyStagingWriteAuthorization({
      token,
      trustAnchor: TEST_TRUST_ANCHOR,
      requestedCriteria: ['CRIT-C02-02'],
      requestedOperations: ['INSERT']
    });
    assert.strictEqual(firstRes.valid, true);

    // Second execution with same token/nonce is rejected
    assert.throws(
      () => verifyStagingWriteAuthorization({
        token,
        trustAnchor: TEST_TRUST_ANCHOR,
        requestedCriteria: ['CRIT-C02-02'],
        requestedOperations: ['INSERT']
      }),
      (err) => {
        assert.strictEqual(err.code, 'NONCE_ALREADY_CONSUMED');
        return true;
      }
    );
  });

  // 12. Valid authorized token succeeds
  it('12. Successfully verifies an authorized token with all required claims', () => {
    const nonce = 'valid-one-time-nonce-789';
    const token = createSignedAuthorizationToken({
      nonce,
      criteria: ['CRIT-C02-02', 'CRIT-D02-02', 'CRIT-E01-02', 'CRIT-F02-03'],
      operations: ['INSERT', 'UPSERT']
    }, TEST_TRUST_ANCHOR);

    const res = verifyStagingWriteAuthorization({
      token,
      trustAnchor: TEST_TRUST_ANCHOR,
      requestedCriteria: ['CRIT-C02-02'],
      requestedOperations: ['UPSERT']
    });

    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.projectRef, ALLOWED_STAGING_PROJECT_REF);
    assert.strictEqual(res.nonce, nonce);
    assert.ok(res.expiresAt);
  });

});
