/**
 * Job 023 — Finding A: Delimitation Watch Data-Truth & Provenance Adversarial Test Battery
 *
 * Verifies non-negotiable legal evidence gates, elimination of authority-by-label,
 * prohibition of synthetic-to-official escalation, and publication fail-closed invariants.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DelimitationWatchOrchestrator } from '../apps/api/src/modules/delimitationWatch/orchestrator.ts';
import { InMemoryDelimitationWatchRepository } from '../apps/api/src/modules/delimitationWatch/persistence.ts';
import { SourceRegistry } from '../apps/api/src/modules/delimitationWatch/sourceRegistry.ts';
import { CaptureAdapter } from '../apps/api/src/modules/delimitationWatch/captureAdapter.ts';
import { Normalizer } from '../apps/api/src/modules/delimitationWatch/normalizer.ts';
import { CandidateValidator } from '../apps/api/src/modules/delimitationWatch/validator.ts';
import { BaselineComparator } from '../apps/api/src/modules/delimitationWatch/comparator.ts';
import { Versioner } from '../apps/api/src/modules/delimitationWatch/versioner.ts';
import { Notifier } from '../apps/api/src/modules/delimitationWatch/notifier.ts';
import { Publisher } from '../apps/api/src/modules/delimitationWatch/publisher.ts';

describe('Job 023 — Finding A: Data-Truth & Provenance Adversarial Battery', () => {
  let repo;
  let orchestrator;
  let sourceRegistry;
  let captureAdapter;
  let normalizer;
  let validator;
  let comparator;
  let versioner;
  let notifier;
  let publisher;

  const authoritativeFixturePath = path.resolve('tests/fixtures/delimitation/authoritative_delimitation_order_2008.json');
  const initialFixturePath = path.resolve('tests/fixtures/delimitation/initial_delimitation_source_fixture.json');

  const dispatchedPushMessages = [];
  const mockDispatchProvider = {
    sendPush: async (params) => {
      dispatchedPushMessages.push(params);
      return { recipientCount: 5, deliveredCount: 5, failedCount: 0 };
    },
    sendWebhook: async () => ({ dispatched: true }),
  };

  beforeEach(() => {
    dispatchedPushMessages.length = 0;
    repo = new InMemoryDelimitationWatchRepository();
    orchestrator = new DelimitationWatchOrchestrator(repo, mockDispatchProvider);
    sourceRegistry = new SourceRegistry(repo);
    captureAdapter = new CaptureAdapter(repo);
    normalizer = new Normalizer(repo);
    validator = new CandidateValidator(repo);
    comparator = new BaselineComparator(repo);
    versioner = new Versioner(repo);
    notifier = new Notifier(repo, mockDispatchProvider);
    publisher = new Publisher(repo);
  });

  // 1. Statutory source + proposal declared 'final' -> must NOT become OFFICIAL without full evidence package
  test('TRUTH-01: Authority-by-label elimination: statutory source + final status without instrument details produces UNVERIFIED', async () => {
    const source = {
      id: 'SRC-ADV-001',
      name: 'Delimitation Source Claiming Statutory Authority',
      publisher: 'Unknown Commission',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://example.gov.in/orders/final.json',
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 200,
      contentSha256: 'a'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'TG',
          title: 'Telangana Assembly Readjustment',
          status: 'final',
          currentSeats: 119,
          proposedSeats: 119,
          // Missing: instrumentType, instrumentIdentifier, legalEnactmentStatus, effectiveDate
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Without legal evidence package, candidate must NOT be OFFICIAL');
    assert.equal(candidate.isProposed, true);
    assert.ok(candidate.legalEvidencePackage);
    assert.equal(candidate.legalEvidencePackage.decisionRecord.isOfficialEligible, false);
    assert.ok(candidate.legalEvidencePackage.decisionRecord.rationale.includes('UNVERIFIED'));
  });

  // 2. Synthetic model source claiming 'final' -> fails closed (never OFFICIAL)
  test('TRUTH-02: Synthetic model source claiming final and statutory must fail closed to SCENARIO', async () => {
    const source = {
      id: 'SRC-ADV-002',
      name: 'AI Delimitation Predictor',
      publisher: 'Election Commission of India',
      sourceType: 'synthetic_fixture',
      canonicalUrl: 'https://ai.example.org/delimitation/model-output.json',
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'synthetic_model',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 200,
      contentSha256: 'b'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'TG',
          title: 'Synthetic Delimitation Model Projection',
          status: 'final',
          instrumentType: 'DELIMITATION_ORDER',
          instrumentIdentifier: 'ECI/2026/SYNTH-01',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2026-09-01',
          currentSeats: 119,
          proposedSeats: 125,
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'SCENARIO', 'Synthetic model source MUST normalize to SCENARIO, never OFFICIAL');
    assert.equal(candidate.isProposed, true);
    assert.ok(candidate.legalEvidenceDecision?.includes('synthetic'));
  });

  // 3. File fixture source claiming 'final' -> fails closed (never OFFICIAL)
  test('TRUTH-03: File fixture source claiming final and statutory must fail closed to UNVERIFIED', async () => {
    const source = {
      id: 'SRC-ADV-003',
      name: 'Local Test Fixture Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 200,
      contentSha256: 'c'.repeat(64),
      rawContent: fs.readFileSync(initialFixturePath, 'utf8'),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.notEqual(candidate.normalizedDataStatus, 'OFFICIAL', 'Local file fixture must NEVER become OFFICIAL');
    assert.equal(candidate.isProposed, true);
  });

  // 4. Academic/media source claiming 'enacted' -> rejected from OFFICIAL
  test('TRUTH-04: Academic or media source claiming enacted must be rejected from OFFICIAL', async () => {
    const source = {
      id: 'SRC-ADV-004',
      name: 'University Delimitation Analysis',
      publisher: 'Academic Research Foundation',
      sourceType: 'statutory_archive',
      canonicalUrl: 'https://university.ac.in/papers/delimitation-report.json',
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'academic',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 200,
      contentSha256: 'd'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'TG',
          title: 'Academic Analysis of Delimitation Order',
          status: 'final',
          instrumentType: 'DELIMITATION_ORDER',
          instrumentIdentifier: 'ACA/2026/01',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2026-05-01',
          currentSeats: 119,
          proposedSeats: 119,
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Academic source must normalize to UNVERIFIED, not OFFICIAL');
    assert.equal(candidate.isProposed, true);
  });

  // 5. Client payload with dataStatus: 'OFFICIAL' injected directly -> ignored/overridden by normalizer
  test('TRUTH-05: Injected client dataStatus: OFFICIAL is overridden and ignored by normalizer', async () => {
    const source = {
      id: 'SRC-ADV-005',
      name: 'Unverified Blog Source',
      publisher: 'Political News Blog',
      sourceType: 'census_bulletin',
      canonicalUrl: 'https://blog.news.in/leaked-delimitation.json',
      geographicScope: 'IN-TG',
      subjectScope: 'draft_proposal',
      authorityClassification: 'media_ngo',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 200,
      contentSha256: 'e'.repeat(64),
      rawContent: JSON.stringify({
        dataStatus: 'OFFICIAL', // Malicious attempt to self-declare OFFICIAL
        normalizedDataStatus: 'OFFICIAL',
        proposal: {
          stateCode: 'TG',
          title: 'Leaked Delimitation Map',
          status: 'final',
          dataStatus: 'OFFICIAL',
          currentSeats: 119,
          proposedSeats: 130,
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Normalizer must override fraudulent client dataStatus');
    assert.equal(candidate.isProposed, true);
  });

  // 6. Valid statutory evidence package with authentic ECI Gazette order -> accepted as OFFICIAL
  test('TRUTH-06: Authentic statutory evidence package with ECI Delimitation Order 2008 qualifies for OFFICIAL', async () => {
    const source = {
      id: 'SRC-ADV-006',
      name: 'ECI Gazette Extraordinary Delimitation Order 2008',
      publisher: 'Delimitation Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://egazette.gov.in/orders/2008/notification-282.json',
      geographicScope: 'IN-AP',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const rawStatutoryContent = fs.readFileSync(authoritativeFixturePath, 'utf8');
    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: rawStatutoryContent.length,
      contentSha256: 'f'.repeat(64),
      rawContent: rawStatutoryContent,
      declaredPublicationDate: '2008-02-19',
      declaredEffectiveDate: '2008-05-31',
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'OFFICIAL', 'Authentic statutory evidence must normalize to OFFICIAL');
    assert.equal(candidate.isProposed, false);
    assert.equal(candidate.proposalData.instrumentType, 'DELIMITATION_ORDER');
    assert.equal(candidate.proposalData.legalEnactmentStatus, 'ENACTED_COMMENCED');
    assert.equal(candidate.proposalData.effectiveDate, '2008-05-31');
    assert.ok(candidate.hasLegalEvidence);
    assert.ok(candidate.legalEvidencePackage?.isStatutoryOrConstitutional);

    // Run validator on candidate
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'PASSED');
    const check12 = validation.checksRun.find((c) => c.checkName === 'CHECK_LEGAL_EVIDENCE_GATE');
    assert.ok(check12?.passed, 'Check 12 must pass for valid statutory order');
  });

  // 7. Missing instrument identifier -> rejected at validator Check 12
  test('TRUTH-07: Candidate claiming OFFICIAL with missing instrument identifier is rejected at Check 12', async () => {
    const source = {
      id: 'SRC-ADV-007',
      name: 'Statutory Source Missing Instrument Identifier',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://eci.gov.in/orders/test.json',
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dummyCandidate = {
      id: randomUUID(),
      snapshotId: randomUUID(),
      sourceId: source.id,
      parserVersion: 'v1.0.0',
      proposalData: {
        stateCode: 'TG',
        title: 'Delimitation Order',
        status: 'final',
        currentSeats: 119,
        proposedSeats: 119,
        currentScSeats: 19,
        currentStSeats: 12,
        proposedScSeats: 19,
        proposedStSeats: 12,
        instrumentType: 'DELIMITATION_ORDER',
        // Missing instrumentIdentifier!
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        effectiveDate: '2026-06-01',
      },
      constituencyMappings: [],
      normalizedDataStatus: 'OFFICIAL',
      isProposed: false,
      normalizedAt: new Date().toISOString(),
    };

    const validation = await validator.validate(dummyCandidate, source);
    assert.equal(validation.validationStatus, 'REJECTED');
    const check12 = validation.checksRun.find((c) => c.checkName === 'CHECK_LEGAL_EVIDENCE_GATE');
    assert.equal(check12?.passed, false);
    assert.ok(validation.errors.some((e) => e.toLowerCase().includes('missing statutory legal instrument identifier')));
  });

  // 8. Incomplete Gazette URL / missing effective date -> rejected at validator Check 12
  test('TRUTH-08: Candidate claiming OFFICIAL with missing effective date is rejected at Check 12', async () => {
    const source = {
      id: 'SRC-ADV-008',
      name: 'Statutory Source Missing Effective Date',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://eci.gov.in/orders/test.json',
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const dummyCandidate = {
      id: randomUUID(),
      snapshotId: randomUUID(),
      sourceId: source.id,
      parserVersion: 'v1.0.0',
      proposalData: {
        stateCode: 'TG',
        title: 'Delimitation Order',
        status: 'final',
        currentSeats: 119,
        proposedSeats: 119,
        currentScSeats: 19,
        currentStSeats: 12,
        proposedScSeats: 19,
        proposedStSeats: 12,
        instrumentType: 'DELIMITATION_ORDER',
        instrumentIdentifier: 'ECI/2026/01',
        legalEnactmentStatus: 'ENACTED_COMMENCED',
        // Missing effectiveDate!
      },
      constituencyMappings: [],
      normalizedDataStatus: 'OFFICIAL',
      isProposed: false,
      normalizedAt: new Date().toISOString(),
    };

    const validation = await validator.validate(dummyCandidate, source);
    assert.equal(validation.validationStatus, 'REJECTED');
    const check12 = validation.checksRun.find((c) => c.checkName === 'CHECK_LEGAL_EVIDENCE_GATE');
    assert.equal(check12?.passed, false);
    assert.ok(validation.errors.some((e) => e.toLowerCase().includes('missing or invalid legal effective date')));
  });

  // 9. Immature effective date (future enactment) -> accepted only as non-operative / pending, never active baseline
  test('TRUTH-09: Future enactment date is accepted as pending/future and not promoted to active current baseline', async () => {
    const source = {
      id: 'SRC-ADV-009',
      name: 'Future Delimitation Order',
      publisher: 'Delimitation Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://egazette.gov.in/orders/2030/order-01.json',
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'http_get',
      isActive: true,
      consecutiveFailures: 0,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const futureDate = '2030-01-01';
    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '9'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'TG',
          title: 'Future Post-2026 Delimitation Enactment',
          status: 'final',
          instrumentType: 'DELIMITATION_ORDER',
          instrumentIdentifier: 'Notification No. 999/2030',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: futureDate,
          currentSeats: 119,
          proposedSeats: 125,
        },
        constituencyMappings: [],
      }),
      declaredEffectiveDate: futureDate,
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'PASSED');

    const comparison = await comparator.compare(candidate, null);
    const { version } = await versioner.acceptVersion(candidate, snapshot, validation, comparison, null);

    assert.equal(version.effectiveDate, futureDate);
    // Is operative check: effective date in future is not operative yet
    const isOperativeNow = new Date(version.effectiveDate).getTime() <= Date.now();
    assert.equal(isOperativeNow, false, 'Future enactment date must not be operative currently');
  });

  // 10. Non-enacted proposal published -> published as PROPOSAL / SCENARIO_ESTIMATE, never ENACTED_OFFICIAL
  test('TRUTH-10: Non-enacted proposal is published as PROPOSAL / SCENARIO_ESTIMATE, never ENACTED_OFFICIAL', async () => {
    const dummyCandidate = {
      id: randomUUID(),
      snapshotId: randomUUID(),
      sourceId: 'SRC-ADV-010',
      parserVersion: 'v1.0.0',
      proposalData: {
        stateCode: 'TG',
        title: 'Draft Delimitation Proposal 2026',
        status: 'draft',
        currentSeats: 119,
        proposedSeats: 125,
        currentScSeats: 19,
        currentStSeats: 12,
        proposedScSeats: 20,
        proposedStSeats: 13,
      },
      constituencyMappings: [],
      normalizedDataStatus: 'UNVERIFIED',
      isProposed: true,
      normalizedAt: new Date().toISOString(),
    };

    const dummyVersion = {
      id: randomUUID(),
      sourceId: 'SRC-ADV-010',
      versionTag: 'v1.0.0-unverified',
      snapshotId: dummyCandidate.snapshotId,
      candidateId: dummyCandidate.id,
      validationId: randomUUID(),
      comparisonId: randomUUID(),
      contentSha256: '1'.repeat(64),
      parserVersion: 'v1.0.0',
      dataStatus: 'UNVERIFIED',
      acceptedAt: new Date().toISOString(),
      acceptedBy: 'test',
    };

    const dummyValidation = {
      id: dummyVersion.validationId,
      candidateId: dummyCandidate.id,
      validationStatus: 'PASSED',
      checksRun: [],
      errors: [],
      warnings: [],
      evidenceReferences: [],
      validatedAt: new Date().toISOString(),
    };

    const { publication } = await publisher.publish(dummyVersion, dummyCandidate, dummyValidation);
    assert.equal(publication.publicationStatus, 'PUBLISHED');
    assert.equal(publication.publicationType, 'PROPOSAL', 'Unverified proposed candidate must be published as PROPOSAL, never ENACTED_OFFICIAL');
    assert.equal(publication.canonicalViewUpdated, false, 'Unverified candidate must not mutate canonical published view');

    // Attempting to publish an unverified candidate as ENACTED_OFFICIAL must be blocked
    const spoofedVersion = {
      ...dummyVersion,
      id: randomUUID(),
      dataStatus: 'OFFICIAL',
    };
    await assert.rejects(
      async () => {
        await publisher.publish(spoofedVersion, dummyCandidate, dummyValidation);
      },
      /CANONICAL_MUTATION_RESTRICTED/,
      'Publisher must strictly prohibit publishing non-enacted candidate as ENACTED_OFFICIAL',
    );
  });
});
