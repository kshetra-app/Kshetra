# W016-C3-R4-GOV-09: W012 OFFICIAL-Provenance Evidence Governance Remediation Forensic Report

**Directive:** W016-C3-R4-GOV-09 — W012 OFFICIAL-PROVENANCE EVIDENCE GOVERNANCE REMEDIATION FORENSIC  
**Investigation Timestamp:** 2026-09-26T17:08:00.000Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) ONLY (Strictly Read-Only Forensic Mode)  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**DML / DDL Executed:** **STRICTLY ZERO (Zero Mutations on Live Staging)**  
**Final Status:** `DESIGN COMPLETE — READY FOR CTO REMEDIATION AUTHORIZATION`  

---

## 1. Executive Forensic Finding

During the independent verification of Migration 046 under **W016-C3-R4-GOV-08**, the following governance condition was detected and documented:
1. Migration 046 successfully executed as a single atomic transaction.
2. 12 legacy linkages were demoted to `is_canonical = false` while preserving their historical identities.
3. 12 append-only supersession provenance records were inserted under dataset version `ts_lgd_mandals_2026_v1`.
4. However, the `INSERT` statements in Migration 046 populated:
   - `status = 'OFFICIAL'`
   - `verification_evidence_id = NULL`
   - `verified_by = NULL`

### Root Architectural Cause:
- In Migration 039 (`supabase/migrations/039_data_governance_foundation.sql`), trigger `trg_check_provenance_status_transition` executes `check_status_transition_invariant()`.
- That trigger is declared strictly `BEFORE UPDATE ON provenance_records`.
- Consequently, when Migration 046 performed an initial `INSERT` with `status = 'OFFICIAL'`, the transition trigger was not invoked, allowing the PostgreSQL engine to commit rows with `status = 'OFFICIAL'` and `verification_evidence_id = NULL`.
- Under W012 architectural governance, records bearing `OFFICIAL` status must reference a valid evidence artifact in `public.evidence_records`.

---

## 2. Actual W012 Provenance Mutation Contract & Field-Level Matrix

An exhaustive forensic audit of the PostgreSQL catalog, triggers, functions, and RLS policies governing `public.provenance_records` was performed.

### 2.1 The Two Active Database Triggers:
1. **`trg_prevent_provenance_mutation` (`BEFORE UPDATE OR DELETE ON provenance_records`):**
   - **On DELETE:** Unconditionally raises `DELETION PROHIBITED: Provenance lineage records are append-only and cannot be deleted.`
   - **On UPDATE:** Enforces immutability on **Classification A (Historical Fields)**:
     `id`, `dataset_version_id`, `source_record_id`, `parent_provenance_id`, `transformation_type`, `transform_version`, `operator`, `created_at`.
     If any of these 8 fields differ between `OLD` and `NEW`, it raises `IMMUTABILITY VIOLATION`.
   - **Crucial Architectural Finding:** `verification_evidence_id`, `verified_by`, and `status` are **NOT** in the immutable field check. They are explicitly designated in W012 design documentation as **Classification B (Controlled Lifecycle Fields)**.

2. **`trg_check_provenance_status_transition` (`BEFORE UPDATE ON provenance_records`):**
   - **Invariant 1:** `SCENARIO` $ightarrow$ `OFFICIAL` is permanently prohibited.
   - **Invariant 2:** `IF NEW.status = 'OFFICIAL' AND (OLD.status IS DISTINCT FROM 'OFFICIAL') THEN`
     Requires administrative caller (`service_role`, `postgres`, `supabase_admin`) AND non-null `verification_evidence_id` matching a valid row in `evidence_records`.
   - **Crucial Architectural Finding:** When `OLD.status = 'OFFICIAL'` and `NEW.status = 'OFFICIAL'`, `(OLD.status IS DISTINCT FROM 'OFFICIAL')` evaluates to **`FALSE`**. The transition assertion is satisfied, and the update is permitted.

### 2.2 Field-Level Mutation Matrix for `public.provenance_records`

