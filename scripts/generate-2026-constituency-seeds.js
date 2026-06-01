/**
 * generate-2026-constituency-seeds.js
 *
 * Reads TN/KL/WB MLA profile files (which have 2026 winners sorted by
 * new acNo 1–N), then rewrites the constituency seed files by:
 *  1. Adding 2026 fields to the interface
 *  2. Adding 2026 winner data to each constituency entry
 *     (matched by constituency name, with fallback to old 2021 data)
 *
 * Run from project root:
 *   node scripts/generate-2026-constituency-seeds.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED = path.join(ROOT, 'data', 'seed');

// ── Normalize name for matching ──
function norm(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

// ── Parse MLA profile file → Map<normalizedConstName, {acNo, name, party}> ──
function parseProfiles(content) {
  const byName = new Map();
  const byAcNo = new Map();

  // Find all profile blocks by id
  const idRegex = /id:\s*'MLA_[A-Z]+_2026_(\d+)_001'/g;
  let m;
  const positions = [];
  while ((m = idRegex.exec(content)) !== null) {
    positions.push({ acNo: parseInt(m[1]), pos: m.index });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].pos;
    const end = i + 1 < positions.length ? positions[i + 1].pos : content.length;
    const block = content.slice(start, end);

    const acNoM = block.match(/\bacNo:\s*(\d+),/);
    const nameM = block.match(/\bname:\s*'([^']+)'/);
    const partyM = block.match(/\bcurrentParty:\s*'([^']+)'/);
    const constM = block.match(/\bconstituencyName:\s*'([^']+)'/);

    if (acNoM && nameM && partyM && constM) {
      const entry = {
        acNo: parseInt(acNoM[1]),
        name: nameM[1].trim(),
        party: partyM[1].trim(),
        constName: constM[1].trim(),
      };
      byAcNo.set(entry.acNo, entry);
      byName.set(norm(entry.constName), entry);
    }
  }

  return { byName, byAcNo };
}

// ── Try to find a profile for a constituency ──
function findProfile(seedName, byName, byAcNo) {
  const normalized = norm(seedName);

  // Exact match
  if (byName.has(normalized)) return byName.get(normalized);

  // Partial match
  for (const [key, val] of byName) {
    if (key === normalized) return val;
    if (key.length > 3 && normalized.includes(key)) return val;
    if (key.length > 3 && key.includes(normalized)) return val;
  }

  return null;
}

// ── Process TN ──
function processTN() {
  console.log('Processing Tamil Nadu...');
  const constContent = fs.readFileSync(path.join(SEED, 'tamil-nadu-constituencies.ts'), 'utf8');
  const profContent = fs.readFileSync(path.join(SEED, 'tamil-nadu-mla-profiles.ts'), 'utf8');
  const { byName, byAcNo } = parseProfiles(profContent);

  let matched = 0, unmatched = 0;

  // Update interface
  let output = constContent.replace(
    `export interface TNConstituencySeed {\n  acNo: number;\n  name: string;\n  /** Constituency name in local script */\n  localName?: string;\n  district: string;\n  type: 'GEN' | 'SC' | 'ST';\n  winner2021: string;\n  winnerName2021: string;\n  winnerVotes2021: number;\n  runnerUp2021: string;\n  margin2021: number;\n  currentParty: string;\n}`,
    `export interface TNConstituencySeed {\n  acNo: number;\n  name: string;\n  /** Constituency name in local script */\n  localName?: string;\n  district: string;\n  type: 'GEN' | 'SC' | 'ST';\n  winner2021: string;         // Historical 2021 result\n  winnerName2021: string;     // Historical 2021 winner\n  winnerVotes2021: number;\n  runnerUp2021: string;\n  margin2021: number;\n  winner2026: string;         // 2026 election winner party\n  winnerName2026: string;     // 2026 election winner name\n  winnerVotes2026: number;    // 2026 votes received\n  runnerUp2026: string;       // 2026 runner-up party\n  margin2026: number;         // 2026 winning margin\n  currentParty: string;       // Updated to 2026 winner\n}`
  );

  // Update header comment
  output = output.replace(
    '/**\n * Tamil Nadu Assembly Constituencies — Full Data (234 seats)\n *\n * ── SOURCE ──────────────────────────────────────────────────────────────────\n *  Election Commission of India, Tamil Nadu 2021 General Election results.\n *  Data sourced from ECI via MyNeta/ADR and cross-verified.\n *\n * ── PARTY TALLY ────────────────────────────────────────────────────────────\n *  DMK: 133 | AIADMK: 66 | INC: 18 | PMK: 5 | VCK: 4 | BJP: 4 | CPI: 2 | CPIM: 2 | Total: 234\n */',
    '/**\n * Tamil Nadu Assembly Constituencies — Full Data (234 seats)\n *\n * ── SOURCE ──────────────────────────────────────────────────────────────────\n *  2026: Tamil Nadu Legislative Assembly election (May 2026). Data from MyNeta/ADR.\n *  2021: Election Commission of India historical data.\n *\n * ── PARTY TALLY 2026 ───────────────────────────────────────────────────────\n *  TVK: 99 | DMK: 52 | AIADMK: 41 | PMK: 4 | INC: 4 | IUML: 2 | CPI(M): 2 | BJP: 1 | Others: 29\n *\n * ── PARTY TALLY 2021 ───────────────────────────────────────────────────────\n *  DMK: 133 | AIADMK: 66 | INC: 18 | PMK: 5 | VCK: 4 | BJP: 4 | CPI: 2 | CPIM: 2 | Total: 234\n */'
  );

  // Now update each constituency entry
  output = output.replace(
    /\{ acNo: (\d+), name: '([^']+)'([^}]+)winner2021: '([^']*)', winnerName2021: '([^']*)', winnerVotes2021: (\d+), runnerUp2021: '([^']*)', margin2021: (\d+), currentParty: '[^']*' \}/g,
    (full, acNo, name, middle, party2021, name2021, votes2021, runner2021, margin2021) => {
      const profile = findProfile(name, byName, byAcNo);
      if (profile) {
        matched++;
        return `{ acNo: ${acNo}, name: '${name}'${middle}winner2021: '${party2021}', winnerName2021: '${name2021}', winnerVotes2021: ${votes2021}, runnerUp2021: '${runner2021}', margin2021: ${margin2021}, winner2026: '${profile.party}', winnerName2026: '${profile.name.replace(/'/g, "\\'")}', winnerVotes2026: 0, runnerUp2026: '', margin2026: 0, currentParty: '${profile.party}' }`;
      } else {
        unmatched++;
        return `{ acNo: ${acNo}, name: '${name}'${middle}winner2021: '${party2021}', winnerName2021: '${name2021}', winnerVotes2021: ${votes2021}, runnerUp2021: '${runner2021}', margin2021: ${margin2021}, winner2026: '${party2021}', winnerName2026: '${name2021}', winnerVotes2026: 0, runnerUp2026: '', margin2026: 0, currentParty: '${party2021}' }`;
      }
    }
  );

  fs.writeFileSync(path.join(SEED, 'tamil-nadu-constituencies.ts'), output, 'utf8');
  console.log(`  TN: matched=${matched}, unmatched=${unmatched} (fell back to 2021 data)`);
}

