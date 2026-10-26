import { SourceRegistry } from '../modules/delimitationWatch/sourceRegistry';
import { BaselineComparator } from '../modules/delimitationWatch/comparator';

describe('Delimitation Watch source registry', () => {
  const repository = {
    saveSource: jest.fn(async (_source: any) => undefined),
    getSource: jest.fn(async (_id: string) => null as any),
    listSources: jest.fn(async () => [] as any[]),
  };

  beforeEach(() => jest.clearAllMocks());

  it('validates required fields and rejects invalid HTTP source URLs', async () => {
    const registry = new SourceRegistry(repository as any);
    await expect(registry.registerSource({ id: '', name: 'n', publisher: 'p', canonicalUrl: 'https://example.test' } as any))
      .rejects.toThrow('VALIDATION_ERROR');
    await expect(registry.registerSource({
      id: 's1', name: 'n', publisher: 'p', canonicalUrl: 'http://127.0.0.1/private',
      sourceType: 'gazette', geographicScope: 'IN', subjectScope: 'boundaries', retrievalMethod: 'http_get',
    } as any)).rejects.toThrow();
    expect(repository.saveSource).not.toHaveBeenCalled();
  });

  it('registers a source with deterministic safe defaults and delegates reads', async () => {
    const registry = new SourceRegistry(repository as any);
    const source = await registry.registerSource({
      id: 's1', name: 'Gazette', publisher: 'Government of India', canonicalUrl: 'https://example.gov.in/gazette',
      sourceType: 'gazette', geographicScope: 'IN', subjectScope: 'delimitation',
      retrievalMethod: 'manual_upload', metadata: { sourceId: 'official' },
    } as any);
    expect(source).toMatchObject({
      id: 's1', authorityClassification: 'statutory', retrievalMethod: 'manual_upload',
      isActive: true, consecutiveFailures: 0, metadata: { sourceId: 'official' },
    });
    expect(source.createdAt).toBe(source.updatedAt);
    expect(repository.saveSource).toHaveBeenCalledWith(source);
    await registry.getSource('s1');
    await registry.listSources();
    expect(repository.getSource).toHaveBeenCalledWith('s1');
    expect(repository.listSources).toHaveBeenCalled();
  });

  it('allows explicit active/default authority settings and toggles an existing source', async () => {
    const existing: any = { id: 's1', name: 'Gazette', isActive: true, updatedAt: 'old' };
    repository.getSource.mockResolvedValue(existing);
    const registry = new SourceRegistry(repository as any);
    const result = await registry.registerSource({
      id: 's2', name: 'Fixture', publisher: 'Test', canonicalUrl: './fixture.json',
      sourceType: 'gazette', geographicScope: 'IN', subjectScope: 'test',
      retrievalMethod: 'file_fixture', authorityClassification: 'secondary', isActive: false, metadata: {},
    } as any);
    expect(result).toMatchObject({ authorityClassification: 'secondary', isActive: false });
    await registry.setSourceActive('s1', false);
    expect(repository.saveSource).toHaveBeenLastCalledWith(expect.objectContaining({ id: 's1', isActive: false }));
    await expect(registry.setSourceActive('missing', true)).rejects.toThrow('NOT_FOUND');
  });
});

describe('Delimitation Watch baseline comparator', () => {
  const repository = { getCandidate: jest.fn(), saveComparison: jest.fn(async () => undefined) };
  const proposal = (overrides: Record<string, unknown> = {}) => ({
    proposedSeats: 10, proposedScSeats: 2, proposedStSeats: 1, status: 'SCENARIO', ...overrides,
  });
  const mapping = (newAcNo: number, overrides: Record<string, unknown> = {}) => ({
    newAcNo, newName: `AC ${newAcNo}`, oldAcNo: newAcNo, overlapPercentage: 100, ...overrides,
  });
  const candidate = (id: string, proposalData = proposal(), constituencyMappings = [mapping(1)]) => ({
    id, proposalData, constituencyMappings, sourceId: 'source-1',
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.getCandidate.mockResolvedValue(null);
  });

  it('treats the first candidate as a material initial baseline', async () => {
    const comparator = new BaselineComparator(repository as any);
    const result = await comparator.compare(candidate('candidate-1'));
    expect(result).toMatchObject({ isMaterialChange: true, classification: 'MATERIAL_CHANGE' });
    expect(result.addedRecords.map((record) => record.key)).toEqual(['proposal', 'mapping:1']);
    expect(repository.saveComparison).toHaveBeenCalledWith(result);
  });

  it('detects seat, reservation, legal-status, mapping, addition and removal changes', async () => {
    repository.getCandidate.mockResolvedValue(candidate('old-candidate', proposal(), [
      mapping(1), mapping(2, { newName: 'Old AC 2' }),
    ]));
    const comparator = new BaselineComparator(repository as any);
    const result = await comparator.compare(
      candidate('new-candidate', proposal({ proposedSeats: 12, proposedScSeats: 3, status: 'ENACTED' }), [
        mapping(1, { newName: 'Renamed AC 1', overlapPercentage: 80 }),
        mapping(3, { oldAcNo: 8 }),
      ]),
      { id: 'version-1', candidateId: 'old-candidate' } as any,
    );
    expect(result.classification).toBe('MATERIAL_CHANGE');
    expect(result.changedRecords.map((record) => record.key)).toEqual(expect.arrayContaining([
      'proposedSeats', 'reservationSeats', 'proposalStatus', 'mapping:1',
    ]));
    expect(result.addedRecords.map((record) => record.key)).toContain('mapping:3');
    expect(result.removedRecords.map((record) => record.key)).toContain('mapping:2');
  });

  it('reports no change when the baseline proposal and mappings are identical', async () => {
    repository.getCandidate.mockResolvedValue(candidate('old-candidate'));
    const comparator = new BaselineComparator(repository as any);
    const result = await comparator.compare(candidate('new-candidate'), { id: 'version-1', candidateId: 'old-candidate' } as any);
    expect(result).toMatchObject({ isMaterialChange: false, classification: 'NO_CHANGE' });
    expect(result.unchangedRecords).toHaveLength(1);
    expect(result.comparisonSummary).toContain('Zero substantive or material changes');
  });

  it('handles a missing prior candidate without inventing a prior proposal', async () => {
    const comparator = new BaselineComparator(repository as any);
    const result = await comparator.compare(candidate('new-candidate'), { id: 'version-1', candidateId: 'missing' } as any);
    expect(result.classification).toBe('NO_CHANGE');
    expect(result.changedRecords).toEqual([]);
  });
});
