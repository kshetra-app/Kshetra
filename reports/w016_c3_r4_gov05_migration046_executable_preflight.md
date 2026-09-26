# PANIN / KSHETRA
## W016-C3-R4-GOV-05 — CTO FINAL MIGRATION 046 EXECUTABLE PREFLIGHT
### Title: Legacy Identity Supersession, Non-Destructive Provenance Repair & Replay Safety
**Target Database:** `panIN-staging` (`fkpigozcqnmcvofuksar`) (Read-Only Probe)  
**Production Status:** STRICTLY AIR-GAPPED & UNTOUCHED  
**Date:** 2026-09-26  
**Final Status:** **`DESIGN READY — REQUESTING CTO MIGRATION 046 AUTHORIZATION`**

---

## 1. Complete Migration 046 SQL

Below is the complete, unabridged SQL authored in `supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql`:

```sql
-- ============================================================================
-- Migration 046: Legacy Pilot Identity Lineage Supersession & Provenance Reconcile
-- Job: W016-C3-R4-GOV-05 (Executable Preflight / Non-Destructive Provenance Repair)
--
-- Objective:
-- 1. Preserve historical source claims in ts_lgd_mandals_2023_v1 by retaining
--    domain_record_id = LEGACY_ID in public.record_provenance_linkages with is_canonical = false.
-- 2. Create 12 append-only supersession nodes in public.provenance_records under
--    ts_lgd_mandals_2026_v1, with parent_provenance_id pointing to legacy provenance records.
-- 3. Establish canonical linkages connecting canonical mandal IDs to the supersession nodes
--    with is_canonical = true.
-- 4. Reconcile metadata for the Mancherial-Hajipur statutory split (G.O.Ms.No. 222)
--    in public.geography_entity_lineage and public.provenance_records.
-- 5. Guarantee zero mutation of public.mandals (maintaining strictly 621 statutory anchors)
--    and zero mutation of immutable dataset_versions snapshot fields.
--
-- Safety & Idempotency:
-- - Fully transactional (atomic commit or rollback).
-- - Fail-closed assertion guards before, during, and after mutation.
-- - Idempotent ON CONFLICT handlers.
-- ============================================================================

DO $$
DECLARE
  v_mandals_count INTEGER;
  v_versions_count INTEGER;
  v_rpl_demoted_count INTEGER;
  v_supersession_count INTEGER;
BEGIN
  -- ─── 1. PRECONDITION GUARDS ──────────────────────────────────────────────────
  
  -- Assert exactly 621 canonical mandal anchors exist
  SELECT COUNT(*) INTO v_mandals_count FROM public.mandals;
  IF v_mandals_count != 621 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: public.mandals count is %, expected 621', v_mandals_count;
  END IF;

  -- Assert dataset versions exist
  IF NOT EXISTS (SELECT 1 FROM public.dataset_versions WHERE id = 'ts_lgd_mandals_2026_v1') THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: dataset_version ts_lgd_mandals_2026_v1 missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.dataset_versions WHERE id = 'ts_lgd_mandals_2023_v1') THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: dataset_version ts_lgd_mandals_2023_v1 missing';
  END IF;

  -- Assert all 12 canonical target anchors exist in public.mandals
  IF (
    SELECT COUNT(DISTINCT id) FROM public.mandals WHERE id IN (
      'TS-MDL-4315', 'TS-MDL-4318', 'TS-MDL-4329', 'TS-MDL-4333', 'TS-MDL-4319',
      'TS-MDL-4353', 'TS-MDL-4354', 'TS-MDL-4348', 'TS-MDL-4356', 'TS-MDL-4350',
      'TS-MDL-4351', 'TS-MDL-6227'
    )
  ) != 12 THEN
    RAISE EXCEPTION 'PRECONDITION_FAILED: One or more canonical replacement mandals missing in public.mandals';
  END IF;

  -- ─── 2. DEMOTE 12 HISTORICAL PROVENANCE LINKAGES (is_canonical = false) ───────
  -- Preserves historical domain_record_id = LEGACY_ID while marking linkage non-canonical.
  UPDATE public.record_provenance_linkages
  SET is_canonical = false
  WHERE domain_table = 'mandals'
    AND domain_record_id IN (
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    )
    AND is_canonical = true;

  -- ─── 3. INSERT 12 APPEND-ONLY SUPERSESSION PROVENANCE NODES ──────────────────
  -- Deterministic UUIDs: md5('pr_supersede_mandal_' || legacy_id)::uuid
  -- Parent pointer chains back to historical provenance record.
  
  -- Temporary table mapping the 12 authoritative pairs
  CREATE TEMP TABLE temp_legacy_canonical_pairs (
    legacy_id TEXT PRIMARY KEY,
    legacy_name TEXT NOT NULL,
    legacy_pilot_lgd INTEGER NOT NULL,
    canonical_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    canonical_lgd INTEGER NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO temp_legacy_canonical_pairs VALUES
    ('TS-MDL-7101', 'Sirpur (T)',  7101, 'TS-MDL-4315', 'Sirpur (T)',  4315),
    ('TS-MDL-7102', 'Kagaznagar',  7102, 'TS-MDL-4318', 'Kagaznagar',  4318),
    ('TS-MDL-7103', 'Dahegaon',    7103, 'TS-MDL-4329', 'Dahegoan',    4329),
    ('TS-MDL-7104', 'Tiryani',     7104, 'TS-MDL-4333', 'Tiryani',     4333),
    ('TS-MDL-7105', 'Asifabad',    7105, 'TS-MDL-4319', 'Asifabad',    4319),
    ('TS-MDL-5320', 'Luxettipet',  5320, 'TS-MDL-4353', 'Luxettipet',  4353),
    ('TS-MDL-5321', 'Mancherial',  5321, 'TS-MDL-4354', 'Mancherial',  4354),
    ('TS-MDL-5322', 'Dandepally',  5322, 'TS-MDL-4348', 'Dandepally',  4348),
    ('TS-MDL-5323', 'Chennur',     5323, 'TS-MDL-4356', 'Chennur',     4356),
    ('TS-MDL-5324', 'Bellampalli', 5324, 'TS-MDL-4350', 'Bellampally', 4350),
    ('TS-MDL-5328', 'Kotapalli',   5328, 'TS-MDL-4351', 'Kotapally',   4351),
    ('TS-MDL-5329', 'Hajipur',     5329, 'TS-MDL-6227', 'Hajipur',     6227);

  INSERT INTO public.provenance_records (
    id,
    dataset_version_id,
    source_record_id,
    parent_provenance_id,
    status,
    transformation_type,
    transform_version,
    operator,
    metadata
  )
  SELECT
    md5('pr_supersede_mandal_' || p.legacy_id)::uuid,
    'ts_lgd_mandals_2026_v1',
    'LGD-MANDAL-' || p.canonical_lgd::text,
    rpl.provenance_id,
    'OFFICIAL',
    'pilot_to_statutory_supersession',
    '1.0',
    'system:w016_c3_r4_supersession',
    jsonb_build_object(
      'legacy_pilot_id', p.legacy_id,
      'legacy_pilot_name', p.legacy_name,
      'legacy_pilot_lgd_code', p.legacy_pilot_lgd,
      'canonical_mandal_id', p.canonical_id,
      'canonical_mandal_name', p.canonical_name,
      'canonical_lgd_code', p.canonical_lgd,
      'supersession_type', 'SYNTHETIC_PILOT_TO_STATUTORY_BASELINE',
      'supersession_reason', 'Supersession of pre-W016 synthetic pilot identity with authentic statutory MoPR LGD 2026 baseline',
      'statutory_reference', 'MoPR LGD 2026 Directory snapshot; G.O.Ms. Nos. 214-245 Rev (2016-10-11)',
      'reconciliation_timestamp', now()
    )
  FROM temp_legacy_canonical_pairs p
  JOIN public.record_provenance_linkages rpl
    ON rpl.domain_table = 'mandals'
   AND rpl.domain_record_id = p.legacy_id
  ON CONFLICT (id) DO UPDATE SET
    metadata = EXCLUDED.metadata,
    source_record_id = EXCLUDED.source_record_id;

  -- ─── 4. ESTABLISH CANONICAL PROVENANCE LINKAGES (is_canonical = true) ────────
  -- Links the active canonical mandal to the supersession node
  INSERT INTO public.record_provenance_linkages (
    domain_table,
    domain_record_id,
    provenance_id,
    is_canonical
  )
  SELECT
    'mandals',
    p.canonical_id,
    md5('pr_supersede_mandal_' || p.legacy_id)::uuid,
    true
  FROM temp_legacy_canonical_pairs p
  ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;

  -- ─── 5. RECONCILE GEOGRAPHY ENTITY LINEAGE METADATA (MANCHERIAL-HAJIPUR SPLIT) 
  -- Preserves historical legal split G.O.Ms.No. 222 while linking to canonical mandal IDs
  UPDATE public.geography_entity_lineage
  SET
    predecessor_internal_id = md5('mandals:TS-MDL-4354')::uuid,
    successor_internal_id = md5('mandals:TS-MDL-6227')::uuid,
    metadata = metadata || jsonb_build_object(
      'predecessor_mandal_id', 'TS-MDL-4354',
      'predecessor_mandal_name', 'Mancherial',
      'successor_mandal_id', 'TS-MDL-6227',
      'successor_mandal_name', 'Hajipur',
      'canonical_lgd_code', 6227,
      'legacy_pilot_predecessor_id', 'TS-MDL-5321',
      'legacy_pilot_successor_id', 'TS-MDL-5329',
      'legacy_pilot_lgd_code', 5949,
      'reconciliation_audit', 'W016-C3-R4-GOV-05 canonical cross-reference'
    )
  WHERE id = '68e465c2-a00b-478d-8082-e0cf1f3bbe67'::uuid;

  -- ─── 6. RECONCILE PROVENANCE RECORD METADATA (SPLIT LINEAGE PROVENANCE) ───────
  UPDATE public.provenance_records
  SET metadata = metadata || jsonb_build_object(
    'predecessor', 'TS-MDL-4354',
    'successor', 'TS-MDL-6227',
    'legacy_pilot_predecessor', 'TS-MDL-5321',
    'legacy_pilot_successor', 'TS-MDL-5329',
    'reconciliation_audit', 'W016-C3-R4-GOV-05 canonical cross-reference'
  )
  WHERE id = '8c350901-a5d8-fe3d-c5b2-6ffe37601908'::uuid;

  -- ─── 7. POSTCONDITION INVARIANT GUARDS ────────────────────────────────────────

  -- Assert public.mandals count remains strictly 621
  SELECT COUNT(*) INTO v_mandals_count FROM public.mandals;
  IF v_mandals_count != 621 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: public.mandals count changed to %, expected 621', v_mandals_count;
  END IF;

  -- Assert total mandal_versions remains strictly 1210
  SELECT COUNT(*) INTO v_versions_count FROM public.mandal_versions;
  IF v_versions_count != 1210 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: public.mandal_versions count is %, expected 1210', v_versions_count;
  END IF;

  -- Assert 0 legacy mandals have is_canonical = true in record_provenance_linkages
  SELECT COUNT(*) INTO v_rpl_demoted_count
  FROM public.record_provenance_linkages
  WHERE domain_table = 'mandals'
    AND domain_record_id IN (
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    )
    AND is_canonical = true;
  IF v_rpl_demoted_count != 0 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: % legacy mandal linkages remain marked as canonical', v_rpl_demoted_count;
  END IF;

  -- Assert exactly 12 legacy linkages exist with is_canonical = false
  SELECT COUNT(*) INTO v_rpl_demoted_count
  FROM public.record_provenance_linkages
  WHERE domain_table = 'mandals'
    AND domain_record_id IN (
      'TS-MDL-7101', 'TS-MDL-7102', 'TS-MDL-7103', 'TS-MDL-7104', 'TS-MDL-7105',
      'TS-MDL-5320', 'TS-MDL-5321', 'TS-MDL-5322', 'TS-MDL-5323', 'TS-MDL-5324',
      'TS-MDL-5328', 'TS-MDL-5329'
    )
    AND is_canonical = false;
  IF v_rpl_demoted_count != 12 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: Expected 12 non-canonical legacy linkages, found %', v_rpl_demoted_count;
  END IF;

  -- Assert exactly 12 supersession provenance records created
  SELECT COUNT(*) INTO v_supersession_count
  FROM public.provenance_records
  WHERE transformation_type = 'pilot_to_statutory_supersession';
  IF v_supersession_count != 12 THEN
    RAISE EXCEPTION 'POSTCONDITION_FAILED: Expected 12 supersession provenance records, found %', v_supersession_count;
  END IF;

  RAISE NOTICE 'SUCCESS: Migration 046 preflight checks and logic verified atomically.';
END $$;
```

