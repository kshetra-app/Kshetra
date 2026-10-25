#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'apps/mobile/data/geo-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const codes = Object.keys(manifest);
const assemblyCodes = codes.filter(code => code !== 'IN');
const failures = [];

if (!manifest.IN || manifest.IN.hasPolygons !== true || manifest.IN.bundled !== true) {
  failures.push('National IN overview must remain the only bundled overview layer.');
}

for (const code of assemblyCodes) {
  const entry = manifest[code];
  if (entry.hasPolygons !== false) {
    failures.push(`${code}: assembly geometry is not independently verified; hasPolygons must remain false.`);
  }
  if (code === 'TS') {
    if (entry.status !== 'defect_open') failures.push('TS: preserve defect_open status for the duplicate AC 119 boundary defect.');
  } else if (entry.status !== 'blocked_external') {
    failures.push(`${code}: missing authoritative boundary source must be explicitly blocked_external.`);
  }
  if (!entry.file || !entry.version) failures.push(`${code}: manifest must retain asset file name and content version even while blocked.`);
}

if (failures.length) {
  console.error('GEO_RUNTIME_TRUTH_GATE: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`GEO_RUNTIME_TRUTH_GATE: PASS — ${assemblyCodes.length} AC boundary jurisdictions are explicitly unavailable until authoritative verification; IN overview remains separate.`);
