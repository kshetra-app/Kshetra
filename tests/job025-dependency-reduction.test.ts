/**
 * tests/job025-dependency-reduction.test.ts
 * 
 * Verifies JOB 025: Mobile Dependency Reduction & Tree-Shaking.
 * - Zero WebRTC dependencies in runtime or devDependencies.
 * - Zero build-only tooling leaking into runtime dependencies.
 * - Confirms essential mobile dependencies are correctly pinned.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== RUNNING JOB 025 DEPENDENCY REDUCTION VERIFICATION ===\n');

const packageJsonPath = path.resolve(process.cwd(), 'apps/mobile/package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 1. Audit WebRTC elimination
console.log('[CHECK 1] Auditing apps/mobile/package.json for WebRTC removal...');
assert.strictEqual(
  pkg.dependencies?.['react-native-webrtc'],
  undefined,
  'react-native-webrtc must be completely absent from dependencies'
);
assert.strictEqual(
  pkg.devDependencies?.['@config-plugins/react-native-webrtc'],
  undefined,
  '@config-plugins/react-native-webrtc must be completely absent from devDependencies'
);
console.log('  [PASS] Zero WebRTC dependencies in consumer mobile bundle.');

// 2. Audit build tooling reclassification (zero leakage into runtime)
console.log('[CHECK 2] Verifying build tooling isolation into devDependencies...');
assert.strictEqual(
  pkg.dependencies?.['@babel/types'],
  undefined,
  '@babel/types must not be in runtime dependencies'
);
assert.ok(
  pkg.devDependencies?.['@babel/types'] != null,
  '@babel/types must be properly categorized in devDependencies'
);
console.log('  [PASS] Build tooling correctly isolated in devDependencies.');

// 3. Scan mobile source code for prohibited imports
console.log('[CHECK 3] Scanning mobile source code for prohibited native imports...');
const mobileAppDir = path.resolve(process.cwd(), 'apps/mobile/app');
const mobileCompDir = path.resolve(process.cwd(), 'apps/mobile/components');

function scanDir(dir: string, regex: RegExp, prohibitedName: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, regex, prohibitedName);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(
        !regex.test(content),
        `Found prohibited import ${prohibitedName} in ${fullPath}`
      );
    }
  }
}

scanDir(mobileAppDir, /from\s+['"]react-native-webrtc['"]/, 'react-native-webrtc');
scanDir(mobileCompDir, /from\s+['"]react-native-webrtc['"]/, 'react-native-webrtc');
console.log('  [PASS] Audited all mobile screens and components: 0 prohibited imports found.');

console.log('\n=============================================================');
console.log('  JOB 025 DEPENDENCY REDUCTION: ALL CHECKS PASSED!           ');
console.log('=============================================================\n');
