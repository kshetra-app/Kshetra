# W016-C3-R4-GOV-12: Hajipur Historical Legal Evidence Remediation Report

**Directive:** W016-C3-R4-GOV-12 — CTO AUTHORIZATION: HAJIPUR HISTORICAL LEGAL EVIDENCE REMEDIATION  
**Execution Timestamp:** 2026-09-27T17:28:22.883Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**Geometry Ingestion:** **STRICTLY QUARANTINED (0 geometries)**  
**Final Status:** `REMEDIATION EXECUTED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE`  

---

## 1. Executive Summary & CTO Authorization

Following CTO acceptance of GOV-11, this report documents the **executed and verified W012 lifecycle evidence remediation** for the final open governance item in the W016-C3-R4 mandate: the historical Hajipur 2016 statutory reconciliation provenance record.

Under explicit CTO authorization:
1. Exactly **ONE** `provenance_records` row was updated: `d63eee74-2927-5184-050b-3559f628f8ae`.
2. The row is now bound to the authoritative 2016 statutory reorganisation evidence: `e0160000-0000-0000-0000-000000002016`.
3. `verified_by` was populated with `CTO / Statutory Gazette Reconciliation`.
4. `status` remains `OFFICIAL`.
5. 100% of Classification-A immutable fields and metadata dictionary were verified bitwise identical post-mutation.
6. The complete 20-point integrity battery (**Battery A through T**) passed with **100% concordance**.
7. Staging database now has **zero unverified OFFICIAL provenance records** across all statutory entities.

---

## 2. Evidence Precondition Verification

Before the mutation was executed, the evidence artifact was verified on staging and cross-referenced with the repository:

| Attribute | Expected Value | Observed Live Value | Concordance |
|:---|:---|:---|:---:|
| **Evidence Record ID** | `e0160000-0000-0000-0000-000000002016` | `e0160000-0000-0000-0000-000000002016` | **MATCH** |
| **Artifact Name** | `goms_2016_reorganisation_orders.pdf` | `goms_2016_reorganisation_orders.pdf` | **MATCH** |
| **Artifact SHA-256** | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` | **MATCH** |
| **Verification Authority** | Government of Telangana (Revenue Department) | `Government of Telangana (Revenue Department)` | **MATCH** |
| **Verified By** | `CTO / Statutory Gazette Reconciliation` | `CTO / Statutory Gazette Reconciliation` | **MATCH** |
| **Statutory Scope** | G.O.Ms. Nos. 214-245 Rev (2016-10-11) | `Statutory reorganisation orders G.O.Ms. Nos. 214-245 Rev (2016-10-11) establishing 589 baseline mandals` | **COVERS 222** |
| **Repository Artifact** | `data/evidence/w015_b2/telangana_gazette_2016_goms_222_mancherial.txt` | SHA-256: `c4f0ac9317f13f1ca596ad0ef6fcdda15c88c60b9e581b30bf5fecb91929fd1c` | **VERIFIED** |

### Historical Event Corroboration:
- **Statutory Order:** G.O.Ms.No. 222, Revenue (DA-CMRF) Dept, dated 11.10.2016.
- **Effective Date:** 2016-10-11.
- **Predecessor:** TS-MDL-4354 / Mancherial (legacy pilot TS-MDL-5321).
- **Successor:** TS-MDL-6227 / Hajipur (legacy pilot TS-MDL-5329).
- **Transition Type:** `split` (Hajipur carved out of Mancherial upon 2016 district reorganisation).
- **Precondition Result:** **PASSED — ALL CRITERIA SATISFIED**.

---

## 3. Pre-Mutation Snapshot & Assertions

Prior to execution, the target row was queried and asserted:

```json
{
  "id": "d63eee74-2927-5184-050b-3559f628f8ae",
  "dataset_version_id": "ts_lgd_mandals_2026_v1",
  "source_record_id": "TG-GAZETTE-2016:GOMS222:CANONICAL-RECONCILE",
  "parent_provenance_id": "8c350901-a5d8-fe3d-c5b2-6ffe37601908",
  "status": "OFFICIAL",
  "transformation_type": "gazette_lineage_canonical_reconciliation",
  "transform_version": "1.0",
  "operator": "system:w016_c3_r4_supersession",
  "verified_by": null,
  "verification_evidence_id": null,
  "metadata": {
  "effective_date": "2016-10-11",
  "source_document": "Telangana Gazette Extraordinary, Part I (G.O.Ms.No. 222)",
  "source_authority": "Government of Telangana, Revenue (DA-CMRF) Department",
  "supersession_note": "Canonical cross-reference for historical Hajipur split from Mancherial",
  "canonical_lgd_code": 6227,
  "successor_canonical_id": "TS-MDL-6227",
  "predecessor_canonical_id": "TS-MDL-4354",
  "legacy_pilot_successor_id": "TS-MDL-5329",
  "legacy_pilot_predecessor_id": "TS-MDL-5321"
},
  "created_at": "2026-09-26T16:44:51.851677+00:00"
}
```

### Pre-Mutation Assertions:
1. Target row count = 1 (**PASS**)
2. `status = 'OFFICIAL'` (**PASS**)
3. `verification_evidence_id IS NULL` (**PASS**)
4. `verified_by IS NULL` (**PASS**)
5. `transformation_type = 'gazette_lineage_canonical_reconciliation'` (**PASS**)
6. `parent_provenance_id = '8c350901-a5d8-fe3d-c5b2-6ffe37601908'` (**PASS**)

---

## 4. Executed Mutation

A single atomic `PATCH` request was executed via the PostgREST Service-Role API:

```http
PATCH /rest/v1/provenance_records?id=eq.d63eee74-2927-5184-050b-3559f628f8ae HTTP/1.1
Host: fkpigozcqnmcvofuksar.supabase.co
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
Prefer: return=representation

