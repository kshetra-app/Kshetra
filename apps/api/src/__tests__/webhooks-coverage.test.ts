import {
  canonicalizeJson,
  computePayloadSha256,
  decryptSecret,
  encryptSecret,
  extractSecretHint,
  formatSignatureHeader,
  generateWebhookSecret,
  generateWebhookSignature,
  getMasterEncryptionKey,
  hashSecret,
  redactSecretsForLogging,
  verifyWebhookSignature,
} from '../modules/webhooks/crypto';
import {
  isBlockedIp,
  isBlockedIpv4,
  isBlockedIpv6,
  validateAndPinEgressTarget,
} from '../modules/webhooks/antiSsrfGuard';
import { validateEventPayload } from '../modules/webhooks/schemas';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const TENANT = '11111111-1111-1111-1111-111111111111';
const SUBSCRIPTION = '22222222-2222-2222-2222-222222222222';

describe('webhook crypto branch coverage', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalKey = process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = KEY;
  });

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalKey === undefined) delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    else process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = originalKey;
  });

  test('accepts a valid trimmed hex key and rejects malformed or absent production keys', () => {
    expect(getMasterEncryptionKey()).toEqual(Buffer.from(KEY, 'hex'));
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = `  ${KEY}  `;
    expect(getMasterEncryptionKey()).toEqual(Buffer.from(KEY, 'hex'));
    process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY = 'not-hex';
    expect(() => getMasterEncryptionKey()).toThrow(/exactly 64 hexadecimal characters/);
    delete process.env.WEBHOOK_SECRETS_ENCRYPTION_KEY;
    process.env.NODE_ENV = 'production';
    expect(() => getMasterEncryptionKey()).toThrow(/missing or invalid in deployed environment/);
    process.env.NODE_ENV = 'test';
    expect(getMasterEncryptionKey()).toEqual(Buffer.from(KEY, 'hex'));
  });

  test('covers secret format, hints, hashes, encryption record and positional decryption', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[a-f0-9]{64}$/);
    expect(extractSecretHint(secret)).toBe(secret.slice(-8));
    expect(extractSecretHint('legacy-secret')).toBe('cret');
    expect(hashSecret(secret)).toHaveLength(64);
    const encrypted = encryptSecret(secret, TENANT, SUBSCRIPTION, 3);
    expect(encrypted.version).toBe(3);
    expect(encrypted.hash).toBe(hashSecret(secret));
    expect(decryptSecret(encrypted, TENANT, SUBSCRIPTION)).toBe(secret);
    expect(decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.tag, TENANT, SUBSCRIPTION)).toBe(secret);
    expect(() => decryptSecret(encrypted, TENANT, 'different-subscription')).toThrow();
  });

  test('canonicalizes primitives, arrays, nested objects and omits unsupported object values', () => {
    expect(canonicalizeJson(null)).toBe('null');
    expect(canonicalizeJson(true)).toBe('true');
    expect(canonicalizeJson('x')).toBe('"x"');
    expect(canonicalizeJson([3, { z: 1, a: 2 }])).toBe('[3,{"a":2,"z":1}]');
    expect(canonicalizeJson({ z: undefined, fn: () => 1, sym: Symbol('x'), a: 1 })).toBe('{"a":1}');
    expect(computePayloadSha256(Buffer.from('abc'))).toBe(computePayloadSha256('abc'));
  });

  test('supports both signature argument orders and optional previous-secret header', () => {
    const payload = '{"ok":true}';
    const primary = generateWebhookSignature('primary', payload, 1000);
    expect(generateWebhookSignature('primary', 1000, payload)).toBe(primary);
    const header = formatSignatureHeader(1000, primary);
    expect(header).toBe(`t=1000,v1=${primary}`);
    expect(formatSignatureHeader(1000, primary, 'old-signature')).toContain('v1=old-signature');
    expect(verifyWebhookSignature({
      signatureHeader: header, rawPayload: payload, secret: 'primary', currentTimestampSeconds: 1000,
    })).toEqual({ valid: true });
    const oldSig = generateWebhookSignature('old', payload, 1000);
    expect(verifyWebhookSignature({
      signatureHeader: formatSignatureHeader(1000, '0'.repeat(64), oldSig),
      rawPayload: payload, secret: 'primary', previousSecret: 'old', currentTimestampSeconds: 1000,
    })).toEqual({ valid: true });
    expect(verifyWebhookSignature(payload, header, 'primary')).toEqual({ valid: true });
    expect(verifyWebhookSignature({ signatureHeader: '', rawPayload: payload, secret: 'primary' }).reason).toBe('MISSING_SIGNATURE_HEADER');
    expect(verifyWebhookSignature({ signatureHeader: 'v1=abc', rawPayload: payload, secret: 'primary' }).reason).toBe('MALFORMED_SIGNATURE_HEADER');
    expect(verifyWebhookSignature({ signatureHeader: 't=nope,v1=abc', rawPayload: payload, secret: 'primary' }).reason).toBe('INVALID_TIMESTAMP');
    expect(verifyWebhookSignature({
      signatureHeader: formatSignatureHeader(600, primary), rawPayload: payload, secret: 'primary',
      currentTimestampSeconds: 1000, toleranceSeconds: 300,
    }).reason).toBe('SIGNATURE_EXPIRED');
    expect(verifyWebhookSignature({
      signatureHeader: formatSignatureHeader(1061, primary), rawPayload: payload, secret: 'primary',
      currentTimestampSeconds: 1000,
    }).reason).toBe('FUTURE_TIMESTAMP');
    expect(verifyWebhookSignature({
      signatureHeader: formatSignatureHeader(1000, 'bad'), rawPayload: payload, secret: 'primary',
      currentTimestampSeconds: 1000,
    }).reason).toBe('SIGNATURE_MISMATCH');
  });

  test('redacts nested secrets while preserving falsy and non-string primitives', () => {
    const secret = `whsec_${'a'.repeat(64)}`;
    expect(redactSecretsForLogging(null)).toBe(null);
    expect(redactSecretsForLogging('token=' + secret)).toBe('token=whsec_***');
    expect(redactSecretsForLogging([secret, 0, false])).toEqual(['whsec_***', 0, false]);
    expect(redactSecretsForLogging({ nested: { token: secret }, count: 2 })).toEqual({
      nested: { token: 'whsec_***' }, count: 2,
    });
    expect(redactSecretsForLogging(0)).toBe(0);
  });
});

