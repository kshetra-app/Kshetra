import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');

const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'reports', 'w021_5b2_b2_2d_candidacy_manifest.json'), 'utf8'));
const candidacies = manifest.candidacies;

console.log(`Loaded ${candidacies.length} candidacies.`);

// Count how many candidacies originate from MLA profiles or MP profiles
let mlaProfilesCount = 0;
let mpProfilesCount = 0;
let constWinnersCount = 0;
let histWinnersCount = 0;

for (const c of candidacies) {
  const occ = c.sourceOccurrences || [];
  const catSet = new Set(occ.map(o => o.sourceCategory));
  if (catSet.has('MLA_PROFILE')) mlaProfilesCount++;
  if (catSet.has('MP_PROFILE')) mpProfilesCount++;
  if (catSet.has('CONSTITUENCY')) constWinnersCount++;
  if (catSet.has('HISTORICAL_RESULT')) histWinnersCount++;
}

console.log({
  mlaProfilesCount,
  mpProfilesCount,
  constWinnersCount,
  histWinnersCount
});
