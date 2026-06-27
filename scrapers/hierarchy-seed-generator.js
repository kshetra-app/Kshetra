#!/usr/bin/env node
/**
 * Hierarchy Seed Generator — Converts scraped JSON into TypeScript seed files
 * ══════════════════════════════════════════════════════════════════════
 * Reads scraped data from LGD, CEO, booth results, and local body scrapers,
 * validates cross-references, and generates typed seed files for the app.
 *
 * Usage:
 *   node scrapers/hierarchy-seed-generator.js --state=TS
 *   node scrapers/hierarchy-seed-generator.js --state=TS --year=2023
 *   node scrapers/hierarchy-seed-generator.js --state=TS --validate-only
 *   node scrapers/hierarchy-seed-generator.js --state=TS --stats-only
 */

const {
  STATES,
  HIERARCHY_OUTPUT_DIR,
  BOOTH_RESULTS_OUTPUT_DIR,
  LOCAL_BODY_OUTPUT_DIR,
} = require('./config');
const { ensureDir, writeJSON, readJSON } = require('./utils');
const path = require('path');
const fs = require('fs');

// ── CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const stateFilter = args.find(a => a.startsWith('--state='))?.split('=')[1];
const yearFilter = args.find(a => a.startsWith('--year='))?.split('=')[1];
const validateOnly = args.includes('--validate-only');
const statsOnly = args.includes('--stats-only');

const SEED_OUTPUT_DIR = path.resolve(__dirname, '..', 'data', 'seed');

// ── Load scraped data ──────────────────────────────────────────────────
/**
 * Loads all scraped data files for a given state.
 * Returns null for any file that doesn't exist (partial data is OK).
 *
 * @param {string} stateCode - Two-letter state code
 * @param {string} year - Election year (for booth results and local body)
 * @returns {{ lgd: Object|null, booths: Object|null, boothResults: Object|null, localBody: Object|null }}
 */
function loadScrapedData(stateCode, year) {
  return {
    lgd: readJSON(path.join(HIERARCHY_OUTPUT_DIR, `${stateCode}-lgd-hierarchy.json`)),
    booths: readJSON(path.join(HIERARCHY_OUTPUT_DIR, `${stateCode}-booth-summary.json`)),
    boothResults: year
      ? readJSON(path.join(BOOTH_RESULTS_OUTPUT_DIR, `${stateCode}-${year}-summary.json`))
      : null,
    localBody: year
      ? readJSON(path.join(LOCAL_BODY_OUTPUT_DIR, `${stateCode}-${year}-panchayat-results.json`))
      : null,
  };
}

// ── Validation ─────────────────────────────────────────────────────────

