/**
 * Persistence layer for Delimitation Watch Engine (Job 023)
 *
 * Provides:
 * - IDelimitationWatchRepository: Repository contract
 * - InMemoryDelimitationWatchRepository: Isolated in-memory repository for unit & fault tests
 * - PostgresDelimitationWatchRepository: Production repository backed by PostgreSQL/PGlite (Migration 071)
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
  NotificationDispatchStatus,
} from '@kshetra/shared';

export interface IDelimitationWatchRepository {
  // Stage 1: Sources & Snapshots
  saveSource(source: DelimitationWatchSource): Promise<void>;
  getSource(sourceId: string): Promise<DelimitationWatchSource | null>;
  listSources(): Promise<DelimitationWatchSource[]>;
  updateSourceHealth(
    sourceId: string,
    updates: {
      lastAttemptedAt?: string;
      lastSuccessfulAt?: string;
      lastHttpStatus?: number;
      lastEtag?: string;
      lastModifiedHeader?: string;
      lastContentHash?: string;
      consecutiveFailures?: number;
      lastError?: string;
    },
  ): Promise<void>;

  saveSnapshot(snapshot: DelimitationSnapshot): Promise<void>;
  getSnapshot(snapshotId: string): Promise<DelimitationSnapshot | null>;
  getLatestSnapshotForSource(sourceId: string): Promise<DelimitationSnapshot | null>;

  // Stage 2: Candidates
  saveCandidate(candidate: DelimitationCandidate): Promise<void>;
  getCandidate(candidateId: string): Promise<DelimitationCandidate | null>;

  // Stage 3: Validations
  saveValidation(validation: DelimitationValidation): Promise<void>;
  getValidation(validationId: string): Promise<DelimitationValidation | null>;
  getValidationByCandidateId(candidateId: string): Promise<DelimitationValidation | null>;

  // Stage 4: Comparisons
  saveComparison(comparison: DelimitationComparison): Promise<void>;
  getComparison(comparisonId: string): Promise<DelimitationComparison | null>;

  // Stage 5: Accepted Versions
  saveAcceptedVersion(version: DelimitationAcceptedVersion): Promise<void>;
  getAcceptedVersion(versionId: string): Promise<DelimitationAcceptedVersion | null>;
  getAcceptedVersionByHash(sourceId: string, contentSha256: string): Promise<DelimitationAcceptedVersion | null>;
  getLatestAcceptedVersionForSource(sourceId: string): Promise<DelimitationAcceptedVersion | null>;
  listAcceptedVersionsForSource(sourceId: string): Promise<DelimitationAcceptedVersion[]>;

  // Stage 6: Notification Events
  saveNotificationEvent(event: DelimitationNotificationEvent): Promise<void>;
  getNotificationEvent(eventId: string): Promise<DelimitationNotificationEvent | null>;
  getNotificationEventByDedupKey(dedupKey: string): Promise<DelimitationNotificationEvent | null>;
  updateNotificationDispatchStatus(
    eventId: string,
    status: NotificationDispatchStatus,
    stats?: { deliveredCount?: number; failedCount?: number; errorMessage?: string },
  ): Promise<void>;

  // Stage 7: Publications
  savePublication(publication: DelimitationPublication): Promise<void>;
  getPublicationByVersionId(versionId: string): Promise<DelimitationPublication | null>;

  // Stage 8: Runs
  saveRun(run: DelimitationWatchRun): Promise<void>;
  getRun(runId: string): Promise<DelimitationWatchRun | null>;
  listRunsForSource(sourceId: string): Promise<DelimitationWatchRun[]>;

  // Distributed Concurrency & Health
  acquireSourceLock(sourceId: string, lockToken: string, ttlMs?: number): Promise<boolean>;
  releaseSourceLock(sourceId: string, lockToken: string): Promise<void>;
  isDurable(): boolean;
  checkHealth(): Promise<{ healthy: boolean; details?: string }>;
}

/**
 * In-Memory Repository Implementation
 * Ideal for deterministic tests, negative path tests, and local sandboxing.
 */
export class InMemoryDelimitationWatchRepository implements IDelimitationWatchRepository {
  private sources = new Map<string, DelimitationWatchSource>();
  private snapshots = new Map<string, DelimitationSnapshot>();
  private candidates = new Map<string, DelimitationCandidate>();
  private validations = new Map<string, DelimitationValidation>();
  private comparisons = new Map<string, DelimitationComparison>();
  private acceptedVersions = new Map<string, DelimitationAcceptedVersion>();
  private notificationEvents = new Map<string, DelimitationNotificationEvent>();
  private publications = new Map<string, DelimitationPublication>();
  private runs = new Map<string, DelimitationWatchRun>();
  private sourceLocks = new Map<string, { token: string; expiresAt: number }>();

