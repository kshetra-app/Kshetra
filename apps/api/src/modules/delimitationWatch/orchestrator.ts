/**
 * Stage 8: Delimitation Watch Pipeline Orchestrator
 *
 * Coordinates the full 8-stage lifecycle:
 * SOURCE -> CAPTURE -> NORMALIZE -> VALIDATE -> COMPARE -> VERSION -> NOTIFY -> PUBLISH
 *
 * Key Capabilities:
 * - Single entry point for scheduled, manual, or webhook execution
 * - In-flight concurrency locking per source
 * - Deterministic replay of existing raw snapshots without re-fetching
 * - Stage duration telemetry and structured correlation tracking
 * - Explicit run outcomes: SUCCESS, NO_CHANGE, REJECTED, REVIEW_REQUIRED, RETRY_PENDING, FAILED
 */

import { randomUUID } from 'crypto';
import type {
  DelimitationWatchSource,
  DelimitationSnapshot,
  DelimitationCandidate,
  DelimitationValidation,
  DelimitationComparison,
  DelimitationAcceptedVersion,
  DelimitationNotificationEvent,
  DelimitationPublication,
  DelimitationWatchRun,
  DelimitationWatchPipelineResult,
  DelimitationWatchOptions,
  RunOutcome,
} from '@kshetra/shared';
import type { IDelimitationWatchRepository } from './persistence';
import { SourceRegistry } from './sourceRegistry';
import { CaptureAdapter, type CaptureOptions } from './captureAdapter';
import { Normalizer } from './normalizer';
import { CandidateValidator } from './validator';
import { BaselineComparator } from './comparator';
import { Versioner } from './versioner';
import { Notifier, type NotificationDispatchProvider } from './notifier';
import { Publisher } from './publisher';

export class DelimitationWatchOrchestrator {
  private readonly sourceRegistry: SourceRegistry;
  private readonly captureAdapter: CaptureAdapter;
  private readonly normalizer: Normalizer;
  private readonly validator: CandidateValidator;
  private readonly comparator: BaselineComparator;
  private readonly versioner: Versioner;
  private readonly notifier: Notifier;
  private readonly publisher: Publisher;

  // Active in-flight locks per source
  private readonly activeSourceLocks = new Set<string>();

  constructor(
    private readonly repo: IDelimitationWatchRepository,
    dispatchProvider?: NotificationDispatchProvider,
  ) {
    this.sourceRegistry = new SourceRegistry(this.repo);
    this.captureAdapter = new CaptureAdapter(this.repo);
    this.normalizer = new Normalizer(this.repo);
    this.validator = new CandidateValidator(this.repo);
    this.comparator = new BaselineComparator(this.repo);
    this.versioner = new Versioner(this.repo);
    this.notifier = new Notifier(this.repo, dispatchProvider);
    this.publisher = new Publisher(this.repo);
  }