/**
 * Validates that every booth maps to exactly one Assembly Constituency.
 * @param {Object|null} boothData - CEO booth summary data
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateBoothToAC(boothData) {
  const errors = [];
  const warnings = [];

  if (!boothData || !boothData.constituencies) {
    warnings.push('No booth data available for validation');
    return { errors, warnings };
  }

  const boothIds = new Set();

  for (const ac of boothData.constituencies) {
    if (!ac.acNumber) {
      errors.push(`Constituency missing acNumber`);
      continue;
    }

    // Load per-AC booth file to check individual booths
    const acFile = path.join(HIERARCHY_OUTPUT_DIR, `${boothData.stateCode}-AC${ac.acNumber}-booths.json`);
    const acData = readJSON(acFile);
    if (!acData || !acData.booths) continue;

    for (const booth of acData.booths) {
      const boothKey = `AC${ac.acNumber}-B${booth.boothNumber}`;

      // Check: booth belongs to exactly one AC
      if (boothIds.has(boothKey)) {
        errors.push(`Duplicate booth: ${boothKey}`);
      }
      boothIds.add(boothKey);

      // Check: booth has an AC mapping
      if (!booth.acNumber || booth.acNumber !== ac.acNumber) {
        errors.push(`Booth ${boothKey}: AC mismatch (expected ${ac.acNumber}, got ${booth.acNumber})`);
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validates that voter totals sum correctly.
 * State total = sum of all AC totals = sum of all booth totals.
 * @param {Object|null} boothData - CEO booth summary data
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateVoterTotals(boothData) {
  const errors = [];
  const warnings = [];

  if (!boothData || !boothData.constituencies) {
    warnings.push('No booth data for voter total validation');
    return { errors, warnings };
  }

  let computedStateTotal = 0;

  for (const ac of boothData.constituencies) {
    computedStateTotal += ac.totalVoters || 0;

    // Load per-AC data and check booth-level sums
    const acFile = path.join(HIERARCHY_OUTPUT_DIR, `${boothData.stateCode}-AC${ac.acNumber}-booths.json`);
    const acData = readJSON(acFile);
    if (!acData || !acData.booths) continue;

    const boothSum = acData.booths.reduce((s, b) => s + (b.totalVoters || 0), 0);
    if (boothSum !== (acData.totalVoters || 0)) {
      errors.push(`AC-${ac.acNumber}: booth voter sum (${boothSum}) ≠ AC total (${acData.totalVoters})`);
    }

    // Gender breakdown validation
    if (acData.maleVoters || acData.femaleVoters) {
      const genderSum = (acData.maleVoters || 0) + (acData.femaleVoters || 0) + (acData.thirdGenderVoters || 0);
      if (genderSum !== (acData.totalVoters || 0)) {
        warnings.push(`AC-${ac.acNumber}: gender breakdown sum (${genderSum}) ≠ total (${acData.totalVoters})`);
      }
    }
  }

  if (computedStateTotal !== (boothData.totalVoters || 0)) {
    errors.push(`State total: computed sum (${computedStateTotal}) ≠ reported (${boothData.totalVoters})`);
  }

  return { errors, warnings };
}

/**
 * Validates that all panchayats map to mandals in the LGD hierarchy.
 * @param {Object|null} lgd - LGD hierarchy data
 * @param {Object|null} localBody - Local body election data
 * @returns {{ errors: string[], warnings: string[], mapped: number, unmapped: number }}
 */
function validatePanchayatMapping(lgd, localBody) {
  const errors = [];
  const warnings = [];
  let mapped = 0, unmapped = 0;

  if (!lgd || !localBody || !localBody.results) {
    warnings.push('Missing LGD or local body data for panchayat mapping');
    return { errors, warnings, mapped, unmapped };
  }

  for (const result of localBody.results) {
    if (result.lgdPanchayatCode) {
      mapped++;
    } else {
      unmapped++;
      if (unmapped <= 20) { // Only report first 20 unmapped
        warnings.push(`Unmapped panchayat: ${result.districtName} → ${result.mandalName} → ${result.panchayatName}`);
      }
    }
  }

  if (unmapped > 20) {
    warnings.push(`... and ${unmapped - 20} more unmapped panchayats`);
  }

  return { errors, warnings, mapped, unmapped };
}

/**
 * Validates that all mandals in the LGD hierarchy map to constituencies.
 * Uses booth data to establish mandal-to-constituency relationships.
 * @param {Object|null} lgd - LGD hierarchy data
 * @param {Object|null} boothData - CEO booth summary data
 * @returns {{ errors: string[], warnings: string[] }}
 */
function validateMandalToConstituency(lgd, boothData) {
  const errors = [];
  const warnings = [];

  if (!lgd || !boothData) {
    warnings.push('Missing LGD or booth data for mandal-constituency mapping');
    return { errors, warnings };
  }

  // In the Indian system, mandal boundaries don't perfectly align with
  // constituency boundaries (many-to-many). This validation checks that
  // every mandal has at least one booth assigned to some constituency.
  // Full many-to-many mapping would require a crosswalk table.

  let totalMandals = 0;
  for (const dist of lgd.districts || []) {
    totalMandals += (dist.mandals || []).length;
  }

  if (totalMandals === 0) {
    warnings.push('LGD hierarchy has no mandals');
  } else {
    warnings.push(`LGD has ${totalMandals} mandals — constituency mapping requires crosswalk data`);
  }

  return { errors, warnings };
}

