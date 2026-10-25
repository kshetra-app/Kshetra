#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationDir = path.join(repoRoot, 'supabase', 'migrations');
const failures = [];
const byVersion = new Map();

if (!fs.existsSync(migrationDir)) {
  console.error(`MIGRATION_VERSION_GATE: directory missing: ${migrationDir}`);
  process.exit(1);
}

for (const name of fs.readdirSync(migrationDir).filter((n) => n.endsWith('.sql')).sort()) {
  const match = name.match(/^(\d+)_([^/]+)\.sql$/);
  if (!match) {
    failures.push(`${name}: migration filename must start with a numeric version followed by underscore.`);
    continue;
  }
  const version = match[1];
  const prior = byVersion.get(version) ?? [];
  prior.push(name);
  byVersion.set(version, prior);
}
for (const [version, names] of byVersion) {
  if (names.length > 1) {
    failures.push(`duplicate version ${version}: ${names.join(', ')}`);
  }
}
if (failures.length) {
  console.error('MIGRATION_VERSION_GATE: FAIL');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`MIGRATION_VERSION_GATE: PASS — ${byVersion.size} unique migration versions.`);
