import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const seedDir = path.join(REPO_ROOT, 'data', 'seed');

function extractObjects(content) {
  const objects = [];
  let depth = 0;
  let startIdx = -1;
  let startLine = 1;
  let currentLine = 1;
  let inString = false;
  let stringChar = '';
  let isEscaped = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\n') currentLine++;
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) {
        startIdx = i;
        startLine = currentLine;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        objects.push({ text: content.substring(startIdx, i + 1), startLine });
        startIdx = -1;
      }
    }
  }
  return objects;
}

const personManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2d_person_manifest.json'), 'utf8'));
const candidacyManifest = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'w021_5b2_b2_2d_candidacy_manifest.json'), 'utf8'));

const personKeyToId = new Map();
for (const p of personManifest.persons) {
  personKeyToId.set(p.personKey, p.canonicalPersonId);
}

const mlaOccurrences = new Map();
const mpOccurrences = new Map();

for (let i = 0; i < candidacyManifest.candidacies.length; i++) {
  const c = candidacyManifest.candidacies[i];
  const candId = '0215b22d-cand-' + String(i + 1).padStart(8, '0');
  const pKey = 'CP-' + c.stateCode + '-' + c.normalizedName.replace(/\s+/g, '_');
  const personId = personKeyToId.get(pKey);
  for (const occ of c.sourceOccurrences) {
    if (occ.sourceCategory === 'MLA_PROFILE') {
      const key = occ.sourceFile + ':' + occ.sourceLine;
      mlaOccurrences.set(key, { ...c, candId, personId });
    } else if (occ.sourceCategory === 'MP_PROFILE') {
      const key = occ.sourceFile + ':' + occ.sourceLine;
      mpOccurrences.set(key, { ...c, candId, personId });
    }
  }
}

let mlaMatched = 0;
let mpMatched = 0;

const mlaFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('-mla-profiles.ts'));
for (const f of mlaFiles) {
  const relPath = 'data/seed/' + f;
  const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
  const objs = extractObjects(content);
  for (const obj of objs) {
    const t = obj.text;
    const nameM = t.match(/\bname:\s*['"]([^'"]+)['"]/);
    if (!nameM) continue;
    const name = nameM[1].trim();
    if (!name || name === 'VACANT') continue;
    const hasAssets = t.includes('totalAssets:');
    const hasLiab = t.includes('totalLiabilities:');
    const hasCrim = t.includes('criminalCases:');
    const hasEdu = t.includes('education:');
    const hasProf = t.includes('profession:');
    if (hasAssets || hasLiab || hasCrim || hasEdu || hasProf) {
      const key = relPath + ':' + obj.startLine;
      const match = mlaOccurrences.get(key);
      if (match) mlaMatched++;
    }
  }
}

const mpContent = fs.readFileSync(path.join(seedDir, 'mp-profiles.ts'), 'utf8');
const mpObjs = extractObjects(mpContent);
for (const obj of mpObjs) {
  const t = obj.text;
  const nameM = t.match(/\bname:\s*['"]([^'"]+)['"]/);
  if (!nameM) continue;
  const hasAssets = t.includes('totalAssets:');
  const hasLiab = t.includes('totalLiabilities:');
  const hasCrim = t.includes('criminalCases:');
  const hasEdu = t.includes('education:');
  if (hasAssets || hasLiab || hasCrim || hasEdu) {
    const key = 'data/seed/mp-profiles.ts:' + obj.startLine;
    const match = mpOccurrences.get(key);
    if (match) mpMatched++;
  }
}

console.log('MLA disclosures matched to B2.2-D:', mlaMatched, 'of 3981');
console.log('MP disclosures matched to B2.2-D:', mpMatched, 'of 543');
console.log('Total disclosures matched:', mlaMatched + mpMatched, 'of 4524');
