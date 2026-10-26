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
import http from 'node:http';
import {
  dispatchWebhook,
  MAX_RESPONSE_SAMPLE_BYTES,
  MAX_RESPONSE_STREAM_BYTES,
  MAX_WEBHOOK_PAYLOAD_BYTES,
} from '../modules/webhooks/webhookDispatcher';
import {
  calculateBackoffDelaySeconds,
  calculateNextRetryAt,
  InMemoryQueueProvider,
  parseBytea,
} from '../modules/webhooks/queueProvider';
import { SourceRegistry } from '../modules/delimitationWatch/sourceRegistry';
import { BaselineComparator } from '../modules/delimitationWatch/comparator';
import { Versioner } from '../modules/delimitationWatch/versioner';
import { Publisher } from '../modules/delimitationWatch/publisher';
import { parseAlternateIpv4, validateSourceUrl, validateAndPinSourceUrl } from '../modules/delimitationWatch/ssrfGuard';

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


describe('delimitation-watch source registry and URL guard branches', () => {
  const repo = {
    saveSource: jest.fn(async (source: any) => source),
    getSource: jest.fn(async (id: string) => id === 'source-1' ? {
      id: 'source-1', name: 'ECI', publisher: 'ECI', sourceType: 'eci_notification',
      canonicalUrl: 'https://eci.gov.in/source.pdf', geographicScope: 'IN', subjectScope: 'delimitation',
      authorityClassification: 'statutory', retrievalMethod: 'http_get', isActive: true,
      consecutiveFailures: 0, metadata: {}, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    } : null),
    listSources: jest.fn(async () => []),
  };

  beforeEach(() => jest.clearAllMocks());

  test('rejects missing source identity, validates URL safety, and persists defaulted source metadata', async () => {
    const registry = new SourceRegistry(repo as any);
    await expect(registry.registerSource({} as any)).rejects.toThrow(/VALIDATION_ERROR/);
    expect(() => validateSourceUrl('file:///etc/passwd')).toThrow(/Forbidden URL protocol/);
    expect(() => validateSourceUrl('https://user:pass@example.com')).toThrow(/userinfo/);
    expect(() => validateSourceUrl('https://localhost')).toThrow(/Local and loopback/);
    expect(() => validateSourceUrl('https://127.0.0.1')).toThrow(/prohibited range|Address/);
    expect(parseAlternateIpv4('2130706433')).toBe('127.0.0.1');
    expect(parseAlternateIpv4('0x7f000001')).toBe('127.0.0.1');
    expect(parseAlternateIpv4('not-an-ip')).toBeNull();

    const source = await registry.registerSource({
      id: 'source-1', name: 'ECI', publisher: 'ECI', sourceType: 'eci_notification',
      canonicalUrl: 'not-an-http-url', geographicScope: 'IN', subjectScope: 'delimitation',
      retrievalMethod: 'manual_upload',
    } as any);
    expect(source.authorityClassification).toBe('statutory');
    expect(source.isActive).toBe(true);
    expect(source.metadata).toEqual({});
    expect(repo.saveSource).toHaveBeenCalledTimes(1);
  });

  test('covers source read/list and activation lifecycle including missing records', async () => {
    const registry = new SourceRegistry(repo as any);
    expect((await registry.getSource('source-1'))?.id).toBe('source-1');
    expect(await registry.getSource('missing')).toBeNull();
    expect(await registry.listSources()).toEqual([]);
    await registry.setSourceActive('source-1', false);
    expect(repo.saveSource).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    await expect(registry.setSourceActive('missing', true)).rejects.toThrow(/NOT_FOUND/);
  });
});

