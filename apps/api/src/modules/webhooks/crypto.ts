/**
 * apps/api/src/modules/webhooks/crypto.ts
 *
 * Milestone W022 — B2B SaaS Outbound Webhooks & Event Dispatching Engine
 * Cryptographic Security, Authenticated Encryption (AES-256-GCM),
 * RFC 8785 Canonical Serialization, and HMAC-SHA256 Signing.
 */

import crypto from 'node:crypto';

// Master encryption key for secrets at rest (AES-256-GCM requires 32 bytes)
const DEFAULT_TEST_MASTER_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export function getMasterEncryptionKey(): Buffer {
  const envKey = process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 64) {
    return Buffer.from(envKey.trim().slice(0, 64), 'hex');
  }
  // Allow test fallback only in non-production environments
  if (process.env.NODE_ENV === 'test' || !process.env.NODE_ENV) {
    return Buffer.from(DEFAULT_TEST_MASTER_KEY, 'hex');
  }
  throw new Error('FATAL_SECURITY_ERROR: WEBHOOK_SECRETS_ENCRYPTION_KEY missing or invalid in deployed environment');
}

export interface EncryptedSecretRecord {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
  version: number;
  hash: string;
  hint: string;
}

/**
 * Generates a cryptographically secure random webhook secret.
 * Format: whsec_<64 hex chars>
 */
export function generateWebhookSecret(): string {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `whsec_${randomBytes}`;
}

/**
 * Hashes a secret using SHA-256 for fast lookup / integrity check.
 */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret, 'utf8').digest('hex');
}

/**
 * Extracts a safe 8-character hint for UI display.
 */
export function extractSecretHint(secret: string): string {
  if (secret.startsWith('whsec_')) {
    return secret.slice(-8);
  }
  return secret.slice(-4);
}

/**
 * Encrypts a webhook secret at rest using AES-256-GCM with Associated Authenticated Data (AAD).
 * AAD binds the ciphertext to the exact tenant_id and subscription_id.
 */
export function encryptSecret(
  secret: string,
  tenantId: string,
  subscriptionId: string,
  keyVersion = 1
): EncryptedSecretRecord {
  const masterKey = getMasterEncryptionKey();
  const iv = crypto.randomBytes(12);
  const aad = Buffer.from(`${tenantId}:${subscriptionId}`, 'utf8');

  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  cipher.setAAD(aad);

  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    tag,
    version: keyVersion,
    hash: hashSecret(secret),
    hint: extractSecretHint(secret),
  };
}

/**
 * Decrypts an encrypted webhook secret record, verifying authentication tag and AAD.
 * Accepts either a record object `{ ciphertext, iv, tag }` or positional buffers `(ciphertext, iv, tag)`.
 */
export function decryptSecret(
  recordOrCiphertext: { ciphertext: Buffer; iv: Buffer; tag: Buffer } | Buffer,
  ivOrTenantId: Buffer | string,
  tagOrSubscriptionId?: Buffer | string,
  maybeTenantId?: string,
  maybeSubscriptionId?: string
): string {
  let ciphertext: Buffer;
  let iv: Buffer;
  let tag: Buffer;
  let tenantId: string;
  let subscriptionId: string;

  if (Buffer.isBuffer(recordOrCiphertext)) {
    ciphertext = recordOrCiphertext;
    iv = ivOrTenantId as Buffer;
    tag = tagOrSubscriptionId as Buffer;
    tenantId = maybeTenantId!;
    subscriptionId = maybeSubscriptionId!;
  } else {
    ciphertext = recordOrCiphertext.ciphertext;
    iv = recordOrCiphertext.iv;
    tag = recordOrCiphertext.tag;
    tenantId = ivOrTenantId as string;
    subscriptionId = tagOrSubscriptionId as string;
  }

  const masterKey = getMasterEncryptionKey();
  const aad = Buffer.from(`${tenantId}:${subscriptionId}`, 'utf8');

  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  decipher.setAAD(aad);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) deterministic serializer.
 * Enforces lexicographical key sorting by UTF-16 code units, zero insignificant whitespace,
 * and standard IEEE 754 number formatting.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const elements = obj.map((item) => canonicalizeJson(item));
    return `[${elements.join(',')}]`;
  }

  // Object key sorting strictly by UTF-16 code units
  const record = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  const entries: string[] = [];
  for (const key of sortedKeys) {
    const val = record[key];
    if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
      entries.push(`${JSON.stringify(key)}:${canonicalizeJson(val)}`);
    }
  }

  return `{${entries.join(',')}}`;
}

/**
 * Computes SHA-256 hex digest over raw UTF-8 bytes.
 */
