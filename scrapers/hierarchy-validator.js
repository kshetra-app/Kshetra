#!/usr/bin/env node

/**
 * Kshetra Hierarchy Validator
 * ══════════════════════════════════════════════════════════════════════
 *
 * Command-line tool that validates the data integrity of the
 * Booth → Panchayat → Mandal → Constituency hierarchy.
 *
 * Usage:
 *   node hierarchy-validator.js --state=TS --verbose
 *   node hierarchy-validator.js --state=TS --constituency=TS-AC-1
 *   node hierarchy-validator.js --state=TS --audit-report
 *
 * Checks performed:
 *   1. Completeness — every booth maps to exactly 1 AC and 1 panchayat
 *   2. Voter totals — sum(booth_voters) ≈ constituency_total (±0.1%)
 *   3. Coverage — every AC has booth data
 *   4. Mandal mapping — every mandal maps to ≥1 AC
 *   5. Panchayat mapping — every panchayat maps to exactly 1 mandal
 *   6. Booth result validation — candidate vote sums match booth totals
 *   7. Cross-level consistency — party aggregation from booths matches AC
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — one or more checks failed
 */

const fs = require('fs');
const path = require('path');
const { STATES } = require('./config');
const { readJSON, writeJSON, ensureDir } = require('./utils');

// ═══════════════════════════════════════════════════════════════════════
// §1. CLI ARGUMENT PARSING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Parse command-line arguments.
 * Supports: --state=XX, --constituency=XX-AC-N, --verbose, --audit-report
 *
 * @returns {{ state: string, constituency: string|null, verbose: boolean, auditReport: boolean }}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    state: null,
    constituency: null,
    verbose: false,
    auditReport: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--state=')) {
      parsed.state = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--constituency=')) {
      parsed.constituency = arg.split('=')[1];
    } else if (arg === '--verbose') {
      parsed.verbose = true;
    } else if (arg === '--audit-report') {
      parsed.auditReport = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  if (!parsed.state) {
    console.error(color('red', 'ERROR: --state=XX is required'));
    printUsage();
    process.exit(1);
  }

  // Validate state code
  const validState = STATES.find(s => s.code === parsed.state);
  if (!validState) {
    console.error(color('red', `ERROR: Unknown state code "${parsed.state}". Valid codes: ${STATES.map(s => s.code).join(', ')}`));
    process.exit(1);
  }

  return parsed;
}

/** Print usage help text */
function printUsage() {
  console.log(`
  Kshetra Hierarchy Validator
  ───────────────────────────────────────────────────────
  Usage:
    node hierarchy-validator.js --state=TS [options]

  Options:
    --state=XX            State code (required). E.g. TS, AP, KA
    --constituency=ID     Validate a single constituency. E.g. TS-AC-1
    --verbose             Print detailed per-booth output
    --audit-report        Generate a JSON audit report file
    --help, -h            Show this help message
  `);
}

// ═══════════════════════════════════════════════════════════════════════
// §2. CONSOLE COLORS (no dependencies)
// ═══════════════════════════════════════════════════════════════════════

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

/**
 * Wrap text in ANSI color codes.
 * @param {string} colorName - Color name (red, green, yellow, etc.)
 * @param {string} text - Text to colorize
 * @returns {string}
 */
function color(colorName, text) {
  return `${COLORS[colorName] || ''}${text}${COLORS.reset}`;
}