describe('delimitation-watch version acceptance and publication gates', () => {
  const candidate: any = {
    id: 'candidate-1',
    sourceId: 'source-1',
    parserVersion: 'parser-1',
    normalizedDataStatus: 'ESTIMATE',
    isProposed: false,
    proposalData: { stateCode: 'TS', effectiveDate: '2026-01-01', instrumentType: 'notification', instrumentIdentifier: 'TEST-1', legalEnactmentStatus: 'UNVERIFIED' },
    metadata: { sourceType: 'eci_notification' },
  };
  const snapshot: any = { id: 'snapshot-1', contentSha256: 'a'.repeat(64), declaredEffectiveDate: '2026-01-01' };
  const validation: any = { id: 'validation-1', validationStatus: 'PASSED', errors: [] };
  const comparison: any = { id: 'comparison-1', isMaterialChange: true, comparisonSummary: 'changed' };

  test('blocks rejected/unqualified official candidates, returns idempotent version, and creates a new version', async () => {
    const repo: any = {
      getAcceptedVersionByHash: jest.fn().mockResolvedValue(null),
      saveAcceptedVersion: jest.fn().mockResolvedValue(undefined),
    };
    const versioner = new Versioner(repo);
    await expect(versioner.acceptVersion(candidate, snapshot, { ...validation, validationStatus: 'REJECTED' }, comparison))
      .rejects.toThrow(/was REJECTED/);
    await expect(versioner.acceptVersion({
      ...candidate, normalizedDataStatus: 'OFFICIAL', isProposed: true,
    }, snapshot, validation, comparison)).rejects.toThrow(/legal evidence gate/);

    const created = await versioner.acceptVersion(candidate, snapshot, validation, comparison, null, 'reviewer');
    expect(created.created).toBe(true);
    expect(created.version.versionTag).toMatch(/^v1\.0\.0-TS-/);
    expect(created.version.acceptedBy).toBe('reviewer');
    expect(repo.saveAcceptedVersion).toHaveBeenCalledTimes(1);

    repo.getAcceptedVersionByHash.mockResolvedValue(created.version);
    const duplicate = await versioner.acceptVersion(candidate, snapshot, validation, comparison);
    expect(duplicate.created).toBe(false);
    expect(duplicate.version.id).toBe(created.version.id);
    expect(repo.saveAcceptedVersion).toHaveBeenCalledTimes(1);
  });

  test('increments a parseable baseline sequence and falls back for malformed baseline tags', async () => {
    const repo: any = {
      getAcceptedVersionByHash: jest.fn().mockResolvedValue(null),
      saveAcceptedVersion: jest.fn().mockResolvedValue(undefined),
    };
    const versioner = new Versioner(repo);
    const v3 = await versioner.acceptVersion(candidate, snapshot, validation, comparison, {
      id: 'old', versionTag: 'v2.4.0-TS-20250101-deadbeef',
    } as any);
    expect(v3.version.versionTag).toMatch(/^v3\.0\.0-TS-/);
    const fallback = await versioner.acceptVersion(candidate, { ...snapshot, contentSha256: 'b'.repeat(64) }, validation, comparison, {
      id: 'old2', versionTag: 'invalid-tag',
    } as any);
    expect(fallback.version.versionTag).toMatch(/^v1\.0\.0-TS-/);
  });

  test('publication blocks unsafe states and classifies official, proposal, scenario and unverified records', async () => {
    const repo: any = {
      getPublicationByVersionId: jest.fn().mockResolvedValue(null),
      savePublication: jest.fn(async (publication: any) => publication),
    };
    const publisher = new Publisher(repo);
    const version: any = { id: 'version-1', dataStatus: 'ESTIMATE', contentSha256: 'a'.repeat(64) };
    await expect(publisher.publish(version, candidate, { ...validation, validationStatus: 'REJECTED' }))
      .rejects.toThrow(/PUBLICATION_GATE_FAILED/);
    await expect(publisher.publish(version, candidate, { ...validation, validationStatus: 'REVIEW_REQUIRED' }))
      .rejects.toThrow(/PUBLICATION_GATE_FAILED/);

    const estimate = await publisher.publish(version, candidate, validation);
    expect(estimate.created).toBe(true);
    expect(estimate.publication.publicationType).toBe('UNVERIFIED_NOTICE');

    const proposal = await publisher.publish(version, { ...candidate, isProposed: true }, validation);
    expect(proposal.publication.publicationType).toBe('PROPOSAL');

    const scenario = await publisher.publish({ ...version, id: 'version-2', dataStatus: 'SCENARIO' }, candidate, validation);
    expect(scenario.publication.publicationType).toBe('SCENARIO_ESTIMATE');

    await expect(publisher.publish({ ...version, dataStatus: 'OFFICIAL' }, { ...candidate, isProposed: true }, validation))
      .rejects.toThrow(/CANONICAL_MUTATION_RESTRICTED/);

    repo.getPublicationByVersionId.mockResolvedValue(estimate.publication);
    const duplicate = await publisher.publish(version, candidate, validation);
    expect(duplicate.created).toBe(false);
    expect(duplicate.publication.id).toBe(estimate.publication.id);
  });
});


