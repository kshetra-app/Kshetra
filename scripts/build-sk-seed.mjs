/**
 * Build authoritative Sikkim 2024 constituency seed (32 seats incl. Sangha)
 * from Wikipedia "Results by constituency". Dry: node scripts/build-sk-seed.mjs
 * Write: node scripts/build-sk-seed.mjs --write
 */
import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const SEED_PATH = 'C:/K/data/seed/sikkim-constituencies.ts';
const WT_PATH = 'C:/K/scripts/sk-wikitext.txt';
const TOTAL = 32;

const PARTY_CODE = (f) => {
  const s = f.toLowerCase();
  if (s.includes('sikkim krantikari')) return 'SKM';
  if (s.includes('sikkim democratic')) return 'SDF';
  if (s.includes('bharatiya janata')) return 'BJP';
  if (s.includes('indian national congress')) return 'INC';
  if (s.includes('citizen action')) return 'CAP';
  if (s.includes('independent')) return 'IND';
  return 'OTH';
};

function cleanCell(raw) {
  let v = raw.trim();
  while (true) {
    const a = v.match(/^(rowspan|colspan|style|align|bgcolor|scope|class|width|valign|data-sort-value)\s*=\s*("[^"]*"|\S+)\s*\|\s*/i);
    if (!a) break; v = v.slice(a[0].length);
  }
  const tpl = v.match(/\{\{\s*party name with color\s*\|\s*([^}|]+?)\s*(?:\|[^}]*)?\}\}/i);
  if (tpl) return tpl[1].trim();
  v = v.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1');
  v = v.replace(/<ref.*?<\/ref>/gs, '').replace(/<ref[^>]*\/>/g, '').replace(/<[^>]+>/g, '').replace(/'''?/g, '');
  return v.trim();
}
const num = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function loadLocal() {
  const txt = readFileSync(SEED_PATH, 'utf8'); const re = /name:\s*'([^']+)'(?:,\s*localName:\s*'([^']*)')?/g;
  const m = new Map(); let x; while ((x = re.exec(txt))) if (x[2]) m.set(norm(x[1]), x[2]); return m;
}

function parse(wt) {
  const start = wt.search(/===\s*Results by constituency\s*===/i);
  const after = wt.slice(start);
  const table = after.slice(after.indexOf('{|'), after.indexOf('\n|}'));
  const blocks = table.split(/\n\|-/);
  const rows = []; let district = '';
  for (const b of blocks) {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const cells = [];
    for (const line of lines) {
      if (line.startsWith('{|') || line.startsWith('|+') || /^!/.test(line) && cells.length === 0 && !/^\d/.test(cleanCell(line.replace(/^[!|]+/, '')))) {
        // header rows; but district rowspan lives in '!' too — keep scanning
      }
      if (line.startsWith('!') || line.startsWith('|')) cells.push(line.replace(/^[!|]+\s?/, ''));
    }
    if (!cells.length) continue;
    // A data row's first cell may be the rowspan district, else the AC No.
    let idx = 0;
    let first = cleanCell(cells[0]);
    if (/district/i.test(cells[0]) || (/\[\[/.test(cells[0]) && !/^\d+$/.test(first))) {
      district = first.replace(/\s*district.*$/i, '').trim(); idx = 1;
    }
    const acRaw = cleanCell(cells[idx]);
    if (!/^\d+$/.test(acRaw)) continue;
    const c = cells.slice(idx);
    let name = cleanCell(c[1]); let type = 'GEN';
    const rv = name.match(/\((SC|ST|BL)\)\s*$/i);
    if (rv) { const tt = rv[1].toUpperCase(); type = tt === 'BL' ? 'ST' : tt; name = name.replace(/\s*\((SC|ST|BL)\)\s*$/i, '').trim(); }
    name = name.replace(/\s*Assembly constituency\s*$/i, '').trim();
    rows.push({
      acNo: Number(acRaw), name, district, type,
      winnerName: cleanCell(c[2]), winnerParty: PARTY_CODE(cleanCell(c[3]) + ' ' + cleanCell(c[4])),
      winnerVotes: num(c[5]), runnerUpParty: PARTY_CODE(cleanCell(c[8]) + ' ' + cleanCell(c[9])),
      margin: num(c[c.length - 1]),
    });
  }
  return rows;
}

const rows = parse(readFileSync(WT_PATH, 'utf8'));
const local = loadLocal(); for (const r of rows) r.localName = local.get(norm(r.name)) ?? '';
const tally = {}; for (const r of rows) tally[r.winnerParty] = (tally[r.winnerParty] || 0) + 1;
const acNos = rows.map((r) => r.acNo).sort((a, b) => a - b);
const missing = []; for (let i = 1; i <= TOTAL; i++) if (!acNos.includes(i)) missing.push(i);
const dupes = [...new Set(acNos.filter((a, i) => acNos.indexOf(a) !== i))];
const zero = rows.filter((r) => r.winnerVotes === 0);
const badD = rows.filter((r) => !r.district || /^(sc|st|bl)$/i.test(r.district) || /[|=]/.test(r.district));
const oth = rows.filter((r) => r.winnerParty === 'OTH');
console.log('rows', rows.length, '/', TOTAL, '| range', acNos[0], '..', acNos[acNos.length - 1]);
console.log('missing', missing.join(',') || 'none', '| dupes', dupes.join(',') || 'none');
console.log('tally', JSON.stringify(tally), '| SC', rows.filter(r=>r.type==='SC').length, 'ST', rows.filter(r=>r.type==='ST').length);
console.log('zeroVotes', zero.length, '| badDistrict', badD.length, '| OTH', oth.length);
oth.forEach(r => console.log('  OTH', r.acNo, r.name, r.winnerName));
console.log('districts', [...new Set(rows.map(r=>r.district))].join(', '));
console.log('first', JSON.stringify(rows[0]), '\nlast', JSON.stringify(rows[rows.length-1]));
const valid = rows.length === TOTAL && !missing.length && !dupes.length && !badD.length && !oth.length;
console.log('VALID(excl zero)', valid, '| zeroVotesAllowed for Sangha only?', zero.map(r=>r.name).join(','));
export {};
