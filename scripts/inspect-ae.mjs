/**
 * Inspect a TCPD Lok Dhaba <State>_AE.csv.gz: list election years, and for the
 * latest year report unique constituency count, type split, and column presence.
 * Usage: node scripts/inspect-ae.mjs Rajasthan_AE.csv.gz
 */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
if (!file) { console.error('pass a *_AE.csv.gz filename in scripts/'); process.exit(1); }

const split = (l) => { const c = []; let q = false, cur = ''; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch; } c.push(cur); return c; };
const text = zlib.gunzipSync(readFileSync(`C:/K/scripts/${file}`)).toString('utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const H = split(lines[0]);
const ci = (n) => H.indexOf(n);
const rows = lines.slice(1).map(split);

const COL = { year: ci('Year'), cno: ci('Constituency_No'), pos: ci('Position'), votes: ci('Votes'), margin: ci('Margin'), turnout: ci('Turnout_Percentage'), electors: ci('Electors'), dist: ci('District_Name'), ctype: ci('Constituency_Type') };
const years = [...new Set(rows.map((r) => +r[COL.year]))].filter(Boolean).sort((a, b) => a - b);
const latest = years[years.length - 1];
const ly = rows.filter((r) => +r[COL.year] === latest);
const cnos = [...new Set(ly.map((r) => +r[COL.cno]))].sort((a, b) => a - b);
const winners = ly.filter((r) => +r[COL.pos] === 1);
const types = {}; for (const w of winners) { const t = (w[COL.ctype] || '').toUpperCase(); types[t] = (types[t] || 0) + 1; }
const hasVotes = winners.some((w) => +String(w[COL.votes]).replace(/[^\d.-]/g, '') > 0);
const hasMargin = winners.some((w) => +String(w[COL.margin]).replace(/[^\d.-]/g, '') > 0);
const hasTurnout = COL.turnout >= 0 && winners.some((w) => +String(w[COL.turnout]).replace(/[^\d.-]/g, '') > 0);
const hasElectors = COL.electors >= 0 && winners.some((w) => +String(w[COL.electors]).replace(/[^\d.-]/g, '') > 0);

console.log(`${file}`);
console.log('  years:', years.join(', '));
console.log('  latest:', latest, '| unique constituencies:', cnos.length, '| cno', cnos[0], '..', cnos[cnos.length - 1]);
console.log('  type split:', JSON.stringify(types));
console.log('  cols present -> votes:', hasVotes, '| margin:', hasMargin, '| turnout:', hasTurnout, '| electors:', hasElectors);
