import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');
const files = fs.readdirSync(seedDir);

let totalMlaProfiles = 0;
let mlaFiles = 0;
let totalMpProfiles = 0;
let mpFiles = 0;
let totalDemographics = 0;
let demoFiles = 0;
let electionHistoryFiles = 0;
let totalHistoryRecords = 0;

for (const f of files) {
  if (f.endsWith('-mla-profiles.ts')) {
    mlaFiles++;
    const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
    const matches = content.match(/acNo:\s*\d+/g) || [];
    totalMlaProfiles += matches.length;
  } else if (f === 'mp-profiles.ts') {
    mpFiles++;
    const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
    const matches = content.match(/id:\s*['"](LS|RS)_\d+['"]/g) || [];
    totalMpProfiles += matches.length;
  } else if (f.endsWith('-demographics.ts')) {
    demoFiles++;
    const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
    const matches = content.match(/acNo:\s*\d+/g) || [];
    totalDemographics += matches.length;
  } else if (f.endsWith('-election-history.ts')) {
    electionHistoryFiles++;
    const content = fs.readFileSync(path.join(seedDir, f), 'utf8');
    const matches = content.match(/year:\s*\d+/g) || [];
    totalHistoryRecords += matches.length;
  }
}

console.log(JSON.stringify({
  mlaFiles, totalMlaProfiles,
  mpFiles, totalMpProfiles,
  demoFiles, totalDemographics,
  electionHistoryFiles, totalHistoryRecords
}, null, 2));
