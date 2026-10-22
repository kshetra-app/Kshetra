/**
 * tests/database-criteria-identity-reconciliation.test.mjs
 *
 * Automated Deterministic Identity & Catalog Reconciliation Test Suite
 * Task: W021.5 / CTO Directive 140 Section 3
 * Governing Authority: Master Execution Framework Amendment v1.6 / Rule IV-001 Non-Self-Acceptance
 *
 * Enforces:
 * 1. CRIT-C02-02: Political Organizations Catalog (107 orgs + 1,100 child rows = 1,207 total across 6 tables)
 * 2. CRIT-D02-02: Candidate Contest Chunks (10 subchunks 06A..10B, 11,334 tuples, 36 duplicates, 11,298 unique)
 * 3. CRIT-E01-02: Constituency Demographics Baseline (4,123 statutory assembly seats across 31 states)
 * 4. CRIT-F02-03: Corrected Historical Election Results (23 states, 2,243 seats, 87 J&K seats, idempotent upsert)
 * 5. Air-Gap & Lifecycle Governance: Production air-gapped (0 queries, 0 mutations), Staging containment pending
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
  reconcileAllDatabaseCriteria
} from '../scripts/reconcile_database_criteria_identities.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

describe('CTO Directive 140 Section 3: Authoritative Database Identity Reconciliation Battery', () => {

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
    });

    it('4. Reconciles exact sum across 6 catalog tables = 1,207 total catalog records', () => {
      assert.strictEqual(res.metrics.totalCatalogRecords, 1207);
      assert.strictEqual(res.metrics.authoritativeTarget, 1207);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED');
    });
  });

  // ─── 2. CRIT-D02-02: CANDIDATE CONTEST CHUNKS ──────────────────────────────
  describe('CRIT-D02-02: Candidate Contest Population Across 10 Subchunks', () => {
    const res = reconcileCandidacies();

    it('1. Reconciles exactly 10 subchunk manifests (06A..10B)', () => {
      assert.strictEqual(res.metrics.totalSubchunks, 10);
      assert.deepStrictEqual(res.metrics.subchunkIds, [
        '06A', '06B', '07A', '07B', '08A', '08B', '09A', '09B', '10A', '10B'
      ]);
    });

    it('2. Reconciles source tuple total = 11,334 across 10 subchunks', () => {
      assert.strictEqual(res.metrics.totalSourceTuples, 11334);
    });

    it('3. Clarifies historical 5,750 count as the cumulative midway boundary at Subchunk 08A', () => {
      assert.strictEqual(res.metrics.cumulativeTuplesAt08ABoundary, 5750);
    });

    it('4. Reconciles relational constraint uq_candidacies duplicate discards = 36 pairs', () => {
      assert.strictEqual(res.metrics.accountedDuplicateTuples, 36);
    });

    it('5. Reconciles unique authoritative candidate population = 11,298 (11,334 - 36)', () => {
      assert.strictEqual(res.metrics.uniqueAuthoritativeCandidacies, 11298);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED');
    });
  });

  // ─── 3. CRIT-E01-02: CONSTITUENCY DEMOGRAPHICS BASELINE ────────────────────
  describe('CRIT-E01-02: Constituency Demographics Baseline (4,123 Statutory Assembly Seats)', () => {
    const res = reconcileConstituencyDemographics();

    it('1. Reconciles total constituency count = 4,123 in authoritative inventory', () => {
      assert.strictEqual(res.metrics.totalConstituencies, 4123);
      assert.strictEqual(res.metrics.statutoryAssemblyTarget, 4123);
    });

    it('2. Reconciles coverage across all 31 assembly states & union territories', () => {
      assert.strictEqual(res.metrics.distinctAssemblyStatesCovered, 31);
      assert.strictEqual(res.metrics.sumSeatsAcrossStates, 4123);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED');
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

    it('3. Verifies data-truth field mapping: 0 missing candidate names, 0 missing parties', () => {
      assert.strictEqual(res.metrics.missingPartyCount, 0);
      assert.strictEqual(res.metrics.missingCandidateNameCount, 0);
      assert.strictEqual(res.metrics.invalidVoteCount, 0);
    });

    it('4. Confirms non-destructive idempotent upsert strategy (on_conflict=election_id,constituency_id, 0 wholesale DELETEs)', () => {
      assert.strictEqual(res.metrics.upsertConflictTarget, 'on_conflict=election_id,constituency_id');
      assert.strictEqual(res.metrics.eliminatedDestructiveDeletes, true);
      assert.strictEqual(res.passed, true);
      assert.strictEqual(res.lifecycleState, 'PREPARED_AND_RECONCILED');
    });
  });

  // ─── 5. AIR-GAP & LIFECYCLE GOVERNANCE INVARIANTS ──────────────────────────
  describe('Air-Gap Isolation & Database Lifecycle Governance Invariants', () => {
    const full = reconcileAllDatabaseCriteria();

    it('1. Reconciles all 4 criteria successfully in repository preparation', () => {
      assert.strictEqual(full.allPassed, true);
      assert.strictEqual(full.lifecycleState, 'PREPARED_AND_RECONCILED');
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