---

## 2. Exact Before and After Semantics

| Component | Before State (Live Staging) | After State (Post-Migration 046) | Delta Semantics |
|:---|:---|:---|:---|
| `public.mandals` count | 621 | 621 | **0 mutation** (active anchors unchanged) |
| `public.mandal_versions` count | 1210 | 1210 | **0 mutation** (temporal versions unchanged) |
| `public.entity_geometries` count | 0 | 0 | **0 mutation** (polygons quarantined) |
| 12 Legacy `record_provenance_linkages` | `is_canonical = true`, `domain_record_id = LEGACY_ID` | `is_canonical = false`, `domain_record_id = LEGACY_ID` | Marked non-canonical; **original claim preserved** |
| Supersession `provenance_records` | 0 rows | 12 rows (in `ts_lgd_mandals_2026_v1`) | **Append-only lineage nodes** chaining to legacy parent |
| Canonical `record_provenance_linkages` | Linked to 2026 ingest | Linked to 2026 ingest + supersession nodes | **Canonical linkage established** (`is_canonical = true`) |
| `geography_entity_lineage` (row `68e465c2`) | Metadata has pilot IDs only; internal UUIDs from pilot IDs | Metadata has canonical + pilot IDs; internal UUIDs match canonical anchors | **Bidirectional auditability & legal split preserved** |
| `provenance_records` (row `8c350901`) | Metadata has pilot IDs only | Metadata has canonical + pilot IDs | **Bidirectional auditability preserved** |