describe('webhook queue state machine branch coverage', () => {
  const params: any = {
    tenantId: TENANT,
    applicationId: 'app-a',
    eventType: 'test.ping',
    idempotencyKey: 'idem-1',
    payload: { ok: true },
    payloadRaw: '{"ok":true}',
    payloadSha256: 'a'.repeat(64),
  };

  const subscription = (overrides: any = {}) => ({
    id: 'sub-1', tenantId: TENANT, applicationId: 'app-a',
    endpointUrl: 'https://example.com/hook', secretHint: '12345678', secretHash: 'b'.repeat(64),
    subscribedEvents: ['test.ping'], status: 'active', consecutiveFailureCount: 0,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  });

  const dispatchResult = (overrides: any = {}) => ({
    success: true, httpStatus: 200, executionDurationMs: 12,
    requestHeaders: {}, responseHeaders: {}, responseBodySample: 'ok', ...overrides,
  });

  test('parses supported bytea forms and rejects unsupported values', () => {
    expect(parseBytea(Buffer.from([1, 2]))).toEqual(Buffer.from([1, 2]));
    expect(parseBytea(new Uint8Array([1, 2]))).toEqual(Buffer.from([1, 2]));
    expect(parseBytea('0x0102')).toEqual(Buffer.from([1, 2]));
    expect(parseBytea('\\x0102')).toEqual(Buffer.from([1, 2]));
    expect(parseBytea('0102')).toEqual(Buffer.from([1, 2]));
    expect(() => parseBytea(42)).toThrow(/INVALID_BYTEA/);
    expect(calculateBackoffDelaySeconds(1)).toBe(30);
    expect(calculateBackoffDelaySeconds(0)).toBe(30);
    expect(calculateBackoffDelaySeconds(99)).toBe(7200);
    expect(calculateNextRetryAt(5)).toBeNull();
    expect(calculateNextRetryAt(1, new Date(0))?.getTime()).toBe(30000);
  });

  test('fans out only to matching active subscriptions and deduplicates within tenant/application scope', async () => {
    const queue = new InMemoryQueueProvider();
    queue.subscriptions.set('sub-1', subscription());
    queue.subscriptions.set('sub-wildcard', subscription({
      id: 'sub-wildcard', subscribedEvents: ['*'],
    }));
    queue.subscriptions.set('sub-other-app', subscription({ id: 'sub-other-app', applicationId: 'app-b' }));
    queue.subscriptions.set('sub-paused', subscription({ id: 'sub-paused', status: 'paused' }));
    queue.subscriptions.set('sub-other-event', subscription({ id: 'sub-other-event', subscribedEvents: ['candidate.nomination.updated'] }));

    const first = await queue.enqueueEvent(params);
    expect(first.deduplicated).toBe(false);
    expect(first.enqueuedDeliveries).toBe(2);
    const duplicate = await queue.enqueueEvent(params);
    expect(duplicate.deduplicated).toBe(true);
    expect(duplicate.eventId).toBe(first.eventId);
    expect(duplicate.enqueuedDeliveries).toBe(2);

    const secondApp = await queue.enqueueEvent({ ...params, applicationId: 'app-b' });
    expect(secondApp.deduplicated).toBe(false);
    expect(secondApp.enqueuedDeliveries).toBe(1);
  });

  test('claims deliveries, fences stale leases, retries failures and completes successful delivery', async () => {
    const queue = new InMemoryQueueProvider();
    queue.subscriptions.set('sub-1', subscription());
    const enqueued = await queue.enqueueEvent(params);
    expect(await queue.claimBatch(0)).toEqual([]);
    const [job] = await queue.claimBatch(1);
    expect(job.event.id).toBe(enqueued.eventId);
    expect(job.delivery.status).toBe('leased');

    expect(await queue.completeDelivery(job.delivery.id, 'stale-token', dispatchResult())).toEqual({ updated: false });
    const failed = await queue.completeDelivery(job.delivery.id, job.leaseToken, dispatchResult({
      success: false, httpStatus: 503, errorMessage: 'temporary outage',
    }));
    expect(failed).toEqual({ updated: true, terminalStatus: 'retrying' });
    expect(job.delivery.status).toBe('retrying');
    expect(job.delivery.attemptCount).toBe(2);
    expect(job.delivery.nextRetryAt).toBeTruthy();

    job.delivery.status = 'queued';
    const [retryJob] = await queue.claimBatch(1);
    const delivered = await queue.completeDelivery(retryJob.delivery.id, retryJob.leaseToken, dispatchResult());
    expect(delivered.terminalStatus).toBe('delivered');
    expect(retryJob.delivery.status).toBe('delivered');
    expect(queue.subscriptions.get('sub-1')?.consecutiveFailureCount).toBe(0);
    expect(await queue.completeDelivery('missing', 'token', dispatchResult())).toEqual({ updated: false });
  });

  test('dead-letters exhausted deliveries, marks repeated failures, and recovers expired leases', async () => {
    const queue = new InMemoryQueueProvider();
    queue.subscriptions.set('sub-1', subscription({ consecutiveFailureCount: 19 }));
    const { eventId } = await queue.enqueueEvent(params);
    const [job] = await queue.claimBatch(1);
    job.delivery.attemptCount = 5;
    const failed = await queue.completeDelivery(job.delivery.id, job.leaseToken, dispatchResult({
      success: false, httpStatus: 500, errorMessage: 'permanent failure',
    }));
    expect(failed.terminalStatus).toBe('dead_letter');
    expect(job.delivery.status).toBe('dead_letter');
    expect(queue.subscriptions.get('sub-1')?.status).toBe('failed');

    const [recoveryJob] = await queue.claimBatch(1);
    expect(recoveryJob).toBeUndefined();
    const delivery = {
      id: 'expired-delivery', tenantId: TENANT, subscriptionId: 'sub-1', eventId,
      attemptCount: 1, status: 'leased', createdAt: '2000-01-01T00:00:00.000Z',
      leaseToken: 'expired', leasedUntil: new Date(0),
    } as any;
    queue.deliveries.set(delivery.id, delivery);
    expect(await queue.recoverExpiredLeases()).toBe(1);
    expect(delivery.status).toBe('queued');
    expect(delivery.leaseToken).toBeUndefined();
  });

  test('purges old terminal deliveries and old orphan events in bounded batches', async () => {
    const queue = new InMemoryQueueProvider();
    queue.events.set('old-event', {
      id: 'old-event', tenantId: TENANT, applicationId: 'app-a', eventType: 'test.ping',
      payload: {}, payloadRaw: '{}', payloadSha256: 'c'.repeat(64), createdAt: '2000-01-01T00:00:00.000Z',
    } as any);
    queue.deliveries.set('old-delivery', {
      id: 'old-delivery', tenantId: TENANT, subscriptionId: 'sub-1', eventId: 'old-event',
      attemptCount: 1, status: 'delivered', createdAt: '2000-01-01T00:00:00.000Z',
      completedAt: '2000-01-02T00:00:00.000Z',
    } as any);
    const purged = await queue.purgeExpiredData(30, 10);
    expect(purged).toEqual({ purgedDeliveries: 1, purgedEvents: 1 });
    expect(queue.deliveries.has('old-delivery')).toBe(false);
    expect(queue.events.has('old-event')).toBe(false);
  });
});


