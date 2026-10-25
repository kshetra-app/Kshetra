/**
 * Delimitation Watch Mandatory Invariants Battery (Job 023)
 *
 * Verifies all 19 mandatory acceptance criteria specified in Section 5
 * of CTO Implementation Directive: JOB 023: DELIMITATION WATCH.
 */

import { test, describe, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import * as fs from 'node:fs';
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
import { validateSourceUrl, SsrfSecurityError } from '../apps/api/src/modules/delimitationWatch/ssrfGuard.ts';

describe('Job 023 — Delimitation Watch Mandatory 19 Invariants Battery', () => {
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

  const initialFixturePath = path.resolve('tests/fixtures/delimitation/initial_delimitation_source_fixture.json');
  const changedFixturePath = path.resolve('tests/fixtures/delimitation/changed_delimitation_source_fixture.json');
  const invalidFixturePath = path.resolve('tests/fixtures/delimitation/invalid_delimitation_source_fixture.json');

  const dispatchedPushMessages = [];

  const mockDispatchProvider = {
    sendPush: async (params) => {
      dispatchedPushMessages.push(params);
      return { recipientCount: 10, deliveredCount: 10, failedCount: 0 };
    },
    sendWebhook: async (params) => ({ dispatched: true }),
  };

  beforeEach(async () => {
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

  // ─── 1. Initial capture ───
  test('Test 1 [Initial capture]: Source evidence, retrieval metadata, and content hash are persisted', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-001',
      name: 'ECI Telangana Delimitation Order',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const snapshot = await captureAdapter.capture(source);
    assert.equal(snapshot.captureOutcome, 'SUCCESS');
    assert.equal(snapshot.sourceId, 'SRC-TG-001');
    assert.ok(snapshot.contentSha256 && snapshot.contentSha256.length === 64, 'SHA-256 hash must be 64 hex characters');
    assert.ok(snapshot.contentSizeBytes > 0, 'Content size must be > 0');
    assert.equal(snapshot.httpStatus, 200);

    // Verify persistence in repository
    const retrieved = await repo.getSnapshot(snapshot.id);
    assert.ok(retrieved, 'Snapshot must be retrievable from repository');
    assert.equal(retrieved.contentSha256, snapshot.contentSha256);
  });

  // ─── 2. Identical repeat capture ───
  test('Test 2 [Identical repeat capture]: No duplicate accepted version or material-change notification', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-002',
      name: 'ECI Telangana Delimitation Order',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    // Run 1: initial capture and version acceptance
    const run1 = await orchestrator.runPipeline('SRC-TG-002');
    assert.equal(run1.outcome, 'SUCCESS');
    assert.ok(run1.acceptedVersion);
    const initialVersionId = run1.acceptedVersion.id;
    const initialPushCount = dispatchedPushMessages.length;
    assert.equal(initialPushCount, 1, 'Initial version must trigger 1 notification');

    // Run 2: identical repeat run on unchanged source
    const run2 = await orchestrator.runPipeline('SRC-TG-002');
    assert.equal(run2.outcome, 'NO_CHANGE');
    assert.equal(run2.acceptedVersion.id, initialVersionId, 'Accepted version must remain identical');
    assert.equal(dispatchedPushMessages.length, initialPushCount, 'Repeat unchanged capture must not dispatch new notifications');

    // Verify repository has exactly 1 version
    const versions = await repo.listAcceptedVersionsForSource('SRC-TG-002');
    assert.equal(versions.length, 1, 'Repository must retain exactly 1 accepted version');
  });

  // ─── 3. Meaningful source change ───
  test('Test 3 [Meaningful source change]: The normalized candidate and comparison identify the expected change', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-003',
      name: 'ECI Telangana Delimitation Order',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const run1 = await orchestrator.runPipeline('SRC-TG-003');
    assert.equal(run1.outcome, 'SUCCESS');
    assert.equal(run1.acceptedVersion.dataStatus, 'OFFICIAL');

    // Update source to point to changed fixture (119 seats -> 125 seats)
    source.canonicalUrl = changedFixturePath;
    await repo.saveSource(source);

    const run2 = await orchestrator.runPipeline('SRC-TG-003');
    assert.equal(run2.outcome, 'SUCCESS');
    assert.ok(run2.comparison.isMaterialChange, 'Must detect material change');
    assert.equal(run2.comparison.classification, 'MATERIAL_CHANGE');

    // Verify seat change detection
    const seatChange = run2.comparison.changedRecords.find((r) => r.key === 'proposedSeats');
    assert.ok(seatChange, 'Must detect seat modification');
    assert.equal(seatChange.oldValue, 119);
    assert.equal(seatChange.newValue, 125);

    // Verify new version links to previous version
    assert.equal(run2.acceptedVersion.previousVersionId, run1.acceptedVersion.id, 'New version must point to previous accepted version');
  });

  // ─── 4. Invalid source payload ───
  test('Test 4 [Invalid source payload]: Validation rejects candidate; accepted and published versions remain unchanged', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-004',
      name: 'ECI Telangana Delimitation Order',
      publisher: 'Election Commission of India',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const run1 = await orchestrator.runPipeline('SRC-TG-004');
    assert.equal(run1.outcome, 'SUCCESS');
    const acceptedVersionId = run1.acceptedVersion.id;

    // Mutate source to invalid fixture
    source.canonicalUrl = invalidFixturePath;
    await repo.saveSource(source);

    const run2 = await orchestrator.runPipeline('SRC-TG-004');
    assert.equal(run2.outcome, 'REJECTED');
    assert.ok(run2.validation);
    assert.equal(run2.validation.validationStatus, 'REJECTED');
    assert.ok(run2.validation.errors.length > 0);

    // Verify accepted versions in repo remained unchanged
    const versions = await repo.listAcceptedVersionsForSource('SRC-TG-004');
    assert.equal(versions.length, 1);
    assert.equal(versions[0].id, acceptedVersionId, 'Accepted version must remain unchanged');
  });

  // ─── 5. Missing provenance ───
  test('Test 5 [Missing provenance]: Candidate cannot enter trusted publication', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-005',
      name: 'Test Source',
      publisher: 'Unknown Publisher',
      sourceType: 'synthetic_fixture',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'synthetic_model',
      retrievalMethod: 'file_fixture',
    });

    const snapshot = await captureAdapter.capture(source);
    const candidate = await normalizer.normalize(snapshot, source);

    // Corrupt provenance: empty parserVersion
    candidate.parserVersion = '';
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'REJECTED');
    assert.ok(validation.errors.some((e) => e.includes('provenance')));

    // Attempting to publish must fail closed
    await assert.rejects(
      async () => {
        const dummyVersion = {
          id: 'dummy-v1',
          sourceId: source.id,
          versionTag: 'v1.0.0-TG',
          snapshotId: snapshot.id,
          candidateId: candidate.id,
          validationId: validation.id,
          comparisonId: 'comp-1',
          contentSha256: snapshot.contentSha256,
          parserVersion: '',
          dataStatus: 'UNVERIFIED',
          acceptedAt: new Date().toISOString(),
          acceptedBy: 'test',
        };
        await publisher.publish(dummyVersion, candidate, validation);
      },
      /PUBLICATION_GATE_FAILED/,
      'Publication must be blocked for candidate with missing provenance',
    );
  });

  // ─── 6. Unknown canonical geography ID ───
  test('Test 6 [Unknown canonical geography ID]: Candidate is rejected or routed to review path', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-006',
      name: 'ECI Unknown Geography',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const snapshot = await captureAdapter.capture(source);
    const candidate = await normalizer.normalize(snapshot, source);

    // Corrupt canonical geography ID: stateCode = 'ZZ' (unknown state)
    candidate.proposalData.stateCode = 'ZZ';
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'REJECTED');
    assert.ok(validation.errors.some((e) => e.includes('canonical geography') || e.includes('stateCode')));
  });

  // ─── 7. Proposed versus official ───
  test('Test 7 [Proposed versus official]: Proposal is not misrepresented as enacted or effective', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-007',
      name: 'Draft Delimitation Proposal Notice',
      publisher: 'Delimitation Commission Draft',
      sourceType: 'commission_feed',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'draft_proposal',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const snapshot = await captureAdapter.capture(source);
    const candidate = await normalizer.normalize(snapshot, source);

    // Set proposal to draft
    candidate.proposalData.status = 'draft';
    candidate.isProposed = true;

    // Falsely claiming OFFICIAL on a draft proposal must be caught by validation
    candidate.normalizedDataStatus = 'OFFICIAL';
    const validation = await validator.validate(candidate, source);
    assert.equal(validation.validationStatus, 'REJECTED');
    assert.ok(validation.errors.some((e) => e.includes('DATA_STATUS_VIOLATION')));

    // Setting dataStatus to legitimate UNVERIFIED or SCENARIO must pass
    candidate.normalizedDataStatus = 'UNVERIFIED';
    const validResult = await validator.validate(candidate, source);
    assert.equal(validResult.validationStatus, 'PASSED');
    assert.equal(candidate.isProposed, true, 'Draft proposal must retain isProposed=true');
  });

  // ─── 8. Source retrieval timeout ───
  test('Test 8 [Source retrieval timeout]: Failure is recorded; prior accepted data remains intact', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-008',
      name: 'Timeout Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const run1 = await orchestrator.runPipeline('SRC-TG-008');
    assert.equal(run1.outcome, 'SUCCESS');
    const originalVersionId = run1.acceptedVersion.id;

    // Execute run with simulated timeout
    const timeoutRun = await orchestrator.runPipeline('SRC-TG-008', {
      mockPayloadProvider: async () => {
        const err = new Error('Request timeout after 15000ms');
        err.name = 'AbortError';
        throw err;
      },
    });

    assert.equal(timeoutRun.outcome, 'RETRY_PENDING');
    assert.equal(timeoutRun.snapshot.captureOutcome, 'TIMEOUT');

    // Verify source health recorded failure
    const updatedSource = await repo.getSource('SRC-TG-008');
    assert.equal(updatedSource.consecutiveFailures, 1);
    assert.ok(updatedSource.lastError.includes('timeout'));

    // Verify prior accepted version remains intact and unaffected
    const latestVersion = await repo.getLatestAcceptedVersionForSource('SRC-TG-008');
    assert.equal(latestVersion.id, originalVersionId);
  });

  // ─── 9. Source disappearance ───
  test('Test 9 [Source disappearance]: No implicit deletion of accepted records or geography', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-009',
      name: 'Disappearing Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const run1 = await orchestrator.runPipeline('SRC-TG-009');
    assert.equal(run1.outcome, 'SUCCESS');
    const originalVersionId = run1.acceptedVersion.id;

    // Simulate source 404 / disappearance
    const run404 = await orchestrator.runPipeline('SRC-TG-009', {
      mockPayloadProvider: async () => {
        const err = new Error('HTTP 404 Not Found: Gazette record removed');
        throw err;
      },
    });

    assert.equal(run404.outcome, 'FAILED');

    // Verify that accepted version was NOT deleted
    const accepted = await repo.getAcceptedVersion(originalVersionId);
    assert.ok(accepted, 'Accepted version must persist even if source disappears');
  });

  // ─── 10. Version history ───
  test('Test 10 [Version history]: Both old and new accepted versions remain queryable', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-010',
      name: 'Versioned Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    // Version 1
    const run1 = await orchestrator.runPipeline('SRC-TG-010');
    assert.equal(run1.outcome, 'SUCCESS');
    const v1Id = run1.acceptedVersion.id;

    // Version 2 (changed fixture)
    source.canonicalUrl = changedFixturePath;
    await repo.saveSource(source);

    const run2 = await orchestrator.runPipeline('SRC-TG-010');
    assert.equal(run2.outcome, 'SUCCESS');
    const v2Id = run2.acceptedVersion.id;

    // Query both versions
    const v1 = await repo.getAcceptedVersion(v1Id);
    const v2 = await repo.getAcceptedVersion(v2Id);
    assert.ok(v1, 'Version 1 must remain queryable');
    assert.ok(v2, 'Version 2 must remain queryable');
    assert.equal(v2.previousVersionId, v1.id, 'Version 2 must point to Version 1 as predecessor');

    const allVersions = await repo.listAcceptedVersionsForSource('SRC-TG-010');
    assert.equal(allVersions.length, 2, 'Must list both versions in history');
  });

  // ─── 11. Deterministic replay ───
  test('Test 11 [Deterministic replay]: Identical snapshot and processor version produce identical normalized output and comparison', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-011',
      name: 'Replay Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const run1 = await orchestrator.runPipeline('SRC-TG-011');
    assert.equal(run1.outcome, 'SUCCESS');
    const snapshotId = run1.snapshot.id;

    // Replay the exact snapshot without fetching from source
    const replayResult = await orchestrator.replaySnapshot(snapshotId);
    assert.equal(replayResult.outcome, 'NO_CHANGE');
    assert.equal(replayResult.candidate.parserVersion, run1.candidate.parserVersion);
    assert.equal(replayResult.acceptedVersion.id, run1.acceptedVersion.id);
  });

  // ─── 12. Concurrent processing ───
  test('Test 12 [Concurrent processing]: Concurrent duplicate runs do not create duplicate accepted versions or events', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-012',
      name: 'Concurrency Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    // Launch two parallel runs for the same source
    const p1 = orchestrator.runPipeline('SRC-TG-012');
    const p2 = orchestrator.runPipeline('SRC-TG-012');

    const results = await Promise.allSettled([p1, p2]);
    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.outcome === 'SUCCESS').length;
    const conflictCount = results.filter((r) => r.status === 'rejected' && r.reason.message.includes('CONCURRENT_RUN_CONFLICT')).length;

    assert.equal(successCount, 1, 'Exactly one concurrent run must proceed to SUCCESS');
    assert.equal(conflictCount, 1, 'The competing run must be rejected with CONCURRENT_RUN_CONFLICT');

    // Confirm only 1 version exists in repo
    const versions = await repo.listAcceptedVersionsForSource('SRC-TG-012');
    assert.equal(versions.length, 1);
  });

  // ─── 13. Notification creation ───
  test('Test 13 [Notification creation]: A qualifying accepted change generates the expected event', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-013',
      name: 'Notification Source',
      publisher: 'ECI',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const run = await orchestrator.runPipeline('SRC-TG-013');
    assert.equal(run.outcome, 'SUCCESS');
    assert.ok(run.notificationEvent, 'Must generate notification event');
    assert.equal(run.notificationEvent.stateCode, 'TG');
    assert.equal(run.notificationEvent.eventCategory, 'OFFICIAL_PUBLICATION');
    assert.ok(run.notificationEvent.deduplicationKey.startsWith('delim-notif-'));
  });

  // ─── 14. Notification retry ───
  test('Test 14 [Notification retry]: Failed delivery can be retried without duplicate user-visible delivery', async () => {
    let failFirstAttempt = true;
    const flakyProvider = {
      sendPush: async (params) => {
        if (failFirstAttempt) {
          failFirstAttempt = false;
          throw new Error('Push gateway 503 unavailable');
        }
        return { recipientCount: 5, deliveredCount: 5, failedCount: 0 };
      },
    };

    const flakyNotifier = new Notifier(repo, flakyProvider);

    const dummyVersion = {
      id: 'v-retry-1',
      sourceId: 'SRC-1',
      versionTag: 'v1.0.0',
      snapshotId: 'sn-1',
      candidateId: 'c-1',
      validationId: 'val-1',
      comparisonId: 'comp-1',
      contentSha256: 'a'.repeat(64),
      parserVersion: 'v1.0.0',
      dataStatus: 'OFFICIAL',
      acceptedAt: new Date().toISOString(),
      acceptedBy: 'test',
    };

    const dummyCandidate = {
      id: 'c-1',
      snapshotId: 'sn-1',
      sourceId: 'SRC-1',
      parserVersion: 'v1.0.0',
      proposalData: { stateCode: 'TG', title: 'Test', currentSeats: 119, proposedSeats: 119, currentScSeats: 19, currentStSeats: 12, proposedScSeats: 19, proposedStSeats: 12, status: 'final' },
      constituencyMappings: [],
      normalizedDataStatus: 'OFFICIAL',
      isProposed: false,
      normalizedAt: new Date().toISOString(),
    };

    const dummyComparison = {
      id: 'comp-1',
      candidateId: 'c-1',
      isMaterialChange: true,
      classification: 'MATERIAL_CHANGE',
      addedRecords: [],
      removedRecords: [],
      changedRecords: [],
      unchangedRecords: [],
      metadataDiff: {},
      comparisonSummary: 'Test summary',
      comparedAt: new Date().toISOString(),
    };

    const { event } = await flakyNotifier.createNotificationEvent(dummyVersion, dummyCandidate, dummyComparison);
    assert.equal(event.dispatchStatus, 'PENDING');

    // Attempt 1: fails
    const attempt1 = await flakyNotifier.dispatchEvent(event.id);
    assert.equal(attempt1.dispatchStatus, 'FAILED');

    // Attempt 2: retry succeeds
    const attempt2 = await flakyNotifier.dispatchEvent(event.id, { forceRetry: true });
    assert.equal(attempt2.dispatchStatus, 'SENT');
    assert.equal(attempt2.deliveredCount, 5);

    // Attempt 3: duplicate dispatch without forceRetry is idempotent
    const attempt3 = await flakyNotifier.dispatchEvent(event.id);
    assert.equal(attempt3.dispatchStatus, 'SENT');
  });

  // ─── 15. Recipient eligibility ───
  test('Test 15 [Recipient eligibility]: Notifications respect the applicable geographic subscription and preferences', async () => {
    let capturedTargetState = null;
    const geoFilterProvider = {
      sendPush: async (params) => {
        capturedTargetState = params.stateCode;
        return { recipientCount: 25, deliveredCount: 25, failedCount: 0 };
      },
    };

    const geoNotifier = new Notifier(repo, geoFilterProvider);

    const dummyVersion = {
      id: 'v-geo-1',
      sourceId: 'SRC-TG-GEO',
      versionTag: 'v1.0.0',
      snapshotId: 'sn-1',
      candidateId: 'c-1',
      validationId: 'val-1',
      comparisonId: 'comp-1',
      contentSha256: 'b'.repeat(64),
      parserVersion: 'v1.0.0',
      dataStatus: 'OFFICIAL',
      acceptedAt: new Date().toISOString(),
      acceptedBy: 'test',
    };

    const dummyCandidate = {
      id: 'c-1',
      snapshotId: 'sn-1',
      sourceId: 'SRC-TG-GEO',
      parserVersion: 'v1.0.0',
      proposalData: { stateCode: 'TG', title: 'Telangana Notice', currentSeats: 119, proposedSeats: 119, currentScSeats: 19, currentStSeats: 12, proposedScSeats: 19, proposedStSeats: 12, status: 'final' },
      constituencyMappings: [{ stateCode: 'TG', oldAcNo: 58, oldName: 'Malakpet', newAcNo: 58, newName: 'Malakpet', overlapPercentage: 100 }],
      normalizedDataStatus: 'OFFICIAL',
      isProposed: false,
      normalizedAt: new Date().toISOString(),
    };

    const dummyComparison = {
      id: 'comp-1',
      candidateId: 'c-1',
      isMaterialChange: true,
      classification: 'MATERIAL_CHANGE',
      addedRecords: [],
      removedRecords: [],
      changedRecords: [],
      unchangedRecords: [],
      metadataDiff: {},
      comparisonSummary: 'Targeted geographic delimitation notice',
      comparedAt: new Date().toISOString(),
    };

    const { event } = await geoNotifier.createNotificationEvent(dummyVersion, dummyCandidate, dummyComparison);
    assert.equal(event.stateCode, 'TG');

    await geoNotifier.dispatchEvent(event.id);
    assert.equal(capturedTargetState, 'TG', 'Notification push must target users subscribed to stateCode TG');
  });

  // ─── 16. Publication failure ───
  test('Test 16 [Publication failure]: System records failure and does not falsely report publication success', async () => {
    const dummyVersion = {
      id: 'v-fail-1',
      sourceId: 'SRC-1',
      versionTag: 'v1.0.0',
      snapshotId: 'sn-1',
      candidateId: 'c-1',
      validationId: 'val-1',
      comparisonId: 'comp-1',
      contentSha256: 'c'.repeat(64),
      parserVersion: 'v1.0.0',
      dataStatus: 'OFFICIAL',
      acceptedAt: new Date().toISOString(),
      acceptedBy: 'test',
    };

    const dummyCandidate = {
      id: 'c-1',
      snapshotId: 'sn-1',
      sourceId: 'SRC-1',
      parserVersion: 'v1.0.0',
      proposalData: { stateCode: 'TG', title: 'Failed Proposal', currentSeats: 119, proposedSeats: 119, currentScSeats: 19, currentStSeats: 12, proposedScSeats: 19, proposedStSeats: 12, status: 'final' },
      constituencyMappings: [],
      normalizedDataStatus: 'OFFICIAL',
      isProposed: false,
      normalizedAt: new Date().toISOString(),
    };

    const rejectedValidation = {
      id: 'val-1',
      candidateId: 'c-1',
      validationStatus: 'REJECTED',
      checksRun: [],
      errors: ['Candidate rejected by validation gate'],
      warnings: [],
      evidenceReferences: [],
      validatedAt: new Date().toISOString(),
    };

    await assert.rejects(
      async () => {
        await publisher.publish(dummyVersion, dummyCandidate, rejectedValidation);
      },
      /PUBLICATION_GATE_FAILED/,
      'Publication must fail for rejected validation',
    );

    const publication = await repo.getPublicationByVersionId('v-fail-1');
    assert.equal(publication, null, 'No publication record must exist on publication gate failure');
  });

  // ─── 17. Publication retry ───
  test('Test 17 [Publication retry]: Repeated publication does not duplicate the accepted publication', async () => {
    const dummyVersion = {
      id: 'v-pub-retry',
      sourceId: 'SRC-PUB',
      versionTag: 'v1.0.0',
      snapshotId: 'sn-1',
      candidateId: 'c-1',
      validationId: 'val-1',
      comparisonId: 'comp-1',
      contentSha256: 'd'.repeat(64),
      parserVersion: 'v1.0.0',
      dataStatus: 'OFFICIAL',
      acceptedAt: new Date().toISOString(),
      acceptedBy: 'test',
    };

    const dummyCandidate = {
      id: 'c-1',
      snapshotId: 'sn-1',
      sourceId: 'SRC-PUB',
      parserVersion: 'v1.0.0',
      proposalData: { stateCode: 'TG', proposalNumber: 'P-1', title: 'Published Proposal', currentSeats: 119, proposedSeats: 119, currentScSeats: 19, currentStSeats: 12, proposedScSeats: 19, proposedStSeats: 12, status: 'final' },
      constituencyMappings: [],
      normalizedDataStatus: 'OFFICIAL',
      isProposed: false,
      normalizedAt: new Date().toISOString(),
    };

    const passedValidation = {
      id: 'val-1',
      candidateId: 'c-1',
      validationStatus: 'PASSED',
      checksRun: [],
      errors: [],
      warnings: [],
      evidenceReferences: [],
      validatedAt: new Date().toISOString(),
    };

    // Publication 1
    const pub1 = await publisher.publish(dummyVersion, dummyCandidate, passedValidation);
    assert.equal(pub1.created, true);
    assert.equal(pub1.publication.publicationStatus, 'PUBLISHED');

    // Publication 2 (repeat retry)
    const pub2 = await publisher.publish(dummyVersion, dummyCandidate, passedValidation);
    assert.equal(pub2.created, false, 'Repeat publication must be idempotent');
    assert.equal(pub2.publication.id, pub1.publication.id, 'Must return same publication record');
  });

  // ─── 18. Authorization & SSRF Security ───
  test('Test 18 [Authorization & SSRF Security]: SSRF attempts and illegal protocols are rejected', async () => {
    // 1. SSRF on AWS / GCP metadata IP
    assert.throws(() => validateSourceUrl('http://169.254.169.254/latest/meta-data/'), SsrfSecurityError);

    // 2. SSRF on loopback
    assert.throws(() => validateSourceUrl('http://127.0.0.1:5432/'), SsrfSecurityError);
    assert.throws(() => validateSourceUrl('http://localhost:8080/'), SsrfSecurityError);

    // 3. SSRF on private RFC 1918 subnets
    assert.throws(() => validateSourceUrl('http://10.0.0.1/admin'), SsrfSecurityError);
    assert.throws(() => validateSourceUrl('http://172.16.0.5/'), SsrfSecurityError);
    assert.throws(() => validateSourceUrl('http://192.168.1.1/'), SsrfSecurityError);

    // 4. Forbidden schemes
    assert.throws(() => validateSourceUrl('file:///etc/passwd'), SsrfSecurityError);
    assert.throws(() => validateSourceUrl('gopher://evil.com/'), SsrfSecurityError);

    // 5. Valid external URL
    assert.doesNotThrow(() => validateSourceUrl('https://egazette.gov.in/orders/2026/notice.pdf'));
  });

  // ─── 19. Full integration ───
  test('Test 19 [Full integration]: The controlled source change traverses the entire eight-stage lifecycle', async () => {
    const source = await sourceRegistry.registerSource({
      id: 'SRC-TG-FULL',
      name: 'Full E2E Telangana Source',
      publisher: 'ECI Gazetted Authority',
      sourceType: 'gazette_extraordinary',
      canonicalUrl: initialFixturePath,
      geographicScope: 'IN-TG',
      subjectScope: 'delimitation_order',
      authorityClassification: 'statutory',
      retrievalMethod: 'file_fixture',
    });

    const result = await orchestrator.runPipeline('SRC-TG-FULL');
    assert.equal(result.outcome, 'SUCCESS');

    // Verify all 8 stages produced valid records
    assert.ok(result.snapshot, 'Stage 1: snapshot generated');
    assert.ok(result.candidate, 'Stage 2: candidate generated');
    assert.ok(result.validation, 'Stage 3: validation report generated');
    assert.equal(result.validation.validationStatus, 'PASSED');
    assert.ok(result.comparison, 'Stage 4: comparison generated');
    assert.ok(result.acceptedVersion, 'Stage 5: accepted version generated');
    assert.ok(result.notificationEvent, 'Stage 6: notification event generated');
    assert.equal(result.notificationEvent.dispatchStatus, 'SENT');
    assert.ok(result.publication, 'Stage 7: publication generated');
    assert.equal(result.publication.publicationStatus, 'PUBLISHED');
    assert.ok(result.stageDurationsMs['STAGE_1_CAPTURE'] !== undefined, 'Stage 8: stage durations recorded');

    // Verify operational run record
    const run = await repo.getRun(result.runId);
    assert.ok(run, 'Stage 8: operational run must be persisted in repository');
    assert.equal(run.outcome, 'SUCCESS');
  });
});