  async saveSource(source: DelimitationWatchSource): Promise<void> {
    this.sources.set(source.id, { ...source });
  }

  async getSource(sourceId: string): Promise<DelimitationWatchSource | null> {
    const s = this.sources.get(sourceId);
    return s ? { ...s } : null;
  }

  async listSources(): Promise<DelimitationWatchSource[]> {
    return Array.from(this.sources.values()).map((s) => ({ ...s }));
  }

  async updateSourceHealth(
    sourceId: string,
    updates: {
      lastAttemptedAt?: string;
      lastSuccessfulAt?: string;
      lastHttpStatus?: number;
      lastEtag?: string;
      lastModifiedHeader?: string;
      lastContentHash?: string;
      consecutiveFailures?: number;
      lastError?: string;
    },
  ): Promise<void> {
    const s = this.sources.get(sourceId);
    if (!s) return;
    this.sources.set(sourceId, {
      ...s,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async saveSnapshot(snapshot: DelimitationSnapshot): Promise<void> {
    this.snapshots.set(snapshot.id, { ...snapshot });
  }

  async getSnapshot(snapshotId: string): Promise<DelimitationSnapshot | null> {
    const sn = this.snapshots.get(snapshotId);
    return sn ? { ...sn } : null;
  }

  async getLatestSnapshotForSource(sourceId: string): Promise<DelimitationSnapshot | null> {
    const forSource = Array.from(this.snapshots.values()).filter((sn) => sn.sourceId === sourceId);
    if (forSource.length === 0) return null;
    forSource.sort((a, b) => new Date(b.retrievedAt).getTime() - new Date(a.retrievedAt).getTime());
    return { ...forSource[0] };
  }

  async saveCandidate(candidate: DelimitationCandidate): Promise<void> {
    this.candidates.set(candidate.id, { ...candidate });
  }

  async getCandidate(candidateId: string): Promise<DelimitationCandidate | null> {
    const c = this.candidates.get(candidateId);
    return c ? { ...c } : null;
  }

  async saveValidation(validation: DelimitationValidation): Promise<void> {
    this.validations.set(validation.id, { ...validation });
  }

  async getValidation(validationId: string): Promise<DelimitationValidation | null> {
    const v = this.validations.get(validationId);
    return v ? { ...v } : null;
  }

  async getValidationByCandidateId(candidateId: string): Promise<DelimitationValidation | null> {
    const forCandidate = Array.from(this.validations.values()).find((v) => v.candidateId === candidateId);
    return forCandidate ? { ...forCandidate } : null;
  }

  async saveComparison(comparison: DelimitationComparison): Promise<void> {
    this.comparisons.set(comparison.id, { ...comparison });
  }

  async getComparison(comparisonId: string): Promise<DelimitationComparison | null> {
    const comp = this.comparisons.get(comparisonId);
    return comp ? { ...comp } : null;
  }

  async saveAcceptedVersion(version: DelimitationAcceptedVersion): Promise<void> {
    // Unique check (sourceId, contentSha256)
    const existing = await this.getAcceptedVersionByHash(version.sourceId, version.contentSha256);
    if (existing && existing.id !== version.id) {
      throw new Error(`UNIQUE_CONSTRAINT_VIOLATION: Version with hash ${version.contentSha256} already exists for source ${version.sourceId}`);
    }
    this.acceptedVersions.set(version.id, { ...version });
  }

  async getAcceptedVersion(versionId: string): Promise<DelimitationAcceptedVersion | null> {
    const v = this.acceptedVersions.get(versionId);
    return v ? { ...v } : null;
  }

  async getAcceptedVersionByHash(sourceId: string, contentSha256: string): Promise<DelimitationAcceptedVersion | null> {
    const found = Array.from(this.acceptedVersions.values()).find(
      (v) => v.sourceId === sourceId && v.contentSha256 === contentSha256,
    );
    return found ? { ...found } : null;
  }

  async getLatestAcceptedVersionForSource(sourceId: string): Promise<DelimitationAcceptedVersion | null> {
    const forSource = Array.from(this.acceptedVersions.values()).filter((v) => v.sourceId === sourceId);
    if (forSource.length === 0) return null;
    forSource.sort((a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime());
    return { ...forSource[0] };
  }

  async listAcceptedVersionsForSource(sourceId: string): Promise<DelimitationAcceptedVersion[]> {
    const forSource = Array.from(this.acceptedVersions.values()).filter((v) => v.sourceId === sourceId);
    forSource.sort((a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime());
    return forSource.map((v) => ({ ...v }));
  }

  async saveNotificationEvent(event: DelimitationNotificationEvent): Promise<void> {
    const existing = await this.getNotificationEventByDedupKey(event.deduplicationKey);
    if (existing && existing.id !== event.id) {
      throw new Error(`UNIQUE_CONSTRAINT_VIOLATION: Event with deduplication key ${event.deduplicationKey} already exists`);
    }
    this.notificationEvents.set(event.id, { ...event });
  }

  async getNotificationEvent(eventId: string): Promise<DelimitationNotificationEvent | null> {
    const e = this.notificationEvents.get(eventId);
    return e ? { ...e } : null;
  }

  async getNotificationEventByDedupKey(dedupKey: string): Promise<DelimitationNotificationEvent | null> {
    const found = Array.from(this.notificationEvents.values()).find((e) => e.deduplicationKey === dedupKey);
    return found ? { ...found } : null;
  }

  async updateNotificationDispatchStatus(
    eventId: string,
    status: NotificationDispatchStatus,
    stats?: { deliveredCount?: number; failedCount?: number; errorMessage?: string },
  ): Promise<void> {
    const e = this.notificationEvents.get(eventId);
    if (!e) return;
    this.notificationEvents.set(eventId, {
      ...e,
      dispatchStatus: status,
      deliveredCount: stats?.deliveredCount ?? e.deliveredCount,
      failedCount: stats?.failedCount ?? e.failedCount,
      errorMessage: stats?.errorMessage ?? e.errorMessage,
      lastAttemptAt: new Date().toISOString(),
    });
  }

  async savePublication(publication: DelimitationPublication): Promise<void> {
    const existing = await this.getPublicationByVersionId(publication.versionId);
    if (existing && existing.id !== publication.id) {
      throw new Error(`UNIQUE_CONSTRAINT_VIOLATION: Publication already exists for version ${publication.versionId}`);
    }
    this.publications.set(publication.id, { ...publication });
  }

  async getPublicationByVersionId(versionId: string): Promise<DelimitationPublication | null> {
    const found = Array.from(this.publications.values()).find((p) => p.versionId === versionId);
    return found ? { ...found } : null;
  }

  async saveRun(run: DelimitationWatchRun): Promise<void> {
    this.runs.set(run.id, { ...run });
  }

  async getRun(runId: string): Promise<DelimitationWatchRun | null> {
    const r = this.runs.get(runId);
    return r ? { ...r } : null;
  }

  async listRunsForSource(sourceId: string): Promise<DelimitationWatchRun[]> {
    const forSource = Array.from(this.runs.values()).filter((r) => r.sourceId === sourceId);
    forSource.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return forSource.map((r) => ({ ...r }));
  }

  async acquireSourceLock(sourceId: string, lockToken: string, ttlMs = 60000): Promise<boolean> {
    const existing = this.sourceLocks.get(sourceId);
    const now = Date.now();
    if (existing && existing.expiresAt > now && existing.token !== lockToken) {
      return false;
    }
    this.sourceLocks.set(sourceId, { token: lockToken, expiresAt: now + ttlMs });
    return true;
  }

  async releaseSourceLock(sourceId: string, lockToken: string): Promise<void> {
    const existing = this.sourceLocks.get(sourceId);
    if (existing && existing.token === lockToken) {
      this.sourceLocks.delete(sourceId);
    }
  }

  isDurable(): boolean {
    return false;
  }

  async checkHealth(): Promise<{ healthy: boolean; details?: string }> {
    return { healthy: true, details: 'in_memory' };
  }
}

/**
 * PostgreSQL Repository Implementation
 * Backed by either pg client or PGlite instance conforming to Migration 071.
 */
export class PostgresDelimitationWatchRepository implements IDelimitationWatchRepository {
  private readonly db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> };

  constructor(db: { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }) {
    this.db = db;
  }

  isDurable(): boolean {
    return true;
  }

  async checkHealth(): Promise<{ healthy: boolean; details?: string }> {
    try {
      await this.db.query('SELECT 1 FROM delimitation_watch_sources LIMIT 1');
      return { healthy: true, details: 'postgres' };
    } catch (err: any) {
      return { healthy: false, details: err.message };
    }
  }

  async acquireSourceLock(sourceId: string, lockToken: string, ttlMs = 60000): Promise<boolean> {
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const query = `
      UPDATE delimitation_watch_sources
      SET locked_by = $1, locked_until = $2::timestamptz
      WHERE id = $3 AND (locked_until IS NULL OR locked_until < now() OR locked_by = $1)
      RETURNING id;
    `;
    const res = await this.db.query(query, [lockToken, expiresAt, sourceId]);
    return res.rows.length > 0;
  }

  async releaseSourceLock(sourceId: string, lockToken: string): Promise<void> {
    const query = `
      UPDATE delimitation_watch_sources
      SET locked_by = NULL, locked_until = NULL
      WHERE id = $1 AND locked_by = $2;
    `;
    await this.db.query(query, [sourceId, lockToken]);
  }

  async saveSource(s: DelimitationWatchSource): Promise<void> {
    const query = `
      INSERT INTO delimitation_watch_sources (
        id, name, publisher, source_type, canonical_url, geographic_scope,
        subject_scope, authority_classification, retrieval_method, polling_schedule,
        is_active, last_attempted_at, last_successful_at, last_http_status,
        last_etag, last_modified_header, last_content_hash, consecutive_failures,
        last_error, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        publisher = EXCLUDED.publisher,
        canonical_url = EXCLUDED.canonical_url,
        geographic_scope = EXCLUDED.geographic_scope,
        subject_scope = EXCLUDED.subject_scope,
        authority_classification = EXCLUDED.authority_classification,
        retrieval_method = EXCLUDED.retrieval_method,
        polling_schedule = EXCLUDED.polling_schedule,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata,
        updated_at = now();
    `;
    await this.db.query(query, [
      s.id,
      s.name,
      s.publisher,
      s.sourceType,
      s.canonicalUrl,
      s.geographicScope,
      s.subjectScope,
      s.authorityClassification,
      s.retrievalMethod,
      s.pollingSchedule || null,
      s.isActive,
      s.lastAttemptedAt || null,
      s.lastSuccessfulAt || null,
      s.lastHttpStatus || null,
      s.lastEtag || null,
      s.lastModifiedHeader || null,
      s.lastContentHash || null,
      s.consecutiveFailures,
      s.lastError || null,
      JSON.stringify(s.metadata || {}),
      s.createdAt || new Date().toISOString(),
      s.updatedAt || new Date().toISOString(),
    ]);
  }

  async getSource(sourceId: string): Promise<DelimitationWatchSource | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_watch_sources WHERE id = $1`, [sourceId]);
    if (res.rows.length === 0) return null;
    return this.mapSourceRow(res.rows[0]);
  }

  async listSources(): Promise<DelimitationWatchSource[]> {
    const res = await this.db.query(`SELECT * FROM delimitation_watch_sources ORDER BY id`);
    return res.rows.map(this.mapSourceRow);
  }

  async updateSourceHealth(
    sourceId: string,
    updates: {
      lastAttemptedAt?: string;
      lastSuccessfulAt?: string;
      lastHttpStatus?: number;
      lastEtag?: string;
      lastModifiedHeader?: string;
      lastContentHash?: string;
      consecutiveFailures?: number;
      lastError?: string;
    },
  ): Promise<void> {
    const query = `
      UPDATE delimitation_watch_sources SET
        last_attempted_at = COALESCE($2, last_attempted_at),
        last_successful_at = COALESCE($3, last_successful_at),
        last_http_status = COALESCE($4, last_http_status),
        last_etag = COALESCE($5, last_etag),
        last_modified_header = COALESCE($6, last_modified_header),
        last_content_hash = COALESCE($7, last_content_hash),
        consecutive_failures = COALESCE($8, consecutive_failures),
        last_error = $9,
        updated_at = now()
      WHERE id = $1
    `;
    await this.db.query(query, [
      sourceId,
      updates.lastAttemptedAt || null,
      updates.lastSuccessfulAt || null,
      updates.lastHttpStatus !== undefined ? updates.lastHttpStatus : null,
      updates.lastEtag || null,
      updates.lastModifiedHeader || null,
      updates.lastContentHash || null,
      updates.consecutiveFailures !== undefined ? updates.consecutiveFailures : null,
      updates.lastError || null,
    ]);
  }

  async saveSnapshot(sn: DelimitationSnapshot): Promise<void> {
    const query = `
      INSERT INTO delimitation_snapshots (
        id, source_id, retrieved_at, http_status, etag, last_modified,
        content_type, content_size_bytes, content_sha256, raw_content,
        declared_publication_date, declared_effective_date, capture_outcome,
        diagnostics, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;
    await this.db.query(query, [
      sn.id,
      sn.sourceId,
      sn.retrievedAt,
      sn.httpStatus,
      sn.etag || null,
      sn.lastModified || null,
      sn.contentType,
      sn.contentSizeBytes,
      sn.contentSha256,
      sn.rawContent,
      sn.declaredPublicationDate || null,
      sn.declaredEffectiveDate || null,
      sn.captureOutcome,
      JSON.stringify(sn.diagnostics || {}),
      sn.createdAt || new Date().toISOString(),
    ]);
  }

  async getSnapshot(snapshotId: string): Promise<DelimitationSnapshot | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_snapshots WHERE id = $1`, [snapshotId]);
    if (res.rows.length === 0) return null;
    return this.mapSnapshotRow(res.rows[0]);
  }

  async getLatestSnapshotForSource(sourceId: string): Promise<DelimitationSnapshot | null> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_snapshots WHERE source_id = $1 ORDER BY retrieved_at DESC LIMIT 1`,
      [sourceId],
    );
    if (res.rows.length === 0) return null;
    return this.mapSnapshotRow(res.rows[0]);
  }

  async saveCandidate(c: DelimitationCandidate): Promise<void> {
    const query = `
      INSERT INTO delimitation_candidates (
        id, snapshot_id, source_id, parser_version, proposal_data,
        constituency_mappings, normalized_data_status, is_proposed,
        instrument_type, instrument_identifier, legal_enactment_status, effective_date, official_decision_record,
        provenance_id, metadata, normalized_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;
    await this.db.query(query, [
      c.id,
      c.snapshotId,
      c.sourceId,
      c.parserVersion,
      JSON.stringify(c.proposalData),
      JSON.stringify(c.constituencyMappings || []),
      c.normalizedDataStatus,
      c.isProposed,
      c.proposalData?.instrumentType || c.legalEvidencePackage?.instrumentType || null,
      c.proposalData?.instrumentIdentifier || c.legalEvidencePackage?.instrumentIdentifier || null,
      c.proposalData?.legalEnactmentStatus || c.legalEvidencePackage?.enactmentStatus || null,
      c.proposalData?.effectiveDate || c.legalEvidencePackage?.effectiveDate || null,
      c.legalEvidenceRecord ? JSON.stringify(c.legalEvidenceRecord) : (c.legalEvidencePackage ? JSON.stringify(c.legalEvidencePackage) : null),
      c.provenanceId || null,
      JSON.stringify(c.metadata || {}),
      c.normalizedAt,
    ]);
  }

  async getCandidate(candidateId: string): Promise<DelimitationCandidate | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_candidates WHERE id = $1`, [candidateId]);
    if (res.rows.length === 0) return null;
    return this.mapCandidateRow(res.rows[0]);
  }

  async saveValidation(v: DelimitationValidation): Promise<void> {
    const query = `
      INSERT INTO delimitation_validations (
        id, candidate_id, validation_status, checks_run, errors, warnings,
        evidence_references, validated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    await this.db.query(query, [
      v.id,
      v.candidateId,
      v.validationStatus,
      JSON.stringify(v.checksRun),
      JSON.stringify(v.errors),
      JSON.stringify(v.warnings),
      JSON.stringify(v.evidenceReferences),
      v.validatedAt,
    ]);
  }

  async getValidation(validationId: string): Promise<DelimitationValidation | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_validations WHERE id = $1`, [validationId]);
    if (res.rows.length === 0) return null;
    return this.mapValidationRow(res.rows[0]);
  }