describe('webhook egress guard branch coverage', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  test.each([
    ['127.0.0.1', true],
    ['10.1.2.3', true],
    ['172.16.0.1', true],
    ['192.168.1.1', true],
    ['8.8.8.8', false],
    ['100.64.0.1', true],
    ['192.0.2.1', true],
    ['198.51.100.1', true],
    ['203.0.113.1', true],
    ['224.0.0.1', true],
    ['255.255.255.255', true],
  ])('IPv4 classification for %s', (ip, blocked) => {
    expect(isBlockedIpv4(ip).blocked).toBe(blocked);
  });

  test.each([
    ['::1', true],
    ['::', true],
    ['fe80::1', true],
    ['fc00::1', true],
    ['fd00::1', true],
    ['ff02::1', true],
    ['2001:db8::1', true],
    ['::ffff:127.0.0.1', true],
    ['::ffff:8.8.8.8', false],
    ['2606:4700:4700::1111', false],
    ['not-an-ip', true],
  ])('IP classification for %s', (ip, blocked) => {
    expect(isBlockedIp(ip).blocked).toBe(blocked);
  });

  test('rejects malformed, credentialed, non-HTTPS, non-standard port and blocked DNS targets', async () => {
    await expect(validateAndPinEgressTarget('not a url')).rejects.toThrow(/Malformed URL/);
    await expect(validateAndPinEgressTarget('https://user:pass@example.com')).rejects.toThrow(/USERINFO_PROHIBITED/);
    await expect(validateAndPinEgressTarget('http://example.com')).rejects.toThrow(/HTTPS_REQUIRED/);
    await expect(validateAndPinEgressTarget('https://example.com:8443')).rejects.toThrow(/INVALID_PORT_FORBIDDEN/);
    await expect(validateAndPinEgressTarget('https://example.com', {
      mockDnsResolver: async () => [],
    })).rejects.toThrow(/DNS_RESOLUTION_FAILED/);
    await expect(validateAndPinEgressTarget('https://example.com', {
      mockDnsResolver: async () => ['8.8.8.8', '127.0.0.1'],
    })).rejects.toThrow(/BLOCKED_PRIVATE_IP_ADDRESS/);
  });

  test('pins a validated public IP and enforces localhost test override only in test mode', async () => {
    const result = await validateAndPinEgressTarget('https://example.com', {
      mockDnsResolver: async () => ['8.8.8.8', '1.1.1.1'],
    });
    expect(result.pinnedIp).toBe('8.8.8.8');
    expect(result.resolvedIps).toEqual(['8.8.8.8', '1.1.1.1']);
    expect(result.agent).toBeDefined();

    process.env.NODE_ENV = 'production';
    await expect(validateAndPinEgressTarget('http://127.0.0.1:8080', {
      allowLocalhostInTest: true,
    })).rejects.toThrow(/FATAL_SSRF_CONFIGURATION_VIOLATION/);
    process.env.NODE_ENV = 'test';
    const local = await validateAndPinEgressTarget('http://127.0.0.1:8080', {
      allowLocalhostInTest: true,
    });
    expect(local.pinnedIp).toBe('127.0.0.1');
    expect(local.port).toBe(8080);
  });
});