| Column | INSERT Allowed? | UPDATE Allowed? | DELETE Allowed? | Active Trigger Restriction | Classification & Governance Semantics |
|:---|:---:|:---:|:---:|:---|:---|
| `id` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD.id != NEW.id` | Class A (Immutable Historical Identity) |
| `dataset_version_id` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD != NEW` | Class A (Immutable Dataset Snapshot Reference) |
| `source_record_id` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD IS DISTINCT FROM NEW` | Class A (Immutable External Source Key) |
| `parent_provenance_id` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD IS DISTINCT FROM NEW` | Class A (Immutable DAG Edge) |
| `status` | YES | **YES** | **NO** | `check_status_transition_invariant()` (Elevation requires evidence) | Class B (Controlled Lifecycle Status) |
| `transformation_type` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD != NEW` | Class A (Immutable Pipeline Step Type) |
| `transform_version` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD IS DISTINCT FROM NEW` | Class A (Immutable Algorithm Version) |
| `operator` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD != NEW` | Class A (Immutable Audit Origin) |
| **`verified_by`** | YES | **YES** | **NO** | Not checked by `prevent_provenance_mutation()` | **Class B (Controlled Lifecycle Field)** |
| **`verification_evidence_id`** | YES | **YES** | **NO** | Not checked by `prevent_provenance_mutation()`; FK enforced | **Class B (Controlled Lifecycle Field)** |
| `metadata` | YES | **YES** | **NO** | Not checked by `prevent_provenance_mutation()` | Controlled Extended Metadata |
| `created_at` | YES | **NO** | **NO** | `prevent_provenance_mutation()` checks `OLD != NEW` | Class A (Immutable Ingestion Timestamp) |

---

## 3. Actual Evidence Artifact Inspection

The candidate evidence artifact was inspected directly from `public.evidence_records` on live staging:

| Field | Verified Catalog Value | Notes |
|:---|:---|:---|
| **Evidence ID** | `e0160000-0000-0000-0000-000000002026` | Pre-registered in Migration 045 |
| **Artifact Name** | `mopr_lgd_subdistrict_directory_telangana_all.json` | Official MoPR/LGD Telangana Statewide Directory Export |
| **Artifact SHA-256** | `54d512e55b97fde163d100053dd48044cec6a744fb4bed392580282bcede1509` | Bitwise verified on disk and database |
| **Verification Authority** | `Ministry of Panchayati Raj / Local Government Directory (MoPR/LGD)` | Highest statutory administrative authority for subdistricts |
| **Verified By** | `CTO / LGD Statewide Export Verification` | Verified and attested by CTO |
| **Verification Notes** | `Official MoPR/LGD Telangana statewide export retrieved 2026-09-26 containing 621 sub-districts` | Establishes the 621 statutory mandals |
| **Dataset Linkage** | Associated with `ts_lgd_mandals_2026_v1` | Perfect version concordance |

---

## 4. The 12-Row Evidence Applicability Matrix

Every one of the 12 canonical statutory mandals is established by the MoPR/LGD 2026 statewide export. The evidence artifact semantically and legally supports the supersession of the pre-W016 synthetic pilot identities:

| Legacy ID | Canonical ID | Legacy Provenance UUID | Supersession Provenance UUID | Candidate Evidence UUID | Evidence Authority | Evidence Checksum (SHA-256) | Supports Replacement? | Supports Transformation? | Semantic & Statutory Reason |
|:---|:---|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TS-MDL-7101** | **TS-MDL-4315** | `251ef2cf-4a5d-b010-ba96-a74a4ec9241b` | `2e5a417a-df4a-988a-5326-010cd5192d33` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Sirpur (T) LGD 4315 |
| **TS-MDL-7102** | **TS-MDL-4318** | `07d06766-c729-dc17-a00f-317fac6f800f` | `5e867050-d4f4-caa7-c838-965f55e8f623` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Kagaznagar LGD 4318 |
| **TS-MDL-7103** | **TS-MDL-4329** | `f0d1157e-fa94-560d-2220-8f61540f13cc` | `7a8b07ec-59ac-c65f-0fc4-94e73c36f6ac` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Dahegoan LGD 4329 |
| **TS-MDL-7104** | **TS-MDL-4333** | `07ecfa1b-7ef1-120f-35cc-d8b2f95c8c17` | `c5226d74-8492-b850-9306-b6f0172bad65` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Tiryani LGD 4333 |
| **TS-MDL-7105** | **TS-MDL-4319** | `8328a0db-a5a7-645d-f161-c5cfbc274a48` | `fe9e32df-b654-5c88-6f9b-5ea023a34872` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Asifabad LGD 4319 |
| **TS-MDL-5320** | **TS-MDL-4353** | `2f1771fb-51b4-861f-8c68-622bdb7cdc65` | `7b3fb40f-4705-a5d1-6875-baedf09b608b` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Luxettipet LGD 4353 |
| **TS-MDL-5321** | **TS-MDL-4354** | `3040f578-fd6e-ea04-a3ab-0cbc6403cc1e` | `f5dbaa0a-395a-2396-4c39-ffd73db413bf` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Mancherial LGD 4354 |
| **TS-MDL-5322** | **TS-MDL-4348** | `d9ca1e4e-4913-673b-efa1-1fdb0c74a17a` | `146cfa88-c2b4-38c2-6d05-5fe03dda5b5d` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Dandepally LGD 4348 |
| **TS-MDL-5323** | **TS-MDL-4356** | `f5660741-308b-314c-b59b-5ae404000c91` | `06317aee-6165-6452-c9b5-0d7553fb7625` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Chennur LGD 4356 |
| **TS-MDL-5324** | **TS-MDL-4350** | `2785156c-5b34-50e8-1e9a-7d21ec78a842` | `fcfc5d9f-9527-4221-da29-ba5691271d00` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Bellampally LGD 4350 |
| **TS-MDL-5328** | **TS-MDL-4351** | `1df7c30c-208c-6cfe-ed50-719dc914701b` | `509db02e-c7bd-149c-9f10-48c47070e2e3` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Kotapally LGD 4351 |
| **TS-MDL-5329** | **TS-MDL-6227** | `23806a9a-5532-3613-e8ce-cebe1800467e` | `1c709e2a-884a-ad3f-ead5-643cf46fc2ac` | `e0160000-0000-0000-0000-000000002026` | MoPR / LGD | `54d512e5...e1509` | **YES** | **YES** | Official MoPR LGD 2026 directory establishes Hajipur LGD 6227 |

*Note on Hajipur Split Canonical Reconciliation Row (`d63eee74-2927-5184-050b-3559f628f8ae`):*  
The canonical split cross-reference row can either link to `e0160000-0000-0000-0000-000000002016` (G.O.Ms.No. 222 Reorganisation Orders PDF) or `e0160000-0000-0000-0000-000000002026` (the MoPR LGD directory).

---

## 5. Architectural Evaluation: Direct Update vs. Append-Only Alternative

### PATH A — Authorized UPDATE of Classification B Lifecycle Fields (RECOMMENDED)
1. **Schema Authority:** In W012 design and in the live PostgreSQL catalog, `verification_evidence_id` and `verified_by` are explicitly classified as **Classification B (Controlled Lifecycle Fields)**.
2. **Trigger Behavior:** `trg_prevent_provenance_mutation` does not restrict updating these two fields. `trg_check_provenance_status_transition` is only triggered when transitioning *from* non-OFFICIAL *to* OFFICIAL. Because status is already `OFFICIAL`, updating `verification_evidence_id` to a valid UUID does not violate any trigger.
3. **Foreign Key Integrity:** The foreign key constraint `provenance_records_verification_evidence_id_fkey` ensures that the referenced evidence ID strictly exists in `public.evidence_records`.
4. **Append-Only Preserved:** All 8 historical fields (Classification A) remain 100% immutable. No DAG edges, source records, or timestamps are modified.
5. **Precedent:** In Migration 043, lifecycle updates on provenance rows were authorized by the CTO and executed successfully.

### PATH B — Append-Only Replacement / Supersession DAG Node (DISQUALIFIED)
1. If direct update were prohibited, one would need to insert 12 new provenance nodes chaining from the current supersession nodes with `parent_provenance_id = current_supersession_id`, and repoint `record_provenance_linkages` to the new nodes.
2. **Fatal Flaw:** Because `trg_prevent_provenance_mutation` prohibits `DELETE`, the 12 existing nodes with `status = 'OFFICIAL'` and `verification_evidence_id = NULL` would permanently remain in the database as orphaned/phantom OFFICIAL nodes.
3. Chaining a supersession of a supersession solely to populate a lifecycle field introduces artificial DAG depth and contradicts the W012 architecture.

---

## 6. Exact Proposed Remediation Specification (For Future CTO Authorization)

> [!IMPORTANT]
> **NO DML OR DDL WAS EXECUTED DURING THIS JOB.**
> The following SQL statement is formulated strictly for CTO review and future execution authorization:

```sql
-- Proposed Remediation: Populate evidence link on the 12 supersession provenance records
BEGIN;

