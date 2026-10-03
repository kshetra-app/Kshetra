import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const reconPath = path.join(REPO_ROOT, 'reports', 'w021_5b2_organization_reconciliation_v2.json');
const recon = JSON.parse(fs.readFileSync(reconPath, 'utf8'));

// Build collision analysis across all raw strings
const keyToCandidates = new Map();

for (const r of recon.reconciliationRecords) {
  const normKey = r.rawString.trim().toLowerCase();
  if (!keyToCandidates.has(normKey)) {
    keyToCandidates.set(normKey, []);
  }
  keyToCandidates.get(normKey).push(r);
}

const matrix = [];
for (const [key, records] of keyToCandidates) {
  const distinctTargets = new Set(records.map(r => r.canonicalOrgId || (r.isIndependent ? 'INDEPENDENT' : r.isNominated ? 'NOMINATED' : 'PROVISIONAL')));
  matrix.push({
    rawKey: key,
    recordsCount: records.length,
    distinctResolutions: Array.from(distinctTargets),
    isAmbiguous: distinctTargets.size > 1,
    resolutionMethod: records[0].resolutionType,
    confidence: records[0].confidence,
    sampleRaw: records[0].rawString
  });
}

const ambiguousEntries = matrix.filter(m => m.isAmbiguous);

const output = {
  auditedAt: new Date().toISOString(),
  totalKeysAudited: matrix.length,
  totalAmbiguousCollisions: ambiguousEntries.length,
  collisions: ambiguousEntries,
  highRiskKeysAudit: [
    { key: 'inc', resolvedTo: 'ORG-PARTY-INC', rule: 'Standard abbreviation for Indian National Congress' },
    { key: 'congress', resolvedTo: 'ORG-PARTY-INC', rule: 'Popular national designation for INC' },
    { key: 'ncp', resolvedTo: 'ORG-PARTY-NCP', rule: 'Nationalist Congress Party (parent organization)' },
    { key: 'ncp(sp)', resolvedTo: 'ORG-PARTY-NCPSP', rule: 'Sharadchandra Pawar faction (post-split July 2023)' },
    { key: 'shs', resolvedTo: 'ORG-PARTY-SHS', rule: 'Shiv Sena (parent organization / Eknath Shinde faction)' },
    { key: 'shs(ubt)', resolvedTo: 'ORG-PARTY-SHSUBT', rule: 'Uddhav Thackeray faction (post-split June 2022)' },
    { key: 'bjp', resolvedTo: 'ORG-PARTY-BJP', rule: 'Bharatiya Janata Party' },
    { key: 'j', resolvedTo: 'CONTEXTUAL_CANDIDATE_DISAMBIGUATION', rule: 'Bihar -> JD(U), Jharkhand -> JMM, J&K -> JKNC' },
    { key: 'c', resolvedTo: 'ORG-PARTY-CPIML', rule: 'Bihar Lok Sabha MPs -> CPI(ML) Liberation' },
    { key: 'n', resolvedTo: 'NOMINATED_MEMBER_OR_NCPSP', rule: 'Art 80(1)(a) nominated members -> null org; Sharad Pawar -> NCP(SP)' },
    { key: 'i', resolvedTo: 'INDEPENDENT_CANDIDATE', rule: 'Independent Rajya Sabha MPs -> null org, is_independent = true' }
  ]
};

fs.writeFileSync(
  path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2c_alias_collision_matrix.json'),
  JSON.stringify(output, null, 2)
);

console.log(`[COLLISION MATRIX] Audited ${matrix.length} keys. Ambiguous collisions: ${ambiguousEntries.length}`);