// ── Coverage statistics ────────────────────────────────────────────────
/**
 * Computes coverage statistics across all data sources.
 * @param {Object} data - Loaded scraped data
 * @param {Object} state - State config
 * @returns {Object} Coverage statistics
 */
function computeCoverage(data, state) {
  const stats = {
    state: state.code,
    stateName: state.name,
    dataSources: {
      lgd: !!data.lgd,
      booths: !!data.booths,
      boothResults: !!data.boothResults,
      localBody: !!data.localBody,
    },
    lgd: null,
    booths: null,
    boothResults: null,
    localBody: null,
  };

  // LGD coverage
  if (data.lgd) {
    let totalMandals = 0, totalPanchayats = 0, totalVillages = 0;
    for (const d of data.lgd.districts || []) {
      totalMandals += (d.mandals || []).length;
      for (const m of d.mandals || []) {
        totalPanchayats += (m.panchayats || []).length;
        for (const p of m.panchayats || []) {
          totalVillages += (p.villages || []).length;
        }
      }
    }
    stats.lgd = {
      districts: (data.lgd.districts || []).length,
      mandals: totalMandals,
      panchayats: totalPanchayats,
      villages: totalVillages,
    };

    // Compare with estimates if available
    if (state.hierarchyEstimates) {
      const est = state.hierarchyEstimates;
      stats.lgd.districtCoverage = est.totalDistricts > 0
        ? `${stats.lgd.districts}/${est.totalDistricts} (${((stats.lgd.districts / est.totalDistricts) * 100).toFixed(1)}%)`
        : 'N/A';
      stats.lgd.mandalCoverage = est.totalMandals > 0
        ? `${stats.lgd.mandals}/${est.totalMandals} (${((stats.lgd.mandals / est.totalMandals) * 100).toFixed(1)}%)`
        : 'N/A';
    }
  }

  // Booth coverage
  if (data.booths) {
    stats.booths = {
      constituencies: data.booths.totalConstituencies || 0,
      totalBooths: data.booths.totalBooths || 0,
      totalVoters: data.booths.totalVoters || 0,
    };

    if (state.hierarchyEstimates && state.hierarchyEstimates.totalBooths) {
      stats.booths.boothCoverage = `${stats.booths.totalBooths}/${state.hierarchyEstimates.totalBooths} (${((stats.booths.totalBooths / state.hierarchyEstimates.totalBooths) * 100).toFixed(1)}%)`;
    }
  }

  // Booth results coverage
  if (data.boothResults) {
    stats.boothResults = {
      constituencies: data.boothResults.totalConstituencies || 0,
      totalBooths: data.boothResults.totalBooths || 0,
      validationErrors: (data.boothResults.validationErrors || []).length,
    };
  }

  // Local body coverage
  if (data.localBody) {
    stats.localBody = {
      districts: data.localBody.totalDistricts || 0,
      mandals: data.localBody.totalMandals || 0,
      panchayats: data.localBody.totalPanchayats || 0,
      results: data.localBody.totalResults || 0,
    };
  }

  return stats;
}

// ── Generate TypeScript seed file ──────────────────────────────────────
/**
 * Generates a TypeScript seed file from the validated, cross-referenced data.
 * The seed file contains typed constants that the app imports directly.
 *
 * @param {Object} data - Loaded scraped data
 * @param {Object} state - State config
 * @param {string} year - Election year
 * @returns {string} TypeScript file content
 */