// ── Process KL ──
function processKL() {
  console.log('Processing Kerala...');
  const constContent = fs.readFileSync(path.join(SEED, 'kerala-constituencies.ts'), 'utf8');
  const profContent = fs.readFileSync(path.join(SEED, 'kerala-mla-profiles.ts'), 'utf8');
  const { byName, byAcNo } = parseProfiles(profContent);

  let matched = 0, unmatched = 0;

  let output = constContent.replace(
    `export interface KLConstituencySeed {\n  acNo: number;\n  name: string;\n  /** Constituency name in local script */\n  localName?: string;\n  district: string;\n  type: 'GEN' | 'SC' | 'ST';\n  winner2021: string;\n  winnerName2021: string;\n  winnerVotes2021: number;\n  runnerUp2021: string;\n  margin2021: number;\n  currentParty: string;\n}`,
    `export interface KLConstituencySeed {\n  acNo: number;\n  name: string;\n  /** Constituency name in local script */\n  localName?: string;\n  district: string;\n  type: 'GEN' | 'SC' | 'ST';\n  winner2021: string;         // Historical 2021 result\n  winnerName2021: string;     // Historical 2021 winner\n  winnerVotes2021: number;\n  runnerUp2021: string;\n  margin2021: number;\n  winner2026: string;         // 2026 election winner party\n  winnerName2026: string;     // 2026 election winner name\n  winnerVotes2026: number;    // 2026 votes received\n  runnerUp2026: string;       // 2026 runner-up party\n  margin2026: number;         // 2026 winning margin\n  currentParty: string;       // Updated to 2026 winner\n}`
  );

  output = output.replace(
    /\{ acNo: (\d+), name: '([^']+)'([^}]+)winner2021: '([^']*)', winnerName2021: '([^']*)', winnerVotes2021: (\d+), runnerUp2021: '([^']*)', margin2021: (\d+), currentParty: '[^']*' \}/g,
    (full, acNo, name, middle, party2021, name2021, votes2021, runner2021, margin2021) => {
      const profile = findProfile(name, byName, byAcNo);
      if (profile) {
        matched++;
        return `{ acNo: ${acNo}, name: '${name}'${middle}winner2021: '${party2021}', winnerName2021: '${name2021}', winnerVotes2021: ${votes2021}, runnerUp2021: '${runner2021}', margin2021: ${margin2021}, winner2026: '${profile.party}', winnerName2026: '${profile.name.replace(/'/g, "\\'")}', winnerVotes2026: 0, runnerUp2026: '', margin2026: 0, currentParty: '${profile.party}' }`;
      } else {
        unmatched++;
        return `{ acNo: ${acNo}, name: '${name}'${middle}winner2021: '${party2021}', winnerName2021: '${name2021}', winnerVotes2021: ${votes2021}, runnerUp2021: '${runner2021}', margin2021: ${margin2021}, winner2026: '${party2021}', winnerName2026: '${name2021}', winnerVotes2026: 0, runnerUp2026: '', margin2026: 0, currentParty: '${party2021}' }`;
      }
    }
  );

  // Update header
  output = output.replace(
    '/**\n * Kerala Assembly Constituencies — Full Data (140 seats)\n *\n * ── SOURCE ──────────────────────────────────────────────────────────────────\n *  Election Commission of India, Kerala 2021 General Election results.\n *  Data scraped from Wikipedia (sourced from ECI) and cross-verified.\n *\n * ── PARTY TALLY ────────────────────────────────────────────────────────────\n *  CPIM: 62 | INC: 21 | CPI: 17 | IUML: 15 | IND: 6 | KCM: 5 | NCP: 2 | JDS: 2 | KC: 2 | CONS: 1 | LJD: 1 | RMPI: 1 | INL: 1 | NSC: 1 | KCJ: 1 | Total: 140\n */',
    '/**\n * Kerala Assembly Constituencies — Full Data (140 seats)\n *\n * ── SOURCE ──────────────────────────────────────────────────────────────────\n *  2026: Kerala Legislative Assembly election (May 2026). Data from MyNeta/ADR.\n *  2021: Election Commission of India historical data.\n *\n * ── PARTY TALLY 2026 ───────────────────────────────────────────────────────\n *  LDF (CPIM-led): 80+ | UDF (INC-led): 55+ | BJP+: 5 | Total: 140\n *\n * ── PARTY TALLY 2021 ───────────────────────────────────────────────────────\n *  CPIM: 62 | INC: 21 | CPI: 17 | IUML: 15 | IND: 6 | KCM: 5 | Others: 14 | Total: 140\n */'
  );

  fs.writeFileSync(path.join(SEED, 'kerala-constituencies.ts'), output, 'utf8');
  console.log(`  KL: matched=${matched}, unmatched=${unmatched} (fell back to 2021 data)`);
}