UPDATE public.provenance_records
SET verification_evidence_id = 'e0160000-0000-0000-0000-000000002026'::uuid,
    verified_by = 'CTO / LGD Statewide Export Verification'
WHERE transformation_type = 'pilot_to_statutory_supersession'
  AND verification_evidence_id IS NULL;

-- Optional: Populate evidence link on the Hajipur split canonical reconciliation record
UPDATE public.provenance_records
SET verification_evidence_id = 'e0160000-0000-0000-0000-000000002026'::uuid,
    verified_by = 'CTO / LGD Statewide Export Verification'
WHERE transformation_type = 'gazette_lineage_canonical_reconciliation'
  AND verification_evidence_id IS NULL;

COMMIT;
```

---

## 7. Current Staging State Freeze Verification

A live read-only verification was executed at `2026-09-26T17:05:00Z` confirming that staging remains in its exact post-046 state:
- `public.mandals`: **621**
- `public.mandal_versions`: **1,210** (621 current open, 589 closed historical)
- `public.mandals.current_version_id` null count: **0**
- `public.entity_geometries`: strictly **0**
- Legacy linkages (`is_canonical = false`): **12**
- Canonical linkages (`is_canonical = true`): **12**
- Supersession provenance records: **12**
- Hajipur canonical split records: **1 provenance, 1 lineage**
- Historical provenance (`ts_lgd_mandals_2023_v1`): **13 (100% immutable)**
- Historical lineage row (`68e465c2`): **100% immutable**
- Historical provenance row (`8c350901`): **100% immutable**
- Production database (`ehfafcnimmjusyvplbah`): **100% air-gapped & untouched**

---

## 8. Quality Gates Status Matrix

| Quality Gate | Description | Observed Evidence | Verdict |
|:---|:---|:---|:---:|
| **GOV09-01** | 12 affected rows identified exactly | All 12 supersession provenance UUIDs enumerated | **PASS** |
| **GOV09-02** | Provenance mutation triggers inspected | `prevent_provenance_mutation` & `check_status_transition` audited | **PASS** |
| **GOV09-03** | Field-level UPDATE permissions proven | `verification_evidence_id` and `verified_by` are Class B | **PASS** |
| **GOV09-04** | Append-only semantics proven | Class A historical fields strictly immutable; zero DAG disruption | **PASS** |
| **GOV09-05** | Evidence artifact inspected from catalog | Row `e016...2026` verified from `evidence_records` | **PASS** |
| **GOV09-06** | Evidence applicability evaluated for all 12 | 12/12 YES concordance in Section 4 matrix | **PASS** |
| **GOV09-07** | No invented evidence | Only established MoPR LGD 2026 export evidence utilized | **PASS** |
| **GOV09-08** | No DML executed | Zero INSERT, UPDATE, DELETE executed on staging | **PASS** |
| **GOV09-09** | No DDL executed | Zero schema, table, trigger, index changes | **PASS** |
| **GOV09-10** | No dataset_versions mutation | Dataset versions 2023 and 2026 unchanged | **PASS** |
| **GOV09-11** | No provenance_records mutation | Staging provenance table remains in exact post-046 state | **PASS** |
| **GOV09-12** | No lineage mutation | Geography entity lineage rows unchanged | **PASS** |
| **GOV09-13** | No geometry ingestion | `public.entity_geometries` count remains strictly 0 | **PASS** |
| **GOV09-14** | Staging counts unchanged | All 6 primary database counts match post-046 baseline | **PASS** |
| **GOV09-15** | Migration 045 SHA unchanged | `514595697505df005e7745ac4e1ab9cce141cc064803c071c0fca5d66d051073` | **PASS** |
| **GOV09-16** | Migration 046 SHA unchanged | `559a6f428a7c704ccf87b011cae70f67543feb8e4e0533e321a7828425fde012` | **PASS** |
| **GOV09-17** | Production untouched | Zero connections to `ehfafcnimmjusyvplbah` | **PASS** |
| **GOV09-18** | Exact remediation path established | Path A established with empirical PostgreSQL 17 proof | **PASS** |
| **GOV09-19** | No speculative schema redesign | Uses native W012 Classification B lifecycle updates | **PASS** |
| **GOV09-20** | No self-acceptance | Submitted for formal CTO review | **PASS** |

---

## 9. Final Lifecycle State

```
STATUS: DESIGN COMPLETE — READY FOR CTO REMEDIATION AUTHORIZATION
```

- **NO Migration 047 created.**
- **NO repair executed.**
- **NO geometry ingested.**
- **NO production promotion.**
- All activities halted awaiting CTO instructions.
