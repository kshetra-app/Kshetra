/**
 * Data Ingestion Pipeline Contracts (JOB 075)
 *
 * Implements canonical 8-stage robust data processing pipeline:
 * 1. source: validate declared upstream source metadata; the caller supplies the payload.
 * 2. raw_snapshot: cryptographic SHA-256 snapshot and durable payload storage.
 * 3. parser: format decoding (PDF, CSV, GeoJSON, XML) to intermediate DTOs.
 * 4. normalization: NFC Unicode, ISO 8601 timestamps, E.164 phone formats.
 * 5. validation: structural schema conformance and referential constraint verification.
 * 6. reconciliation: deterministic deduplication by stable source identifier.
 * 7. production: atomic write into durable staging tables; this does not activate canonical data.
 * 8. version: emission of a persisted job manifest and audit summary.
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
  /** Count durably committed to staging. Canonical publication is a separate, unimplemented operation. */
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
