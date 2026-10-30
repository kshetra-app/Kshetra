/**
 * Data Ingestion Pipeline Contracts (JOB 075)
 *
 * Implements canonical 8-stage robust data processing pipeline:
 * 1. source: upstream acquisition (ECI, Census, Gazette, State Portal).
 * 2. raw_snapshot: cryptographic SHA-256 snapshotting and cold archive preservation.
 * 3. parser: format decoding (PDF, CSV, GeoJSON, XML) to intermediate DTOs.
 * 4. normalization: NFC Unicode, ISO 8601 timestamps, E.164 phone formats.
 * 5. validation: structural schema conformance and referential constraint verification.
 * 6. reconciliation: deduplication and entity resolution against master datasets.
 * 7. production: atomic staging transaction into production tables with rollback.
 * 8. version: emission of immutable version manifest and audit summary.
 */

export type PipelineStage =
  | 'source'
  | 'raw_snapshot'
  | 'parser'
  | 'normalization'
  | 'validation'
  | 'reconciliation'
  | 'production'
  | 'version';

export interface DataIngestionJob {
  jobId: string;
  datasetName: string;
  sourceUri: string;
  snapshotSha256: string;
  currentStage: PipelineStage;
  totalRecords: number;
  recordsNormalized: number;
  recordsValidated: number;
  recordsReconciled: number;
  recordsCommitted: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  versionTag: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface IngestionStageResult {
  stage: PipelineStage;
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors?: string[];
  durationMs: number;
}

export interface IngestionJobSubmission {
  datasetName: string;
  sourceUri: string;
  rawPayload?: unknown;
  versionTag: string;
}