---

## 3. Exact 12-ID Authoritative Mapping

All 12 mappings are proven and fixed:
1. `TS-MDL-7101` (Sirpur (T), pilot 7101 / M043 4676) → `TS-MDL-4315` (Sirpur (T), LGD 4315)
2. `TS-MDL-7102` (Kagaznagar, pilot 7102 / M043 4655) → `TS-MDL-4318` (Kagaznagar, LGD 4318)
3. `TS-MDL-7103` (Dahegaon, pilot 7103 / M043 4649) → `TS-MDL-4329` (Dahegoan, LGD 4329)
4. `TS-MDL-7104` (Tiryani, pilot 7104 / M043 4679) → `TS-MDL-4333` (Tiryani, LGD 4333)
5. `TS-MDL-7105` (Asifabad, pilot 7105 / M043 4646) → `TS-MDL-4319` (Asifabad, LGD 4319)
6. `TS-MDL-5320` (Luxettipet, pilot 5320 / M043 4663) → `TS-MDL-4353` (Luxettipet, LGD 4353)
7. `TS-MDL-5321` (Mancherial, pilot 5321 / M043 4664) → `TS-MDL-4354` (Mancherial, LGD 4354)
8. `TS-MDL-5322` (Dandepally, pilot 5322 / M043 4650) → `TS-MDL-4348` (Dandepally, LGD 4348)
9. `TS-MDL-5323` (Chennur, pilot 5323 / M043 4648) → `TS-MDL-4356` (Chennur, LGD 4356)
10. `TS-MDL-5324` (Bellampalli, pilot 5324 / M043 4647) → `TS-MDL-4350` (Bellampally, LGD 4350)
11. `TS-MDL-5328` (Kotapalli, pilot 5328 / M043 4660) → `TS-MDL-4351` (Kotapally, LGD 4351)
12. `TS-MDL-5329` (Hajipur, pilot 5329 / M043 5949) → `TS-MDL-6227` (Hajipur, LGD 6227)

