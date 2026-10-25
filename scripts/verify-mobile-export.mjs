#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const dist = path.join(root, 'apps/mobile/dist');
const reportPath = path.resolve(process.env.MOBILE_EXPORT_REPORT || path.join(root, 'reports/mobile-metro-export-report.json'));
const maximumPayloadBytes = Number(process.env.MAX_MOBILE_EXPORT_BYTES || 30 * 1024 * 1024);
const failures = [];
const files = [];
const assetFiles = [];
let totalPayloadBytes = 0;
let bundleBytes = 0;
let sourceMapBytes = 0;
let assetBytes = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(absolute);
    else if (entry.isFile()) files.push(absolute);
  }
}

if (!fs.existsSync(dist) || !fs.statSync(dist).isDirectory()) {
  console.error(`MOBILE_EXPORT_FAILED: Expo export directory is missing: ${dist}`);
  process.exit(1);
}
walk(dist);
if (files.length === 0) {
  console.error('MOBILE_EXPORT_FAILED: Expo export produced no files.');
  process.exit(1);
}

for (const file of files) {
  const stat = fs.statSync(file);
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  const digest = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const isMap = file.endsWith('.map');
  const isAsset = relative.includes('/dist/assets/');
  if (isMap) sourceMapBytes += stat.size;
  else {
    totalPayloadBytes += stat.size;
    if (isAsset) assetBytes += stat.size;
    else if (/\.js$/.test(file)) bundleBytes += stat.size;
  }
  if (isAsset) {
    assetFiles.push({ path: relative, bytes: stat.size, sha256: digest });
    if (/\.(db|sqlite|sqlite3)$/i.test(file) && stat.size > 1_000_000) {
      failures.push(`Oversized SQLite database is bundled: ${relative} (${stat.size} bytes)`);
    }
    if (stat.size > 10 * 1024 * 1024) {
      failures.push(`Single mobile asset exceeds 10 MiB: ${relative} (${stat.size} bytes)`);
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  gitSha: process.env.GITHUB_SHA || null,
  platform: 'android',
  exportDirectory: 'apps/mobile/dist',
  fileCount: files.length,
  totalPayloadBytes,
  totalPayloadMiB: Number((totalPayloadBytes / 1024 / 1024).toFixed(3)),
  javascriptBundleBytes: bundleBytes,
  bundledAssetBytes: assetBytes,
  sourceMapBytesExcludedFromPayloadBudget: sourceMapBytes,
  budgetBytes: maximumPayloadBytes,
  budgetMiB: Number((maximumPayloadBytes / 1024 / 1024).toFixed(3)),
  assetManifest: assetFiles,
  verdict: failures.length ? 'FAIL' : totalPayloadBytes > maximumPayloadBytes ? 'FAIL' : 'PASS',
  failures,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, assetManifest: `omitted in stdout; ${assetFiles.length} rows in report` }, null, 2));
if (totalPayloadBytes > maximumPayloadBytes) {
  failures.push(`Expo JS + runtime + asset payload ${totalPayloadBytes} bytes exceeds ${maximumPayloadBytes} byte budget.`);
}
if (failures.length) {
  console.error('MOBILE_EXPORT_GATE: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('MOBILE_EXPORT_GATE: PASS');
