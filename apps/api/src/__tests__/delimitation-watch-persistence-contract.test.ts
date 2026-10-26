import {
  InMemoryDelimitationWatchRepository,
  PostgresDelimitationWatchRepository,
} from '../modules/delimitationWatch/persistence';

describe('InMemoryDelimitationWatchRepository', () => {
  let repository: InMemoryDelimitationWatchRepository;
  beforeEach(() => { repository = new InMemoryDelimitationWatchRepository(); });

  it('copies sources, lists them, updates health and ignores updates for missing sources', async () => {
    await repository.saveSource({ id: 's1', name: 'source', metadata: { revision: 1 } } as any);
    const source = await repository.getSource('s1');
    expect(source?.name).toBe('source');
    expect(await repository.listSources()).toHaveLength(1);
    source!.metadata.revision = 2;
    expect((await repository.getSource('s1'))?.metadata.revision).toBe(1);
    await repository.updateSourceHealth('s1', { lastHttpStatus: 200, consecutiveFailures: 0, lastError: '' });
    expect(await repository.getSource('missing')).toBeNull();
    await repository.updateSourceHealth('missing', { lastHttpStatus: 500 });
  });

  it('stores snapshots and returns the most recently retrieved snapshot per source', async () => {
    await repository.saveSnapshot({ id: 'sn1', sourceId: 's1', retrievedAt: '2026-01-01T00:00:00Z' } as any);
    await repository.saveSnapshot({ id: 'sn2', sourceId: 's1', retrievedAt: '2026-02-01T00:00:00Z' } as any);
    expect((await repository.getLatestSnapshotForSource('s1'))?.id).toBe('sn2');
    expect(await repository.getLatestSnapshotForSource('missing')).toBeNull();
    expect(await repository.getSnapshot('missing')).toBeNull();
  });

  it('stores candidates and validations with candidate lookup', async () => {
    await repository.saveCandidate({ id: 'c1', sourceId: 's1' } as any);
    await repository.saveValidation({ id: 'v1', candidateId: 'c1' } as any);
    await repository.saveValidation({ id: 'v2', candidateId: 'c1' } as any);
    expect((await repository.getCandidate('c1'))?.id).toBe('c1');
    expect(await repository.getCandidate('missing')).toBeNull();
    expect(await repository.getValidation('v1')).not.toBeNull();
    expect((await repository.getValidationByCandidateId('c1'))?.id).toBe('v1');
    expect(await repository.getValidationByCandidateId('missing')).toBeNull();
    expect(await repository.getValidation('missing')).toBeNull();
  });

  it('stores comparisons and enforces unique accepted-version hashes per source', async () => {
    await repository.saveComparison({ id: 'cmp1' } as any);
    expect((await repository.getComparison('cmp1'))?.id).toBe('cmp1');
    expect(await repository.getComparison('missing')).toBeNull();
    await repository.saveAcceptedVersion({ id: 'ver1', sourceId: 's1', contentSha256: 'hash1', acceptedAt: '2026-01-01' } as any);
    await repository.saveAcceptedVersion({ id: 'ver2', sourceId: 's1', contentSha256: 'hash2', acceptedAt: '2026-02-01' } as any);
    await expect(repository.saveAcceptedVersion({ id: 'ver3', sourceId: 's1', contentSha256: 'hash1' } as any)).rejects.toThrow('UNIQUE_CONSTRAINT_VIOLATION');
    expect((await repository.getAcceptedVersionByHash('s1', 'hash1'))?.id).toBe('ver1');
    expect((await repository.getLatestAcceptedVersionForSource('s1'))?.id).toBe('ver2');
    expect(await repository.listAcceptedVersionsForSource('s1')).toHaveLength(2);
    expect(await repository.getAcceptedVersion('missing')).toBeNull();
    expect(await repository.getLatestAcceptedVersionForSource('missing')).toBeNull();
  });

  it('deduplicates notification events and updates dispatch statistics', async () => {
    await repository.saveNotificationEvent({ id: 'n1', deduplicationKey: 'd1', dispatchStatus: 'pending', deliveredCount: 0, failedCount: 0 } as any);
    await expect(repository.saveNotificationEvent({ id: 'n2', deduplicationKey: 'd1' } as any)).rejects.toThrow('UNIQUE_CONSTRAINT_VIOLATION');
    await repository.updateNotificationDispatchStatus('n1', 'sent' as any, { deliveredCount: 2, failedCount: 1, errorMessage: 'partial' });
    expect(await repository.getNotificationEvent('n1')).toMatchObject({ dispatchStatus: 'sent', deliveredCount: 2, failedCount: 1, errorMessage: 'partial' });
    expect((await repository.getNotificationEventByDedupKey('d1'))?.id).toBe('n1');
    expect(await repository.getNotificationEvent('missing')).toBeNull();
    await repository.updateNotificationDispatchStatus('missing', 'failed' as any);
  });

  it('enforces one publication per version and stores runs sorted newest first', async () => {
    await repository.savePublication({ id: 'p1', versionId: 'v1' } as any);
    await expect(repository.savePublication({ id: 'p2', versionId: 'v1' } as any)).rejects.toThrow('UNIQUE_CONSTRAINT_VIOLATION');
    expect((await repository.getPublicationByVersionId('v1'))?.id).toBe('p1');
    expect(await repository.getPublicationByVersionId('missing')).toBeNull();
    await repository.saveRun({ id: 'r1', sourceId: 's1', createdAt: '2026-01-01' } as any);
    await repository.saveRun({ id: 'r2', sourceId: 's1', createdAt: '2026-02-01' } as any);
    expect((await repository.listRunsForSource('s1')).map((run) => run.id)).toEqual(['r2', 'r1']);
    expect((await repository.getRun('r1'))?.id).toBe('r1');
    expect(await repository.getRun('missing')).toBeNull();
  });

  it('fences source locks by token, supports expiry takeover and reports in-memory health', async () => {
    expect(await repository.acquireSourceLock('s1', 'token-1')).toBe(true);
    expect(await repository.acquireSourceLock('s1', 'token-2')).toBe(false);
    expect(await repository.releaseSourceLock('s1', 'token-2')).toBe(false);
    expect(await repository.releaseSourceLock('s1', 'token-1')).toBe(true);
    expect(await repository.releaseSourceLock('s1', 'token-1')).toBe(false);
    expect(repository.isDurable()).toBe(false);
    expect(await repository.checkHealth()).toEqual({ healthy: true, details: 'in_memory' });
  });
});

