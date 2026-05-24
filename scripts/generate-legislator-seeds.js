#!/usr/bin/env node
/**
 * generate-legislator-seeds.js
 *
 * Converts scraped MyNeta JSON data into TypeScript seed files for the app.
 * Reads from scripts/output/ and generates:
 *   - data/seed/{state}-mla-profiles.ts  (per-state MLA profiles)
 *   - data/seed/mp-profiles.ts           (updated with full LS+RS data)
 *   - apps/mobile/data/candidate-photo-map.json  (updated photo map)
 *   - apps/mobile/data/candidate-affidavits.json (full affidavit data)
 *
 * Usage: node scripts/generate-legislator-seeds.js
 */

const fs = require('fs');
const path = require('path');

const INPUT_DIR = path.resolve(__dirname, 'output');
const SEED_DIR = path.resolve(__dirname, '../data/seed');
const MOBILE_DATA_DIR = path.resolve(__dirname, '../apps/mobile/data');

// State code → state name mapping
const STATE_NAMES = {
  TS: 'Telangana', AP: 'Andhra Pradesh', KA: 'Karnataka', MH: 'Maharashtra',
  TN: 'Tamil Nadu', KL: 'Kerala', WB: 'West Bengal', UP: 'Uttar Pradesh',
  BR: 'Bihar', DL: 'Delhi', RJ: 'Rajasthan', GJ: 'Gujarat',
  MP: 'Madhya Pradesh', OD: 'Odisha', JH: 'Jharkhand', PB: 'Punjab',
  HR: 'Haryana', UK: 'Uttarakhand', CG: 'Chhattisgarh', AS: 'Assam',
  GA: 'Goa', HP: 'Himachal Pradesh', JK: 'Jammu & Kashmir',
};

const STATE_SLUG = {
  TS: 'telangana', AP: 'andhra-pradesh', KA: 'karnataka', MH: 'maharashtra',
  TN: 'tamil-nadu', KL: 'kerala', WB: 'west-bengal', UP: 'uttar-pradesh',
};

