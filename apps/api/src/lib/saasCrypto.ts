import crypto from 'node:crypto';

/**
 * Format: panin_{environment}_{keyType}_{secret43}
 * Environment: 'live' | 'test'
 * keyType: 'sk'
 * secret: 43 characters of unpadded base64url ([0-9a-zA-Z_-]{43})
 * Total length: 14 prefix + 43 secret = 57 chars
 */
export const SAAS_API_KEY_REGEX = /^panin_(live|test)_sk_[0-9a-zA-Z_-]{43}$/;

export interface ParsedApiKey {
  rawKey: string;
  environment: 'live' | 'test';
  keyPrefix: string;
  keyHint: string;
  keyHash: string;
}

/**
 * Parses and verifies format of an incoming raw API key string.
 * Returns null if format is invalid (fail-closed).
 */
export function parseAndValidateApiKeyFormat(rawKey: unknown): ParsedApiKey | null {
  if (typeof rawKey !== 'string') {
    return null;
  }
  const trimmed = rawKey.trim();
  if (!SAAS_API_KEY_REGEX.test(trimmed)) {
    return null;
  }

  const parts = trimmed.split('_');
  if (parts.length < 4) {
    return null;
  }

  const env = parts[1] as 'live' | 'test';
  const prefix = `panin_${env}_sk_`;
  const secret43 = trimmed.slice(prefix.length);
  const keyHint = secret43.substring(0, 8);
  const keyHash = hashApiKey(trimmed);

  return {
    rawKey: trimmed,
    environment: env,
    keyPrefix: prefix,
    keyHint,
    keyHash,
  };
}

/**
 * Hashes an API key using SHA-256 (64-character lowercase hexadecimal string).
 */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

/**
 * Constant-time comparison between stored key hash and computed key hash.
 * Guards against timing side-channel analysis.
 */
export function verifyApiKeyHashConstantTime(storedHash: string, incomingHash: string): boolean {
  if (typeof storedHash !== 'string' || typeof incomingHash !== 'string') {
    return false;
  }
  const storedBuf = Buffer.from(storedHash, 'utf8');
  const incomingBuf = Buffer.from(incomingHash, 'utf8');

  if (storedBuf.length !== incomingBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuf, incomingBuf);
}

/**
 * Generates a new cryptographic API key per the ratified RFC 4648 Base64URL construction.
 * 32 raw bytes (256 bits) from crypto.randomBytes(32).
 */
export function generateCryptographicApiKey(environment: 'live' | 'test' = 'test'): {
  rawKey: string;
  keyPrefix: string;
  keyHint: string;
  keyHash: string;
  environment: 'live' | 'test';
} {
  const rawBytes = crypto.randomBytes(32);
  const secret43 = rawBytes.toString('base64url'); // exactly 43 chars unpadded
  const keyPrefix = `panin_${environment}_sk_`;
  const rawKey = `${keyPrefix}${secret43}`;
  const keyHint = secret43.substring(0, 8);
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    keyHint,
    keyHash,
    environment,
  };
}
