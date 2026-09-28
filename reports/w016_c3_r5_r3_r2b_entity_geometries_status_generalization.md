# W016-C3-R5-R3-R2B: Generic Status Generalization & W016 Status Boundary

**Directive:** W016-C3-R5-R3-R2B — CTO AUTHORIZATION: GENERIC STATUS GENERALIZATION & W016 STATUS BOUNDARY  
**Execution Timestamp:** 2026-09-28T04:12:08.286Z  
**Canonical Git HEAD:** `17b4b7fdffc30d522e9cc0e3cbabdaf6eb3f0f7a`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED**)  
**Verification Classification:** **STATIC / ISOLATED-PACKAGE VERIFICATION ONLY**  
**Final Status:** **ENTITY_GEOMETRIES STATUS GENERALIZATION COMPLETE — READY FOR CTO REVIEW**

---

## 1. Executive Summary & Live State Determination

Under CTO Directive W016-C3-R5-R3-R2B, the status semantics of `public.entity_geometries` have been architecturally decoupled into:
1. **Generic Reusable Schema:** The canonical table defines `status public.data_status_enum NOT NULL DEFAULT 'UNKNOWN'`. It contains **zero** CHECK constraints forcing `status = 'OFFICIAL'`. Any legitimate canonical W012 enum value (`OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`) is permitted on insert. Universal status immutability is strictly enforced post-insert via `trg_prevent_entity_geometry_mutation` (`NEW.status IS DISTINCT FROM OLD.status` raises SQLSTATE `23514`).
2. **W016 Ingestion Contract:** The requirement for `status = 'OFFICIAL'` is enforced **exclusively** at the W016 ingestion contract / pre-check gate, because the TGRAC 2016 statutory baseline dataset has been independently certified as OFFICIAL. Non-OFFICIAL rows submitted to the W016 pipeline are rejected by the ingestion contract, not by a generic table constraint.

### Live Catalog Forensic State
- **Migration 048 Ledger State:** `048 NOT EXECUTED — SCHEMA ABSENT`
- **`public.entity_geometries` Existence:** Absent from live staging catalog (HTTP 404 / PGRST205)
- **Live Row Count:** Exactly `0` rows (Zero geometry ingestion has occurred)
- **Production Status:** `ehfafcnimmjusyvplbah` completely uncontacted and air-gapped

---

## 2. Exact Canonical W012 Enum Evidence

The canonical vocabulary was established in W012 Migration 039 (`supabase/migrations/039_data_governance_foundation.sql`, lines 32–42):

```sql
CREATE TYPE data_status_enum AS ENUM (
  'OFFICIAL',
  'DERIVED',
  'VERIFIED',
  'ESTIMATE',
  'SCENARIO',
  'INFERRED',
  'UNVERIFIED',
  'UNKNOWN'
);
```

- **Canonical Values (8):** `OFFICIAL`, `DERIVED`, `VERIFIED`, `ESTIMATE`, `SCENARIO`, `INFERRED`, `UNVERIFIED`, `UNKNOWN`
- **Non-Canonical Terms Purged:** `SUPERSEDED`, `DEPRECATED`, `PROVISIONAL`
- **Preservation:** Migration 039 and `public.data_status_enum` remain 100% untouched.

---

## 3. Generic-vs-W016 Boundary Matrix

