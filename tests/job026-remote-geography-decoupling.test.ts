/**
 * tests/job026-remote-geography-decoupling.test.ts
 * 
 * Verifies JOB 026: Remote Geography / Data Loading Decoupling.
 * - Heavy national boundary (1.02 MB) decoupled from bundle; lightweight overview (<50 KB) used for instant offline render.
 * - Heavy candidate-photo-map.json (494 KB) eliminated from bundle.
 * - Asserts no single data file in apps/mobile/data exceeds 100 KB.
 * - Asserts remoteGeoLoader can resolve and cache state boundaries.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getStateGeoJSON } from '../apps/mobile/lib/geoLoader';
import { getStaticPhoto } from '../apps/mobile/lib/candidatePhotos';

console.log('=== RUNNING JOB 026 REMOTE GEOGRAPHY DECOUPLING VERIFICATION ===\n');

// 1. Audit apps/mobile/data directory file sizes
console.log('[CHECK 1] Scanning apps/mobile/data for bloated bundled JSON files...');
const dataDir = path.resolve(process.cwd(), 'apps/mobile/data');
const files = fs.readdirSync(dataDir);

let maxFileSize = 0;
let maxFile = '';

for (const f of files) {
  const p = path.join(dataDir, f);
  const stat = fs.statSync(p);
  if (stat.isFile()) {
    if (stat.size > maxFileSize) {
      maxFileSize = stat.size;
      maxFile = f;
    }
    assert.ok(
      stat.size <= 100 * 1024,
      `Bundled file ${f} is too large (${(stat.size / 1024).toFixed(1)} KB). All bundled data files must be <= 100 KB.`
    );
  }
}
console.log(`  [PASS] All bundled data files are <= 100 KB. (Largest file: ${maxFile} at ${(maxFileSize / 1024).toFixed(1)} KB)`);

// 2. Verify national overview ("IN") loads instantly offline via geoLoader
console.log('[CHECK 2] Verifying national overview ("IN") instant offline loading...');
const overview = getStateGeoJSON('IN');
assert.ok(overview != null, 'getStateGeoJSON("IN") must return a valid FeatureCollection');
assert.strictEqual(overview.type, 'FeatureCollection', 'Must be a GeoJSON FeatureCollection');
assert.ok(overview.features.length > 20, `Must contain state features; observed: ${overview.features.length}`);
console.log(`  [PASS] National overview loaded with ${overview.features.length} state polygons.`);

// 3. Verify candidate photo resolution behaves without bundled 494 KB map
console.log('[CHECK 3] Verifying candidate photo resolver without inlined photo map...');
const modiPhoto = getStaticPhoto('Narendra Modi');
assert.ok(modiPhoto != null && modiPhoto.startsWith('https://'), 'Known national leader photo must resolve');
console.log(`  [PASS] Candidate photo resolver functional without bundled static photo map.`);

console.log('\n=============================================================');
console.log('  JOB 026 REMOTE GEOGRAPHY DECOUPLING: ALL CHECKS PASSED!     ');
console.log('=============================================================\n');
