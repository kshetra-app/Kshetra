import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const reconPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

// 1. Group records by canonicalOrgId
const orgMap = new Map();

for (const r of recon.reconciliationRecords) {
  if (r.canonicalOrgId) {
    if (!orgMap.has(r.canonicalOrgId)) {
      orgMap.set(r.canonicalOrgId, {
        id: r.canonicalOrgId,
        partyCode: r.normalizedPartyCode,
        isAlliance: r.isAlliance,
        occurrences: 0,
        rawStrings: new Set(),
        sources: new Set(),
        contexts: new Set(),
        sampleCandidate: r.candidateExtracted
      });
    }
    const entry = orgMap.get(r.canonicalOrgId);
    entry.occurrences += r.occurrences;
    entry.rawStrings.add(r.rawString);
    if (r.sources) r.sources.forEach(s => entry.sources.add(s));
    if (r.contexts) r.contexts.forEach(c => entry.contexts.add(c));
    if (!entry.partyCode && r.normalizedPartyCode) entry.partyCode = r.normalizedPartyCode;
  }
}

console.log(`Total canonical entities referenced in ledger: ${orgMap.size}`);

// Write out the catalog
const catalog = Array.from(orgMap.values()).map(o => ({
  id: o.id,
  partyCode: o.partyCode,
  isAlliance: o.isAlliance,
  occurrences: o.occurrences,
  rawStringsCount: o.rawStrings.size,
  sourcesCount: o.sources.size,
  sampleRawStrings: Array.from(o.rawStrings).slice(0, 5)
})).sort((a, b) => b.occurrences - a.occurrences);

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_canonical_org_catalog_raw.json'),
  JSON.stringify(catalog, null, 2)
);
console.log('Catalog written to reports/w021_5b2_canonical_org_catalog_raw.json');
