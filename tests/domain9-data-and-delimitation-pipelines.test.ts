import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { dataPipelineRoutes } from '../apps/api/src/routes/dataPipelines';
import { dataIngestionService } from '../apps/api/src/services/dataIngestionService';
import { delimitationSourcePipeline } from '../apps/api/src/services/delimitationSourcePipeline';

console.log('=== RUNNING DOMAIN 9: JOB 075 & JOB 076 DATA & DELIMITATION PIPELINES VERIFICATION ===');

async function createTestApp() {
  const app = Fastify();
  await app.register(dataPipelineRoutes);
  return app;
}

async function runBattery() {
  const app = await createTestApp();

  // --- JOB 075: DATA INGESTION PIPELINE (8 STAGES) ---
  console.log('\n[CHECK 1] Testing 8-Stage Data Ingestion Pipeline end-to-end (JOB 075)...');
  const sampleElectoralDataset = [
    {
      code: 'TS-AC-01',
      name: 'Sirpur\u0020', // Has trailing space and un-normalized unicode
      contact: '9848012345', // 10-digit Indian mobile number needing E.164
      state: 'Telangana',
    },
    {
      code: 'TS-AC-02',
      name: 'Chennur',
      contact: '+919848098765',
      state: 'Telangana',
    },
    {
      code: 'TS-AC-01', // Duplicate row to test reconciliation deduplication
      name: 'Sirpur',
      contact: '+919848012345',
      state: 'Telangana',
    },
  ];

  const ingestRes = await app.inject({
    method: 'POST',
    url: '/api/v1/pipelines/ingest',
    payload: {
      datasetName: 'Telangana_2026_Candidate_Roster',
      sourceUri: 'https://eci.gov.in/elections/2026/ts_candidates.json',
      rawPayload: sampleElectoralDataset,
      versionTag: 'v2026.10.ts-candidates.1',
    },
  });

  assert.strictEqual(ingestRes.statusCode, 200, 'Ingestion job dispatch must return 200');
  const job = JSON.parse(ingestRes.payload).data;

  assert.ok(job.jobId, 'Job must have UUID jobId');
  assert.strictEqual(job.datasetName, 'Telangana_2026_Candidate_Roster');
  assert.ok(job.snapshotSha256 && job.snapshotSha256.length === 64, 'Stage 2: Must generate 64-char hex SHA-256 snapshot');
  assert.strictEqual(job.totalRecords, 3, 'Stage 3: Must parse 3 raw records');
  assert.strictEqual(job.recordsNormalized, 3, 'Stage 4: Must normalize 3 records (NFC Unicode, E.164 phone)');
  assert.strictEqual(job.recordsValidated, 3, 'Stage 5: Must validate 3 records against schema gates');
  assert.strictEqual(job.recordsReconciled, 2, 'Stage 6: Must deduplicate 3 records down to 2 distinct records');
  assert.strictEqual(job.recordsCommitted, 2, 'Stage 7: Must commit 2 records to staging');
  assert.strictEqual(job.currentStage, 'version', 'Stage 8: Must reach final version manifest stage');
  assert.strictEqual(job.status, 'COMPLETED', 'Job status must be COMPLETED');
  assert.ok(job.completedAt, 'Job must record completion timestamp');
  console.log('  [PASS] 8-stage canonical data transformation pipeline verified.');

  // Test 2: Ingestion status endpoint check
  console.log('\n[CHECK 2] Testing ingestion job status query endpoint...');
  const statusRes = await app.inject({
    method: 'GET',
    url: `/api/v1/pipelines/status/${job.jobId}`,
  });
  assert.strictEqual(statusRes.statusCode, 200);
  const fetchedJob = JSON.parse(statusRes.payload).data;
  assert.strictEqual(fetchedJob.jobId, job.jobId);
  assert.strictEqual(fetchedJob.status, 'COMPLETED');
  console.log('  [PASS] Ingestion job status query verified.');

  // Test 3: Validation gate rejection on corrupted input
  console.log('\n[CHECK 3] Testing Stage 5 validation gate failure on invalid schema...');
  const corruptRes = await app.inject({
    method: 'POST',
    url: '/api/v1/pipelines/ingest',
    payload: {
      datasetName: 'Corrupted_Dataset_Test',
      sourceUri: 'https://corrupt.example.com/bad.json',
      rawPayload: [
        { invalidField: 'missing code, id, and name' },
      ],
      versionTag: 'v-corrupt-test',
    },
  });
  const corruptJob = JSON.parse(corruptRes.payload).data;
  assert.strictEqual(corruptJob.status, 'FAILED');
  assert.ok(corruptJob.errorMessage.includes('VALIDATION_FAILED'));
  console.log('  [PASS] Validation gate correctly rejects invalid records with fail-closed status.');

  // --- JOB 076: DELIMITATION SOURCE PIPELINE ---
  console.log('\n[CHECK 4] Testing Delimitation Source Pipeline & Spatial Impact Engine (JOB 076)...');
  const delimitationSubmission = {
    orderNumber: 'Delimitation Notification No. 282/AP/2018(DEL)',
    gazetteDate: '2018-09-22',
    stateCode: 'AP',
    boundaries: [
      {
        constituencyId: 'AP-AC-53',
        constituencyName: 'Rampachodavaram',
        previousAreaKm2: 4500.5,
        estimatedVoters: 260000,
        geojsonGeometry: {
          type: 'Polygon',
          coordinates: [
            [
              [81.5, 17.2],
              [81.9, 17.2],
              [81.9, 17.7],
              [81.5, 17.7],
              [81.5, 17.2], // Closed polygon
            ],
          ],
        },
      },
      {
        constituencyId: 'AP-AC-67',
        constituencyName: 'Polavaram',
        previousAreaKm2: 3200.0,
        estimatedVoters: 245000,
        geojsonGeometry: {
          type: 'Polygon',
          coordinates: [
            [
              [81.2, 17.0],
              [81.6, 17.0],
              [81.6, 17.4],
              [81.2, 17.4],
              [81.2, 17.0], // Closed polygon
            ],
          ],
        },
      },
    ],
  };

  const delimRes = await app.inject({
    method: 'POST',
    url: '/api/v1/pipelines/delimitation/audit',
    payload: delimitationSubmission,
  });

  assert.strictEqual(delimRes.statusCode, 200, 'Delimitation audit endpoint must return 200');
  const impactReport = JSON.parse(delimRes.payload).data;

  assert.ok(impactReport.revisionId, 'Report must possess UUID revisionId');
  assert.strictEqual(impactReport.orderNumber, 'Delimitation Notification No. 282/AP/2018(DEL)');
  assert.strictEqual(impactReport.stateCode, 'AP');
  assert.strictEqual(impactReport.constituencyCount, 2);
  assert.ok(typeof impactReport.totalAreaDeltaKm2 === 'number', 'Total area delta must be numeric');
  assert.ok(typeof impactReport.centroidShiftMetersMax === 'number', 'Centroid shift must be numeric');
  assert.ok(impactReport.voterShiftEstimate > 0, 'Voter shift estimate must be calculated');
  assert.strictEqual(impactReport.topologyValid, true, 'Clean test boundaries must pass topology check');
  assert.strictEqual(impactReport.topologyAudit.isValid, true);
  assert.strictEqual(impactReport.topologyAudit.selfIntersectionsCount, 0);
  assert.strictEqual(impactReport.boundaryDeltas.length, 2);

  const delta1 = impactReport.boundaryDeltas[0];
  assert.strictEqual(delta1.constituencyId, 'AP-AC-53');
  assert.ok(delta1.newAreaKm2 > 0);
  assert.ok(typeof delta1.percentAreaChange === 'number');
  assert.ok(typeof delta1.centroidShiftMeters === 'number');
  console.log('  [PASS] Delimitation boundary area delta and centroid shift calculations verified.');

  // Test 5: Topology audit failure on unclosed polygon / slivers
  console.log('\n[CHECK 5] Testing topological audit failure on unclosed polygon geometry...');
  const invalidDelimSubmission = {
    orderNumber: 'Invalid-Order-Test',
    gazetteDate: '2026-01-01',
    stateCode: 'TS',
    boundaries: [
      {
        constituencyId: 'TS-AC-BAD',
        constituencyName: 'Unclosed Polygon',
        geojsonGeometry: {
          type: 'Polygon',
          coordinates: [
            [
              [78.0, 17.0],
              [78.5, 17.0],
              [78.5, 17.5],
              [78.0, 17.6], // Last point does not match first point [78.0, 17.0]
            ],
          ],
        },
      },
    ],
  };

  const invalidDelimRes = await app.inject({
    method: 'POST',
    url: '/api/v1/pipelines/delimitation/audit',
    payload: invalidDelimSubmission,
  });

  assert.strictEqual(invalidDelimRes.statusCode, 200);
  const invalidReport = JSON.parse(invalidDelimRes.payload).data;
  assert.strictEqual(invalidReport.topologyValid, false, 'Unclosed polygon must fail topology validity');
  assert.ok(invalidReport.topologyAudit.selfIntersectionsCount > 0);
  assert.ok(invalidReport.topologyAudit.issues.some((i: string) => i.includes('not closed')));
  console.log('  [PASS] Spatial topology audit rejects unclosed geometries with detailed issues list.');

  await app.close();
  console.log('\n========================================================================================');
  console.log('  JOB 075 & JOB 076 DATA & DELIMITATION PIPELINES: ALL CHECKS PASSED (100%)!');
  console.log('========================================================================================\n');
}

runBattery().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