  /**
   * Primary entry point: Runs the full 8-stage pipeline for a given source.
   */
  async runPipeline(
    sourceId: string,
    options: DelimitationWatchOptions & CaptureOptions = {},
  ): Promise<DelimitationWatchPipelineResult> {
    const correlationId = options.correlationId || randomUUID();
    const runId = randomUUID();
    const startTime = Date.now();
    const stageDurations: Record<string, number> = {};

    // 1. Concurrency guard per source
    if (this.activeSourceLocks.has(sourceId)) {
      throw new Error(`CONCURRENT_RUN_CONFLICT: A Delimitation Watch run is already active for source '${sourceId}'`);
    }

    this.activeSourceLocks.add(sourceId);

    let snapshot: DelimitationSnapshot | undefined;
    let candidate: DelimitationCandidate | undefined;
    let validation: DelimitationValidation | undefined;
    let comparison: DelimitationComparison | undefined;
    let acceptedVersion: DelimitationAcceptedVersion | undefined;
    let notificationEvent: DelimitationNotificationEvent | undefined;
    let publication: DelimitationPublication | undefined;
    let runOutcome: RunOutcome = 'SUCCESS';
    let errorMessage: string | undefined;

    try {
      // ─── STAGE 1: SOURCE & CAPTURE ───
      const stage1Start = Date.now();
      const source = await this.sourceRegistry.getSource(sourceId);
      if (!source) {
        throw new Error(`SOURCE_NOT_FOUND: Registered source '${sourceId}' does not exist`);
      }
      if (!source.isActive) {
        throw new Error(`SOURCE_INACTIVE: Registered source '${sourceId}' is disabled`);
      }

      if (options.forceReplaySnapshotId) {
        const found = await this.repo.getSnapshot(options.forceReplaySnapshotId);
        if (!found) {
          throw new Error(`SNAPSHOT_NOT_FOUND: Force replay snapshot '${options.forceReplaySnapshotId}' not found`);
        }
        snapshot = found;
      } else {
        snapshot = await this.captureAdapter.capture(source, options);
      }
      stageDurations['STAGE_1_CAPTURE'] = Date.now() - stage1Start;

      if (snapshot.captureOutcome !== 'SUCCESS' && snapshot.captureOutcome !== 'UNCHANGED') {
        runOutcome = snapshot.captureOutcome === 'TIMEOUT' ? 'RETRY_PENDING' : 'FAILED';
        errorMessage = `Capture failed with outcome: ${snapshot.captureOutcome}`;
        return this.completeRun({
          runId,
          correlationId,
          sourceId,
          outcome: runOutcome,
          snapshot,
          stageDurationsMs: stageDurations,
          totalDurationMs: Date.now() - startTime,
          errorMessage,
        });
      }

      // If source capture is UNCHANGED, check if we already have an accepted baseline
      const latestBaseline = await this.repo.getLatestAcceptedVersionForSource(sourceId);

      if (snapshot.captureOutcome === 'UNCHANGED' && latestBaseline) {
        runOutcome = 'NO_CHANGE';
        return this.completeRun({
          runId,
          correlationId,
          sourceId,
          outcome: 'NO_CHANGE',
          snapshot,
          acceptedVersion: latestBaseline,
          stageDurationsMs: stageDurations,
          totalDurationMs: Date.now() - startTime,
        });
      }

      // ─── STAGE 2: NORMALIZE ───
      const stage2Start = Date.now();
      candidate = await this.normalizer.normalize(snapshot, source);
      stageDurations['STAGE_2_NORMALIZE'] = Date.now() - stage2Start;

      // ─── STAGE 3: VALIDATE ───
      const stage3Start = Date.now();
      validation = await this.validator.validate(candidate, source, latestBaseline);
      stageDurations['STAGE_3_VALIDATE'] = Date.now() - stage3Start;

      if (validation.validationStatus === 'REJECTED') {
        runOutcome = 'REJECTED';
        errorMessage = `Validation rejected candidate: ${validation.errors.join('; ')}`;
        return this.completeRun({
          runId,
          correlationId,
          sourceId,
          outcome: 'REJECTED',
          snapshot,
          candidate,
          validation,
          stageDurationsMs: stageDurations,
          totalDurationMs: Date.now() - startTime,
          errorMessage,
        });
      }

      // ─── STAGE 4: COMPARE ───
      const stage4Start = Date.now();
      comparison = await this.comparator.compare(candidate, latestBaseline);
      stageDurations['STAGE_4_COMPARE'] = Date.now() - stage4Start;

      if (!comparison.isMaterialChange && latestBaseline) {
        runOutcome = 'NO_CHANGE';
        return this.completeRun({
          runId,
          correlationId,
          sourceId,
          outcome: 'NO_CHANGE',
          snapshot,
          candidate,
          validation,
          comparison,
          acceptedVersion: latestBaseline,
          stageDurationsMs: stageDurations,
          totalDurationMs: Date.now() - startTime,
        });
      }

      // ─── STAGE 5: VERSION ───
      const stage5Start = Date.now();
      const versionResult = await this.versioner.acceptVersion(
        candidate,
        snapshot,
        validation,
        comparison,
        latestBaseline,
      );
      acceptedVersion = versionResult.version;
      stageDurations['STAGE_5_VERSION'] = Date.now() - stage5Start;

      // ─── STAGE 6: NOTIFY ───
      const stage6Start = Date.now();
      const notifResult = await this.notifier.createNotificationEvent(
        acceptedVersion,
        candidate,
        comparison,
      );
      notificationEvent = notifResult.event;

      // Dispatch notification
      notificationEvent = await this.notifier.dispatchEvent(notificationEvent.id);
      stageDurations['STAGE_6_NOTIFY'] = Date.now() - stage6Start;

      // ─── STAGE 7: PUBLISH ───
      const stage7Start = Date.now();
      const pubResult = await this.publisher.publish(acceptedVersion, candidate, validation);
      publication = pubResult.publication;
      stageDurations['STAGE_7_PUBLISH'] = Date.now() - stage7Start;

      runOutcome = validation.validationStatus === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'SUCCESS';

      return this.completeRun({
        runId,
        correlationId,
        sourceId,
        outcome: runOutcome,
        snapshot,
        candidate,
        validation,
        comparison,
        acceptedVersion,
        notificationEvent,
        publication,
        stageDurationsMs: stageDurations,
        totalDurationMs: Date.now() - startTime,
      });
    } catch (err: any) {
      runOutcome = 'FAILED';
      errorMessage = err.message;
      return this.completeRun({
        runId,
        correlationId,
        sourceId,
        outcome: 'FAILED',
        snapshot,
        candidate,
        validation,
        comparison,
        acceptedVersion,
        notificationEvent,
        publication,
        stageDurationsMs: stageDurations,
        totalDurationMs: Date.now() - startTime,
        errorMessage,
      });
    } finally {
      this.activeSourceLocks.delete(sourceId);
    }
  }

  /**
   * Deterministic Replay: Replays an existing snapshot without fetching.
   */
  async replaySnapshot(snapshotId: string, options: DelimitationWatchOptions = {}): Promise<DelimitationWatchPipelineResult> {
    const snapshot = await this.repo.getSnapshot(snapshotId);
    if (!snapshot) {
      throw new Error(`SNAPSHOT_NOT_FOUND: Snapshot '${snapshotId}' not found for replay`);
    }

    return this.runPipeline(snapshot.sourceId, {
      ...options,
      forceReplaySnapshotId: snapshotId,
    });
  }

  private async completeRun(result: DelimitationWatchPipelineResult): Promise<DelimitationWatchPipelineResult> {
    const runRecord: DelimitationWatchRun = {
      id: result.runId,
      correlationId: result.correlationId,
      sourceId: result.sourceId,
      runType: 'SCHEDULED',
      snapshotId: result.snapshot?.id,
      candidateId: result.candidate?.id,
      validationId: result.validation?.id,
      comparisonId: result.comparison?.id,
      versionId: result.acceptedVersion?.id,
      eventId: result.notificationEvent?.id,
      publicationId: result.publication?.id,
      outcome: result.outcome,
      stageDurationsMs: result.stageDurationsMs,
      totalDurationMs: result.totalDurationMs,
      errorDetails: result.errorMessage,
      createdAt: new Date().toISOString(),
    };

    await this.repo.saveRun(runRecord);
    return result;
  }
}
