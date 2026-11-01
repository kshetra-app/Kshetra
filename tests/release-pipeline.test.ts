import assert from 'node:assert/strict';
import { runReleasePipeline } from '../scripts/ci/release-pipeline.mjs';

async function run() {
  console.log('=== RUNNING DOMAIN 10: JOB 083 AUTOMATED CD RELEASE PIPELINE SUITE ===');

  // Check 1: Semantic Tag Validation & Format Rejection
  console.log('\n[CHECK 1] Verifying semantic tag parser (vX.Y.Z enforcement)...');
  assert.throws(
    () => runReleasePipeline('invalid-tag-1.0'),
    /Invalid release tag/,
    'Non-semantic tag must be rejected'
  );
  assert.throws(
    () => runReleasePipeline('1.0.0'),
    /Invalid release tag/,
    'Missing v prefix must be rejected'
  );
  console.log('  [PASS] Non-semantic release tags rejected fail-closed.');

  // Check 2: Full Release Pipeline Execution
  console.log('\n[CHECK 2] Executing automated release pipeline for tag v1.0.0...');
  const manifest = runReleasePipeline('v1.0.0', '56bc50f7b79e7bd183380f544251b71729635667');
  assert.strictEqual(manifest.releaseTag, 'v1.0.0');
  assert.strictEqual(manifest.commitSha, '56bc50f7b79e7bd183380f544251b71729635667');
  assert.strictEqual(manifest.pipelinePassed, true, 'Full release pipeline must pass');
  console.log(`  [PASS] Release pipeline execution succeeded for ${manifest.releaseTag}.`);

  // Check 3: Pipeline Stages Completeness
  console.log('\n[CHECK 3] Verifying all 6 mission-critical release stages passed...');
  assert.strictEqual(manifest.stages.length, 6, 'Must include exactly 6 defined release stages');
  for (const stage of manifest.stages) {
    assert.strictEqual(stage.status, 'PASSED', `Stage [${stage.stageName}] must have PASSED status`);
    assert.ok(stage.durationSeconds > 0, `Stage [${stage.stageName}] duration must be > 0`);
    console.log(`  - Stage: ${stage.stageName} (${stage.durationSeconds}s) [PASSED]`);
  }
  console.log('  [PASS] All 6 release stages verified passed.');

  // Check 4: Keystore Release Signing & Cryptographic SHA-256 Checksum
  console.log('\n[CHECK 4] Verifying keystore release signing and SHA-256 release checksum...');
  assert.strictEqual(manifest.signing.keystoreConfigured, true);
  assert.strictEqual(manifest.signing.signatureVerified, true);
  assert.strictEqual(manifest.signing.sha256Checksum.length, 64, 'SHA-256 digest must be 64 hex characters');
  console.log(`  [PASS] Release keystore signature verified (SHA-256: ${manifest.signing.sha256Checksum}).`);

  // Check 5: Fastlane Store Staging & 13 Indic Language Localization
  console.log('\n[CHECK 5] Verifying Fastlane store metadata across 13 constitutional languages...');
  assert.strictEqual(manifest.fastlane.trackTarget, 'internal');
  assert.strictEqual(manifest.fastlane.localesValidated.length, 13, 'Must validate all 13 constitutional languages');
  const expectedLanguages = ['en', 'te', 'hi', 'kn', 'mr', 'ta', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ne'];
  for (const lang of expectedLanguages) {
    assert.ok(manifest.fastlane.localesValidated.includes(lang), `Must support Indic locale ${lang}`);
  }
  console.log(`  [PASS] Fastlane store staging validated across all 13 languages (${manifest.fastlane.localesValidated.join(', ')}).`);

  console.log('\n===============================================================');
  console.log('  JOB 083 CD RELEASE PIPELINE: ALL CHECKS PASSED (100%)!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
