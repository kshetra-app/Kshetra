# W016-C3-R4-GOV-11: Historical Hajipur 2016 Legal Evidence Forensic Report

**Directive:** W016-C3-R4-GOV-11 — HISTORICAL HAJIPUR 2016 LEGAL EVIDENCE FORENSIC  
**Investigation Timestamp:** 2026-09-27T03:30:11.397Z  
**Target Environment:** `panIN-staging` (`fkpigozcqnmcvofuksar`) READ-ONLY FORENSIC MODE  
**Production Isolation:** `ehfafcnimmjusyvplbah` (STRICTLY AIR-GAPPED & UNTOUCHED)  
**DML / DDL Executed:** **STRICTLY ZERO**  
**Final Status:** `DESIGN COMPLETE — READY FOR CTO REMEDIATION AUTHORIZATION`  

---

## 1. Target Provenance Record

The single remaining evidence-deficient provenance record, inspected directly from live staging:

| Column | Observed Live Value |
|:---|:---|
| **id** | `d63eee74-2927-5184-050b-3559f628f8ae` |
| **dataset_version_id** | `ts_lgd_mandals_2026_v1` |
| **source_record_id** | `TG-GAZETTE-2016:GOMS222:CANONICAL-RECONCILE` |
| **parent_provenance_id** | `8c350901-a5d8-fe3d-c5b2-6ffe37601908` |
| **status** | `OFFICIAL` |
| **transformation_type** | `gazette_lineage_canonical_reconciliation` |
| **transform_version** | `1.0` |
| **operator** | `system:w016_c3_r4_supersession` |
| **verified_by** | `NULL` |
| **verification_evidence_id** | `NULL` |
| **metadata** | `{"effective_date":"2016-10-11","source_document":"Telangana Gazette Extraordinary, Part I (G.O.Ms.No. 222)","source_authority":"Government of Telangana, Revenue (DA-CMRF) Department","supersession_note":"Canonical cross-reference for historical Hajipur split from Mancherial","canonical_lgd_code":6227,"successor_canonical_id":"TS-MDL-6227","predecessor_canonical_id":"TS-MDL-4354","legacy_pilot_successor_id":"TS-MDL-5329","legacy_pilot_predecessor_id":"TS-MDL-5321"}` |
| **created_at** | `2026-09-26T16:44:51.851677+00:00` |

### Key Observations:
1. `source_record_id = 'TG-GAZETTE-2016:GOMS222:CANONICAL-RECONCILE'` — explicitly references G.O.Ms.No. 222.
2. `parent_provenance_id = '8c350901-a5d8-fe3d-c5b2-6ffe37601908'` — chains to the historical parent.
3. `metadata` contains: `effective_date: 2016-10-11`, `source_document: Telangana Gazette Extraordinary, Part I (G.O.Ms.No. 222)`, `predecessor_canonical_id: TS-MDL-4354`, `successor_canonical_id: TS-MDL-6227`.
4. `status = OFFICIAL` but `verification_evidence_id = NULL` and `verified_by = NULL` — this is the governance gap requiring remediation.

---

## 2. Historical Parent Provenance Record

The historical predecessor provenance, inspected directly from live staging:

| Column | Observed Live Value |
|:---|:---|
| **id** | `8c350901-a5d8-fe3d-c5b2-6ffe37601908` |
| **dataset_version_id** | `ts_lgd_mandals_2023_v1` |
| **source_record_id** | `TG-GAZETTE-2016:GOMS222:MANCHERIAL-HAJIPUR-SPLIT` |
| **parent_provenance_id** | `NULL` |
| **status** | `UNVERIFIED` |
| **transformation_type** | `authoritative_gazette_lineage` |
| **verification_evidence_id** | `NULL` |
| **metadata** | `{"successor":"TS-MDL-5329","predecessor":"TS-MDL-5321","effective_date":"2016-10-11","source_document":"Telangana Gazette Extraordinary, Part I (G.O.Ms.No. 222)","source_authority":"Government of Telangana, Revenue (DA-CMRF) Department"}` |

### Historical Claim Represented:
This record is the **original pre-Migration-046 provenance** from the `ts_lgd_mandals_2023_v1` dataset, created during W015-B2 source reconciliation. It records the `authoritative_gazette_lineage` claim: Mancherial (TS-MDL-5321) was split to form Hajipur (TS-MDL-5329) on 2016-10-11 under G.O.Ms.No. 222.

Note: This parent record uses **legacy pilot IDs** (TS-MDL-5321 / TS-MDL-5329) because it predates the GOV-04 identity reconciliation. The child record (`d63eee74`) uses **canonical IDs** (TS-MDL-4354 / TS-MDL-6227).

---

## 3. Historical Lineage Record

The geography entity lineage record, inspected directly from live staging:

