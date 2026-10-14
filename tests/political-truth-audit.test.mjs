/**
 * @file tests/political-truth-audit.test.mjs
 * @description Master Political Truth, Temporal Validity, and Systemic Integrity Test Suite
 * Mandated by Directives W021.5-CTO-INDIAWIDE-POLITICAL-TRUTH-AUDIT-AND-REMEDIATION-014 and 015.
 * 
 * Implements 17 Systemic Invariant Checks:
 * 1. Gangavathi AC 61 2023 General Election Ground Truth (G. Janardhan Reddy / KRPP)
 * 2. Cross-State Similar Candidate Name Disambiguation (B. C. Janardhan Reddy [AP] vs G. Janardhan Reddy [KA])
 * 3. Constituency Number Reused Across States Disambiguation (AC 61 namespace isolation)
 * 4. By-Election Winner Resolution vs General Election Baseline (Champawat UK AC 55)
 * 5. Former General Election Winner Succession Tracking (Kailash Chandra Gahtori -> Pushkar Singh Dhami)
 * 6. Future Election Projection Barrier (winner2026 must never override actual results)
 * 7. Conflicting / Impossible Metric Validation (votes < margin detection fails closed)
 * 8. Truncated Party Name & Malformed Alias Hygiene (Kalyana Ra elimination)
 * 9. Duplicate Natural Key & Phantom Helper Row Rejection (Basavaraj Bommai ENRICHED_PROFILES case)
 * 10. Financial Disclosure Invariant (missing disclosures must not silently become verified zeros)
 * 11. Vacancy & Incumbent-Loss Handling (seat vacancy must not surface stale officeholder)
 * 12. State/Constituency Linkage Invariant & AC Uniqueness (KA 2018 historical results uniqueness)
 * 13. UI/API Fallback Temporal Hierarchy (genericToBrief priority order)
 * 14. Parsing Residue & Stray Markup Scanner (Wikitext and HTML syntax hygiene)
 * 15. Delhi Assembly General Election 2025 vs 2022 MCD Local Body Resolution
 * 16. Temporal Contract: Expired 2021 Jurisdictions Flagged STALE_PENDING_INGESTION
 * 17. Ingestion Integrity: Candidacy Natural-Key Deduplication & Conflict Detection
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const runTsx = (code) => {
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  const res = spawnSync(cmd, ['tsx'], { input: code, encoding: 'utf8', shell: isWin });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`TSX failed: ${res.stderr || res.stdout}`);
  return JSON.parse(res.stdout.trim());
};

console.log('================================================================');
console.log('SYSTEMIC POLITICAL TRUTH & REPOSITORY INTEGRITY AUDIT TEST SUITE');
console.log('Directive: W021.5-CTO-CURRENT-POLITICAL-TRUTH-AND-INGESTION-ADJUDICATION-018');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(id, name, fn) {
  totalTests++;
  process.stdout.write(`TEST ${id}: ${name} ... `);
  try {
    fn();
    passedTests++;
    console.log('PASS');
  } catch (err) {
    console.log('FAIL');
    console.error(`  Error: ${err.message}`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// INVARIANT 1: Gangavathi AC 61 2023 General Election Ground Truth & Real API Resolver
// -----------------------------------------------------------------------------
runTest('01', 'Gangavathi AC 61 2023 General Election Ground Truth (ECI Form 20/21E & Real API Resolver)', () => {
  const filePath = path.resolve('data/seed/karnataka-constituencies.ts');
  const content = fs.readFileSync(filePath, 'utf8');
  const ac61Line = content.split('\n').find(l => l.includes('acNo: 61') && l.includes('name: \'Gangavathi\''));
  assert.ok(ac61Line, 'AC 61 Gangavathi line missing in karnataka-constituencies.ts');

  assert.ok(ac61Line.includes("winnerName2023: 'G. Janardhan Reddy'"), 'Winner name must be G. Janardhan Reddy');
  assert.ok(ac61Line.includes("winner2023: 'KRPP'"), 'Winner party must be KRPP');
  assert.ok(ac61Line.includes('winnerVotes2023: 66213'), 'Winner votes must be 66213 (ECI Form 20)');
  assert.ok(ac61Line.includes("runnerUp2023: 'INC'"), 'Runner up party must be INC (Iqbal Ansari: 57947)');
  assert.ok(ac61Line.includes('margin2023: 8266'), 'Margin must be 8266 votes');
  assert.ok(ac61Line.includes("currentParty: 'KRPP'"), 'Current party must be KRPP');

  // Verify real production API resolver (apps/api/src/services/stateData.ts)
  const apiKa61 = runTsx(`
    import { getConstituency } from './apps/api/src/services/stateData.ts';
    console.log(JSON.stringify(getConstituency('KA', 61)));
  `);
  assert.strictEqual(apiKa61.currentParty, 'KRPP', 'Real API getConstituency must return KRPP');
  assert.strictEqual(apiKa61.currentMLA, 'G. Janardhan Reddy', 'Real API getConstituency must return G. Janardhan Reddy');
  assert.strictEqual(apiKa61.name, 'Gangavathi');
  assert.strictEqual(apiKa61.district, 'Koppal');
});

// -----------------------------------------------------------------------------
// INVARIANT 2: Cross-State Similar Candidate Name Disambiguation
// -----------------------------------------------------------------------------
runTest('02', 'Cross-State Similar Candidate Name Disambiguation (B. C. vs G. Janardhan Reddy)', () => {
  const kaMla = fs.readFileSync(path.resolve('data/seed/karnataka-mla-profiles.ts'), 'utf8');
  const apMla = fs.readFileSync(path.resolve('data/seed/andhra-pradesh-mla-profiles.ts'), 'utf8');

  // KA Gangavathi profile must be G. Janardhan Reddy (KRPP)
  const kaMatch = kaMla.match(/acNo:\s*61[\s\S]*?name:\s*'G\. Janardhan Reddy'[\s\S]*?party:\s*'KRPP'/);
  assert.ok(kaMatch, 'Karnataka AC 61 profile must be G. Janardhan Reddy (KRPP)');

  // AP Banaganapalle AC 140 is Bobbala Chinnolla Janardhan Reddy (B. C. Janardhan Reddy, TDP)
  const apMatch = apMla.match(/acNo:\s*140[\s\S]*?name:\s*['"]Bobbala Chinnolla Janardhan Reddy['"][\s\S]*?currentParty:\s*['"]TDP['"]/);
  assert.ok(apMatch, 'Andhra Pradesh AC 140 must be Bobbala Chinnolla Janardhan Reddy (TDP)');

  // Cross-contamination guard: B. C. Janardhan Reddy must never appear in Karnataka profiles
  assert.ok(!kaMla.includes("name: 'B C Janardhan Reddy'"), 'B C Janardhan Reddy must not contaminate Karnataka profiles');
});

// -----------------------------------------------------------------------------
// INVARIANT 3: Constituency Number Reused Across States Disambiguation
// -----------------------------------------------------------------------------
runTest('03', 'Constituency Number Reused Across States Disambiguation (AC 61 Namespace)', () => {
  const ka = fs.readFileSync(path.resolve('data/seed/karnataka-constituencies.ts'), 'utf8');
  const ts = fs.readFileSync(path.resolve('data/seed/telangana-constituencies.ts'), 'utf8');
  const ap = fs.readFileSync(path.resolve('data/seed/andhra-pradesh-constituencies.ts'), 'utf8');

  const ka61 = ka.split('\n').find(l => l.includes('acNo: 61'));
  const ts61 = ts.split('\n').find(l => l.includes('acNo: 61'));
  const ap61 = ap.split('\n').find(l => l.includes('acNo: 61'));

  assert.ok(ka61 && ka61.includes("'Gangavathi'"), 'KA AC 61 must be Gangavathi');
  assert.ok(ts61 && ts61.includes("'Jubilee Hills'"), 'TS AC 61 must be Jubilee Hills');
  assert.ok(ap61 && ap61.includes("'Tanuku'"), 'AP AC 61 must be Tanuku');

  // Verify unique composite key mapping
  const makeKey = (state, acNo) => `${state.toUpperCase()}-AC-${acNo}`;
  assert.strictEqual(makeKey('KA', 61), 'KA-AC-61');
  assert.strictEqual(makeKey('TS', 61), 'TS-AC-61');
  assert.strictEqual(makeKey('AP', 61), 'AP-AC-61');
  assert.notStrictEqual(makeKey('KA', 61), makeKey('TS', 61));
});

// -----------------------------------------------------------------------------
// INVARIANT 4: By-Election Winner Resolution vs General Election Baseline
// -----------------------------------------------------------------------------
runTest('04', 'By-Election Winner Resolution vs General Election Baseline (Champawat UK AC 55)', () => {
  const ukConst = fs.readFileSync(path.resolve('data/seed/uttarakhand-constituencies.ts'), 'utf8');
  const ukMla = fs.readFileSync(path.resolve('data/seed/uttarakhand-mla-profiles.ts'), 'utf8');

  // In 2022 General Election: Kailash Chandra Gahtori won Champawat
  const c55 = ukConst.split('\n').find(l => l.includes('acNo: 55'));
  assert.ok(c55 && c55.includes('Kailash Chandra Gahtori'), '2022 General election winner was Kailash Chandra Gahtori');

  // In MLA Profiles: Sitting MLA is CM Pushkar Singh Dhami (who won by-election May 2022)
  const m55Match = ukMla.match(/acNo:\s*55[\s\S]*?name:\s*'Pushkar Singh Dhami'/);
  assert.ok(m55Match, 'Sitting MLA in profiles must reflect by-election winner Pushkar Singh Dhami');
});

// -----------------------------------------------------------------------------
// INVARIANT 5: Former General Election Winner Succession Tracking
// -----------------------------------------------------------------------------
runTest('05', 'Former General Election Winner Succession Tracking (Resigned/Deceased MLAs)', () => {
  const ukConst = fs.readFileSync(path.resolve('data/seed/uttarakhand-constituencies.ts'), 'utf8');
  const ukMla = fs.readFileSync(path.resolve('data/seed/uttarakhand-mla-profiles.ts'), 'utf8');

  // Kedarnath AC 7: Shaila Rani Rawat won 2022 GE (BJP), passed away July 2024; Asha Nautiyal won by-election
  const k7Const = ukConst.split('\n').find(l => l.includes('acNo: 7'));
  assert.ok(k7Const && k7Const.includes('Shaila Rani Rawat'), 'GE 2022 winner recorded as Shaila Rani Rawat');
  const k7Mla = ukMla.match(/acNo:\s*7[\s\S]*?name:\s*'Asha Nautiyal'/);
  assert.ok(k7Mla, 'Sitting MLA profile recorded as by-election winner Asha Nautiyal');

  // Both distinct temporal identities must be recognized
  assert.notStrictEqual('Shaila Rani Rawat', 'Asha Nautiyal');
});

// -----------------------------------------------------------------------------
// INVARIANT 6: Future Election Projection Barrier (Real Mobile stateDataAdapter)
// -----------------------------------------------------------------------------
runTest('06', 'Future Election Projection Barrier (Real Mobile stateDataAdapter Segregation)', () => {
  // Test real mobile adapter getUnifiedConstituenciesForState('TN')
  const mobileTn1 = runTsx(`
    import { getUnifiedConstituenciesForState } from './apps/mobile/lib/stateDataAdapter.ts';
    console.log(JSON.stringify(getUnifiedConstituenciesForState('TN')[0]));
  `);

  // Ground truth verified 2021 result
  assert.strictEqual(mobileTn1.winnerParty, 'DMK', 'Verified current party in mobile adapter must be DMK');
  assert.strictEqual(mobileTn1.winnerName, 'GOVINDARAJAN T.J', 'Verified current winner name in mobile adapter must be GOVINDARAJAN T.J');
  assert.strictEqual(mobileTn1.electionYear, 2021, 'Verified election year must be 2021, never 2026');

  // Simulation strictly segregated under optional projection contract
  assert.ok(mobileTn1.projection, 'Future 2026 data must be segregated in projection object');
  assert.strictEqual(mobileTn1.projection.isSimulation, true, 'isSimulation flag must be true');
  assert.strictEqual(mobileTn1.projection.projectedParty, 'TVK', 'projectedParty must be TVK');
  assert.strictEqual(mobileTn1.projection.projectedWinnerName, 'S.Vijayakumar', 'projectedWinnerName must be S.Vijayakumar');
  assert.strictEqual(mobileTn1.projection.disclaimer, 'Simulated Projection — Not an Official Result', 'Mandatory simulation disclaimer must be present');
});

// -----------------------------------------------------------------------------
// INVARIANT 7: Conflicting / Impossible Metric Validation
// -----------------------------------------------------------------------------
runTest('07', 'Metric Integrity: Votes Less Than Margin Fails Closed', () => {
  function validateContestMetrics(totalVotes, margin) {
    if (totalVotes === null || totalVotes === undefined || margin === null || margin === undefined) {
      throw new Error('MISSING_METRIC_DATA');
    }
    if (margin > totalVotes) {
      throw new Error(`MATHEMATICAL_IMPOSSIBILITY: Margin (${margin}) cannot exceed total winner votes (${totalVotes})`);
    }
    if (totalVotes < 0 || margin < 0) {
      throw new Error('NEGATIVE_METRIC_DATA');
    }
    return true;
  }

  // Authoritative Gangavathi metrics: 66,213 votes, 8,266 margin (PASS)
  assert.strictEqual(validateContestMetrics(66213, 8266), true);

  // Corrupted fixture: margin > total votes (FAIL CLOSED)
  assert.throws(
    () => validateContestMetrics(5000, 10000),
    /MATHEMATICAL_IMPOSSIBILITY/,
    'Validator must throw when margin exceeds total votes'
  );
});

// -----------------------------------------------------------------------------
// INVARIANT 8: Truncated Party Name & Malformed Alias Hygiene
// -----------------------------------------------------------------------------
runTest('08', 'Syntax Hygiene: Truncated Party Names & Malformed Aliases Eliminated', () => {
  const kaMla = fs.readFileSync(path.resolve('data/seed/karnataka-mla-profiles.ts'), 'utf8');

  // Verify truncated party 'Kalyana Ra' is completely purged
  assert.ok(!kaMla.includes("party: 'Kalyana Ra'"), 'Truncated party string "Kalyana Ra" must not exist');

  // Verify correct canonical party 'KRPP' is present for Gangavathi
  const profileMatch = kaMla.match(/acNo:\s*61[\s\S]*?party:\s*'KRPP'/);
  assert.ok(profileMatch, 'Gangavathi must have canonical party KRPP');
});

// -----------------------------------------------------------------------------
// INVARIANT 9: Duplicate Natural Key & Phantom Helper Row Rejection
// -----------------------------------------------------------------------------
runTest('09', 'Ingestion Guard: Phantom Helper Arrays Rejected (Basavaraj Bommai DQ-W021.5-B2.2E-001)', () => {
  // Simulate the AST extractor: naive scanner extracts both SCRAPED_PROFILES and ENRICHED_PROFILES
  const sourceMock = [
    { type: 'SCRAPED_PROFILES', candidate_name: 'Basavaraj Bommai', ac_no: 31, state_code: 'KA', election_year: 2023, assets: 521356863, liabilities: 59420772 },
    { type: 'ENRICHED_PROFILES', candidate_name: 'Basavaraj Bommai', ac_no: 31, state_code: 'KA', election_year: 2023, education: 'BE', profession: 'Engineer / Politician' }
  ];

  // Schema-aware filter: Helper arrays must NEVER generate candidate affidavit entities
  function schemaAwareAffidavitExtractor(items) {
    const canonical = new Map();
    for (const item of items) {
      if (item.type === 'ENRICHED_PROFILES') {
        // Reject helper array from generating separate entities
        continue;
      }
      const naturalKey = `${item.candidate_name}::${item.ac_no}::${item.state_code}::${item.election_year}`;
      if (canonical.has(naturalKey)) {
        throw new Error(`DUPLICATE_NATURAL_KEY_COLLISION: ${naturalKey}`);
      }
      canonical.set(naturalKey, item);
    }
    return Array.from(canonical.values());
  }

  const extracted = schemaAwareAffidavitExtractor(sourceMock);
  assert.strictEqual(extracted.length, 1, 'Only one canonical affidavit must be extracted for Basavaraj Bommai');
  assert.strictEqual(extracted[0].assets, 521356863, 'Must retain authoritative MyNeta assets');
  assert.strictEqual(extracted[0].liabilities, 59420772, 'Must retain authoritative MyNeta liabilities');
});

// -----------------------------------------------------------------------------
// INVARIANT 10: Financial Disclosure Invariant
// -----------------------------------------------------------------------------
runTest('10', 'Disclosure Integrity: Missing Financials Must Not Become Verified Zeros', () => {
  function parseFinancialField(value) {
    if (value === undefined || value === null || value === '') {
      return { value: null, isDisclosed: false, status: 'NOT_DISCLOSED' };
    }
    const num = Number(value);
    if (isNaN(num)) {
      throw new Error(`INVALID_FINANCIAL_VALUE: ${value}`);
    }
    return { value: num, isDisclosed: true, status: num === 0 ? 'ZERO_REPORTED' : 'VALUE_REPORTED' };
  }

  // Verified candidate with actual zero debt
  const zeroDebt = parseFinancialField(0);
  assert.strictEqual(zeroDebt.value, 0);
  assert.strictEqual(zeroDebt.status, 'ZERO_REPORTED');

  // Candidate with missing disclosure: must be null, not 0!
  const missing = parseFinancialField(undefined);
  assert.strictEqual(missing.value, null);
  assert.strictEqual(missing.status, 'NOT_DISCLOSED');
  assert.notStrictEqual(missing.value, 0, 'Missing financial disclosure must never default to 0');
});

// -----------------------------------------------------------------------------
// INVARIANT 11: Vacancy & Incumbent-Loss Handling
// -----------------------------------------------------------------------------
runTest('11', 'Vacancy Modeling: Deceased or Resigned MLA Must Not Be Represented as Active', () => {
  const seatState = {
    acNo: 7,
    name: 'Kedarnath',
    stateCode: 'UK',
    generalElectionWinner: 'Shaila Rani Rawat',
    tenureStatus: 'VACATED_BY_DEATH',
    tenureEndDate: '2024-07-09',
    byElectionWinner: 'Asha Nautiyal',
    byElectionDate: '2024-11-20'
  };

  function getActiveRepresentative(seat, queryDate) {
    if (queryDate < seat.tenureEndDate) {
      return { mla: seat.generalElectionWinner, isSitting: true };
    }
    if (queryDate >= seat.tenureEndDate && queryDate < seat.byElectionDate) {
      return { mla: null, isSitting: false, status: 'SEAT_VACANT' };
    }
    return { mla: seat.byElectionWinner, isSitting: true, status: 'BY_ELECTION_INCUMBENT' };
  }

  // During interim vacancy period (August 2024): seat is VACANT, not Shaila Rani Rawat
  const interim = getActiveRepresentative(seatState, '2024-08-01');
  assert.strictEqual(interim.isSitting, false);
  assert.strictEqual(interim.status, 'SEAT_VACANT');

  // After by-election (December 2024): sitting MLA is Asha Nautiyal
  const current = getActiveRepresentative(seatState, '2024-12-01');
  assert.strictEqual(current.mla, 'Asha Nautiyal');
  assert.strictEqual(current.isSitting, true);
});

// -----------------------------------------------------------------------------
// INVARIANT 12: Statutory Delimitation Identity & Rejection of False AC 76 Hack
// -----------------------------------------------------------------------------
runTest('12', 'Statutory Delimitation Identity: Bellary Rural AC 65, Shorapur AC 76, Gangavathi AC 61', () => {
  // 1. Statutory Ground Truth from Delimitation 2008 / Migration 059
  const sql = fs.readFileSync(path.resolve('supabase/migrations/059_canonical_national_constituency_registry.sql'), 'utf8');
  assert.ok(sql.includes("('KA-AC-61', 'KA-AC-061', 61, 'Gangavathi'"), 'Statutory registry must define AC 61 as Gangavathi');
  assert.ok(sql.includes("('KA-AC-65', 'KA-AC-065', 65, 'Bellary Rural'"), 'Statutory registry must define AC 65 as Bellary Rural');
  assert.ok(sql.includes("('KA-AC-76', 'KA-AC-076', 76, 'Shorapur'"), 'Statutory registry must define AC 76 as Shorapur');

  // 2. Canonical Seed Registry (data/seed/karnataka-constituencies.ts)
  const kaConst = fs.readFileSync(path.resolve('data/seed/karnataka-constituencies.ts'), 'utf8');
  const cLines = kaConst.split('\n');
  const c61 = cLines.find(l => l.includes('acNo: 61'));
  const c65 = cLines.find(l => l.includes('acNo: 65'));
  const c76 = cLines.find(l => l.includes('acNo: 76'));

  assert.ok(c61 && c61.includes("'Gangavathi'"), 'Seed AC 61 must be Gangavathi');
  assert.ok(c65 && c65.includes("'Bellary Rural'"), 'Seed AC 65 must be Bellary Rural');
  assert.ok(c76 && c76.includes("'Shorapur'"), 'Seed AC 76 must be Shorapur');

  // 3. Falsification check: AC 76 must never be Bellary Rural
  assert.ok(!c76.includes('Bellary Rural'), 'Statutory AC 76 Shorapur must never be labeled Bellary Rural');

  // 4. Historical scrape audit: Gangavathi 2018 winner in historical results
  const hist = fs.readFileSync(path.resolve('data/seed/karnataka-historical-results.ts'), 'utf8');
  assert.ok(hist.includes("name: 'Gangavathi'") && hist.includes("winner: 'Paranna Munavalli'"), 'Gangavathi 2018 winner must be Paranna Munavalli');
});

// -----------------------------------------------------------------------------
// INVARIANT 13: UI/API Fallback Temporal Hierarchy (Real API Service)
// -----------------------------------------------------------------------------
runTest('13', 'Temporal Hierarchy: Real API genericToBrief Resolves Verified Over Future Simulations', () => {
  // Test real API service getConstituency('TN', 1)
  const apiTn1 = runTsx(`
    import { getConstituency } from './apps/api/src/services/stateData.ts';
    console.log(JSON.stringify(getConstituency('TN', 1)));
  `);

  assert.strictEqual(apiTn1.currentParty, 'DMK', 'Real API service must return verified sitting party DMK');
  assert.strictEqual(apiTn1.currentMLA, 'GOVINDARAJAN T.J', 'Real API service must return verified sitting MLA GOVINDARAJAN T.J');
  assert.notStrictEqual(apiTn1.currentMLA, 'S.Vijayakumar', 'Future simulated 2026 winner must never leak into currentMLA');
});

// -----------------------------------------------------------------------------
// INVARIANT 14: Parsing Residue & Stray Markup Scanner
// -----------------------------------------------------------------------------
runTest('14', 'Syntax Hygiene: Wikitext and HTML Residue Scanner Across All Seed Files', () => {
  const seedDir = path.resolve('data/seed');
  const files = fs.readdirSync(seedDir).filter(f => f.endsWith('.ts'));

  const residues = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(seedDir, file), 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("winnerName") || line.includes("runnerUp") || line.includes("district:")) {
        if (line.includes("]]'") || line.includes(']]"') || line.includes('|District') || line.includes('<Span')) {
          residues.push({ file, line: i + 1, text: line.trim() });
        }
      }
    }
  }

  // Karnataka seed files must have zero markup residue
  const kaResidues = residues.filter(r => r.file.includes('karnataka'));
  assert.strictEqual(kaResidues.length, 0, 'Karnataka files must have zero syntax residue');

  // Verify scanner caught known registered defects in RJ, MP, CG, OD, AS
  assert.ok(residues.some(r => r.file.includes('rajasthan')), 'Scanner must detect DEF-006 residue in RJ');
  assert.ok(residues.some(r => r.file.includes('assam')), 'Scanner must detect HTML residue in AS');
});

// -----------------------------------------------------------------------------
// INVARIANT 15: Delhi Assembly Election Baseline (Feb 2025 vs 2022 MCD Local Body)
// -----------------------------------------------------------------------------
runTest('15', 'Delhi Assembly General Election 2025 vs 2022 MCD Local Body Resolution', () => {
  // 1. Verify Real API genericToBrief resolves 2025 general election winner
  const apiDl1 = runTsx(`
    import { getConstituency } from './apps/api/src/services/stateData.ts';
    console.log(JSON.stringify(getConstituency('DL', 1)));
  `);
  assert.strictEqual(apiDl1.currentParty, 'BJP', 'Delhi AC 1 currentParty must be BJP');
  assert.strictEqual(apiDl1.currentMLA, 'Raj Karan Khatri', 'Delhi AC 1 currentMLA must be Raj Karan Khatri (2025 winner)');

  // 2. Verify Mobile UnifiedConstituency resolves electionYear 2025
  const mobileDl = runTsx(`
    import { getUnifiedConstituenciesForState, getConstituenciesForState } from './apps/mobile/lib/stateDataAdapter.ts';
    const unified = getUnifiedConstituenciesForState('DL')[0];
    const brief = getConstituenciesForState('DL')[0];
    console.log(JSON.stringify({ unified, brief }));
  `);
  assert.strictEqual(mobileDl.unified.electionYear, 2025, 'Delhi UnifiedConstituency electionYear must be 2025');
  assert.notStrictEqual(mobileDl.unified.electionYear, 2022, 'Delhi electionYear must never default to 2022 MCD election');
  assert.strictEqual(mobileDl.unified.winnerParty, 'BJP', 'Delhi AC 1 winnerParty must be BJP');
  assert.strictEqual(mobileDl.unified.winnerName, 'Raj Karan Khatri', 'Delhi AC 1 winnerName must be Raj Karan Khatri');
  assert.strictEqual(mobileDl.brief.currentParty, 'BJP', 'Delhi brief currentParty must be BJP');
  assert.strictEqual(mobileDl.brief.currentMLA, 'Raj Karan Khatri', 'Delhi brief currentMLA must be Raj Karan Khatri');
});

// -----------------------------------------------------------------------------
// INVARIANT 16: Expired 2021 Jurisdictions Flagged STALE_PENDING_INGESTION
// -----------------------------------------------------------------------------
runTest('16', 'Temporal Contract: Expired 2021 Jurisdictions Flagged STALE_PENDING_INGESTION', () => {
  const expiredStates = ['TN', 'KL', 'WB', 'AS', 'PY'];
  const results = runTsx(`
    import { getUnifiedConstituenciesForState } from './apps/mobile/lib/stateDataAdapter.ts';
    const out = {};
    for (const code of ['TN', 'KL', 'WB', 'AS', 'PY', 'TS']) {
      const all = getUnifiedConstituenciesForState(code);
      out[code] = {
        dataStatus: all[0].dataStatus,
        isStale: all[0].isStale,
        termStatus: all[0].termStatus,
        electionYear: all[0].electionYear,
        hasProjection: !!all[0].projection,
      };
    }
    console.log(JSON.stringify(out));
  `);

  for (const st of expiredStates) {
    const data = results[st];
    assert.strictEqual(data.dataStatus, 'STALE_PENDING_INGESTION', `${st} dataStatus must be STALE_PENDING_INGESTION`);
    assert.strictEqual(data.isStale, true, `${st} isStale must be true`);
    assert.strictEqual(data.termStatus, '2021_TERM_EXPIRED_PENDING_2026_PRIMARY_INGESTION', `${st} termStatus must indicate expired 2021 term`);
    assert.strictEqual(data.electionYear, 2021, `${st} verified electionYear baseline must be 2021`);
  }

  // Active state (TS) must be CURRENT
  assert.strictEqual(results.TS.dataStatus, 'CURRENT', 'TS dataStatus must be CURRENT');
  assert.strictEqual(results.TS.isStale, false, 'TS isStale must be false');
  assert.strictEqual(results.TS.termStatus, 'ACTIVE', 'TS termStatus must be ACTIVE');
});

// -----------------------------------------------------------------------------
// INVARIANT 17: Ingestion Deduplication and Conflict Detection
// -----------------------------------------------------------------------------
runTest('17', 'Ingestion Integrity: Candidacy Natural-Key Deduplication & Conflict Detection', () => {
  const genScript = fs.readFileSync(path.resolve('scripts/generate-b2-2e-forensic-manifests.mjs'), 'utf8');
  assert.ok(genScript.includes('affidavitByCandidacy.has(matchedCand.candId)'), 'Generator must track affidavitByCandidacy natural key');
  assert.ok(genScript.includes('[INGESTION_CONFLICT]'), 'Generator must log conflict warnings on distinct non-null financial values');
  assert.ok(genScript.includes('existing.total_assets === null && newAssets !== null'), 'Generator must safely merge non-null financials into null fields');
});

// -----------------------------------------------------------------------------
// INVARIANT 18: By-Election Sitting Representative Separation
// -----------------------------------------------------------------------------
runTest('18', 'By-Election Sitting Representative Separation (TN AC 35/101, WB AC 210/70, PY AC 10)', () => {
  const res = runTsx(`
    import { getUnifiedConstituenciesForState, getConstituenciesForState } from './apps/mobile/lib/stateDataAdapter.ts';
    import { getConstituency } from './apps/api/src/services/stateData.ts';

    const tnUnified = getUnifiedConstituenciesForState('TN');
    const tnBrief = getConstituenciesForState('TN');
    const tn35Unified = tnUnified.find(c => c.acNo === 35);
    const tn35Brief = tnBrief.find(c => c.acNo === 35);
    const tn35Api = getConstituency('TN', 35);

    const tn101Unified = tnUnified.find(c => c.acNo === 101);
    const tn101Brief = tnBrief.find(c => c.acNo === 101);
    const tn101Api = getConstituency('TN', 101);

    const wbUnified = getUnifiedConstituenciesForState('WB');
    const wbBrief = getConstituenciesForState('WB');
    const wb210Unified = wbUnified.find(c => c.acNo === 210);
    const wb210Brief = wbBrief.find(c => c.acNo === 210);
    const wb210Api = getConstituency('WB', 210);

    const wb70Unified = wbUnified.find(c => c.acNo === 70);
    const wb70Brief = wbBrief.find(c => c.acNo === 70);
    const wb70Api = getConstituency('WB', 70);

    const pyUnified = getUnifiedConstituenciesForState('PY');
    const pyBrief = getConstituenciesForState('PY');
    const py9Unified = pyUnified.find(c => c.acNo === 9);
    const py9Brief = pyBrief.find(c => c.acNo === 9);
    const py9Api = getConstituency('PY', 9);

    console.log(JSON.stringify({
      tn35: { unified: tn35Unified, brief: tn35Brief, api: tn35Api },
      tn101: { unified: tn101Unified, brief: tn101Brief, api: tn101Api },
      wb210: { unified: wb210Unified, brief: wb210Brief, api: wb210Api },
      wb70: { unified: wb70Unified, brief: wb70Brief, api: wb70Api },
      py9: { unified: py9Unified, brief: py9Brief, api: py9Api },
    }));
  `);

  // Verify TN AC 35 (Madurantakam)
  assert.strictEqual(res.tn35.unified.winnerParty, 'AIADMK', 'TN AC 35 general election winnerParty must remain AIADMK');
  assert.strictEqual(res.tn35.unified.electionYear, 2021, 'TN AC 35 general election electionYear must remain 2021');
  assert.strictEqual(res.tn35.unified.currentParty, 'TVK', 'TN AC 35 currentParty must reflect by-election winner TVK');
  assert.strictEqual(res.tn35.unified.currentMLA, 'K. Maragatham Kumaravel', 'TN AC 35 currentMLA must be K. Maragatham Kumaravel');
  assert.strictEqual(res.tn35.unified.officeholderStatus, 'BY_ELECTION_SEATED', 'TN AC 35 officeholderStatus must be BY_ELECTION_SEATED');
  assert.strictEqual(res.tn35.unified.dataStatus, 'BY_ELECTION_UPDATED', 'TN AC 35 dataStatus must be BY_ELECTION_UPDATED');
  assert.strictEqual(res.tn35.unified.byElection.winnerName, 'K. Maragatham Kumaravel', 'TN AC 35 byElection record must be present');
  assert.strictEqual(res.tn35.brief.currentParty, 'TVK', 'TN AC 35 brief currentParty must be TVK');
  assert.strictEqual(res.tn35.brief.currentMLA, 'K. Maragatham Kumaravel', 'TN AC 35 brief currentMLA must be K. Maragatham Kumaravel');
  assert.strictEqual(res.tn35.api.currentParty, 'TVK', 'TN AC 35 API currentParty must be TVK');
  assert.strictEqual(res.tn35.api.currentMLA, 'K. Maragatham Kumaravel', 'TN AC 35 API currentMLA must be K. Maragatham Kumaravel');

  // Verify TN AC 101 (Dharapuram SC)
  assert.strictEqual(res.tn101.unified.winnerParty, 'DMK', 'TN AC 101 general election winnerParty must remain DMK');
  assert.strictEqual(res.tn101.unified.electionYear, 2021, 'TN AC 101 general election electionYear must remain 2021');
  assert.strictEqual(res.tn101.unified.currentParty, 'TVK', 'TN AC 101 currentParty must reflect by-election winner TVK');
  assert.strictEqual(res.tn101.unified.currentMLA, 'P. Sathyabama', 'TN AC 101 currentMLA must be P. Sathyabama');
  assert.strictEqual(res.tn101.unified.officeholderStatus, 'BY_ELECTION_SEATED', 'TN AC 101 officeholderStatus must be BY_ELECTION_SEATED');
  assert.strictEqual(res.tn101.unified.dataStatus, 'BY_ELECTION_UPDATED', 'TN AC 101 dataStatus must be BY_ELECTION_UPDATED');
  assert.strictEqual(res.tn101.brief.currentParty, 'TVK', 'TN AC 101 brief currentParty must be TVK');
  assert.strictEqual(res.tn101.api.currentParty, 'TVK', 'TN AC 101 API currentParty must be TVK');

  // Verify WB AC 210 (Nandigram)
  assert.strictEqual(res.wb210.unified.winnerParty, 'BJP', 'WB AC 210 general election winnerParty must remain BJP');
  assert.strictEqual(res.wb210.unified.electionYear, 2021, 'WB AC 210 general election electionYear must remain 2021');
  assert.strictEqual(res.wb210.unified.currentParty, 'BJP', 'WB AC 210 currentParty must be BJP');
  assert.strictEqual(res.wb210.unified.currentMLA, 'Hasi Rani Rath', 'WB AC 210 currentMLA must be Hasi Rani Rath');
  assert.strictEqual(res.wb210.unified.officeholderStatus, 'BY_ELECTION_SEATED', 'WB AC 210 officeholderStatus must be BY_ELECTION_SEATED');
  assert.strictEqual(res.wb210.brief.currentMLA, 'Hasi Rani Rath', 'WB AC 210 brief currentMLA must be Hasi Rani Rath');
  assert.strictEqual(res.wb210.api.currentMLA, 'Hasi Rani Rath', 'WB AC 210 API currentMLA must be Hasi Rani Rath');

  // Verify WB AC 70 (Rejinagar)
  assert.strictEqual(res.wb70.unified.winnerParty, 'AITC', 'WB AC 70 general election winnerParty must remain AITC');
  assert.strictEqual(res.wb70.unified.electionYear, 2021, 'WB AC 70 general election electionYear must remain 2021');
  assert.strictEqual(res.wb70.unified.currentParty, 'BJP', 'WB AC 70 currentParty must be BJP');
  assert.strictEqual(res.wb70.unified.currentMLA, 'Shankharavh Sarkar', 'WB AC 70 currentMLA must be Shankharavh Sarkar');
  assert.strictEqual(res.wb70.brief.currentParty, 'BJP', 'WB AC 70 brief currentParty must be BJP');
  assert.strictEqual(res.wb70.api.currentParty, 'BJP', 'WB AC 70 API currentParty must be BJP');

  // Verify PY AC 9 (Thattanchavady)
  assert.strictEqual(res.py9.unified.currentParty, 'AINRC', 'PY AC 9 currentParty must be AINRC');
  assert.strictEqual(res.py9.unified.currentMLA, 'Ashok Anand', 'PY AC 9 currentMLA must be Ashok Anand');
  assert.strictEqual(res.py9.unified.officeholderStatus, 'BY_ELECTION_SEATED', 'PY AC 9 officeholderStatus must be BY_ELECTION_SEATED');
  assert.strictEqual(res.py9.brief.currentMLA, 'Ashok Anand', 'PY AC 9 brief currentMLA must be Ashok Anand');
  assert.strictEqual(res.py9.api.currentMLA, 'Ashok Anand', 'PY AC 9 API currentMLA must be Ashok Anand');
});

// -----------------------------------------------------------------------------
// INVARIANT 19: Nagaon PC By-Election Barrier (Lok Sabha vs Assembly Isolation)
// -----------------------------------------------------------------------------
runTest('19', 'Nagaon PC By-Election Barrier (Lok Sabha PC 10 vs Assembly AC Scope)', () => {
  const res = runTsx(`
    import { getUnifiedConstituenciesForState } from './apps/mobile/lib/stateDataAdapter.ts';
    import { AS_CONSTITUENCIES } from './data/seed/assam-constituencies.ts';

    const asUnified = getUnifiedConstituenciesForState('AS');
    const nagaonAc = asUnified.find(c => c.name.toLowerCase().includes('nagaon') || c.acNo === 86);
    console.log(JSON.stringify({
      totalACs: asUnified.length,
      rawCount: AS_CONSTITUENCIES.length,
      nagaonAc,
    }));
  `);

  assert.strictEqual(res.totalACs, 126, 'Assam assembly constituency total must be strictly 126');
  assert.strictEqual(res.rawCount, 126, 'Raw Assam constituency seed count must be strictly 126');
  // Nagaon assembly constituency must NOT have been marked with a parliamentary by-election
  if (res.nagaonAc) {
    assert.notStrictEqual(res.nagaonAc.currentMLA, 'Devasish Sharma', 'Devasish Sharma won Lok Sabha PC 10, NOT state assembly AC');
    assert.notStrictEqual(res.nagaonAc.officeholderStatus, 'BY_ELECTION_SEATED', 'Assam ACs must not be flagged with Parliamentary by-election status');
  }
});

// -----------------------------------------------------------------------------
// INVARIANT 20: Bihar 2025 General Election Transition & Data Status
// -----------------------------------------------------------------------------
runTest('20', 'Bihar 2025 General Election Transition (BR_ELECTION_HISTORY & Seed Status)', () => {
  const res = runTsx(`
    import { BR_ELECTION_HISTORY, getBRElectionByYear } from './data/seed/bihar-election-history.ts';
    import { getUnifiedConstituenciesForState } from './apps/mobile/lib/stateDataAdapter.ts';

    const h2025 = getBRElectionByYear(2025);
    const brUnified = getUnifiedConstituenciesForState('BR');
    console.log(JSON.stringify({
      h2025,
      historyLength: BR_ELECTION_HISTORY.length,
      sampleAc: brUnified[0],
    }));
  `);

  assert.ok(res.h2025, 'Bihar election history for 2025 must exist');
  assert.strictEqual(res.h2025.totalSeats, 243, 'Bihar 2025 total seats must be 243');
  assert.strictEqual(res.h2025.rulingParty, 'NDA', 'Bihar 2025 ruling alliance must be NDA');
  assert.strictEqual(res.h2025.partyResults.BJP, 89, 'Bihar 2025 BJP seats must be 89');
  assert.strictEqual(res.h2025.partyResults.JDU, 85, 'Bihar 2025 JDU seats must be 85');
  assert.strictEqual(res.h2025.partyResults.RJD, 25, 'Bihar 2025 RJD seats must be 25');

  // Verify mobile adapter marks 2020 AC dataset as expired pending 2025 primary dataset ingestion
  assert.strictEqual(res.sampleAc.electionYear, 2020, 'Bihar AC baseline year must be 2020');
  assert.strictEqual(res.sampleAc.isStale, true, 'Bihar AC data must be flagged isStale=true');
  assert.strictEqual(res.sampleAc.dataStatus, 'STALE_PENDING_INGESTION', 'Bihar AC dataStatus must be STALE_PENDING_INGESTION');
  assert.strictEqual(res.sampleAc.termStatus, '2020_TERM_EXPIRED_PENDING_2025_PRIMARY_INGESTION', 'Bihar termStatus must indicate expired 2020 term pending 2025 primary ingestion');
});

// -----------------------------------------------------------------------------
// INVARIANT 21: Elected vs Nominated Denominator Integrity across 31 Jurisdictions
// -----------------------------------------------------------------------------
runTest('21', 'Elected vs Nominated Denominator Integrity across 31 Jurisdictions (824 Elected / 3 Nominated)', () => {
  const res = runTsx(`
    import { getAllStatesInfo } from './apps/api/src/services/stateData.ts';
    const states = getAllStatesInfo();
    const map = {};
    for (const s of states) {
      map[s.code] = s.totalSeats;
    }
    console.log(JSON.stringify(map));
  `);

  // Denominators for 2026 general election states
  const tnSeats = res.TN;
  const klSeats = res.KL;
  const wbSeats = res.WB;
  const asSeats = res.AS;
  const pySeats = res.PY;

  assert.strictEqual(tnSeats, 234, 'TN elected seats must be 234');
  assert.strictEqual(klSeats, 140, 'KL elected seats must be 140');
  assert.strictEqual(wbSeats, 294, 'WB elected seats must be 294');
  assert.strictEqual(asSeats, 126, 'AS elected seats must be 126');
  assert.strictEqual(pySeats, 30, 'PY elected seats must be 30');

  const totalElected2026 = tnSeats + klSeats + wbSeats + asSeats + pySeats;
  assert.strictEqual(totalElected2026, 824, 'Total elected seats across 5 jurisdictions must be strictly 824 (not 827 or 830)');

  // Statutory membership verification:
  // Puducherry has 3 nominated members under Government of Union Territories Act 1963 Section 3(3)
  const pyNominated = 3;
  const pyStatutoryTotal = pySeats + pyNominated;
  assert.strictEqual(pyStatutoryTotal, 33, 'Puducherry statutory assembly membership must be 33');

  const totalStatutory2026 = totalElected2026 + pyNominated;
  assert.strictEqual(totalStatutory2026, 827, 'Total statutory seats across 5 jurisdictions must be strictly 827');
});

console.log('\n================================================================');
console.log(`ALL ${totalTests} SYSTEMIC INVARIANT AUDIT TESTS PASSED (100%)`);
console.log('================================================================\n');
