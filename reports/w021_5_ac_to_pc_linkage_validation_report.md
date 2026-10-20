# KSHETRA W021.5 — National AC-to-PC Linkage Validation Report
**Directive:** CTO Directive 116  
**Governing Authority:** Master Execution Framework Amendment v1.6 / Rule IV-001  
**Generated At:** 2026-10-20T06:17:47.536Z  

## 1. Summary
- **Statutory Assembly Constituencies:** 4,123
- **Statutory Parliamentary Constituencies:** 543
- **Migration 061 Mapping Rows:** Exactly 4,123
- **Orphaned ACs:** 0
- **Orphaned PCs:** 0
- **Inter-State Misallocations:** 0
- **Current Epoch 1-to-1 Mapping Invariant:** 100% enforced via `uq_cpm_single_current_ac`

## 2. Uniform Partition Invariants
In several major Indian states, the Delimitation Commission established strict uniform ratios between Assembly and Parliamentary seats:
| State Code | State Name | Assembly Seats | Parliamentary Seats | Ratio (ACs / PC) | Governing Regime |
|:---|:---|:---:|:---:|:---:|:---|
| `AP` | Andhra Pradesh | 175 | 25 | **7** | `AP_2014` |
| `TS` | Telangana | 119 | 17 | **7** | `AP_2014` |
| `KL` | Kerala | 140 | 20 | **7** | `ECI_2008` |
| `WB` | West Bengal | 294 | 42 | **7** | `ECI_2008` |
| `UK` | Uttarakhand | 70 | 5 | **14** | `ECI_2008` |
| `DL` | Delhi | 70 | 7 | **10** | `ECI_2008` |
| `GA` | Goa | 40 | 2 | **20** | `ECI_2008` |
| `HP` | Himachal Pradesh | 68 | 4 | **17** | `ECI_2008` |
| `HR` | Haryana | 90 | 10 | **9** | `ECI_2008` |
| `JK` | Jammu & Kashmir | 90 | 5 | **18** | `JK_2022` |

## 3. Single-PC and Non-Assembly Union Territories
- **Whole-State Single PCs:** Mizoram (40 ACs), Nagaland (60 ACs), Puducherry (30 ACs), Sikkim (32 ACs).
- **Non-Assembly Union Territories:** Andaman & Nicobar (1 PC), Chandigarh (1 PC), DNH & DD (2 PCs), Ladakh (1 PC), Lakshadweep (1 PC).

## 4. Verification Verdict
Task `W021.5-B1-02` is **REPO_VERIFIED (3.0% earned)** with zero mapping defects.
