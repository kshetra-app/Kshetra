import crypto from 'node:crypto';
import type { DataIngestionJob, IngestionJobSubmission, PipelineStage } from '@kshetra/shared';
import { supabase, isSupabaseConfigured, isUsingServiceRole } from '../lib/supabase';

export interface RawRecord {
  id?: string;
  name?: string;
  code?: string;
  state?: string;
  date?: string;
  contact?: string;
  [key: string]: unknown;
}

export interface IngestionRecord {
  recordKey: string;
  recordData: RawRecord;
}

export interface IngestionStore {
  commit(job: DataIngestionJob, rawSnapshot: string, records: IngestionRecord[]): Promise<void>;
  get(jobId: string): Promise<DataIngestionJob | null>;
}

export class IngestionPersistenceError extends Error {
  constructor(message = 'Durable ingestion storage is unavailable') {
    super(message);
    this.name = 'IngestionPersistenceError';
  }
}

export class IngestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionValidationError';
  }
}

class SupabaseIngestionStore implements IngestionStore {
  async commit(
    job: DataIngestionJob,
    rawSnapshot: string,
    records: IngestionRecord[],
  ): Promise<void> {
    if (!isSupabaseConfigured || !isUsingServiceRole) throw new IngestionPersistenceError();
    const { error } = await supabase.rpc('fn_commit_data_ingestion_job', {
      p_job: job,
      p_snapshot: rawSnapshot,
      p_records: records.map((record) => ({
        recordKey: record.recordKey,
        recordData: record.recordData,
      })),
    });
    if (error) throw new IngestionPersistenceError(error.message);
  }

  async get(jobId: string): Promise<DataIngestionJob | null> {
    if (!isSupabaseConfigured || !isUsingServiceRole) throw new IngestionPersistenceError();
    const { data, error } = await supabase
      .from('data_ingestion_pipeline_jobs')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
    if (error) throw new IngestionPersistenceError(error.message);
    if (!data) return null;
    return {
      jobId: data.job_id,
      datasetName: data.dataset_name,
      sourceUri: data.source_uri,
      snapshotSha256: data.snapshot_sha256,
      currentStage: data.current_stage as PipelineStage,
      totalRecords: data.total_records,
      recordsNormalized: data.records_normalized,
      recordsValidated: data.records_validated,
      recordsReconciled: data.records_reconciled,
      recordsCommitted: data.records_committed,
      status: data.status,
      versionTag: data.version_tag,
      errorMessage: data.error_message ?? undefined,
      createdAt: data.created_at,
      completedAt: data.completed_at ?? undefined,
    };
  }
}

const MAX_SNAPSHOT_BYTES = 5 * 1024 * 1024;

export class DataIngestionService {
  constructor(private readonly store: IngestionStore = new SupabaseIngestionStore()) {}

