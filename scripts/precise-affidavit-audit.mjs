import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');
const files = fs.readdirSync(seedDir).filter(f => f.endsWith('-mla-profiles.ts'));

function extractObjects(content) {
  const objects = [];
  let depth = 0;
  let startIdx = -1;
  let inString = false;
  let stringChar = '';
  let isEscaped = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
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
      if (depth === 0) startIdx = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        objects.push(content.substring(startIdx, i + 1));
        startIdx = -1;
      }
    }
  }
  return objects;
}

let mlaCount = 0;
let mlaWithAssets = 0;
let mlaWithLiabilities = 0;
let mlaWithCriminal = 0;
let mlaWithEducation = 0;
let mlaWithProfession = 0;
let mlaWithSourceUrl = 0;

for (const file of files) {
  const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
  const objs = extractObjects(content);
  for (const obj of objs) {
    if (!obj.includes('acNo:')) continue;
    mlaCount++;
    if (obj.includes('totalAssets:')) mlaWithAssets++;
    if (obj.includes('totalLiabilities:')) mlaWithLiabilities++;
    if (obj.includes('criminalCases:')) mlaWithCriminal++;
    if (obj.includes('education:')) mlaWithEducation++;
    if (obj.includes('profession:')) mlaWithProfession++;
    if (obj.includes('sourceUrl:')) mlaWithSourceUrl++;
  }
}

const mpContent = fs.readFileSync(path.join(seedDir, 'mp-profiles.ts'), 'utf8');
const mpObjs = extractObjects(mpContent);

let mpCount = 0;
let mpWithAssets = 0;
let mpWithLiabilities = 0;
let mpWithCriminal = 0;
let mpWithEducation = 0;
let mpWithProfession = 0;
let mpWithSourceUrl = 0;

for (const obj of mpObjs) {
  if (!obj.includes('id:') || (!obj.includes("'LS_") && !obj.includes("'RS_") && !obj.includes('"LS_') && !obj.includes('"RS_'))) continue;
  mpCount++;
  if (obj.includes('totalAssets:')) mpWithAssets++;
  if (obj.includes('totalLiabilities:')) mpWithLiabilities++;
  if (obj.includes('criminalCases:')) mpWithCriminal++;
  if (obj.includes('education:')) mpWithEducation++;
  if (obj.includes('profession:')) mpWithProfession++;
  if (obj.includes('sourceUrl:')) mpWithSourceUrl++;
}

console.log(JSON.stringify({
  mla: {
    mlaCount,
    mlaWithAssets,
    mlaWithLiabilities,
    mlaWithCriminal,
    mlaWithEducation,
    mlaWithProfession,
    mlaWithSourceUrl
  },
  mp: {
    mpCount,
    mpWithAssets,
    mpWithLiabilities,
    mpWithCriminal,
    mpWithEducation,
    mpWithProfession,
    mpWithSourceUrl
  },
  totalProfiles: mlaCount + mpCount,
  totalWithAnyDisclosure: (mlaWithAssets > 0 ? mlaCount : 0) + (mpWithAssets > 0 ? mpCount : 0)
}, null, 2));