describe('webhook dispatcher transport branches', () => {
  let server: http.Server;
  let baseUrl = '';
  let mode: 'ok' | 'redirect' | 'large' | 'overflow' | 'failure' = 'ok';

  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      if (mode === 'redirect') {
        res.writeHead(302, { location: '/elsewhere', 'x-array-header': ['a', 'b'] as any });
        res.end();
        return;
      }
      if (mode === 'large') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('x'.repeat(5000));
        return;
      }
      if (mode === 'overflow') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end('x'.repeat(MAX_RESPONSE_STREAM_BYTES + 1024));
        return;
      }
      if (mode === 'failure') {
        res.writeHead(503, { 'content-type': 'text/plain' });
        res.end('unavailable');
        return;
      }
      res.writeHead(204, { 'content-type': 'application/json' });
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const send = (overrides: any = {}) => dispatchWebhook({
    endpointUrl: `${baseUrl}/hook?x=1`,
    secret: 'whsec_test_secret',
    eventId: 'event-1',
    deliveryId: 'delivery-1',
    payloadRaw: '{"ok":true}',
    allowLocalhostInTest: true,
    ...overrides,
  });

  test('rejects oversized payload before attempting egress and returns payload integrity headers', async () => {
    const result = await send({ payloadRaw: 'x'.repeat(MAX_WEBHOOK_PAYLOAD_BYTES + 1) });
    expect(result.success).toBe(false);
    expect(result.httpStatus).toBeNull();
    expect(result.errorMessage).toMatch(/PAYLOAD_SIZE_LIMIT_EXCEEDED/);
    expect(result.requestHeaders).toEqual({});
  });

  test('returns SSRF validation errors without opening a request', async () => {
    const result = await dispatchWebhook({
      endpointUrl: 'http://127.0.0.1:8080/hook', secret: 'secret',
      eventId: 'event-2', deliveryId: 'delivery-2', payloadRaw: '{}',
      allowLocalhostInTest: false,
    });
    expect(result.success).toBe(false);
    expect(result.httpStatus).toBeNull();
    expect(result.errorMessage).toMatch(/HTTPS_REQUIRED|blocked/i);
    expect(result.requestHeaders['X-PanIN-Payload-SHA256']).toHaveLength(64);
  });

  test('transmits canonical bytes, computes hash, signs with previous secret, and handles success', async () => {
    mode = 'ok';
    const result = await send({ previousSecret: 'whsec_previous' });
    expect(result.success).toBe(true);
    expect(result.httpStatus).toBe(204);
    expect(result.requestHeaders['X-PanIN-Signature']).toContain(',v1=');
    expect(result.requestHeaders['X-PanIN-Payload-SHA256']).toHaveLength(64);
    expect(result.requestHeaders['Content-Length']).toBe(String(Buffer.byteLength('{"ok":true}')));
  });

  test('rejects redirects and normalizes response headers', async () => {
    mode = 'redirect';
    const result = await send();
    expect(result.success).toBe(false);
    expect(result.httpStatus).toBe(302);
    expect(result.errorMessage).toMatch(/REDIRECTS_FORBIDDEN/);
    expect(result.responseHeaders.location).toBe('/elsewhere');
    expect(result.responseHeaders['x-array-header']).toBe('a, b');
  });

  test('bounds response samples and reports non-2xx statuses', async () => {
    mode = 'large';
    const large = await send();
    expect(large.success).toBe(true);
    expect(large.responseBodySample).toHaveLength(MAX_RESPONSE_SAMPLE_BYTES);

    mode = 'failure';
    const failed = await send();
    expect(failed.success).toBe(false);
    expect(failed.httpStatus).toBe(503);
    expect(failed.errorMessage).toBe('HTTP_STATUS_503');
    expect(failed.responseBodySample).toBe('unavailable');
  });

  test('aborts responses exceeding stream cap and handles refused connections', async () => {
    mode = 'overflow';
    const overflow = await send();
    expect(overflow.success).toBe(false);
    expect(overflow.errorMessage).toMatch(/RESPONSE_STREAM_OVERFLOW/);

    const address = server.address() as { port: number };
    const refused = await dispatchWebhook({
      endpointUrl: `http://127.0.0.1:${address.port + 1}/hook`,
      secret: 'secret', eventId: 'event-3', deliveryId: 'delivery-3', payloadRaw: '{}',
      allowLocalhostInTest: true,
    });
    expect(refused.success).toBe(false);
    expect(refused.errorMessage).toBeTruthy();
  });
});