  /**
   * Validates and atomically persists source snapshot plus staging rows.
   * `COMPLETED` means durable staging only; it does not publish data into canonical tables.
   */
  async processDataset(submission: IngestionJobSubmission): Promise<DataIngestionJob> {
    const jobId = crypto.randomUUID();
    const rawSnapshot =
      typeof submission.rawPayload === 'string'
        ? submission.rawPayload
        : JSON.stringify(submission.rawPayload);
    if (typeof rawSnapshot !== 'string')
      throw new IngestionValidationError('rawPayload is required.');

    const rawPayloadBuffer = Buffer.from(rawSnapshot, 'utf8');
    if (rawPayloadBuffer.byteLength > MAX_SNAPSHOT_BYTES)
      throw new IngestionValidationError('rawPayload exceeds 5 MiB.');
    const now = new Date().toISOString();
    const job: DataIngestionJob = {
      jobId,
      datasetName: submission.datasetName,
      sourceUri: submission.sourceUri,
      snapshotSha256: crypto.createHash('sha256').update(rawPayloadBuffer).digest('hex'),
      currentStage: 'source',
      totalRecords: 0,
      recordsNormalized: 0,
      recordsValidated: 0,
      recordsReconciled: 0,
      recordsCommitted: 0,
      status: 'PROCESSING',
      versionTag: submission.versionTag,
      createdAt: now,
    };

    let reconciledRecords: IngestionRecord[] = [];
    try {
      job.currentStage = 'raw_snapshot';
      job.currentStage = 'parser';
      const parsedRecords = this.parsePayload(rawSnapshot);
      job.totalRecords = parsedRecords.length;

      job.currentStage = 'normalization';
      const normalizedRecords = parsedRecords.map((record) => this.normalizeRecord(record));
      job.recordsNormalized = normalizedRecords.length;

      job.currentStage = 'validation';
      const invalidIndex = normalizedRecords.findIndex((record) => !this.validateRecord(record));
      if (invalidIndex !== -1) {
        throw new Error(
          `VALIDATION_FAILED: Record ${invalidIndex + 1} must be an object with a non-empty id or code.`,
        );
      }
      if (normalizedRecords.length === 0)
        throw new Error('VALIDATION_FAILED: Dataset contains no records.');
      job.recordsValidated = normalizedRecords.length;

      job.currentStage = 'reconciliation';
      reconciledRecords = this.reconcileRecords(normalizedRecords);
      job.recordsReconciled = reconciledRecords.length;

      job.currentStage = 'production';
      job.recordsCommitted = reconciledRecords.length;
      job.currentStage = 'version';
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      await this.store.commit(job, rawSnapshot, reconciledRecords);
      return job;
    } catch (error) {
      if (error instanceof IngestionPersistenceError) throw error;
      job.status = 'FAILED';
      job.errorMessage = error instanceof Error ? error.message : 'Pipeline processing failed';
      job.recordsCommitted = 0;
      job.completedAt = new Date().toISOString();
      try {
        await this.store.commit(job, rawSnapshot, []);
      } catch (persistenceError) {
        throw persistenceError instanceof IngestionPersistenceError
          ? persistenceError
          : new IngestionPersistenceError();
      }
      return job;
    }
  }

  private parsePayload(rawSnapshot: string): RawRecord[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawSnapshot);
    } catch {
      throw new IngestionValidationError('rawPayload must contain valid JSON.');
    }
    if (Array.isArray(parsed)) return parsed as RawRecord[];
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as { records?: unknown }).records)
    ) {
      return (parsed as { records: RawRecord[] }).records;
    }
    throw new IngestionValidationError(
      'rawPayload must be an array or an object with a records array.',
    );
  }

  private normalizeRecord(record: RawRecord): RawRecord {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
    const normalized: RawRecord = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        let normalizedValue = value.normalize('NFC').trim();
        if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('contact')) {
          const digits = normalizedValue.replace(/\D/g, '');
          if (digits.length === 10) normalizedValue = `+91${digits}`;
        }
        normalized[key] = normalizedValue;
      } else {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  private validateRecord(record: RawRecord): boolean {
    if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const code = typeof record.code === 'string' ? record.code.trim() : '';
    if (!id && !code) return false;
    if (record.name !== undefined && (typeof record.name !== 'string' || !record.name.trim()))
      return false;
    return Object.values(record).every(
      (value) => value === null || ['string', 'number', 'boolean', 'object'].includes(typeof value),
    );
  }

  private reconcileRecords(records: RawRecord[]): IngestionRecord[] {
    const seen = new Map<string, string>();
    const reconciled: IngestionRecord[] = [];
    for (const record of records) {
      const recordKey =
        typeof record.id === 'string' && record.id.trim()
          ? `id:${record.id.trim()}`
          : `code:${String(record.code).trim()}`;
      const serialized = JSON.stringify(record);
      const previous = seen.get(recordKey);
      if (previous !== undefined) {
        if (previous !== serialized)
          throw new Error(`VALIDATION_FAILED: Conflicting duplicate record ${recordKey}.`);
        continue;
      }
      seen.set(recordKey, serialized);
      reconciled.push({ recordKey, recordData: record });
    }
    return reconciled;
  }

  async getJobStatus(jobId: string): Promise<DataIngestionJob | null> {
    return this.store.get(jobId);
  }
}

export const dataIngestionService = new DataIngestionService();
