/**
 * Build the authoritative Andhra Pradesh 2024 constituency seed from the
 * Wikipedia "Results by constituency" wikitable (action=raw).
 *
 * Source: 2024 Andhra Pradesh Legislative Assembly election (English Wikipedia)
 * Run dry:   node scripts/build-ap-seed.mjs
 * Run write: node scripts/build-ap-seed.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const SEED_PATH = 'C:/K/data/seed/andhra-pradesh-constituencies.ts';
const URL = 'https://en.wikipedia.org/w/index.php?title=2024_Andhra_Pradesh_Legislative_Assembly_election&action=raw';

const PARTY_CODE = (full) => {
  const s = full.toLowerCase();
  if (s.includes('telugu desam')) return 'TDP';
  if (s.includes('janasena') || s.includes('jana sena')) return 'JSP';
  if (s.includes('bharatiya janata')) return 'BJP';
  if (s.includes('ysr congress') || s.includes('ysrcp')) return 'YSRCP';
  if (s.includes('national congress')) return 'INC';
  if (s.includes('communist party of india (marxist)')) return 'CPIM';
  if (s.includes('communist party of india')) return 'CPI';
  if (s.includes('independent')) return 'IND';
  return 'OTH';
};

/** Strip wiki markup from a cell value → plain text */
function cleanCell(raw) {
  let v = raw.trim();
  // remove leading wikitable cell attributes: rowspan="8" | , style="..." | , etc.
  while (true) {
    const attr = v.match(/^(rowspan|colspan|style|align|bgcolor|scope|class|width|valign)\s*=\s*("[^"]*"|\S+)\s*\|\s*/i);
    if (!attr) break;
    v = v.slice(attr[0].length);
  }
  // {{Party name with color|X}} -> X
  const tpl = v.match(/\{\{\s*Party name with color\s*\|\s*([^}|]+?)\s*\}\}/i);
  if (tpl) return tpl[1].trim();
  // [[Link|Display]] -> Display ; [[Link]] -> Link
  v = v.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  v = v.replace(/\[\[([^\]]+)\]\]/g, '$1');
  v = v.replace(/<ref.*?<\/ref>/gs, '');
  v = v.replace(/<[^>]+>/g, '');
  v = v.replace(/'''?/g, '');
  return v.trim();
}

const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;

// ── reservation + Telugu name from existing seed (matched by normalized name)
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function loadExistingMeta() {
  const txt = readFileSync(SEED_PATH, 'utf8');
  const re = /name:\s*'([^']+)'(?:,\s*localName:\s*'([^']*)')?,\s*district:\s*'[^']*',\s*type:\s*'(GEN|SC|ST)'/g;
  const typeByName = new Map();
  const localByName = new Map();
  let m;
  while ((m = re.exec(txt))) {
    const key = norm(m[1]);
    typeByName.set(key, m[3]);
    if (m[2]) localByName.set(key, m[2]);
  }
  return { typeByName, localByName };
}

function parseTable(wikitext) {
  const start = wikitext.search(/===\s*Results by constituency\s*===/);
  const after = wikitext.slice(start);
  const tblStart = after.indexOf('{|');
  const tblEnd = after.indexOf('\n|}', tblStart);
  const table = after.slice(tblStart, tblEnd);

  // Split into row blocks on lines that are exactly "|-"
  const blocks = table.split(/\n\|-\s*\n/);
  const rows = [];
  let currentDistrict = '';

  for (const block of blocks) {
    // collect cell lines (start with | or !), skip the table-open line and header attrs
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    // gather cells: a cell line begins with '|' or '!' (but not '|+' caption / '{|')
    const cells = [];
    for (const line of lines) {
      if (line.startsWith('{|') || line.startsWith('|+')) continue;
      if (line.startsWith('!') || line.startsWith('|')) {
        cells.push(line.replace(/^[!|]\s?/, ''));
      }
    }
    if (cells.length === 0) continue;

    // Detect a district lead cell: a [[X district|X]] link as the first cell
    let offset = 0;
    if (/\[\[[^\]]*\bdistrict\b\s*\|/i.test(cells[0])) {
      currentDistrict = cleanCell(cells[0]);
      offset = 1;
    }

    // The acNo cell must be a pure integer
    const acRaw = cleanCell(cells[offset] ?? '');
    if (!/^\d+$/.test(acRaw)) continue; // header / non-data block
    const acNo = Number(acRaw);

    // Reservation is encoded in the name suffix, e.g. "Puthalapattu (SC)"
    let name = cleanCell(cells[offset + 1]);
    let type = 'GEN';
    const resv = name.match(/\((SC|ST)\)\s*$/i);
    if (resv) { type = resv[1].toUpperCase(); name = name.replace(/\s*\((SC|ST)\)\s*$/i, '').trim(); }

    const winnerName = cleanCell(cells[offset + 2]);
    const winnerParty = PARTY_CODE(cleanCell(cells[offset + 3]));
    const winnerVotes = num(cells[offset + 4]);
    const runnerUpParty = PARTY_CODE(cleanCell(cells[offset + 7]));
    const margin = num(cells[cells.length - 1]); // last cell is margin

    rows.push({ acNo, name, district: currentDistrict, type, winnerName, winnerParty, winnerVotes, runnerUpParty, margin });
  }
  return rows;
}

// ── main ────────────────────────────────────────────────────────────────────
const res = await fetch(URL, { headers: { 'User-Agent': 'KshetraDataBot/1.0 (research)' } });
const wikitext = await res.text();
const rows = parseTable(wikitext);
const { typeByName, localByName } = loadExistingMeta();

// type is derived from the authoritative name suffix (above); carry over Telugu name only
let unmatchedType = 0;
for (const r of rows) {
  r.localName = localByName.get(norm(r.name)) ?? '';
}

// ── validation ──
const tally = {};
for (const r of rows) tally[r.winnerParty] = (tally[r.winnerParty] || 0) + 1;
const acNos = rows.map((r) => r.acNo).sort((a, b) => a - b);
const missing = [];
for (let i = 1; i <= 175; i++) if (!acNos.includes(i)) missing.push(i);
const dupes = acNos.filter((a, i) => acNos.indexOf(a) !== i);

console.log('parsed rows      =', rows.length);
console.log('acNo range       =', acNos[0], '..', acNos[acNos.length - 1]);
console.log('missing 1..175   =', missing.join(',') || 'none');
console.log('duplicate acNos  =', [...new Set(dupes)].join(',') || 'none');
console.log('party tally      =', JSON.stringify(tally), '(expect TDP135 JSP21 BJP8 YSRCP11)');
console.log('reservation: SC  =', rows.filter((r) => r.type === 'SC').length, 'ST =', rows.filter((r) => r.type === 'ST').length, 'unmatched->GEN =', unmatchedType);
console.log('\nfirst 3:', JSON.stringify(rows.slice(0, 3), null, 0));
console.log('last 3 :', JSON.stringify(rows.slice(-3), null, 0));
const zeroVotes = rows.filter((r) => r.winnerVotes === 0).length;
console.log('rows with 0 winnerVotes =', zeroVotes);

const valid = rows.length === 175 && missing.length === 0 && dupes.length === 0 && zeroVotes === 0;
console.log('\nVALID =', valid);

if (WRITE && valid) {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const lines = rows.sort((a, b) => a.acNo - b.acNo).map((r) => {
    const local = r.localName ? `localName: '${esc(r.localName)}', ` : '';
    return `  { acNo: ${r.acNo}, name: '${esc(r.name)}', ${local}district: '${esc(r.district)}', type: '${r.type}', winner2024: '${r.winnerParty}', winnerName2024: '${esc(r.winnerName)}', winnerVotes2024: ${r.winnerVotes}, runnerUp2024: '${r.runnerUpParty}', margin2024: ${r.margin}, currentParty: '${r.winnerParty}' },`;
  });
  const header = `/**
 * Andhra Pradesh Assembly Constituencies — 2024 General Election (175 seats)
 *
 * SOURCE: English Wikipedia, "2024 Andhra Pradesh Legislative Assembly election",
 *         section "Results by constituency" (ECI-sourced). Auto-generated by
 *         scripts/build-ap-seed.mjs — do not hand-edit.
 *
 * Winner/runner-up names, parties, vote counts and margins are from the ECI
 * results as compiled on Wikipedia. Reservation status (GEN/SC/ST) is derived
 * from the official constituency-name suffix (e.g. "(SC)"). Telugu names are
 * carried over from prior data, matched by constituency name where available.
 *
 * PARTY TALLY 2024: TDP 135 | JSP 21 | BJP 8 | YSRCP 11 = 175
 */

export interface APConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in Telugu script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2024: string;
  winnerName2024: string;
  winnerVotes2024: number;
  /** Runner-up party code */
  runnerUp2024: string;
  margin2024: number;
  currentParty: string;
}

export const AP_CONSTITUENCIES: APConstituencySeed[] = [
`;
  const footer = `];

/** Get constituency data by AC number */
export function getAPConstituency(acNo: number): APConstituencySeed | undefined {
  return AP_CONSTITUENCIES.find((c) => c.acNo === acNo);
}

/** Get all constituencies in a district */
export function getAPConstituenciesByDistrict(district: string): APConstituencySeed[] {
  return AP_CONSTITUENCIES.filter((c) => c.district.toLowerCase() === district.toLowerCase());
}

/** Get all constituencies won by a party */
export function getAPConstituenciesByParty(party: string): APConstituencySeed[] {
  return AP_CONSTITUENCIES.filter((c) => c.currentParty === party);
}
`;
  writeFileSync(SEED_PATH, header + lines.join('\n') + '\n' + footer, 'utf8');
  console.log('\nWROTE', SEED_PATH);
} else if (WRITE) {
  console.log('\nNOT WRITING — validation failed.');
}
