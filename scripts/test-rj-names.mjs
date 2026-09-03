import { readFileSync } from 'node:fs';

const oldTxt = readFileSync('data/seed/rajasthan-constituencies.ts', 'utf8');
const oldMatches = [...oldTxt.matchAll(/name:\s*'([^']+)',\s*localName:\s*'([^']+)'/g)];
const oldMap = new Map();
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
oldMatches.forEach(m => oldMap.set(norm(m[1]), m[2]));

const rjText = readFileSync('scripts/rj-2023-wiki.txt', 'utf8');
const rows = rjText.split('|-');
let matched = 0;
let missing = [];
for (const r of rows) {
  const lines = r.split('\n').map(l => l.trim()).filter(Boolean);
  let acIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^[|!]\s*(\d{1,3})\s*$/);
    if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= 200) { acIdx = i; break; }
  }
  if (acIdx === -1) continue;
  const no = parseInt(lines[acIdx].replace(/^[|!]/, '').trim());
  const nameLine = lines[acIdx + 1] || '';
  const name = nameLine.replace(/^[|!]/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (oldMap.has(norm(name))) matched++;
  else missing.push({ no, name });
}
console.log('Rajasthan matched:', matched, 'missing:', missing.length);
console.log('Missing sample:', missing.slice(0, 15));
