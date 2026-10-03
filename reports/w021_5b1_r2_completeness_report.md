# KSHETRA W021.5-B1-R2 — NATIONAL AC↔PC COMPLETENESS & TEMPORAL INTEGRITY REPORT

**Milestone:** W021.5 — Canonical National Data Plane Migration  
**Substage:** W021.5-B1-R2 — National AC↔PC Completeness & Temporal Integrity Closure  
**Parent Milestone:** W021.5-B1  
**Baseline Commit:** `9fa5ecc1ba63e6fcb0493d068e75a88a6aff65ad`  
**Generated At:** 2026-10-03T05:13:52.424Z  
**Production Isolation:** STRICTLY AIR-GAPPED & UNTOUCHED (`ehfafcnimmjusyvplbah`)  
**Artifact Link:** [`reports/w021_5b1_r2_completeness_report.json`](file:///reports/w021_5b1_r2_completeness_report.json)

---

## 1. Executive Summary & Verification Verdict

The principal limitation of milestone W021.5-B1-R1 (where 3,802 of 4,123 ACs had deferred AC→PC mappings) is now **100% resolved**.

Under Migration 061 (`supabase/migrations/061_canonical_national_ac_pc_mappings.sql`), every applicable current Assembly Constituency in India has **exactly one current Parliamentary Constituency relationship** established with:
1. **Full Database Enforcement:** Non-overlapping intervals enforced via PostgreSQL GIST exclusion constraint (`uq_cpm_no_temporal_overlap`), chronological ordering constraint (`chk_cpm_dates`), and unique current mapping constraint (`uq_cpm_single_current_ac`).
2. **Deterministic Provenance:** All records reference first-class statutory regimes (`eci_delimitation_2008`, `eci_delimitation_2014_ap_ts`, `eci_delimitation_2022_jk`) and canonical dataset versions.
3. **Universal Coverage:** 4,123 / 4,123 ACs mapped across all 31 legislative assemblies (100.00% coverage).
4. **Non-Assembly UT Catalogue:** All 5 Union Territories without legislative assemblies (AN, CH, DH, LA, LD) are catalogued with 0 ACs and 6 PCs.

---

## 2. 36-Jurisdiction National AC↔PC Mapping Matrix

| State Code | Jurisdiction Name | Type | Statutory ACs | Mapped ACs | Unmapped ACs | Coverage | Statutory PCs | Conforms |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **AP** | Andhra Pradesh | `STATE` | 175 | 175 | 0 | 100.00% | 25 | ✅ PASS |
| **AR** | Arunachal Pradesh | `STATE` | 60 | 60 | 0 | 100.00% | 2 | ✅ PASS |
| **AS** | Assam | `STATE` | 126 | 126 | 0 | 100.00% | 14 | ✅ PASS |
| **BR** | Bihar | `STATE` | 243 | 243 | 0 | 100.00% | 40 | ✅ PASS |
| **CG** | Chhattisgarh | `STATE` | 90 | 90 | 0 | 100.00% | 11 | ✅ PASS |
| **GA** | Goa | `STATE` | 40 | 40 | 0 | 100.00% | 2 | ✅ PASS |
| **GJ** | Gujarat | `STATE` | 182 | 182 | 0 | 100.00% | 26 | ✅ PASS |
| **HR** | Haryana | `STATE` | 90 | 90 | 0 | 100.00% | 10 | ✅ PASS |
| **HP** | Himachal Pradesh | `STATE` | 68 | 68 | 0 | 100.00% | 4 | ✅ PASS |
| **JH** | Jharkhand | `STATE` | 81 | 81 | 0 | 100.00% | 14 | ✅ PASS |
| **KA** | Karnataka | `STATE` | 224 | 224 | 0 | 100.00% | 28 | ✅ PASS |
| **KL** | Kerala | `STATE` | 140 | 140 | 0 | 100.00% | 20 | ✅ PASS |
| **MP** | Madhya Pradesh | `STATE` | 230 | 230 | 0 | 100.00% | 29 | ✅ PASS |
| **MH** | Maharashtra | `STATE` | 288 | 288 | 0 | 100.00% | 48 | ✅ PASS |
| **MN** | Manipur | `STATE` | 60 | 60 | 0 | 100.00% | 2 | ✅ PASS |
| **ML** | Meghalaya | `STATE` | 60 | 60 | 0 | 100.00% | 2 | ✅ PASS |
| **MZ** | Mizoram | `STATE` | 40 | 40 | 0 | 100.00% | 1 | ✅ PASS |
| **NL** | Nagaland | `STATE` | 60 | 60 | 0 | 100.00% | 1 | ✅ PASS |
| **OD** | Odisha | `STATE` | 147 | 147 | 0 | 100.00% | 21 | ✅ PASS |
| **PB** | Punjab | `STATE` | 117 | 117 | 0 | 100.00% | 13 | ✅ PASS |
| **RJ** | Rajasthan | `STATE` | 200 | 200 | 0 | 100.00% | 25 | ✅ PASS |
| **SK** | Sikkim | `STATE` | 32 | 32 | 0 | 100.00% | 1 | ✅ PASS |
| **TN** | Tamil Nadu | `STATE` | 234 | 234 | 0 | 100.00% | 39 | ✅ PASS |
| **TS** | Telangana | `STATE` | 119 | 119 | 0 | 100.00% | 17 | ✅ PASS |
| **TR** | Tripura | `STATE` | 60 | 60 | 0 | 100.00% | 2 | ✅ PASS |
| **UP** | Uttar Pradesh | `STATE` | 403 | 403 | 0 | 100.00% | 80 | ✅ PASS |
| **UK** | Uttarakhand | `STATE` | 70 | 70 | 0 | 100.00% | 5 | ✅ PASS |
| **WB** | West Bengal | `STATE` | 294 | 294 | 0 | 100.00% | 42 | ✅ PASS |
| **DL** | Delhi | `UT_WITH_ASSEMBLY` | 70 | 70 | 0 | 100.00% | 7 | ✅ PASS |
| **JK** | Jammu & Kashmir | `UT_WITH_ASSEMBLY` | 90 | 90 | 0 | 100.00% | 5 | ✅ PASS |
| **PY** | Puducherry | `UT_WITH_ASSEMBLY` | 30 | 30 | 0 | 100.00% | 1 | ✅ PASS |
| **AN** | Andaman & Nicobar Islands | `UT_WITHOUT_ASSEMBLY` | 0 | 0 | 0 | 100.00% | 1 | ✅ PASS |
| **CH** | Chandigarh | `UT_WITHOUT_ASSEMBLY` | 0 | 0 | 0 | 100.00% | 1 | ✅ PASS |
| **DH** | Dadra & Nagar Haveli and Daman & Diu | `UT_WITHOUT_ASSEMBLY` | 0 | 0 | 0 | 100.00% | 2 | ✅ PASS |
| **LA** | Ladakh | `UT_WITHOUT_ASSEMBLY` | 0 | 0 | 0 | 100.00% | 1 | ✅ PASS |
| **LD** | Lakshadweep | `UT_WITHOUT_ASSEMBLY` | 0 | 0 | 0 | 100.00% | 1 | ✅ PASS |
| **TOTAL** | **INDIA (36 Jurisdictions)** | — | **4,123** | **4,123** | **0** | **100.00%** | **543** | **✅ 100%** |

---

## 3. Statutory Exceptions & Regime Partitions

### 3.1 Jammu & Kashmir (Delimitation Commission Order No. 2, 2022)
- Reorganized following J&K Reorganisation Act 2019 into 90 ACs and 5 PCs.
- Every Parliamentary Constituency has **exactly 18 Assembly Constituencies**:
  - `JK-PC-01` (Anantnag-Rajouri): 18 ACs (combines South Kashmir and Pir Panjal)
  - `JK-PC-02` (Baramulla): 18 ACs (North Kashmir)
  - `JK-PC-03` (Jammu): 18 ACs (Jammu plains & Reasi)
  - `JK-PC-04` (Srinagar): 18 ACs (Central Kashmir)
  - `JK-PC-05` (Udhampur): 18 ACs (Chenab valley & Kathua)
- Ladakh UT was partitioned into a separate UT with sole PC `LA-PC-01` (0 ACs).

### 3.2 Andhra Pradesh & Telangana (AP Reorganisation Act 2014)
- **Andhra Pradesh:** 175 ACs mapped across 25 PCs (exactly 7 ACs per PC: $25 \times 7 = 175$).
- **Telangana:** 119 ACs mapped across 17 PCs (exactly 7 ACs per PC: $17 \times 7 = 119$).

### 3.3 Dadra & Nagar Haveli and Daman & Diu (Merger Act 2020)
- Unified into single UT `DH` with 2 PCs (`DH-PC-01` Dadra & Nagar Haveli, `DH-PC-02` Daman & Diu) and 0 ACs.

### 3.4 Sikkim Sangha Assembly Constituency (`SK-AC-032`)
- Non-territorial monastic electoral seat representing the Buddhist clergy.
- Statutorily mapped to Sikkim's sole statewide PC (`SK-PC-01`).

---

## 4. Verification Gate Results

- **[PASS]** `B1-R2-CHK-01`: Migration 061 SQL exists and is atomically wrapped in BEGIN ... COMMIT
- **[PASS]** `B1-R2-CHK-02`: Database exclusion constraint (uq_cpm_no_temporal_overlap) prevents overlapping AC mapping intervals
- **[PASS]** `B1-R2-CHK-03`: Chronological check constraint (chk_cpm_dates) enforces effective_from < effective_to
- **[PASS]** `B1-R2-CHK-04`: Unique partial index (uq_cpm_single_current_ac) guarantees exactly 1 current PC per AC
- **[PASS]** `B1-R2-CHK-05`: National AC->PC mapping completeness: exactly 4,123 ACs mapped with 0 duplicates
- **[PASS]** `B1-R2-CHK-06`: All 36 States and Union Territories audited: 31 assemblies have 100% mapped ACs, 5 UTs have 0 ACs
- **[PASS]** `B1-R2-CHK-07`: Andhra Pradesh statutory partition: exactly 25 PCs with exactly 7 ACs each (175 ACs)
- **[PASS]** `B1-R2-CHK-08`: Telangana statutory partition: exactly 17 PCs with exactly 7 ACs each (119 ACs)
- **[PASS]** `B1-R2-CHK-09`: Jammu & Kashmir 2022 Delimitation Order: exactly 5 PCs with exactly 18 ACs each (90 ACs)
- **[PASS]** `B1-R2-CHK-10`: All 5 non-assembly Union Territories (6 PCs) formally catalogued with zero assembly constituencies
- **[PASS]** `B1-R2-CHK-11`: All AC->PC mappings reference valid first-class statutory delimitation regimes and datasets
- **[PASS]** `B1-R2-CHK-12`: Zero mutation of World-A legacy seed files in data/seed/**
- **[PASS]** `B1-R2-CHK-13`: Production database ehfafcnimmjusyvplbah strictly air-gapped and untouched

---

## 5. Next Stage Status

```text
W021.5-B1-R2 IMPLEMENTATION COMPLETE
SUBMITTED FOR CTO REVIEW
W021.5-B2 STRICTLY BLOCKED
```
