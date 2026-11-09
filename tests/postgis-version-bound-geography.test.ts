import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  console.log('Skipped version-bound geography PostGIS test: TEST_DATABASE_URL is not set.');
  process.exit(0);
}

const statePolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  ],
};
const westPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [0, 0],
        [5, 0],
        [5, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  ],
};
const eastPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [5, 0],
        [10, 0],
        [10, 10],
        [5, 10],
        [5, 0],
      ],
    ],
  ],
};
const overlappingEastPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [4, 0],
        [10, 0],
        [10, 10],
        [4, 10],
        [4, 0],
      ],
    ],
  ],
};
const outsidePolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [-20, -10],
        [-19, -10],
        [-19, -9],
        [-20, -9],
        [-20, -10],
      ],
    ],
  ],
};
const invalidBowtiePolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [1, 1],
        [9, 9],
        [1, 9],
        [9, 1],
        [1, 1],
      ],
    ],
  ],
};

type BoundaryFeature = {
  canonicalCode: string;
  sourceFeatureId: string;
  geometry: Record<string, unknown>;
};

async function ensureRole(client: Client, name: string) {
  await client.query(
    `DO $$ BEGIN CREATE ROLE ${name} NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  );
}

async function registerDatasetVersion(
  client: Client,
  versionId: string,
  checksum: string,
  status = 'OFFICIAL',
) {
  await client.query(
    `INSERT INTO public.data_sources(id,name,publisher,authority_level)
     VALUES ('test-only-source','Test-only authority stub','TEST FIXTURE ONLY','statutory')
     ON CONFLICT (id) DO NOTHING`,
  );
  await client.query(
    `INSERT INTO public.datasets(id,name,domain,source_id)
     VALUES ($1,$1,'geography','test-only-source')`,
    [`dataset-${versionId}`],
  );
  await client.query(
    `INSERT INTO public.dataset_versions(id,dataset_id,version_tag,checksum_sha256,default_status)
     VALUES ($1,$2,'fixture-v1',$3,$4)`,
    [versionId, `dataset-${versionId}`, checksum, status],
  );
  if (status === 'OFFICIAL' || status === 'VERIFIED') {
    const evidence = await client.query<{ id: string }>(
      `INSERT INTO public.evidence_records(dataset_version_id,artifact_name,artifact_sha256,verification_authority,verified_by)
       VALUES ($1,'test fixture manifest',$2,'TEST FIXTURE ONLY; not real authority','automated test') RETURNING id`,
      [versionId, checksum],
    );
    await client.query(
      'UPDATE public.dataset_versions SET verification_evidence_id=$2 WHERE id=$1',
      [versionId, evidence.rows[0].id],
    );
  }
}

async function load(
  client: Client,
  entityType: 'STATE' | 'AC' | 'PC' | 'DISTRICT',
  datasetVersionId: string,
  checksum: string,
  features: BoundaryFeature[],
) {
  return client.query<{ report: Record<string, unknown> }>(
    'SELECT public.fn_load_current_geography_boundaries($1,$2,$3,$4::jsonb) AS report',
    [entityType, datasetVersionId, checksum, JSON.stringify(features)],
  );
}

async function run() {
  const client = new Client({ connectionString: databaseUrl });
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

    for (const table of [
      'geography_boundary_load_ledger',
      'spatial_topology_certification_ledger',
      'delimitation_revision_boundaries',
      'delimitation_source_revisions',
      'constituency_versions',
      'constituencies',
      'parliamentary_constituency_versions',
      'parliamentary_constituencies',
      'district_versions',
      'districts',
      'state_versions',
      'states',
      'evidence_records',
      'dataset_versions',
      'datasets',
      'data_sources',
    ]) {
      await client.query(`DROP TABLE IF EXISTS public.${table} CASCADE`);
    }
    await client.query(`
      CREATE TABLE public.data_sources(id text PRIMARY KEY,name text NOT NULL,publisher text NOT NULL,authority_level text NOT NULL);
      CREATE TABLE public.datasets(id text PRIMARY KEY,name text NOT NULL,domain text NOT NULL,source_id text NOT NULL);
      CREATE TABLE public.dataset_versions(
        id text PRIMARY KEY,dataset_id text NOT NULL,version_tag text NOT NULL,checksum_sha256 text,
        default_status text NOT NULL DEFAULT 'UNKNOWN',verification_evidence_id uuid
      );
      CREATE TABLE public.evidence_records(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dataset_version_id text NOT NULL,artifact_name text NOT NULL,
        artifact_sha256 text NOT NULL,verification_authority text NOT NULL,verified_by text NOT NULL
      );
      CREATE TABLE public.states(
        code text PRIMARY KEY,name text NOT NULL,primary_dataset_version_id text,
        boundary geometry(MultiPolygon,4326)
      );
      CREATE TABLE public.state_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),state_code text NOT NULL,version_code text NOT NULL,
        name text NOT NULL,is_current boolean NOT NULL DEFAULT true,primary_dataset_version_id text
      );
      CREATE TABLE public.constituencies(
        id text PRIMARY KEY,internal_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
        canonical_code text NOT NULL,eci_ac_code text,name text NOT NULL,state_code text NOT NULL,
        boundary geometry(MultiPolygon,4326),primary_dataset_version_id text
      );
      CREATE TABLE public.constituency_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),constituency_internal_id uuid NOT NULL,
        version_code text NOT NULL,canonical_code text NOT NULL,name text NOT NULL,
        is_current boolean NOT NULL DEFAULT true,primary_dataset_version_id text
      );
      CREATE TABLE public.parliamentary_constituencies(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text NOT NULL UNIQUE,state_code text NOT NULL,
        name text NOT NULL,primary_dataset_version_id text
      );
      CREATE TABLE public.parliamentary_constituency_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),pc_id uuid NOT NULL,name text NOT NULL,
        is_current boolean NOT NULL DEFAULT true,primary_dataset_version_id text
      );
      CREATE TABLE public.districts(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),code text NOT NULL UNIQUE,state_code text NOT NULL,
        name text NOT NULL,primary_dataset_version_id text
      );
      CREATE TABLE public.district_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),district_id uuid NOT NULL,name text NOT NULL,
        is_current boolean NOT NULL DEFAULT true,primary_dataset_version_id text
      );
      CREATE TABLE public.delimitation_source_revisions(revision_id uuid PRIMARY KEY);
      CREATE TABLE public.delimitation_revision_boundaries(
        revision_id uuid NOT NULL,constituency_id text NOT NULL,boundary geometry(MultiPolygon,4326) NOT NULL,
        previous_area_km2 numeric NOT NULL,proposed_area_km2 numeric NOT NULL,centroid_shift_meters numeric NOT NULL,
        PRIMARY KEY(revision_id,constituency_id)
      );
      CREATE TABLE public.spatial_topology_certification_ledger(
        id uuid PRIMARY KEY,total_ac_count integer NOT NULL,total_pc_count integer NOT NULL,
        invalid_geometries_count integer NOT NULL,sliver_polygons_count integer NOT NULL,
        cross_boundary_overlaps_count integer NOT NULL,containment_violations_count integer NOT NULL,
        is_certified_100_percent boolean NOT NULL,audit_report jsonb NOT NULL
      );
    `);

    const migration = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/migrations/086_version_bound_national_geometries.sql'),
      'utf8',
    );
    await client.query(migration);

    // This artifact is a tiny, synthetic topology fixture. Its fake authority rows never leave this test DB.
    const sourceArtifact = JSON.stringify({ statePolygon, westPolygon, eastPolygon });
    const checksum = crypto.createHash('sha256').update(sourceArtifact).digest('hex');
    await registerDatasetVersion(client, 'test-boundaries-v1', checksum);
    await registerDatasetVersion(client, 'test-unverified-v1', checksum, 'UNVERIFIED');

    await client.query(
      "INSERT INTO public.states(code,name,primary_dataset_version_id) VALUES ('T0','Test State','test-boundaries-v1')",
    );
    await client.query(
      "INSERT INTO public.state_versions(state_code,version_code,name,primary_dataset_version_id) VALUES ('T0','T0-v1','Test State','test-boundaries-v1')",
    );
    const ac = await client.query<{ internal_id: string }>(
      `INSERT INTO public.constituencies(id,canonical_code,name,state_code,primary_dataset_version_id)
       VALUES ('T0-AC-1','T0-AC-1','Test Assembly','T0','test-boundaries-v1') RETURNING internal_id`,
    );
    await client.query(
      `INSERT INTO public.constituency_versions(constituency_internal_id,version_code,canonical_code,name,primary_dataset_version_id)
       VALUES ($1,'T0-AC-1-v1','T0-AC-1','Test Assembly','test-boundaries-v1')`,
      [ac.rows[0].internal_id],
    );
    const pc1 = await client.query<{ id: string }>(
      `INSERT INTO public.parliamentary_constituencies(code,state_code,name,primary_dataset_version_id)
       VALUES ('T0-PC-1','T0','Test PC West','test-boundaries-v1') RETURNING id`,
    );
    const pc2 = await client.query<{ id: string }>(
      `INSERT INTO public.parliamentary_constituencies(code,state_code,name,primary_dataset_version_id)
       VALUES ('T0-PC-2','T0','Test PC East','test-boundaries-v1') RETURNING id`,
    );
    await client.query(
      `INSERT INTO public.parliamentary_constituency_versions(pc_id,name,primary_dataset_version_id)
       VALUES ($1,'Test PC West','test-boundaries-v1'),($2,'Test PC East','test-boundaries-v1')`,
      [pc1.rows[0].id, pc2.rows[0].id],
    );
    const district = await client.query<{ id: string }>(
      `INSERT INTO public.districts(code,state_code,name,primary_dataset_version_id)
       VALUES ('T0-D-1','T0','Test District','test-boundaries-v1') RETURNING id`,
    );
    await client.query(
      `INSERT INTO public.district_versions(district_id,name,primary_dataset_version_id)
       VALUES ($1,'Test District','test-boundaries-v1')`,
      [district.rows[0].id],
    );

    const incomplete = await client.query<{ report: any }>(
      'SELECT public.fn_certify_current_geography_topology() AS report',
    );
    const incompleteReport = incomplete.rows[0].report;
    assert.equal(incompleteReport.certified, false);
    assert.equal(incompleteReport.summary.checksComplete, false);
    assert.equal(incompleteReport.summary.statePolygonsAvailable, false);
    assert.ok(
      incompleteReport.failureLog.some(
        (item: any) => item.entityType === 'STATE' && item.violationType === 'MISSING_GEOMETRY',
      ),
    );
    const incompletePersisted = await client.query<{ audit_report: any }>(
      'SELECT audit_report FROM public.spatial_topology_certification_ledger WHERE id=$1',
      [incompleteReport.auditId],
    );
    assert.equal(incompletePersisted.rowCount, 1);
    assert.equal(incompletePersisted.rows[0].audit_report.certified, false);

    await assert.rejects(
      load(client, 'STATE', 'test-unverified-v1', checksum, [
        { canonicalCode: 'T0', sourceFeatureId: 'state-1', geometry: statePolygon },
      ]),
      /SOURCE_NOT_VERIFIED_AS_AUTHORITATIVE/,
    );
    await load(client, 'STATE', 'test-boundaries-v1', checksum, [
      { canonicalCode: 'T0', sourceFeatureId: 'state-1', geometry: statePolygon },
    ]);

    await assert.rejects(
      load(client, 'PC', 'test-boundaries-v1', checksum, [
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-1', geometry: westPolygon },
      ]),
      /BOUNDARY_FEATURE_SET_DOES_NOT_MATCH_CURRENT_CANONICAL_VERSIONS/,
      'a partial PC ID set must fail before writing any boundary',
    );
    await assert.rejects(
      load(client, 'PC', 'test-boundaries-v1', checksum, [
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-1', geometry: westPolygon },
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-duplicate', geometry: eastPolygon },
      ]),
      /DUPLICATE_CANONICAL_CODE/,
    );
    await assert.rejects(
      load(client, 'PC', 'test-boundaries-v1', checksum, [
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-1', geometry: invalidBowtiePolygon },
        { canonicalCode: 'T0-PC-2', sourceFeatureId: 'pc-2', geometry: eastPolygon },
      ]),
      /INVALID_OR_SLIVER_GEOMETRY/,
    );
    await assert.rejects(
      load(client, 'PC', 'test-boundaries-v1', checksum, [
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-1', geometry: outsidePolygon },
        { canonicalCode: 'T0-PC-2', sourceFeatureId: 'pc-2', geometry: eastPolygon },
      ]),
      /STATE_PARENT_MISSING_INVALID_OR_CONTAINMENT_BREACH/,
    );
    await assert.rejects(
      load(client, 'PC', 'test-boundaries-v1', checksum, [
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-1', geometry: westPolygon },
        { canonicalCode: 'T0-PC-2', sourceFeatureId: 'pc-2', geometry: overlappingEastPolygon },
      ]),
      /BOUNDARIES_OVERLAP/,
    );
    await assert.rejects(
      load(client, 'PC', 'test-boundaries-v1', checksum, [
        { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-1', geometry: westPolygon },
        {
          canonicalCode: 'T0-PC-NOT-REGISTERED',
          sourceFeatureId: 'pc-unknown',
          geometry: eastPolygon,
        },
      ]),
      /BOUNDARY_FEATURE_SET_DOES_NOT_MATCH_CURRENT_CANONICAL_VERSIONS/,
    );

    const pcFixture = await load(client, 'PC', 'test-boundaries-v1', checksum, [
      { canonicalCode: 'T0-PC-1', sourceFeatureId: 'pc-west', geometry: westPolygon },
      { canonicalCode: 'T0-PC-2', sourceFeatureId: 'pc-east', geometry: eastPolygon },
    ]);
    assert.equal((pcFixture.rows[0].report as any).loadedEntityCount, 2);
    await load(client, 'AC', 'test-boundaries-v1', checksum, [
      { canonicalCode: 'T0-AC-1', sourceFeatureId: 'ac-1', geometry: statePolygon },
    ]);
    await load(client, 'DISTRICT', 'test-boundaries-v1', checksum, [
      { canonicalCode: 'T0-D-1', sourceFeatureId: 'district-1', geometry: statePolygon },
    ]);

    const finalResult = await client.query<{ report: any }>(
      'SELECT public.fn_certify_current_geography_topology() AS report',
    );
    const report = finalResult.rows[0].report;
    assert.equal(report.certified, true);
    assert.equal(report.summary.checksComplete, true);
    assert.equal(report.summary.assemblyBoundaryCoveragePercent, 100);
    assert.equal(report.summary.pcBoundaryCoveragePercent, 100);
    assert.equal(report.summary.districtBoundaryCoveragePercent, 100);
    assert.equal(report.summary.invalidGeometriesCount, 0);
    assert.equal(report.summary.geometryTypeViolationsCount, 0);
    assert.equal(report.summary.invalidSridCount, 0);
    assert.equal(report.summary.crossBoundaryOverlapsCount, 0);
    assert.equal(report.summary.stateContainmentViolationsCount, 0);
    assert.equal(report.summary.sourceProvenanceViolationsCount, 0);
    assert.equal(report.summary.stateCoverageGapCount, 0);
    assert.deepEqual(report.failureLog, []);

    const persisted = await client.query<{ audit_report: any; is_certified_100_percent: boolean }>(
      'SELECT audit_report,is_certified_100_percent FROM public.spatial_topology_certification_ledger WHERE id=$1',
      [report.auditId],
    );
    assert.equal(persisted.rowCount, 1);
    assert.equal(persisted.rows[0].is_certified_100_percent, true);
    assert.equal(persisted.rows[0].audit_report.auditId, report.auditId);
    const loaded = await client.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM public.geography_boundary_load_ledger WHERE entity_type IN ('STATE','AC','PC','DISTRICT')",
    );
    assert.equal(Number(loaded.rows[0].count), 4, 'failed loads must not leave ledger rows');
    const checksums = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM (
         SELECT boundary_geometry_sha256,encode(digest(ST_AsEWKB(boundary),'sha256'),'hex') AS calculated
         FROM public.parliamentary_constituency_versions WHERE is_current
       ) pc WHERE boundary_geometry_sha256=calculated`,
    );
    assert.equal(
      Number(checksums.rows[0].count),
      2,
      'each current PC version must persist its geometry checksum',
    );

    console.log(
      'Version-bound geography PostGIS fixture passed: provenance, complete IDs, geometry validation, topology, and persisted audit.',
    );
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
