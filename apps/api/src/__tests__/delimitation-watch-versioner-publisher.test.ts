import { Versioner } from '../modules/delimitationWatch/versioner';
import { Publisher } from '../modules/delimitationWatch/publisher';
import { InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch/persistence';
import type { DelimitationAcceptedVersion, DelimitationCandidate, DelimitationSnapshot, DelimitationValidation, DelimitationComparison } from '@kshetra/shared';

const candidate = (overrides: Record<string, unknown> = {}) => ({
  id: 'candidate-1',
  sourceId: 'source-1',
  snapshotId: 'snapshot-1',
  parserVersion: 'parser-v1',
  proposalData: {
    stateCode: 'TG',
    status: 'draft',
    proposedSeats: 119,
    effectiveDate: '2026-01-01',
  },
  normalizedDataStatus: 'UNVERIFIED',
  isProposed: true,
  metadata: { sourceType: 'gazette_extraordinary' },
  ...overrides,
}) as unknown as DelimitationCandidate;

const snapshot = (overrides: Record<string, unknown> = {}) => ({
  id: 'snapshot-1',
  sourceId: 'source-1',
  contentSha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  declaredEffectiveDate: '2026-01-02',
  ...overrides,
}) as unknown as DelimitationSnapshot;

const validation = (overrides: Record<string, unknown> = {}) => ({
  id: 'validation-1',
  candidateId: 'candidate-1',
  validationStatus: 'PASSED',
  errors: [],
  warnings: [],
  ...overrides,
}) as unknown as DelimitationValidation;

const comparison = (overrides: Record<string, unknown> = {}) => ({
  id: 'comparison-1',
  candidateId: 'candidate-1',
  isMaterialChange: true,
  classification: 'MATERIAL_CHANGE',
  comparisonSummary: 'Proposal changed',
  ...overrides,
}) as unknown as DelimitationComparison;

const officialCandidate = () => candidate({
  normalizedDataStatus: 'OFFICIAL',
  isProposed: false,
  legalEvidencePackage: { decisionRecord: { isOfficialEligible: true } },
  proposalData: {
    stateCode: 'TG', status: 'final', proposedSeats: 119,
    proposalNumber: 'PROP-1', effectiveDate: '2026-01-01',
    instrumentIdentifier: 'known-act',
  },
});

const acceptedVersion = (overrides: Record<string, unknown> = {}) => ({
  id: 'version-existing',
  sourceId: 'source-1',
  versionTag: 'v2.0.0-TG-20260101-abcdef01',
  snapshotId: 'snapshot-old',
  candidateId: 'candidate-old',
  validationId: 'validation-old',
  comparisonId: 'comparison-old',
  contentSha256: 'prior-content-hash',
  parserVersion: 'parser-v1',
  dataStatus: 'UNVERIFIED',
  acceptedAt: '2026-01-01T00:00:00.000Z',
  acceptedBy: 'reviewer',
  metadata: {},
  ...overrides,
}) as unknown as DelimitationAcceptedVersion;

describe('Delimitation Watch versioning and publication gates', () => {
  let repo: InMemoryDelimitationWatchRepository;
  beforeEach(() => { repo = new InMemoryDelimitationWatchRepository(); });

  it('blocks rejected candidates and OFFICIAL candidates without legal evidence', async () => {
    const versioner = new Versioner(repo);
    await expect(versioner.acceptVersion(candidate(), snapshot(), validation({ validationStatus: 'REJECTED', errors: ['bad'] }), comparison()))
      .rejects.toThrow('VERSION_ACCEPTANCE_BLOCKED');
    await expect(versioner.acceptVersion(candidate({ normalizedDataStatus: 'OFFICIAL', isProposed: false }), snapshot(), validation(), comparison()))
      .rejects.toThrow('cannot be accepted as OFFICIAL');
    expect(await repo.listAcceptedVersionsForSource('source-1')).toHaveLength(0);
  });

  it('creates an immutable version with provenance, lineage and fallback effective date', async () => {
    const versioner = new Versioner(repo);
    const result = await versioner.acceptVersion(
      candidate(), snapshot(), validation(), comparison(), acceptedVersion({ versionTag: 'v4.0.0-TG-old' }), 'reviewer-2',
    );
    expect(result.created).toBe(true);
    expect(result.version.versionTag).toMatch(/^v5\.0\.0-TG-\d{8}-abcdef01$/);
    expect(result.version.previousVersionId).toBe('version-existing');
    expect(result.version.effectiveDate).toBe('2026-01-01');
    expect(result.version.acceptedBy).toBe('reviewer-2');
    expect(result.version.metadata).toMatchObject({ isMaterialChange: true, comparisonSummary: 'Proposal changed' });
    expect(await repo.getAcceptedVersionByHash('source-1', snapshot().contentSha256)).toMatchObject({ id: result.version.id });
  });

  it('uses sequence one when baseline version tag is malformed and snapshot effective date is fallback', async () => {
    const versioner = new Versioner(repo);
    const result = await versioner.acceptVersion(
      candidate({ proposalData: { stateCode: '', status: 'draft' } }),
      snapshot({ declaredEffectiveDate: '2026-04-01' }),
      validation(),
      comparison(),
      acceptedVersion({ versionTag: 'legacy-tag' }),
    );
    expect(result.version.versionTag).toMatch(/^v1\.0\.0-IN-\d{8}-abcdef01$/);
    expect(result.version.effectiveDate).toBe('2026-04-01');
  });

  it('returns the existing version for duplicate source/content hash without creating another', async () => {
    const existing = acceptedVersion({ sourceId: 'source-1', contentSha256: snapshot().contentSha256 });
    await repo.saveAcceptedVersion(existing);
    const result = await new Versioner(repo).acceptVersion(candidate(), snapshot(), validation(), comparison());
    expect(result.created).toBe(false);
    expect(result.version.id).toBe('version-existing');
    expect(await repo.listAcceptedVersionsForSource('source-1')).toHaveLength(1);
  });

  it('publishes proposals as non-canonical public records and is idempotent by version', async () => {
    const publisher = new Publisher(repo);
    const version = acceptedVersion({ id: 'v-proposal', dataStatus: 'UNVERIFIED' });
    const proposal = candidate({ proposalData: { stateCode: 'TG', proposalNumber: 'PROP-1' } });
    const first = await publisher.publish(version, proposal, validation(), 'publisher-1');
    expect(first.created).toBe(true);
    expect(first.publication).toMatchObject({
      versionId: 'v-proposal',
      publicationType: 'PROPOSAL',
      publicationStatus: 'PUBLISHED',
      publishedBy: 'publisher-1',
      canonicalViewUpdated: false,
      publishedProposalId: 'candidate-1',
    });
    const duplicate = await publisher.publish(version, proposal, validation());
    expect(duplicate.created).toBe(false);
    expect(duplicate.publication.id).toBe(first.publication.id);
  });

  it('maps scenario and unverified non-proposals to honest publication types', async () => {
    const publisher = new Publisher(repo);
    const scenario = await publisher.publish(
      acceptedVersion({ id: 'v-scenario', dataStatus: 'SCENARIO' }),
      candidate({ isProposed: false }),
      validation(),
    );
    expect(scenario.publication.publicationType).toBe('SCENARIO_ESTIMATE');
    const notice = await publisher.publish(
      acceptedVersion({ id: 'v-notice', dataStatus: 'UNVERIFIED' }),
      candidate({ id: 'candidate-notice', isProposed: false }),
      validation(),
    );
    expect(notice.publication.publicationType).toBe('UNVERIFIED_NOTICE');
  });

  it('permits canonical mutation only for legal-gated OFFICIAL enacted data', async () => {
    const publisher = new Publisher(repo);
    const version = acceptedVersion({ id: 'v-official', dataStatus: 'OFFICIAL' });
    const result = await publisher.publish(version, officialCandidate(), validation());
    expect(result.publication.publicationType).toBe('ENACTED_OFFICIAL');
    expect(result.publication.canonicalViewUpdated).toBe(true);
    await expect(publisher.publish(version, candidate({ normalizedDataStatus: 'OFFICIAL' }), validation()))
      .rejects.toThrow('CANONICAL_MUTATION_RESTRICTED');
  });

  it('blocks REVIEW_REQUIRED and REJECTED candidates from publication', async () => {
    const publisher = new Publisher(repo);
    await expect(publisher.publish(acceptedVersion(), candidate(), validation({ validationStatus: 'REVIEW_REQUIRED' })))
      .rejects.toThrow('PUBLICATION_GATE_FAILED');
    await expect(publisher.publish(acceptedVersion(), candidate(), validation({ validationStatus: 'REJECTED' })))
      .rejects.toThrow('PUBLICATION_GATE_FAILED');
    expect(await repo.getPublicationByVersionId('version-existing')).toBeNull();
  });
});
