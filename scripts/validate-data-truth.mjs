#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const manifestPath = path.resolve('apps/mobile/data/seed-manifest.json');
const errors = [];
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`DATA-03: cannot read/parse ${manifestPath}: ${error.message}`);
  process.exit(1);
}

const requiredCodes = [
  'TS','AP','KA','MH','TN','KL','WB','UP','RJ','GJ','JH','OD','DL','PB','HR','CG',
  'MP','BR','AS','GA','HP','MN','ML','MZ','NL','TR','SK','AR','UK','PY','JK',
];
for (const code of requiredCodes) {
  const entry = manifest[code];
  if (!entry) {
    errors.push(`manifest missing state/UT ${code}`);
    continue;
  }
  if (entry.state_code !== code) errors.push(`${code}: state_code mismatch`);
  if (typeof entry.version !== 'string' || entry.version.trim() === '') errors.push(`${code}: version missing (manifest is not build-verified)`);
  if (!entry.source || typeof entry.source.id !== 'string' || !entry.source.id.trim() ||
      typeof entry.source.name !== 'string' || !entry.source.name.trim()) errors.push(`${code}: source provenance missing`);
  if (!entry.retrieved_at || !Number.isFinite(Date.parse(entry.retrieved_at))) errors.push(`${code}: retrieved_at missing/invalid`);
  if (!entry.effective_from || !Number.isFinite(Date.parse(entry.effective_from))) errors.push(`${code}: effective_from missing/invalid`);
  if (entry.effective_to && !Number.isFinite(Date.parse(entry.effective_to))) errors.push(`${code}: effective_to invalid`);
  if (entry.effective_from && entry.effective_to && Date.parse(entry.effective_to) < Date.parse(entry.effective_from)) errors.push(`${code}: effective date conflict`);
  const statuses = ['OFFICIAL','DERIVED','VERIFIED','ESTIMATE','SCENARIO','INFERRED','UNVERIFIED','UNKNOWN'];
  if (!statuses.includes(entry.status)) errors.push(`${code}: status invalid/missing`);
  if (!Array.isArray(entry.transformation_history)) errors.push(`${code}: transformation_history missing`);
  else if (['ESTIMATE','SCENARIO'].includes(entry.status) &&
    !entry.transformation_history.some(step => step?.name?.trim() && step?.version?.trim())) errors.push(`${code}: estimate/scenario lacks labelled transformation`);
  if (entry.manifest_status !== 'VERIFIED') errors.push(`${code}: manifest status is ${entry.manifest_status ?? 'missing'}, expected VERIFIED`);
  if (!Number.isInteger(entry.constituency_count) || entry.constituency_count <= 0) errors.push(`${code}: constituency_count must come from verified artifact, not a default`);
}
for (const code of Object.keys(manifest)) {
  if (!requiredCodes.includes(code)) errors.push(`unexpected state/UT key ${code}`);
}

if (errors.length) {
  console.error(`DATA-03 manifest gate FAILED: ${errors.length} violation(s)\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`DATA-03 manifest gate PASSED: ${requiredCodes.length} state/UT entries carry verified provenance.`);
