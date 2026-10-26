import { DelimitationWatchOrchestrator } from '../modules/delimitationWatch/orchestrator';
import { InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch/persistence';
import type { DelimitationSnapshot, DelimitationWatchSource, DelimitationAcceptedVersion } from '@kshetra/shared';
import { CaptureAdapter } from '../modules/delimitationWatch/captureAdapter';

const source = (overrides: Record<string, unknown> = {}) => ({
  id: 'source-1',
  name: 'Test source',
  publisher: 'Test authority',
  sourceType: 'gazette_extraordinary',
  canonicalUrl: 'https://example.test/notice',
  geographicScope: 'IN-TG',
  subjectScope: 'delimitation_order',
  authorityClassification: 'statutory',
  retrievalMethod: 'http_get',
  isActive: true,
  consecutiveFailures: 0,
  metadata: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
}) as unknown as DelimitationWatchSource;

const snapshot = (outcome: string, overrides: Record<string, unknown> = {}) => ({
  id: 'snapshot-1',
  sourceId: 'source-1',
  retrievedAt: '2026-01-01T00:00:00.000Z',
  httpStatus: outcome === 'SUCCESS' ? 200 : null,
  contentType: 'application/json',
  contentSizeBytes: 0,
  contentSha256: 'hash-1',
  rawContent: '{}',
  captureOutcome: outcome,
  diagnostics: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
}) as unknown as DelimitationSnapshot;

const baseline = (overrides: Record<string, unknown> = {}) => ({
  id: 'version-1',
  sourceId: 'source-1',
  versionTag: 'v1.0.0-TG-20260101-hash',
  snapshotId: 'snapshot-old',
  candidateId: 'candidate-old',
  validationId: 'validation-old',
  comparisonId: 'comparison-old',
  contentSha256: 'old-hash',
  parserVersion: 'v1',
  dataStatus: 'UNVERIFIED',
  acceptedAt: '2026-01-01T00:00:00.000Z',
  acceptedBy: 'test',
  metadata: {},
  ...overrides,
}) as unknown as DelimitationAcceptedVersion;

describe('Delimitation Watch orchestrator early exits and failure semantics', () => {
  let repo: InMemoryDelimitationWatchRepository;
  let orchestrator: DelimitationWatchOrchestrator;

  beforeEach(async () => {
    repo = new InMemoryDelimitationWatchRepository();
    orchestrator = new DelimitationWatchOrchestrator(repo);
    jest.restoreAllMocks();
  });

  it('rejects an unknown source and releases its lock', async () => {
    await expect(orchestrator.runPipeline('missing-source')).rejects.toThrow('SOURCE_NOT_FOUND');
    expect(await repo.listRunsForSource('missing-source')).toHaveLength(0);
  });

  it('rejects inactive sources without attempting capture', async () => {
    await repo.saveSource(source({ isActive: false }));
    const capture = jest.spyOn(CaptureAdapter.prototype, 'capture');
    const result = await orchestrator.runPipeline('source-1');
    expect(result.outcome).toBe('FAILED');
    expect(result.errorMessage).toContain('SOURCE_INACTIVE');
    expect(capture).not.toHaveBeenCalled();
  });

  it('fails immediately when a source lock is already held', async () => {
    await repo.saveSource(source());
    jest.spyOn(repo, 'acquireSourceLock').mockResolvedValueOnce(false);
    await expect(orchestrator.runPipeline('source-1')).rejects.toThrow('CONCURRENT_RUN_CONFLICT');
    expect(repo.releaseSourceLock).not.toHaveBeenCalled();
  });

  it.each([
    ['TIMEOUT', 'RETRY_PENDING'],
    ['FETCH_ERROR', 'FAILED'],
    ['NOT_FOUND', 'FAILED'],
  ])('persists capture outcome %s without normalizing or accepting a version', async (captureOutcome, expectedOutcome) => {
    await repo.saveSource(source());
    jest.spyOn(CaptureAdapter.prototype, 'capture').mockResolvedValueOnce(snapshot(captureOutcome));
    const result = await orchestrator.runPipeline('source-1');
    expect(result.outcome).toBe(expectedOutcome);
    expect(result.errorMessage).toContain(captureOutcome);
    expect(result.candidate).toBeUndefined();
    expect(result.acceptedVersion).toBeUndefined();
    expect((await repo.listRunsForSource('source-1'))[0].outcome).toBe(expectedOutcome);
  });

  it('short-circuits unchanged capture when an accepted baseline already exists', async () => {
    await repo.saveSource(source());
    await repo.saveAcceptedVersion(baseline());
    jest.spyOn(CaptureAdapter.prototype, 'capture').mockResolvedValueOnce(snapshot('UNCHANGED'));
    const result = await orchestrator.runPipeline('source-1');
    expect(result.outcome).toBe('NO_CHANGE');
    expect(result.acceptedVersion?.id).toBe('version-1');
    expect(result.candidate).toBeUndefined();
    expect((await repo.listRunsForSource('source-1'))[0].outcome).toBe('NO_CHANGE');
  });

  it('replays a saved snapshot without requiring a fresh network capture', async () => {
    await repo.saveSource(source());
    await repo.saveSnapshot(snapshot('FETCH_ERROR'));
    await expect(orchestrator.replaySnapshot('missing-snapshot')).rejects.toThrow('SNAPSHOT_NOT_FOUND');
    jest.spyOn(CaptureAdapter.prototype, 'capture').mockImplementation(async () => {
      throw new Error('Replay must not fetch live URL');
    });
    const result = await orchestrator.replaySnapshot('snapshot-1');
    expect(result.outcome).toBe('FAILED');
    expect(result.errorMessage).toContain('FETCH_ERROR');
    expect(CaptureAdapter.prototype.capture).not.toHaveBeenCalled();
  });

  it('records and releases the source lock after unexpected capture exceptions', async () => {
    await repo.saveSource(source());
    jest.spyOn(CaptureAdapter.prototype, 'capture').mockRejectedValueOnce(new Error('socket exploded'));
    const result = await orchestrator.runPipeline('source-1');
    expect(result.outcome).toBe('FAILED');
    expect(result.errorMessage).toBe('socket exploded');
    expect(await repo.listRunsForSource('source-1')).toHaveLength(1);
    expect(await repo.acquireSourceLock('source-1', 'another-runner', 1000)).toBe(true);
  });
});
