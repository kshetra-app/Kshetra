import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
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

const stateCodeMap = {
  'andhra-pradesh': 'AP', 'arunachal-pradesh': 'AR', 'assam': 'AS', 'bihar': 'BR',
  'chhattisgarh': 'CG', 'delhi': 'DL', 'goa': 'GA', 'gujarat': 'GJ',
  'haryana': 'HR', 'himachal-pradesh': 'HP', 'jammu-kashmir': 'JK', 'jharkhand': 'JH',
  'karnataka': 'KA', 'kerala': 'KL', 'madhya-pradesh': 'MP', 'maharashtra': 'MH',
  'manipur': 'MN', 'meghalaya': 'ML', 'mizoram': 'MZ', 'nagaland': 'NL',
  'odisha': 'OD', 'puducherry': 'PY', 'punjab': 'PB', 'rajasthan': 'RJ',
  'sikkim': 'SK', 'tamil-nadu': 'TN', 'telangana': 'TS', 'tripura': 'TR',
  'uttar-pradesh': 'UP', 'uttarakhand': 'UK', 'west-bengal': 'WB'
};

const stateElectionYearMap = {
  AP: 2024, AR: 2024, AS: 2021, BR: 2020, CG: 2023, DL: 2020, GA: 2022, GJ: 2022,
  HR: 2024, HP: 2022, JK: 2024, JH: 2024, KA: 2023, KL: 2021, MP: 2023, MH: 2024,
  MN: 2022, ML: 2023, MZ: 2023, NL: 2023, OD: 2024, PY: 2021, PB: 2022, RJ: 2023,
  SK: 2024, TN: 2021, TS: 2023, TR: 2023, UP: 2022, UK: 2022, WB: 2021
};

// Check all 4,735 profiles (685 MP + 4,050 MLA)
let totalDisclosures = 0;
let mlaProfilesWithDisclosures = 0;
let mlaCount = 0;

const mlaFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('-mla-profiles.ts'));
for (const file of mlaFiles) {
  const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
  const objs = extractObjects(content);
  for (const obj of objs) {
    const t = obj.text;
    const nameM = t.match(/\bname:\s*['"]([^'"]+)['"]/);
    if (!nameM) continue;
    const name = nameM[1].trim();
    if (!name || name === 'VACANT') continue;
    mlaCount++;

    const hasAssets = t.includes('totalAssets:');
    const hasLiab = t.includes('totalLiabilities:');
    const hasCrim = t.includes('criminalCases:');
    const hasEdu = t.includes('education:');
    const hasProf = t.includes('profession:');

    if (hasAssets || hasLiab || hasCrim || hasEdu || hasProf) {
      mlaProfilesWithDisclosures++;
    }
  }
}

const mpContent = fs.readFileSync(path.join(seedDir, 'mp-profiles.ts'), 'utf8');
const mpObjs = extractObjects(mpContent);
let mpCount = 0;
let mpWithDisclosures = 0;
for (const obj of mpObjs) {
  const t = obj.text;
  const nameM = t.match(/\bname:\s*['"]([^'"]+)['"]/);
  if (!nameM) continue;
  mpCount++;
  const hasAssets = t.includes('totalAssets:');
  const hasLiab = t.includes('totalLiabilities:');
  const hasCrim = t.includes('criminalCases:');
  const hasEdu = t.includes('education:');
  if (hasAssets || hasLiab || hasCrim || hasEdu) {
    mpWithDisclosures++;
  }
}

console.log({
  mlaCount,
  mlaProfilesWithDisclosures,
  mpCount,
  mpWithDisclosures,
  totalProfiles: mlaCount + mpCount,
  totalDisclosures: mlaProfilesWithDisclosures + mpWithDisclosures
});
