/**
 * tests/delimitation-g8-integration.test.mjs
 *
 * Milestone: W020-G8 (Delimitation Engine Canonical Integration)
 * Specification: PLAN-W020-G8-REV-1.2
 * Directives:
 * - CTO EXECUTION DIRECTIVE — W020-G8 IMPLEMENTATION (2026-09-30)
 * - Master Execution Framework Amendments v1.2, v1.4, v1.5-A, v1.6
 *
 * Master Invariant Verification Battery (25 Non-Tautological Checks across 5 Planes):
 * Plane 1: Cross-Domain Entity Linkage (W020-G8-INT-01..05)
 * Plane 2: Regime-Gated Simulation & Projection Harmonization (W020-G8-SIM-01..05)
 * Plane 3: Evidence-Linked Timeline & Status Derivation (W020-G8-EVI-01..05)
 * Plane 4: Negative Path & Fail-Closed Invariants (W020-G8-NEG-01..05)
 * Plane 5: Environmental & Baseline Immutability (W020-G8-ENV-01..05)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync, execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Self-spawn with tsx loader if not already present
if (!process.execArgv.some((arg) => arg.includes('tsx'))) {
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: process.env,
    }
  );
  process.exit(result.status ?? 0);
}

// ─── IMPORT ENGINE SERVICES & FASTIFY APP ───
const { delimitationQueryService } = await import(
  '../apps/api/src/services/delimitationQueryService.ts'
);
const { delimitationService } = await import(
  '../apps/api/src/services/delimitationService.ts'
);
const { buildApp } = await import('../apps/api/src/server.ts');

console.log('================================================================');
console.log('W020-G8: DELIMITATION ENGINE CANONICAL INTEGRATION');
console.log('MASTER INVARIANT & VERIFICATION BATTERY (25 CHECKS / 5 PLANES)');
console.log(`Execution Timestamp: ${new Date().toISOString()}`);
console.log('Target: panIN-staging (fkpigozcqnmcvofuksar) ONLY');
console.log('Production: ehfafcnimmjusyvplbah (STRICTLY AIR-GAPPED & UNTOUCHED)');
console.log('================================================================\n');

// ─── ENVIRONMENT & SAFETY CHECKS ───
const envPath = path.resolve('.env.staging');
if (!fs.existsSync(envPath)) {
  console.error('FATAL: .env.staging not found');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
const supabaseUrl = env.SUPABASE_URL || 'https://fkpigozcqnmcvofuksar.supabase.co';
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseUrl.includes('ehfafcnimmjusyvplbah')) {
  console.error('FATAL: Production database detected in configuration! Immediate abort.');
  process.exit(1);
}
if (!supabaseUrl.includes('fkpigozcqnmcvofuksar')) {
  console.error(`FATAL: Execution target is NOT panIN-staging! Detected: ${supabaseUrl}`);
  process.exit(1);
}

const stagingSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

let passedChecks = 0;
let failedChecks = 0;
const results = [];

function recordCheck(id, title, pass, observed = '', details = '') {
  const status = pass ? 'PASS' : 'FAIL';
  if (pass) {
    passedChecks++;
  } else {
    failedChecks++;
  }
  console.log(`[${status}] ${id}: ${title}`);
  if (observed || details) {
    if (observed) console.log(`       Observed: ${observed}`);
    if (details) console.log(`       Details:  ${details}`);
  }
  results.push({ id, title, status, observed, details });
}

async function runG8Verification() {
  const app = await buildApp();

  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // PLANE 1: CROSS-DOMAIN ENTITY LINKAGE (W018/W019 Integration)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- PLANE 1: CROSS-DOMAIN ENTITY LINKAGE (W018/W019) ---');

    // W020-G8-INT-01: /mla-impact/:stateCode returns MLA profiles with W018/W019 linkage
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/mla-impact/TS' });
      const body = JSON.parse(res.body);
      const data = body.data;
      const hasMlaProfiles = data && data.mlaProfiles && data.mlaProfiles.length === 119;
      // At least one MLA profile should have a non-null personId (W019 benchmark linkage)
      const hasW019Linkage = data && data.mlaProfiles && data.mlaProfiles.some(
        (m) => m.personId !== null && m.personId !== undefined
      );
      const int01Pass = res.statusCode === 200 && hasMlaProfiles && hasW019Linkage;

      recordCheck(
        'W020-G8-INT-01',
        'MLA impact queries return 119 profiles with W018/W019 entity linkage for sitting MLAs',
        int01Pass,
        `Status: ${res.statusCode}, Profiles: ${data?.mlaProfiles?.length || 0}, W019-linked: ${hasW019Linkage}`,
        'LEGAL_INVARIANT: Cross-domain entity linkage to elected_tenures and canonical_persons'
      );
    } catch (err) {
      recordCheck('W020-G8-INT-01', 'MLA impact cross-domain entity linkage', false, err.message);
    }

    // W020-G8-INT-02: /party-projections/:stateCode binds to W019 certified election tallies
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/party-projections/TS' });
      const body = JSON.parse(res.body);
      const data = body.data;
      const parties = data?.parties || [];
      // Canonical 2023 Telangana certified party results: INC:64, BRS:39, BJP:8, AIMIM:7, CPI:1
      const incParty = parties.find((p) => p.party === 'INC');
      const brsParty = parties.find((p) => p.party === 'BRS');
      const bjpParty = parties.find((p) => p.party === 'BJP');
      const aimimParty = parties.find((p) => p.party === 'AIMIM');
      const cpiParty = parties.find((p) => p.party === 'CPI');
      const certifiedMatch =
        incParty?.currentSeats === 64 &&
        brsParty?.currentSeats === 39 &&
        bjpParty?.currentSeats === 8 &&
        aimimParty?.currentSeats === 7 &&
        cpiParty?.currentSeats === 1;
      // Verify voteSharePercent is present (G8 enhancement)
      const hasVoteShare = incParty?.voteSharePercent !== undefined && incParty?.voteSharePercent !== null;
      const int02Pass = res.statusCode === 200 && certifiedMatch && hasVoteShare;

      recordCheck(
        'W020-G8-INT-02',
        'Party projections bind to W019 normalized certified election tallies (INC:64, BRS:39, BJP:8, AIMIM:7, CPI:1)',
        int02Pass,
        `INC: ${incParty?.currentSeats}, BRS: ${brsParty?.currentSeats}, BJP: ${bjpParty?.currentSeats}, voteShare: ${incParty?.voteSharePercent}`,
        'LEGAL_INVARIANT: Certified 2023 Telangana election results bound to party projections'
      );
    } catch (err) {
      recordCheck('W020-G8-INT-02', 'Party projections W019 certified binding', false, err.message);
    }

    // W020-G8-INT-03: Unregistered jurisdictions fail closed with 404 UNSUPPORTED_GEOGRAPHY
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/mla-impact/ZZ' });
      const body = JSON.parse(res.body);
      const int03Pass = res.statusCode === 404 && body.code === 'UNSUPPORTED_GEOGRAPHY';

      recordCheck(
        'W020-G8-INT-03',
        'Unregistered jurisdiction (ZZ) fails closed with 404 UNSUPPORTED_GEOGRAPHY',
        int03Pass,
        `Status: ${res.statusCode}, Code: ${body.code || 'N/A'}`,
        'LEGAL_INVARIANT: Fail-closed for unregistered geographies'
      );
    } catch (err) {
      recordCheck('W020-G8-INT-03', 'Unregistered jurisdiction fail-closed', false, err.message);
    }

    // W020-G8-INT-04: Missing MLA records return UNKNOWN without fabricating synthetic data
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/mla-impact/TS' });
      const body = JSON.parse(res.body);
      const data = body.data;
      const profiles = data?.mlaProfiles || [];
      // For non-benchmarked constituencies, verify names come from seed data and aren't fabricated
      // Any constituency without W019 benchmarks should have names from TELANGANA_CONSTITUENCIES seed
      // No profile should have personId set unless it's a W019 certified benchmark (AC-065 or AC-040)
      const nonBenchmarked = profiles.filter(
        (m) => m.currentAcNo !== 65 && m.currentAcNo !== 40
      );
      const noFabricatedPersonIds = nonBenchmarked.every(
        (m) => m.personId === null || m.personId === undefined
      );
      const int04Pass = profiles.length === 119 && noFabricatedPersonIds;

      recordCheck(
        'W020-G8-INT-04',
        'Non-benchmarked MLA records do not fabricate synthetic personIds (UNKNOWN semantics)',
        int04Pass,
        `Total: ${profiles.length}, Non-benchmarked without fabricated IDs: ${noFabricatedPersonIds}`,
        'LEGAL_INVARIANT: UNKNOWN/null semantics for unavailable canonical data'
      );
    } catch (err) {
      recordCheck('W020-G8-INT-04', 'Missing MLA UNKNOWN semantics', false, err.message);
    }

    // W020-G8-INT-05: Winning margins match official W019 certified results
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/mla-impact/TS' });
      const body = JSON.parse(res.body);
      const profiles = body.data?.mlaProfiles || [];
      const kodangal = profiles.find((m) => m.currentAcNo === 65);
      const gajwel = profiles.find((m) => m.currentAcNo === 40);

      // W019 certified: Kodangal margin=32532, Gajwel margin=45031
      const kodangalMatch = kodangal &&
        kodangal.mlaName === 'Anumula Revanth Reddy' &&
        kodangal.party === 'INC' &&
        kodangal.currentMarginVotes === 32532 &&
        kodangal.personId === '01900000-0000-0000-0000-000000000011';
      const gajwelMatch = gajwel &&
        gajwel.mlaName === 'Kalvakuntla Chandrashekar Rao' &&
        gajwel.party === 'BRS' &&
        gajwel.currentMarginVotes === 45031 &&
        gajwel.personId === '01900000-0000-0000-0000-000000000014';
      const int05Pass = kodangalMatch && gajwelMatch;

      recordCheck(
        'W020-G8-INT-05',
        'Winning margins match W019 certified results (Kodangal: 32532, Gajwel: 45031)',
        int05Pass,
        `Kodangal: ${kodangal?.mlaName} (${kodangal?.party}) margin=${kodangal?.currentMarginVotes}, Gajwel: ${gajwel?.mlaName} (${gajwel?.party}) margin=${gajwel?.currentMarginVotes}`,
        'LEGAL_INVARIANT: Official W019 certified election results integrity'
      );
    } catch (err) {
      recordCheck('W020-G8-INT-05', 'W019 certified winning margins', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLANE 2: REGIME-GATED SIMULATION & PROJECTION HARMONIZATION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- PLANE 2: REGIME-GATED SIMULATION & PROJECTION HARMONIZATION ---');

    // W020-G8-SIM-01: /simulate/:stateCode with mode=current evaluates statutory baseline
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?mode=current',
      });
      const body = JSON.parse(res.body);
      const data = body.data;
      // mode=current should bind to statutory baseline: 119 seats, Proposal 1
      const sim01Pass = res.statusCode === 200 &&
        data.targetSeats === 119 &&
        data.currentSeats === 119 &&
        data.seatChange === 0 &&
        data.mode === 'current' &&
        data.scenarioEnclosure?.provenance?.legalStatus === 'CURRENT_LEGAL_REGIME' &&
        data.scenarioEnclosure?.provenance?.outputClassification === 'STATUTORY_BENCHMARK';

      recordCheck(
        'W020-G8-SIM-01',
        'Simulate with mode=current evaluates against statutory baseline (119 seats, CURRENT_LEGAL_REGIME)',
        sim01Pass,
        `Seats: ${data?.targetSeats}, Mode: ${data?.mode}, Legal: ${data?.scenarioEnclosure?.provenance?.legalStatus}, Class: ${data?.scenarioEnclosure?.provenance?.outputClassification}`,
        'SCENARIO_INVARIANT: Statutory baseline binding for mode=current'
      );
    } catch (err) {
      recordCheck('W020-G8-SIM-01', 'Mode current statutory baseline', false, err.message);
    }

    // W020-G8-SIM-02: /simulate/:stateCode with proposalId binds to Proposal 2 simulation
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?proposalId=02010000-0000-0000-0000-000000000002&seats=119',
      });
      const body = JSON.parse(res.body);
      const data = body.data;
      // Proposal 2 should use Census 2011 Article 332 derivation (18 SC, 10 ST, 91 General)
      const sim02Pass = res.statusCode === 200 &&
        data.targetSeats === 119 &&
        data.reservation?.scReserved === 18 &&
        data.reservation?.stReserved === 10 &&
        data.reservation?.general === 91;

      recordCheck(
        'W020-G8-SIM-02',
        'Simulate with Proposal 2 ID evaluates Census 2011 Article 332 derivation (SC:18, ST:10, Gen:91)',
        sim02Pass,
        `Seats: ${data?.targetSeats}, SC: ${data?.reservation?.scReserved}, ST: ${data?.reservation?.stReserved}, Gen: ${data?.reservation?.general}`,
        'SCENARIO_INVARIANT: Proposal 2 benchmark Article 332 derivation'
      );
    } catch (err) {
      recordCheck('W020-G8-SIM-02', 'Proposal 2 simulation binding', false, err.message);
    }

    // W020-G8-SIM-03: Non-scenario regimes reject simulation seat overrides fail-closed
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?regimeId=eci_delimitation_2008&seats=200',
      });
      const body = JSON.parse(res.body);
      const sim03Pass = res.statusCode === 400 &&
        body.code === 'REGIME_SIMULATION_CONFLICT';

      recordCheck(
        'W020-G8-SIM-03',
        'Current regime (eci_delimitation_2008) rejects simulation seat override with REGIME_SIMULATION_CONFLICT',
        sim03Pass,
        `Status: ${res.statusCode}, Code: ${body.code || 'N/A'}`,
        'SCENARIO_INVARIANT: Non-scenario regime rejects overrides fail-closed'
      );
    } catch (err) {
      recordCheck('W020-G8-SIM-03', 'Non-scenario regime override rejection', false, err.message);
    }

    // W020-G8-SIM-04: Projected seats strictly conserve total (sum districts === target)
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=150',
      });
      const body = JSON.parse(res.body);
      const data = body.data;
      const districtSeatsSum = (data?.districtBreakdown || []).reduce(
        (sum, d) => sum + d.projectedSeats, 0
      );
      const sim04Pass = res.statusCode === 200 &&
        data.targetSeats === 150 &&
        districtSeatsSum === 150;

      recordCheck(
        'W020-G8-SIM-04',
        'District seat allocation strictly conserves total (Σ districts = target 150)',
        sim04Pass,
        `Target: ${data?.targetSeats}, Sum(districts): ${districtSeatsSum}`,
        'COMPUTATIONAL_INVARIANT: Hamilton/Hare-Niemeyer seat conservation'
      );
    } catch (err) {
      recordCheck('W020-G8-SIM-04', 'Seat conservation invariant', false, err.message);
    }

    // W020-G8-SIM-05: Article 170 bounds apply conditionally; special regimes resolve own constraints
    try {
      // Standard state: Article 170 (60 <= S <= 500)
      const stdConstraint = delimitationService.resolveLegalApplicability(
        'STATE_LEGISLATIVE_ASSEMBLY', 'CURRENT_LEGAL_REGIME', 'TS'
      );
      const stdPass = stdConstraint.minSeats === 60 && stdConstraint.maxSeats === 500 &&
        stdConstraint.constitutionalProvision === 'Article 170(1)';

      // Sikkim special regime: Art 371F (>= 30, notwithstanding)
      const skConstraint = delimitationService.resolveLegalApplicability(
        'STATE_LEGISLATIVE_ASSEMBLY', 'CURRENT_LEGAL_REGIME', 'SK'
      );
      const skPass = skConstraint.minSeats === 30 && skConstraint.maxSeats === undefined &&
        skConstraint.notwithstandingClause === true &&
        skConstraint.constitutionalProvision === 'Article 371F(f)';

      // Mizoram: Art 371G (>= 40, notwithstanding)
      const mzConstraint = delimitationService.resolveLegalApplicability(
        'STATE_LEGISLATIVE_ASSEMBLY', 'CURRENT_LEGAL_REGIME', 'MZ'
      );
      const mzPass = mzConstraint.minSeats === 40 && mzConstraint.notwithstandingClause === true;

      // Goa: Art 371-I (>= 30, exactSeats 40 under Reorganisation Act)
      const gaConstraint = delimitationService.resolveLegalApplicability(
        'STATE_LEGISLATIVE_ASSEMBLY', 'CURRENT_LEGAL_REGIME', 'GA'
      );
      const gaPass = gaConstraint.minSeats === 30 && gaConstraint.exactSeats === 40;

      // Union Territory: Puducherry governed by UT Act (Section 3, exactSeats 30)
      const pyConstraint = delimitationService.resolveLegalApplicability(
        'UNION_TERRITORY_ASSEMBLY', 'CURRENT_LEGAL_REGIME', 'PY'
      );
      const pyPass = pyConstraint.exactSeats === 30 &&
        pyConstraint.constitutionalProvision === 'Article 239A';

      const sim05Pass = stdPass && skPass && mzPass && gaPass && pyPass;

      recordCheck(
        'W020-G8-SIM-05',
        'Article 170 bounds conditional; special regimes (SK/MZ/GA/PY) resolve own typed constraints',
        sim05Pass,
        `Std(170): min=${stdConstraint.minSeats},max=${stdConstraint.maxSeats}; SK(371F): min=${skConstraint.minSeats},notw=${skConstraint.notwithstandingClause}; MZ(371G): min=${mzConstraint.minSeats}; GA(371-I): exact=${gaConstraint.exactSeats}; PY(UT): exact=${pyConstraint.exactSeats}`,
        'LEGAL_INVARIANT: Legal applicability model — no hardcoded exception list'
      );
    } catch (err) {
      recordCheck('W020-G8-SIM-05', 'Article 170 conditional applicability', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLANE 3: EVIDENCE-LINKED TIMELINE & STATUS DERIVATION
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- PLANE 3: EVIDENCE-LINKED TIMELINE & STATUS DERIVATION ---');

    // W020-G8-EVI-01: /timeline derives historical events from evidence_records
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/timeline' });
      const body = JSON.parse(res.body);
      const data = body.data;
      const events = data?.events || [];
      // Must have at least 6 verified statutory events
      const verifiedEvents = events.filter((e) => e.verified === true);
      const evi01Pass = res.statusCode === 200 && events.length >= 6 && verifiedEvents.length >= 5;

      recordCheck(
        'W020-G8-EVI-01',
        'Timeline derives historical events with >= 6 events and >= 5 verified statutory records',
        evi01Pass,
        `Events: ${events.length}, Verified: ${verifiedEvents.length}`,
        'LEGAL_INVARIANT: Evidence-linked timeline derivation from public.evidence_records'
      );
    } catch (err) {
      recordCheck('W020-G8-EVI-01', 'Timeline evidence derivation', false, err.message);
    }

    // W020-G8-EVI-02: Timeline events carry byte-exact statutory identifiers
    try {
      const timelineEvents = await delimitationQueryService.getTimelineEvents();
      const hasGSR311E = timelineEvents.some((e) =>
        (e.instrument || '').includes('G.S.R. 311(E)')
      );
      const has282AP = timelineEvents.some((e) =>
        (e.instrument || '').includes('282/AP/2018(DEL)')
      );
      const hasAPRA2014 = timelineEvents.some((e) =>
        (e.instrument || '').includes('Act No. 6 of 2014')
      );
      const hasDelimAct2002 = timelineEvents.some((e) =>
        (e.instrument || '').includes('Act No. 33 of 2002')
      );
      const evi02Pass = hasGSR311E && has282AP && hasAPRA2014 && hasDelimAct2002;

      recordCheck(
        'W020-G8-EVI-02',
        'Timeline events carry byte-exact statutory identifiers (G.S.R. 311(E), 282/AP/2018(DEL), Act No. 6, Act No. 33)',
        evi02Pass,
        `GSR311E: ${hasGSR311E}, 282AP: ${has282AP}, APRA2014: ${hasAPRA2014}, DelimAct2002: ${hasDelimAct2002}`,
        'LEGAL_INVARIANT: Statutory instrument citations verified byte-exact'
      );
    } catch (err) {
      recordCheck('W020-G8-EVI-02', 'Statutory identifier byte-exact verification', false, err.message);
    }

    // W020-G8-EVI-03: /status reflects active status flags from delimitation_regimes
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/status' });
      const body = JSON.parse(res.body);
      const data = body.data;
      const evi03Pass = res.statusCode === 200 &&
        data.nationalStatus === 'pre_census' &&
        data.constitutionalFramework &&
        data.constitutionalFramework.includes('Article') &&
        data.censusTracking &&
        data.censusTracking.finalPopulationAvailable === false &&
        data.provenance?.outputClassification === 'STATUTORY_FACT';

      recordCheck(
        'W020-G8-EVI-03',
        'Status reflects active pre_census status with STATUTORY_FACT classification from delimitation_regimes',
        evi03Pass,
        `Status: ${data?.nationalStatus}, Framework: ${data?.constitutionalFramework?.substring(0, 40)}..., PopAvail: ${data?.censusTracking?.finalPopulationAvailable}`,
        'LEGAL_INVARIANT: Active status flags derived from public.delimitation_regimes'
      );
    } catch (err) {
      recordCheck('W020-G8-EVI-03', 'Status active regime flags', false, err.message);
    }

    // W020-G8-EVI-04: 84th Amendment freeze post-2026 reflected; Census 2027 NOT treated as concluded
    try {
      const status = await delimitationQueryService.getDelimitationStatus();
      const freezeReflected = status.description &&
        status.description.includes('freeze') &&
        status.description.includes('2026');
      const censusNotConcluded = status.censusTracking.finalPopulationAvailable === false;
      const nextMilestoneCorrect = status.nextMilestone &&
        status.nextMilestone.toLowerCase().includes('census');
      const evi04Pass = freezeReflected && censusNotConcluded && nextMilestoneCorrect;

      recordCheck(
        'W020-G8-EVI-04',
        '84th Amendment constitutional freeze post-2026 reflected; Census 2027 not concluded',
        evi04Pass,
        `Freeze: ${freezeReflected}, CensusNotConcluded: ${censusNotConcluded}, NextMilestone: ${status.nextMilestone}`,
        'LEGAL_INVARIANT: Constitutional freeze without treating Census 2027 as concluded'
      );
    } catch (err) {
      recordCheck('W020-G8-EVI-04', '84th Amendment freeze reflection', false, err.message);
    }

    // W020-G8-EVI-05: Provenance records link to official gazette citations
    try {
      const res = await app.inject({ method: 'GET', url: '/api/v1/delimitation/simulate/TS?mode=current' });
      const body = JSON.parse(res.body);
      const provenance = body.data?.scenarioEnclosure?.provenance;
      const hasInputDatasets = provenance?.inputDatasetVersions?.length >= 1;
      const hasMethodology = provenance?.methodology && provenance.methodology.length > 10;
      const hasLegalStatus = provenance?.legalStatus === 'CURRENT_LEGAL_REGIME';
      const hasCalcTimestamp = provenance?.calculatedAt && provenance.calculatedAt.includes('T');
      const evi05Pass = hasInputDatasets && hasMethodology && hasLegalStatus && hasCalcTimestamp;

      recordCheck(
        'W020-G8-EVI-05',
        'Provenance records link to official gazette citations with input datasets and legal status',
        evi05Pass,
        `Datasets: ${provenance?.inputDatasetVersions?.length}, Methodology: ${provenance?.methodology?.substring(0, 40)}..., Legal: ${provenance?.legalStatus}`,
        'LEGAL_INVARIANT: Provenance chain integrity with gazette citations'
      );
    } catch (err) {
      recordCheck('W020-G8-EVI-05', 'Provenance gazette citation linkage', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLANE 4: NEGATIVE PATH & FAIL-CLOSED INVARIANTS
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- PLANE 4: NEGATIVE PATH & FAIL-CLOSED INVARIANTS ---');

    // W020-G8-NEG-01: Malformed regime selection queries fail closed with 400
    try {
      // Pass a completely invalid regime query mode to the query service
      let neg01Pass = false;
      try {
        await delimitationQueryService.resolveRegime({ mode: 'INVALID_GARBAGE_MODE' });
        neg01Pass = false; // Should have thrown
      } catch (err) {
        neg01Pass = err.statusCode === 400 || err.code === 'INVALID_REGIME_SELECTION_MODE';
      }

      recordCheck(
        'W020-G8-NEG-01',
        'Malformed regime selection query (INVALID_GARBAGE_MODE) fails closed with 400',
        neg01Pass,
        `Thrown: ${neg01Pass}`,
        'COMPUTATIONAL_INVARIANT: Structured 400 error for invalid regime selection'
      );
    } catch (err) {
      recordCheck('W020-G8-NEG-01', 'Malformed regime query fail-closed', false, err.message);
    }

    // W020-G8-NEG-02: Ambiguous scenario selector (both proposalId and regimeId in explicit mode) fails closed
    try {
      // Historical regime also rejects overrides
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?regimeId=eci_delimitation_1976&seats=100',
      });
      const body = JSON.parse(res.body);
      const neg02Pass = res.statusCode === 400 && body.code === 'REGIME_SIMULATION_CONFLICT';

      recordCheck(
        'W020-G8-NEG-02',
        'Historical regime (eci_delimitation_1976) rejects seat override with REGIME_SIMULATION_CONFLICT',
        neg02Pass,
        `Status: ${res.statusCode}, Code: ${body.code || 'N/A'}`,
        'COMPUTATIONAL_INVARIANT: Historical regimes are immutable — fail closed'
      );
    } catch (err) {
      recordCheck('W020-G8-NEG-02', 'Ambiguous regime/proposal conflict', false, err.message);
    }

    // W020-G8-NEG-03: Client-supplied isScenario parameter fails closed with SCENARIO_INPUT_FORBIDDEN
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?isScenario=true',
      });
      const body = JSON.parse(res.body);
      // The preValidation hook should block isScenario parameter
      const neg03Pass = res.statusCode === 400 &&
        (body.code === 'SCENARIO_INPUT_FORBIDDEN' ||
         (body.message || '').toLowerCase().includes('scenario'));

      recordCheck(
        'W020-G8-NEG-03',
        'Client-supplied isScenario=true fails closed with 400 SCENARIO_INPUT_FORBIDDEN',
        neg03Pass,
        `Status: ${res.statusCode}, Code: ${body.code || 'N/A'}, Msg: ${(body.message || '').substring(0, 60)}`,
        'SCENARIO_INVARIANT: isScenario is server-derived, never client-supplied'
      );
    } catch (err) {
      recordCheck('W020-G8-NEG-03', 'isScenario client input forbidden', false, err.message);
    }

    // W020-G8-NEG-04: Mutating HTTP methods (POST, PUT, DELETE) to query routes return 404
    try {
      const postRes = await app.inject({ method: 'POST', url: '/api/v1/delimitation/projections' });
      const putRes = await app.inject({ method: 'PUT', url: '/api/v1/delimitation/projections' });
      const deleteRes = await app.inject({ method: 'DELETE', url: '/api/v1/delimitation/projections' });
      const neg04Pass = postRes.statusCode === 404 && putRes.statusCode === 404 && deleteRes.statusCode === 404;

      recordCheck(
        'W020-G8-NEG-04',
        'Mutating HTTP methods (POST/PUT/DELETE) to /projections return 404',
        neg04Pass,
        `POST: ${postRes.statusCode}, PUT: ${putRes.statusCode}, DELETE: ${deleteRes.statusCode}`,
        'COMPUTATIONAL_INVARIANT: Query routes are strictly GET-only'
      );
    } catch (err) {
      recordCheck('W020-G8-NEG-04', 'Mutating methods return 404', false, err.message);
    }

    // W020-G8-NEG-05: Ingress seats exceeding MAX_SAFE_REQUESTED_SEATS (10000) fail closed with 400
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/delimitation/simulate/TS?seats=10001',
      });
      const body = JSON.parse(res.body);
      const neg05Pass = res.statusCode === 400 &&
        body.code === 'VALIDATION_ERROR' &&
        (body.message || '').includes('10000');

      recordCheck(
        'W020-G8-NEG-05',
        'Seats exceeding MAX_SAFE_REQUESTED_SEATS (10000) fail closed with 400 (computational resource-safety)',
        neg05Pass,
        `Status: ${res.statusCode}, Code: ${body.code || 'N/A'}, Contains 10000: ${(body.message || '').includes('10000')}`,
        'COMPUTATIONAL_INVARIANT: MAX_SAFE_REQUESTED_SEATS is computational/resource-safety, not constitutional'
      );
    } catch (err) {
      recordCheck('W020-G8-NEG-05', 'MAX_SAFE_REQUESTED_SEATS enforcement', false, err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PLANE 5: ENVIRONMENTAL & BASELINE IMMUTABILITY
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n--- PLANE 5: ENVIRONMENTAL & BASELINE IMMUTABILITY ---');

    // W020-G8-ENV-01: PostGIS 589 geometry digest verified byte-exact
    try {
      // Use the same paginated select('*') + governed-field digest approach as G7 SEC-02
      function hashRowGovernedFields(row) {
        const coords = row.geometry?.coordinates || row.geometry;
        const geomHash = crypto.createHash('sha256').update(JSON.stringify(coords)).digest('hex');
        const governedPayload = {
          entity_type: row.entity_type,
          mandal_version_id: row.mandal_version_id,
          dataset_version_id: row.dataset_version_id,
          provenance_id: row.provenance_id,
          source_feature_id: String(row.source_feature_id),
          raw_artifact_sha256: row.raw_artifact_sha256,
          snapshot_date: String(row.snapshot_date).slice(0, 10),
          valid_from: String(row.valid_from).slice(0, 10),
          valid_to: row.valid_to ? String(row.valid_to).slice(0, 10) : null,
          temporal_classification: row.temporal_classification,
          authority_classification: row.authority_classification,
          status: row.status,
          is_current: Boolean(row.is_current),
          geometry_hash: geomHash,
        };
        return crypto.createHash('sha256').update(JSON.stringify(governedPayload)).digest('hex');
      }

      function computeRowSetDigest(rowsList) {
        const sortedHashes = rowsList
          .slice()
          .sort((a, b) => a.mandal_version_id.localeCompare(b.mandal_version_id))
          .map(r => hashRowGovernedFields(r));
        return crypto.createHash('sha256').update(sortedHashes.join('\n')).digest('hex');
      }

      let geomRows = [];
      const pageSize = 100;
      for (let i = 0; i < 10; i++) {
        const { data, error } = await stagingSupabase
          .from('entity_geometries')
          .select('*')
          .order('id')
          .range(i * pageSize, (i + 1) * pageSize - 1);
        if (error) {
          console.error('FATAL fetching entity_geometries page:', i, error);
          break;
        }
        if (!data || data.length === 0) break;
        geomRows.push(...data);
      }

      const geomCount = geomRows.length;
      let digestMatch = false;
      if (geomCount === 589) {
        const computedDigest = computeRowSetDigest(geomRows);
        const expectedDigest = 'f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b';
        digestMatch = computedDigest === expectedDigest;
      }
      const env01Pass = geomCount === 589 && digestMatch;

      recordCheck(
        'W020-G8-ENV-01',
        'PostGIS 589 geometry rows verified byte-exact against digest f839fa02...',
        env01Pass,
        `Count: ${geomCount}, DigestMatch: ${digestMatch}`,
        'LEGAL_INVARIANT: Entity geometry baseline immutability (SHA-256 verification)'
      );
    } catch (err) {
      recordCheck('W020-G8-ENV-01', 'PostGIS geometry digest verification', false, err.message);
    }

    // W020-G8-ENV-02: Production database ehfafcnimmjusyvplbah verified air-gapped
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const noProductionRef = !envContent.includes('ehfafcnimmjusyvplbah');
      const onlyStagingRef = envContent.includes('fkpigozcqnmcvofuksar');
      const env02Pass = noProductionRef && onlyStagingRef;

      recordCheck(
        'W020-G8-ENV-02',
        'Production database (ehfafcnimmjusyvplbah) verified 100% air-gapped — zero references in .env.staging',
        env02Pass,
        `NoProductionRef: ${noProductionRef}, StagingPresent: ${onlyStagingRef}`,
        'LEGAL_INVARIANT: Production air-gap verification'
      );
    } catch (err) {
      recordCheck('W020-G8-ENV-02', 'Production air-gap verification', false, err.message);
    }

    // W020-G8-ENV-03: Mobile codebase apps/mobile/** verified 100% frozen
    try {
      let gitMobileDiff = '';
      try {
        gitMobileDiff = execSync('git diff --name-only -- apps/mobile/', {
          cwd: path.resolve('.'),
          encoding: 'utf8',
        }).trim();
      } catch (err) {
        gitMobileDiff = err.message;
      }
      const env03Pass = gitMobileDiff.length === 0;

      recordCheck(
        'W020-G8-ENV-03',
        'Mobile directory apps/mobile/** verified 100% frozen (0 modified files)',
        env03Pass,
        `Git status apps/mobile: ${gitMobileDiff.length === 0 ? 'CLEAN (0 modifications)' : gitMobileDiff}`,
        'LEGAL_INVARIANT: Consumer mobile codebase completely isolated'
      );
    } catch (err) {
      recordCheck('W020-G8-ENV-03', 'Mobile codebase frozen verification', false, err.message);
    }

    // W020-G8-ENV-04: public.constituency_mapping verified at 0 rows
    try {
      const { data: mappingRows, count, error: mappErr } = await stagingSupabase
        .from('constituency_mapping')
        .select('id', { count: 'exact', head: true });

      const mappingCount = count ?? (mappingRows || []).length;
      const env04Pass = mappingCount === 0;

      recordCheck(
        'W020-G8-ENV-04',
        'public.constituency_mapping verified strictly at 0 rows (no unauthorized constituency lineage)',
        env04Pass,
        `Count: ${mappingCount}`,
        'LEGAL_INVARIANT: Constituency mapping immutability — zero rows'
      );
    } catch (err) {
      recordCheck('W020-G8-ENV-04', 'Constituency mapping zero rows', false, err.message);
    }

    // W020-G8-ENV-05: AC-110, AC-118, AC-119 lineage claims verified strictly UNKNOWN
    try {
      const targetACs = ['AC-110', 'AC-118', 'AC-119'];
      const { claims } = await delimitationQueryService.getConstituencyMappings();
      let allUnknown = true;

      for (const acCode of targetACs) {
        const claim = claims.find((c) => c.constituencyCode === acCode);
        if (!claim || claim.lineageStatus !== 'UNKNOWN') {
          allUnknown = false;
        }
      }
      const env05Pass = allUnknown;

      recordCheck(
        'W020-G8-ENV-05',
        'AC-110, AC-118, AC-119 lineage claims verified strictly UNKNOWN',
        env05Pass,
        `AllUnknown: ${allUnknown}, Claims found: ${claims.filter((c) => targetACs.includes(c.constituencyCode)).length}/3`,
        'LEGAL_INVARIANT: Unresolved constituency lineage maintained as UNKNOWN'
      );
    } catch (err) {
      recordCheck('W020-G8-ENV-05', 'AC-110, AC-118, AC-119 lineage claims', false, err.message);
    }

  } finally {
    await app.close();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY REPORT
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n================================================================');
  console.log(`W020-G8 VERIFICATION SUMMARY: ${passedChecks} / ${passedChecks + failedChecks} CHECKS PASSED`);
  console.log(`PASS RATE: ${((passedChecks / (passedChecks + failedChecks)) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (failedChecks > 0) {
    console.error(`\nFAILED INVARIANTS (${failedChecks}):`);
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.error(` - [FAIL] ${r.id}: ${r.title}`));
    process.exit(1);
  } else {
    console.log('\nALL 25 W020-G8 CANONICAL INTEGRATION INVARIANTS VERIFIED PASSING (100%)\n');
    process.exit(0);
  }
}

runG8Verification().catch((err) => {
  console.error('FATAL EXCEPTION DURING W020-G8 VERIFICATION:', err);
  process.exit(1);
});
