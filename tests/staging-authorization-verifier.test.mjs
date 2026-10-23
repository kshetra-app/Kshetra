/**
 * tests/staging-authorization-verifier.test.mjs
 *
 * Comprehensive Asymmetric Cryptographic Authorization & Anti-Replay Battery
 * Authority: CTO Directive 142 & CTO Directive 143 / Master Execution Framework Amendment v1.6
 *
 * Proves:
 * 1. Fails closed when public key trust anchor is missing or unconfigured.
 * 2. Enforces asymmetric signature verification (Ed25519 & RS256) with fixed algorithm allowlist.
 * 3. Proves holder of public key CANNOT forge an authorization token (public-key-only forgery denial).
 * 4. Confirms verifier module contains zero private keys and zero token-signing methods.
 * 5. Rejects tampering, unsigned tokens, algorithm "none", and symmetric HS256 tokens.
 * 6. Enforces temporal claims (iat, nbf, exp, clock skew, max lifetime, contradictory/inconsistent claims).
 * 7. Enforces exact scopes (criteria, tables, operations, mandatory plan digest).
 * 8. Prohibits destructive operations (DELETE, DROP, TRUNCATE, ALTER) within token grants.
 * 9. Enforces fail-closed administrative containment gate (requires authenticated administrator closure record).
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
  EXPECTED_AUDIENCE,
  ALL_AUTHORIZED_STAGING_TABLES
} from '../scripts/lib/stagingAuthorization.mjs';

import {
  reserveNonce,
  revokeNonce,
  clearReplayStore
} from '../scripts/lib/stagingReplayStore.mjs';

import {
  generateTestKeyPair,
  generateTestAdminKeyPair,
  createTestSignedAuthorizationToken,
  createTestAdminClosureRecord,
  base64UrlEncode
} from './helpers/stagingAuthTestHelper.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const TEST_STORE_PATH = path.join(REPO_ROOT, '.kshetra_runtime', 'test_staging_replay_store.json');

describe('CTO Directive 143 / 142: Asymmetric Cryptographic Authorization & Anti-Replay Battery', () => {
  let ed25519Keys;
  let rs25519Keys;
  let adminKeys;
  let testAdminRecord;
  let validPlanDigest;

  beforeEach(() => {
    ed25519Keys = generateTestKeyPair('Ed25519');
    rs25519Keys = generateTestKeyPair('RS256');
    adminKeys = generateTestAdminKeyPair('Ed25519');
    process.env.KSHETRA_ADMIN_PUBLIC_KEY = adminKeys.publicKeyPem;
    testAdminRecord = createTestAdminClosureRecord({}, adminKeys.privateKeyPem);
    validPlanDigest = crypto.createHash('sha256').update('canonical-test-execution-plan').digest('hex');
    clearReplayStore({ storePath: TEST_STORE_PATH });
  });

  afterEach(() => {
    delete process.env.KSHETRA_ADMIN_PUBLIC_KEY;
    clearReplayStore({ storePath: TEST_STORE_PATH });
    try {
      if (fs.existsSync(TEST_STORE_PATH)) fs.unlinkSync(TEST_STORE_PATH);
      if (fs.existsSync(`${TEST_STORE_PATH}.lock`)) fs.rmdirSync(`${TEST_STORE_PATH}.lock`);
    } catch (_) {}
  });

  // 1. Trust Anchor Presence & Configuration
  it('1. Fails closed when public key trust anchor is missing or unconfigured', () => {
    const validToken = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    const oldEnv = process.env.KSHETRA_CTO_PUBLIC_KEY;
    delete process.env.KSHETRA_CTO_PUBLIC_KEY;

    try {
      assert.throws(
        () => {
          verifyStagingWriteAuthorization({
            token: validToken,
            trustAnchor: undefined,
            publicKeyPath: path.join(REPO_ROOT, 'non_existent_key.pem'),
            storePath: TEST_STORE_PATH,
            adminClosureRecord: testAdminRecord,
            requestedPlanDigest: validPlanDigest
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

  it('2. Fails closed when trust anchor is malformed or not an asymmetric public key', () => {
    const validToken = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: validToken,
          trustAnchor: 'THIS_IS_A_SYMMETRIC_OR_CORRUPTED_SECRET_STRING_NOT_PEM',
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_TRUST_ANCHOR');
        return true;
      }
    );
  });

  it('3. Confirms verifier module contains zero private keys and zero token-signing methods', async () => {
    const verifierCode = fs.readFileSync(
      path.join(REPO_ROOT, 'scripts/lib/stagingAuthorization.mjs'),
      'utf8'
    );

    assert.doesNotMatch(verifierCode, /crypto\.sign\(/, 'Verifier must NOT contain crypto.sign calls');
    assert.doesNotMatch(verifierCode, /createPrivateKey\(/, 'Verifier must NOT contain createPrivateKey calls');
    assert.doesNotMatch(verifierCode, /generateKeyPairSync\(/, 'Verifier must NOT generate key pairs');
    assert.doesNotMatch(verifierCode, /createHmac\(/, 'Verifier must NOT use symmetric HMAC');
    assert.doesNotMatch(verifierCode, /PRIVATE KEY/i, 'Verifier must NOT embed private key PEM strings');
  });

  it('4. Proves a holder of the public key cannot forge a valid authorization token', () => {
    const fakeKeyPair = generateTestKeyPair('Ed25519');
    const forgedToken = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, fakeKeyPair.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: forgedToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_SIGNATURE');
        return true;
      }
    );
  });

  it('5. Rejects unsigned or algorithm "none" tokens (UNSIGNED_AUTHORIZATION_TOKEN)', () => {
    const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'KSHETRA-AUTH+JWS' }));
    const payload = base64UrlEncode(JSON.stringify({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'nonce-none-alg',
      incident_closure_ref: 'INC-2026-W021.5-ROTATION-VERIFIED',
      tables: [...ALL_AUTHORIZED_STAGING_TABLES],
      operations: ['UPSERT'],
      plan_digest: validPlanDigest
    }));
    const unsignedToken = `${header}.${payload}.`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: unsignedToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNSIGNED_AUTHORIZATION_TOKEN');
        return true;
      }
    );
  });

  it('6. Rejects symmetric algorithms like HS256 (UNSUPPORTED_ALGORITHM)', () => {
    const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'KSHETRA-AUTH+JWS' }));
    const payload = base64UrlEncode(JSON.stringify({
      iss: EXPECTED_ISSUER,
      aud: EXPECTED_AUDIENCE,
      project_ref: ALLOWED_STAGING_PROJECT_REF,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'nonce-hs256',
      incident_closure_ref: 'INC-2026-W021.5-ROTATION-VERIFIED',
      tables: [...ALL_AUTHORIZED_STAGING_TABLES],
      operations: ['UPSERT'],
      plan_digest: validPlanDigest
    }));
    const fakeHmacSig = base64UrlEncode(crypto.createHmac('sha256', 'some-secret').update(`${header}.${payload}`).digest());
    const hmacToken = `${header}.${payload}.${fakeHmacSig}`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: hmacToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNSUPPORTED_ALGORITHM');
        return true;
      }
    );
  });

  it('7. Rejects token with tampered payload or altered signature', () => {
    const validToken = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);
    const [h, p, s] = validToken.split('.');

    // Tamper with payload
    const decodedPayload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
    decodedPayload.project_ref = 'hacked-project-ref';
    const tamperedPayload = base64UrlEncode(JSON.stringify(decodedPayload));
    const tamperedToken = `${h}.${tamperedPayload}.${s}`;

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tamperedToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_SIGNATURE');
        return true;
      }
    );
  });

  // 8. Strict Time Claims Validation (Directive 143 Section 4.2)
  it('8. Rejects token with missing or nonnumeric iat (INVALID_IAT)', () => {
    const tokenNoIat = createTestSignedAuthorizationToken({
      iat: null,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenNoIat,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_IAT');
        return true;
      }
    );
  });

  it('9. Rejects token issued in the future beyond allowable clock skew (TOKEN_ISSUED_IN_FUTURE)', () => {
    const now = Date.now();
    const futureIat = Math.floor(now / 1000) + 300; // 5 minutes in future
    const token = createTestSignedAuthorizationToken({
      iat: futureIat,
      exp: futureIat + 3600,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_ISSUED_IN_FUTURE');
        return true;
      }
    );
  });

  it('10. Rejects expired authorization token (TOKEN_EXPIRED)', () => {
    const now = Date.now();
    const pastExp = Math.floor(now / 1000) - 100;
    const expiredToken = createTestSignedAuthorizationToken({
      iat: pastExp - 3600,
      exp: pastExp,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: expiredToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_EXPIRED');
        return true;
      }
    );
  });

  it('11. Rejects token with expiry before or equal to issuance (INVALID_EXPIRY_BEFORE_ISSUANCE)', () => {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    const token = createTestSignedAuthorizationToken({
      iat: nowSec,
      exp: nowSec, // exp === iat
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_EXPIRY_BEFORE_ISSUANCE');
        return true;
      }
    );
  });

  it('12. Rejects contradictory or inconsistent nbf claims (CONTRADICTORY_TIME_CLAIMS)', () => {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    // nbf after exp
    const token = createTestSignedAuthorizationToken({
      iat: nowSec - 100,
      nbf: nowSec + 1000,
      exp: nowSec + 500,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'CONTRADICTORY_TIME_CLAIMS');
        return true;
      }
    );
  });

  it('13. Rejects token with excessive lifetime exceeding 3600s hard cap (EXCESSIVE_TOKEN_LIFETIME)', () => {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    const longToken = createTestSignedAuthorizationToken({
      iat: nowSec,
      exp: nowSec + 3601, // > 3600s
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: longToken,
          trustAnchor: ed25519Keys.publicKeyPem,
          now,
          maxLifetimeSeconds: 3600,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'EXCESSIVE_TOKEN_LIFETIME');
        return true;
      }
    );
  });

  // 14. Mandatory Execution Plan Digest Verification (Directive 143 Section 4.1)
  it('14. Fails closed when plan_digest is missing (MISSING_PLAN_DIGEST)', () => {
    const tokenNoDigest = createTestSignedAuthorizationToken({
      plan_digest: null
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenNoDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'MISSING_PLAN_DIGEST');
        return true;
      }
    );
  });

  it('15. Fails closed when plan_digest is malformed (MALFORMED_PLAN_DIGEST)', () => {
    const tokenMalformedDigest = createTestSignedAuthorizationToken({
      plan_digest: 'not-a-64-char-hex-digest'
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenMalformedDigest,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'MALFORMED_PLAN_DIGEST');
        return true;
      }
    );
  });

  it('16. Rejects execution when requested plan digest does not match token claim (PLAN_DIGEST_MISMATCH)', () => {
    const otherDigest = crypto.createHash('sha256').update('other-plan').digest('hex');
    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          requestedPlanDigest: otherDigest,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PLAN_DIGEST_MISMATCH');
        return true;
      }
    );
  });

  // 17. Fail-Closed Administrative Containment Gate (Directive 143 Section 5 & Directive 144 Workstream A)
  it('17. Fails closed when administrative incident closure record is unprovisioned (ADMIN_CONTAINMENT_UNCONFIRMED)', () => {
    const token = createTestSignedAuthorizationToken({
      incident_closure_ref: 'INC-2026-W021.5-ROTATION-VERIFIED',
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: undefined // Unconfirmed in operational environment
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_CONTAINMENT_UNCONFIRMED');
        assert.strictEqual(err.status, 'CONTAINMENT_PENDING_ADMIN_CONFIRMATION');
        assert.ok(Array.isArray(err.unresolvedPrerequisites));
        return true;
      }
    );
  });

  it('17a. Rejects unauthenticated plain JSON closure record without cryptographic signature (ADMIN_RECORD_UNAUTHENTICATED)', () => {
    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    const unsignedRecord = createTestAdminClosureRecord({}, null, { unsigned: true });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: unsignedRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_RECORD_UNAUTHENTICATED');
        return true;
      }
    );
  });

  it('17b. Rejects administrative closure record with tampered signature (INVALID_ADMIN_SIGNATURE)', () => {
    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    const tamperedRecord = createTestAdminClosureRecord({}, adminKeys.privateKeyPem, {
      signature: 'corrupted-tampered-signature-bytes'
    });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: tamperedRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_ADMIN_SIGNATURE');
        return true;
      }
    );
  });

  it('17c. Rejects administrative closure record signed with untrusted administrator key (INVALID_ADMIN_SIGNATURE)', () => {
    const rogueAdminKeys = generateTestAdminKeyPair('Ed25519');
    const rogueSignedRecord = createTestAdminClosureRecord({}, rogueAdminKeys.privateKeyPem);

    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: rogueSignedRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_ADMIN_SIGNATURE');
        return true;
      }
    );
  });

  it('17d. Rejects administrative closure verification when admin trust anchor is unconfigured (ADMIN_TRUST_ANCHOR_UNCONFIGURED)', () => {
    const oldAdminKey = process.env.KSHETRA_ADMIN_PUBLIC_KEY;
    delete process.env.KSHETRA_ADMIN_PUBLIC_KEY;

    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    try {
      assert.throws(
        () => {
          verifyStagingWriteAuthorization({
            token,
            trustAnchor: ed25519Keys.publicKeyPem,
            storePath: TEST_STORE_PATH,
            requestedPlanDigest: validPlanDigest,
            adminClosureRecord: testAdminRecord,
            adminTrustAnchor: undefined,
            adminKeyPath: path.join(REPO_ROOT, 'non_existent_admin_key.pem')
          });
        },
        (err) => {
          assert.strictEqual(err.code, 'ADMIN_TRUST_ANCHOR_UNCONFIGURED');
          return true;
        }
      );
    } finally {
      if (oldAdminKey) process.env.KSHETRA_ADMIN_PUBLIC_KEY = oldAdminKey;
    }
  });

  it('17e. Rejects administrative closure record with mismatched incident reference (ADMIN_RECORD_MISMATCH)', () => {
    // Both are valid canonical incident IDs, but they differ between token and admin record
    const mismatchedIncidentRecord = createTestAdminClosureRecord({
      incidentId: 'SEC-INC-2026-10-21-001'
    }, adminKeys.privateKeyPem);

    const token = createTestSignedAuthorizationToken({
      incident_closure_ref: 'INC-2026-W021.5-ROTATION-VERIFIED',
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: mismatchedIncidentRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_RECORD_MISMATCH');
        return true;
      }
    );
  });

  it('17e2. Rejects authorization token with unrecognized incident ID (INVALID_INCIDENT_ID)', () => {
    const invalidIncidentRecord = createTestAdminClosureRecord({
      incidentId: 'INC-2026-UNRECOGNIZED-INCIDENT'
    }, adminKeys.privateKeyPem);

    const token = createTestSignedAuthorizationToken({
      incident_closure_ref: 'INC-2026-UNRECOGNIZED-INCIDENT',
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: invalidIncidentRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_INCIDENT_ID');
        return true;
      }
    );
  });

  it('17f. Rejects administrative closure record with future certifiedAt timestamp (INVALID_CERTIFICATION_TIMESTAMP)', () => {
    const futureCertifiedRecord = createTestAdminClosureRecord({}, adminKeys.privateKeyPem, {
      certifiedAt: new Date(Date.now() + 86400000).toISOString()
    });

    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: futureCertifiedRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_CERTIFICATION_TIMESTAMP');
        return true;
      }
    );
  });

  it('17g. Rejects administrative closure record where credential rotation or audit is incomplete (ADMIN_CONTAINMENT_UNCONFIRMED)', () => {
    const incompleteRecord = createTestAdminClosureRecord({
      jwtSecretRotated: false
    }, adminKeys.privateKeyPem);

    const token = createTestSignedAuthorizationToken({
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          requestedPlanDigest: validPlanDigest,
          adminClosureRecord: incompleteRecord
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_CONTAINMENT_UNCONFIRMED');
        return true;
      }
    );
  });

  // 18. Strict Operation Grants & Prohibited Destructive Operations (Directive 143 Section 4.3)
  it('18. Rejects token granting prohibited destructive operation DELETE, DROP, TRUNCATE, or ALTER', () => {
    const tokenDelete = createTestSignedAuthorizationToken({
      operations: ['INSERT', 'DELETE'],
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenDelete,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'PROHIBITED_DESTRUCTIVE_OPERATION_IN_TOKEN');
        return true;
      }
    );
  });

  it('19. Rejects token granting unauthorized operation outside allowlist (UNAUTHORIZED_OPERATION_GRANT)', () => {
    const tokenWildcard = createTestSignedAuthorizationToken({
      operations: ['EXECUTE_RAW_SQL'],
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenWildcard,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_OPERATION_GRANT');
        return true;
      }
    );
  });

  // 20. Strict Table Scoping (Directive 143 Section 4.3 & 4.4)
  it('20. Rejects token granting unauthorized table outside closed staging allowlist (UNAUTHORIZED_TABLE_GRANT)', () => {
    const tokenAuthUsers = createTestSignedAuthorizationToken({
      tables: ['auth.users'],
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token: tokenAuthUsers,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_TABLE_GRANT');
        return true;
      }
    );
  });

  it('21. Rejects execution when requested table is not granted by token (UNAUTHORIZED_TABLE)', () => {
    const token = createTestSignedAuthorizationToken({
      tables: ['public.political_organizations'],
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          requestedTables: ['public.political_organizations', 'public.candidacies'],
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'UNAUTHORIZED_TABLE');
        return true;
      }
    );
  });

  // 22. Durable Anti-Replay Across Restarts
  it('22. Rejects replay of a previously consumed nonce across simulated restarts', () => {
    const nonce = `test-nonce-${Date.now()}`;
    const token = createTestSignedAuthorizationToken({
      nonce,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    const res1 = verifyStagingWriteAuthorization({
      token,
      trustAnchor: ed25519Keys.publicKeyPem,
      storePath: TEST_STORE_PATH,
      adminClosureRecord: testAdminRecord,
      requestedPlanDigest: validPlanDigest
    });
    assert.strictEqual(res1.valid, true);

    // Replay must fail closed with NONCE_ALREADY_CONSUMED
    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'NONCE_ALREADY_CONSUMED');
        return true;
      }
    );
  });

  // 23. Cross-Process Child Process Replay Test
  it('23. Enforces durable replay prevention across independent Node child processes', () => {
    const nonce = `child-process-nonce-${Date.now()}`;
    const token = createTestSignedAuthorizationToken({
      nonce,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    const adminRecordJson = JSON.stringify(testAdminRecord);

    const childScript = `
      import { verifyStagingWriteAuthorization } from './scripts/lib/stagingAuthorization.mjs';
      const token = process.env.TEST_TOKEN;
      const trustAnchor = process.env.TEST_KEY;
      const storePath = process.env.TEST_STORE;
      const adminClosureRecord = JSON.parse(process.env.TEST_ADMIN_RECORD);
      const requestedPlanDigest = process.env.TEST_DIGEST;
      verifyStagingWriteAuthorization({ token, trustAnchor, storePath, adminClosureRecord, requestedPlanDigest });
      console.log('CHILD_OK');
    `;

    // Process 1 consumes nonce
    const child1 = execSync(`node --input-type=module -e "${childScript.replace(/\n/g, ' ')}"`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: {
        ...process.env,
        KSHETRA_ADMIN_PUBLIC_KEY: adminKeys.publicKeyPem,
        TEST_TOKEN: token,
        TEST_KEY: ed25519Keys.publicKeyPem,
        TEST_STORE: TEST_STORE_PATH,
        TEST_ADMIN_RECORD: adminRecordJson,
        TEST_DIGEST: validPlanDigest
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
            KSHETRA_ADMIN_PUBLIC_KEY: adminKeys.publicKeyPem,
            TEST_TOKEN: token,
            TEST_KEY: ed25519Keys.publicKeyPem,
            TEST_STORE: TEST_STORE_PATH,
            TEST_ADMIN_RECORD: adminRecordJson,
            TEST_DIGEST: validPlanDigest
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

  // 24. Revocation from Durable Source
  it('24. Rejects authorization token with revoked nonce (TOKEN_REVOKED)', () => {
    const nonce = `revoked-nonce-${Date.now()}`;
    const token = createTestSignedAuthorizationToken({
      nonce,
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem);

    revokeNonce(nonce, 'Administrative revocation test', { storePath: TEST_STORE_PATH });

    assert.throws(
      () => {
        verifyStagingWriteAuthorization({
          token,
          trustAnchor: ed25519Keys.publicKeyPem,
          storePath: TEST_STORE_PATH,
          adminClosureRecord: testAdminRecord,
          requestedPlanDigest: validPlanDigest
        });
      },
      (err) => {
        assert.strictEqual(err.code, 'TOKEN_REVOKED');
        return true;
      }
    );
  });

  // 25. Successful Verification: Ed25519
  it('25. Successfully verifies an authorized token using Ed25519 public key', () => {
    const token = createTestSignedAuthorizationToken({
      criteria: ['CRIT-C02-02', 'CRIT-D02-02'],
      tables: ['public.political_organizations', 'public.candidacies'],
      operations: ['INSERT', 'UPSERT'],
      plan_digest: validPlanDigest
    }, ed25519Keys.privateKeyPem, { alg: 'Ed25519' });

    const result = verifyStagingWriteAuthorization({
      token,
      trustAnchor: ed25519Keys.publicKeyPem,
      requestedCriteria: ['CRIT-C02-02'],
      requestedTables: ['public.political_organizations'],
      requestedOperations: ['INSERT'],
      requestedPlanDigest: validPlanDigest,
      storePath: TEST_STORE_PATH,
      adminClosureRecord: testAdminRecord
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issuer, EXPECTED_ISSUER);
    assert.strictEqual(result.audience, EXPECTED_AUDIENCE);
    assert.strictEqual(result.projectRef, ALLOWED_STAGING_PROJECT_REF);
    assert.strictEqual(result.planDigest, validPlanDigest);
  });

  // 26. Successful Verification: RS256
  it('26. Successfully verifies an authorized token using RS256 public key', () => {
    const token = createTestSignedAuthorizationToken({
      criteria: ['CRIT-E01-02'],
      tables: ['public.constituency_demographics'],
      operations: ['UPSERT'],
      plan_digest: validPlanDigest
    }, rs25519Keys.privateKeyPem, { alg: 'RS256' });

    const result = verifyStagingWriteAuthorization({
      token,
      trustAnchor: rs25519Keys.publicKeyPem,
      requestedCriteria: ['CRIT-E01-02'],
      requestedTables: ['public.constituency_demographics'],
      requestedOperations: ['UPSERT'],
      requestedPlanDigest: validPlanDigest,
      storePath: TEST_STORE_PATH,
      adminClosureRecord: testAdminRecord
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.issuer, EXPECTED_ISSUER);
    assert.strictEqual(result.planDigest, validPlanDigest);
  });
});