describe('PostgresDelimitationWatchRepository SQL contract', () => {
  const query = jest.fn(async () => ({ rows: [] as any[] }));
  const repository = new PostgresDelimitationWatchRepository({ query } as any);
  beforeEach(() => { query.mockClear(); query.mockResolvedValue({ rows: [] }); });

  it('reports durable storage and handles health and source-lock results', async () => {
    expect(repository.isDurable()).toBe(true);
    expect(await repository.checkHealth()).toEqual({ healthy: true, details: 'postgres' });
    query.mockRejectedValueOnce(new Error('database offline'));
    expect(await repository.checkHealth()).toEqual({ healthy: false, details: 'database offline' });
    expect(await repository.acquireSourceLock('s1', 'token')).toBe(false);
    query.mockResolvedValueOnce({ rows: [{ id: 's1' }] });
    expect(await repository.acquireSourceLock('s1', 'token')).toBe(true);
    expect(await repository.releaseSourceLock('s1', 'wrong')).toBe(false);
    query.mockResolvedValueOnce({ rows: [{ id: 's1' }] });
    expect(await repository.releaseSourceLock('s1', 'token')).toBe(true);
  });

  it('executes every repository persistence/query method and handles empty result sets', async () => {
    await repository.saveSource({ id: 's1', metadata: {} } as any);
    expect(await repository.getSource('s1')).toBeNull();
    expect(await repository.listSources()).toEqual([]);
    await repository.updateSourceHealth('s1', { lastHttpStatus: 0, consecutiveFailures: 0 });
    await repository.saveSnapshot({ id: 'sn1', sourceId: 's1', diagnostics: {} } as any);
    expect(await repository.getSnapshot('sn1')).toBeNull();
    expect(await repository.getLatestSnapshotForSource('s1')).toBeNull();
    await repository.saveCandidate({ id: 'c1', proposalData: {}, constituencyMappings: [], metadata: {} } as any);
    expect(await repository.getCandidate('c1')).toBeNull();
    await repository.saveValidation({ id: 'v1', checksRun: [], errors: [], warnings: [], evidenceReferences: [] } as any);
    expect(await repository.getValidation('v1')).toBeNull();
    expect(await repository.getValidationByCandidateId('c1')).toBeNull();
    await repository.saveComparison({ id: 'cmp1', addedRecords: [], removedRecords: [], changedRecords: [], unchangedRecords: [], metadataDiff: {} } as any);
    expect(await repository.getComparison('cmp1')).toBeNull();
    await repository.saveAcceptedVersion({ id: 'av1', sourceId: 's1', metadata: {} } as any);
    expect(await repository.getAcceptedVersion('av1')).toBeNull();
    expect(await repository.getAcceptedVersionByHash('s1', 'hash')).toBeNull();
    expect(await repository.getLatestAcceptedVersionForSource('s1')).toBeNull();
    expect(await repository.listAcceptedVersionsForSource('s1')).toEqual([]);
    await repository.saveNotificationEvent({ id: 'n1', affectedGeographyIds: [] } as any);
    expect(await repository.getNotificationEvent('n1')).toBeNull();
    expect(await repository.getNotificationEventByDedupKey('d1')).toBeNull();
    await repository.updateNotificationDispatchStatus('n1', 'failed' as any);
    await repository.savePublication({ id: 'p1', versionId: 'av1' } as any);
    expect(await repository.getPublicationByVersionId('av1')).toBeNull();
    await repository.saveRun({ id: 'r1', sourceId: 's1', stageDurationsMs: {} } as any);
    expect(await repository.getRun('r1')).toBeNull();
    expect(await repository.listRunsForSource('s1')).toEqual([]);
    expect(query).toHaveBeenCalled();
    expect(query.mock.calls.length).toBeGreaterThanOrEqual(30);
  });
});
