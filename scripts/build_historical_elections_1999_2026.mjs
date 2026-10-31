/**
 * National Historical Election Ingestion & Podium Runner-Up Engine (1999–2026)
 * ═════════════════════════════════════════════════════════════════════════════
 * Ingests and normalizes Assembly and Parliamentary election contests from 1999 onwards.
 * Sourced from authoritative ECI / TCPD "Lok Dhaba" datasets.
 *
 * For EVERY contest:
 *   - Rank 1: Winner (Profile + Votes + Vote Share)
 *   - Rank 2: 1st Runner Up (Profile + Votes + Vote Share + Diff to Winner V1-V2)
 *   - Rank 3: 2nd Runner Up (Profile + Votes + Vote Share + Diff to Winner V1-V3 + Diff to 1st RU V2-V3)
 *   - 13-Language Native Localization (en, te, hi, kn, mr, ta, ml, bn, gu, pa, or, as, ne)
 *
 * Usage: node scripts/build_historical_elections_1999_2026.mjs [--state=<code>] [--inspect]
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { transliterateToAll13 } from '../packages/shared/src/i18n/indic-transliterator.ts';
import { PARTIES_13_LANG, getLocalizedTerm } from '../packages/shared/src/i18n/domain-dictionary.ts';

const ROOT = process.cwd();
const OUTPUT_DIR = path.resolve(ROOT, 'data/historical');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const STATE_MAPPING = [
  { file: 'Arunachal_Pradesh_AE.csv.gz', code: 'AR', name: 'Arunachal Pradesh' },
  { file: 'Assam_AE.csv.gz', code: 'AS', name: 'Assam' },
  { file: 'Bihar_AE.csv.gz', code: 'BR', name: 'Bihar' },
  { file: 'Chhattisgarh_AE.csv.gz', code: 'CG', name: 'Chhattisgarh' },
  { file: 'Delhi_AE.csv.gz', code: 'DL', name: 'Delhi' },
  { file: 'Goa_AE.csv.gz', code: 'GA', name: 'Goa' },
  { file: 'Gujarat_AE.csv.gz', code: 'GJ', name: 'Gujarat' },
  { file: 'Haryana_AE.csv.gz', code: 'HR', name: 'Haryana' },
  { file: 'Jharkhand_AE.csv.gz', code: 'JH', name: 'Jharkhand' },
  { file: 'Kerala_AE.csv.gz', code: 'KL', name: 'Kerala' },
  { file: 'Madhya_Pradesh_AE.csv.gz', code: 'MP', name: 'Madhya Pradesh' },
  { file: 'Manipur_AE.csv.gz', code: 'MN', name: 'Manipur' },
  { file: 'Meghalaya_AE.csv.gz', code: 'ML', name: 'Meghalaya' },
  { file: 'Mizoram_AE.csv.gz', code: 'MZ', name: 'Mizoram' },
  { file: 'Nagaland_AE.csv.gz', code: 'NL', name: 'Nagaland' },
  { file: 'Odisha_AE.csv.gz', code: 'OD', name: 'Odisha' },
  { file: 'Puducherry_AE.csv.gz', code: 'PY', name: 'Puducherry' },
  { file: 'Punjab_AE.csv.gz', code: 'PB', name: 'Punjab' },
  { file: 'Rajasthan_AE.csv.gz', code: 'RJ', name: 'Rajasthan' },
  { file: 'Sikkim_AE.csv.gz', code: 'SK', name: 'Sikkim' },
  { file: 'Tamil_Nadu_AE.csv.gz', code: 'TN', name: 'Tamil Nadu' },
  { file: 'Tripura_AE.csv.gz', code: 'TR', name: 'Tripura' },
  { file: 'Uttarakhand_AE.csv.gz', code: 'UK', name: 'Uttarakhand' },
  { file: 'Uttar_Pradesh_AE.csv.gz', code: 'UP', name: 'Uttar Pradesh' },
  { file: 'West_Bengal_AE.csv.gz', code: 'WB', name: 'West Bengal' },
];

function titleCase(s) {
  return String(s || '').trim().toLowerCase()
    .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
    .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase())
    .replace(/\s+/g, ' ').trim();
}

function processState(stateMeta) {
  const gzPath = path.resolve(ROOT, 'scripts', stateMeta.file);
  if (!fs.existsSync(gzPath)) {
    console.warn(`[WARN] File missing: ${gzPath}`);
    return null;
  }

  const buf = fs.readFileSync(gzPath);
  const text = zlib.gunzipSync(buf).toString('utf8');
  const lines = text.split('\n');
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  const col = (name) => header.indexOf(name);
  const yearIdx = col('Year');
  const acIdx = col('Constituency_No');
  const acNameIdx = col('Constituency_Name') !== -1 ? col('Constituency_Name') : col('Constituency_No');
  const posIdx = col('Position');
  const candIdx = col('Candidate');
  const partyIdx = col('Party');
  const votesIdx = col('Votes');
  const validIdx = col('Valid_Votes');
  const sexIdx = col('Sex');
  const ageIdx = col('Age');
  const delimIdx = col('DelimID');

  const contestMap = new Map();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = [];
    let q = false, cur = '';
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === ',' && !q) { parts.push(cur); cur = ''; }
      else cur += ch;
    }
    parts.push(cur);

    const year = Number(parts[yearIdx]);
    if (year < 1999) continue; // Only 1999 onwards!

    const acNo = Number(parts[acIdx]);
    const pos = Number(parts[posIdx]);
    if (pos > 3) continue; // We need top 3 (Podium)

    const key = `${year}:${acNo}`;
    if (!contestMap.has(key)) {
      contestMap.set(key, {
        stateCode: stateMeta.code,
        stateName: stateMeta.name,
        electionYear: year,
        acNo,
        constituencyName: parts[acNameIdx]?.trim().replace(/^"|"$/g, '') || `AC ${acNo}`,
        delimitationId: parts[delimIdx] || '4',
        validVotes: Number(parts[validIdx]) || 0,
        candidates: [],
      });
    }

    const c = contestMap.get(key);
    const rawName = titleCase(parts[candIdx]);
    const rawParty = parts[partyIdx]?.trim().replace(/^"|"$/g, '').toUpperCase() || 'IND';
    const votes = Number(parts[votesIdx]) || 0;
    const sex = parts[sexIdx]?.toUpperCase() === 'F' ? 'F' : parts[sexIdx]?.toUpperCase() === 'M' ? 'M' : 'O';
    const age = Number(parts[ageIdx]) || null;

    // Generate 13-language localized name variants
    const localizedNames = transliterateToAll13(rawName, 'en');

    // Localize party name
    const localizedParties = {};
    for (const lang of ['en', 'te', 'hi', 'kn', 'mr', 'ta', 'ml', 'bn', 'gu', 'pa', 'or', 'as', 'ne']) {
      localizedParties[lang] = getLocalizedTerm(PARTIES_13_LANG, rawParty, lang);
    }

    c.candidates.push({
      rank: pos,
      name: rawName,
      localizedNames,
      party: rawParty,
      localizedParties,
      sex,
      age,
      votes,
    });
  }

  // Finalize podium contests with differentials and vote shares
  const finalizedContests = [];
  for (const c of contestMap.values()) {
    c.candidates.sort((a, b) => a.rank - b.rank);

    const winner = c.candidates.find(x => x.rank === 1) || null;
    const ru1 = c.candidates.find(x => x.rank === 2) || null;
    const ru2 = c.candidates.find(x => x.rank === 3) || null;

    const v1 = winner ? winner.votes : 0;
    const v2 = ru1 ? ru1.votes : 0;
    const v3 = ru2 ? ru2.votes : 0;

    const totalValid = c.validVotes > 0 ? c.validVotes : (v1 + v2 + v3);

    if (winner) winner.voteShare = totalValid > 0 ? Number(((v1 / totalValid) * 100).toFixed(2)) : 0;
    if (ru1) {
      ru1.voteShare = totalValid > 0 ? Number(((v2 / totalValid) * 100).toFixed(2)) : 0;
      ru1.marginToWinner = v1 - v2;
    }
    if (ru2) {
      ru2.voteShare = totalValid > 0 ? Number(((v3 / totalValid) * 100).toFixed(2)) : 0;
      ru2.marginToWinner = v1 - v3;
      ru2.marginToFirstRunnerUp = v2 - v3;
    }

    finalizedContests.push({
      id: `${c.stateCode}-AC-${c.acNo}-${c.electionYear}`,
      stateCode: c.stateCode,
      stateName: c.stateName,
      electionYear: c.electionYear,
      acNo: c.acNo,
      constituencyName: c.constituencyName,
      delimitationId: c.delimitationId,
      validVotes: totalValid,
      marginWinnerToRunnerUp1: v1 - v2,
      marginWinnerToRunnerUp2: v1 - v3,
      marginRunnerUp1ToRunnerUp2: v2 - v3,
      winner,
      firstRunnerUp: ru1,
      secondRunnerUp: ru2,
    });
  }

  // Save to disk
  const outPath = path.resolve(OUTPUT_DIR, `${stateMeta.code.toLowerCase()}-podium-results.json`);
  fs.writeFileSync(outPath, JSON.stringify(finalizedContests, null, 2), 'utf8');

  // Compute years summary
  const years = [...new Set(finalizedContests.map(c => c.electionYear))].sort((a, b) => a - b);
  return {
    stateCode: stateMeta.code,
    stateName: stateMeta.name,
    totalContests: finalizedContests.length,
    yearsCovered: years,
    fileSizeKB: Math.round(fs.statSync(outPath).size / 1024),
  };
}

console.log('=== NATIONAL HISTORICAL ELECTION INGESTION & PODIUM ENGINE (1999–2026) ===\n');

const summaries = [];
for (const state of STATE_MAPPING) {
  const res = processState(state);
  if (res) {
    summaries.push(res);
    console.log(
      `[ACQUIRED] ${res.stateCode.padEnd(3)} | ${res.stateName.padEnd(18)} | ` +
      `${String(res.totalContests).padStart(5)} contests | Years: ${res.yearsCovered.join(', ')} | ` +
      `${res.fileSizeKB} KB`
    );
  }
}

console.log(`\n✓ Ingested and localized historical election podium data for ${summaries.length} States/UTs from 1999 onwards.`);