| Column | Observed Live Value |
|:---|:---|
| **id** | `68e465c2-a00b-478d-8082-e0cf1f3bbe67` |
| **entity_type** | `mandal` |
| **predecessor_internal_id** | `e6519f68-2ed7-b59f-a18d-6ae532ef72b2` |
| **successor_internal_id** | `7deefbe8-b686-8046-84fb-d54904968b00` |
| **transition_type** | `split` |
| **effective_date** | `2016-10-11` |
| **statutory_order** | `G.O.Ms.No. 222, Revenue (DA-CMRF) Dept, dated 11.10.2016` |
| **primary_dataset_version_id** | `ts_lgd_mandals_2023_v1` |
| **metadata** | `{"lgd_code":5949,"description":"Hajipur Mandal carved out of Mancherial Mandal upon district reorganisation on 11.10.2016","parent_district":"Mancherial","successor_mandal_id":"TS-MDL-5329","predecessor_mandal_id":"TS-MDL-5321","successor_mandal_name":"Hajipur","predecessor_mandal_name":"Mancherial"}` |

### Observations:
1. `transition_type = 'split'` — correctly models the carving out of Hajipur from Mancherial.
2. `statutory_order = 'G.O.Ms.No. 222, Revenue (DA-CMRF) Dept, dated 11.10.2016'` — explicitly cites the legal order.
3. `effective_date = 2016-10-11` — matches the statutory order date.
4. `metadata` describes: "Hajipur Mandal carved out of Mancherial Mandal upon district reorganisation on 11.10.2016".
5. This record was created during Migration 043 (W015-B2 Source Reconciliation) and is in the historical `ts_lgd_mandals_2023_v1` dataset — it is **100% immutable and must not be modified**.

---

## 4. Evidence Records Candidates

All 14 evidence records on staging were inspected and classified:

| Evidence ID | Artifact Name | Authority | Classification | Rationale |
|:---|:---|:---|:---:|:---|
| `e0140000-0000-0000-0000-000000000041` | `mopr_lgd_subdistrict_directory_ts.json` | Ministry of Panchayati Raj, Government of India | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000002016` | `goms_2016_reorganisation_orders.pdf` | Government of Telangana (Revenue Department) | **B** (Official Secondary) | Official secondary evidence: covers G.O.Ms. Nos. 214-245 Rev (2016-10-11) — the complete batch of statutory reorganis... |
| `e0160000-0000-0000-0000-000000002026` | `mopr_lgd_subdistrict_directory_telangana_all.json` | Ministry of Panchayati Raj / Local Government Directory (MoPR/LGD) | **C** (Current Admin Only) | Current administrative evidence only. The 2026 MoPR/LGD statewide directory proves that TS-MDL-4354 (Mancherial) and ... |
| `e0160000-0000-0000-0000-000000002020` | `goms_2020_mandals_108_112.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000002022` | `goms_2022_mandals_51_68.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007534` | `goms_95_rev_2022_pothangal.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007527` | `goms_22_rev_2023_gudipally.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007519` | `goms_31_rev_2023_palwancha.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007520` | `goms_32_rev_2023_mohammadnagar.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007533` | `goms_40_rev_2023_yedula.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007517` | `goms_48_rev_2023_yerravalli.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007529` | `goms_65_rev_2023_bhoraj.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007515` | `goms_66_rev_2023_sathnala.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |
| `e0160000-0000-0000-0000-000000007536` | `goms_74_rev_2023_mallampally.pdf` | Government of Telangana (Revenue Department) | **D** (Insufficient/Unrelated) | Unrelated to G.O.Ms.No. 222 / Mancherial-Hajipur bifurcation. |


### Classification Definitions:
- **A — Direct Legal Evidence:** The exact G.O.Ms.No. 222 document or certified copy.
- **B — Official Secondary Evidence:** An official government evidence artifact that explicitly covers G.O.Ms.No. 222 within its documented scope.
- **C — Current Administrative Evidence:** Proves current identity/state but not the historical legal event.
- **D — Insufficient/Unrelated:** Does not relate to G.O.Ms.No. 222 or the Mancherial–Hajipur bifurcation.

### Key Finding:

**`e0160000-0000-0000-0000-000000002016`** is classified as **Category B (Official Secondary Evidence)**.

This evidence record covers **G.O.Ms. Nos. 214–245 Rev (2016-10-11)** — the complete batch of statutory reorganisation orders issued on 11 October 2016. G.O.Ms.No. 222 is explicitly within this numbered range (222 ∈ [214, 245]). The `verification_notes` field confirms: *"Statutory reorganisation orders G.O.Ms. Nos. 214-245 Rev (2016-10-11) establishing 589 baseline mandals"*.

This is the **same evidence artifact** already used to validate all 589 historical baseline mandal versions in the `ts_lgd_mandals_2016_v1` dataset (each with `verification_evidence_id = 'e0160000-0000-0000-0000-000000002016'`).

