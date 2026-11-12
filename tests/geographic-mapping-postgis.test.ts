/**
 * Geographic Lookup Contract Checks (JOB 016 evidence refresh)
 *
 * Authority: Master Product Blueprint, docs/GEOGRAPHIC_PIPELINE.md,
 *            and PLAN-DOMAIN-1-FOUNDATIONAL-GEOGRAPHY-AND-DELIMITATION-REV-1.0
 *
 * Verifies local development lookup behavior, postal-reference semantics, input
 * validation, and a PostgreSQL bbox-query example. This script does not call the
 * production PostGIS RPC or exercise HTTP endpoints; its report states that scope.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { canonicalGeographyService } from '../apps/api/src/services/canonicalGeographyService';

async function main() {
  console.log('=== RUNNING JOB 016 GEOGRAPHIC LOOKUP CONTRACT CHECKS ===\n');

  // ─── PART 1: POINT-IN-POLYGON & COORDINATE BOUNDS ──────────────────────────────
  console.log('[CHECK 1] Testing local development lookup behavior...');

  // 1.1 Valid point: Kodangal (centroid 17.1105, 77.6253) -> AC 72
  const kodangalLoc = await canonicalGeographyService.locatePoint({ lat: 17.1105, lng: 77.6253 });
  assert.ok(kodangalLoc, 'Kodangal point lookup must resolve');
  assert.ok(kodangalLoc.constituency, 'Kodangal constituency must not be null');
  assert.strictEqual(kodangalLoc.constituency.acNo, 72, 'Kodangal must resolve to AC 72');
  assert.strictEqual(kodangalLoc.constituency.name, 'Kodangal');
  console.log('  [PASS] Kodangal centroid resolved to AC 72 (Kodangal).');

  // 1.2 Valid point: Mancherial (centroid 18.8714, 79.4637) -> AC 4
  const mancherialLoc = await canonicalGeographyService.locatePoint({ lat: 18.8714, lng: 79.4637 });
  assert.ok(mancherialLoc && mancherialLoc.constituency);
  assert.strictEqual(mancherialLoc.constituency.acNo, 4);
  assert.strictEqual(mancherialLoc.constituency.name, 'Mancherial');
  console.log('  [PASS] Mancherial centroid resolved to AC 4 (Mancherial).');

  // 1.3 Valid point: Charminar (centroid 17.3616, 78.4747) -> AC 66
  const charminarLoc = await canonicalGeographyService.locatePoint({ lat: 17.3616, lng: 78.4747 });
  assert.ok(charminarLoc && charminarLoc.constituency);
  assert.strictEqual(charminarLoc.constituency.acNo, 66);
  assert.strictEqual(charminarLoc.constituency.name, 'Charminar');
  console.log('  [PASS] Charminar centroid resolved to AC 66 (Charminar).');

  // 1.4 Unmapped location: Gulf of Guinea (0.0, 0.0) -> Fail-closed: null, no hallucination
  const oceanLoc = await canonicalGeographyService.locatePoint({ lat: 0.0, lng: 0.0 });
  assert.ok(oceanLoc);
  assert.strictEqual(
    oceanLoc.constituency,
    null,
    'Unmapped point must fail closed with null constituency',
  );
  console.log('  [PASS] Unmapped coordinate [0, 0] failed closed cleanly without hallucination.');

  // 1.5 Adversarial inputs: Out of bounds latitude / longitude
  await assert.rejects(
    async () => {
      await canonicalGeographyService.locatePoint({ lat: 95.0, lng: 78.0 });
    },
    /INVALID_COORDINATES/,
    'Latitude > 90 must throw INVALID_COORDINATES',
  );
  await assert.rejects(
    async () => {
      await canonicalGeographyService.locatePoint({ lat: 17.0, lng: 190.0 });
    },
    /INVALID_COORDINATES/,
    'Longitude > 180 must throw INVALID_COORDINATES',
  );
  await assert.rejects(
    async () => {
      await canonicalGeographyService.locatePoint({ lat: NaN, lng: 78.0 });
    },
    /INVALID_COORDINATES/,
    'NaN coordinates must throw INVALID_COORDINATES',
  );
  console.log('  [PASS] Adversarial & out-of-bounds coordinates strictly rejected.');

  // ─── PART 2: DETERMINISTIC POSTAL CROSSWALK (PIN -> AC) ────────────────────────
  console.log('\n[CHECK 2] Testing canonicalGeographyService.locateByPinCode()...');

  // 2.1 Provisional PIN code: 500002 (Charminar)
  const charminarPin = await canonicalGeographyService.locateByPinCode('500002');
  assert.ok(charminarPin, 'PIN 500002 must return its reviewed provisional reference');
  assert.strictEqual(charminarPin.pinCode, '500002');
  assert.strictEqual(charminarPin.singleMatch, false);
  assert.strictEqual(charminarPin.primaryConstituency, null);
  assert.strictEqual(charminarPin.verificationStatus, 'PROVISIONAL_APPROXIMATION');
  assert.strictEqual(charminarPin.candidates.length, 1);
  assert.strictEqual(charminarPin.candidates[0].constituency.acNo, 66);
  assert.strictEqual(charminarPin.candidates[0].constituency.name, 'Charminar');
  assert.strictEqual(charminarPin.candidates[0].overlapWeight, null);
  console.log(
    '  [PASS] PIN 500002 remains a provisional Charminar candidate without an exact-match or weight claim.',
  );

  // 2.2 Multi-AC PIN code: 500001 (Hyderabad GPO / Abids)
  // Intersects Goshamahal (65), Nampally (63), Malakpet (58)
  const gpoPin = await canonicalGeographyService.locateByPinCode('500001');
  assert.ok(gpoPin, 'PIN 500001 must resolve');
  assert.strictEqual(gpoPin.pinCode, '500001');
  assert.strictEqual(gpoPin.singleMatch, false, 'Multi-AC PIN must indicate singleMatch = false');
  assert.ok(gpoPin.candidates.length >= 3, '500001 must have 3 candidate ACs');

  const acNos = gpoPin.candidates.map((c) => c.constituency.acNo);
  assert.ok(acNos.includes(65), 'Candidates must include Goshamahal AC 65');
  assert.ok(acNos.includes(63), 'Candidates must include Nampally AC 63');
  assert.ok(acNos.includes(58), 'Candidates must include Malakpet AC 58');

  assert.ok(gpoPin.candidates.every((candidate) => candidate.overlapWeight === null));
  assert.strictEqual(gpoPin.verificationStatus, 'DOCUMENTED_MULTI_AC_AMBIGUITY');
  assert.ok(gpoPin.candidates[0].localityNote.length > 0, 'Candidates must include locality notes');
  console.log(
    '  [PASS] Multi-AC PIN 500001 returns documented candidates without invented overlap weights.',
  );

  // 2.3 Unregistered PIN: 999999
  const unregPin = await canonicalGeographyService.locateByPinCode('999999');
  assert.ok(unregPin);
  assert.strictEqual(unregPin.singleMatch, false);
  assert.strictEqual(unregPin.primaryConstituency, null);
  assert.strictEqual(unregPin.candidates.length, 0);
  console.log('  [PASS] Unregistered PIN 999999 returned zero candidates fail-closed.');

  // 2.4 Invalid PIN formats: 5 digits, alphanumeric, empty
  await assert.rejects(
    async () => {
      await canonicalGeographyService.locateByPinCode('50001');
    },
    /INVALID_PIN_CODE/,
    '5-digit PIN must be rejected',
  );
  await assert.rejects(
    async () => {
      await canonicalGeographyService.locateByPinCode('5000012');
    },
    /INVALID_PIN_CODE/,
    '7-digit PIN must be rejected',
  );
  await assert.rejects(
    async () => {
      await canonicalGeographyService.locateByPinCode('ABC123');
    },
    /INVALID_PIN_CODE/,
    'Alphanumeric PIN must be rejected',
  );
  console.log('  [PASS] Invalid PIN code formats rejected fail-closed.');

  // ─── PART 3: POSTGRESQL BOUNDING-BOX QUERY EXAMPLE ─────────────────────────────
  console.log('\n[CHECK 3] Verifying a PostgreSQL bounding-box query example (not PostGIS)...');
  const db = new PGlite();
  try {
    // PGlite here does not load PostGIS; this only checks the example bbox SQL.
    await db.exec(`
      CREATE TABLE test_constituencies (
        id TEXT PRIMARY KEY,
        ac_no INT NOT NULL,
        name TEXT NOT NULL,
        state_code TEXT NOT NULL,
        district TEXT NOT NULL,
        min_lat DOUBLE PRECISION NOT NULL,
        max_lat DOUBLE PRECISION NOT NULL,
        min_lng DOUBLE PRECISION NOT NULL,
        max_lng DOUBLE PRECISION NOT NULL
      );

      INSERT INTO test_constituencies VALUES
        ('TS-AC-004', 4, 'Mancherial', 'TS', 'Mancherial', 18.80, 18.95, 79.40, 79.55),
        ('TS-AC-072', 72, 'Kodangal', 'TS', 'Vikarabad', 17.05, 17.20, 77.55, 77.70);

      CREATE OR REPLACE FUNCTION locate_test_point(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
      RETURNS TABLE(id TEXT, ac_no INT, name TEXT) AS $$
      BEGIN
        RETURN QUERY
        SELECT c.id, c.ac_no, c.name
        FROM test_constituencies c
        WHERE p_lat BETWEEN c.min_lat AND c.max_lat
          AND p_lng BETWEEN c.min_lng AND c.max_lng
        LIMIT 1;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const rpcRes = await db.query(`SELECT * FROM locate_test_point(18.8714, 79.4637);`);
    assert.strictEqual(rpcRes.rows.length, 1);
    assert.strictEqual(rpcRes.rows[0].name, 'Mancherial');
    assert.strictEqual(rpcRes.rows[0].ac_no, 4);

    const rpcEmpty = await db.query(`SELECT * FROM locate_test_point(0.0, 0.0);`);
    assert.strictEqual(rpcEmpty.rows.length, 0);
    console.log('  [PASS] Bounding-box SQL example returned the expected row in PGlite.');
  } finally {
    await db.close();
  }

  // ─── PART 4: GENERATE EVIDENCE DOSSIER ─────────────────────────────────────────
  const reportData = {
    milestone: 'W016',
    title: 'Geographic Lookup Contract Checks — Development Behavior and Postal References',
    status: 'LIMITED / LOCAL CHECKS ONLY',
    verified_at: new Date().toISOString(),
    verification_scope: {
      local_lookup:
        'Development service behavior using local geography data when no database RPC is available.',
      database_example:
        'PGlite PostgreSQL emulation of a bounding-box query; PostGIS extension is not loaded.',
      production_postgis_rpc: 'NOT TESTED BY THIS SCRIPT',
      http_endpoints: 'NOT TESTED BY THIS SCRIPT',
    },
    components_verified: {
      local_development_lookup: {
        tested_points: [
          { lat: 17.1105, lng: 77.6253, expected_ac: 72, resolved_ac: 72, status: 'PASS' },
          { lat: 18.8714, lng: 79.4637, expected_ac: 4, resolved_ac: 4, status: 'PASS' },
          { lat: 17.3616, lng: 78.4747, expected_ac: 66, resolved_ac: 66, status: 'PASS' },
          { lat: 0.0, lng: 0.0, expected_ac: null, resolved_ac: null, status: 'PASS' },
        ],
        boundary_validation: 'PASS (Strict -90..90, -180..180 & NaN rejection)',
      },
      pglite_bbox_example: {
        status: 'PASS',
        runtime: 'PGlite PostgreSQL emulation; no PostGIS extension',
      },
      postal_crosswalk: {
        single_ac_pins: [
          { pin: '500002', candidates: [66], weight: null, status: 'PROVISIONAL_ONLY' },
        ],
        multi_ac_pins: [
          {
            pin: '500001',
            candidate_count: 3,
            acs: [65, 63, 58],
            overlap_weights: null,
            status: 'DOCUMENTED_AMBIGUITY',
          },
        ],
        unregistered_pins: [{ pin: '999999', candidates: 0, status: 'PASS' }],
        format_validation: 'PASS (Strict 6-digit regex /^[1-9][0-9]{5}$/)',
      },
      fail_closed_adherence:
        'PASS (Invalid and unmapped inputs do not resolve to a fabricated constituency)',
    },
    summary:
      'Local development lookup, PIN reference semantics, and input validation checks passed. This script does not verify the production PostGIS RPC, live constituency coverage, or HTTP endpoints.',
  };

  fs.writeFileSync(
    path.resolve('reports/w016_geographic_mapping_report.json'),
    JSON.stringify(reportData, null, 2),
  );

  const reportMd = `# W016: Geographic Lookup Contract Checks

- **Milestone:** W016
- **Title:** Development Lookup Behavior, PIN Reference Semantics, and Input Validation
- **Executed At:** ${reportData.verified_at}
- **Result:** **LIMITED — LOCAL CHECKS PASSED; PRODUCTION POSTGIS NOT VERIFIED BY THIS SCRIPT**
- **Scope:** This script uses local development lookup behavior and a PGlite PostgreSQL emulation. It does not call the production PostGIS RPC or HTTP endpoints.

---

## 1. Local Development Lookup and Input Validation
- **Local reference checks:** Development lookup resolves the checked-in Telangana examples for Kodangal AC 72, Mancherial AC 4, and Charminar AC 66.
- **Unmapped coordinate:** [0, 0] returns no constituency.
- **Adversarial inputs:** Out-of-range and non-numeric coordinates are rejected with \`INVALID_COORDINATES\`.
- **PGlite example:** A bounding-box query returns its expected row in PGlite. This is not a PostGIS test and does not verify polygon containment.

---

## 2. Postal Crosswalk (PIN -> AC)
- **Provisional PIN references:** PIN 500002 points to one reviewed candidate (Charminar AC 66), but remains provisional with no exact-match or probability claim.
- **Multi-AC ambiguity:** PIN 500001 returns the documented candidates (Goshamahal AC 65, Nampally AC 63, Malakpet AC 58) without invented overlap weights.
- **Fail-Closed Format:** Alphanumeric, 5-digit, and 7-digit inputs fail closed with \`INVALID_PIN_CODE\`. Unmapped PINs return zero candidate entities.

## Not Verified Here
- The production \`locate_constituency_point_truthful\` PostGIS RPC, its deployed migration, live database boundaries, and API endpoint behavior are outside this script's checks.
`;

  fs.writeFileSync(path.resolve('reports/w016_geographic_mapping_report.md'), reportMd);

  console.log('\n[PASS] Evidence generated at reports/w016_geographic_mapping_report.*');
  console.log('===============================================================');
  console.log('   LOCAL LOOKUP CONTRACT CHECKS PASSED; LIVE POSTGIS NOT TESTED.  ');
  console.log('===============================================================\n');
}

main().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