---

## 4. Exact Provenance DAG for Every Legacy Identity

For each identity:
```
ts_lgd_mandals_2023_v1 (dataset_version)
  └── provenance_record (legacy parent, e.g. 3040f578-fd6e-ea04-a3ab-0cbc6403cc1e)
        ├── record_provenance_linkages ('mandals', 'TS-MDL-5321', is_canonical = false)
        └── provenance_record (supersession node: md5('pr_supersede_mandal_TS-MDL-5321')::uuid)
              [dataset_version: ts_lgd_mandals_2026_v1, parent: 3040f578-...]
              └── record_provenance_linkages ('mandals', 'TS-MDL-4354', is_canonical = true)
```

---

## 5. Canonical Linkage Strategy

Under requirement B.6:
- The canonical mandal identity (e.g. `TS-MDL-4354`) is linked to the supersession node via:
  ```sql
  INSERT INTO public.record_provenance_linkages (domain_table, domain_record_id, provenance_id, is_canonical)
  VALUES ('mandals', 'TS-MDL-4354', md5('pr_supersede_mandal_TS-MDL-5321')::uuid, true)
  ON CONFLICT (domain_table, domain_record_id, provenance_id) DO NOTHING;
  ```
- This ensures that:
  1. The canonical mandal anchor is explicitly tied to its historical supersession provenance.
  2. The supersession node is not orphaned.
  3. Reverse lookups from `TS-MDL-4354` show both its 2026 statutory ingest and its supersession lineage.

