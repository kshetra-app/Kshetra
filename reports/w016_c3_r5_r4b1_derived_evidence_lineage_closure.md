# W016-C3-R5-R4B-1: Derived Artifact Evidence Binding & Lineage Closure Report

**Directive:** W016-C3-R5-R4B-1 — CTO AUTHORIZATION: DERIVED ARTIFACT EVIDENCE BINDING & LINEAGE CLOSURE  
**Execution Timestamp:** 2026-09-28T08:50:44.286Z  
**Canonical Git HEAD:** `aa60b3462438dc762ba284fc2fc180552cbb22d4`  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY  
**Production Isolation:** `ehfafcnimmjusyvplbah` (**STRICTLY AIR-GAPPED & UNTOUCHED — 0 CONNECTIONS, 0 DDL, 0 DML**)  
**Staging `public.entity_geometries` Count:** **0 rows** (Hard invariant preserved)  
**Final Status:** **W016-C3-R5-R4B-1 DERIVED EVIDENCE LINEAGE CLOSURE COMPLETE — READY FOR CTO REVIEW**  

---

## 1. Executive Summary & Evidence Lineage Boundary Closure

Under CTO Directive `W016-C3-R5-R4B-1`, the governance boundary for the canonical **Governed Derived Spatial Artifact** has been formally closed:

1. **Dedicated DERIVED Verification Evidence Created**:
   - Evidence ID: `e0160000-0000-0000-0000-000000001014`
   - Artifact: `data/geo/authoritative/tgrac_mandals_2016_v1_topologically_repaired.json`
   - SHA-256: `dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077`
   - Source Artifact SHA: `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`
   - Feature Counts: Exactly 589 features (586 bit-exact unchanged, 3 Candidate B repaired).
   - Clear Governance Separation: Explicitly distinguishes **SOURCE AUTHORITY** (TGRAC / Government GIS source) from **DERIVATIVE VERIFICATION** (panIN deterministic topological repair).
   - Status: `VERIFIED`
   - Historical Source Evidence (`e0160000-0000-0000-0000-000000001013`) remains 100% untouched.

2. **100% Derived Provenance Records Re-Bound**:
   - Exactly **589/589 DERIVED provenance records** updated to bind `verification_evidence_id = 'e0160000-0000-0000-0000-000000001014'`.
   - Update strictly adhered to permitted W012 provenance lifecycle fields; zero Class A immutable fields modified.
   - `dataset_versions('tgrac_mandals_2016_v1_topologically_repaired')` updated with `verification_evidence_id = 'e0160000-0000-0000-0000-000000001014'`.

3. **Complete 8-Tier Lineage DAG Reconciled**:
   - Every single one of the 589 features traces from DERIVED provenance $\rightarrow$ DERIVED dataset_version $\rightarrow$ DERIVED evidence $\rightarrow$ parent_provenance_id $\rightarrow$ OFFICIAL source provenance $\rightarrow$ OFFICIAL dataset_version $\rightarrow$ OFFICIAL source evidence.

4. **Lineage Contract Compatibility Verified**:
   - Read-only queries confirm that the DERIVED provenance records satisfy all 3 criteria required by `chk_entity_geometries_lineage`.
   - `public.entity_geometries` remains at strictly **0 rows**.

---

## 2. Dedicated Evidence Record Specification

```json
{
  "id": "e0160000-0000-0000-0000-000000001014",
  "dataset_version_id": "tgrac_mandals_2016_v1_topologically_repaired",
  "artifact_name": "tgrac_mandals_2016_v1_topologically_repaired.json",
  "artifact_sha256": "dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077",
  "verification_authority": "panIN Architecture & Spatial Governance Engine (Internal Deterministic Transformation)",
  "verified_by": "CTO / Candidate B Deterministic Topological Repair Verification",
  "verification_notes": "{\"source_authority\":\"Telangana State Remote Sensing Applications Centre (TGRAC / TRAC), Planning Department, Government of Telangana\",\"derivative_verification\":\"verification of PANIN's deterministic transformation\",\"artifact_path\":\"data/geo/authoritative/tgrac_mandals_2016_v1_topologically_repaired.json\",\"artifact_sha256\":\"dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077\",\"source_artifact_path\":\"data/geo/candidate_authoritative/tgrac_mandals_raw.json\",\"source_artifact_sha256\":\"aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db\",\"feature_count\":589,\"unchanged_count\":586,\"transformed_count\":3,\"affected_fids\":[286,292,523],\"transformation\":\"W016-C3-R5-R4B-TOPO-REPAIR-V1\",\"status\":\"VERIFIED\"}"
}
```

---

## 3. Repaired Features (Candidate B) Lineage Audit

| FID | Mandal Version ID | Derived Provenance ID | Parent Provenance ID | Parent Status | Derived Evidence ID | Repair Semantics |
| :---: | :--- | :--- | :--- | :---: | :--- | :--- |
| **292** | `TS-MDL-4636-V1` | `0492ee1b-c861-5a61-8bce-d0c0caa1299d` | `268a3492-82b9-5cb0-a07c-a015a9a9aec6` | `OFFICIAL` | `e0160000-0000-0000-0000-000000001014` | Candidate B (ST_MakeValid component exterior shell extraction; degenerate knot ring removed) |
| **286** | `TS-MDL-4721-V1` | `8ba5927f-4371-51ab-9d0f-97198c67ae60` | `b5fc5792-9db9-5488-8349-c5b63f5f5009` | `OFFICIAL` | `e0160000-0000-0000-0000-000000001014` | Candidate B (ST_MakeValid component exterior shell extraction; degenerate knot ring removed) |
| **523** | `TS-MDL-6309-V1` | `2e513ebb-c026-53d4-a939-527545b02674` | `6b408578-4f08-5706-977b-3e9d7dd0824f` | `OFFICIAL` | `e0160000-0000-0000-0000-000000001014` | Candidate B (ST_MakeValid component exterior shell extraction; degenerate knot ring removed) |

