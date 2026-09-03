import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const titleCase = (s) => String(s).trim().toLowerCase()
  .replace(/([a-z])/g, (m, ch, i, str) => (i === 0 || /[^a-z]/.test(str[i - 1]) ? ch.toUpperCase() : ch))
  .replace(/\b(Of|And|The)\b/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ').trim();

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function parseParty(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('bharatiya janata') || s.includes('bjp') || s.includes('bhartiya janata') || s.includes('bharatiya janta')) return 'BJP';
  if (s.includes('national congress') || s.includes('inc') || s.includes('congress')) return 'INC';
  if (s.includes('biju janata dal') || s.includes('bjd')) return 'BJD';
  if (s.includes('aam aadmi') || s.includes('aap')) return 'AAP';
  if (s.includes('bahujan samaj') || s.includes('bsp')) return 'BSP';
  if (s.includes('rashtriya loktantrik') || s.includes('rlp')) return 'RLP';
  if (s.includes('rashtriya lok dal') || s.includes('rld')) return 'RLD';
  if (s.includes('bharat adivasi') || s.includes('bap')) return 'BAP';
  if (s.includes('asom gana parishad') || s.includes('agp')) return 'AGP';
  if (s.includes('all india united democratic front') || s.includes('aiudf')) return 'AIUDF';
  if (s.includes('bodoland people') || s.includes('bpf')) return 'BPF';
  if (s.includes('united people') || s.includes('uppl')) return 'UPPL';
  if (s.includes('all india trinamool') || s.includes('aitc')) return 'AITC';
  if (s.includes('communist party of india (marxist)') || s.includes('cpim') || s.includes('cpm')) return 'CPIM';
  if (s.includes('samajwadi party') || s.includes('sp')) return 'SP';
  if (s.includes('independent') || s.includes('ind')) return 'IND';
  if (s.includes('gondwana gantantra') || s.includes('ggp')) return 'GGP';
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'OTH';
}

function loadTCPDMeta(gzFile) {
  const text = zlib.gunzipSync(readFileSync('scripts/' + gzFile)).toString('utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const H = lines[0].split(',');
  const cnoIdx = H.indexOf('Constituency_No');
  const distIdx = H.indexOf('District_Name');
  const typeIdx = H.indexOf('Constituency_Type');
  const yrIdx = H.indexOf('Year');

  const meta = new Map();
  // Traverse newest to oldest
  for (let i = lines.length - 1; i >= 1; i--) {
    const p = lines[i].split(',');
    const cno = +p[cnoIdx];
    if (cno && !meta.has(cno)) {
      const t = (p[typeIdx] || 'GEN').toUpperCase();
      let dist = titleCase(p[distIdx] || '');
      meta.set(cno, {
        district: dist,
        type: t === 'SC' ? 'SC' : t === 'ST' ? 'ST' : 'GEN',
      });
    }
  }
  return meta;
}

function loadExistingLocalNames(seedFile) {
  const m = new Map();
  try {
    const txt = readFileSync('data/seed/' + seedFile, 'utf8');
    const matches = [...txt.matchAll(/name:\s*'([^']+)',\s*localName:\s*'([^']+)'/g)];
    for (const match of matches) {
      m.set(norm(match[1]), match[2]);
    }
  } catch {}
  return m;
}

function parseWikiConstituencies(wikiFile, targetCount) {
  const text = readFileSync('scripts/' + wikiFile, 'utf8');
  const rows = text.split('|-');
  const seats = [];

  let currentDist = '';

  for (const r of rows) {
    const lines = r.split('\n').map(l => l.trim()).filter(Boolean);

    // Track district header if present
    for (const l of lines) {
      const dm = l.match(/\[\[(?:[^|\]]+\|)?([^\]]+district[^\]]*)\]\]/i);
      if (dm) {
        currentDist = titleCase(dm[1].replace(/district/gi, '').replace(/,/g, '').trim());
      }
    }

    let acIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^[|!]\s*(\d{1,3})\s*$/);
      if (m && parseInt(m[1]) >= 1 && parseInt(m[1]) <= targetCount) {
        acIdx = i;
        break;
      }
    }
    if (acIdx === -1) continue;

    const acNo = parseInt(lines[acIdx].replace(/^[|!]/, '').trim());
    const nameLine = lines[acIdx + 1] || '';
    let rawName = nameLine.replace(/^[|!]/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').trim();
    let type = 'GEN';
    if (rawName.includes('(SC)')) type = 'SC';
    if (rawName.includes('(ST)')) type = 'ST';
    let name = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim();

    // collect cells
    const cells = lines.slice(acIdx + 2).filter(l => !l.startsWith('!') && !l.includes('bgcolor=') && !l.includes('style=background-color') && !l.includes('style="background-color'));
    const clean = (s) => (s || '').replace(/^[|!]/, '').replace(/.*\|\s*/, '').replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1').replace(/\{\{[^|]+\|([^}]+)\}\}/g, '$1').replace(/['"{}]/g, '').trim();

    const wCand = titleCase(clean(cells[0]));
    const wParty = parseParty(clean(cells[1]));
    const wVotes = parseInt(clean(cells[2]).replace(/[^\d]/g, '')) || 0;
    const ruCand = titleCase(clean(cells[4]));
    const ruParty = parseParty(clean(cells[5]));
    const margin = parseInt(clean(cells[cells.length - 1]).replace(/[^\d]/g, '')) || 0;

    seats.push({
      acNo,
      name,
      district: currentDist,
      type,
      winnerName: wCand,
      winnerParty: wParty,
      winnerVotes: wVotes,
      runnerName: ruCand,
      runnerParty: ruParty,
      margin,
    });
  }

  // Deduplicate keeping first occurrence of acNo
  const byNo = new Map();
  for (const s of seats) {
    if (!byNo.has(s.acNo)) byNo.set(s.acNo, s);
  }
  return Array.from(byNo.values()).sort((a, b) => a.acNo - b.acNo);
}

