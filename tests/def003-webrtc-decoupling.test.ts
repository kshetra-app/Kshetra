/**
 * DEF-003 Consumer Mobile Decoupling Verification Suite
 * Authority: Master Product Blueprint, Amendment v1.2, Plan PLAN-W052-REV-1.0
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function run() {
  console.log('=== RUNNING DEF-003 CONSUMER MOBILE DECOUPLING VERIFICATION ===\n');

  // Check 1: apps/mobile/package.json
  console.log('[CHECK 1] Verifying apps/mobile/package.json dependencies...');
  const pkgPath = path.resolve('apps/mobile/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.strictEqual(
    pkg.dependencies['react-native-webrtc'],
    undefined,
    'react-native-webrtc must be eliminated from mobile dependencies'
  );
  assert.strictEqual(
    pkg.devDependencies?.['@config-plugins/react-native-webrtc'],
    undefined,
    '@config-plugins/react-native-webrtc must be eliminated from devDependencies'
  );
  console.log('  [PASS] react-native-webrtc completely absent from apps/mobile/package.json.');

  // Check 2: Zero static imports in mobile consumer app
  console.log('\n[CHECK 2] Scanning all mobile TypeScript source files for static WebRTC imports...');
  const mobileAppDir = path.resolve('apps/mobile/app');
  const files: string[] = [];

  function collectFiles(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectFiles(full);
      } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  }

  collectFiles(mobileAppDir);
  assert.ok(files.length > 10, 'Must audit at least 10 mobile screens');

  const staticImportRegex = /import\s+.*from\s+['"]react-native-webrtc['"]/;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.strictEqual(
      staticImportRegex.test(content),
      false,
      `Static import of react-native-webrtc detected in ${file}`
    );
  }
  console.log(`  [PASS] Audited ${files.length} mobile screens: 0 static WebRTC imports.`);

  // Check 3: LiveBroadcaster fallback and studio guidance
  console.log('\n[CHECK 3] Verifying LiveBroadcaster fallback and studio guidance...');
  const broadcasterPath = path.resolve('apps/mobile/components/LiveBroadcaster.tsx');
  const content = fs.readFileSync(broadcasterPath, 'utf8');

  assert.ok(content.includes("require('react-native-webrtc')"), 'Guarded require must be preserved');
  assert.ok(
    content.includes('PANIN Studio Web Client at https://studio.panin.in'),
    'Must provide Studio Web Client guidance for studio broadcasts'
  );
  console.log('  [PASS] LiveBroadcaster fail-safe boundary and Web Studio guidance verified.');

  console.log('\n=============================================================');
  console.log('  DEF-003 CONSUMER MOBILE DECOUPLING: ALL CHECKS PASSED!     ');
  console.log('=============================================================\n');
}

run();
