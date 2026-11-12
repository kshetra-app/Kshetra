import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

type FixtureFeature = {
  geometry: Record<string, unknown>;
  properties: { AC_NO: number; AC_NAME: string; Shape_Area: number };
};

const dbUrl = process.env.TEST_DATABASE_URL;
if (!dbUrl) {
  console.log(
    'Skipped PostGIS authoritative delimitation integration test: TEST_DATABASE_URL is not set.',
  );
  process.exit(0);
}

async function ensureRole(client: Client, roleName: string) {
  await client.query(
    `DO $$ BEGIN CREATE ROLE ${roleName} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  );
}

async function registerFixtureDatasetVersion(
  client: Client,
  datasetVersionId: string,
  checksumSha256: string,
) {
  await client.query(
    `INSERT INTO public.data_sources(id, name, publisher, authority_level)
     VALUES ('postgis-test-only-source', 'PostGIS fixture source', 'TEST ONLY', 'statutory')
     ON CONFLICT (id) DO NOTHING`,
  );
  const datasetId = `test-${datasetVersionId}`;
  await client.query(
    `INSERT INTO public.datasets(id, name, domain, source_id)
     VALUES ($1, $2, 'geography', 'postgis-test-only-source')`,
    [datasetId, datasetId],
  );
  await client.query(
    `INSERT INTO public.dataset_versions(id, dataset_id, version_tag, checksum_sha256, default_status)
     VALUES ($1, $2, 'fixture-v1', $3, 'OFFICIAL')`,
    [datasetVersionId, datasetId, checksumSha256],
  );
  const evidence = await client.query<{ id: string }>(
    `INSERT INTO public.evidence_records(
       dataset_version_id, artifact_name, artifact_sha256, verification_authority, verified_by
     ) VALUES ($1, 'test-only fixture artifact', $2, 'TEST ONLY; not real authority', 'automated PostGIS test')
     RETURNING id`,
    [datasetVersionId, checksumSha256],
  );
  await client.query(
    'UPDATE public.dataset_versions SET verification_evidence_id = $2 WHERE id = $1',
    [datasetVersionId, evidence.rows[0].id],
  );
}

async function run() {
  const fixturePath = path.resolve(process.cwd(), 'data/geo/telangana-assembly.geojson');
  const attributionPath = path.resolve(process.cwd(), 'data/geo/ATTRIBUTION.md');
  assert.match(fs.readFileSync(attributionPath, 'utf8'), /datta07\/INDIAN-SHAPEFILES/);
  const source = JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as { features: FixtureFeature[] };
  const stateSource = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'data/geo/telangana-state.geojson'), 'utf8'),
  ) as { features: Array<{ geometry: Record<string, unknown> }> };
  assert.equal(
    stateSource.features.length,
    1,
    'attributed state fixture should contain one state polygon',
  );
  assert.equal(
    source.features.length,
    120,
    'attributed source fixture should retain all source features',
  );

  const byAc = new Map<number, FixtureFeature[]>();
  for (const feature of source.features) {
    const current = byAc.get(feature.properties.AC_NO) ?? [];
    current.push(feature);
    byAc.set(feature.properties.AC_NO, current);
  }
  assert.equal(
    byAc.size,
    119,
    'source should contain 119 unique constituencies, with one multipart constituency',
  );

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await client.query('CREATE SCHEMA IF NOT EXISTS auth');
    await ensureRole(client, 'anon');
    await ensureRole(client, 'authenticated');
    await ensureRole(client, 'service_role');
    await client.query(
      "CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'service_role'::text $$",
    );

    await client.query('DROP TABLE IF EXISTS public.delimitation_revision_boundaries CASCADE');
    await client.query('DROP TABLE IF EXISTS public.geography_boundary_load_ledger CASCADE');
    await client.query('DROP TABLE IF EXISTS public.spatial_topology_certification_ledger CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_ingestion_pipeline_records CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_ingestion_pipeline_snapshots CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_principal_erasure_ledger CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_principal_rights_requests CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_principal_grievance_tickets CASCADE');
    await client.query('DROP TABLE IF EXISTS public.erasure_probe CASCADE');
    await client.query('DROP TABLE IF EXISTS auth.users CASCADE');
    await client.query('DROP TABLE IF EXISTS public.delimitation_source_revisions CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_ingestion_pipeline_jobs CASCADE');
    await client.query('DROP TABLE IF EXISTS public.constituency_versions CASCADE');
    await client.query('DROP TABLE IF EXISTS public.constituencies CASCADE');
    await client.query('DROP TABLE IF EXISTS public.parliamentary_constituency_versions CASCADE');
    await client.query('DROP TABLE IF EXISTS public.parliamentary_constituencies CASCADE');
    await client.query('DROP TABLE IF EXISTS public.district_versions CASCADE');
    await client.query('DROP TABLE IF EXISTS public.districts CASCADE');
    await client.query('DROP TABLE IF EXISTS public.state_versions CASCADE');
    await client.query('DROP TABLE IF EXISTS public.states CASCADE');
    await client.query('DROP TABLE IF EXISTS public.evidence_records CASCADE');
    await client.query('DROP TABLE IF EXISTS public.dataset_versions CASCADE');
    await client.query('DROP TABLE IF EXISTS public.datasets CASCADE');
    await client.query('DROP TABLE IF EXISTS public.data_sources CASCADE');

    await client.query(`
      CREATE TABLE public.data_sources(id text PRIMARY KEY, name text NOT NULL, publisher text NOT NULL, authority_level text NOT NULL);
      CREATE TABLE public.datasets(id text PRIMARY KEY, name text NOT NULL, domain text NOT NULL, source_id text NOT NULL);
      CREATE TABLE public.dataset_versions(
        id text PRIMARY KEY, dataset_id text NOT NULL, version_tag text NOT NULL,
        checksum_sha256 text, default_status text NOT NULL DEFAULT 'UNKNOWN', verification_evidence_id uuid
      );
      CREATE TABLE public.evidence_records(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), dataset_version_id text NOT NULL,
        artifact_name text NOT NULL, artifact_sha256 text NOT NULL,
        verification_authority text NOT NULL, verified_by text NOT NULL
      );
      CREATE TABLE public.states(
        code text PRIMARY KEY, name text NOT NULL, total_seats integer NOT NULL,
        primary_dataset_version_id text
      );
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.erasure_probe(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE);
      CREATE TABLE public.constituencies(
        id text PRIMARY KEY, internal_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        canonical_code text, eci_ac_code text, name text NOT NULL, state_code text NOT NULL,
        boundary geometry(MultiPolygon,4326), primary_dataset_version_id text
      );
      CREATE TABLE public.constituency_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), constituency_internal_id uuid NOT NULL,
        version_code text NOT NULL, canonical_code text, name text NOT NULL,
        is_current boolean NOT NULL DEFAULT true, primary_dataset_version_id text
      );
      CREATE TABLE public.state_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), state_code text NOT NULL,
        version_code text NOT NULL, name text NOT NULL, is_current boolean NOT NULL DEFAULT true,
        primary_dataset_version_id text
      );
      CREATE TABLE public.data_ingestion_pipeline_jobs(
        job_id uuid PRIMARY KEY, dataset_name text NOT NULL, source_uri text NOT NULL,
        snapshot_sha256 text NOT NULL, current_stage text NOT NULL,
        total_records integer NOT NULL DEFAULT 0, records_normalized integer NOT NULL DEFAULT 0,
        records_validated integer NOT NULL DEFAULT 0, records_reconciled integer NOT NULL DEFAULT 0,
        records_committed integer NOT NULL DEFAULT 0, version_tag text NOT NULL, status text NOT NULL,
        error_message text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
      );
      CREATE TABLE public.delimitation_source_revisions(
        revision_id uuid PRIMARY KEY, order_number text NOT NULL, gazette_date date NOT NULL,
        state_code text NOT NULL, constituency_count integer NOT NULL DEFAULT 0,
        total_area_delta_km2 numeric NOT NULL DEFAULT 0,
        centroid_shift_meters_max numeric NOT NULL DEFAULT 0,
        voter_shift_estimate integer NOT NULL DEFAULT 0,
        topology_valid boolean NOT NULL DEFAULT true, impact_summary jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.parliamentary_constituencies(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
        state_code text NOT NULL, name text NOT NULL, primary_dataset_version_id text
      );
      CREATE TABLE public.parliamentary_constituency_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pc_id uuid NOT NULL,
        name text NOT NULL, is_current boolean NOT NULL DEFAULT true, primary_dataset_version_id text
      );
      CREATE TABLE public.districts(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
        state_code text NOT NULL, name text NOT NULL, primary_dataset_version_id text
      );
      CREATE TABLE public.district_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), district_id uuid NOT NULL,
        name text NOT NULL, is_current boolean NOT NULL DEFAULT true, primary_dataset_version_id text
      );
    `);
    const topologyPrerequisite = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/084_domain10_performance_security_and_dr.sql'),
      'utf8',
    );
    await client.query(topologyPrerequisite);
    const migration = fs.readFileSync(
      path.resolve(
        process.cwd(),
        'supabase/migrations/085_durable_ingestion_erasure_and_spatial_audits.sql',
      ),
      'utf8',
    );
    await client.query(migration);
    const geometryMigration = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/086_version_bound_national_geometries.sql'),
      'utf8',
    );
    await client.query(geometryMigration);

    // The DB RPC must not mark ingestion complete until the snapshot and every staging row commit.
    const goodJobId = '55555555-5555-4555-8555-555555555555';
    const goodJob = {
      jobId: goodJobId,
      datasetName: 'fixture ingestion',
      sourceUri: 'https://example.test/source.json',
      snapshotSha256: 'a'.repeat(64),
      currentStage: 'version',
      totalRecords: 1,
      recordsNormalized: 1,
      recordsValidated: 1,
      recordsReconciled: 1,
      recordsCommitted: 1,
      versionTag: 'fixture-v1',
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
    await client.query(
      'SELECT public.fn_commit_data_ingestion_job($1::jsonb, $2::text, $3::jsonb)',
      [
        JSON.stringify(goodJob),
        '[{"code":"TS-AC-1"}]',
        JSON.stringify([{ recordKey: 'code:TS-AC-1', recordData: { code: 'TS-AC-1' } }]),
      ],
    );
    const persistedJob = await client.query<{ status: string; records_committed: number }>(
      'SELECT status, records_committed FROM public.data_ingestion_pipeline_jobs WHERE job_id = $1',
      [goodJobId],
    );
    assert.equal(persistedJob.rows[0].status, 'COMPLETED');
    assert.equal(persistedJob.rows[0].records_committed, 1);
    const persistedStaging = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.data_ingestion_pipeline_records WHERE job_id = $1',
      [goodJobId],
    );
    assert.equal(Number(persistedStaging.rows[0].count), 1);

    const rolledBackJob = { ...goodJob, jobId: '66666666-6666-4666-8666-666666666666' };
    await assert.rejects(
      client.query('SELECT public.fn_commit_data_ingestion_job($1::jsonb, $2::text, $3::jsonb)', [
        JSON.stringify({ ...rolledBackJob, recordsCommitted: 2 }),
        'duplicate-key-fixture',
        JSON.stringify([
          { recordKey: 'same-key', recordData: { id: 'one' } },
          { recordKey: 'same-key', recordData: { id: 'two' } },
        ]),
      ]),
      /duplicate key/i,
    );
    const rolledBack = await client.query(
      'SELECT 1 FROM public.data_ingestion_pipeline_jobs WHERE job_id = $1',
      [rolledBackJob.jobId],
    );
    assert.equal(rolledBack.rowCount, 0, 'a staging failure must roll back the completed job row');

    // Deletion validation checks the real Postgres ON DELETE CASCADE dependencies.
    const erasedUserId = '77777777-7777-4777-8777-777777777777';
    await client.query('INSERT INTO auth.users(id) VALUES ($1)', [erasedUserId]);
    await client.query('INSERT INTO public.erasure_probe(user_id) VALUES ($1)', [erasedUserId]);
    await client.query('DELETE FROM auth.users WHERE id = $1', [erasedUserId]);
    const erasureValidation = await client.query<{ validation: any }>(
      'SELECT public.fn_validate_user_erasure($1) AS validation',
      [erasedUserId],
    );
    assert.equal(erasureValidation.rows[0].validation.validated, true);
    assert.equal(erasureValidation.rows[0].validation.checkedDependencies, 1);

    // Confirm the checked-in source's per-feature Shape_Area values agree with PostGIS' planar area.
    for (const feature of source.features) {
      const area = await client.query<{ area: number }>(
        'SELECT ST_Area(ST_GeomFromGeoJSON($1)::geometry) AS area',
        [JSON.stringify(feature.geometry)],
      );
      const measured = Number(area.rows[0].area);
      assert.ok(Number.isFinite(measured) && measured > 0);
      assert.ok(
        Math.abs(measured - feature.properties.Shape_Area) < 1e-9,
        `PostGIS source area differs for AC ${feature.properties.AC_NO} ${feature.properties.AC_NAME}`,
      );
    }

    const assemblySha256 = crypto
      .createHash('sha256')
      .update(fs.readFileSync(fixturePath))
      .digest('hex');
    const stateFixturePath = path.resolve(process.cwd(), 'data/geo/telangana-state.geojson');
    const stateSha256 = crypto
      .createHash('sha256')
      .update(fs.readFileSync(stateFixturePath))
      .digest('hex');
    await registerFixtureDatasetVersion(client, 'test-telangana-ac-v1', assemblySha256);
    await registerFixtureDatasetVersion(client, 'test-telangana-state-v1', stateSha256);
    await registerFixtureDatasetVersion(client, 'test-telangana-pc-v1', stateSha256);
    await registerFixtureDatasetVersion(client, 'test-telangana-district-v1', stateSha256);

    await client.query(
      `INSERT INTO public.states(code, name, total_seats, primary_dataset_version_id, boundary)
       VALUES ('TS', 'Telangana', 119, 'test-telangana-state-v1',
         ST_Multi(ST_GeomFromGeoJSON($1))::geometry(MultiPolygon,4326))`,
      [JSON.stringify(stateSource.features[0].geometry)],
    );
    await client.query(
      `INSERT INTO public.state_versions(state_code, version_code, name, is_current, primary_dataset_version_id)
       VALUES ('TS', 'TS-state-fixture-v1', 'Telangana', true, 'test-telangana-state-v1')`,
    );
    await client.query(
      `UPDATE public.state_versions sv SET boundary=s.boundary,
         boundary_dataset_version_id='test-telangana-state-v1', boundary_source_feature_id='telangana-state-fixture',
         boundary_source_sha256=$1, boundary_geometry_sha256=encode(digest(ST_AsEWKB(s.boundary),'sha256'),'hex')
       FROM public.states s WHERE sv.state_code=s.code AND sv.is_current`,
      [stateSha256],
    );

    const pc = await client.query<{ id: string }>(
      `INSERT INTO public.parliamentary_constituencies(code, state_code, name, primary_dataset_version_id)
       VALUES ('TS-PC-001', 'TS', 'Fixture PC', 'test-telangana-pc-v1') RETURNING id`,
    );
    await client.query(
      `INSERT INTO public.parliamentary_constituency_versions(pc_id, name, is_current, primary_dataset_version_id)
       VALUES ($1, 'Fixture PC', true, 'test-telangana-pc-v1')`,
      [pc.rows[0].id],
    );
    const district = await client.query<{ id: string }>(
      `INSERT INTO public.districts(code, state_code, name, primary_dataset_version_id)
       VALUES ('TS-DISTRICT-001', 'TS', 'Fixture District', 'test-telangana-district-v1') RETURNING id`,
    );
    await client.query(
      `INSERT INTO public.district_versions(district_id, name, is_current, primary_dataset_version_id)
       VALUES ($1, 'Fixture District', true, 'test-telangana-district-v1')`,
      [district.rows[0].id],
    );
    for (const [acNo, features] of byAc) {
      const id = `TS-AC-${acNo}`;
      const geometries = JSON.stringify(features.map((feature) => feature.geometry));
      const seeded = await client.query<{ internal_id: string }>(
        `WITH merged AS (
          SELECT ST_Multi(ST_UnaryUnion(ST_Collect(ST_GeomFromGeoJSON(value::text))))::geometry(MultiPolygon,4326) AS geom
          FROM jsonb_array_elements($1::jsonb)
        )
        INSERT INTO public.constituencies(id, canonical_code, name, state_code, boundary, primary_dataset_version_id)
        SELECT $2, 'TS-AC-' || lpad($3::text, 3, '0'), $4, 'TS', geom, 'test-telangana-ac-v1' FROM merged
        RETURNING internal_id`,
        [geometries, id, acNo, features[0].properties.AC_NAME],
      );
      await client.query(
        `INSERT INTO public.constituency_versions(
           constituency_internal_id, version_code, canonical_code, name, is_current, primary_dataset_version_id
         ) VALUES ($1, $2, $3, $4, true, 'test-telangana-ac-v1')`,
        [
          seeded.rows[0].internal_id,
          'TS-2008-v1',
          `TS-AC-${String(acNo).padStart(3, '0')}`,
          features[0].properties.AC_NAME,
        ],
      );
    }

    await client.query(
      `UPDATE public.constituency_versions cv SET boundary=c.boundary,
         boundary_dataset_version_id='test-telangana-ac-v1', boundary_source_feature_id=c.id,
         boundary_source_sha256=$1, boundary_geometry_sha256=encode(digest(ST_AsEWKB(c.boundary),'sha256'),'hex')
       FROM public.constituencies c WHERE cv.constituency_internal_id=c.internal_id AND cv.is_current`,
      [assemblySha256],
    );

    const topologyResult = await client.query<{ report: any }>(
      'SELECT public.fn_certify_current_geography_topology() AS report',
    );
    const topology = topologyResult.rows[0].report;
    assert.equal(topology.summary.totalAssemblyConstituencies, 119);
    assert.equal(topology.summary.assemblyBoundaryCoveragePercent, 100);
    assert.equal(topology.summary.statePolygonsAvailable, true);
    assert.equal(topology.summary.invalidGeometriesCount, 0);
    assert.ok(
      topology.summary.stateContainmentViolationsCount > 0,
      'the supplied Telangana AC and state outline fixtures do not fully contain one another and must remain uncertified',
    );
    assert.ok(
      topology.failureLog.some((issue: { violationType?: string }) => issue.violationType === 'CONTAINMENT_BREACH'),
      'fixture mismatches must be reported as explicit containment breaches',
    );
    assert.equal(topology.summary.checksComplete, false);
    assert.equal(
      topology.certified,
      false,
      'the audit must remain uncertified because its current PC and district versions have no stored geometry',
    );
    assert.equal(topology.summary.pcBoundaryCoveragePercent, 0);
    assert.equal(topology.summary.missingPcBoundaries, 1);
    assert.equal(topology.summary.districtBoundaryCoveragePercent, 0);
    assert.equal(topology.summary.missingDistrictBoundaries, 1);
    assert.ok(
      topology.failureLog.some(
        (entry: any) => entry.entityType === 'PC' && entry.violationType === 'MISSING_GEOMETRY',
      ),
    );
    assert.ok(
      topology.failureLog.some(
        (entry: any) =>
          entry.entityType === 'DISTRICT' && entry.violationType === 'MISSING_GEOMETRY',
      ),
    );
    const persistedTopology = await client.query<{
      audit_report: any;
      is_certified_100_percent: boolean;
    }>(
      'SELECT audit_report, is_certified_100_percent FROM public.spatial_topology_certification_ledger WHERE id=$1',
      [topology.auditId],
    );
    assert.equal(persistedTopology.rowCount, 1);
    assert.equal(persistedTopology.rows[0].is_certified_100_percent, false);
    assert.equal(persistedTopology.rows[0].audit_report.auditId, topology.auditId);

    const canonicalRows = await client.query<{ id: string; geometry: unknown }>(
      'SELECT id, ST_AsGeoJSON(boundary, 15)::json AS geometry FROM public.constituencies ORDER BY id',
    );
    const proposed = canonicalRows.rows.map((row) => ({
      constituencyId: row.id,
      geojsonGeometry: row.geometry,
    }));
    const revision = {
      revisionId: '11111111-1111-4111-8111-111111111111',
      orderNumber: 'Authoritative fixture baseline',
      gazetteDate: '2026-11-07',
      stateCode: 'TS',
    };
    await assert.rejects(
      client.query('SELECT public.fn_commit_delimitation_revision($1::jsonb, $2::jsonb)', [
        JSON.stringify(revision),
        JSON.stringify(proposed),
      ]),
      /STATE_CONTAINMENT_BREACH/,
      'the attributed AC and state fixtures must not be committed as a revision while their parent containment check fails',
    );

    // For the revision success path, use a clearly test-only parent polygon made from the
    // same AC fixtures. This isolates commit behavior from the mismatch above and never
    // represents authoritative production geography.
    const unionFixture = await client.query<{ geometry: Record<string, unknown> }>(`
      SELECT ST_AsGeoJSON(
        ST_Multi(ST_UnaryUnion(ST_Collect(ST_GeomFromGeoJSON(ST_AsGeoJSON(boundary, 15)) ORDER BY id)))::geometry(MultiPolygon,4326), 15
      )::json AS geometry
      FROM public.constituencies WHERE state_code='TS'
    `);
    const unionArtifact = JSON.stringify(unionFixture.rows[0].geometry);
    const unionChecksum = crypto.createHash('sha256').update(unionArtifact).digest('hex');
    await registerFixtureDatasetVersion(client, 'test-telangana-ac-union-v1', unionChecksum);
    await client.query(
      `WITH union_geom AS (
         SELECT ST_Multi(ST_UnaryUnion(ST_Collect(ST_GeomFromGeoJSON(ST_AsGeoJSON(boundary, 15)) ORDER BY id)))::geometry(MultiPolygon,4326) AS boundary
         FROM public.constituencies WHERE state_code='TS'
       )
       UPDATE public.state_versions sv SET boundary=union_geom.boundary,
         boundary_dataset_version_id='test-telangana-ac-union-v1',
         boundary_source_feature_id='test-only-union-of-ac-fixtures',
         boundary_source_sha256=$1,
         boundary_geometry_sha256=encode(digest(ST_AsEWKB(union_geom.boundary),'sha256'),'hex')
       FROM union_geom WHERE sv.state_code='TS' AND sv.is_current`,
      [unionChecksum],
    );
    const result = await client.query<{ report: any }>(
      'SELECT public.fn_commit_delimitation_revision($1::jsonb, $2::jsonb) AS report',
      [JSON.stringify(revision), JSON.stringify(proposed)],
    );
    const report = result.rows[0].report;
    assert.equal(report.topologyValid, true);
    assert.equal(report.constituencyCount, 119);
    assert.deepEqual(report.canonicalVersionCodes, ['TS-2008-v1']);
    assert.equal(report.boundaryDeltas.length, 119);
    assert.equal(
      report.voterShiftEstimate,
      null,
      'voter shift is unavailable without a voter crosswalk',
    );
    assert.ok(report.boundaryDeltas.every((delta: any) => Math.abs(delta.areaDeltaKm2) < 1e-9));
    assert.ok(report.boundaryDeltas.every((delta: any) => delta.centroidShiftMeters < 0.001));
    const persisted = await client.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM public.delimitation_revision_boundaries WHERE revision_id = $1',
      [revision.revisionId],
    );
    assert.equal(
      Number(persisted.rows[0].count),
      119,
      'all validated canonical boundary revisions must persist',
    );
    const revisionVersions = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.delimitation_revision_boundaries b
       JOIN public.constituency_versions cv ON cv.id=b.constituency_version_id AND cv.is_current
       WHERE b.revision_id=$1`,
      [revision.revisionId],
    );
    assert.equal(
      Number(revisionVersions.rows[0].count),
      119,
      'each revision geometry must identify its exact current AC version',
    );

    const missing = proposed.slice(0, -1);
    await assert.rejects(
      client.query('SELECT public.fn_commit_delimitation_revision($1::jsonb, $2::jsonb)', [
        JSON.stringify({ ...revision, revisionId: '22222222-2222-4222-8222-222222222222' }),
        JSON.stringify(missing),
      ]),
      /BOUNDARY_SET_INCOMPLETE/,
    );
    const spoofed = proposed.map((row, index) =>
      index === 0 ? { ...row, constituencyId: 'TS-AC-999' } : row,
    );
    await assert.rejects(
      client.query('SELECT public.fn_commit_delimitation_revision($1::jsonb, $2::jsonb)', [
        JSON.stringify({ ...revision, revisionId: '33333333-3333-4333-8333-333333333333' }),
        JSON.stringify(spoofed),
      ]),
      /UNKNOWN_OR_AMBIGUOUS_CONSTITUENCY_ID/,
    );
    const overlapping = proposed.map((row, index) =>
      index === 1 ? { ...row, geojsonGeometry: proposed[0].geojsonGeometry } : row,
    );
    await assert.rejects(
      client.query('SELECT public.fn_commit_delimitation_revision($1::jsonb, $2::jsonb)', [
        JSON.stringify({ ...revision, revisionId: '44444444-4444-4444-8444-444444444444' }),
        JSON.stringify(overlapping),
      ]),
      /BOUNDARIES_OVERLAP/,
    );

    console.log(
      'PostGIS delimitation integration passed against the attributed Telangana AC boundary fixture (120 source features, 119 canonical constituencies).',
    );
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