// ── 1. RAJASTHAN (200 seats) ──
console.log('Building Rajasthan...');
{
  const tcpd = loadTCPDMeta('Rajasthan_AE.csv.gz');
  const localMap = loadExistingLocalNames('rajasthan-constituencies.ts');
  const wikiSeats = parseWikiConstituencies('rj-2023-wiki.txt', 200);

  const seats = wikiSeats.map(s => {
    const m = tcpd.get(s.acNo) || { district: s.district || 'Rajasthan', type: s.type };
    const local = localMap.get(norm(s.name)) || s.name;
    return {
      acNo: s.acNo,
      name: s.name,
      localName: local,
      district: m.district || s.district || 'Rajasthan',
      type: m.type || s.type,
      winner2023: s.winnerParty,
      winnerName2023: s.winnerName,
      winnerVotes2023: s.winnerVotes,
      runnerUp2023: s.runnerParty ? `${s.runnerParty} - ${s.runnerName}` : '',
      margin2023: s.margin,
      currentParty: s.winnerParty,
    };
  });

  const out = `/**
 * Rajasthan Assembly Constituencies — 200 seats (2023)
 *
 * Source: Election Commission of India (ECI) / TCPD
 * General Election to Legislative Assembly of Rajasthan 2023
 */

export interface RJConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2023: string;
  winnerName2023: string;
  winnerVotes2023: number;
  runnerUp2023: string;
  margin2023: number;
  currentParty: string;
}

export const RJ_CONSTITUENCIES: RJConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2023: '${s.winner2023}', winnerName2023: '${s.winnerName2023.replace(/'/g, "\\'")}', winnerVotes2023: ${s.winnerVotes2023}, runnerUp2023: '${s.runnerUp2023.replace(/'/g, "\\'")}', margin2023: ${s.margin2023}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getRJConstituency(acNo: number): RJConstituencySeed | undefined {
  return RJ_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;
  writeFileSync('data/seed/rajasthan-constituencies.ts', out, 'utf8');
  console.log('Wrote Rajasthan:', seats.length);
}

// ── 2. MADHYA PRADESH (230 seats) ──
console.log('Building Madhya Pradesh...');
{
  const tcpd = loadTCPDMeta('Madhya_Pradesh_AE.csv.gz');
  const localMap = loadExistingLocalNames('madhya-pradesh-constituencies.ts');
  const wikiSeats = parseWikiConstituencies('mp-2023-wiki.txt', 230);

  const seats = wikiSeats.map(s => {
    const m = tcpd.get(s.acNo) || { district: s.district || 'Madhya Pradesh', type: s.type };
    const local = localMap.get(norm(s.name)) || s.name;
    return {
      acNo: s.acNo,
      name: s.name,
      localName: local,
      district: m.district || s.district || 'Madhya Pradesh',
      type: m.type || s.type,
      winner2023: s.winnerParty,
      winnerName2023: s.winnerName,
      winnerVotes2023: s.winnerVotes,
      runnerUp2023: s.runnerParty ? `${s.runnerParty} - ${s.runnerName}` : '',
      margin2023: s.margin,
      currentParty: s.winnerParty,
    };
  });

  const out = `/**
 * Madhya Pradesh Assembly Constituencies — 230 seats (2023)
 *
 * Source: Election Commission of India (ECI) / TCPD
 * General Election to Legislative Assembly of Madhya Pradesh 2023
 */

export interface MPConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2023: string;
  winnerName2023: string;
  winnerVotes2023: number;
  runnerUp2023: string;
  margin2023: number;
  currentParty: string;
}

