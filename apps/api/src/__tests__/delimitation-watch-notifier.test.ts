import { Notifier } from '../modules/delimitationWatch/notifier';
import { InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch/persistence';
import type { DelimitationAcceptedVersion, DelimitationCandidate, DelimitationComparison } from '@kshetra/shared';

const version = (overrides: Record<string, unknown> = {}) => ({
  id: 'version-1',
  sourceId: 'source-1',
  versionTag: 'v1',
  snapshotId: 'snapshot-1',
  candidateId: 'candidate-1',
  validationId: 'validation-1',
  comparisonId: 'comparison-1',
  contentSha256: 'abcdef1234567890abcdef1234567890',
  parserVersion: 'v1.0.0',
  dataStatus: 'UNVERIFIED',
  acceptedAt: '2026-01-01T00:00:00.000Z',
  acceptedBy: 'reviewer-1',
  metadata: {},
  ...overrides,
}) as unknown as DelimitationAcceptedVersion;

const candidate = (overrides: Record<string, unknown> = {}) => ({
  id: 'candidate-1',
  sourceId: 'source-1',
  snapshotId: 'snapshot-1',
  parserVersion: 'v1.0.0',
  proposalData: {
    stateCode: 'TG',
    title: 'Telangana proposal',
    proposedSeats: 119,
    instrumentIdentifier: 'S.O. 382(E)',
  },
  constituencyMappings: [
    { stateCode: 'TG', newAcNo: 1 },
    { stateCode: 'TG', newAcNo: 2 },
    { stateCode: 'TG', newAcNo: 1 },
  ],
  normalizedDataStatus: 'UNVERIFIED',
  isProposed: true,
  ...overrides,
}) as unknown as DelimitationCandidate;

const comparison = (overrides: Record<string, unknown> = {}) => ({
  id: 'comparison-1',
  candidateId: 'candidate-1',
  isMaterialChange: true,
  classification: 'MATERIAL_CHANGE',
  addedRecords: [],
  removedRecords: [],
  changedRecords: [],
  unchangedRecords: [],
  metadataDiff: {},
  comparisonSummary: 'Two constituency mappings changed',
  comparedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
}) as unknown as DelimitationComparison;

describe('Delimitation Watch Notifier', () => {
  let repo: InMemoryDelimitationWatchRepository;

  beforeEach(() => { repo = new InMemoryDelimitationWatchRepository(); });

  it.each([
    ['official', { dataStatus: 'OFFICIAL' }, { isProposed: false }, 'OFFICIAL_ENACTMENT', 'Official Delimitation Order Enacted'],
    ['proposal', { dataStatus: 'UNVERIFIED' }, { isProposed: true }, 'PROPOSAL_NOTICE', 'Draft Consultation'],
    ['scenario', { dataStatus: 'SCENARIO' }, { isProposed: false }, 'SCENARIO_UPDATE', 'Mathematical Model'],
    ['correction', { dataStatus: 'UNVERIFIED' }, { isProposed: false }, 'SOURCE_CORRECTION', 'Pending Verification'],
  ] as any[])('creates the correct event category for %s data', async (_name, versionPatch, candidatePatch, category, titleText) => {
    const notifier = new Notifier(repo);
    const result = await notifier.createNotificationEvent(
      version(versionPatch), candidate(candidatePatch), comparison(),
    );
    expect(result.created).toBe(true);
    expect(result.event.eventCategory).toBe(category);
    expect(result.event.title).toContain(titleText);
    expect(result.event.affectedGeographyIds).toEqual(['TG-AC-1', 'TG-AC-2']);
    expect(result.event.body).toBe('Two constituency mappings changed');
    expect(result.event.dispatchStatus).toBe('PENDING');
  });

  it('deduplicates events using version ID and stable content hash prefix', async () => {
    const notifier = new Notifier(repo);
    const first = await notifier.createNotificationEvent(version(), candidate(), comparison());
    const second = await notifier.createNotificationEvent(version(), candidate(), comparison());
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.event.id).toBe(first.event.id);
    expect(second.event.deduplicationKey).toBe('delim-notif-version-1-abcdef123456');
  });

  it('uses fallback body when comparison summary is absent', async () => {
    const notifier = new Notifier(repo);
    const result = await notifier.createNotificationEvent(version({ versionTag: 'v2' }), candidate(), comparison({ comparisonSummary: '' }));
    expect(result.event.body).toContain('version v2 accepted with 119 seats');
  });

  it('simulates dispatch without a provider and skips already-sent events unless forced', async () => {
    const notifier = new Notifier(repo);
    const { event } = await notifier.createNotificationEvent(version(), candidate(), comparison());
    const sent = await notifier.dispatchEvent(event.id);
    expect(sent.dispatchStatus).toBe('SENT');
    expect(sent.deliveredCount).toBe(1);
    const unchanged = await notifier.dispatchEvent(event.id);
    expect(unchanged.id).toBe(event.id);
    expect(unchanged.deliveredCount).toBe(1);
    const retried = await notifier.dispatchEvent(event.id, { forceRetry: true });
    expect(retried.dispatchStatus).toBe('SENT');
  });

  it('throws for an unknown notification event', async () => {
    await expect(new Notifier(repo).dispatchEvent('missing-event')).rejects.toThrow('NOT_FOUND');
  });

  it('dispatches push and webhook, recording delivered and failed counts', async () => {
    const provider = {
      sendPush: jest.fn(async () => ({ recipientCount: 8, deliveredCount: 8, failedCount: 0 })),
      sendWebhook: jest.fn(async () => ({ dispatched: true })),
    };
    const notifier = new Notifier(repo, provider);
    const { event } = await notifier.createNotificationEvent(version(), candidate(), comparison());
    const sent = await notifier.dispatchEvent(event.id);
    expect(provider.sendPush).toHaveBeenCalledWith(expect.objectContaining({ stateCode: 'TG' }));
    expect(provider.sendWebhook).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'delimitation.source_change_detected',
    }));
    expect(sent.dispatchStatus).toBe('SENT');
    expect(sent.deliveredCount).toBe(8);
    expect(sent.failedCount).toBe(0);
  });

  it('marks all-failed push dispatches FAILED', async () => {
    const notifier = new Notifier(repo, {
      sendPush: async () => ({ recipientCount: 4, deliveredCount: 0, failedCount: 4 }),
    });
    const { event } = await notifier.createNotificationEvent(version(), candidate(), comparison());
    const failed = await notifier.dispatchEvent(event.id);
    expect(failed.dispatchStatus).toBe('FAILED');
    expect(failed.failedCount).toBe(4);
  });

  it('records provider exceptions as failed dispatches', async () => {
    const notifier = new Notifier(repo, {
      sendPush: async () => { throw new Error('push provider offline'); },
    });
    const { event } = await notifier.createNotificationEvent(version(), candidate(), comparison());
    const failed = await notifier.dispatchEvent(event.id);
    expect(failed.dispatchStatus).toBe('FAILED');
    expect(failed.errorMessage).toBe('push provider offline');
  });
});