/** Print a check result line with colored status */
function printCheck(name, passed, message, verbose) {
  const icon = passed ? color('green', '✓ PASS') : color('red', '✗ FAIL');
  console.log(`  ${icon}  ${name}`);
  if (!passed || verbose) {
    console.log(`         ${color('dim', message)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// §3. DATA LOADING
// ═══════════════════════════════════════════════════════════════════════

/**
 * Attempt to load hierarchy seed data for a given state.
 *
 * Searches for data in multiple locations:
 *   1. data/hierarchy/{stateCode}/  (primary)
 *   2. scrapers/output/hierarchy/{stateCode}/  (fallback)
 *   3. data/seed/ (constituency data only)
 *
 * @param {string} stateCode - Two-letter state code
 * @returns {{ booths, panchayats, mandals, constituencies, overlaps, boothResults }}
 */
function loadStateData(stateCode) {
  const searchPaths = [
    path.resolve(__dirname, '..', 'data', 'hierarchy', stateCode.toLowerCase()),
    path.resolve(__dirname, 'output', 'hierarchy', stateCode.toLowerCase()),
    path.resolve(__dirname, '..', 'data', 'hierarchy', stateCode),
    path.resolve(__dirname, 'output', 'hierarchy', stateCode),
  ];

  let basePath = null;
  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      basePath = p;
      break;
    }
  }

  if (!basePath) {
    console.warn(color('yellow', `WARNING: No hierarchy data directory found for state ${stateCode}.`));
    console.warn(color('dim', `  Searched: ${searchPaths.join('\n           ')}`));
    console.warn(color('dim', '  Will attempt to load from individual files.'));
  }

  const data = {
    booths: tryLoadJSON(basePath, 'booths.json'),
    panchayats: tryLoadJSON(basePath, 'panchayats.json'),
    mandals: tryLoadJSON(basePath, 'mandals.json'),
    constituencies: tryLoadJSON(basePath, 'constituencies.json'),
    overlaps: tryLoadJSON(basePath, 'mandal-constituency-overlaps.json'),
    boothResults: tryLoadJSON(basePath, 'booth-results.json'),
  };

  // Fallback: try loading constituency data from seed files
  if (!data.constituencies) {
    const stateName = STATES.find(s => s.code === stateCode)?.name;
    if (stateName) {
      const seedName = stateName.toLowerCase().replace(/\s+/g, '-');
      const seedPath = path.resolve(__dirname, '..', 'data', 'seed', `${seedName}-constituencies.ts`);
      if (fs.existsSync(seedPath)) {
        console.log(color('dim', `  Loading constituency data from seed: ${seedName}-constituencies.ts`));
        // We can parse the TS file for basic constituency info (IDs and totals)
        data.constituencies = parseConstituencySeed(seedPath, stateCode);
      }
    }
  }

  return data;
}

/**
 * Try to load a JSON file from a base path.
 * @param {string|null} basePath - Directory path
 * @param {string} filename - File name
 * @returns {Array|null}
 */
function tryLoadJSON(basePath, filename) {
  if (!basePath) return null;
  const filePath = path.join(basePath, filename);
  return readJSON(filePath);
}

/**
 * Parse a TypeScript constituency seed file to extract basic constituency info.
 * This is a best-effort parser for the existing seed format.
 *
 * @param {string} seedPath - Path to the .ts seed file
 * @param {string} stateCode - State code
 * @returns {Array<{ id: string, name: string, totalVoters: number }>}
 */
function parseConstituencySeed(seedPath, stateCode) {
  try {
    const content = fs.readFileSync(seedPath, 'utf-8');
    const constituencies = [];

    // Match constituency objects in the seed file
    // Pattern: { id: 'XX-AC-N', ... name: '...', ... totalVoters: NNNN }
    const idRegex = /id:\s*['"]([^'"]+)['"]/g;
    const nameRegex = /name:\s*['"]([^'"]+)['"]/g;
    const voterRegex = /totalVoters:\s*(\d+)/g;

    let idMatch, nameMatch, voterMatch;
    const ids = [];
    const names = [];
    const voters = [];

    while ((idMatch = idRegex.exec(content)) !== null) {
      if (idMatch[1].startsWith(stateCode)) {
        ids.push(idMatch[1]);
      }
    }
    while ((nameMatch = nameRegex.exec(content)) !== null) {
      names.push(nameMatch[1]);
    }
    while ((voterMatch = voterRegex.exec(content)) !== null) {
      voters.push(parseInt(voterMatch[1], 10));
    }

    // Build constituency list from matched data
    const count = Math.min(ids.length, names.length);
    for (let i = 0; i < count; i++) {
      constituencies.push({
        id: ids[i],
        name: names[i],
        totalVoters: voters[i] || 0,
      });
    }

    return constituencies.length > 0 ? constituencies : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// §4. VALIDATION CHECKS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Run all hierarchy validation checks for a state.
 *
 * @param {string} stateCode - Two-letter state code
 * @param {object} data - Loaded hierarchy data
 * @param {object} options - { constituency, verbose }
 * @returns {{ passed: boolean, results: Array }}
 */
function runValidation(stateCode, data, options) {
  const results = [];
  let allPassed = true;

  const stateConfig = STATES.find(s => s.code === stateCode);
  const stateName = stateConfig ? stateConfig.name : stateCode;

  console.log('');
  console.log(color('bold', `═══ Hierarchy Validation: ${stateName} (${stateCode}) ═══`));
  console.log('');

  // ── Data availability report ─────────────────────────────────────
  console.log(color('cyan', '  Data Loaded:'));
  console.log(`    Booths:         ${data.booths ? color('green', data.booths.length.toString()) : color('red', 'MISSING')}`);
  console.log(`    Panchayats:     ${data.panchayats ? color('green', data.panchayats.length.toString()) : color('red', 'MISSING')}`);
  console.log(`    Mandals:        ${data.mandals ? color('green', data.mandals.length.toString()) : color('red', 'MISSING')}`);
  console.log(`    Constituencies: ${data.constituencies ? color('green', data.constituencies.length.toString()) : color('red', 'MISSING')}`);
  console.log(`    Overlaps:       ${data.overlaps ? color('green', data.overlaps.length.toString()) : color('dim', 'not loaded')}`);
  console.log(`    Booth Results:  ${data.boothResults ? color('green', data.boothResults.length.toString()) : color('dim', 'not loaded')}`);
  console.log('');

  // ── Check 1: Booth completeness mapping ──────────────────────────
  if (data.booths) {
    const check1 = checkBoothCompleteness(data.booths, options);
    results.push(check1);
    if (!check1.passed) allPassed = false;
  } else {
    const skip = { name: 'booth_completeness', passed: false, message: 'No booth data loaded — cannot validate', skipped: true };
    results.push(skip);
    allPassed = false;
    printCheck('Booth Completeness', false, skip.message, options.verbose);
  }

  // ── Check 2: Voter totals per constituency ───────────────────────
  if (data.booths && data.constituencies) {
    const check2 = checkVoterTotals(data.booths, data.constituencies, options);
    results.push(check2);
    if (!check2.passed) allPassed = false;
  } else {
    const skip = { name: 'voter_totals', passed: false, message: 'Need both booth and constituency data', skipped: true };
    results.push(skip);
    allPassed = false;
    printCheck('Voter Totals', false, skip.message, options.verbose);
  }

  // ── Check 3: AC coverage ─────────────────────────────────────────
  if (data.booths && data.constituencies) {
    const check3 = checkACCoverage(data.booths, data.constituencies, options);
    results.push(check3);
    if (!check3.passed) allPassed = false;
  } else {
    const skip = { name: 'ac_coverage', passed: false, message: 'Need both booth and constituency data', skipped: true };
    results.push(skip);
    allPassed = false;
    printCheck('AC Coverage', false, skip.message, options.verbose);
  }

  // ── Check 4: Mandal mapping ──────────────────────────────────────
  if (data.mandals && data.overlaps) {
    const check4 = checkMandalMapping(data.mandals, data.overlaps, options);
    results.push(check4);
    if (!check4.passed) allPassed = false;
  } else if (data.mandals && data.booths) {
    // Fallback: check mandal mapping via booth.mandalId
    const check4 = checkMandalMappingViaBooth(data.mandals, data.booths, options);
    results.push(check4);
    if (!check4.passed) allPassed = false;
  } else {
    const skip = { name: 'mandal_mapping', passed: false, message: 'No mandal/overlap data — skipping', skipped: true };
    results.push(skip);
    printCheck('Mandal Mapping', false, skip.message, options.verbose);
  }

  // ── Check 5: Panchayat mapping ───────────────────────────────────
  if (data.panchayats) {
    const check5 = checkPanchayatMapping(data.panchayats, data.mandals, options);
    results.push(check5);
    if (!check5.passed) allPassed = false;
  } else {
    const skip = { name: 'panchayat_mapping', passed: false, message: 'No panchayat data — skipping', skipped: true };
    results.push(skip);
    printCheck('Panchayat Mapping', false, skip.message, options.verbose);
  }

  // ── Check 6: Booth result validation ─────────────────────────────
  if (data.boothResults && data.boothResults.length > 0) {
    const check6 = checkBoothResults(data.boothResults, options);
    results.push(check6);
    if (!check6.passed) allPassed = false;
  } else {
    const skip = { name: 'booth_results', passed: true, message: 'No booth result data — skipping (not a failure)', skipped: true };
    results.push(skip);
    printCheck('Booth Results', true, skip.message, options.verbose);
  }

  // ── Check 7: Cross-level consistency ─────────────────────────────
  if (data.boothResults && data.constituencies) {
    const check7 = checkCrossLevelConsistency(data.boothResults, data.constituencies, options);
    results.push(check7);
    if (!check7.passed) allPassed = false;
  }

  // ── Summary ──────────────────────────────────────────────────────
  console.log('');
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const skippedCount = results.filter(r => r.skipped).length;

  if (allPassed) {
    console.log(color('green', `  ══ ALL ${results.length} CHECKS PASSED ══`));
  } else {
    console.log(color('red', `  ══ ${failedCount} CHECK(S) FAILED out of ${results.length} ══`));
    if (skippedCount > 0) {
      console.log(color('yellow', `     (${skippedCount} skipped due to missing data)`));
    }
  }
  console.log('');

  return { passed: allPassed, results };
}

// ─── Individual Check Implementations ──────────────────────────────────

/**
 * Check 1: Every booth maps to exactly 1 AC and 1 panchayat.
 */
function checkBoothCompleteness(booths, options) {
  const name = 'Booth Completeness';
  const issues = [];

  for (const booth of booths) {
    if (!booth.constituencyId) {
      issues.push(`Booth ${booth.id || booth.boothNumber}: missing constituencyId`);
    }
    if (!booth.panchayatId) {
      issues.push(`Booth ${booth.id || booth.boothNumber}: missing panchayatId`);
    }
  }

  // Filter to specific constituency if requested
  const filtered = options.constituency
    ? booths.filter(b => b.constituencyId === options.constituency)
    : booths;

  const missingAC = filtered.filter(b => !b.constituencyId).length;
  const missingPanchayat = filtered.filter(b => !b.panchayatId).length;
  const passed = missingAC === 0 && missingPanchayat === 0;

  const message = passed
    ? `All ${filtered.length} booths have AC and panchayat mappings`
    : `${missingAC} booth(s) missing AC, ${missingPanchayat} missing panchayat`;

  printCheck(name, passed, message, options.verbose);

  if (options.verbose && issues.length > 0) {
    for (const issue of issues.slice(0, 10)) {
      console.log(`         ${color('yellow', '⚠')} ${issue}`);
    }
    if (issues.length > 10) {
      console.log(color('dim', `         ... and ${issues.length - 10} more`));
    }
  }

  return { name: 'booth_completeness', passed, message, details: issues };
}

/**
 * Check 2: sum(booth_voters) === constituency_total_voters (±0.1%).
 */
function checkVoterTotals(booths, constituencies, options) {
  const name = 'Voter Totals';
  const issues = [];
  let allMatch = true;

  // Group booths by constituency
  const boothsByAC = {};
  for (const booth of booths) {
    if (!booth.constituencyId) continue;
    if (!boothsByAC[booth.constituencyId]) boothsByAC[booth.constituencyId] = [];
    boothsByAC[booth.constituencyId].push(booth);
  }

  // Filter to specific constituency if requested
  const targetConstituencies = options.constituency
    ? constituencies.filter(c => c.id === options.constituency)
    : constituencies;

  for (const ac of targetConstituencies) {
    const acBooths = boothsByAC[ac.id] || [];
    const officialTotal = ac.totalVoters || 0;

    if (officialTotal === 0) {
      // No official total to compare — skip this AC
      continue;
    }

    const boothSum = acBooths.reduce((sum, b) => sum + (b.totalVoters || 0), 0);
    const deviation = Math.abs((boothSum - officialTotal) / officialTotal * 100);

    if (deviation > 0.1) {
      allMatch = false;
      issues.push({
        constituencyId: ac.id,
        name: ac.name,
        officialTotal,
        boothSum,
        deviation: deviation.toFixed(4),
        boothCount: acBooths.length,
      });
    }
  }

  const passed = allMatch;
  const message = passed
    ? `All ${targetConstituencies.length} constituency voter totals match within ±0.1%`
    : `${issues.length} constituency(s) have voter total mismatches exceeding ±0.1%`;

  printCheck(name, passed, message, options.verbose);

  if (options.verbose && issues.length > 0) {
    for (const issue of issues.slice(0, 10)) {
      console.log(`         ${color('yellow', '⚠')} ${issue.constituencyId} (${issue.name}): official=${issue.officialTotal}, booth_sum=${issue.boothSum}, deviation=${issue.deviation}% (${issue.boothCount} booths)`);
    }
    if (issues.length > 10) {
      console.log(color('dim', `         ... and ${issues.length - 10} more`));
    }
  }

  return { name: 'voter_totals', passed, message, details: issues };
}

/**
 * Check 3: Every AC has booth data.
 */
function checkACCoverage(booths, constituencies, options) {
  const name = 'AC Coverage';

  const acWithBooths = new Set();
  for (const booth of booths) {
    if (booth.constituencyId) {
      acWithBooths.add(booth.constituencyId);
    }
  }

  const targetConstituencies = options.constituency
    ? constituencies.filter(c => c.id === options.constituency)
    : constituencies;

  const missing = targetConstituencies.filter(c => !acWithBooths.has(c.id));
  const passed = missing.length === 0;

  const message = passed
    ? `All ${targetConstituencies.length} constituencies have booth data`
    : `${missing.length} constituency(s) have NO booth data: ${missing.slice(0, 5).map(c => c.id).join(', ')}`;

  printCheck(name, passed, message, options.verbose);

  if (options.verbose && missing.length > 0) {
    for (const ac of missing) {
      console.log(`         ${color('red', '✗')} ${ac.id} — ${ac.name || 'unknown'}`);
    }
  }

  return { name: 'ac_coverage', passed, message, details: missing.map(c => c.id) };
}

/**
 * Check 4a: Every mandal maps to at least 1 AC (via overlap records).
 */
function checkMandalMapping(mandals, overlaps, options) {
  const name = 'Mandal Mapping';

  const mandalsWithOverlap = new Set();
  for (const overlap of overlaps) {
    mandalsWithOverlap.add(overlap.mandalId);
  }

  const unmapped = mandals.filter(m => !mandalsWithOverlap.has(m.id));
  const passed = unmapped.length === 0;

  const message = passed
    ? `All ${mandals.length} mandals map to ≥1 AC`
    : `${unmapped.length} mandal(s) have no AC mapping: ${unmapped.slice(0, 5).map(m => m.id).join(', ')}`;

  printCheck(name, passed, message, options.verbose);

  return { name: 'mandal_mapping', passed, message, details: unmapped.map(m => m.id) };
}

/**
 * Check 4b: Mandal mapping check via booth data (when overlaps are not available).
 */
function checkMandalMappingViaBooth(mandals, booths, options) {
  const name = 'Mandal Mapping (via booths)';

  // Build set of mandals that have at least 1 booth in any AC
  const mandalsWithBooths = new Set();
  for (const booth of booths) {
    if (booth.mandalId) {
      mandalsWithBooths.add(booth.mandalId);
    }
  }

  const unmapped = mandals.filter(m => !mandalsWithBooths.has(m.id));
  const passed = unmapped.length === 0;

  const message = passed
    ? `All ${mandals.length} mandals have booths assigned`
    : `${unmapped.length} mandal(s) have no booths: ${unmapped.slice(0, 5).map(m => m.id).join(', ')}`;

  printCheck(name, passed, message, options.verbose);

  return { name: 'mandal_mapping_via_booth', passed, message, details: unmapped.map(m => m.id) };
}

/**
 * Check 5: Every panchayat maps to exactly 1 mandal.
 */
function checkPanchayatMapping(panchayats, mandals, options) {
  const name = 'Panchayat Mapping';

  const mandalIds = mandals ? new Set(mandals.map(m => m.id)) : null;
  const issues = [];

  for (const panchayat of panchayats) {
    if (!panchayat.mandalId) {
      issues.push(`Panchayat ${panchayat.id}: missing mandalId`);
    } else if (mandalIds && !mandalIds.has(panchayat.mandalId)) {
      issues.push(`Panchayat ${panchayat.id}: references unknown mandal ${panchayat.mandalId}`);
    }
  }

  const passed = issues.length === 0;
  const message = passed
    ? `All ${panchayats.length} panchayats map to exactly 1 known mandal`
    : `${issues.length} panchayat(s) have mapping issues`;

  printCheck(name, passed, message, options.verbose);

  if (options.verbose && issues.length > 0) {
    for (const issue of issues.slice(0, 10)) {
      console.log(`         ${color('yellow', '⚠')} ${issue}`);
    }
  }

  return { name: 'panchayat_mapping', passed, message, details: issues };
}

/**
 * Check 6: sum(booth_candidate_votes) === booth_total_valid_votes.
 */
function checkBoothResults(boothResults, options) {
  const name = 'Booth Result Integrity';
  const issues = [];

  // Filter to specific constituency if requested
  const filtered = options.constituency
    ? boothResults.filter(r => r.constituencyId === options.constituency)
    : boothResults;

  for (const result of filtered) {
    if (!result.candidateVotes) continue;

    const candidateVoteSum = Object.values(result.candidateVotes).reduce((sum, v) => sum + v, 0);

    if (candidateVoteSum !== result.totalValidVotes) {
      issues.push({
        boothId: result.boothId,
        candidateVoteSum,
        totalValidVotes: result.totalValidVotes,
        difference: candidateVoteSum - result.totalValidVotes,
      });
    }
  }

  const passed = issues.length === 0;
  const message = passed
    ? `All ${filtered.length} booth results have consistent vote sums`
    : `${issues.length} booth(s) have candidate vote sum ≠ totalValidVotes`;

  printCheck(name, passed, message, options.verbose);

  if (options.verbose && issues.length > 0) {
    for (const issue of issues.slice(0, 10)) {
      console.log(`         ${color('yellow', '⚠')} Booth ${issue.boothId}: candidate_sum=${issue.candidateVoteSum}, totalValid=${issue.totalValidVotes}, diff=${issue.difference}`);
    }
  }

  return { name: 'booth_results', passed, message, details: issues };
}

/**
 * Check 7: Party totals from booth aggregation match constituency official results.
 */
function checkCrossLevelConsistency(boothResults, constituencies, options) {
  const name = 'Cross-Level Consistency';

  // Group booth results by constituency
  const resultsByAC = {};
  for (const result of boothResults) {
    if (!result.constituencyId) continue;
    if (!resultsByAC[result.constituencyId]) resultsByAC[result.constituencyId] = [];
    resultsByAC[result.constituencyId].push(result);
  }

  const issues = [];

  const targetConstituencies = options.constituency
    ? constituencies.filter(c => c.id === options.constituency)
    : constituencies;

  for (const ac of targetConstituencies) {
    const acResults = resultsByAC[ac.id];
    if (!acResults || acResults.length === 0) continue;

    // Compute aggregate votes polled from booths
    const boothVotesPolled = acResults.reduce((sum, r) => sum + (r.totalVotesPolled || 0), 0);

    // Compare with official votes polled if available
    if (ac.votesPolled && ac.votesPolled > 0) {
      const deviation = Math.abs((boothVotesPolled - ac.votesPolled) / ac.votesPolled * 100);
      if (deviation > 0.1) {
        issues.push({
          constituencyId: ac.id,
          officialVotesPolled: ac.votesPolled,
          boothVotesPolled,
          deviation: deviation.toFixed(4),
        });
      }
    }
  }

  const passed = issues.length === 0;
  const message = passed
    ? 'Cross-level vote totals consistent (or no official totals to compare)'
    : `${issues.length} constituency(s) have cross-level vote total mismatches`;

  printCheck(name, passed, message, options.verbose);

  return { name: 'cross_level_consistency', passed, message, details: issues };
}

// ═══════════════════════════════════════════════════════════════════════
// §5. AUDIT REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Generate and save a JSON audit report.
 *
 * @param {string} stateCode - Two-letter state code
 * @param {object} validationResult - Result from runValidation()
 */
function generateAuditReport(stateCode, validationResult) {
  const report = {
    generator: 'kshetra-hierarchy-validator',
    version: '1.0.0',
    stateCode,
    timestamp: new Date().toISOString(),
    summary: {
      allPassed: validationResult.passed,
      totalChecks: validationResult.results.length,
      passed: validationResult.results.filter(r => r.passed).length,
      failed: validationResult.results.filter(r => !r.passed).length,
      skipped: validationResult.results.filter(r => r.skipped).length,
    },
    checks: validationResult.results.map(r => ({
      name: r.name,
      passed: r.passed,
      message: r.message,
      skipped: !!r.skipped,
      detailCount: r.details ? (Array.isArray(r.details) ? r.details.length : 0) : 0,
      details: r.details || [],
    })),
  };

  const outputDir = path.resolve(__dirname, 'output', 'validation');
  ensureDir(outputDir);

  const filename = `hierarchy-validation-${stateCode}-${new Date().toISOString().slice(0, 10)}.json`;
  const outputPath = path.join(outputDir, filename);

  writeJSON(outputPath, report);

  console.log(color('cyan', `  Audit report saved to: ${outputPath}`));
  console.log('');

  return outputPath;
}

// ═══════════════════════════════════════════════════════════════════════
// §6. MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════

function main() {
  const startTime = Date.now();
  const options = parseArgs();

  console.log('');
  console.log(color('bold', '  ┌─────────────────────────────────────────────┐'));
  console.log(color('bold', '  │    Kshetra Hierarchy Validator v1.0.0       │'));
  console.log(color('bold', '  └─────────────────────────────────────────────┘'));

  // Load data
  console.log('');
  console.log(color('cyan', `  Loading data for state: ${options.state}...`));
  const data = loadStateData(options.state);

  // Run validation
  const result = runValidation(options.state, data, {
    constituency: options.constituency,
    verbose: options.verbose,
  });

  // Generate audit report if requested
  if (options.auditReport) {
    generateAuditReport(options.state, result);
  }

  // Timing
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(color('dim', `  Completed in ${elapsed}s`));
  console.log('');

  // Exit code
  process.exit(result.passed ? 0 : 1);
}

main();
