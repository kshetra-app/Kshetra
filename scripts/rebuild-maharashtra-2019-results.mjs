import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const sourcePath = 'scripts/Maharashtra_AE.csv.gz';
const outputPath = 'data/seed/maharashtra-historical-results.ts';

function parseCsvRow(line) {
  const cells = [];
  let quoted = false;
  let cell = '';
  for (const character of line) {
    if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += character;
  }
  cells.push(cell);
  return cells;
}

function titleCase(value) {
  return value.trim().toLowerCase()
    .replace(/([a-z])/g, (match, character, index, text) =>
      index === 0 || /[^a-z]/.test(text[index - 1]) ? character.toUpperCase() : character)
    .replace(/\b(Of|And|The)\b/g, (word) => word.toLowerCase())
    .replace(/\s+/g, ' ');
}

const csv = zlib.gunzipSync(readFileSync(sourcePath)).toString('utf8');
const lines = csv.split(/\r?\n/).filter(Boolean);
const headers = parseCsvRow(lines[0]);
const column = Object.fromEntries([
  'Year', 'Position', 'Constituency_No', 'Constituency_Name', 'Candidate', 'Party',
].map((name) => [name, headers.indexOf(name)]));

if (Object.values(column).some((index) => index < 0)) {
  throw new Error('Maharashtra TCPD CSV is missing a required column.');
}

const winners = lines.slice(1).map(parseCsvRow)
  .filter((row) => Number(row[column.Year]) === 2019 && Number(row[column.Position]) === 1)
  .map((row) => ({
    acNo: Number(row[column.Constituency_No]),
    name: titleCase(row[column.Constituency_Name]),
    winner: titleCase(row[column.Candidate]),
    party: row[column.Party].trim(),
    year: 2019,
  }))
  .sort((left, right) => left.acNo - right.acNo);

const numbers = winners.map((winner) => winner.acNo);
if (winners.length !== 288 || new Set(numbers).size !== 288 || numbers.some((number, index) => number !== index + 1)) {
  throw new Error(`Expected 288 unique Maharashtra AC numbers 1–288; got ${winners.length}.`);
}

const records = winners.map((winner) =>
  `  { acNo: ${winner.acNo}, name: '${winner.name.replace(/'/g, "\\'")}', winner: '${winner.winner.replace(/'/g, "\\'")}', party: '${winner.party.replace(/'/g, "\\'")}', year: 2019 },`)
  .join('\n');

const output = `/**
 * Maharashtra Assembly 2019 winners keyed by official AC number.
 * Source: TCPD Lok Dhaba Maharashtra assembly results (ECI-sourced data),
 * stored locally at scripts/Maharashtra_AE.csv.gz.
 * Regenerate with: node scripts/rebuild-maharashtra-2019-results.mjs
 */

import type { HistoricalResult } from './telangana-historical-results';

export const MAHARASHTRA_2019_RESULTS: HistoricalResult[] = [
${records}
];

export function getMH2019Result(acNo: number): HistoricalResult | undefined {
  return MAHARASHTRA_2019_RESULTS.find((result) => result.acNo === acNo);
}

export function getMH2019ResultsByParty(party: string): HistoricalResult[] {
  return MAHARASHTRA_2019_RESULTS.filter((result) => result.party === party);
}

export function getMH2019PartySeatCount(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of MAHARASHTRA_2019_RESULTS) {
    counts[result.party] = (counts[result.party] || 0) + 1;
  }
  return counts;
}
`;

writeFileSync(outputPath, output);
console.log(`Wrote ${winners.length} Maharashtra 2019 winners to ${outputPath}.`);