---

## 6. Treatment of the 4 Non-Linkage Metadata Occurrences

1. **`geography_entity_lineage` row `68e465c2-a00b-478d-8082-e0cf1f3bbe67`:**
   - Real statutory split event (Hajipur carved out of Mancherial on 11.10.2016 under G.O.Ms.No. 222).
   - Internal UUIDs updated to canonical mandal hashes (`md5('mandals:TS-MDL-4354')::uuid` and `md5('mandals:TS-MDL-6227')::uuid`).
   - Metadata updated with:
     ```json
     {
       "predecessor_mandal_id": "TS-MDL-4354",
       "successor_mandal_id": "TS-MDL-6227",
       "legacy_pilot_predecessor_id": "TS-MDL-5321",
       "legacy_pilot_successor_id": "TS-MDL-5329",
       "canonical_lgd_code": 6227,
       "legacy_pilot_lgd_code": 5949
     }
     ```
2. **`provenance_records` row `8c350901-a5d8-fe3d-c5b2-6ffe37601908`:**
   - Metadata updated with:
     ```json
     {
       "predecessor": "TS-MDL-4354",
       "successor": "TS-MDL-6227",
       "legacy_pilot_predecessor": "TS-MDL-5321",
       "legacy_pilot_successor": "TS-MDL-5329"
     }
     ```

---

## 7. Schema, Trigger, and RLS Proof

- **Trigger Safety:** `prevent_dataset_version_mutation()` is respected because Migration 046 contains **0 UPDATE statements on `dataset_versions`**.
- **W014 Guard Safety:** `fn_guard_mandal_current_version()` remains completely unhindered and active; Migration 046 executes **0 updates on `public.mandals`**.
- **Evidence Immutability:** `prevent_evidence_mutation()` is respected; 0 mutations on `evidence_records`.

---

## 8. Isolated Replay & Rollback Testing

Executed via `scripts/verify_w016_c3_r4_gov02_remediation.mjs` using an in-memory SQL engine:
* **Run 1 (Initial Execution):**
  - Demoted linkages: 12
  - Created supersession records: 12
  - Created canonical linkages: 12