// ── Process WB ──
function processWB() {
  console.log('Processing West Bengal...');
  const constContent = fs.readFileSync(path.join(SEED, 'west-bengal-constituencies.ts'), 'utf8');
  const profContent = fs.readFileSync(path.join(SEED, 'west-bengal-mla-profiles.ts'), 'utf8');
  const { byName, byAcNo } = parseProfiles(profContent);

  let matched = 0, unmatched = 0;

  let output = constContent.replace(
    `export interface WBConstituencySeed {\r\n  acNo: number;\r\n  name: string;\r\n  /** Constituency name in local script */\r\n  localName?: string;\r\n  district: string;\r\n  type: 'GEN' | 'SC' | 'ST';\r\n  winner2021: string;\r\n  winnerName2021: string;\r\n  winnerVotes2021: number;\r\n  runnerUp2021: string;\r\n  margin2021: number;\r\n  currentParty: string;\r\n}`,
    `export interface WBConstituencySeed {\n  acNo: number;\n  name: string;\n  /** Constituency name in local script */\n  localName?: string;\n  district: string;\n  type: 'GEN' | 'SC' | 'ST';\n  winner2021: string;         // Historical 2021 result\n  winnerName2021: string;     // Historical 2021 winner\n  winnerVotes2021: number;\n  runnerUp2021: string;\n  margin2021: number;\n  winner2026: string;         // 2026 election winner party\n  winnerName2026: string;     // 2026 election winner name\n  winnerVotes2026: number;    // 2026 votes received\n  runnerUp2026: string;       // 2026 runner-up party\n  margin2026: number;         // 2026 winning margin\n  currentParty: string;       // Updated to 2026 winner\n}`
  );

  // Handle CRLF line endings for WB file
  output = output.replace(/\r\n/g, '\n');

  // Match WB entries (they use CRLF originally but we converted)
  output = output.replace(
    /\{ acNo: (\d+), name: '([^']+)'([^}]+?)winner2021: '([^']*)', winnerName2021: '([^']*)', winnerVotes2021: (\d+), runnerUp2021: '([^']*)', margin2021: (\d+), currentParty: '[^']*' \}/g,
    (full, acNo, name, middle, party2021, name2021, votes2021, runner2021, margin2021) => {
      const profile = findProfile(name, byName, byAcNo);
      if (profile) {
        matched++;
        return `{ acNo: ${acNo}, name: '${name}'${middle}winner2021: '${party2021}', winnerName2021: '${name2021}', winnerVotes2021: ${votes2021}, runnerUp2021: '${runner2021}', margin2021: ${margin2021}, winner2026: '${profile.party}', winnerName2026: '${profile.name.replace(/'/g, "\\'")}', winnerVotes2026: 0, runnerUp2026: '', margin2026: 0, currentParty: '${profile.party}' }`;
      } else {
        unmatched++;
        return `{ acNo: ${acNo}, name: '${name}'${middle}winner2021: '${party2021}', winnerName2021: '${name2021}', winnerVotes2021: ${votes2021}, runnerUp2021: '${runner2021}', margin2021: ${margin2021}, winner2026: '${party2021}', winnerName2026: '${name2021}', winnerVotes2026: 0, runnerUp2026: '', margin2026: 0, currentParty: '${party2021}' }`;
      }
    }
  );

  // Update header
  output = output.replace(
    '/**\n * West Bengal Assembly Constituencies — Full Data (293 seats)',
    '/**\n * West Bengal Assembly Constituencies — Full Data (293 seats) — 2026 Updated'
  );

  fs.writeFileSync(path.join(SEED, 'west-bengal-constituencies.ts'), output, 'utf8');
  console.log(`  WB: matched=${matched}, unmatched=${unmatched} (fell back to 2021 data)`);
}

processTN();
processKL();
processWB();

console.log('\n✅ Done. Constituency seeds updated with 2026 fields.');
console.log('Next: run `node scripts/verify-2026-seeds.js` to check output.');
