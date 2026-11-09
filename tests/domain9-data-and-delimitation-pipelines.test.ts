import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { DataIngestionJob } from '@kshetra/shared';
import { dataPipelineRoutes } from '../apps/api/src/routes/dataPipelines';
import {
  DataIngestionService,
  type IngestionRecord,
  type IngestionStore,
} from '../apps/api/src/services/dataIngestionService';
import { systemAuditRoutes } from '../apps/api/src/routes/systemAudit';

class MemoryIngestionStore implements IngestionStore {
  readonly jobs = new Map<string, DataIngestionJob>();
  readonly records = new Map<string, IngestionRecord[]>();
  readonly snapshots = new Map<string, string>();
  async commit(
    job: DataIngestionJob,
    rawSnapshot: string,
    records: IngestionRecord[],
  ): Promise<void> {
    this.jobs.set(job.jobId, structuredClone(job));
    this.snapshots.set(job.jobId, rawSnapshot);
    this.records.set(job.jobId, structuredClone(records));
  }
  async get(jobId: string): Promise<DataIngestionJob | null> {
    return this.jobs.get(jobId) ?? null;
  }
}

async function run() {
  const store = new MemoryIngestionStore();
  const service = new DataIngestionService(store);
  const input = [
    { code: 'TS-AC-01', name: 'Sirpur ', contact: '9848012345' },
    { code: 'TS-AC-02', name: 'Chennur', contact: '+919848098765' },
    { code: 'TS-AC-01', name: 'Sirpur', contact: '+919848012345' },
  ];
  const job = await service.processDataset({
    datasetName: 'Telangana AC fixture',
    sourceUri: 'https://eci.gov.in/elections/ts_ac.json',
    rawPayload: input,
    versionTag: 'fixture-1',
  });
  assert.equal(job.status, 'COMPLETED');
  assert.equal(job.totalRecords, 3);
  assert.equal(job.recordsValidated, 3);
  assert.equal(job.recordsReconciled, 2);
  assert.equal(job.recordsCommitted, 2);
  assert.equal(
    store.jobs.get(job.jobId)?.status,
    'COMPLETED',
    'completion is only visible after the store commits',
  );
  assert.equal(
    store.records.get(job.jobId)?.length,
    2,
    'normalized rows are persisted with the job',
  );
  assert.equal(store.records.get(job.jobId)?.[0].recordData.contact, '+919848012345');
  assert.equal(await service.getJobStatus(job.jobId), store.jobs.get(job.jobId));

  const conflicting = await service.processDataset({
    datasetName: 'conflict fixture',
    sourceUri: 'https://example.test/conflict.json',
    rawPayload: [
      { id: 'same', name: 'First' },
      { id: 'same', name: 'Different' },
    ],
    versionTag: 'fixture-2',
  });
  assert.equal(conflicting.status, 'FAILED', 'conflicting duplicate identities fail closed');
  assert.equal(conflicting.recordsCommitted, 0);
  assert.match(conflicting.errorMessage ?? '', /Conflicting duplicate/);
  assert.equal(
    store.jobs.get(conflicting.jobId)?.status,
    'FAILED',
    'failed validation status is durable too',
  );

  const app = Fastify({ logger: false });
  await app.register(dataPipelineRoutes);
  await app.register(systemAuditRoutes);
  const unauthenticatedPipeline = await app.inject({
    method: 'POST',
    url: '/api/v1/pipelines/ingest',
    payload: {
      datasetName: 'x',
      sourceUri: 'https://example.test/x',
      rawPayload: [],
      versionTag: 'x',
    },
  });
  assert.equal(
    unauthenticatedPipeline.statusCode,
    401,
    'production ingestion route requires verified identity',
  );

  const adminHeaders = { 'x-user-id': 'test-admin', 'x-user-role': 'admin' };
  const productionSimulation = await app.inject({
    method: 'GET',
    url: '/api/v1/system/audit/database',
    headers: adminHeaders,
  });
  assert.equal(
    productionSimulation.statusCode,
    501,
    'simulated database audit cannot pass as a production audit',
  );
  const explicitDemo = await app.inject({
    method: 'GET',
    url: '/api/v1/demo/system/audit/database?simulation=true',
  });
  assert.equal(explicitDemo.statusCode, 200);
  assert.equal(JSON.parse(explicitDemo.payload).mode, 'SIMULATION');

  const unauthenticatedDelimitation = await app.inject({
    method: 'POST',
    url: '/api/v1/pipelines/delimitation/audit',
    payload: {},
  });
  assert.equal(
    unauthenticatedDelimitation.statusCode,
    401,
    'delimitation writes require administrator identity',
  );
  await app.close();
  console.log('Durable ingestion validation and production/demo route separation checks passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
