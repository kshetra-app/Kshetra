import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
const security = fs.readFileSync('.github/workflows/security.yml', 'utf8');
const localeVerifier = fs.readFileSync('scripts/verify-13-locales.mjs', 'utf8');

function section(source, name) {
  const marker = new RegExp('^  ' + name + ':\s*$', 'm');
  const match = marker.exec(source);
  const start = match.index;
  const next = source.slice(match.index + match[0].length).search(/^  [a-zA-Z0-9_-]+:\s*$/m);
  return source.slice(start, next === -1 ? undefined : match.index + match[0].length + next);
}

// CI definitions are release policy, so test the real workflow text rather than a mock.
for (const source of [ci, security]) {
  assert.ok(!/^\s*continue-on-error:\s*true\s*$/m.test(source), 'no release-critical step may be fail-open');
  assert.match(source, /pull_request:\n(?:.|\n)*?branches:\s*\[master, main, develop\]/, 'pull requests to all active branch names must run');
  assert.match(source, /push:\n(?:.|\n)*?branches:\s*\[master, main, develop\]/, 'pushes to all active branch names must run');
}
assert.match(section(ci, 'governance'), /verify-13-locales\.mjs --strict/, 'CI must enforce strict locale parity');
assert.match(section(ci, 'lint'), /prettier --check/);
assert.match(section(ci, 'lint'), /eslint .*--max-warnings=0/);
assert.match(section(security, 'sca'), /npm audit --audit-level=high/);
assert.match(section(security, 'sca'), /ghcr\.io\/google\/osv-scanner:v2\.4\.0 scan source -r/);
assert.match(section(security, 'sast'), /semgrep/i);
assert.match(section(security, 'sbom'), /License policy gate/);
assert.match(section(security, 'sbom'), /license-checker@25\.0\.1/);
assert.match(section(security, 'sbom'), /cyclonedx/);
assert.match(section(security, 'sbom'), /test -s sbom\.cdx\.json/);
assert.match(section(security, 'sbom'), /if-no-files-found:\s*error/);
assert.ok(/--strict/.test(localeVerifier), 'locale verifier must expose strict mode');

// Negative-path probe helper: each deliberate failure must be observed as non-zero.
function expectFailure(label, command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.notEqual(result.status, 0, label + ' must exit non-zero when the failure is deliberate');
  console.log('[PASS] Negative path rejected: ' + label + ' (exit=' + result.status + ')');
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-gate-regression-'));
try {
  // Prettier: deliberately malformed formatting must not return success.
  const unformatted = path.join(temp, 'fixture.json');
  fs.writeFileSync(unformatted, '{"a":1}\n');
  expectFailure('Prettier formatting violation', 'npx', ['--no-install', 'prettier', '--check', unformatted]);

  // ESLint: a deliberately undefined identifier must be rejected by the lint command.
  const lintFixture = path.join(temp, 'lint-fixture.js');
  fs.writeFileSync(lintFixture, 'missingIdentifier();\n');
  expectFailure(
    'ESLint deliberate lint error',
    'npx',
    ['--no-install', 'eslint', '--no-config-lookup', '--no-ignore', '--rule', '{"no-undef":"error"}', lintFixture],
  );

  // npm audit: a disposable project with a known vulnerable direct dependency.
  const vulnerable = path.join(temp, 'vulnerable');
  fs.mkdirSync(vulnerable);
  fs.writeFileSync(path.join(vulnerable, 'package.json'), JSON.stringify({ name: 'audit-fixture', version: '1.0.0', private: true, dependencies: { 'minimist': '0.0.8' } }));
  const install = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: vulnerable, encoding: 'utf8' });
  assert.equal(install.status, 0, 'npm audit fixture lockfile generation must succeed: ' + (install.stderr || ''));
  expectFailure('high-severity npm advisory', 'npm', ['audit', '--audit-level=high', '--omit=dev'], vulnerable);

  // Locale parity: mutate a temporary copy by deleting one English key from a non-English locale.
  const localeFixture = path.join(temp, 'locale-fixture');
  fs.mkdirSync(localeFixture);
  fs.mkdirSync(path.join(localeFixture, 'scripts'));
  fs.mkdirSync(path.join(localeFixture, 'apps', 'mobile', 'i18n', 'locales'), { recursive: true });
  fs.mkdirSync(path.join(localeFixture, 'apps', 'mobile', 'i18n'), { recursive: true });
  for (const file of ['scripts/verify-13-locales.mjs']) fs.copyFileSync(file, path.join(localeFixture, file));
  fs.cpSync(path.join(root, 'apps/mobile/i18n/locales'), path.join(localeFixture, 'apps/mobile/i18n/locales'), { recursive: true });
  fs.copyFileSync(path.join(root, 'apps/mobile/i18n/index.ts'), path.join(localeFixture, 'apps/mobile/i18n/index.ts'));
  const hi = path.join(localeFixture, 'apps/mobile/i18n/locales/hi.ts');
  const hiText = fs.readFileSync(hi, 'utf8');
  assert.match(hiText, /"appName"\s*:/, 'fixture key to remove must exist');
  fs.writeFileSync(hi, hiText.replace(/\s*"appName"\s*:\s*[^,\n]+,?/, ''));
  expectFailure('missing locale key in strict mode', process.execPath, ['scripts/verify-13-locales.mjs', '--strict'], localeFixture);

  // SBOM missing: the same file-presence assertion used in the workflow must fail.
  expectFailure('missing SBOM artifact', 'sh', ['-c', 'test -s sbom.cdx.json'], temp);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('CI release-gate regression tests passed.');
