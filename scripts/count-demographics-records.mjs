import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');
const files = fs.readdirSync(seedDir);

const demoFiles = files.filter(f => f.endsWith('-demographics.ts'));
console.log(`Total demographics files: ${demoFiles.length}`);

let totalRecords = 0;
const stateCounts = {};

for (const file of demoFiles) {
  const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
  const stateCodeMatch = file.replace('-demographics.ts', '');
  const matches = content.match(/acNo:\s*(\d+)/g) || [];
  totalRecords += matches.length;
  stateCounts[stateCodeMatch] = matches.length;
}

console.log('Total demographics records:', totalRecords);
console.log('State counts:', stateCounts);