const ASSEMBLY_TERMS = {
  TS: { term: '3rd Telangana Assembly', year: '2023-' },
  AP: { term: '16th Andhra Pradesh Assembly', year: '2024-' },
  KA: { term: '16th Karnataka Assembly', year: '2023-' },
  MH: { term: '15th Maharashtra Assembly', year: '2024-' },
  TN: { term: '16th Tamil Nadu Assembly', year: '2021-' },
  KL: { term: '15th Kerala Assembly', year: '2021-' },
  WB: { term: '17th West Bengal Assembly', year: '2021-' },
  UP: { term: '18th Uttar Pradesh Assembly', year: '2022-' },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function escapeTS(str) {
  return str.replace(/'/g, "\\'").replace(/\\/g, '\\\\');
}

function generateAcNo(constituency, stateCode, index) {
  // Try to extract AC number from constituency name pattern
  // Otherwise use index + 1
  return index + 1;
}

// ─── Load scraped data ───────────────────────────────────────────────

function loadJSON(filename) {
  const fp = path.join(INPUT_DIR, filename);
  if (!fs.existsSync(fp)) {
    console.log(`  ⚠️  ${filename} not found — skipping`);
    return {};
  }
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

// ─── Generate MLA seed file for a state ──────────────────────────────

function generateMLASeedFile(stateCode, records) {
  const slug = STATE_SLUG[stateCode];
  const stateName = STATE_NAMES[stateCode] || stateCode;
  const assembly = ASSEMBLY_TERMS[stateCode] || { term: 'Assembly', year: '' };

  // Sort by constituency name
  const sorted = records.sort((a, b) => {
    const ca = a.constituency || '';
    const cb = b.constituency || '';
    return ca.localeCompare(cb);
  });

  let ts = '';
  ts += `/**\n`;
  ts += ` * ╔${'═'.repeat(72)}╗\n`;
  ts += ` * ║  ${stateName.toUpperCase()} MLA PROFILES — All ${sorted.length} MLAs (${assembly.term}, ${assembly.year})${' '.repeat(Math.max(0, 72 - 45 - stateName.length - String(sorted.length).length - assembly.term.length - assembly.year.length))}║\n`;
  ts += ` * ╚${'═'.repeat(72)}╝\n`;
  ts += ` *\n`;
  ts += ` * AUTO-GENERATED from MyNeta.info scrape data.\n`;
  ts += ` * Source: scripts/generate-legislator-seeds.js\n`;
  ts += ` * Date: ${new Date().toISOString().split('T')[0]}\n`;
  ts += ` *\n`;
  ts += ` * Data includes: name, party, age, DOB, gender, education, profession,\n`;
  ts += ` *                assets, liabilities, criminal cases, photo URL.\n`;
  ts += ` * All data from publicly available election affidavits via MyNeta/ADR.\n`;
  ts += ` */\n\n`;

  ts += `export interface MLAProfile {\n`;
  ts += `  acNo: number;\n`;
  ts += `  name: string;\n`;
  ts += `  party: string;\n`;
  ts += `  electedParty?: string;\n`;
  ts += `  age?: number;\n`;
  ts += `  dob?: string;\n`;
  ts += `  dobEstimated?: boolean;\n`;
  ts += `  gender: 'M' | 'F';\n`;
  ts += `  education?: string;\n`;
  ts += `  profession?: string;\n`;
  ts += `  terms: number;\n`;
  ts += `  criminalCases?: number;\n`;
  ts += `  totalAssets?: number;\n`;
  ts += `  totalLiabilities?: number;\n`;
  ts += `  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';\n`;
  ts += `  photoUrl?: string;\n`;
  ts += `  constituencyName?: string;\n`;
  ts += `  district?: string;\n`;
  ts += `  sourceUrl?: string;\n`;
  ts += `}\n\n`;

  const varName = `${stateCode.toUpperCase()}_MLA_PROFILES`;
  const constName = `${stateName.toUpperCase().replace(/[^A-Z]/g, '_')}_MLA_PROFILES`;

  ts += `export const ${varName}: MLAProfile[] = [\n`;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const acNo = i + 1;
    ts += `  {\n`;
    ts += `    acNo: ${acNo},\n`;
    ts += `    name: '${escapeTS(r.canonicalName)}',\n`;
    ts += `    party: '${escapeTS(r.party)}',\n`;
    if (r.age) ts += `    age: ${r.age},\n`;
    if (r.dob) {
      ts += `    dob: '${r.dob}',\n`;
      if (r.dobEstimated) ts += `    dobEstimated: true,\n`;
    }
    ts += `    gender: '${r.gender}',\n`;
    if (r.education && r.education !== 'others') ts += `    education: '${escapeTS(r.educationRaw || r.education)}',\n`;
    if (r.selfProfession) ts += `    profession: '${escapeTS(r.selfProfession)}',\n`;
    ts += `    terms: 1,\n`; // Default 1, needs cross-ref with historical data
    if (r.criminalCases !== undefined) ts += `    criminalCases: ${r.criminalCases},\n`;
    if (r.totalAssets) ts += `    totalAssets: ${r.totalAssets},\n`;
    if (r.totalLiabilities) ts += `    totalLiabilities: ${r.totalLiabilities},\n`;
    if (r.maritalStatus) ts += `    maritalStatus: '${r.maritalStatus}',\n`;
    if (r.photoUrl) ts += `    photoUrl: '${escapeTS(r.photoUrl)}',\n`;
    if (r.constituency) ts += `    constituencyName: '${escapeTS(r.constituency)}',\n`;
    if (r.district) ts += `    district: '${escapeTS(r.district)}',\n`;
    if (r.sourceUrl) ts += `    sourceUrl: '${escapeTS(r.sourceUrl)}',\n`;
    ts += `  },\n`;
  }

  ts += `];\n\n`;

  // ── Helper functions expected by stateDataDispatcher.ts ──────────
  const helperFnNames = {
    TS: { get: 'getMLAProfile', defected: 'getDefectedMLAs' },
    AP: { get: 'getAPMLAProfile', defected: 'getAPDefectedMLAs' },
    KA: { get: 'getKAMLAProfile', female: 'getKAFemaleMLAs' },
    MH: { get: 'getMHMLAProfile', female: 'getMHFemaleMLAs' },
    TN: { get: 'getTNMLAProfile' },
    KL: { get: 'getKLMLAProfile' },
    WB: { get: 'getWBMLAProfile' },
    UP: { get: 'getUPMLAProfile' },
  };

  const fns = helperFnNames[stateCode] || { get: `get${stateCode}MLAProfile` };

  // getMLAProfile(acNo)
  ts += `/** Get MLA profile by constituency number */\n`;
  ts += `export function ${fns.get}(acNo: number): MLAProfile | undefined {\n`;
  ts += `  return ${varName}.find((p) => p.acNo === acNo);\n`;
  ts += `}\n\n`;

  // getDefectedMLAs() — for TS and AP
  if (fns.defected) {
    ts += `/** Get MLAs who defected (electedParty differs from current party) */\n`;
    ts += `export function ${fns.defected}(): MLAProfile[] {\n`;
    ts += `  return ${varName}.filter((p) => p.electedParty && p.electedParty !== p.party);\n`;
    ts += `}\n\n`;
  }

  // getFemaleMLAs() — for KA and MH
  if (fns.female) {
    ts += `/** Get female MLAs */\n`;
    ts += `export function ${fns.female}(): MLAProfile[] {\n`;
    ts += `  return ${varName}.filter((p) => p.gender === 'F');\n`;
    ts += `}\n\n`;
  }

  // getAllProfiles() — generic
  ts += `/** Get all MLA profiles */\n`;
  ts += `export function getAll${stateCode}MLAs(): MLAProfile[] {\n`;
  ts += `  return ${varName};\n`;
  ts += `}\n`;

  return ts;
}

// ─── Generate MP seed file ───────────────────────────────────────────

function generateMPSeedFile(lsData, rsData) {
  const lsRecords = Object.values(lsData);
  const rsRecords = Object.values(rsData);

  // Group LS MPs by state
  const lsByState = {};
  for (const r of lsRecords) {
    // Infer state from constituency name or keep as 'IN'
    const sc = r.stateCode || 'IN';
    if (!lsByState[sc]) lsByState[sc] = [];
    lsByState[sc].push(r);
  }

  let ts = '';
  ts += `/**\n`;
  ts += ` * ╔${'═'.repeat(72)}╗\n`;
  ts += ` * ║  MEMBER OF PARLIAMENT PROFILES — 18th Lok Sabha (2024) + Rajya Sabha ║\n`;
  ts += ` * ╚${'═'.repeat(72)}╝\n`;
  ts += ` *\n`;
  ts += ` * AUTO-GENERATED from MyNeta.info + Sansad.in scrape data.\n`;
  ts += ` * Source: scripts/generate-legislator-seeds.js\n`;
  ts += ` * Date: ${new Date().toISOString().split('T')[0]}\n`;
  ts += ` *\n`;
  ts += ` * Lok Sabha: ${lsRecords.length} MPs\n`;
  ts += ` * Rajya Sabha: ${rsRecords.length} MPs\n`;
  ts += ` */\n\n`;

  ts += `type HouseType = 'lok_sabha' | 'rajya_sabha';\n\n`;

  ts += `interface MPProfile {\n`;
  ts += `  id: string;\n`;
  ts += `  name: string;\n`;
  ts += `  party: string;\n`;
  ts += `  stateCode: string;\n`;
  ts += `  house: HouseType;\n`;
  ts += `  constituency?: string;\n`;
  ts += `  constituencyNo?: number;\n`;
  ts += `  district?: string;\n`;
  ts += `  gender: 'M' | 'F';\n`;
  ts += `  age?: number;\n`;
  ts += `  dob?: string;\n`;
  ts += `  dobEstimated?: boolean;\n`;
  ts += `  education?: string;\n`;
  ts += `  profession?: string;\n`;
  ts += `  terms: number;\n`;
  ts += `  electedYear: number;\n`;
  ts += `  criminalCases?: number;\n`;
  ts += `  totalAssets?: number;\n`;
  ts += `  totalLiabilities?: number;\n`;
  ts += `  maritalStatus?: 'Single' | 'Married' | 'Widowed' | 'Divorced';\n`;
  ts += `  photoUrl?: string;\n`;
  ts += `  sourceUrl?: string;\n`;
  ts += `}\n\n`;

  // LS MPs
  ts += `export const LOK_SABHA_MPs: MPProfile[] = [\n`;
  let lsIdx = 0;
  for (const r of lsRecords) {
    lsIdx++;
    const sc = r.stateCode === 'IN' ? '' : r.stateCode;
    ts += `  {\n`;
    ts += `    id: 'LS_${String(lsIdx).padStart(3, '0')}',\n`;
    ts += `    name: '${escapeTS(r.canonicalName)}',\n`;
    ts += `    party: '${escapeTS(r.party)}',\n`;
    ts += `    stateCode: '${sc}',\n`;
    ts += `    house: 'lok_sabha',\n`;
    if (r.constituency) ts += `    constituency: '${escapeTS(r.constituency)}',\n`;
    if (r.district) ts += `    district: '${escapeTS(r.district)}',\n`;
    ts += `    gender: '${r.gender}',\n`;
    if (r.age) ts += `    age: ${r.age},\n`;
    if (r.dob) {
      ts += `    dob: '${r.dob}',\n`;
      if (r.dobEstimated) ts += `    dobEstimated: true,\n`;
    }
    if (r.educationRaw) ts += `    education: '${escapeTS(r.educationRaw)}',\n`;
    if (r.selfProfession) ts += `    profession: '${escapeTS(r.selfProfession)}',\n`;
    ts += `    terms: 1,\n`;
    ts += `    electedYear: 2024,\n`;
    if (r.criminalCases !== undefined) ts += `    criminalCases: ${r.criminalCases},\n`;
    if (r.totalAssets) ts += `    totalAssets: ${r.totalAssets},\n`;
    if (r.totalLiabilities) ts += `    totalLiabilities: ${r.totalLiabilities},\n`;
    if (r.maritalStatus) ts += `    maritalStatus: '${r.maritalStatus}',\n`;
    if (r.photoUrl) ts += `    photoUrl: '${escapeTS(r.photoUrl)}',\n`;
    if (r.sourceUrl) ts += `    sourceUrl: '${escapeTS(r.sourceUrl)}',\n`;
    ts += `  },\n`;
  }
  ts += `];\n\n`;

  // RS MPs
  ts += `export const RAJYA_SABHA_MPs: MPProfile[] = [\n`;
  let rsIdx = 0;
  for (const r of rsRecords) {
    rsIdx++;
    ts += `  {\n`;
    ts += `    id: 'RS_${String(rsIdx).padStart(3, '0')}',\n`;
    ts += `    name: '${escapeTS(r.canonicalName)}',\n`;
    ts += `    party: '${escapeTS(r.party || '')}',\n`;
    ts += `    stateCode: '${r.stateCode || ''}',\n`;
    ts += `    house: 'rajya_sabha',\n`;
    ts += `    gender: '${r.gender || 'M'}',\n`;
    ts += `    terms: 1,\n`;
    ts += `    electedYear: 2024,\n`;
    ts += `  },\n`;
  }
  ts += `];\n\n`;

  ts += `export const ALL_MPs = [...LOK_SABHA_MPs, ...RAJYA_SABHA_MPs];\n`;

  return ts;
}

// ─── Generate affidavit JSON ─────────────────────────────────────────

function generateAffidavitJSON(mlaData, lsData) {
  const all = { ...mlaData, ...lsData };
  const affidavits = {};

  for (const [key, r] of Object.entries(all)) {
    if (!r.totalAssets && !r.criminalCases) continue; // Skip if no financial/criminal data

    affidavits[r.canonicalName] = {
      candidateName: r.canonicalName,
      stateCode: r.stateCode,
      constituency: r.constituency || '',
      district: r.district || '',
      party: r.party,
      electionYear: r.electionYear,
      age: r.age,
      dob: r.dob || null,
      education: r.education,
      educationRaw: r.educationRaw || '',
      selfProfession: r.selfProfession || '',
      totalAssets: r.totalAssets || 0,
      totalLiabilities: r.totalLiabilities || 0,
      selfMovableAssets: r.selfMovableAssets || 0,
      selfImmovableAssets: r.selfImmovableAssets || 0,
      spouseMovableAssets: r.spouseMovableAssets || 0,
      spouseImmovableAssets: r.spouseImmovableAssets || 0,
      criminalCases: r.criminalCases || 0,
      ipcSections: r.ipcSections || [],
      seriousIpcSections: r.seriousIpcSections || [],
      photoUrl: r.photoUrl || null,
      sourceUrl: r.sourceUrl || '',
    };
  }

  return affidavits;
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  KSHETRA — Legislator Seed File Generator                       ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Load scraped data
  const mlaData = loadJSON('mla-data.json');
  const lsData = loadJSON('ls-mp-data.json');
  const rsData = loadJSON('rs-mp-data.json');
  const photoMap = loadJSON('photo-map-all.json');

  const mlaCount = Object.keys(mlaData).length;
  const lsCount = Object.keys(lsData).length;
  const rsCount = Object.keys(rsData).length;

  console.log(`📦 Loaded: ${mlaCount} MLAs, ${lsCount} LS MPs, ${rsCount} RS MPs\n`);

  if (mlaCount === 0 && lsCount === 0) {
    console.log('❌ No scraped data found. Run scrape-all-legislators.js first.');
    process.exit(1);
  }

  // ── Group MLAs by state ────────────────────────────────────────────
  const mlaByState = {};
  for (const r of Object.values(mlaData)) {
    const sc = r.stateCode;
    if (!mlaByState[sc]) mlaByState[sc] = [];
    mlaByState[sc].push(r);
  }

  // ── Generate MLA seed files ────────────────────────────────────────
  let totalMLAFiles = 0;
  for (const [stateCode, records] of Object.entries(mlaByState)) {
    const slug = STATE_SLUG[stateCode];
    if (!slug) {
      console.log(`  ⚠️  No slug for state ${stateCode}, skipping MLA seed`);
      continue;
    }

    const outPath = path.join(SEED_DIR, `${slug}-mla-profiles.ts`);
    const content = generateMLASeedFile(stateCode, records);
    fs.writeFileSync(outPath, content);
    console.log(`  ✅ ${outPath} (${records.length} MLAs)`);
    totalMLAFiles++;
  }

  // ── Generate MP seed file ──────────────────────────────────────────
  if (lsCount > 0 || rsCount > 0) {
    const mpPath = path.join(SEED_DIR, 'mp-profiles.ts');
    const mpContent = generateMPSeedFile(lsData, rsData);
    fs.writeFileSync(mpPath, mpContent);
    console.log(`  ✅ ${mpPath} (${lsCount} LS + ${rsCount} RS)`);
  }

  // ── Update photo map ───────────────────────────────────────────────
  if (Object.keys(photoMap).length > 0) {
    // Merge with existing
    const existingPath = path.join(MOBILE_DATA_DIR, 'candidate-photo-map.json');
    let existing = {};
    try {
      existing = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
    } catch {}
    const merged = { ...existing, ...photoMap };
    fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2));
    console.log(`  ✅ ${existingPath} (${Object.keys(merged).length} photos, was ${Object.keys(existing).length})`);
  }

  // ── Generate affidavit data ────────────────────────────────────────
  const affidavits = generateAffidavitJSON(mlaData, lsData);
  const affidavitPath = path.join(MOBILE_DATA_DIR, 'candidate-affidavits.json');
  fs.writeFileSync(affidavitPath, JSON.stringify(affidavits, null, 2));
  console.log(`  ✅ ${affidavitPath} (${Object.keys(affidavits).length} affidavits)`);

  // ── Summary ────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('✨ SEED GENERATION COMPLETE');
  console.log('═'.repeat(70));
  console.log(`  MLA seed files: ${totalMLAFiles} states`);
  for (const [sc, records] of Object.entries(mlaByState).sort()) {
    console.log(`    ${sc}: ${records.length} MLAs`);
  }
  console.log(`  MP seed file: ${lsCount} LS + ${rsCount} RS`);
  console.log(`  Photo map: ${Object.keys(photoMap).length} entries`);
  console.log(`  Affidavits: ${Object.keys(affidavits).length} entries`);
  console.log(`\n  Next: Build the app and verify data in the UI.`);
}

main();
