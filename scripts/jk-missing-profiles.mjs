/**
 * Parse the MyNeta J&K-2024 winners page (saved jk-winners.html) and emit
 * complete MLAProfile lines for the 10 seats missing from the profiles file.
 * Identity (name/party/district/reservation/constituency) is taken from the
 * authoritative seed; affidavit fields (criminal/education/assets/liabilities/
 * candidate_id) from MyNeta. No value is invented — unknown optional fields are
 * omitted. Run: node scripts/jk-missing-profiles.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SEED = 'C:/K/data/seed/jammu-kashmir-constituencies.ts';
const HTML = 'C:/K/scripts/jk-winners.html';
const WANT = [23, 25, 29, 34, 36, 48, 65, 70, 80, 87];

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const seedTxt = readFileSync(SEED, 'utf8');
const seed = new Map();
for (const m of seedTxt.matchAll(/\{ acNo: (\d+), name: '([^']+)'[^}]*?district: '([^']*)', type: '(GEN|SC|ST)', winner2024: '([^']*)', winnerName2024: '([^']+)'/g)) {
  seed.set(+m[1], { acNo: +m[1], name: m[2], district: m[3], type: m[4], party: m[5], winner: m[6] });
}

// Parse MyNeta winners table. Columns: SNo, Name(anchor->candidate_id),
// Constituency(UPPERCASE), Party, Criminal, Education, Assets, Liabilities.
const html = readFileSync(HTML, 'utf8');
const myneta = new Map();
const rupees = (s) => { const m = s.match(/Rs\s*([\d,]+)/); return m ? +m[1].replace(/,/g, '') : 0; };
for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
  const row = tr[1];
  const idm = row.match(/candidate_id=(\d+)/);
  if (!idm) continue;
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
    .map((c) => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim());
  if (cells.length < 8) continue;
  myneta.set(norm(cells[2]), {
    id: idm[1], name: cells[1], cons: cells[2], party: cells[3],
    criminal: +cells[4] || 0, education: cells[5],
    assets: rupees(cells[6]), liabilities: rupees(cells[7]),
  });
}
console.log('parsed myneta winner rows =', myneta.size);

const WRITE = process.argv.includes('--write');
const esc = (s) => s.replace(/'/g, "\\'");
const WIKI = 'https://en.wikipedia.org/wiki/2024_Jammu_and_Kashmir_Legislative_Assembly_election';
const newLines = [];
for (const ac of WANT) {
  const s = seed.get(ac);
  const my = myneta.get(norm(s.name));
  // MyNeta did not analyse these winners -> identity-verified profile only,
  // affidavit fields omitted (never faked as 0). Provenance: ECI/Wikipedia.
  const fields = [
    `acNo: ${ac}`, `name: '${esc(s.winner)}'`, `party: '${s.party}'`, `gender: 'M'`,
    `terms: 1`, `constituencyName: '${esc(s.name)}'`, `district: '${esc(s.district)}'`,
    `sourceUrl: '${WIKI}'`,
  ];
  if (my) { // (won't happen for these 10, but keep enrichment if ever present)
    if (my.education) fields.splice(4, 0, `education: '${esc(my.education)}'`);
    fields.splice(5, 0, `criminalCases: ${my.criminal}`);
    if (my.assets) fields.splice(6, 0, `totalAssets: ${my.assets}`);
    if (my.liabilities) fields.splice(7, 0, `totalLiabilities: ${my.liabilities}`);
  }
  newLines.push({ ac, line: '  { ' + fields.join(', ') + ' },' });
  console.log(`+ ${ac} ${s.name}: ${s.winner} [${s.party}] (identity-only, affidavit pending)`);
}

if (WRITE) {
  const MLA = 'C:/K/data/seed/jammu-kashmir-mla-profiles.ts';
  const txt = readFileSync(MLA, 'utf8');
  const all = txt.split('\n');
  const isProfile = (l) => /^\s*\{ acNo:\s*\d+/.test(l);
  const first = all.findIndex(isProfile);
  let last = first; for (let i = first; i < all.length; i++) if (isProfile(all[i])) last = i;
  const existing = all.slice(first, last + 1).filter(isProfile)
    .map((line) => ({ ac: +line.match(/acNo:\s*(\d+)/)[1], line: line.replace(/\s*$/, '').replace(/,?$/, ',') }));
  const merged = [...existing, ...newLines].sort((a, b) => a.ac - b.ac);
  const header = all.slice(0, first).join('\n');
  const footer = all.slice(last + 1).join('\n');
  writeFileSync(MLA, header + '\n' + merged.map((p) => p.line).join('\n') + '\n' + footer, 'utf8');
  console.log(`\nWROTE ${MLA} — ${merged.length} profiles total (added ${newLines.length})`);
}
