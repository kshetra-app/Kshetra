import { CandidateValidator } from '../modules/delimitationWatch/validator';
import { InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch/persistence';
import type { DelimitationCandidate, DelimitationWatchSource } from '@kshetra/shared';

const source = (overrides: Record<string, unknown> = {}) => ({
  id: 'source-1',
  name: 'Official source',
  publisher: 'Government of India',
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

const candidate = (overrides: Record<string, unknown> = {}) => ({
  id: 'candidate-1',
  sourceId: 'source-1',
  snapshotId: 'snapshot-1',
  parserVersion: 'v1.0.0',
  normalizedAt: '2026-01-01T00:00:00.000Z',
  proposalData: {
    title: 'Telangana delimitation proposal',
    stateCode: 'TG',
    status: 'draft',
    currentSeats: 119,
    proposedSeats: 119,
    currentScSeats: 19,
    currentStSeats: 12,
    proposedScSeats: 19,
    proposedStSeats: 12,
    publishedAt: '2026-01-01',
  },
  constituencyMappings: [{
    stateCode: 'TG', oldAcNo: 1, newAcNo: 1, oldName: 'Old 1', newName: 'New 1', overlapPercentage: 100,
  }],
  normalizedDataStatus: 'UNVERIFIED',
  isProposed: true,
  hasLegalEvidence: false,
  metadata: {},
  ...overrides,
}) as unknown as DelimitationCandidate;

describe('CandidateValidator data-truth and legal evidence gates', () => {
  let repo: InMemoryDelimitationWatchRepository;
  let validator: CandidateValidator;

  beforeEach(() => {
    repo = new InMemoryDelimitationWatchRepository();
    validator = new CandidateValidator(repo);
  });

  it('accepts a well-formed unverified proposal without upgrading its status', async () => {
    const result = await validator.validate(candidate(), source());
    expect(result.validationStatus).toBe('PASSED');
    expect(result.errors).toEqual([]);
    expect(result.checksRun).toHaveLength(12);
    expect(result.checksRun.every((check) => check.passed)).toBe(true);
    expect(await repo.getValidation(result.id)).toMatchObject({ candidateId: 'candidate-1' });
  });

  it('rejects missing source identity, provenance, schema, and canonical geography', async () => {
    const result = await validator.validate(candidate({
      sourceId: 'different-source',
      snapshotId: '',
      parserVersion: '1.0',
      normalizedAt: '',
      proposalData: { title: ' ', stateCode: 'XX', currentSeats: '119', proposedSeats: null },
      constituencyMappings: [{ stateCode: 'AP', oldAcNo: -1, newAcNo: 501, overlapPercentage: 100 }],
    }), source());
    expect(result.validationStatus).toBe('REJECTED');
    expect(result.errors.join(' ')).toContain('source identity');
    expect(result.errors.join(' ')).toContain('provenance');
    expect(result.errors.join(' ')).toContain('Schema validation failed');
    expect(result.errors.join(' ')).toContain('Invalid canonical geography');
    expect(result.errors.join(' ')).toContain('does not match proposal');
  });

  it('flags duplicate AC mappings as review-required when no hard errors exist', async () => {
    const base = candidate() as any;
    base.constituencyMappings.push({ ...base.constituencyMappings[0], oldAcNo: 2, oldName: 'Old 2' });
    const result = await validator.validate(base, source());
    expect(result.validationStatus).toBe('REVIEW_REQUIRED');
    expect(result.warnings).toContain('Duplicate mapping entry for new AC number 1');
  });

  it.each([
    [{ publishedAt: 'not-a-date' }, 'Invalid publishedAt date string'],
    [{ proposedSeats: 0 }, 'must exceed 0'],
    [{ proposedScSeats: -1 }, 'must exceed 0'],
    [{ proposedScSeats: 100, proposedStSeats: 50 }, 'must exceed 0'],
  ])('rejects temporal or numeric invariant violations %#', async (proposalPatch, expectedError) => {
    const base = candidate() as any;
    base.proposalData = { ...base.proposalData, ...proposalPatch };
    const result = await validator.validate(base, source());
    expect(result.validationStatus).toBe('REJECTED');
    expect(result.errors.join(' ')).toContain(expectedError);
  });

  it('rejects invalid mapping overlap percentages', async () => {
    const base = candidate() as any;
    base.constituencyMappings[0].overlapPercentage = 101;
    const result = await validator.validate(base, source());
    expect(result.errors.join(' ')).toContain('invalid overlap percentage');
  });

  it('does not accept OFFICIAL claims from drafts, non-statutory sources, or fixtures', async () => {
    const base = candidate({
      normalizedDataStatus: 'OFFICIAL',
      isProposed: true,
      legalEvidencePackage: { decisionRecord: { isOfficialEligible: false } },
    });
    const result = await validator.validate(base, source({
      authorityClassification: 'media',
      sourceType: 'synthetic_fixture',
      retrievalMethod: 'file_fixture',
    }));
    expect(result.validationStatus).toBe('REJECTED');
    expect(result.errors.join(' ')).toContain('marked as proposed/draft');
    expect(result.errors.join(' ')).toContain('cannot grant');
    expect(result.errors.join(' ')).toContain('Synthetic test fixture');
    expect(result.errors.join(' ')).toContain('failed legal evidence gate');
  });

  it('requires a known enacted legal instrument for final enacted claims', async () => {
    const base = candidate({
      isProposed: false,
      proposalData: {
        ...((candidate() as any).proposalData),
        status: 'final',
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        instrumentIdentifier: 'UNSPECIFIED_INSTRUMENT',
        effectiveDate: 'not-a-date',
      },
      normalizedDataStatus: 'VERIFIED',
    });
    const result = await validator.validate(base, source());
    expect(result.validationStatus).toBe('REJECTED');
    expect(result.errors.join(' ')).toContain('missing or invalid legal effective date');
    expect(result.errors.join(' ')).toContain('missing statutory legal instrument identifier');
    expect(result.errors.join(' ')).toContain('unverified in Authoritative Legal Corpus');
  });

  it('reconciles authoritative Telangana statutory seats and rejects fabricated seat totals', async () => {
    const base = candidate({
      isProposed: false,
      normalizedDataStatus: 'VERIFIED',
      proposalData: {
        ...((candidate() as any).proposalData),
        status: 'final',
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        instrumentIdentifier: 'Andhra Pradesh Reorganisation Act, 2014 (Section 15 read with Second Schedule)',
        effectiveDate: '2014-06-02',
        proposedSeats: 999,
      },
    });
    const result = await validator.validate(base, source({
      canonicalUrl: 'https://www.indiacode.nic.in/handle/123456789/2103',
    }));
    expect(result.errors.join(' ')).toContain('Seat allocation conflicts with statutory allocation');
  });

  it('checks authoritative instrument status, dates and source provenance for known instruments', async () => {
    const base = candidate({
      isProposed: false,
      normalizedDataStatus: 'VERIFIED',
      proposalData: {
        ...((candidate() as any).proposalData),
        status: 'final',
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        instrumentIdentifier: 'Notification No. 282/AP/2007-III (Order No. 46)',
        effectiveDate: '2099-01-01',
        publishedAt: '2099-01-01',
      },
    });
    const result = await validator.validate(base, source({ canonicalUrl: 'https://wrong.example/source' }));
    expect(result.errors.join(' ')).toContain("not 'ENACTED_COMMENCED'");
    expect(result.errors.join(' ')).toContain('does not match authoritative date');
    expect(result.errors.join(' ')).toContain('does not match official authoritative source URL');
  });

  it('checks boundary-only amendment scope and preserves legal package references for non-final candidates', async () => {
    const boundary = candidate({
      isProposed: false,
      normalizedDataStatus: 'VERIFIED',
      proposalData: {
        ...((candidate() as any).proposalData),
        status: 'final',
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
        effectiveDate: '2018-09-22',
        proposedSeats: 176,
        proposedScSeats: 30,
        proposedStSeats: 8,
      },
      constituencyMappings: [{
        stateCode: 'TG', oldAcNo: 1, newAcNo: 99, oldName: 'Old 1', newName: 'New 99', overlapPercentage: 50,
      }],
    });
    const result = await validator.validate(boundary, source({
      canonicalUrl: 'https://www.eci.gov.in/eci-backend/public/api/download?url=fixture',
    }));
    expect(result.errors.join(' ')).toContain('Boundary-only amendment');
    expect(result.errors.join(' ')).toContain('outside permitted set');

    const packageCandidate = candidate({
      legalEvidencePackage: { instrumentIdentifier: 'test-instrument' },
    });
    const packageResult = await validator.validate(packageCandidate, source());
    expect(packageResult.evidenceReferences).toContain('legal_instrument:test-instrument');
  });

  it('records accepted baseline evidence references', async () => {
    const result = await validator.validate(candidate(), source(), {
      id: 'version-1',
      versionTag: 'v1',
      dataStatus: 'OFFICIAL',
    } as any);
    expect(result.evidenceReferences).toContain('baseline_version:version-1');
    expect(result.checksRun.find((check) => check.checkName === 'CHECK_BASELINE_CONSISTENCY')?.details)
      .toContain('Baseline version v1');
  });
});
