import { Normalizer, CURRENT_PARSER_VERSION } from '../modules/delimitationWatch/normalizer';
import { InMemoryDelimitationWatchRepository } from '../modules/delimitationWatch/persistence';
import type { DelimitationSnapshot, DelimitationWatchSource } from '@kshetra/shared';

const source = (overrides: Record<string, unknown> = {}) => ({
  id: 'source-1',
  name: 'Delimitation Gazette',
  publisher: 'Government of India',
  sourceType: 'gazette_extraordinary',
  canonicalUrl: 'https://www.indiacode.nic.in/handle/123456789/2103',
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

const snapshot = (rawContent: string, overrides: Record<string, unknown> = {}) => ({
  id: 'snapshot-1',
  sourceId: 'source-1',
  retrievedAt: '2026-01-01T00:00:00.000Z',
  httpStatus: 200,
  contentType: 'application/json',
  contentSizeBytes: Buffer.byteLength(rawContent),
  contentSha256: 'snapshot-sha256',
  rawContent,
  captureOutcome: 'SUCCESS',
  diagnostics: {},
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
}) as unknown as DelimitationSnapshot;

const validApraPayload = () => ({
  proposal: {
    stateCode: 'TG',
    title: 'Andhra Pradesh Reorganisation Act delimitation schedule',
    status: 'final',
    currentSeats: 119,
    proposedSeats: 119,
    currentScSeats: 19,
    currentStSeats: 12,
    proposedScSeats: 19,
    proposedStSeats: 12,
    instrumentType: 'REORGANISATION_ACT',
    instrumentIdentifier: 'Andhra Pradesh Reorganisation Act, 2014 (Section 15 read with Second Schedule)',
    legalEnactmentStatus: 'ENACTED_COMMENCED',
    effectiveDate: '2014-06-02',
    publishedAt: '2014-03-01',
    dataStatus: 'OFFICIAL',
  },
  mappings: [
    { old_ac_no: 1, new_ac_no: 1, constituency_name: 'Constituency 1', overlap_percentage: 95 },
  ],
});

describe('Delimitation Watch Normalizer', () => {
  let repo: InMemoryDelimitationWatchRepository;
  let normalizer: Normalizer;

  beforeEach(() => {
    repo = new InMemoryDelimitationWatchRepository();
    normalizer = new Normalizer(repo);
  });

  it('rejects empty and malformed snapshot content before creating a candidate', async () => {
    await expect(normalizer.normalize(snapshot(''), source())).rejects.toThrow('raw content is empty');
    await expect(normalizer.normalize(snapshot('  '), source())).rejects.toThrow('raw content is empty');
    await expect(normalizer.normalize(snapshot('{invalid'), source())).rejects.toThrow('Failed to parse snapshot JSON');
    expect(await repo.getCandidate('candidate-1')).toBeNull();
  });

  it('normalizes snake_case fields and mapping aliases while ignoring a client OFFICIAL label', async () => {
    const raw = {
      state_code: 'tg',
      title: 'Draft notice',
      summary: 'Draft summary',
      status: 'consultation',
      current_seats: '119',
      proposed_seats: '120',
      current_sc_seats: 19,
      current_st_seats: 12,
      proposed_sc_seats: 20,
      proposed_st_seats: 12,
      instrument_type: 'UNKNOWN',
      order_number: 'client-claimed-instrument',
      legal_enactment_status: 'DRAFT',
      dataStatus: 'OFFICIAL',
      mappings: [{
        predecessor_ac_no: 3,
        constituency_number: 4,
        constituency_name: 'Constituency 4',
        overlap_percentage: 70,
        population_transferred: 123,
        voters_transferred: 45,
        notes: 'mapping note',
      }],
    };
    const result = await normalizer.normalize(snapshot(JSON.stringify(raw)), source({ publisher: 'Unknown blog' }));
    expect(result.parserVersion).toBe(CURRENT_PARSER_VERSION);
    expect(result.proposalData).toMatchObject({
      stateCode: 'TG', title: 'Draft notice', description: 'Draft summary', status: 'draft',
      currentSeats: 119, proposedSeats: 120, instrumentIdentifier: 'client-claimed-instrument',
    });
    expect(result.constituencyMappings[0]).toMatchObject({
      oldAcNo: 3, newAcNo: 4, oldName: 'Constituency 4', newName: 'Constituency 4',
      overlapPercentage: 70, populationTransferred: 123, votersTransferred: 45, notes: 'mapping note',
    });
    expect(result.normalizedDataStatus).toBe('UNVERIFIED');
    expect(result.isProposed).toBe(true);
    expect(result.hasLegalEvidence).toBe(false);
    expect(result.legalEvidencePackage.decisionRecord.isOfficialEligible).toBe(false);
    expect(await repo.getCandidate(result.id)).toMatchObject({ sourceId: 'source-1' });
  });

  it('uses source scope and defaults when proposal fields and mappings are omitted', async () => {
    const result = await normalizer.normalize(snapshot(JSON.stringify({ value: 1 })), source({
      name: 'Fallback source', geographicScope: 'IN-AP',
    }));
    expect(result.proposalData).toMatchObject({
      stateCode: 'AP',
      title: 'Fallback source - AP Delimitation',
      currentSeats: 0,
      proposedSeats: 0,
      instrumentType: 'UNKNOWN',
      legalEnactmentStatus: 'UNVERIFIED',
    });
    expect(result.constituencyMappings).toEqual([]);
    expect(result.normalizedDataStatus).toBe('UNVERIFIED');
    expect(result.metadata.rawKeysCount).toBe(1);
  });

  it('uses snapshot-declared publication and effective dates when raw data omits them', async () => {
    const result = await normalizer.normalize(
      snapshot(JSON.stringify({ proposal: { stateCode: 'TG', title: 'Notice' } }), {
        declaredPublicationDate: '2026-02-03',
        declaredEffectiveDate: '2026-03-04',
      }),
      source(),
    );
    expect(result.proposalData.publishedAt).toBe('2026-02-03');
    expect(result.proposalData.effectiveDate).toBe('2026-03-04');
  });

  it('assigns SCENARIO to synthetic calculations and raw scenario payloads', async () => {
    const synthetic = await normalizer.normalize(snapshot(JSON.stringify({ proposal: { stateCode: 'TG', isScenario: true } })), source({
      authorityClassification: 'synthetic_model',
    }));
    expect(synthetic.normalizedDataStatus).toBe('SCENARIO');
    expect(synthetic.isProposed).toBe(true);
    expect(synthetic.legalEvidenceRecord.ruleApplied).toBe('RULE_SYNTHETIC_MODEL_CLASSIFIED_SCENARIO');

    const scenario = await normalizer.normalize(snapshot(JSON.stringify({ proposal: { stateCode: 'TG', isScenario: true } })), source({
      authorityClassification: 'statutory',
    }));
    expect(scenario.normalizedDataStatus).toBe('SCENARIO');
  });

  it('keeps file fixtures and local URLs from becoming OFFICIAL even with otherwise valid legal details', async () => {
    const payload = validApraPayload();
    for (const overrides of [
      { retrievalMethod: 'file_fixture' },
      { canonicalUrl: 'file:///tmp/official.json' },
      { canonicalUrl: 'https://localhost/official' },
      { canonicalUrl: 'https://example.test/fixtures/delimitation/official.json' },
    ]) {
      const result = await normalizer.normalize(
        snapshot(JSON.stringify(payload), { declaredPublicationDate: '2014-03-01' }),
        source(overrides),
      );
      expect(result.normalizedDataStatus).toBe('UNVERIFIED');
      expect(result.legalEvidencePackage.decisionRecord.isOfficialEligible).toBe(false);
    }
  });

  it('accepts OFFICIAL only when all authoritative legal-corpus fields reconcile', async () => {
    const result = await normalizer.normalize(
      snapshot(JSON.stringify(validApraPayload()), {
        declaredPublicationDate: '2014-03-01',
        declaredEffectiveDate: '2014-06-02',
      }),
      source(),
    );
    expect(result.normalizedDataStatus).toBe('OFFICIAL');
    expect(result.isProposed).toBe(false);
    expect(result.hasLegalEvidence).toBe(true);
    expect(result.legalEvidencePackage.decisionRecord).toMatchObject({
      isOfficialEligible: true,
      ruleApplied: 'RULE_STATUTORY_ENACTED_LEGAL_EVIDENCE_PASSED',
    });
    expect(result.legalEvidencePackage.sourceVerificationDigest).toBe(
      'e86b2401f822b395ad625c276b91cbf7a6a4c28a573752e50529e87515cf5ec0',
    );
  });

  it('rejects corpus mismatches for publisher, dates, jurisdiction, URL, and seat constraints', async () => {
    const payload = validApraPayload();
    payload.proposal.stateCode = 'AP';
    payload.proposal.proposedSeats = 175;
    payload.proposal.proposedScSeats = 29;
    payload.proposal.proposedStSeats = 7;
    payload.proposal.effectiveDate = '2099-01-01';
    payload.proposal.publishedAt = '2099-01-01';
    const result = await normalizer.normalize(
      snapshot(JSON.stringify(payload), { declaredPublicationDate: '2099-01-01' }),
      source({ publisher: 'Unofficial publisher', canonicalUrl: 'https://wrong.example/notice' }),
    );
    expect(result.normalizedDataStatus).toBe('UNVERIFIED');
    expect(result.legalEvidenceDecision).toContain('does not match authoritative issuers');
    expect(result.legalEvidenceDecision).toContain('does not match authoritative date');
    expect(result.legalEvidenceDecision).toContain('does not match instrument jurisdiction');
    expect(result.legalEvidenceDecision).toContain('does not match official authoritative URL');
  });

  it('rejects boundary-only legal instruments that alter seat totals or unapproved ACs', async () => {
    const payload = {
      proposal: {
        stateCode: 'AP',
        title: 'Boundary amendment',
        status: 'final',
        currentSeats: 175,
        proposedSeats: 176,
        currentScSeats: 29,
        proposedScSeats: 30,
        currentStSeats: 7,
        proposedStSeats: 8,
        instrumentType: 'GAZETTE_NOTIFICATION',
        instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        effectiveDate: '2018-09-22',
        publishedAt: '2018-09-22',
      },
      mappings: [{ oldAcNo: 53, newAcNo: 99, oldName: 'Old', newName: 'New', overlapPercentage: 50 }],
    };
    const result = await normalizer.normalize(
      snapshot(JSON.stringify(payload), { declaredPublicationDate: '2018-09-22' }),
      source({
        geographicScope: 'IN-AP',
        canonicalUrl: 'https://www.eci.gov.in/eci-backend/public/api/download?url=fixture',
        publisher: 'Election Commission of India',
      }),
    );
    expect(result.normalizedDataStatus).toBe('UNVERIFIED');
    expect(result.legalEvidenceDecision).toContain('Boundary-only amendment');
  });
});