describe('delimitation-watch pinned source validation branches', () => {
  test('normalizes alternate IPv4 forms and blocks private aliases before egress', () => {
    expect(parseAlternateIpv4('127.1')).toBe('127.0.0.1');
    expect(parseAlternateIpv4('0177.0.0.1')).toBe('127.0.0.1');
    expect(parseAlternateIpv4('0x7f.0.0.1')).toBe('127.0.0.1');
    expect(parseAlternateIpv4('[::1]')).toBeNull();
    expect(() => validateSourceUrl('https://0x7f000001')).toThrow(/SSRF Blocked/);
    expect(() => validateSourceUrl('https://host.internal')).toThrow(/Local and loopback/);
  });

  test('validates all DNS answers and returns a socket-pinned public destination', async () => {
    await expect(validateAndPinSourceUrl('https://example.com', {
      mockDnsResolver: async () => ['93.184.216.34', '10.0.0.1'],
    })).rejects.toThrow(/SSRF Blocked|prohibited/);

    const result = await validateAndPinSourceUrl('https://example.com/path?q=1', {
      mockDnsResolver: async () => ['93.184.216.34', '1.1.1.1'],
    });
    expect(result.hostname).toBe('example.com');
    expect(result.pinnedIp).toBe('93.184.216.34');
    expect(result.resolvedIps).toEqual(['93.184.216.34', '1.1.1.1']);
    expect(result.isHttps).toBe(true);
    expect(result.agent).toBeDefined();

    await expect(validateAndPinSourceUrl('ftp://example.com')).rejects.toThrow(/Forbidden URL protocol/);
    await expect(validateAndPinSourceUrl('https://u:p@example.com')).rejects.toThrow(/userinfo/);
    await expect(validateAndPinSourceUrl('https://example.com:70000')).rejects.toThrow();
    await expect(validateAndPinSourceUrl('https://example.com', {
      mockDnsResolver: async () => [],
    })).rejects.toThrow(/DNS|zero|resolution/i);
  });
});