export const MP_CONSTITUENCIES: MPConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2023: '${s.winner2023}', winnerName2023: '${s.winnerName2023.replace(/'/g, "\\'")}', winnerVotes2023: ${s.winnerVotes2023}, runnerUp2023: '${s.runnerUp2023.replace(/'/g, "\\'")}', margin2023: ${s.margin2023}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getMPConstituency(acNo: number): MPConstituencySeed | undefined {
  return MP_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;
  writeFileSync('data/seed/madhya-pradesh-constituencies.ts', out, 'utf8');
  console.log('Wrote Madhya Pradesh:', seats.length);
}

// ── 3. CHHATTISGARH (90 seats) ──
console.log('Building Chhattisgarh...');
{
  const tcpd = loadTCPDMeta('Chhattisgarh_AE.csv.gz');
  const localMap = loadExistingLocalNames('chhattisgarh-constituencies.ts');
  const wikiSeats = parseWikiConstituencies('cg-2023-wiki.txt', 90);

  const seats = wikiSeats.map(s => {
    const m = tcpd.get(s.acNo) || { district: s.district || 'Chhattisgarh', type: s.type };
    const local = localMap.get(norm(s.name)) || s.name;
    return {
      acNo: s.acNo,
      name: s.name,
      localName: local,
      district: m.district || s.district || 'Chhattisgarh',
      type: m.type || s.type,
      winner2023: s.winnerParty,
      winnerName2023: s.winnerName,
      winnerVotes2023: s.winnerVotes,
      runnerUp2023: s.runnerParty ? `${s.runnerParty} - ${s.runnerName}` : '',
      margin2023: s.margin,
      currentParty: s.winnerParty,
    };
  });

  const out = `/**
 * Chhattisgarh Assembly Constituencies — 90 seats (2023)
 *
 * Source: Election Commission of India (ECI) / TCPD
 * General Election to Legislative Assembly of Chhattisgarh 2023
 */

export interface CGConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2023: string;
  winnerName2023: string;
  winnerVotes2023: number;
  runnerUp2023: string;
  margin2023: number;
  currentParty: string;
}

export const CG_CONSTITUENCIES: CGConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2023: '${s.winner2023}', winnerName2023: '${s.winnerName2023.replace(/'/g, "\\'")}', winnerVotes2023: ${s.winnerVotes2023}, runnerUp2023: '${s.runnerUp2023.replace(/'/g, "\\'")}', margin2023: ${s.margin2023}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getCGConstituency(acNo: number): CGConstituencySeed | undefined {
  return CG_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;
  writeFileSync('data/seed/chhattisgarh-constituencies.ts', out, 'utf8');
  console.log('Wrote Chhattisgarh:', seats.length);
}

// ── 4. ODISHA (147 seats) ──
console.log('Building Odisha...');
{
  const tcpd = loadTCPDMeta('Odisha_AE.csv.gz');
  const localMap = loadExistingLocalNames('odisha-constituencies.ts');
  const wikiSeats = parseWikiConstituencies('od-2024-wiki.txt', 147);

  const seats = wikiSeats.map(s => {
    const m = tcpd.get(s.acNo) || { district: s.district || 'Odisha', type: s.type };
    const local = localMap.get(norm(s.name)) || s.name;
    return {
      acNo: s.acNo,
      name: s.name,
      localName: local,
      district: m.district || s.district || 'Odisha',
      type: m.type || s.type,
      winner2024: s.winnerParty,
      winnerName2024: s.winnerName,
      winnerVotes2024: s.winnerVotes,
      runnerUp2024: s.runnerParty ? `${s.runnerParty} - ${s.runnerName}` : '',
      margin2024: s.margin,
      currentParty: s.winnerParty,
    };
  });

  const out = `/**
 * Odisha Assembly Constituencies — 147 seats (2024)
 *
 * Source: Election Commission of India (ECI) / TCPD
 * General Election to Legislative Assembly of Odisha 2024
 */

export interface ODConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2024: string;
  winnerName2024: string;
  winnerVotes2024: number;
  runnerUp2024: string;
  margin2024: number;
  currentParty: string;
}

export const OD_CONSTITUENCIES: ODConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2024: '${s.winner2024}', winnerName2024: '${s.winnerName2024.replace(/'/g, "\\'")}', winnerVotes2024: ${s.winnerVotes2024}, runnerUp2024: '${s.runnerUp2024.replace(/'/g, "\\'")}', margin2024: ${s.margin2024}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getODConstituency(acNo: number): ODConstituencySeed | undefined {
  return OD_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;
  writeFileSync('data/seed/odisha-constituencies.ts', out, 'utf8');
  console.log('Wrote Odisha:', seats.length);
}

// ── 5. ASSAM (126 seats) ──
console.log('Building Assam...');
{
  const tcpd = loadTCPDMeta('Assam_AE.csv.gz');
  const localMap = loadExistingLocalNames('assam-constituencies.ts');
  const wikiSeats = parseWikiConstituencies('as-2021-wiki.txt', 126);

  const seats = wikiSeats.map(s => {
    const m = tcpd.get(s.acNo) || { district: s.district || 'Assam', type: s.type };
    const local = localMap.get(norm(s.name)) || s.name;
    return {
      acNo: s.acNo,
      name: s.name,
      localName: local,
      district: m.district || s.district || 'Assam',
      type: m.type || s.type,
      winner2026: s.winnerParty,
      winnerName2026: s.winnerName,
      winnerVotes2026: s.winnerVotes,
      runnerUp2026: s.runnerParty ? `${s.runnerParty} - ${s.runnerName}` : '',
      margin2026: s.margin,
      winner2021: s.winnerParty,
      winnerName2021: s.winnerName,
      winnerVotes2021: s.winnerVotes,
      runnerUp2021: s.runnerParty ? `${s.runnerParty} - ${s.runnerName}` : '',
      margin2021: s.margin,
      currentParty: s.winnerParty,
    };
  });

  const out = `/**
 * Assam Assembly Constituencies — 126 seats (2026 / 2021)
 *
 * Source: Election Commission of India (ECI) / TCPD
 * General Election to Legislative Assembly of Assam
 */

export interface ASConstituencySeed {
  acNo: number;
  name: string;
  /** Constituency name in local script */
  localName?: string;
  district: string;
  type: 'GEN' | 'SC' | 'ST';
  winner2026: string;
  winnerName2026: string;
  winnerVotes2026: number;
  runnerUp2026: string;
  margin2026: number;
  winner2021?: string;
  winnerName2021?: string;
  winnerVotes2021?: number;
  runnerUp2021?: string;
  margin2021?: number;
  currentParty: string;
}

export const AS_CONSTITUENCIES: ASConstituencySeed[] = [
${seats.map(s => `  { acNo: ${s.acNo}, name: '${s.name.replace(/'/g, "\\'")}', localName: '${s.localName.replace(/'/g, "\\'")}', district: '${s.district.replace(/'/g, "\\'")}', type: '${s.type}', winner2026: '${s.winner2026}', winnerName2026: '${s.winnerName2026.replace(/'/g, "\\'")}', winnerVotes2026: ${s.winnerVotes2026}, runnerUp2026: '${s.runnerUp2026.replace(/'/g, "\\'")}', margin2026: ${s.margin2026}, currentParty: '${s.currentParty}' },`).join('\n')}
];

export function getASConstituency(acNo: number): ASConstituencySeed | undefined {
  return AS_CONSTITUENCIES.find(c => c.acNo === acNo);
}
`;
  writeFileSync('data/seed/assam-constituencies.ts', out, 'utf8');
  console.log('Wrote Assam:', seats.length);
}