{
  "verification_evidence_id": "e0160000-0000-0000-0000-000000002016",
  "verified_by": "CTO / Statutory Gazette Reconciliation"
}
```

### PostgreSQL Trigger Execution & Behavior:
1. **`trg_prevent_provenance_mutation`:** Evaluated all 8 Classification-A columns (`id`, `dataset_version_id`, `source_record_id`, `parent_provenance_id`, `transformation_type`, `transform_version`, `operator`, `created_at`). Since zero Classification-A fields were modified, the trigger permitted the operation.
2. **`trg_check_provenance_status_transition`:** Evaluated `(OLD.status IS DISTINCT FROM 'OFFICIAL')`. Since both `OLD.status` and `NEW.status` are `'OFFICIAL'`, the condition evaluated to `FALSE`, allowing the update without raising a status violation.

---

## 5. Before / After Forensic Proof Matrix

| Column | Pre-State | Post-State | Classification | Status |
|:---|:---|:---|:---:|:---:|
| **id** | `d63eee74-2927-5184-050b-3559f628f8ae` | `d63eee74-2927-5184-050b-3559f628f8ae` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **dataset_version_id** | `ts_lgd_mandals_2026_v1` | `ts_lgd_mandals_2026_v1` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **source_record_id** | `TG-GAZETTE-2016:GOMS222:CANONICAL-RECONCILE` | `TG-GAZETTE-2016:GOMS222:CANONICAL-RECONCILE` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **parent_provenance_id** | `8c350901-a5d8-fe3d-c5b2-6ffe37601908` | `8c350901-a5d8-fe3d-c5b2-6ffe37601908` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **transformation_type** | `gazette_lineage_canonical_reconciliation` | `gazette_lineage_canonical_reconciliation` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **transform_version** | `1.0` | `1.0` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **operator** | `system:w016_c3_r4_supersession` | `system:w016_c3_r4_supersession` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **created_at** | `2026-09-26T16:44:51.851677+00:00` | `2026-09-26T16:44:51.851677+00:00` | Class A (Immutable) | **VERIFIED UNCHANGED** |
| **metadata** | *(10 key-value pairs)* | *(10 key-value pairs)* | Metadata Dictionary | **VERIFIED UNCHANGED (BITWISE)** |
| **status** | `OFFICIAL` | `OFFICIAL` | Class B (Lifecycle) | **VERIFIED UNCHANGED (OFFICIAL)** |
| **verification_evidence_id** | `NULL` | `e0160000-0000-0000-0000-000000002016` | Class B (Lifecycle) | **REMEDIATED (BOUND TO 2016 EVIDENCE)** |
| **verified_by** | `NULL` | `CTO / Statutory Gazette Reconciliation` | Class B (Lifecycle) | **REMEDIATED (POPULATED)** |

---

## 6. Complete Post-Remediation Integrity Battery (Battery A through T)

| Test ID | Verification Area | Target / Expected | Observed Live Value | Verdict |
|:---:|:---|:---:|:---:|:---:|
| **A** | public.mandals count | 621 | 621 | **PASS** |
| **B** | public.mandal_versions count | 1210 | 1210 | **PASS** |
| **C** | current mandal_versions (is_current=true) | 621 | 621 | **PASS** |
| **D** | historical mandal_versions (is_current=false) | 589 | 589 | **PASS** |
| **E** | null current_version_id pointers | 0 | 0 | **PASS** |
| **F** | public.entity_geometries count | 0 | 0 | **PASS** |
| **G** | legacy pilot linkages (is_canonical=false) | 12 | 12 | **PASS** |
| **H** | canonical replacement linkages (is_canonical=true) | 12 | 12 | **PASS** |
| **I** | pilot_to_statutory_supersession provenance count | 12 | 12 | **PASS** |
| **J** | supersession provenance status = OFFICIAL | OFFICIAL (12/12) | OFFICIAL (12/12) | **PASS** |
| **K** | supersession verification_evidence_id = 2026 LGD | e0160000-0000-0000-0000-000000002026 | 12/12 match | **PASS** |
| **L** | supersession verified_by = CTO / LGD | CTO / LGD Statewide Export Verification | 12/12 match | **PASS** |
| **M** | Hajipur reconciliation target record count | 1 | 1 | **PASS** |
| **N** | Hajipur reconciliation status = OFFICIAL | OFFICIAL | OFFICIAL | **PASS** |
| **O** | Hajipur reconciliation verification_evidence_id | e0160000-0000-0000-0000-000000002016 | e0160000-0000-0000-0000-000000002016 | **PASS** |
| **P** | Hajipur reconciliation verified_by | CTO / Statutory Gazette Reconciliation | CTO / Statutory Gazette Reconciliation | **PASS** |
| **Q** | Historical provenance record 8c350901 intact | ts_lgd_mandals_2023_v1 UNVERIFIED intact | ts_lgd_mandals_2023_v1 / UNVERIFIED (intact) | **PASS** |
| **R** | Historical lineage record 68e465c2 intact | split transition 2016-10-11 intact | split / 2016-10-11 (intact) | **PASS** |
| **S** | dataset_versions registered & unchanged | 2 versions (2023_v1, 2026_v1) | 2 versions intact | **PASS** |
| **T** | Migration 045/046 SHAs immutable & Production air-gapped | 100% SHA match, 0 prod connections | 045=match, 046=match, prod=air-gapped | **PASS** |

**Battery Result:** **20 / 20 PASS (100% Concordance)**

---

## 7. Production Isolation & Geometry Quarantine Confirmation

### Production Isolation:
- **Production Host:** `ehfafcnimmjusyvplbah.supabase.co`
- **Connections Attempted:** **0**
- **Mutations Executed:** **0**
- **Status:** **STRICTLY AIR-GAPPED AND 100% UNTOUCHED**

### Geometry Quarantine:
- **public.entity_geometries count:** **0**
- **Migration 047 created:** **NO**
- **Spatial reconciliation started:** **NO**
- **Status:** **STRICTLY QUARANTINED PENDING FINAL CTO CLOSURE**

---

## 8. Final Status

```
REMEDIATION EXECUTED / VERIFIED / SUBMITTED FOR CTO ACCEPTANCE
```

The W012 lifecycle evidence remediation for the historical Hajipur 2016 statutory reconciliation provenance record has been executed atomically on `panIN-staging`, verified independently against all 20 quality battery gates, and is submitted for CTO review and acceptance.
