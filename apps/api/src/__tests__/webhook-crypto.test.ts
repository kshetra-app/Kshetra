import {
  getMasterEncryptionKey,
  generateWebhookSecret,
  hashSecret,
  extractSecretHint,
  encryptSecret,
  decryptSecret,
  canonicalizeJson,
  computePayloadSha256,
  generateWebhookSignature,
  formatSignatureHeader,
  verifyWebhookSignature,
  redactSecretsForLogging,
} from '../modules/webhooks/crypto';

describe('Webhook cryptographic primitives', () => {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldKey = process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.NODE_ENV = oldNodeEnv;
    if (oldKey === undefined) delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    else process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = oldKey;
  });

  it('uses the test-only master-key fallback', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    expect(getMasterEncryptionKey()).toHaveLength(32);
  });

  it('rejects missing or malformed master keys outside test mode', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    expect(() => getMasterEncryptionKey()).toThrow('missing or invalid');
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'not-hex';
    expect(() => getMasterEncryptionKey()).toThrow('exactly 64 hexadecimal characters');
  });

  it('accepts a valid 64-character hexadecimal master key', () => {
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'a'.repeat(64);
    expect(getMasterEncryptionKey()).toEqual(Buffer.alloc(32, 0xaa));
  });

  it('generates random formatted webhook secrets', () => {
    const first = generateWebhookSecret();
    const second = generateWebhookSecret();
    expect(first).toMatch(/^whsec_[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
  });

  it('hashes secrets deterministically and creates safe hints', () => {
    expect(hashSecret('secret')).toBe(hashSecret('secret'));
    expect(hashSecret('secret')).not.toBe(hashSecret('other'));
    expect(extractSecretHint('whsec_12345678')).toBe('12345678');
    expect(extractSecretHint('legacy-secret')).toBe('cret');
  });

  it('encrypts and decrypts a secret with tenant/subscription AAD', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    const record = encryptSecret('whsec_abcdef0123456789', 'tenant-a', 'sub-a', 3);
    expect(record.version).toBe(3);
    expect(record.hash).toBe(hashSecret('whsec_abcdef0123456789'));
    expect(record.hint).toBe('0123456789');
    expect(decryptSecret(record, 'tenant-a', 'sub-a')).toBe('whsec_abcdef0123456789');
    expect(decryptSecret(record.ciphertext, record.iv, record.tag, 'tenant-a', 'sub-a')).toBe('whsec_abcdef0123456789');
  });

  it('rejects decrypting ciphertext with different tenant or subscription AAD', () => {
    process.env.NODE_ENV = 'test';
    const record = encryptSecret('secret-value', 'tenant-a', 'sub-a');
    expect(() => decryptSecret(record, 'tenant-b', 'sub-a')).toThrow();
    expect(() => decryptSecret(record, 'tenant-a', 'sub-b')).toThrow();
  });

  it('canonicalizes nested objects with sorted keys and no insignificant whitespace', () => {
    expect(canonicalizeJson({ z: 1, a: { y: 2, x: 3 }, skip: undefined })).toBe('{"a":{"x":3,"y":2},"z":1}');
    expect(canonicalizeJson([3, { b: true, a: false }])).toBe('[3,{"a":false,"b":true}]');
    expect(canonicalizeJson(null)).toBe('null');
    expect(canonicalizeJson('x')).toBe('"x"');
  });

  it('computes payload hashes consistently for string and byte representations', () => {
    const raw = '{"hello":"world"}';
    expect(computePayloadSha256(raw)).toBe(computePayloadSha256(Buffer.from(raw)));
  });

  it('generates equivalent HMAC signatures for both supported argument orders', () => {
    const signature = generateWebhookSignature('secret', '{"a":1}', 1700000000);
    expect(signature).toBe(generateWebhookSignature('secret', 1700000000, '{"a":1}'));
    expect(generateWebhookSignature('secret', Buffer.from('x'), 1)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('formats primary and rotated-secret signature headers', () => {
    expect(formatSignatureHeader(100, 'primary')).toBe('t=100,v1=primary');
    expect(formatSignatureHeader(100, 'primary', 'previous')).toBe('t=100,v1=primary,v1=previous');
    expect(formatSignatureHeader(100, 'primary', null)).toBe('t=100,v1=primary');
  });

  it('validates a current signature and accepts a previous rotation secret', () => {
    const timestamp = 1700000000;
    const payload = '{"id":1}';
    const signature = generateWebhookSignature('primary-secret', payload, timestamp);
    expect(verifyWebhookSignature({
      signatureHeader: formatSignatureHeader(timestamp, signature),
      rawPayload: payload, secret: 'primary-secret', currentTimestampSeconds: timestamp,
    })).toEqual({ valid: true });

    const previousSignature = generateWebhookSignature('previous-secret', payload, timestamp);
    expect(verifyWebhookSignature({
      signatureHeader: formatSignatureHeader(timestamp, previousSignature),
      rawPayload: payload, secret: 'primary-secret', previousSecret: 'previous-secret',
      currentTimestampSeconds: timestamp,
    })).toEqual({ valid: true });
  });

  it.each([
    ['', 'MISSING_SIGNATURE_HEADER'],
    ['v1=abc', 'MALFORMED_SIGNATURE_HEADER'],
    ['t=abc,v1=abc', 'INVALID_TIMESTAMP'],
    ['t=100,v1=abc', 'SIGNATURE_EXPIRED'],
    ['t=1061,v1=abc', 'FUTURE_TIMESTAMP'],
    ['t=1000,v1=deadbeef', 'SIGNATURE_MISMATCH'],
  ])('rejects signature header with reason %s', (header, reason) => {
    const result = verifyWebhookSignature({
      signatureHeader: header,
      rawPayload: 'payload',
      secret: 'secret',
      currentTimestampSeconds: 1000,
      toleranceSeconds: 300,
    });
    expect(result).toEqual({ valid: false, reason });
  });

  it('supports positional signature verification arguments', () => {
    const timestamp = 2000;
    const payload = 'raw';
    const sig = generateWebhookSignature('secret', payload, timestamp);
    expect(verifyWebhookSignature(payload, formatSignatureHeader(timestamp, sig), 'secret')).toEqual({ valid: true });
  });

  it('redacts secrets recursively in strings, arrays, and objects', () => {
    const secret = `whsec_${'a'.repeat(64)}`;
    expect(redactSecretsForLogging(`token=${secret}`)).toBe('token=whsec_***');
    expect(redactSecretsForLogging({ nested: [secret, { token: secret }], count: 2 })).toEqual({
      nested: ['whsec_***', { token: 'whsec_***' }], count: 2,
    });
    expect(redactSecretsForLogging(0)).toBe(0);
    expect(redactSecretsForLogging(null)).toBeNull();
  });
});