  async getValidationByCandidateId(candidateId: string): Promise<DelimitationValidation | null> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_validations WHERE candidate_id = $1 ORDER BY validated_at DESC LIMIT 1`,
      [candidateId],
    );
    if (res.rows.length === 0) return null;
    return this.mapValidationRow(res.rows[0]);
  }

  async saveComparison(comp: DelimitationComparison): Promise<void> {
    const query = `
      INSERT INTO delimitation_comparisons (
        id, candidate_id, baseline_version_id, is_material_change,
        classification, added_records, removed_records, changed_records,
        unchanged_records, metadata_diff, comparison_summary, compared_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;
    await this.db.query(query, [
      comp.id,
      comp.candidateId,
      comp.baselineVersionId || null,
      comp.isMaterialChange,
      comp.classification,
      JSON.stringify(comp.addedRecords),
      JSON.stringify(comp.removedRecords),
      JSON.stringify(comp.changedRecords),
      JSON.stringify(comp.unchangedRecords),
      JSON.stringify(comp.metadataDiff),
      comp.comparisonSummary,
      comp.comparedAt,
    ]);
  }

  async getComparison(comparisonId: string): Promise<DelimitationComparison | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_comparisons WHERE id = $1`, [comparisonId]);
    if (res.rows.length === 0) return null;
    return this.mapComparisonRow(res.rows[0]);
  }

  async saveAcceptedVersion(v: DelimitationAcceptedVersion): Promise<void> {
    const query = `
      INSERT INTO delimitation_accepted_versions (
        id, source_id, version_tag, snapshot_id, candidate_id,
        validation_id, comparison_id, previous_version_id, content_sha256,
        parser_version, data_status, effective_date,
        instrument_type, instrument_identifier, legal_enactment_status,
        proposal_id, accepted_at, accepted_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `;
    await this.db.query(query, [
      v.id,
      v.sourceId,
      v.versionTag,
      v.snapshotId,
      v.candidateId,
      v.validationId,
      v.comparisonId,
      v.previousVersionId || null,
      v.contentSha256,
      v.parserVersion,
      v.dataStatus,
      v.effectiveDate || null,
      v.instrumentType || v.legalInstrumentType || v.legalEvidencePackage?.instrumentType || null,
      v.instrumentIdentifier || v.legalEvidencePackage?.instrumentIdentifier || null,
      v.legalEnactmentStatus || v.legalEvidencePackage?.enactmentStatus || null,
      v.proposalId || null,
      v.acceptedAt,
      v.acceptedBy,
      JSON.stringify(v.metadata || {}),
    ]);
  }

  async getAcceptedVersion(versionId: string): Promise<DelimitationAcceptedVersion | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_accepted_versions WHERE id = $1`, [versionId]);
    if (res.rows.length === 0) return null;
    return this.mapAcceptedVersionRow(res.rows[0]);
  }

  async getAcceptedVersionByHash(sourceId: string, contentSha256: string): Promise<DelimitationAcceptedVersion | null> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_accepted_versions WHERE source_id = $1 AND content_sha256 = $2 LIMIT 1`,
      [sourceId, contentSha256],
    );
    if (res.rows.length === 0) return null;
    return this.mapAcceptedVersionRow(res.rows[0]);
  }

  async getLatestAcceptedVersionForSource(sourceId: string): Promise<DelimitationAcceptedVersion | null> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_accepted_versions WHERE source_id = $1 ORDER BY accepted_at DESC LIMIT 1`,
      [sourceId],
    );
    if (res.rows.length === 0) return null;
    return this.mapAcceptedVersionRow(res.rows[0]);
  }

  async listAcceptedVersionsForSource(sourceId: string): Promise<DelimitationAcceptedVersion[]> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_accepted_versions WHERE source_id = $1 ORDER BY accepted_at DESC`,
      [sourceId],
    );
    return res.rows.map(this.mapAcceptedVersionRow);
  }

  async saveNotificationEvent(e: DelimitationNotificationEvent): Promise<void> {
    const query = `
      INSERT INTO delimitation_notification_events (
        id, version_id, event_category, deduplication_key, state_code,
        affected_geography_ids, title, body, deep_link, data_status,
        dispatch_status, recipient_count, delivered_count, failed_count,
        last_attempt_at, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
    `;
    await this.db.query(query, [
      e.id,
      e.versionId,
      e.eventCategory,
      e.deduplicationKey,
      e.stateCode,
      JSON.stringify(e.affectedGeographyIds),
      e.title,
      e.body,
      e.deepLink,
      e.dataStatus,
      e.dispatchStatus,
      e.recipientCount,
      e.deliveredCount,
      e.failedCount,
      e.lastAttemptAt || null,
      e.errorMessage || null,
      e.createdAt,
    ]);
  }

  async getNotificationEvent(eventId: string): Promise<DelimitationNotificationEvent | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_notification_events WHERE id = $1`, [eventId]);
    if (res.rows.length === 0) return null;
    return this.mapNotificationRow(res.rows[0]);
  }

  async getNotificationEventByDedupKey(dedupKey: string): Promise<DelimitationNotificationEvent | null> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_notification_events WHERE deduplication_key = $1 LIMIT 1`,
      [dedupKey],
    );
    if (res.rows.length === 0) return null;
    return this.mapNotificationRow(res.rows[0]);
  }

  async updateNotificationDispatchStatus(
    eventId: string,
    status: NotificationDispatchStatus,
    stats?: { deliveredCount?: number; failedCount?: number; errorMessage?: string },
  ): Promise<void> {
    const query = `
      UPDATE delimitation_notification_events SET
        dispatch_status = $2,
        delivered_count = COALESCE($3, delivered_count),
        failed_count = COALESCE($4, failed_count),
        error_message = $5,
        last_attempt_at = now()
      WHERE id = $1
    `;
    await this.db.query(query, [
      eventId,
      status,
      stats?.deliveredCount !== undefined ? stats.deliveredCount : null,
      stats?.failedCount !== undefined ? stats.failedCount : null,
      stats?.errorMessage || null,
    ]);
  }

  async savePublication(p: DelimitationPublication): Promise<void> {
    const query = `
      INSERT INTO delimitation_publications (
        id, version_id, publication_status, publication_type, published_at, published_by,
        published_proposal_id, canonical_view_updated, error_message, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await this.db.query(query, [
      p.id,
      p.versionId,
      p.publicationStatus,
      p.publicationType || 'UNVERIFIED_NOTICE',
      p.publishedAt || null,
      p.publishedBy,
      p.publishedProposalId || null,
      p.canonicalViewUpdated,
      p.errorMessage || null,
      p.createdAt,
    ]);
  }

  async getPublicationByVersionId(versionId: string): Promise<DelimitationPublication | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_publications WHERE version_id = $1`, [versionId]);
    if (res.rows.length === 0) return null;
    return this.mapPublicationRow(res.rows[0]);
  }

  async saveRun(r: DelimitationWatchRun): Promise<void> {
    const query = `
      INSERT INTO delimitation_watch_runs (
        id, correlation_id, source_id, run_type, snapshot_id, candidate_id,
        validation_id, comparison_id, version_id, event_id, publication_id,
        outcome, stage_durations_ms, total_duration_ms, error_details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;
    await this.db.query(query, [
      r.id,
      r.correlationId,
      r.sourceId,
      r.runType,
      r.snapshotId || null,
      r.candidateId || null,
      r.validationId || null,
      r.comparisonId || null,
      r.versionId || null,
      r.eventId || null,
      r.publicationId || null,
      r.outcome,
      JSON.stringify(r.stageDurationsMs),
      r.totalDurationMs,
      r.errorDetails || null,
      r.createdAt,
    ]);
  }

  async getRun(runId: string): Promise<DelimitationWatchRun | null> {
    const res = await this.db.query(`SELECT * FROM delimitation_watch_runs WHERE id = $1`, [runId]);
    if (res.rows.length === 0) return null;
    return this.mapRunRow(res.rows[0]);
  }

  async listRunsForSource(sourceId: string): Promise<DelimitationWatchRun[]> {
    const res = await this.db.query(
      `SELECT * FROM delimitation_watch_runs WHERE source_id = $1 ORDER BY created_at DESC`,
      [sourceId],
    );
    return res.rows.map(this.mapRunRow);
  }

  private mapSourceRow(row: any): DelimitationWatchSource {
    return {
      id: row.id,
      name: row.name,
      publisher: row.publisher,
      sourceType: row.source_type,
      canonicalUrl: row.canonical_url,
      geographicScope: row.geographic_scope,
      subjectScope: row.subject_scope,
      authorityClassification: row.authority_classification,
      retrievalMethod: row.retrieval_method,
      pollingSchedule: row.polling_schedule || undefined,
      isActive: row.is_active,
      lastAttemptedAt: row.last_attempted_at ? new Date(row.last_attempted_at).toISOString() : undefined,
      lastSuccessfulAt: row.last_successful_at ? new Date(row.last_successful_at).toISOString() : undefined,
      lastHttpStatus: row.last_http_status || undefined,
      lastEtag: row.last_etag || undefined,
      lastModifiedHeader: row.last_modified_header || undefined,
      lastContentHash: row.last_content_hash || undefined,
      consecutiveFailures: row.consecutive_failures,
      lastError: row.last_error || undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  private mapSnapshotRow(row: any): DelimitationSnapshot {
    return {
      id: row.id,
      sourceId: row.source_id,
      retrievedAt: new Date(row.retrieved_at).toISOString(),
      httpStatus: row.http_status,
      etag: row.etag || undefined,
      lastModified: row.last_modified || undefined,
      contentType: row.content_type,
      contentSizeBytes: row.content_size_bytes,
      contentSha256: row.content_sha256,
      rawContent: row.raw_content,
      declaredPublicationDate: row.declared_publication_date || undefined,
      declaredEffectiveDate: row.declared_effective_date || undefined,
      captureOutcome: row.capture_outcome,
      diagnostics: typeof row.diagnostics === 'string' ? JSON.parse(row.diagnostics) : row.diagnostics || {},
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private mapCandidateRow(row: any): DelimitationCandidate {
    return {
      id: row.id,
      snapshotId: row.snapshot_id,
      sourceId: row.source_id,
      parserVersion: row.parser_version,
      proposalData: typeof row.proposal_data === 'string' ? JSON.parse(row.proposal_data) : row.proposal_data,
      constituencyMappings: typeof row.constituency_mappings === 'string' ? JSON.parse(row.constituency_mappings) : row.constituency_mappings || [],
      normalizedDataStatus: row.normalized_data_status,
      isProposed: row.is_proposed,
      provenanceId: row.provenance_id || undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      normalizedAt: new Date(row.normalized_at).toISOString(),
      hasLegalEvidence: Boolean(row.instrument_identifier && row.effective_date),
      legalEvidenceDecision: row.official_decision_record ? (typeof row.official_decision_record === 'string' ? JSON.parse(row.official_decision_record).decisionRationale : row.official_decision_record.decisionRationale) : undefined,
      legalEvidenceRecord: typeof row.official_decision_record === 'string' ? JSON.parse(row.official_decision_record) : row.official_decision_record || undefined,
    };
  }

  private mapValidationRow(row: any): DelimitationValidation {
    return {
      id: row.id,
      candidateId: row.candidate_id,
      validationStatus: row.validation_status,
      checksRun: typeof row.checks_run === 'string' ? JSON.parse(row.checks_run) : row.checks_run,
      errors: typeof row.errors === 'string' ? JSON.parse(row.errors) : row.errors || [],
      warnings: typeof row.warnings === 'string' ? JSON.parse(row.warnings) : row.warnings || [],
      evidenceReferences: typeof row.evidence_references === 'string' ? JSON.parse(row.evidence_references) : row.evidence_references || [],
      validatedAt: new Date(row.validated_at).toISOString(),
    };
  }

  private mapComparisonRow(row: any): DelimitationComparison {
    return {
      id: row.id,
      candidateId: row.candidate_id,
      baselineVersionId: row.baseline_version_id || undefined,
      isMaterialChange: row.is_material_change,
      classification: row.classification,
      addedRecords: typeof row.added_records === 'string' ? JSON.parse(row.added_records) : row.added_records || [],
      removedRecords: typeof row.removed_records === 'string' ? JSON.parse(row.removed_records) : row.removed_records || [],
      changedRecords: typeof row.changed_records === 'string' ? JSON.parse(row.changed_records) : row.changed_records || [],
      unchangedRecords: typeof row.unchanged_records === 'string' ? JSON.parse(row.unchanged_records) : row.unchanged_records || [],
      metadataDiff: typeof row.metadata_diff === 'string' ? JSON.parse(row.metadata_diff) : row.metadata_diff || {},
      comparisonSummary: row.comparison_summary,
      comparedAt: new Date(row.compared_at).toISOString(),
    };
  }

  private mapAcceptedVersionRow(row: any): DelimitationAcceptedVersion {
    return {
      id: row.id,
      sourceId: row.source_id,
      versionTag: row.version_tag,
      snapshotId: row.snapshot_id,
      candidateId: row.candidate_id,
      validationId: row.validation_id,
      comparisonId: row.comparison_id,
      previousVersionId: row.previous_version_id || undefined,
      contentSha256: row.content_sha256,
      parserVersion: row.parser_version,
      dataStatus: row.data_status,
      effectiveDate: row.effective_date ? new Date(row.effective_date).toISOString().split('T')[0] : undefined,
      instrumentType: row.instrument_type || undefined,
      instrumentIdentifier: row.instrument_identifier || undefined,
      legalEnactmentStatus: row.legal_enactment_status || undefined,
      hasLegalEvidence: Boolean(row.instrument_identifier && row.effective_date),
      legalInstrumentType: row.instrument_type || undefined,
      proposalId: row.proposal_id || undefined,
      acceptedAt: new Date(row.accepted_at).toISOString(),
      acceptedBy: row.accepted_by,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
    };
  }

  private mapNotificationRow(row: any): DelimitationNotificationEvent {
    return {
      id: row.id,
      versionId: row.version_id,
      eventCategory: row.event_category,
      deduplicationKey: row.deduplication_key,
      stateCode: row.state_code,
      affectedGeographyIds: typeof row.affected_geography_ids === 'string' ? JSON.parse(row.affected_geography_ids) : row.affected_geography_ids || [],
      title: row.title,
      body: row.body,
      deepLink: row.deep_link,
      dataStatus: row.data_status,
      dispatchStatus: row.dispatch_status,
      recipientCount: row.recipient_count,
      deliveredCount: row.delivered_count,
      failedCount: row.failed_count,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : undefined,
      errorMessage: row.error_message || undefined,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private mapPublicationRow(row: any): DelimitationPublication {
    return {
      id: row.id,
      versionId: row.version_id,
      publicationStatus: row.publication_status,
      publicationType: row.publication_type || 'UNVERIFIED_NOTICE',
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : undefined,
      publishedBy: row.published_by,
      publishedProposalId: row.published_proposal_id || undefined,
      canonicalViewUpdated: row.canonical_view_updated,
      errorMessage: row.error_message || undefined,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  private mapRunRow(row: any): DelimitationWatchRun {
    return {
      id: row.id,
      correlationId: row.correlation_id,
      sourceId: row.source_id,
      runType: row.run_type,
      snapshotId: row.snapshot_id || undefined,
      candidateId: row.candidate_id || undefined,
      validationId: row.validation_id || undefined,
      comparisonId: row.comparison_id || undefined,
      versionId: row.version_id || undefined,
      eventId: row.event_id || undefined,
      publicationId: row.publication_id || undefined,
      outcome: row.outcome,
      stageDurationsMs: typeof row.stage_durations_ms === 'string' ? JSON.parse(row.stage_durations_ms) : row.stage_durations_ms || {},
      totalDurationMs: row.total_duration_ms,
      errorDetails: row.error_details || undefined,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }
}
