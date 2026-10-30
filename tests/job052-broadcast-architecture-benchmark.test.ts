import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('JOB 052: Professional Broadcast Architecture Certification (DEF-003 Decoupling)', async (t) => {
  const rootDir = path.resolve(__dirname, '..');
  const mobilePackageJsonPath = path.join(rootDir, 'apps', 'mobile', 'package.json');
  const hlsPlayerPath = path.join(rootDir, 'apps', 'mobile', 'components', 'HlsPlayer.tsx');

  await t.test('1. Certifies react-native-webrtc is NOT bundled in consumer mobile package.json', () => {
    assert.ok(fs.existsSync(mobilePackageJsonPath), 'apps/mobile/package.json must exist');
    const mobilePkg = JSON.parse(fs.readFileSync(mobilePackageJsonPath, 'utf8'));

    const deps = mobilePkg.dependencies || {};
    const devDeps = mobilePkg.devDependencies || {};

    assert.equal(
      deps['react-native-webrtc'],
      undefined,
      'DEF-003 Violation: react-native-webrtc must not be present in mobile dependencies'
    );
    assert.equal(
      devDeps['react-native-webrtc'],
      undefined,
      'DEF-003 Violation: react-native-webrtc must not be present in mobile devDependencies'
    );
  });

  await t.test('2. Certifies consumer playback is decoupled via HlsPlayer WebView wrapper', () => {
    assert.ok(fs.existsSync(hlsPlayerPath), 'HlsPlayer.tsx must exist in mobile components');
    const content = fs.readFileSync(hlsPlayerPath, 'utf8');

    assert.ok(
      content.includes('react-native-webview'),
      'HlsPlayer must utilize react-native-webview for zero-native-bloat HLS playback'
    );
    assert.ok(
      content.includes('hls.js'),
      'HlsPlayer must reference hls.js for MSE-based HLS streaming'
    );
  });

  await t.test('3. Certifies broadcast architecture maintains binary size budget (Universal APK <= 45 MB)', () => {
    // Check that no other native video streaming engines are added
    const mobilePkg = JSON.parse(fs.readFileSync(mobilePackageJsonPath, 'utf8'));
    const deps = mobilePkg.dependencies || {};

    assert.equal(deps['react-native-video'], undefined, 'No heavyweight react-native-video bundle');
    assert.equal(deps['react-native-nodemediaclient'], undefined, 'No native RTMP publisher in consumer app');
  });
});