| Architectural Dimension | Generic `public.entity_geometries` Schema | W016 Ingestion Contract | Governance Location |
| :--- | :--- | :--- | :--- |
| **Status Column Typing** | `public.data_status_enum NOT NULL DEFAULT 'UNKNOWN'` | Validates statutory payload status | Table DDL |
| **Status Permissibility** | Permits all 8 canonical W012 enum values | Requires strictly `'OFFICIAL'` | Generic Schema vs Ingestion Gate |
| **Status Check Constraint** | **NONE** (Zero generic CHECK constraints forcing OFFICIAL) | N/A (Contract enforces via pre-check) | Generic Schema DDL |
| **Status Immutability** | Universal immutability (`NEW.status IS DISTINCT FROM OLD.status` -> `23514`) | Assumes permanent immutability once persisted | `trg_prevent_entity_geometry_mutation` |
| **`dataset_version_id`** | Foreign key to `dataset_versions(id)` ON DELETE RESTRICT | Pinned to `'tgrac_mandals_2016_v1'` | FK Constraint vs Ingestion Payload |
| **`provenance_id`** | Generic lineage parity trigger (`NEW.dataset_version_id = prov.dataset_version_id`) | Pinned to `'e0160000-0000-0002-0000-000000000001'` | Generic Trigger vs Ingestion Payload |
| **Verification Evidence** | Lineage trigger asserts evidence exists in `evidence_records` | Pinned to `'e0160000-0000-0000-0000-000000001013'` | Generic Trigger vs Ingestion Payload |
| **`raw_artifact_sha256`** | Row-level `TEXT NOT NULL` (no table-wide CHECK constraint) | Pinned to `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | Row column vs Ingestion Payload |
| **`snapshot_date`** | Row-level `DATE NOT NULL` (no table-wide CHECK constraint) | Pinned to `2016-10-11` | Row column vs Ingestion Payload |
| **`is_current` Lifecycle** | `false -> true` prohibited if `temporal_classification = 'historical_statutory_baseline'` | Pinned to `is_current = false` (statutory baseline) | Trigger & CHECK constraint |
| **`valid_to` Lifecycle** | Closed `valid_to` cannot be shifted; `NULL -> date >= valid_from` allowed | Populated per Cohort A/B/C/D | Trigger & CHECK constraint |

---

## 4. Generic Reusability & Status Boundary Tests (G1–G6)

The verification suite (`supabase/verify_staging_migration_package_048.sql`) includes tests G1–G6 executed in transaction-isolated preflight:

| Test ID | Test Description | Status Input | Expected Outcome | Observed Outcome | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **G1** | Legitimate generic entity_geometry with status `VERIFIED` is accepted | `VERIFIED` | `INSERT SUCCESS` | Accepted by generic schema | **PASS** |
| **G2** | Legitimate generic entity_geometry with status `DERIVED` is accepted | `DERIVED` | `INSERT SUCCESS` | Accepted by generic schema | **PASS** |
| **G3** | Legitimate generic entity_geometry with status `UNVERIFIED` is accepted | `UNVERIFIED` | `INSERT SUCCESS` | Accepted by generic schema | **PASS** |
| **G4** | Status mutation on generic record is rejected with SQLSTATE 23514 | `VERIFIED -> OFFICIAL` | `SQLSTATE 23514` | Rejected by immutability trigger | **PASS** |
| **G5** | W016 ingestion fixture with status `OFFICIAL` succeeds under W016 contract | `OFFICIAL` | `INSERT SUCCESS` | Passes contract pre-check & inserts | **PASS** |
| **G6** | W016 ingestion fixture with non-OFFICIAL status is rejected by W016 contract | `DERIVED` | Contract Rejection | Rejected specifically by W016 contract; NOT by generic table constraint | **PASS** |

### Test G6 Architectural Distinction
In Test G6, the fixture uses `status = 'DERIVED'`. Test G2 already established that `public.entity_geometries` permits `'DERIVED'`. When submitted to the W016 pipeline, the W016 Ingestion Contract pre-check raises:
```
W016 INGESTION CONTRACT VIOLATION: statutory baseline geometry must have status OFFICIAL, received DERIVED
```
The test asserts that this specific exception was raised and that execution halted before database write, proving that the restriction is strictly domain/contract-level and does not pollute the generic schema.

---

## 5. Lineage, Idempotency & Lifecycle Regression Matrix

### Generic Lineage Matrix (L1–L6)
- **L1 (Case A):** Valid dataset/provenance parity -> **PASS**
- **L2 (Case B):** Dataset mismatch (`entity_geometries.dataset_version_id != prov.dataset_version_id`) -> **PASS** (SQLSTATE `23514`)
- **L3 (Case C):** Provenance with NULL `verification_evidence_id` -> **PASS** (SQLSTATE `23514`)
- **L4 (Case D):** Provenance referencing missing evidence record -> **PASS** (SQLSTATE `23503`)
- **L5 (Case E):** Non-existent `provenance_id` -> **PASS** (SQLSTATE `23503`)
- **L6 (Case F):** Future spatial dataset & evidence (`future_cartographic_2026_v1`) -> **PASS** (Reusability proven)

### Fail-Closed Idempotency Matrix (I1–I8)
- **I1 (Case A):** Exact replay with bit-exact identity verification -> **PASS** (IDEMPOTENT SUCCESS)
- **I2 (Case B):** Conflicting snapshot date -> **PASS** (Unique violation `23505`)
- **I3 (Case C):** Conflicting geometry coordinates -> **PASS** (Unique violation `23505`)
- **I4 (Case D):** Conflicting provenance reference -> **PASS** (Unique violation `23505`)
- **I5 (Case E):** Conflicting raw artifact SHA -> **PASS** (Unique violation `23505`)
- **I6 (Case F):** Conflicting source FID collision -> **PASS** (Caught by 1:1 ingestion pre-check)
- **I7 (Case G):** Replay retry verification -> **PASS** (Exactly 1 row persists)
- **I8 (Case H):** Conflicting replay check -> **PASS** (Explicit exception `23514`, never silent `DO NOTHING`)

### Controlled Lifecycle Mutability Matrix (M1–M5)
- **M1:** Permitted lifecycle update: `valid_to` closure (`NULL -> date >= valid_from`) -> **PASS**
- **M2:** Forbidden status mutation (`OFFICIAL -> VERIFIED`) -> **PASS** (SQLSTATE `23514`)
- **M3:** Forbidden coordinate alteration -> **PASS** (SQLSTATE `23514`)
- **M4:** Forbidden `valid_to` shift on closed record -> **PASS** (SQLSTATE `23514`)
- **M5:** Forbidden `is_current = true` on historical statutory baseline -> **PASS** (SQLSTATE `23514`)

---

## 6. Audit of Hardcoded W016 Tokens in Migration 048

A strict regex audit was performed on `supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql` for candidate hardcoded tokens:
- `OFFICIAL`: **0 occurrences** (status defaults to `'UNKNOWN'`, comment generalized)
- `tgrac_mandals_2016_v1`: **0 occurrences**
- `e0160000-0000-0000-0000-000000001013`: **0 occurrences**
- `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`: **0 occurrences**
- `2016-10-11`: **0 occurrences**

The reusable canonical schema DDL is **100% free of W016-specific literals**.

---

## 7. Artifact Integrity Coordinates

| Artifact | File Path | SHA-256 Checksum | Match Status |
| :--- | :--- | :--- | :--- |
| **Migration 048 DDL** | `supabase/migrations/048_w016_c3_r5_r3_entity_geometries_schema.sql` | `34ef993153c675024d014d2fd210df3295235627f609e1feec8e7f5541a955ed` | Canonical Source |
| **Staging Migration Package** | `supabase/staging_migration_package_048.sql` | `34ef993153c675024d014d2fd210df3295235627f609e1feec8e7f5541a955ed` | **Byte-for-byte match** |
| **Verification Suite** | `supabase/verify_staging_migration_package_048.sql` | `d9c4f4c8c96159cd7e70ad126c3242e9b86340e91bec86f0f08e9c13eb73a8c4` | Includes G1–G6 |
| **Preflight Test Suite** | `tests/test_w016_c3_r5_r3_preflight.mjs` | `4d89968ec770368e26f264507c040f760452993251846fb2c28197c68fb8c862` | 43/43 PASS |
| **Authoritative TGRAC JSON** | `data/geo/candidate_authoritative/tgrac_mandals_raw.json` | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | Matches canonical SHA |

---

## 8. Terminal Status & Verification Classification

**Verification Classification:** **STATIC / ISOLATED-PACKAGE VERIFICATION ONLY**  
All tests represent transaction-isolated behavioral preflight and static DDL/AST inspection. Migration 048 remains **unexecuted** in the live database catalog (`048 NOT EXECUTED — SCHEMA ABSENT`). Strictly **0** real geometry rows exist.

**Final Status:**  
```
ENTITY_GEOMETRIES STATUS GENERALIZATION COMPLETE — READY FOR CTO REVIEW
```