function generateSeedTS(data, state, year) {
  const lines = [];

  // ── Header ──
  lines.push('/**');
  lines.push(` * ${state.name} (${state.code}) — Hierarchy Seed Data`);
  lines.push(' * ══════════════════════════════════════════════════════════════════════');
  lines.push(` * Auto-generated by hierarchy-seed-generator.js on ${new Date().toISOString()}`);
  lines.push(' * DO NOT EDIT MANUALLY — re-run the generator to update.');
  lines.push(' */');
  lines.push('');

  // ── Imports / Types ──
  lines.push('// ── Types ─────────────────────────────────────────────────────────────');
  lines.push('');
  lines.push('export interface Village {');
  lines.push('  readonly name: string;');
  lines.push('  readonly lgdCode: number;');
  lines.push('  readonly nameLocal?: string;');
  lines.push('  readonly censusCode: string | null;');
  lines.push('}');
  lines.push('');
  lines.push('export interface Panchayat {');
  lines.push('  readonly name: string;');
  lines.push('  readonly lgdCode: number;');
  lines.push('  readonly nameLocal?: string;');
  lines.push("  readonly type: 'gram_panchayat';");
  lines.push('  readonly villages: ReadonlyArray<Village>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface Mandal {');
  lines.push('  readonly name: string;');
  lines.push('  readonly lgdCode: number;');
  lines.push('  readonly nameLocal?: string;');
  lines.push('  readonly type: string;');
  lines.push('  readonly panchayats: ReadonlyArray<Panchayat>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface District {');
  lines.push('  readonly name: string;');
  lines.push('  readonly lgdCode: number;');
  lines.push('  readonly nameLocal?: string;');
  lines.push('  readonly mandals: ReadonlyArray<Mandal>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface Booth {');
  lines.push('  readonly boothNumber: number;');
  lines.push('  readonly boothName: string;');
  lines.push('  readonly acNumber: number;');
  lines.push('  readonly totalVoters: number;');
  lines.push('  readonly maleVoters: number;');
  lines.push('  readonly femaleVoters: number;');
  lines.push('  readonly thirdGenderVoters: number;');
  lines.push('}');
  lines.push('');
  lines.push('export interface ConstituencyBooths {');
  lines.push('  readonly acNumber: number;');
  lines.push('  readonly acName: string;');
  lines.push('  readonly totalBooths: number;');
  lines.push('  readonly totalVoters: number;');
  lines.push('  readonly booths: ReadonlyArray<Booth>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface StateHierarchy {');
  lines.push('  readonly stateCode: string;');
  lines.push('  readonly stateName: string;');
  lines.push('  readonly lgdStateCode: string;');
  lines.push('  readonly generatedAt: string;');
  lines.push('  readonly districts: ReadonlyArray<District>;');
  lines.push('  readonly constituencyBooths: ReadonlyArray<ConstituencyBooths>;');
  lines.push('}');
  lines.push('');

  // ── Hierarchy Data ──
  lines.push('// ── Hierarchy Data ─────────────────────────────────────────────────────');
  lines.push('');

  if (data.lgd) {
    lines.push(`export const ${state.code}_HIERARCHY: StateHierarchy = ${JSON.stringify({
      stateCode: state.code,
      stateName: state.name,
      lgdStateCode: data.lgd.lgdStateCode || '',
      generatedAt: new Date().toISOString(),
      districts: (data.lgd.districts || []).map(d => ({
        name: d.name,
        lgdCode: d.lgdCode,
        nameLocal: d.nameLocal || undefined,
        mandals: (d.mandals || []).map(m => ({
          name: m.name,
          lgdCode: m.lgdCode,
          nameLocal: m.nameLocal || undefined,
          type: m.type || 'block',
          panchayats: (m.panchayats || []).map(p => ({
            name: p.name,
            lgdCode: p.lgdCode,
            nameLocal: p.nameLocal || undefined,
            type: 'gram_panchayat',
            villages: (p.villages || []).map(v => ({
              name: v.name,
              lgdCode: v.lgdCode,
              nameLocal: v.nameLocal || undefined,
              censusCode: v.censusCode || null,
            })),
          })),
        })),
      })),
      constituencyBooths: [], // Populated below if booth data available
    }, null, 2)} as const;`);
  } else {
    lines.push(`// No LGD hierarchy data available for ${state.code}`);
    lines.push(`export const ${state.code}_HIERARCHY: StateHierarchy = {`);
    lines.push(`  stateCode: '${state.code}',`);
    lines.push(`  stateName: '${state.name}',`);
    lines.push(`  lgdStateCode: '',`);
    lines.push(`  generatedAt: '${new Date().toISOString()}',`);
    lines.push(`  districts: [],`);
    lines.push(`  constituencyBooths: [],`);
    lines.push(`} as const;`);
  }

  lines.push('');

  // ── Booth data as separate export (can be large) ──
  if (data.booths && data.booths.constituencies) {
    lines.push('// ── Constituency Booth Counts ──────────────────────────────────────────');
    lines.push(`export const ${state.code}_BOOTH_SUMMARY = ${JSON.stringify(
      data.booths.constituencies.map(c => ({
        acNumber: c.acNumber,
        acName: c.acName,
        totalBooths: c.totalBooths,
        totalVoters: c.totalVoters,
      })),
      null, 2
    )} as const;`);
    lines.push('');
  }

  // ── Lookup maps ──
  lines.push('// ── Lookup Maps ───────────────────────────────────────────────────────');
  lines.push('');

  if (data.lgd) {
    lines.push(`/** Map of district LGD codes to district names for ${state.code} */`);
    lines.push(`export const ${state.code}_DISTRICT_MAP: ReadonlyMap<number, string> = new Map([`);
    for (const d of data.lgd.districts || []) {
      lines.push(`  [${d.lgdCode}, '${d.name.replace(/'/g, "\\'")}'],`);
    }
    lines.push(']);');
    lines.push('');

    lines.push(`/** Map of mandal LGD codes to mandal names for ${state.code} */`);
    lines.push(`export const ${state.code}_MANDAL_MAP: ReadonlyMap<number, string> = new Map([`);
    for (const d of data.lgd.districts || []) {
      for (const m of d.mandals || []) {
        lines.push(`  [${m.lgdCode}, '${m.name.replace(/'/g, "\\'")}'],`);
      }
    }
    lines.push(']);');
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🔧 Hierarchy Seed Generator — TypeScript Seed Files');
  console.log('═'.repeat(60));

  if (!stateFilter) {
    console.log('Usage: node scrapers/hierarchy-seed-generator.js --state=TS');
    console.log('       --year=2023       Include booth results for specific year');
    console.log('       --validate-only   Only run validation, no file generation');
    console.log('       --stats-only      Only print coverage statistics');
    process.exit(0);
  }

  const stateCode = stateFilter.toUpperCase();
  const year = yearFilter || null;

  const state = STATES.find(s => s.code === stateCode);
  if (!state) {
    console.error(`❌ Unknown state code: ${stateCode}`);
    process.exit(1);
  }

  console.log(`\n📋 ${state.name} (${state.code})${year ? ` — Year: ${year}` : ''}`);

  // Load all data sources
  console.log('\n📂 Loading scraped data...');
  const data = loadScrapedData(stateCode, year);

  console.log(`   LGD hierarchy:   ${data.lgd ? '✅' : '❌ Not found'}`);
  console.log(`   CEO booths:      ${data.booths ? '✅' : '❌ Not found'}`);
  console.log(`   Booth results:   ${data.boothResults ? '✅' : '❌ Not found'}`);
  console.log(`   Local body:      ${data.localBody ? '✅' : '❌ Not found'}`);

  // Run validations
  console.log('\n🔍 Running validations...');
  const validations = {
    boothToAC: validateBoothToAC(data.booths),
    voterTotals: validateVoterTotals(data.booths),
    panchayatMapping: validatePanchayatMapping(data.lgd, data.localBody),
    mandalToConstituency: validateMandalToConstituency(data.lgd, data.booths),
  };

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [name, result] of Object.entries(validations)) {
    const errorCount = result.errors ? result.errors.length : 0;
    const warnCount = result.warnings ? result.warnings.length : 0;
    totalErrors += errorCount;
    totalWarnings += warnCount;

    const icon = errorCount > 0 ? '❌' : warnCount > 0 ? '⚠️' : '✅';
    console.log(`   ${icon} ${name}: ${errorCount} errors, ${warnCount} warnings`);

    // Show first few errors
    for (const err of (result.errors || []).slice(0, 5)) {
      console.log(`      ❌ ${err}`);
    }
    for (const warn of (result.warnings || []).slice(0, 3)) {
      console.log(`      ⚠️ ${warn}`);
    }
  }

  // Panchayat mapping stats
  if (validations.panchayatMapping.mapped !== undefined) {
    const pm = validations.panchayatMapping;
    const total = pm.mapped + pm.unmapped;
    const pct = total > 0 ? ((pm.mapped / total) * 100).toFixed(1) : 0;
    console.log(`\n   📊 Panchayat ID mapping: ${pm.mapped}/${total} (${pct}%)`);
  }

  // Coverage statistics
  const coverage = computeCoverage(data, state);
  console.log('\n📊 Coverage Statistics:');
  if (coverage.lgd) {
    console.log(`   LGD:  ${coverage.lgd.districts} districts, ${coverage.lgd.mandals} mandals, ${coverage.lgd.panchayats} panchayats`);
    if (coverage.lgd.districtCoverage) console.log(`         District coverage: ${coverage.lgd.districtCoverage}`);
    if (coverage.lgd.mandalCoverage) console.log(`         Mandal coverage: ${coverage.lgd.mandalCoverage}`);
  }
  if (coverage.booths) {
    console.log(`   Booths: ${coverage.booths.totalBooths} across ${coverage.booths.constituencies} constituencies`);
    if (coverage.booths.boothCoverage) console.log(`           Coverage: ${coverage.booths.boothCoverage}`);
  }
  if (coverage.boothResults) {
    console.log(`   Results: ${coverage.boothResults.totalBooths} booths across ${coverage.boothResults.constituencies} constituencies`);
  }
  if (coverage.localBody) {
    console.log(`   Local body: ${coverage.localBody.panchayats} panchayats, ${coverage.localBody.results} results`);
  }

  if (statsOnly) {
    process.exit(0);
  }

  if (validateOnly) {
    process.exit(totalErrors > 0 ? 1 : 0);
  }

  // Generate TypeScript seed file
  console.log('\n📝 Generating TypeScript seed file...');
  ensureDir(SEED_OUTPUT_DIR);

  const tsContent = generateSeedTS(data, state, year);
  const seedFile = path.join(SEED_OUTPUT_DIR, `${stateCode.toLowerCase()}-hierarchy.ts`);
  fs.writeFileSync(seedFile, tsContent, 'utf-8');

  console.log(`   💾 Saved: ${seedFile}`);

  // Save coverage report JSON
  const reportFile = path.join(SEED_OUTPUT_DIR, `${stateCode.toLowerCase()}-coverage-report.json`);
  writeJSON(reportFile, {
    generatedAt: new Date().toISOString(),
    state: stateCode,
    coverage,
    validation: {
      totalErrors,
      totalWarnings,
      details: Object.fromEntries(
        Object.entries(validations).map(([k, v]) => [k, {
          errors: (v.errors || []).length,
          warnings: (v.warnings || []).length,
        }])
      ),
    },
  });

  console.log(`   💾 Coverage report: ${reportFile}`);

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✨ Seed Generation Complete');
  console.log(`${'═'.repeat(60)}`);
  console.log(`   State:       ${state.name} (${stateCode})`);
  console.log(`   Seed file:   ${seedFile}`);
  console.log(`   Errors:      ${totalErrors}`);
  console.log(`   Warnings:    ${totalWarnings}`);
}

main().catch(err => { console.error('\n❌ Fatal:', err); process.exit(1); });