**No Category A (direct single-order G.O.Ms.No. 222) evidence record exists** in `public.evidence_records`. However, **Category B is fully sufficient** because:
1. The evidence record explicitly covers the numbered range 214–245 which contains 222.
2. All 589 baseline mandals — including both Mancherial (TS-MDL-4354) and Hajipur (TS-MDL-6227) — were loaded with this same evidence reference.
3. The repository artifact `data/evidence/w015_b2/telangana_gazette_2016_goms_222_mancherial.txt` provides the specific G.O.Ms.No. 222 extract with Hajipur lineage details.

---

## 5. Repository / Source Artifact Findings

### Primary Preserved Artifact:
```
Path:       data/evidence/w015_b2/telangana_gazette_2016_goms_222_mancherial.txt
SHA-256:    c4f0ac9317f13f1ca596ad0ef6fcdda15c88c60b9e581b30bf5fecb91929fd1c
Size:       2553 bytes
Git Commit: 4615b0f (feat(w015-b2): authoritative source reconciliation)
```

### Artifact Content Summary:
- **Source Authority:** Government of Telangana, Revenue (DA-CMRF) Department
- **Document:** Telangana Gazette Extraordinary, Part I
- **Statutory Orders:** G.O.Ms.No. 222, Revenue (DA-CMRF) Dept, dated 11.10.2016 (Formation of Mancherial District)
- **Effective Date:** 2016-10-11
- **Hajipur Lineage Particulars:**
  - Formation Type: Carved out as a new Mandal on 11.10.2016
  - Predecessor Entity: Mancherial Mandal (TS-MDL-5321)
  - Successor Entity: Hajipur (TS-MDL-5329)
  - Transition Type: 'split'
  - Statutory Citation: G.O.Ms.No. 222, Revenue (DA-CMRF) Dept, dated 11.10.2016

### Relationship to Evidence Record:
The PDF artifact referenced in evidence record `e0160000-0000-0000-0000-000000002016` (`goms_2016_reorganisation_orders.pdf`, SHA-256 `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db`) is not stored in git (likely too large). The text extract `telangana_gazette_2016_goms_222_mancherial.txt` serves as the preserved, version-controlled secondary artifact containing the specific G.O.Ms.No. 222 extract that documents the Mancherial–Hajipur lineage.

---

## 6. Legal-Event Evidence Assessment

| Assessment Criterion | Finding |
|:---|:---|
| **Legal Event** | Mancherial → Hajipur statutory bifurcation |
| **Statutory Order** | G.O.Ms.No. 222, Revenue (DA-CMRF) Department |
| **Effective Date** | 2016-10-11 |
| **Predecessor** | TS-MDL-4354 (Mancherial) / legacy TS-MDL-5321 |
| **Successor** | TS-MDL-6227 (Hajipur) / legacy TS-MDL-5329 |
| **Evidence Record Found** | `e0160000-0000-0000-0000-000000002016` |
| **Evidence Covers G.O.Ms.No. 222** | **YES** — covers G.O.Ms. Nos. 214–245 (222 ∈ [214, 245]) |
| **Evidence Authority** | Government of Telangana (Revenue Department) |
| **Evidence Gap** | **NONE** — existing evidence is sufficient |
| **Current LGD Evidence Misclassified?** | **NO** — `e0160000-0000-0000-0000-000000002026` correctly classified as Category C (current admin) |
| **Invented Evidence?** | **NO** — zero new evidence created, zero checksums fabricated |

---

## 7. W012 Remediation Applicability & Proposed Lifecycle Correction

### Exact Evidence Identification:

| Attribute | Value |
|:---|:---|
| **Evidence Record ID** | `e0160000-0000-0000-0000-000000002016` |
| **Artifact Name** | `goms_2016_reorganisation_orders.pdf` |
| **Artifact SHA-256** | `aca53eefa290570ce4010fa8c26a75dce995de3e3180ac9f0873f78fb41512db` |
| **Verification Authority** | Government of Telangana (Revenue Department) |
| **Verified By** | CTO / Statutory Gazette Reconciliation |
| **Verification Notes** | Statutory reorganisation orders G.O.Ms. Nos. 214-245 Rev (2016-10-11) establishing 589 baseline mandals |

### Proposed Lifecycle Remediation (NOT EXECUTED):

| Field | Current Value | Proposed Value |
|:---|:---|:---|
| **verification_evidence_id** | `NULL` | `e0160000-0000-0000-0000-000000002016` |
| **verified_by** | `NULL` | `CTO / Statutory Gazette Reconciliation` |
| **status** | `OFFICIAL` | `OFFICIAL` (no change — semantically justified) |

