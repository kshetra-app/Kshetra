/**
 * Build the authoritative Jammu & Kashmir 2024 constituency seed (90 seats)
 * from the Wikipedia "Results by constituency" wikitable (action=raw).
 *
 * Source: 2024 Jammu and Kashmir Legislative Assembly election (English Wikipedia)
 * Dry run:  node scripts/build-jk-seed.mjs
 * Write:    node scripts/build-jk-seed.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const SEED_PATH = 'C:/K/data/seed/jammu-kashmir-constituencies.ts';
const WT_PATH = 'C:/K/scripts/jk-wikitext.txt';
const TOTAL = 90;

const PARTY_CODE = (full) => {
  const s = full.toLowerCase();
  if (s.includes('national conference')) return 'JKNC';
  if (s.includes('peoples democratic') || s.includes("people's democratic")) return 'JKPDP';
  if (s.includes('peoples conference') || s.includes("people's conference")) return 'JKPC';
  if (s.includes('bharatiya janata')) return 'BJP';
  if (s.includes('national congress') || s.includes('indian national')) return 'INC';
  if (s.includes('communist party of india (marxist)') || s.includes('marxist')) return 'CPI(M)';
  if (s.includes('aam aadmi')) return 'AAP';
  if (s.includes('panthers')) return 'JKNPP';
  if (s.includes('independent')) return 'IND';
  return 'OTH';
};

function cleanCell(raw) {
  let v = raw.trim();
  while (true) {
    const attr = v.match(/^(rowspan|colspan|style|align|bgcolor|scope|class|width|valign)\s*=\s*("[^"]*"|\S+)\s*\|\s*/i);
    if (!attr) break;
    v = v.slice(attr[0].length);
  }
  const tpl = v.match(/\{\{\s*party name with color\s*\|\s*([^}|]+?)\s*(?:\|[^}]*)?\}\}/i);
  if (tpl) return tpl[1].trim();
  v = v.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  v = v.replace(/\[\[([^\]]+)\]\]/g, '$1');
  v = v.replace(/<ref.*?<\/ref>/gs, '');
  v = v.replace(/<[^>]+>/g, '');
  v = v.replace(/'''?/g, '');
  return v.trim();
}
const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// carry over local-script names from existing seed by normalized constituency name
function loadLocalNames() {
  const txt = readFileSync(SEED_PATH, 'utf8');
  const re = /name:\s*'([^']+)'(?:,\s*localName:\s*'([^']*)')?/g;
  const map = new Map();
  let m;
  while ((m = re.exec(txt))) if (m[2]) map.set(norm(m[1]), m[2]);
  return map;
}

function parseTable(wikitext) {
  const start = wikitext.search(/===\s*Results by constituency\s*===/i);
  const after = wikitext.slice(start);
  const tblStart = after.indexOf('{|');
  const tblEnd = after.indexOf('\n|}', tblStart);
  const table = after.slice(tblStart, tblEnd);
  const blocks = table.split(/\n\|-\s*\n/);
  const rows = [];
  let district = '';

  for (const block of blocks) {
    // district header block: contains colspan="14" and a [[...district...]] link
    if (/colspan="14"/.test(block) && /\[\[/.test(block) && /district/i.test(block)) {
      district = cleanCell((block.split('\n').find((l) => /\[\[/.test(l)) || '').replace(/^[!|]\s*/, ''))
        .replace(/\s*district.*$/i, '').trim();
      continue;
    }
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const cells = [];
    for (const line of lines) {
      if (line.startsWith('{|') || line.startsWith('|+')) continue;
      if (line.startsWith('!') || line.startsWith('|')) cells.push(line.replace(/^[!|]+\s?/, ''));
    }
    if (cells.length < 10) continue;
    const acRaw = cleanCell(cells[0]);
    if (!/^\d+$/.test(acRaw)) continue;
    const acNo = Number(acRaw);

    let name = cleanCell(cells[1]);
    let type = 'GEN';
    const resv = name.match(/\((SC|ST)\)\s*$/i);
    if (resv) { type = resv[1].toUpperCase(); name = name.replace(/\s*\((SC|ST)\)\s*$/i, '').trim(); }

    const winnerName = cleanCell(cells[2]);
    const winnerParty = PARTY_CODE(cleanCell(cells[3]));
    const winnerVotes = num(cells[4]);
    const runnerUpParty = PARTY_CODE(cleanCell(cells[7]));
    const margin = num(cells[cells.length - 1]);
    rows.push({ acNo, name, district, type, winnerName, winnerParty, winnerVotes, runnerUpParty, margin });
  }
  return rows;
}

const wikitext = readFileSync(WT_PATH, 'utf8');
const rows = parseTable(wikitext);
const localByName = loadLocalNames();
for (const r of rows) r.localName = localByName.get(norm(r.name)) ?? '';

// validation
const tally = {};
for (const r of rows) tally[r.winnerParty] = (tally[r.winnerParty] || 0) + 1;
const acNos = rows.map((r) => r.acNo).sort((a, b) => a - b);
const missing = []; for (let i = 1; i <= TOTAL; i++) if (!acNos.includes(i)) missing.push(i);
const dupes = [...new Set(acNos.filter((a, i) => acNos.indexOf(a) !== i))];
const zeroVotes = rows.filter((r) => r.winnerVotes === 0).length;
const badDistrict = rows.filter((r) => !r.district || /^(sc|st)$/i.test(r.district) || /[|=]|colspan/i.test(r.district)).length;
const otherParty = rows.filter((r) => r.winnerParty === 'OTH');

console.log('parsed rows     =', rows.length, '(expect 90)');
console.log('acNo range      =', acNos[0], '..', acNos[acNos.length - 1]);
console.log('missing 1..90   =', missing.join(',') || 'none');
console.log('duplicate acNos =', dupes.join(',') || 'none');
console.log('party tally     =', JSON.stringify(tally));
console.log('reservation     = SC', rows.filter((r) => r.type === 'SC').length, '| ST', rows.filter((r) => r.type === 'ST').length);
console.log('zero votes      =', zeroVotes, '| bad district =', badDistrict, '| OTH party =', otherParty.length);
if (otherParty.length) otherParty.forEach((r) => console.log('   OTH:', r.acNo, r.name, '->', r.winnerName));
console.log('districts       =', [...new Set(rows.map((r) => r.district))].join(', '));
console.log('\nfirst 2:', JSON.stringify(rows.slice(0, 2)));
console.log('last 2 :', JSON.stringify(rows.slice(-2)));

const valid = rows.length === TOTAL && !missing.length && !dupes.length && !zeroVotes && !badDistrict && !otherParty.length;
console.log('\nVALID =', valid);

if (WRITE && valid) {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const lines = rows.sort((a, b) => a.acNo - b.acNo).map((r) => {
    const local = r.localName ? `localName: '${esc(r.localName)}', ` : '';
    return `  { acNo: ${r.acNo}, name: '${esc(r.name)}', ${local}district: '${esc(r.district)}', type: '${r.type}', winner2024: '${r.winnerParty}', winnerName2024: '${esc(r.winnerName)}', winnerVotes2024: ${r.winnerVotes}, runnerUp2024: '${r.runnerUpParty}', margin2024: ${r.margin}, currentParty: '${r.winnerParty}' },`;
  });
  const tallyStr = Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' | ');
  const header = `/**
 * Jammu & Kashmir Assembly Constituencies — 2024 General Election (90 seats)
 *
 * SOURCE: English Wikipedia, "2024 Jammu and Kashmir Legislative Assembly
 *         election", section "Results by constituency" (ECI-sourced). Uses the
 *         official post-2022-delimitation AC numbering (1-90). Auto-generated by
 *         scripts/build-jk-seed.mjs — do not hand-edit.
 *
 * Winner/runner-up parties, vote counts and margins are from the ECI results as
 * compiled on Wikipedia. Reservation (GEN/SC/ST) is derived from the official
 * constituency-name suffix. Local-script names are carried over by name match.
 *
 * PARTY TALLY 2024: ${tallyStr} = 90
 */

export interface JKConstituencySeed {
  acNo: number; name: string; district: string; type: 'GEN' | 'SC' | 'ST';
  winner2024: string; winnerName2024: string; winnerVotes2024: number;
  runnerUp2024: string; margin2024: number; currentParty: string;
  /** Constituency name in local script */
  localName?: string;
}

export const JK_CONSTITUENCIES: JKConstituencySeed[] = [
`;
  const footer = `];

/** Get constituency data by AC number */
export function getJKConstituency(acNo: number): JKConstituencySeed | undefined {
  return JK_CONSTITUENCIES.find((c) => c.acNo === acNo);
}

/** Get all constituencies in a district */
export function getJKConstituenciesByDistrict(district: string): JKConstituencySeed[] {
  return JK_CONSTITUENCIES.filter((c) => c.district.toLowerCase() === district.toLowerCase());
}

/** Get all constituencies won by a party */
export function getJKConstituenciesByParty(party: string): JKConstituencySeed[] {
  return JK_CONSTITUENCIES.filter((c) => c.currentParty === party);
}
`;
  writeFileSync(SEED_PATH, header + lines.join('\n') + '\n' + footer, 'utf8');
  console.log('\nWROTE', SEED_PATH);
} else if (WRITE) {
  console.log('\nNOT WRITING — validation failed.');
}
