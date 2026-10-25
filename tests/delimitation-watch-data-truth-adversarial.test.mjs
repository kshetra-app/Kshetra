/**
 * Job 023 — Finding A & C: Delimitation Watch Data-Truth & Provenance Adversarial Test Battery
 *
 * Verifies non-negotiable legal evidence gates, elimination of authority-by-label,
 * prohibition of synthetic-to-official escalation, authoritative corpus verification,
 * and publication fail-closed invariants.
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
  const delcomOrder46FixturePath = path.resolve('tests/fixtures/delimitation/delcom_order_46_andhra_pradesh_2007.json');

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
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Authority-by-label must be rejected; status must fail closed to UNVERIFIED');
    assert.equal(candidate.isProposed, true);
    assert.equal(candidate.hasLegalEvidence, false);
    assert.match(candidate.legalEvidenceDecision, /Candidate failed legal evidence gate/);
  });

  // 2. Synthetic model / scenario source -> must NOT become OFFICIAL
  test('TRUTH-02: Synthetic model source claiming final and statutory must fail closed to SCENARIO', async () => {
    const source = {
      id: 'SRC-ADV-002',
      name: 'AI Delimitation Simulator',
      publisher: 'PANIN Algorithm Engine',
      sourceType: 'census_bulletin',
      canonicalUrl: 'https://panin.internal/simulations/2026.json',
      geographicScope: 'IN-TG',
      subjectScope: 'boundary_simulation',
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
          title: 'Article 332 Simulation',
          status: 'final',
          currentSeats: 119,
          proposedSeats: 119,
          instrumentType: 'DELIMITATION_ORDER',
          instrumentIdentifier: 'SIMULATED-ORDER-2026',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2026-05-01',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'SCENARIO', 'Synthetic model must normalize to SCENARIO, never OFFICIAL');
    assert.equal(candidate.isProposed, true);
    assert.equal(candidate.hasLegalEvidence, false);
  });

  // 3. Local file fixture or test source -> cannot escalate to OFFICIAL
  test('TRUTH-03: File fixture source claiming final and statutory must fail closed to UNVERIFIED', async () => {
    const source = {
      id: 'SRC-ADV-003',
      name: 'Local Test Fixture',
      publisher: 'Election Commission of India',
      sourceType: 'synthetic_fixture',
      canonicalUrl: 'file:///fixtures/delimitation/test.json',
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
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'TG',
          title: 'Fabricated Test Enactment',
          status: 'final',
          currentSeats: 119,
          proposedSeats: 119,
          instrumentType: 'DELIMITATION_ORDER',
          instrumentIdentifier: 'FAKE-ECI-ORDER-2026',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2026-01-01',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'File fixture must fail closed to UNVERIFIED, never OFFICIAL');
    assert.equal(candidate.isProposed, true);
    assert.equal(candidate.hasLegalEvidence, false);
  });

  // 4. Academic / Media / NGO source claiming enacted law -> must be rejected from OFFICIAL
  test('TRUTH-04: Academic or media source claiming enacted must be rejected from OFFICIAL', async () => {
    const source = {
      id: 'SRC-ADV-004',
      name: 'Academic Research Delimitation Report',
      publisher: 'Centre for Policy Research',
      sourceType: 'academic_paper',
      canonicalUrl: 'https://policy-research.org/delimitation-paper.json',
      geographicScope: 'IN-TG',
      subjectScope: 'boundary_simulation',
      authorityClassification: 'academic_research',
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
          title: 'Academic Model for Telangana',
          status: 'final',
          currentSeats: 119,
          proposedSeats: 119,
          instrumentType: 'DELIMITATION_ORDER',
          instrumentIdentifier: 'CPR-REPORT-2026',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2026-01-01',
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

  // 6. Valid statutory evidence package with authentic Presidential Order S.O. 382(E) -> accepted as OFFICIAL
  test('TRUTH-06: Authentic statutory evidence package with Presidential Order S.O. 382(E) qualifies for OFFICIAL', async () => {
    const source = {
      id: 'SRC-ADV-006',
      name: 'ECI Gazette Extraordinary Delimitation Order 2008',
      publisher: 'Ministry of Law and Justice',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://www.eci.gov.in/files/file/3931-delimitation-of-parliamentary-and-assembly-constituencies-order-2008/',
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
      declaredEffectiveDate: '2008-02-19',
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'OFFICIAL', 'Authentic statutory evidence must normalize to OFFICIAL');
    assert.equal(candidate.isProposed, false);
    assert.equal(candidate.proposalData.instrumentType, 'PRESIDENTIAL_ORDER');
    assert.equal(candidate.proposalData.legalEnactmentStatus, 'ENACTED_COMMENCED');
    assert.equal(candidate.proposalData.effectiveDate, '2008-02-19');
    assert.ok(candidate.hasLegalEvidence);
    assert.ok(candidate.legalEvidencePackage?.isStatutoryOrConstitutional);

    // Run validator on candidate
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'PASSED');
    const check12 = validation.checksRun.find((c) => c.checkName === 'CHECK_LEGAL_EVIDENCE_GATE');
    assert.ok(check12?.passed, 'Check 12 must pass for valid statutory order');
  });

  // 7. Forged instrument identifier -> rejected at validator Check 12
  test('TRUTH-07: Forged instrument identifier is rejected from OFFICIAL', async () => {
    const source = {
      id: 'SRC-ADV-007',
      name: 'Ministry of Law and Justice Egress',
      publisher: 'Ministry of Law and Justice',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://legislative.gov.in/gazette/forged.json',
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '1'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Forged Gazette Order 2026',
          status: 'final',
          currentSeats: 294,
          proposedSeats: 294,
          currentScSeats: 48,
          currentStSeats: 19,
          proposedScSeats: 48,
          proposedStSeats: 19,
          instrumentType: 'PRESIDENTIAL_ORDER',
          instrumentIdentifier: 'S.O. 9999(E) (Completely Fabricated Notification)', // FORGED
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2008-02-19',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Forged instrument must fail closed to UNVERIFIED');
    assert.equal(candidate.hasLegalEvidence, false);

    // If candidate somehow claimed OFFICIAL, validator Check 12 rejects it
    candidate.normalizedDataStatus = 'OFFICIAL';
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'REJECTED');
    assert.ok(validation.errors.some((e) => e.includes('unverified in Authoritative Legal Corpus')));
  });

  // 8. Mismatched publication or effective date -> rejected
  test('TRUTH-08: Mismatched document effective date causes fail-closed UNVERIFIED classification', async () => {
    const source = {
      id: 'SRC-ADV-008',
      name: 'Ministry of Law and Justice',
      publisher: 'Ministry of Law and Justice',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://legislative.gov.in/gazette/mismatched-date.json',
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '2'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Delimitation Order with Fake Effective Date',
          status: 'final',
          currentSeats: 294,
          proposedSeats: 294,
          currentScSeats: 48,
          currentStSeats: 19,
          proposedScSeats: 48,
          proposedStSeats: 19,
          instrumentType: 'PRESIDENTIAL_ORDER',
          instrumentIdentifier: 'S.O. 382(E) (Delimitation of Parliamentary and Assembly Constituencies Order, 2008)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2026-12-31', // Mismatched date (authentic is 2008-02-19)
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Mismatched date must fail closed');
    assert.match(candidate.legalEvidenceDecision, /Effective date '2026-12-31' does not match authoritative date/);
  });

  // 9. Contradictory seat allocation metadata -> rejected
  test('TRUTH-09: Contradictory seat counts conflicting with statutory determination are rejected', async () => {
    const source = {
      id: 'SRC-ADV-009',
      name: 'Ministry of Law and Justice',
      publisher: 'Ministry of Law and Justice',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://legislative.gov.in/gazette/bad-seats.json',
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '3'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Delimitation Order with Contradictory Seats',
          status: 'final',
          currentSeats: 294,
          proposedSeats: 350, // Conflicting! Authentic AP seats under Schedule II is 294
          currentScSeats: 48,
          currentStSeats: 19,
          proposedScSeats: 60,
          proposedStSeats: 35,
          instrumentType: 'PRESIDENTIAL_ORDER',
          instrumentIdentifier: 'S.O. 382(E) (Delimitation of Parliamentary and Assembly Constituencies Order, 2008)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          effectiveDate: '2008-02-19',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Contradictory seat metadata must fail closed to UNVERIFIED');
    assert.match(candidate.legalEvidenceDecision, /Seat allocation \(350\/60\/35\) conflicts with statutory allocation/);
  });

  // 10. Delimitation Commission Order 46 recommendation order -> PROPOSED_DRAFT cannot publish as ENACTED_OFFICIAL
  test('TRUTH-10: Recommendation order (PROPOSED_DRAFT) is classified as PROPOSAL and cannot publish as ENACTED_OFFICIAL', async () => {
    const source = {
      id: 'SRC-ADV-010',
      name: 'Delimitation Commission of India',
      publisher: 'Delimitation Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://www.eci.gov.in/files/file/3931-delimitation-of-parliamentary-and-assembly-constituencies-order-2008/',
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

    const rawContent = fs.readFileSync(delcomOrder46FixturePath, 'utf8');
    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: rawContent.length,
      contentSha256: '4'.repeat(64),
      rawContent,
      declaredPublicationDate: '2007-05-31',
      declaredEffectiveDate: '2008-02-19',
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Order 46 as recommendation cannot be classified as OFFICIAL');
    assert.equal(candidate.isProposed, true);

    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'PASSED'); // Valid proposal

    const comparison = await comparator.compare(candidate, undefined);
    const { version } = await versioner.acceptVersion(candidate, snapshot, validation, comparison);
    assert.equal(version.dataStatus, 'UNVERIFIED');

    // Publication must be PROPOSAL with canonicalViewUpdated = false
    const pubResult = await publisher.publish(version, candidate, validation);
    assert.equal(pubResult.publication.publicationType, 'PROPOSAL');
    assert.equal(pubResult.publication.canonicalViewUpdated, false, 'Non-enacted recommendation order must never mutate canonical view');

    // Attempting to publish as ENACTED_OFFICIAL throws CANONICAL_MUTATION_RESTRICTED
    version.dataStatus = 'OFFICIAL';
    await assert.rejects(
      async () => {
        await publisher.publish(version, candidate, validation);
      },
      /CANONICAL_MUTATION_RESTRICTED/
    );
  });

  // 11. Adversarial: 2018 notification with incorrect date (2018-09-24 instead of statutory 2018-09-22)
  test('TRUTH-11: 2018 ECI Notification with incorrect date 2018-09-24 fails closed to UNVERIFIED', async () => {
    const source = {
      id: 'SRC-ADV-011',
      name: 'ECI Notification 2018 Date Tampered',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D',
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '5'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Notification No. 282/AP/2018(DEL)',
          status: 'final',
          currentSeats: 175,
          proposedSeats: 175,
          currentScSeats: 29,
          currentStSeats: 7,
          proposedScSeats: 29,
          proposedStSeats: 7,
          instrumentType: 'ELECTION_COMMISSION_NOTIFICATION',
          instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          publicationDate: '2018-09-24', // INCORRECT: Statutory date is 2018-09-22
          effectiveDate: '2018-09-22',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Incorrect publication date must fail closed');
    assert.match(candidate.legalEvidenceDecision, /Publication date '2018-09-24' does not match authoritative date/);

    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'REJECTED', 'Validator Check 12 must reject corpus mismatch');
    assert.ok(validation.errors.some(e => e.includes('Publication date') || e.includes('LEGAL_EVIDENCE_ERROR')));
  });

  // 12. Adversarial: 2018 notification with generic nonmatching source URL
  test('TRUTH-12: 2018 ECI Notification with generic homepage URL fails closed to UNVERIFIED', async () => {
    const source = {
      id: 'SRC-ADV-012',
      name: 'ECI Notification Generic URL',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://www.eci.gov.in/', // Generic homepage instead of exact primary document URL
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '6'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Notification No. 282/AP/2018(DEL)',
          status: 'final',
          currentSeats: 175,
          proposedSeats: 175,
          currentScSeats: 29,
          currentStSeats: 7,
          proposedScSeats: 29,
          proposedStSeats: 7,
          instrumentType: 'ELECTION_COMMISSION_NOTIFICATION',
          instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          publicationDate: '2018-09-22',
          effectiveDate: '2018-09-22',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Generic nonmatching source URL must fail closed');
    assert.match(candidate.legalEvidenceDecision, /does not match official authoritative URL/);
  });

  // 13. Adversarial: 2018 boundary-only notification claiming altered seat numbers
  test('TRUTH-13: 2018 ECI boundary-only amendment claiming altered seat allocations fails closed', async () => {
    const source = {
      id: 'SRC-ADV-013',
      name: 'ECI Notification Seat Alteration Claim',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D',
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '7'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Notification No. 282/AP/2018(DEL)',
          status: 'final',
          currentSeats: 175,
          proposedSeats: 176, // ILLEGAL: 2018 notification is boundary-only for AC 53 and 67, 0 seat changes
          currentScSeats: 29,
          currentStSeats: 7,
          proposedScSeats: 30,
          proposedStSeats: 7,
          instrumentType: 'ELECTION_COMMISSION_NOTIFICATION',
          instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          publicationDate: '2018-09-22',
          effectiveDate: '2018-09-22',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Seat alteration claim on boundary-only instrument must fail closed');
    assert.match(candidate.legalEvidenceDecision, /Boundary-only amendment/i);

    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'REJECTED', 'Validator Check 12 must reject boundary seat modification');
    assert.ok(validation.errors.some(e => e.includes('Boundary-only amendment') || e.includes('cannot alter seat totals')));
  });

  // 14. Adversarial: APRA 2014 claiming invented Schedule XXXI
  test('TRUTH-14: APRA 2014 citing invented Schedule XXXI fails closed to UNVERIFIED', async () => {
    const source = {
      id: 'SRC-ADV-014',
      name: 'APRA 2014 Fake Schedule',
      publisher: 'Ministry of Law and Justice, Legislative Department',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://legislative.gov.in/actsofparliamentfromtheyear/andhra-pradesh-reorganisation-act-2014',
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

    const snapshot = {
      id: randomUUID(),
      sourceId: source.id,
      retrievedAt: new Date().toISOString(),
      httpStatus: 200,
      contentType: 'application/json',
      contentSizeBytes: 300,
      contentSha256: '8'.repeat(64),
      rawContent: JSON.stringify({
        proposal: {
          stateCode: 'AP',
          title: 'Andhra Pradesh Reorganisation Act, 2014 (Schedule XXXI)', // ILLEGAL: Schedule XXXI does not exist in Act 6 of 2014
          status: 'final',
          currentSeats: 294,
          proposedSeats: 175,
          currentScSeats: 48,
          currentStSeats: 19,
          proposedScSeats: 29,
          proposedStSeats: 7,
          instrumentType: 'PARLIAMENT_ACT',
          instrumentIdentifier: 'Act No. 6 of 2014 (Schedule XXXI)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          publicationDate: '2014-03-01',
          effectiveDate: '2014-06-02',
        },
        constituencyMappings: [],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'UNVERIFIED', 'Invented schedule citation must fail closed');
    assert.match(candidate.legalEvidenceDecision, /unverified in Authoritative Legal Corpus/i);
  });

  // 15. Positive case: Authentic 2018 ECI notification with exact primary URL, date, and boundary-only scope qualifies as OFFICIAL
  test('TRUTH-15: Authentic 2018 ECI notification qualifies as OFFICIAL with boundary-only scope', async () => {
    const source = {
      id: 'SRC-ADV-015',
      name: 'ECI Notification 282/AP/2018(DEL) Authentic Source',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: 'https://www.eci.gov.in/eci-backend/public/api/download?url=LMAhAK6sOPBp%2FNFF0iRfXbEB1EVSLT41NNLRjYNJJP1KivrUxbfqkDatmHy12e%2FzVx8fLfn2ReU7TfrqYobgIsVIzE4H7zCkL60TDPfde3hSidsZ4fuGUaZAjsPMK3mFe%2FOayCb%2Bc1mgC3WIErfdO%2BA072J7HtGm2kYfstpL5XIZTWrH2JWU7UfZrKWF1BUsH9xccKER%2BJMZVGi7SrzX57%2FMm24zs1eyK2AB5zsjcWKzrILRQG%2FBbbQ%2Fx5bNYVaCn7kX4xoHNibbBVAsqukcOQ%3D%3D',
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
          stateCode: 'AP',
          title: 'Notification No. 282/AP/2018(DEL)',
          status: 'final',
          currentSeats: 175,
          proposedSeats: 175,
          currentScSeats: 29,
          currentStSeats: 7,
          proposedScSeats: 29,
          proposedStSeats: 7,
          instrumentType: 'ELECTION_COMMISSION_NOTIFICATION',
          instrumentIdentifier: 'Notification No. 282/AP/2018(DEL)',
          legalEnactmentStatus: 'ENACTED_COMMENCED',
          publicationDate: '2018-09-22',
          effectiveDate: '2018-09-22',
        },
        constituencyMappings: [
          {
            constituencyNumber: 53,
            constituencyName: 'Rampachodavaram (ST)',
            district: 'East Godavari',
            extentDescription: 'Rampachodavaram, Devipatnam, Y. Ramavaram, Addateegala, Rajavommangi, Gangavaram Mandals and identified villages of Kunavaram, Chintoor, Vararamachandrapuram and Bhadrachalam Mandals.',
          },
          {
            constituencyNumber: 67,
            constituencyName: 'Polavaram (ST)',
            district: 'West Godavari',
            extentDescription: 'Polavaram, Buttayagudem, Jeelugumilli, Koyyalagudem and T. Narasapuram Mandals, and Kukunoor and Velairpad Mandals.',
          },
        ],
      }),
      captureOutcome: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    const candidate = await normalizer.normalize(snapshot, source);
    assert.equal(candidate.normalizedDataStatus, 'OFFICIAL', 'Authentic 2018 ECI notification must qualify as OFFICIAL');
    assert.match(candidate.legalEvidenceDecision, /verified in Authoritative Legal Corpus/);

    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'PASSED', 'Validator Check 12 must pass for authentic corpus entry');
    assert.equal(validation.errors.length, 0);
  });
});