### Status = OFFICIAL Justification:
The `OFFICIAL` status is semantically justified because:
1. The gazette lineage canonical reconciliation is directly supported by the statutory gazette reorganisation orders — the highest authority for administrative boundary modifications in Telangana.
2. Evidence record `e0160000-0000-0000-0000-000000002016` establishes the legal basis for the complete 2016 reorganisation.
3. G.O.Ms.No. 222 specifically ordered the formation of Mancherial District including the bifurcation creating Hajipur mandal.

### W012 Mechanism Applicability:
The same Classification-B lifecycle mechanism used successfully in GOV-10 applies:
- **Operation:** Scoped `PATCH` on exact 1 provenance UUID via PostgREST Service-Role.
- **Fields Updated:** `verification_evidence_id` and `verified_by` only.
- **Fields Preserved:** All 8 Classification-A immutable fields (`id`, `dataset_version_id`, `source_record_id`, `parent_provenance_id`, `transformation_type`, `transform_version`, `operator`, `created_at`) and `metadata`.
- **Trigger Behaviour:** `trg_check_provenance_status_transition` evaluates `(OLD.status IS DISTINCT FROM 'OFFICIAL')` to `FALSE` (both are `OFFICIAL`), cleanly permitting the lifecycle evidence binding.
- **Execution Authorization:** **NOT GRANTED** — requires explicit CTO authorization in GOV-12.

---

## 8. Current Staging Integrity (Read-Only Verification)

| Entity / Metric | Expected | Observed | Status |
|:---|:---:|:---:|:---:|
| **public.mandals** | 621 | 621 | **PASS** |
| **public.mandal_versions** | 1210 | 1210 | **PASS** |
| **current versions** | 621 | 621 | **PASS** |
| **historical versions** | 589 | 589 | **PASS** |
| **null current pointers** | 0 | 0 | **PASS** |
| **entity_geometries** | 0 | 0 | **PASS** |
| **12 supersession rows — status OFFICIAL** | true | true | **PASS** |
| **12 supersession rows — evidence populated** | true | true | **PASS** |
| **12 supersession rows — verified_by populated** | true | true | **PASS** |
| **Hajipur reconciliation — status** | OFFICIAL | OFFICIAL | **PASS** |
| **Hajipur reconciliation — evidence** | NULL | NULL | **PASS** (expected NULL) |
| **Hajipur reconciliation — verified_by** | NULL | NULL | **PASS** (expected NULL) |

### No-Mutation Confirmation:
- Zero DML executed during GOV-11.
- Zero DDL executed during GOV-11.
- Zero INSERT, UPDATE, or DELETE executed during GOV-11.
- No Migration 047 created.
- No geometry ingested.
- Production (`ehfafcnimmjusyvplbah`) remains 100% air-gapped and untouched.

---

## 9. Quality Gates

| Gate | Description | Status |
|:---|:---|:---:|
| **GOV11-01** | Target provenance identified | **PASS** |
| **GOV11-02** | Historical parent inspected | **PASS** |
| **GOV11-03** | Historical lineage inspected | **PASS** |
| **GOV11-04** | G.O.Ms.No.222 source searched | **PASS** |
| **GOV11-05** | 2016-10-11 legal event verified | **PASS** |
| **GOV11-06** | evidence_records candidates inspected | **PASS** |
| **GOV11-07** | Current LGD evidence not misclassified | **PASS** |
| **GOV11-08** | No invented evidence | **PASS** |
| **GOV11-09** | No DML | **PASS** |
| **GOV11-10** | No DDL | **PASS** |
| **GOV11-11** | No migration created | **PASS** |
| **GOV11-12** | No geometry | **PASS** |
| **GOV11-13** | Staging integrity unchanged | **PASS** |
| **GOV11-14** | Production untouched | **PASS** |
| **GOV11-15** | Exact W012 remediation path determined | **PASS** |
| **GOV11-16** | No self-acceptance | **PASS** |

---

## 10. Final Status

```
DESIGN COMPLETE — READY FOR CTO REMEDIATION AUTHORIZATION
```

### Summary of Determination:
1. **Evidence record `e0160000-0000-0000-0000-000000002016`** is the authoritative evidence artifact for the Mancherial–Hajipur bifurcation under G.O.Ms.No. 222.
2. This evidence covers G.O.Ms. Nos. 214–245 Rev (2016-10-11), which explicitly includes G.O.Ms.No. 222.
3. The proposed remediation populates `verification_evidence_id = 'e0160000-0000-0000-0000-000000002016'` and `verified_by = 'CTO / Statutory Gazette Reconciliation'`.
4. `status = OFFICIAL` is semantically justified by the statutory gazette authority.
5. The W012 Classification-B lifecycle mechanism from GOV-10 is directly applicable.
6. Execution requires explicit CTO authorization (GOV-12).

All activities halted pending CTO review.
