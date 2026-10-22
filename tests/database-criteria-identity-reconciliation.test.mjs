/**
 * tests/database-criteria-identity-reconciliation.test.mjs
 *
 * Automated Deterministic Identity & Catalog Reconciliation Test Suite
 * Task: W021.5 / CTO Directive 141 Section 5
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Enforces:
 * 1. CRIT-C02-02: Political Organizations Catalog (107 orgs + 1,100 child rows = 1,207 total across 6 tables)
 *    - Validates 107 canonical organizations, unique IDs & short names, 6 national, 99 state, 2 unrecognized.
 *    - Validates 10 relationships with 100% foreign key resolution to canonical org IDs.
 *    - Validates 27 multilingual names, 19 symbols, 1,043 aliases, and 1 batch provenance anchor.
 * 2. CRIT-D02-02: Candidate Contest Chunks (10 subchunks 06A..10B, 11,334 tuples, 36 duplicates, 11,298 unique)
 *    - Direct SQL file parsing and SHA256 verification against manifest for all 10 chunks.
 *    - Verifies all 36 natural key collisions by person_id::year::election_type::constituency_id.
 * 3. CRIT-E01-02: Constituency Demographics Baseline (4,123 statutory assembly seats across 31 states)
 *    - Exact constituency-level ID concordance across all 4,123 seats, numeric bounds check.
 * 4. CRIT-F02-03: Corrected Historical Election Results (23 states, 2,243 seats, 87 J&K seats, idempotent upsert)
 *    - Canonical mapping adapter, zero 'OTH'/'Winner' fallbacks, preserves uncontested zeros.
 * 5. Adversarial Falsification Battery: Proves tests fail when source data is modified, corrupted, or missing.
 * 6. Air-Gap & Lifecycle Governance: Production air-gapped (0 queries, 0 mutations), Staging containment pending.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  reconcilePoliticalOrganizations,
  reconcileCandidacies,
  reconcileConstituencyDemographics,
  reconcileHistoricalElectionResults,
  reconcileAllDatabaseCriteria,
  mapHistoricalCoverageToResultRow
} from '../scripts/reconcile_database_criteria_identities.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

describe('CTO Directive 141 Section 5: Authoritative Database Identity Reconciliation Battery', () => {

  // ─── 1. CRIT-C02-02: POLITICAL ORGANIZATIONS CATALOG ───────────────────────
  describe('CRIT-C02-02: Political Organizations Catalog (1,207 Rows Across 6 Tables)', () => {
    const res = reconcilePoliticalOrganizations();

    it('1. Reconciles exactly 107 canonical political organizations in Migration 065', () => {
      assert.strictEqual(res.metrics.canonicalOrganizations, 107);
      assert.strictEqual(res.metrics.uniqueShortNames, 107);
      assert.strictEqual(res.metrics.duplicateShortNames, 0);
    });

    it('2. Reconciles recognition levels breakdown (national: 6, state: 99, unrecognized: 2)', () => {
      assert.strictEqual(res.metrics.recognitionLevels.national, 6);
      assert.strictEqual(res.metrics.recognitionLevels.state, 99);
      assert.strictEqual(res.metrics.recognitionLevels.unrecognized, 2);
      assert.strictEqual(
        res.metrics.recognitionLevels.national +
        res.metrics.recognitionLevels.state +
        res.metrics.recognitionLevels.unrecognized,
        107
      );
    });

    it('3. Reconciles all child catalog tables (10 relationships, 27 multilingual, 19 symbols, 1043 aliases, 1 provenance)', () => {
      assert.strictEqual(res.metrics.relationships, 10);
      assert.strictEqual(res.metrics.multilingualNames, 27);
      assert.strictEqual(res.metrics.symbols, 19);
      assert.strictEqual(res.metrics.aliases, 1043);
      assert.strictEqual(res.metrics.provenanceRecords, 1);
      assert.strictEqual(res.metrics.foreignKeyIntegrity.relationshipsValid, true);
      assert.strictEqual(res.metrics.foreignKeyIntegrity.multilingualValid, true);
      assert.strictEqual(res.metrics.foreignKeyIntegrity.symbolsValid, true);
      assert.strictEqual(res.metrics.foreignKeyIntegrity.aliasesValid, true);
    });

    it('4. Reconciles exact sum across 6 catalog tables = 1,207 total catalog records', () => {
      assert.strictEqual(res.metrics.totalCatalogRecords, 1207);
      assert.strictEqual(res.metrics.authoritativeTarget, 1207);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    });
  });

  // ─── 2. CRIT-D02-02: CANDIDATE CONTEST CHUNKS ──────────────────────────────
  describe('CRIT-D02-02: Candidate Contest Population Across 10 Subchunks', () => {
    const res = reconcileCandidacies();

    it('1. Reconciles exactly 10 subchunk manifests (06A..10B) and verifies 10 SHA256 hashes', () => {
      assert.strictEqual(res.metrics.totalSubchunks, 10);
      assert.strictEqual(res.metrics.verifiedChunkHashesCount, 10);
      assert.deepStrictEqual(res.metrics.subchunkIds, [
        '06A', '06B', '07A', '07B', '08A', '08B', '09A', '09B', '10A', '10B'
      ]);
    });

    it('2. Reconciles source tuple total = 11,334 directly parsed from SQL subchunk files', () => {
      assert.strictEqual(res.metrics.totalSourceTuples, 11334);
    });

    it('3. Clarifies historical 5,750 count as the cumulative midway boundary at Subchunk 08A', () => {
      assert.strictEqual(res.metrics.cumulativeTuplesAt08ABoundary, 5750);
    });

    it('4. Reconciles relational constraint uq_candidacies duplicate collisions = exactly 36', () => {
      assert.strictEqual(res.metrics.accountedDuplicateTuples, 36);
      assert.strictEqual(res.metrics.matchedDeclaredDuplicates, 36);
    });

    it('5. Reconciles unique authoritative candidate population = 11,298 (11,334 - 36)', () => {
      assert.strictEqual(res.metrics.uniqueAuthoritativeCandidacies, 11298);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    });
  });

  // ─── 3. CRIT-E01-02: CONSTITUENCY DEMOGRAPHICS BASELINE ────────────────────
  describe('CRIT-E01-02: Constituency Demographics Baseline (4,123 Statutory Assembly Seats)', () => {
    const res = reconcileConstituencyDemographics();

    it('1. Reconciles total constituency count = 4,123 unique IDs in authoritative inventory', () => {
      assert.strictEqual(res.metrics.totalConstituencies, 4123);
      assert.strictEqual(res.metrics.uniqueConstituencyCompositeIds, 4123);
      assert.strictEqual(res.metrics.statutoryAssemblyTarget, 4123);
      assert.strictEqual(res.metrics.invalidStateCodeCount, 0);
      assert.strictEqual(res.metrics.invalidAcNumberCount, 0);
      assert.strictEqual(res.metrics.stateSeatMismatches, 0);
    });

    it('2. Reconciles coverage across all 31 assembly states & union territories with 0 bounds violations', () => {
      assert.strictEqual(res.metrics.distinctAssemblyStatesCovered, 31);
      assert.strictEqual(res.metrics.demographicBoundsViolations, 0);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    });
  });

  // ─── 4. CRIT-F02-03: CORRECTED HISTORICAL ELECTION RESULTS ─────────────────
  describe('CRIT-F02-03: Corrected 23-State Historical Results (2,243 Seats)', () => {
    const res = reconcileHistoricalElectionResults();

    it('1. Reconciles all 23 missing historical states with exact statutory seats = 2,243', () => {
      assert.strictEqual(res.metrics.totalStatesCovered, 23);
      assert.strictEqual(res.metrics.totalHistoricalElectionRecords, 2243);
      assert.strictEqual(res.metrics.authoritativeTarget, 2243);
    });

    it('2. Verifies Jammu & Kashmir 2014 statutory count = exactly 87 seats (post-2022 seats 88-90 eliminated)', () => {
      assert.strictEqual(res.metrics.jammuKashmir2014StatutorySeats, 87);
      assert.strictEqual(res.metrics.jkPost2022Seats88To90Eliminated, true);
    });

    it('3. Verifies Arunachal Pradesh uncontested seats (AC 4, 16, 31) have genuine 0 margin preserved', () => {
      assert.strictEqual(res.metrics.arunachalUncontestedZerosPreserved, true);
    });

    it('4. Verifies data-truth field mapping: 0 missing candidate names, 0 missing parties', () => {
      assert.strictEqual(res.metrics.missingPartyCount, 0);
      assert.strictEqual(res.metrics.missingCandidateNameCount, 0);
      assert.strictEqual(res.metrics.invalidVoteCount, 0);
    });

    it('5. Confirms non-destructive idempotent upsert strategy (on_conflict=election_id,constituency_id, 0 wholesale DELETEs)', () => {
      assert.strictEqual(res.metrics.upsertConflictTarget, 'on_conflict=election_id,constituency_id');
      assert.strictEqual(res.metrics.eliminatedDestructiveDeletes, true);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    });
  });

  // ─── 5. ADVERSARIAL FALSIFICATION BATTERY ──────────────────────────────────
  describe('Adversarial Falsification Battery: Failing Closed on Corrupted Data', () => {

    it('1. Fails closed if canonical mapping adapter encounters missing party', () => {
      assert.throws(
        () => mapHistoricalCoverageToResultRow({ acNo: 1, winner: '', winnerName: 'Valid Name' }, 101, 'JK'),
        /DATA_TRUTH_VIOLATION.*missing winner party/
      );
    });

    it('2. Fails closed if canonical mapping adapter encounters missing candidate winner name', () => {
      assert.throws(
        () => mapHistoricalCoverageToResultRow({ acNo: 1, winner: 'BJP', winnerName: '' }, 101, 'JK'),
        /DATA_TRUTH_VIOLATION.*missing candidate winner name/
      );
    });

    it('3. Preserves genuine 0 votes and 0 margin for uncontested constituencies', () => {
      const mapped = mapHistoricalCoverageToResultRow({
        acNo: 4,
        winner: 'BJP',
        winnerName: 'Phurpa Tsering',
        winnerVotes: 0,
        margin: 0,
        runnerUp: null
      }, 101, 'AR');

      assert.strictEqual(mapped.winner_votes, 0);
      assert.strictEqual(mapped.margin, 0);
      assert.strictEqual(mapped.constituency_id, 'AR-AC-4');
    });

    it('4. Fails closed if candidacy duplicates report is malformed or missing .duplicates array', () => {
      // Create a temporary mock directory with invalid duplicates report
      const tempDir = path.join(REPO_ROOT, 'scratch', 'test_falsify_dups');
      fs.mkdirSync(path.join(tempDir, 'reports'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'reports', 'w021_5_b2_2d_candidacy_subchunks_manifest.json'), '[]', 'utf8');
      fs.writeFileSync(path.join(tempDir, 'reports', 'w021_5_b2_2d_36_candidacy_duplicates.json'), '{"not_duplicates":[]}', 'utf8');

      assert.throws(
        () => reconcileCandidacies({ repoRoot: tempDir }),
        /MALFORMED_DUPLICATE_REPORT/
      );

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });

  // ─── 6. AIR-GAP & LIFECYCLE GOVERNANCE INVARIANTS ──────────────────────────
  describe('Air-Gap Isolation & Database Lifecycle Governance Invariants', () => {
    const full = reconcileAllDatabaseCriteria();

    it('1. Reconciles all 4 criteria successfully in repository preparation', () => {
      assert.strictEqual(full.allPassed, true);
      assert.strictEqual(full.lifecycleState, 'PREPARED_AND_RECONCILED_IN_REPOSITORY');
    });

    it('2. Production Database ehfafcnimmjusyvplbah is 100% air-gapped (strictly 0 queries, 0 mutations)', () => {
      assert.strictEqual(full.airGapStatus.queriesExecuted, 0);
      assert.strictEqual(full.airGapStatus.mutationsExecuted, 0);
      assert.match(full.airGapStatus.productionDatabase, /AIR-GAPPED — 0 QUERIES, 0 MUTATIONS/);
    });

    it('3. Staging Database execution remains blocked pending administrator key rotation confirmation', () => {
      assert.strictEqual(full.airGapStatus.stagingDatabase, 'fkpigozcqnmcvofuksar (CONTAINMENT_PENDING_ADMIN_CONFIRMATION)');
    });
  });
});