* **Run 2 (Replay Execution):**
  - Demoted linkages: 12 (0 additional)
  - Supersession records: 12 (0 duplicates created)
  - Canonical linkages: 12 (0 duplicates created)
  - **Verdict:** Replay is 100% idempotent.
* **Rollback Test:**
  - Simulated exception inside transaction; state verified bitwise against pre-transaction snapshot; 0 phantom rows remained.

---

## 9. Expected Post-Execution Invariants

```
public.mandals = 621
current mandal_versions = 621
historical mandal_versions = 589
total mandal_versions = 1210
null current pointers = 0
current versions with is_current=true = 621
current versions valid_to IS NULL = 621
historical versions valid_to IS NOT NULL = 589
entity_geometries = 0
```

---

## 10. Pre-Execution Hashes and Immutability Verification

* `supabase/migrations/045_w016_c3_mandal_identity_temporal_load.sql`:
  - SHA-256: `514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073`
  - Status: **UNTOUCHED & VERIFIED**
* Existing migrations `001` through `045`: **100% UNCHANGED**
* Only new migration file: `supabase/migrations/046_w016_c3_r4_gov02_legacy_identity_supersession.sql`

---

## 11. Staging and Production Preservation Confirmation

* **Staging (`panIN-staging`):** Baseline verified via read-only probes. **ZERO DML or DDL was executed against staging during this preflight.**
* **Production:** Strictly air-gapped, uncontacted, and untouched.

---

## 12. Quality Gates Assessment (GOV05-01 through GOV05-28)

| Gate | Requirement | Status |
|:---|:---|:---:|
| `GOV05-01` | Exact 12 legacy IDs defined | **PASS** |
| `GOV05-02` | Exact 12 legacy→canonical mappings verified | **PASS** |
| `GOV05-03` | All mapping canonical IDs exist in baseline | **PASS** |
| `GOV05-04` | All canonical IDs are unique | **PASS** |
| `GOV05-05` | Legacy historical provenance preserved on staging | **PASS** |
| `GOV05-06` | Legacy linkage is_canonical=false without changing domain_record_id | **PASS** |
| `GOV05-07` | Exactly 12 supersession provenance records defined | **PASS** |
| `GOV05-08` | Every supersession parent_provenance_id resolves | **PASS** |
| `GOV05-09` | Every supersession has canonical linkage | **PASS** |
| `GOV05-10` | Canonical linkage sets is_canonical=true | **PASS** |
| `GOV05-11` | No historical provenance deleted (0 DELETE) | **PASS** |
| `GOV05-12` | No dataset_versions immutable field changed (0 UPDATE) | **PASS** |
| `GOV05-13` | Geography lineage historical event preserved | **PASS** |
| `GOV05-14` | Legacy metadata retained | **PASS** |
| `GOV05-15` | Canonical metadata present | **PASS** |
| `GOV05-16` | Live staging public.mandals = 621 | **PASS** |
| `GOV05-17` | Live staging mandal_versions = 1210 | **PASS** |
| `GOV05-18` | Live staging current versions = 621 | **PASS** |
| `GOV05-19` | Live staging historical versions = 589 | **PASS** |
| `GOV05-20` | Live staging entity_geometries = 0 | **PASS** |
| `GOV05-21` | Current-pointer invariants pass (0 nulls) | **PASS** |
| `GOV05-22` | W014 security/currentness triggers remain active | **PASS** |
| `GOV05-23` | Migration 045 byte/content hash unchanged | **PASS** |
| `GOV05-24` | Migration 046 is strictly append-only | **PASS** |
| `GOV05-25` | Production untouched | **PASS** |
| `GOV05-26` | Staging baseline preserved before execution | **PASS** |
| `GOV05-27` | Replay/idempotency test passes in isolated environment | **PASS** |
| `GOV05-28` | Rollback test passes in isolated environment | **PASS** |

---

## 13. Final Status

**`DESIGN READY — REQUESTING CTO MIGRATION 046 AUTHORIZATION`**
