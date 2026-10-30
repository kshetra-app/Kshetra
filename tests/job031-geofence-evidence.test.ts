/**
 * tests/job031-geofence-evidence.test.ts
 *
 * Verifies JOB 031: Geo-Fenced Issue Reporting & Evidence Pipeline
 *
 * Validates:
 * 1. PostGIS/GeoJSON Point-in-polygon constituency containment validation
 * 2. Rejection of out-of-bounds coordinates (COORDINATES_OUTSIDE_CONSTITUENCY)
 * 3. Fail-closed content moderation safety checks (CONTENT_MODERATION_FAILED)
 * 4. Clean civic text submission passing safety checks
 * 5. Corroborating community evidence photo attachments ("I saw this too")
 * 6. Evidence counters and media URL persistence
 */

import assert from 'node:assert/strict';
import {
  civicService,
  CoordinatesOutsideConstituencyError,
  ContentPolicyViolationError,
} from '../apps/api/src/services/civicService';
import { checkContentModeration } from '../apps/api/src/services/contentModeration';

console.log('=== RUNNING JOB 031 GEO-FENCED REPORTING & EVIDENCE TESTS ===\n');

async function runTests() {
  // 1. Point-in-Polygon: Clean issue with coordinates inside Jubilee Hills (TS-AC-61)
  console.log('[CHECK 1] Reporting issue with coordinates inside TS-AC-61 (Jubilee Hills)...');
  // Jubilee Hills coordinates: [17.4401, 78.3489]
  const validIssue = await civicService.createIssue(
    {
      title: 'Broken stormwater drain cover on Road No 36',
      description: 'Open manhole causing danger to pedestrians and two-wheelers at night.',
      category: 'sanitation',
      severity: 'high',
      constituencyId: 'TS-AC-61',
      stateCode: 'TS',
      latitude: 17.4401,
      longitude: 78.3489,
    },
    { userId: 'citizen-loc-1', userName: 'Sunil Rao' }
  );

  assert.equal(validIssue.constituencyId, 'TS-AC-61');
  assert.equal(validIssue.latitude, 17.4401);
  assert.equal(validIssue.longitude, 78.3489);
  console.log(`  [PASS] Issue created and bound to TS-AC-61 at [${validIssue.latitude}, ${validIssue.longitude}]`);

  // 2. Point-in-Polygon: Reject coordinates that fall in another AC (coordinates fall in TS-AC-61, declared TS-AC-67)
  console.log('[CHECK 2] Rejecting coordinates falling in another constituency (TS-AC-61 coordinates declared as TS-AC-67)...');
  await assert.rejects(
    async () => {
      await civicService.createIssue(
        {
          title: 'Damaged pavement near historic gate',
          description: 'Footpath pavers broken.',
          category: 'roads',
          constituencyId: 'TS-AC-67', // Declared Serilingampally
          stateCode: 'TS',
          latitude: 17.4401, // But coordinates are Jubilee Hills TS-AC-61
          longitude: 78.3489,
        },
        { userId: 'citizen-loc-2', userName: 'Ravi' }
      );
    },
    (err: any) => {
      assert.ok(
        err instanceof CoordinatesOutsideConstituencyError || err.code === 'COORDINATES_OUTSIDE_CONSTITUENCY',
        'Must reject with COORDINATES_OUTSIDE_CONSTITUENCY'
      );
      return true;
    }
  );
  console.log('  [PASS] CoordinatesOutsideConstituencyError thrown successfully');

  // 3. Content Moderation: Reject hateful or violent content fail-closed
  console.log('[CHECK 3] Verifying fail-closed content moderation rejection...');
  await assert.rejects(
    async () => {
      await civicService.createIssue(
        {
          title: 'We will kill and bomb this government office if road is not fixed',
          description: 'Hate speech and violent threats.',
          category: 'public_safety',
          constituencyId: 'TS-AC-67',
          stateCode: 'TS',
        },
        { userId: 'bad-actor-1', userName: 'Abusive User' }
      );
    },
    (err: any) => {
      assert.ok(
        err instanceof ContentPolicyViolationError || err.code === 'CONTENT_MODERATION_FAILED',
        'Must reject with CONTENT_MODERATION_FAILED'
      );
      return true;
    }
  );
  console.log('  [PASS] Violent threat flagged and rejected with ContentPolicyViolationError');

  // 4. Content Moderation: Rule engine verification on benign text
  console.log('[CHECK 4] Verifying clean civic issue passes moderation...');
  const cleanCheck = await checkContentModeration('Streetlights not working on 5th cross road for three nights');
  assert.equal(cleanCheck.flagged, false, 'Clean civic description must not be flagged');
  console.log('  [PASS] Clean text passes content moderation check');

  // 5. Corroborating Community Evidence Pipeline
  console.log('[CHECK 5] Adding corroborating community photo evidence ("I saw this too")...');
  const initialEvidenceCount = validIssue.evidenceCount;
  const evidence1 = await civicService.addEvidence(
    validIssue.id,
    {
      mediaUrl: 'https://images.poligram.in/evidence/drain_cover_damaged_1.jpg',
      caption: 'Taken today at 9:00 AM, drain cover completely missing.',
    },
    { userId: 'citizen-neighbor-2', userName: 'Deepa M' }
  );

  assert.equal(evidence1.issueId, validIssue.id);
  assert.equal(evidence1.mediaUrl, 'https://images.poligram.in/evidence/drain_cover_damaged_1.jpg');
  console.log(`  [PASS] Corroborating evidence attached with ID ${evidence1.id}`);

  // 6. Evidence counter increment and query
  console.log('[CHECK 6] Verifying evidence counter increment and retrieval...');
  const updatedIssue = await civicService.getIssue(validIssue.id);
  assert.ok(updatedIssue);
  assert.equal(updatedIssue.evidenceCount, initialEvidenceCount + 1, 'Evidence count must increment');
  assert.ok(updatedIssue.mediaUrls.includes('https://images.poligram.in/evidence/drain_cover_damaged_1.jpg'));
  console.log(`  [PASS] Updated issue evidenceCount = ${updatedIssue.evidenceCount}`);

  console.log('\n=============================================================');
  console.log('  JOB 031 GEOFENCE & EVIDENCE PIPELINE: ALL CHECKS PASSED!   ');
  console.log('=============================================================\n');
}

runTests().catch((err) => {
  console.error('\n[FAIL] JOB 031 Test encountered an error:', err);
  process.exit(1);
});