export function computePayloadSha256(rawBytesOrString: string | Buffer): string {
  const buf = Buffer.isBuffer(rawBytesOrString)
    ? rawBytesOrString
    : Buffer.from(rawBytesOrString, 'utf8');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Generates HMAC-SHA256 signature string for an outbound webhook request.
 * Canonical string: `${timestamp}.${rawPayloadString}`
 * Accepts either (secret, rawPayload, timestampSeconds) or (secret, timestampSeconds, rawPayload).
 */
export function generateWebhookSignature(
  secret: string,
  arg2: string | Buffer | number,
  arg3: number | string | Buffer
): string {
  let rawPayload: string | Buffer;
  let timestampSeconds: number;

  if (typeof arg2 === 'number') {
    timestampSeconds = arg2;
    rawPayload = arg3 as string | Buffer;
  } else {
    rawPayload = arg2;
    timestampSeconds = arg3 as number;
  }

  const payloadStr = Buffer.isBuffer(rawPayload) ? rawPayload.toString('utf8') : rawPayload;
  const canonicalString = `${timestampSeconds}.${payloadStr}`;
  return crypto.createHmac('sha256', secret).update(canonicalString, 'utf8').digest('hex');
}

/**
 * Formats standard X-PanIN-Signature header.
 * Single secret: `t=${timestamp},v1=${primarySig}`
 * Dual secret:   `t=${timestamp},v1=${primarySig},v1=${previousSig}`
 */
export function formatSignatureHeader(
  timestampSeconds: number,
  primarySignature: string,
  previousSignature?: string | null
): string {
  let header = `t=${timestampSeconds},v1=${primarySignature}`;
  if (previousSignature) {
    header += `,v1=${previousSignature}`;
  }
  return header;
}

/**
 * Parses and verifies an X-PanIN-Signature header in constant time.
 * Enforces replay protection (clock skew bounds).
 * Accepts either an options object or positional arguments (rawPayload, signatureHeader, secret, previousSecret).
 */
export function verifyWebhookSignature(
  paramsOrPayload:
    | {
        signatureHeader: string;
        rawPayload: string | Buffer;
        secret: string;
        previousSecret?: string | null;
        toleranceSeconds?: number;
        currentTimestampSeconds?: number;
      }
    | string
    | Buffer,
  maybeSignatureHeader?: string,
  maybeSecret?: string,
  maybePreviousSecret?: string | null
): { valid: boolean; reason?: string } {
  let signatureHeader: string;
  let rawPayload: string | Buffer;
  let secret: string;
  let previousSecret: string | null | undefined;
  let toleranceSeconds = 300;
  let currentTimestampSeconds = Math.floor(Date.now() / 1000);

  if (typeof paramsOrPayload === 'string' || Buffer.isBuffer(paramsOrPayload)) {
    rawPayload = paramsOrPayload;
    signatureHeader = maybeSignatureHeader!;
    secret = maybeSecret!;
    previousSecret = maybePreviousSecret;
  } else {
    signatureHeader = paramsOrPayload.signatureHeader;
    rawPayload = paramsOrPayload.rawPayload;
    secret = paramsOrPayload.secret;
    previousSecret = paramsOrPayload.previousSecret;
    if (paramsOrPayload.toleranceSeconds !== undefined) {
      toleranceSeconds = paramsOrPayload.toleranceSeconds;
    }
    if (paramsOrPayload.currentTimestampSeconds !== undefined) {
      currentTimestampSeconds = paramsOrPayload.currentTimestampSeconds;
    }
  }

  if (!signatureHeader || typeof signatureHeader !== 'string') {
    return { valid: false, reason: 'MISSING_SIGNATURE_HEADER' };
  }

  // Parse header grammar: t=...,v1=...,v1=...
  const parts = signatureHeader.split(',');
  let timestampStr: string | null = null;
  const signatures: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('t=')) {
      timestampStr = trimmed.slice(2);
    } else if (trimmed.startsWith('v1=')) {
      signatures.push(trimmed.slice(3));
    }
  }

  if (!timestampStr || signatures.length === 0) {
    return { valid: false, reason: 'MALFORMED_SIGNATURE_HEADER' };
  }

  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) {
    return { valid: false, reason: 'INVALID_TIMESTAMP' };
  }

  // Clock skew verification
  if (currentTimestampSeconds - timestamp > toleranceSeconds) {
    return { valid: false, reason: 'SIGNATURE_EXPIRED' };
  }
  if (timestamp - currentTimestampSeconds > 60) {
    return { valid: false, reason: 'FUTURE_TIMESTAMP' };
  }

  // Expected primary signature
  const expectedPrimary = generateWebhookSignature(secret, rawPayload, timestamp);
  const expectedPrimaryBuf = Buffer.from(expectedPrimary, 'hex');

  // Verify against all received signatures using constant-time comparison
  for (const receivedSig of signatures) {
    if (receivedSig.length === expectedPrimary.length) {
      const receivedBuf = Buffer.from(receivedSig, 'hex');
      if (receivedBuf.length === expectedPrimaryBuf.length && crypto.timingSafeEqual(expectedPrimaryBuf, receivedBuf)) {
        return { valid: true };
      }
    }
  }

  // If previous secret exists (during rotation grace period), test against previous secret
  if (previousSecret) {
    const expectedPrevious = generateWebhookSignature(previousSecret, rawPayload, timestamp);
    const expectedPreviousBuf = Buffer.from(expectedPrevious, 'hex');

    for (const receivedSig of signatures) {
      if (receivedSig.length === expectedPrevious.length) {
        const receivedBuf = Buffer.from(receivedSig, 'hex');
        if (receivedBuf.length === expectedPreviousBuf.length && crypto.timingSafeEqual(expectedPreviousBuf, receivedBuf)) {
          return { valid: true };
        }
      }
    }
  }

  return { valid: false, reason: 'SIGNATURE_MISMATCH' };
}

/**
 * Sanitizes strings or structured objects for logging, redacting any embedded webhook signing secrets.
 */
export function redactSecretsForLogging<T = any>(input: T): T {
  if (!input) return input;
  if (typeof input === 'string') {
    return input.replace(/whsec_[a-zA-Z0-9]{64}/g, 'whsec_***') as unknown as T;
  }
  if (typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map((item) => redactSecretsForLogging(item)) as unknown as T;
    }
    const copy: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) {
      copy[k] = redactSecretsForLogging(v);
    }
    return copy as T;
  }
  return input;
}
