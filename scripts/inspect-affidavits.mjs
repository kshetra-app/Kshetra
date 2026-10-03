import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');
const files = fs.readdirSync(seedDir);

const mlaFiles = files.filter(f => f.endsWith('-mla-profiles.ts'));

let totalMlaRows = 0;
let mlaWithAssets = 0;
let mlaWithCriminal = 0;
let mlaWithEducation = 0;
let mlaWithProfession = 0;

for (const f of mlaFiles) {
  const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
  const matches = content.match(/acNo:\s*\d+/g) || [];
  totalMlaRows += matches.length;
  mlaWithAssets += (content.match(/totalAssets:\s*\d+/g) || []).length;
  mlaWithCriminal += (content.match(/criminalCases:\s*\d+/g) || []).length;
  mlaWithEducation += (content.match(/education:\s*['"]/g) || []).length;
  mlaWithProfession += (content.match(/profession:\s*['"]/g) || []).length;
}

const mpContent = fs.readFileSync(path.join(seedDir, 'mp-profiles.ts'), 'utf8');
const mpRows = (mpContent.match(/id:\s*['"](LS|RS)_\d+['"]/g) || []).length;
const mpWithAssets = (mpContent.match(/totalAssets:\s*\d+/g) || []).length;
const mpWithCriminal = (mpContent.match(/criminalCases:\s*\d+/g) || []).length;

console.log({
  totalMlaRows,
  mlaWithAssets,
  mlaWithCriminal,
  mlaWithEducation,
  mlaWithProfession,
  mpRows,
  mpWithAssets,
  mpWithCriminal
});
