import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const reconPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

// Build traceability records for each canonical organization
const orgTraces = new Map();

for (const r of recon.reconciliationRecords) {
  if (r.canonicalOrgId && r.confidence !== 'PROVISIONAL') {
    if (!orgTraces.has(r.canonicalOrgId)) {
      orgTraces.set(r.canonicalOrgId, {
        canonicalOrgId: r.canonicalOrgId,
        partyCode: r.normalizedPartyCode,
        sources: new Set(),
        rawStringsSample: new Set(),
        resolutionRules: new Set(),
        confidences: new Set(),
        totalOccurrences: 0,
        provenanceId: '0215b22c-0000-0000-0000-000000000001'
      });
    }
    const trace = orgTraces.get(r.canonicalOrgId);
    trace.totalOccurrences += r.occurrences;
    trace.resolutionRules.add(r.resolutionType);
    trace.confidences.add(r.confidence);
    if (r.sources) r.sources.forEach(s => trace.sources.add(s));
    if (trace.rawStringsSample.size < 5) trace.rawStringsSample.add(r.rawString);
  }
}

const traceList = Array.from(orgTraces.values()).map(t => ({
  canonicalOrgId: t.canonicalOrgId,
  partyCode: t.partyCode,
  totalOccurrences: t.totalOccurrences,
  resolutionRules: Array.from(t.resolutionRules),
  confidences: Array.from(t.confidences),
  sourcesCount: t.sources.size,
  sourcesSample: Array.from(t.sources).slice(0, 3),
  rawStringsSample: Array.from(t.rawStringsSample),
  provenanceRecord: t.provenanceId
})).sort((a, b) => b.totalOccurrences - a.totalOccurrences);

const output = {
  auditedAt: new Date().toISOString(),
  milestone: 'W021.5-B2.2-C Source Traceability',
  totalTracedOrganizations: traceList.length,
  traceabilityMatrix: traceList
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_source_traceability.json'),
  JSON.stringify(output, null, 2)
);

console.log(`[SOURCE TRACEABILITY] Traced ${traceList.length} canonical organizations to raw sources and resolution rules.`);
