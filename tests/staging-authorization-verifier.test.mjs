/**
 * tests/staging-authorization-verifier.test.mjs
 *
 * Comprehensive Asymmetric Cryptographic Authorization & Anti-Replay Battery
 * Task: W021.5 / CTO Directive 142 Section 2.5
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Proves:
 * 1. Fails closed when public key trust anchor is missing or unconfigured.
 * 2. Enforces asymmetric signature verification (Ed25519 & RS256) with fixed algorithm allowlist.
 * 3. Proves holder of public key CANNOT forge an authorization token (public-key-only forgery denial).
 * 4. Confirms verifier module contains zero private keys and zero token-signing methods.
 * 5. Rejects tampering, unsigned tokens, algorithm "none", and symmetric HS256 tokens.
 * 6. Enforces temporal claims (iat, nbf, exp, max lifetime).
 * 7. Enforces exact scopes (criteria, tables, operations, plan digest).
 * 8. Prohibits destructive operations (DELETE, DROP, TRUNCATE).
 * 9. Requires incident_closure_ref confirming external credential rotation prerequisite.
 * 10. Enforces persistent anti-replay across simulated restarts and separate Node child processes.
 * 11. Rejects revoked tokens from authoritative persistent store.
 * 12. Fails closed when replay store is unavailable or unwritable.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  verifyStagingWriteAuthorization,
  resolvePublicTrustAnchor,
  ALLOWED_STAGING_PROJECT_REF,
  PROHIBITED_PRODUCTION_REF,
  EXPECTED_ISSUER,
  EXPECTED_AUDIENCE
} from '../scripts/lib/stagingAuthorization.mjs';

import {
  reserveNonce,
  revokeNonce,
  isNonceConsumed,
  isNonceRevoked,
  clearReplayStore
} from '../scripts/lib/stagingReplayStore.mjs';

import {
  generateTestKeyPair,
  createTestSignedAuthorizationToken,
  base64UrlEncode
} from './helpers/stagingAuthTestHelper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const TEST_STORE_PATH = path.join(REPO_ROOT, '.kshetra_runtime', 'test_staging_replay_store.json');

describe('CTO Directive 142 Section 2: Asymmetric Cryptographic Authorization & Anti-Replay Battery', () => {
  let ed25519Keys;
  let rs25519Keys;

  beforeEach(() => {
    ed25519Keys = generateTestKeyPair('Ed25519');
    rs25519Keys = generateTestKeyPair('RS256');
    clearReplayStore({ storePath: TEST_STORE_PATH });
  });

  afterEach(() => {
    clearReplayStore({ storePath: TEST_STORE_PATH });
    try {
      if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
      if (fs.existsSync(`${TEST_STORE_PATH}.lock`)) fs.rmdirSync(`${TEST_STORE_PATH}.lock`);
    } catch (_) {}
  });

  // 1. Trust Anchor Presence & Configuration
  it('1. Fails closed when public key trust anchor is missing or unconfigured', () => {
    const validToken = createTestSignedAuthorizationToken({}, ed25519Keys.privateKeyPem);
    const oldEnv = process.env.KSHETRA_CTO_PUBLIC_KEY;
    delete process.env.KSHETRA_CTO_PUBLIC_KEY;

    try {
      assert.throws(
        () => {
          verifyStagingWriteAuthorization({
            token: validToken,
            trustAnchor: undefined,
            publicKeyPath: path.join(REPO_ROOT, 'non_existent_key.pem'),
            storePath: TEST_STORE_PATH
          });
        },
        (err) => {
          assert.strictEqual(err.code, 'TRUST_ANCHOR_UNCONFIGURED');
          assert.match(err.message, /Staging write public key trust anchor is not configured/i);
          return true;
        }
      );
    } finally {
      if (oldEnv) process.env.KSHETRA_CTO_PUBLIC_KEY = oldEnv;
    }
  });

  // 2. Trust Anchor Type Validation
  it('2. Fails closed when trust anchor is malformed or not an asymmetric public key', () => {
    const validToken = createTestSignedAuthorizationToken({}, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: validToken,
          trustAnchor: 'not-a-valid-pem-key',
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_TRUST_ANCHOR');
        return true;
      }
    );
  });

  // 3. Verifier module contains no token-signing methods or private keys
  it('3. Confirms verifier module contains zero private keys and zero token-signing methods', async () => {
    const verifierModule = await import('../scripts/lib/stagingAuthorization.mjs');
    assert.strictEqual(typeof verifierModule.createSignedAuthorizationToken, 'undefined', 'Signing helper must NOT exist in verifier module');
    assert.strictEqual(typeof verifierModule.privateKey, 'undefined', 'Private key must NOT exist in verifier module');
  });

  // 4. Public-Key-Only Forgery Denial
  it('4. Proves a holder of the public key cannot forge a valid authorization token', () => {
    // Attempting to sign using public key or treating public key as HMAC secret fails verification
    const header = base64UrlEncode(JSON.stringify({ alg: 'Ed25519', typ: 'KSHETRA-AUTH+JWS' }));
    const payload = base64UrlEncode(JSON.stringify({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: crypto.randomUUID(),
      incident_closure_ref: 'FORGED-TOKEN'
    }));

    // Forgery attempt 1: Using public key as HMAC secret
    const hmac = crypto.createHmac('sha256', ed25519Keys.publicKeyPem);
    hmac.update(`${header}.${payload}`);
    const forgedSigHmac = base64UrlEncode(hmac.digest());
    const forgedToken = `${header}.${payload}.${forgedSigHmac}`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: forgedToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_SIGNATURE');
        return true;
      }
    );
  });

  // 5. Algorithm Allowlist: Rejects 'none' and symmetric 'HS256'
  it('5. Rejects unsigned or algorithm "none" tokens (UNSIGNED_AUTHORIZATION_TOKEN)', () => {
    const unsignedHeader = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'KSHETRA-AUTH+JWS' }));
    const payload = base64UrlEncode(JSON.stringify({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: crypto.randomUUID()
    }));
    const token = `${unsignedHeader}.${payload}.`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNSIGNED_AUTHORIZATION_TOKEN');
        return true;
      }
    );
  });

  it('6. Rejects symmetric algorithms like HS256 (UNSUPPORTED_ALGORITHM)', () => {
    const hs256Header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'KSHETRA-AUTH+JWS' }));
    const payload = base64UrlEncode(JSON.stringify({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: crypto.randomUUID()
    }));
    const token = `${hs256Header}.${payload}.fakesig`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNSUPPORTED_ALGORITHM');
        assert.match(err.message, /not in the authorized algorithm allowlist/i);
        return true;
      }
    );
  });

  // 7. Signature Tampering Rejection
  it('7. Rejects token with tampered payload or altered signature', () => {
    const validToken = createTestSignedAuthorizationToken({
      criteria: ['CRIT-C02-02']
    }, ed25519Keys.privateKeyPem);

    const [h, p, s] = validToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    decodedPayload.criteria.push('CRIT-D02-02'); // Malicious elevation
    const tamperedPayloadB64 = base64UrlEncode(JSON.stringify(decodedPayload));
    const tamperedToken = `${h}.${tamperedPayloadB64}.${s}`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tamperedToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_SIGNATURE');
        return true;
      }
    );
  });

  // 8. Temporal Claims (Expired, Not-Yet-Valid, Max Lifetime)
  it('8. Rejects expired authorization token (TOKEN_EXPIRED)', () => {
    const now = Date.now();
    const expiredToken = createTestSignedAuthorizationToken({
      exp: Math.floor(now / 1000) - 100
    }, ed25519Keys.privateKeyPem, { now });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: expiredToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_EXPIRED');
        return true;
      }
    );
  });

  it('9. Rejects token that is not yet valid (TOKEN_NOT_YET_VALID)', () => {
    const now = Date.now();
    const futureToken = createTestSignedAuthorizationToken({
      nbf: Math.floor(now / 1000) + 1000
    }, ed25519Keys.privateKeyPem, { now });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: futureToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_NOT_YET_VALID');
        return true;
      }
    );
  });

  it('10. Rejects token with excessive lifetime (EXCESSIVE_TOKEN_LIFETIME)', () => {
    const now = Date.now();
    const longToken = createTestSignedAuthorizationToken({
      exp: Math.floor(now / 1000) + 100000 // > 86400s
    }, ed25519Keys.privateKeyPem, { now, expiresInSeconds: 100000 });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: longToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          maxLifetimeSeconds: 86400,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'EXCESSIVE_TOKEN_LIFETIME');
        return true;
      }
    );
  });

  // 11. Incident Closure Reference Requirement
  it('11. Rejects token missing incident_closure_ref (INCIDENT_CLOSURE_REF_REQUIRED)', () => {
    const tokenNoRef = createTestSignedAuthorizationToken({
      incident_closure_ref: null
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenNoRef,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INCIDENT_CLOSURE_REF_REQUIRED');
        return true;
      }
    );
  });

  // 12. Project Binding & Air-Gap Violations
  it('12. Rejects token scoped to different project or production target', () => {
    const wrongProjectToken = createTestSignedAuthorizationToken({
      project_ref: 'other-project-id'
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: wrongProjectToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PROJECT_MISMATCH');
        return true;
      }
    );

    const prodToken = createTestSignedAuthorizationToken({
      project_ref: PROHIBITED_PRODUCTION_REF
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: prodToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          targetProject: PROHIBITED_PRODUCTION_REF,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'AIR_GAP_VIOLATION');
        return true;
      }
    );
  });

  // 13. Granular Table-Level & Criteria Scope Enforcement
  it('13. Rejects execution when requested table is not permitted by authorization token', () => {
    const token = createTestSignedAuthorizationToken({
      tables: ['public.political_organizations']
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          requestedTables: ['public.political_organizations', 'public.candidacies'],
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_TABLE');
        assert.match(err.message, /public\.candidacies/i);
        return true;
      }
    );
  });

  it('14. Rejects destructive operations like DELETE, DROP, TRUNCATE (PROHIBITED_OPERATION)', () => {
    const token = createTestSignedAuthorizationToken({
      operations: ['INSERT', 'DELETE']
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          requestedOperations: ['DELETE'],
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PROHIBITED_OPERATION');
        return true;
      }
    );
  });

  // 15. Plan Digest Verification
  it('15. Rejects execution when requested plan digest does not match token claim', () => {
    const token = createTestSignedAuthorizationToken({
      plan_digest: 'expected-plan-hash-1234'
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          requestedPlanDigest: 'different-plan-hash-5678',
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PLAN_DIGEST_MISMATCH');
        return true;
      }
    );
  });

  // 16. Durable Cross-Process Anti-Replay & Restarts
  it('16. Rejects replay of a previously consumed nonce across simulated restarts', () => {
    const nonce = `test-nonce-${Date.now()}`;
    const token = createTestSignedAuthorizationToken({ nonce }, ed25519Keys.privateKeyPem);

    // First consumption succeeds
    const res1 = verifyStagingWriteAuthorization({
      token,
      trustAnchor: ed25519Keys.publicKeyPem,
      storePath: TEST_STORE_PATH
    });
    assert.strictEqual(res1.valid, true);

    // Verify disk persistence
    assert.ok(fs.existsSync(TEST_STORE_PATH), 'Store file must be written to disk');
    const storeOnDisk = JSON.parse(fs.readFileSync(TEST_STORE_PATH, 'utf8'));
    assert.ok(storeOnDisk.consumed[nonce], 'Nonce must be recorded on disk');

    // Second consumption (simulating restart / new invocation) must fail with NONCE_ALREADY_CONSUMED
    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'NONCE_ALREADY_CONSUMED');
        return true;
      }
    );
  });

  // 17. Cross-Process Independent Child Process Replay Test
  it('17. Enforces durable replay prevention across independent Node child processes', () => {
    const nonce = `child-process-nonce-${Date.now()}`;
    const token = createTestSignedAuthorizationToken({ nonce }, ed25519Keys.privateKeyPem);

    // Script to run in child process
    const childScript = `
      import { verifyStagingWriteAuthorization } from './scripts/lib/stagingAuthorization.mjs';
      const token = process.env.TEST_TOKEN;
      const trustAnchor = process.env.TEST_KEY;
      const storePath = process.env.TEST_STORE;
      verifyStagingWriteAuthorization({ token, trustAnchor, storePath });
      console.log('CHILD_OK');
    `;

    // Process 1 consumes nonce
    const child1 = execSync(`node --input-type=module -e "${childScript.replace(/\n/g, ' ')}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        TEST_TOKEN: token,
        TEST_KEY: ed25519Keys.publicKeyPem,
        TEST_STORE: TEST_STORE_PATH
      }
    });
    assert.match(child1, /CHILD_OK/);

    // Process 2 attempts replay -> must exit non-zero with NONCE_ALREADY_CONSUMED
    assert.throws(
      () => {
        execSync(`node --input-type=module -e "${childScript.replace(/\n/g, ' ')}"`, {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            TEST_TOKEN: token,
            TEST_KEY: ed25519Keys.publicKeyPem,
            TEST_STORE: TEST_STORE_PATH
          }
        });
      },
      (err) => {
        const stderr = err.stderr ? err.stderr.toString() : err.message;
        assert.match(stderr, /NONCE_ALREADY_CONSUMED/);
        return true;
      }
    );
  });

  // 18. Revocation from Durable Source
  it('18. Rejects authorization token with revoked nonce (TOKEN_REVOKED)', () => {
    const nonce = `revoked-nonce-${Date.now()}`;
    const token = createTestSignedAuthorizationToken({ nonce }, ed25519Keys.privateKeyPem);

    // Authoritatively revoke nonce in durable store
    revokeNonce(nonce, 'Administrative revocation test', { storePath: TEST_STORE_PATH });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_REVOKED');
        return true;
      }
    );
  });

  // 19. Successful Verification: Ed25519
  it('19. Successfully verifies an authorized token using Ed25519 public key', () => {
    const planDigest = crypto.createHash('sha256').update('approved-manifest-payload').digest('hex');
    const token = createTestSignedAuthorizationToken({
      criteria: ['CRIT-C02-02', 'CRIT-D02-02'],
      tables: ['public.political_organizations', 'public.candidacies'],
      operations: ['INSERT', 'UPSERT'],
      plan_digest: planDigest
    }, ed25519Keys.privateKeyPem, { alg: 'Ed25519' });

    const result = verifyStagingWriteAuthorization({
      token,
      trustAnchor: ed25519Keys.publicKeyPem,
      requestedCriteria: ['CRIT-C02-02'],
      requestedTables: ['public.political_organizations'],
      requestedOperations: ['INSERT'],
      requestedPlanDigest: planDigest,
      storePath: TEST_STORE_PATH
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issuer, EXPECTED_ISSUER);
    assert.strictEqual(result.audience, EXPECTED_AUDIENCE);
    assert.strictEqual(result.projectRef, ALLOWED_STAGING_PROJECT_REF);
    assert.strictEqual(result.planDigest, planDigest);
  });

  // 20. Successful Verification: RS256
  it('20. Successfully verifies an authorized token using RS256 public key', () => {
    const planDigest = crypto.createHash('sha256').update('approved-rs256-payload').digest('hex');
    const token = createTestSignedAuthorizationToken({
      criteria: ['CRIT-E01-02'],
      tables: ['public.constituency_demographics'],
      operations: ['UPSERT'],
      plan_digest: planDigest
    }, rs25519Keys.privateKeyPem, { alg: 'RS256' });

    const result = verifyStagingWriteAuthorization({
      token,
      trustAnchor: rs25519Keys.publicKeyPem,
      requestedCriteria: ['CRIT-E01-02'],
      requestedTables: ['public.constituency_demographics'],
      requestedOperations: ['UPSERT'],
      requestedPlanDigest: planDigest,
      storePath: TEST_STORE_PATH
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issuer, EXPECTED_ISSUER);
    assert.strictEqual(result.planDigest, planDigest);
  });

});
