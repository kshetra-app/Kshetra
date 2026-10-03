/**
 * scripts/verify-no-uncontrolled-party-runtime.mjs
 * 
 * Static Analysis Guard for W021.5-B2.2-A:
 * Verifies that application runtime code does NOT perform uncontrolled
 * or direct insertions into `public.political_organizations` bypassing
 * canonical identity management, and catalogs remaining legacy World-A
 * seed readers pending retirement in W021.5-B2.4.
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const targetScanDirs = [
  path.join(REPO_ROOT, 'apps', 'api', 'src'),
  path.join(REPO_ROOT, 'apps', 'mobile', 'lib')
];

let directInsertViolations = 0;
const legacySeedConsumers = [];

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const relPath = path.relative(REPO_ROOT, fullPath).replace(/\\/g, '/');

      // Rule 1: No client/unmediated API route should directly insert into political_organizations
      if (content.includes("from('political_organizations').insert") ||
          content.includes('from("political_organizations").insert')) {
        console.error(`[VIOLATION] Direct unmediated write to political_organizations found in ${relPath}`);
        directInsertViolations += 1;
      }

      // Catalog legacy World-A seed file readers (to be retired in B2.4)
      if (content.includes("andhra-pradesh-mla-profiles") ||
          content.includes("telangana-mla-profiles")) {
        legacySeedConsumers.push(relPath);
      }
    }
  }
}

for (const dir of targetScanDirs) {
  scanDir(dir);
}

if (directInsertViolations > 0) {
  console.error(`[GUARD FAIL] Found ${directInsertViolations} direct insertion violations.`);
  process.exit(1);
} else {
  console.log(`[GUARD PASS] Zero unmediated writes to public.political_organizations found.`);
  console.log(`[INFO] Identified ${legacySeedConsumers.length} documented World-A seed consumers pending B2.4 cutover:`);
  legacySeedConsumers.forEach(c => console.log(`  - ${c}`));
  process.exit(0);
}
