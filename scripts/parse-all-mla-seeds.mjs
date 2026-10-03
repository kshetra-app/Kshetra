import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const seedDir = path.join(REPO_ROOT, 'data', 'seed');

const mlaFiles = fs.readdirSync(seedDir).filter(f => f.endsWith('-mla-profiles.ts'));

const report = [];

for (const file of mlaFiles) {
  const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
  
  // Find exported array name
  const arrayMatch = content.match(/export const ([A-Za-z0-9_]+)\s*:\s*[A-Za-z0-9_\[\]<>\s]+\s*=\s*\[/);
  const arrayName = arrayMatch ? arrayMatch[1] : 'UNKNOWN';

  // Count elements: find occurrences of `{ acNo:` or `{ id:` or `{ name:` at entry start
  // Let's do a reliable bracket count or object pattern match
  // Pattern: { \s*(acNo|id|name):
  const entries = [...content.matchAll(/\{\s*(?:acNo|id|name)\s*:/g)];
  
  // Also let's extract comments mentioning count e.g. "— 227 MLAs" or "All 107 MLAs"
  const commentCountMatch = content.match(/(?:All\s+)?(\d+)\s+MLAs/i);
  const commentCount = commentCountMatch ? parseInt(commentCountMatch[1], 10) : null;

  report.push({
    file,
    arrayName,
    detectedObjects: entries.length,
    commentCount,
  });
}

console.log('File | Array | Detected Objects | Comment Count');
console.log('---|---|---|---');
let totalDetected = 0;
for (const r of report) {
  console.log(`${r.file} | ${r.arrayName} | ${r.detectedObjects} | ${r.commentCount ?? 'N/A'}`);
  totalDetected += r.detectedObjects;
}
console.log(`\nTOTAL DETECTED ACROSS ALL 31 FILES: ${totalDetected}`);
