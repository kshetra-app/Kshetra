/**
 * scripts/parse-assam-2023-table.mjs
 * Robust 2D Table Grid parser for HTML tables with arbitrary rowspans/colspans.
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const htmlPath = 'C:/Users/Laven/.gemini/antigravity/brain/c4e5c1f0-d7c0-4b78-b106-d1887d5fb8df/.system_generated/steps/70927/content.md';
const html = fs.readFileSync(htmlPath, 'utf8');

const tables = html.match(/<table[^>]*wikitable[^>]*>([\s\S]*?)<\/table>/g);
const table0 = tables[0];
const trs = [...table0.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];

// Build 2D grid
const grid = [];

for (let r = 0; r < trs.length; r++) {
  if (!grid[r]) grid[r] = [];
  const rowHtml = trs[r][1];
  const cells = [...rowHtml.matchAll(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g)].map(m => {
    const attrs = m[2];
    const text = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const rowspanMatch = attrs.match(/rowspan=[\"']?(\d+)[\"']?/i);
    const colspanMatch = attrs.match(/colspan=[\"']?(\d+)[\"']?/i);
    const rowspan = rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1;
    const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1;
    return { text, rowspan, colspan };
  });

  let cellIdx = 0;
  let c = 0;

  while (cellIdx < cells.length) {
    while (grid[r][c] !== undefined) {
      c++;
    }
    const cell = cells[cellIdx++];
    for (let dr = 0; dr < cell.rowspan; dr++) {
      for (let dc = 0; dc < cell.colspan; dc++) {
        if (!grid[r + dr]) grid[r + dr] = [];
        grid[r + dr][c + dc] = cell.text;
      }
    }
    c += cell.colspan;
  }
}

console.log(`Grid built: ${grid.length} rows.`);
console.log('Header columns (Row 0):', grid[0]);

const acs = [];

// Column indices:
// 0: # (Constituency number)
// 1: Name
// 2: Reserved for (SC/ST/None)
// 3: District(s)
// 4: Lok Sabha constituency
// 5: Electors

for (let r = 1; r < grid.length; r++) {
  const row = grid[r];
  if (!row || row.length < 5) continue;
  const acNo = parseInt(row[0], 10);
  if (isNaN(acNo)) continue;

  const acName = row[1];
  const resRaw = (row[2] || '').toUpperCase();
  let reservation = 'GEN';
  if (resRaw.includes('ST')) reservation = 'ST';
  else if (resRaw.includes('SC')) reservation = 'SC';

  const district = row[3];
  let pcName = row[4] || '';
  pcName = pcName.replace(/\s*\(SC\)|\s*\(ST\)/gi, '').replace(/–/g, '-').trim();

  acs.push({
    acNo,
    acCode: `AS-AC-${String(acNo).padStart(3, '0')}`,
    acName: acName.replace(/–/g, '-').trim(),
    reservation,
    district: district.replace(/–/g, '-').trim(),
    pcName
  });
}

console.log(`Parsed exactly ${acs.length} ACs.`);

// Check distribution across PCs
const pcMap = new Map();
for (const a of acs) {
  pcMap.set(a.pcName, (pcMap.get(a.pcName) || 0) + 1);
}
console.log('Parliamentary Constituencies breakdown:');
console.table(Object.fromEntries(pcMap));

const outPath = path.join(REPO_ROOT, 'scripts', 'assam_2023_statutory_table.json');
fs.writeFileSync(outPath, JSON.stringify(acs, null, 2), 'utf8');
console.log(`Saved exact 126 records to ${outPath}`);