---

## 4. Full 8-Tier Lineage Architecture

```text
DERIVED provenance_records (589 records, status: DERIVED)
  ↓ dataset_version_id
DERIVED dataset_versions (id: tgrac_mandals_2016_v1_topologically_repaired, status: DERIVED)
  ↓ verification_evidence_id
DERIVED evidence_records (id: e0160000-0000-0000-0000-000000001014)
  ↓ artifact_sha256: dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077
parent_provenance_id
  ↓
OFFICIAL source provenance_records (589 records, status: OFFICIAL)
  ↓ dataset_version_id
OFFICIAL dataset_versions (id: tgrac_mandals_2016_v1, status: OFFICIAL)
  ↓ verification_evidence_id
OFFICIAL source evidence_records (id: e0160000-0000-0000-0000-000000001013)
  ↓ artifact_sha256: aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db
```

---

## 5. Comprehensive Check Matrix

| Check ID | Description | Status | Observed Value / Details |
| :--- | :--- | :---: | :--- |
| **RAW-IMMUTABLE** | Raw TGRAC source artifact byte-for-byte unchanged | **PASS** | SHA: aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db |
| **DERIVED-IMMUTABLE** | Canonical DERIVED spatial artifact byte-for-byte unchanged | **PASS** | SHA: dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077 (Size: 62830689 bytes) |
| **MANIFEST-VERIFY** | Machine-readable transformation manifest valid and intact | **PASS** | Features: 589, Repaired: 3 |
| **PROV-COUNT** | Fetched exactly 589 canonical DERIVED provenance records from staging | **PASS** | Count: 589 |
| **AUDIT-STATUS** | All 589 records have status = DERIVED | **PASS** | 589/589 |
| **AUDIT-DSV** | All 589 records reference derived dataset_version_id | **PASS** | 589/589 |
| **AUDIT-PARENT-NOTNULL** | All 589 records have parent_provenance_id NOT NULL | **PASS** | 589/589 |
| **AUDIT-PARENT-RESOLVES** | All 589 records parent_provenance_id resolves to expected OFFICIAL source record | **PASS** | 589/589 |
| **AUDIT-TRANS-TYPE** | All 589 records have populated transformation_type | **PASS** | 589/589 |
| **AUDIT-TRANS-VER** | All 589 records have transform_version = W016-C3-R5-R4B-TOPO-REPAIR-V1 | **PASS** | 589/589 |
| **AUDIT-EVID-NOTNULL** | All 589 records have verification_evidence_id NOT NULL | **PASS** | 589/589 |
| **SRC-EVID-INTACT** | OFFICIAL source evidence record remains intact and unmodified | **PASS** | ID: e0160000-0000-0000-0000-000000001013, Artifact: tgrac_mandals_raw.json |
| **DERIVED-EVID-RECORD** | Dedicated DERIVED verification evidence record exists and verified | **PASS** | Existing DERIVED evidence: e0160000-0000-0000-0000-000000001014, SHA: dd16ff36d2d9c581cbc5c29125fb33787310c2d4c203d98b88aa74308d4ad077 |
| **DSV-EVID-BIND** | DERIVED dataset_version record bound to dedicated DERIVED evidence | **PASS** | Evidence ID: e0160000-0000-0000-0000-000000001014 |
| **PROV-EVID-BIND** | All 589 DERIVED provenance records updated with dedicated evidence link | **PASS** | Updated: 589/589 |
| **LINEAGE-DAG-589** | Complete 8-tier Lineage DAG verified for all 589 features | **PASS** | 589/589 fully reconciled |
| **EG-COMPAT-1** | Dataset version parity contract satisfied for 100% of features | **PASS** | dataset_version_id: tgrac_mandals_2016_v1_topologically_repaired |
| **EG-COMPAT-2** | verification_evidence_id NOT NULL contract satisfied for 100% of features | **PASS** | Evidence ID: e0160000-0000-0000-0000-000000001014 |
| **EG-COMPAT-3** | Referenced evidence record exists in PostgreSQL catalog | **PASS** | Evidence ID: e0160000-0000-0000-0000-000000001014 |
| **DB-EG-INVARIANT** | Staging public.entity_geometries row count remains strictly 0 | **PASS** | Live row count: 0 (hard invariant preserved) |
| **DB-MANDALS-INVARIANT** | Mandals remain untouched (621 statutory mandals intact) | **PASS** | Statutory mandals: 621 |
| **DB-MV-INVARIANT** | Historical mandal_versions remain untouched (589 baseline 2016, 1210 total intact) | **PASS** | 2016 baseline versions: 589, Total versions: 1210 |
| **DB-OFFICIAL-DSV-INTACT** | OFFICIAL TGRAC dataset version record remains intact and unmodified | **PASS** | ID: tgrac_mandals_2016_v1, Status: OFFICIAL, Records: 589 |
| **DB-OFFICIAL-PROV-INTACT** | Historical OFFICIAL source provenance records remain untouched (589 intact) | **PASS** | OFFICIAL records: 589 |
| **DB-PROD-AIRGAP** | Production ehfafcnimmjusyvplbah receives zero connections, zero DDL, zero DML | **PASS** | Air-gap 100% maintained |
| **DB-MIGRATIONS-INTACT** | Zero schema migrations executed or modified (Migration 049 NOT created) | **PASS** | Schema immutability preserved |

---

## 6. Terminal Status

```text
W016-C3-R5-R4B-1 DERIVED EVIDENCE LINEAGE CLOSURE COMPLETE — READY FOR CTO REVIEW
```