describe('webhook payload schema branch coverage', () => {
  const basePing = {
    event_id: '11111111-1111-1111-1111-111111111111',
    timestamp: '2026-10-26T00:00:00.000Z',
    message: 'test',
  };

  test('rejects unsupported event, non-object payload, missing fields and unknown root fields', () => {
    expect(validateEventPayload('unsupported.event', {} as any).error).toMatch(/UNSUPPORTED_EVENT_TYPE/);
    expect(validateEventPayload('test.ping', null).error).toMatch(/INVALID_PAYLOAD_TYPE/);
    expect(validateEventPayload('test.ping', []).error).toMatch(/INVALID_PAYLOAD_TYPE/);
    expect(validateEventPayload('test.ping', { event_id: basePing.event_id }).error).toMatch(/MISSING_REQUIRED_FIELD/);
    expect(validateEventPayload('test.ping', { ...basePing, extra: true }).error).toMatch(/UNRECOGNIZED_PAYLOAD_FIELD/);
    expect(validateEventPayload('test.ping', basePing).valid).toBe(true);
  });

  test('validates required and allowlisted nested election summary fields', () => {
    const baseElection = {
      event_id: '11111111-1111-1111-1111-111111111111',
      timestamp: '2026-10-26T00:00:00.000Z',
      election_id: 'general_2026',
      state_code: 'TS',
      constituency_code: 'TS_001',
      counting_round: 1,
      status: 'declared',
      summary: {
        total_votes_counted: 100,
        margin: 10,
        leading_candidate_id: '22222222-2222-2222-2222-222222222222',
        leading_party_code: 'ABC',
      },
    };
    expect(validateEventPayload('election.results.published', baseElection).valid).toBe(true);
    expect(validateEventPayload('election.results.published', { ...baseElection, summary: { margin: 10 } }).error)
      .toMatch(/summary.total_votes_counted/);
    expect(validateEventPayload('election.results.published', {
      ...baseElection, summary: { ...baseElection.summary, unexpected: true },
    }).error).toMatch(/summary.unexpected/);
    expect(validateEventPayload('election.results.published', {
      ...baseElection, extra: true,
    }).error).toMatch(/UNRECOGNIZED_PAYLOAD_FIELD/);
  });
});
