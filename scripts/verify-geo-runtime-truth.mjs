#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'apps/mobile/data/geo-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const entries = Object.entries(manifest);
const failures = [];
const assembly = entries.filter(([code]) => code !== 'IN');

if (!manifest.IN || manifest.IN.hasPolygons !== true || manifest.IN.bundled !== true) {
  failures.push('The IN national overview must be present and bundled.');
}
if (entries.filter(([, entry]) => entry.bundled === true).length !== 1) {
  failures.push('IN must be the only bundled geography layer.');
}
for (const [code, entry] of entries) {
  if (!entry.file || !entry.version) failures.push(`${code}: a stable asset filename and version are required.`);
  if (code === 'IN') continue;

  if (entry.bundled === true) failures.push(`${code}: assembly boundaries must not be bundled nationally.`);
  if (entry.hasPolygons !== true) {
    if (code === 'TS') {
      if (entry.status !== 'defect_open') failures.push('TS: the known boundary defect must remain explicitly open.');
    } else if (entry.status !== 'blocked_external') {
      failures.push(`${code}: unavailable/unverified geometry must be status=blocked_external, not silently available.`);
    }
    continue;
  }

  // A remote geometry may be enabled only with full source and reconciliation
  // evidence. Short content hashes, file existence, and network success do not
  // alone constitute canonical geography acceptance.
  if (entry.status !== 'official_verified') failures.push(`${code}: polygons enabled without status=official_verified.`);
  if (!entry.sourceUrl) {
    failures.push(`${code}: missing primary source URL.`);
  } else {
    try {
      const source = new URL(entry.sourceUrl);
      if (source.protocol !== 'https:' || !source.hostname || /(?:^|\\.)invalid$/i.test(source.hostname)) {
        failures.push(`${code}: source URL must be a valid HTTPS authority.`);
      }
    } catch {
      failures.push(`${code}: source URL is invalid.`);
    }
  }
  if (!entry.retrievedAt || Number.isNaN(Date.parse(entry.retrievedAt))) failures.push(`${code}: retrieval timestamp missing/invalid.`);
  if (!entry.effectiveDate || Number.isNaN(Date.parse(entry.effectiveDate))) failures.push(`${code}: effective date missing/invalid.`);
  if (!entry.transformationVersion) failures.push(`${code}: transformation version missing.`);
  if (!/^[a-f0-9]{64}$/i.test(entry.sha256 ?? '')) failures.push(`${code}: accepted geometry requires a SHA-256 digest.`);
  if (!Number.isInteger(entry.count) || entry.count <= 0 || entry.canonicalCount !== entry.count) {
    failures.push(`${code}: geometry count must match independently reconciled canonicalCount.`);
  }
}

if (failures.length) {
  console.error('GEO_RUNTIME_TRUTH_GATE: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
const blocked = assembly.filter(([, entry]) => entry.hasPolygons !== true).length;
const verified = assembly.length - blocked;
console.log(`GEO_RUNTIME_TRUTH_GATE: PASS — ${verified} remote jurisdictions provenance-qualified; ${blocked} assembly jurisdictions explicitly unavailable; IN overview remains separate.`);