describe('delimitation baseline comparator branches', () => {
  const makeCandidate = (overrides: any = {}) => ({
    id: 'candidate-current',
    proposalData: {
      proposedSeats: 10, proposedScSeats: 2, proposedStSeats: 1, status: 'PROPOSED',
      stateCode: 'TS',
    },
    constituencyMappings: [
      { newAcNo: 1, oldAcNo: 11, newName: 'Alpha', overlapPercentage: 90 },
      { newAcNo: 2, oldAcNo: 12, newName: 'Beta', overlapPercentage: 80 },
    ],
    ...overrides,
  });

  test('creates initial baseline with proposal and all mappings as additions', async () => {
    const repo: any = { saveComparison: jest.fn(async (value: any) => value) };
    const comparison = await new BaselineComparator(repo).compare(makeCandidate() as any, null);
    expect(comparison.classification).toBe('MATERIAL_CHANGE');
    expect(comparison.addedRecords).toHaveLength(3);
    expect(comparison.removedRecords).toHaveLength(0);
    expect(repo.saveComparison).toHaveBeenCalledWith(comparison);
  });

  test('classifies unchanged records and records added, removed, seat, reservation and status changes', async () => {
    const previous = makeCandidate({
      id: 'candidate-previous',
      proposalData: {
        proposedSeats: 9, proposedScSeats: 1, proposedStSeats: 1, status: 'DRAFT',
        stateCode: 'TS',
      },
      constituencyMappings: [
        { newAcNo: 1, oldAcNo: 11, newName: 'Alpha', overlapPercentage: 90 },
        { newAcNo: 3, oldAcNo: 13, newName: 'Gamma', overlapPercentage: 70 },
      ],
    });
    const repo: any = {
      getCandidate: jest.fn(async () => previous),
      saveComparison: jest.fn(async (value: any) => value),
    };
    const changed = makeCandidate({
      proposalData: {
        proposedSeats: 10, proposedScSeats: 2, proposedStSeats: 3, status: 'ENACTED',
        stateCode: 'TS',
      },
      constituencyMappings: [
        { newAcNo: 1, oldAcNo: 11, newName: 'Alpha', overlapPercentage: 90 },
        { newAcNo: 2, oldAcNo: 12, newName: 'Beta', overlapPercentage: 80 },
      ],
    });
    const result = await new BaselineComparator(repo).compare(changed as any, {
      id: 'baseline-1', candidateId: 'candidate-previous',
    } as any);
    expect(result.classification).toBe('MATERIAL_CHANGE');
    expect(result.changedRecords.map((record: any) => record.key)).toEqual(
      expect.arrayContaining(['proposedSeats', 'reservationSeats', 'proposalStatus']),
    );
    expect(result.addedRecords.some((record: any) => record.key === 'mapping:2')).toBe(true);
    expect(result.removedRecords.some((record: any) => record.key === 'mapping:3')).toBe(true);
    expect(result.unchangedRecords.some((record: any) => record.key === 'mapping:1')).toBe(true);
  });

  test('handles missing previous candidate and reports no-change comparison when records match', async () => {
    const repo: any = {
      getCandidate: jest.fn(async () => makeCandidate({ id: 'candidate-previous' })),
      saveComparison: jest.fn(async (value: any) => value),
    };
    const candidate = makeCandidate();
    const result = await new BaselineComparator(repo).compare(candidate as any, {
      id: 'baseline-2', candidateId: 'missing',
    } as any);
    expect(result.classification).toBe('NO_CHANGE');
    expect(result.comparisonSummary).toContain('Zero substantive or material changes');
  });
});
