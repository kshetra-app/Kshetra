# Official ECI Form 20 Source & Reconciliation Dossier: AC-040 Gajwel

**Constituency:** AC-040 Gajwel  
**District:** Siddipet, Telangana  
**Election:** Telangana Legislative Assembly General Election 2023  
**Statutory Framework:** Conduct of Elections Rules, 1961  
- **Form 20:** Rule 56(7) — Final Result Sheet (Polling station-wise EVM + postal ballot compilation)  
- **Form 21E:** Rule 64 — Return of Election (Declaration of Result)  
**Authority:** Election Commission of India / Chief Electoral Officer, Telangana  
**Document Identity:** `DOC-ECI-2023-TS-AC040-FORM20`  
**Classification:** `STATUTORY_FINAL_RESULT_SHEET`  
**Statutory Function:** Polling station-wise recording of EVM votes cast per candidate, plus postal ballot counting summary.

---

## 1. Statutory Discrepancy Matrix: Form 20 / ECI Detailed Results vs Benchmark

| Parameter | Statutory Form 20 / ECI Detailed Results | Form 21E Extract (v1.1.0 in DB) | Discrepancy & Root Cause Analysis | Reconciled Statutory Finding |
| :--- | :--- | :--- | :--- | :--- |
| **Total Registered Electors** | `274,726` (ECI Detailed Report) / `232,417` (Polled Stations Roll baseline in certain reporting tables) | `267,882` (Header Block) | Form 21E header records `267,882` as declared by Returning Officer. ECI Statistical Report records `274,726` after final electoral roll inclusion. Semantic stage differential. | **SEMANTIC_STAGE_DIFFERENTIAL** (Form 21E: `267,882`, ECI Statistical: `274,726`) |
| **Rank 1: Kalvakuntla Chandrashekar Rao (BRS)** | `111,684` (EVM: `110,984`, Postal: `700`) | `111,684` (EVM: `110,984`, Postal: `700`) | **IDENTICAL across all sources (0 discrepancy)**. Confirmed Winner. | **DIRECTLY_SOURCED** (`111,684`) |
| **Rank 2: Eatala Rajender (BJP)** | `66,653` (EVM: `65,961`, Postal: `692`) | `91,753` (EVM: `91,203`, Postal: `550`) | **CRITICAL ERROR IN BENCHMARK**: DB benchmark recorded `91,753`. Authoritative ECI Detailed Results establish `66,653`. DB is overstated by `+25,100` votes. Confirmed Runner-up. | **DIRECTLY_SOURCED** (`66,653` via ECI Detailed Results) |
| **Rank 3: Thoomkunta Narsa Reddy (INC)** | `32,568` (EVM: `32,318`, Postal: `250`) | `32,568` (EVM: `32,318`, Postal: `250`) | **IDENTICAL across all sources (0 discrepancy)**. Confirmed Third-place candidate. | **DIRECTLY_SOURCED** (`32,568`) |
| **Candidates Rank 4–16 (13 Minor Candidates)** | `15,965` (sum of 13 individual contesting candidates) | `3,156` (recorded as 6-candidate pool) | DB benchmark aggregated only 6 candidates with `3,156` votes, omitting 7 contestants and misrepresenting pool total. | **AGGREGATE_SUM_VERIFIED** (`15,965` across 13 candidates) |
| **Candidate Valid Votes Sum** | `226,870` | `239,161` | Consequence of Eatala Rajender correction (`-25,100`) and candidate pool reconciliation (`+12,809`). Net: `-12,291`. | **AGGREGATE_SUM_VERIFIED** (`226,870`) |
| **None of the Above (NOTA)** | `832` (0.36% of polled votes) | `1,347` (in draft benchmark) | **CRITICAL ERROR IN BENCHMARK**: `1,347` was erroneously entered from arithmetic gap in early round. ECI / statutory return reports NOTA as `832`. | **DIRECTLY_SOURCED** (`832`) |
| **Total Valid Votes** | `227,702` ($226,870 + 832$) | `240,508` | Consequence of corrected candidate sum and corrected NOTA ($240,508 - 12,806 = 227,702$). | **AGGREGATE_SUM_VERIFIED** (`227,702`) |
| **Total Rejected Votes** | **NOT REPORTED in summary / UNKNOWN** | `1,347` (Arithmetically derived) | Rejected votes were arithmetically forced from $241,855 - 240,508 = 1,347$. Independent Form 20 postal annexure count is not reported on summary sheet. | **UNKNOWN (PROHIBITED ARITHMETIC DERIVATION REJECTED)** |
| **Total Votes Polled** | `232,417` (turnout reported in constituency tables) | `241,855` (NOTA-double-counted artifact) | Previous DB benchmark total `241,855` was created in commit `26ff6b5` by adding NOTA (`1,347`) to valid votes (`240,508`). Wikipedia/ECI reporting tables report `232,417`. | **CONFLICTING_AUTHORITATIVE_SOURCES / UNKNOWN** |
| **Victory Margin** | `45,031` ($111,684 - 66,653$) | `19,931` ($111,684 - 91,753$) | Direct mathematical consequence of Eatala Rajender correct vote total (`66,653`). | **DERIVED_CALCULATED** (`45,031`) |

---

## 2. Authoritative Candidate-Level Breakdown (Form 20 / ECI Detailed Return)

| Rank | Candidate Name | Contesting Party | EVM Votes | Postal Votes | Total Valid Votes | Vote Share (%) | Status / Designation |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **1** | Kalvakuntla Chandrashekar Rao | Bharat Rashtra Samithi (BRS) | 110,984 | 700 | **111,684** | 49.05% of valid / 48.05% of polled | **Winner** |
| **2** | Eatala Rajender | Bharatiya Janata Party (BJP) | 65,961 | 692 | **66,653** | 29.27% of valid / 28.68% of polled | **Runner-up** |
| **3** | Thoomkunta Narsa Reddy | Indian National Congress (INC) | 32,318 | 250 | **32,568** | 14.30% of valid / 14.01% of polled | **Third-place candidate** |
| 4 | Jakkani Sanjay Kumar | Bahujan Samaj Party (BSP) | — | — | 2,743 | 1.20% | Fourth-place candidate |
| 5 | Mekala Raghuma Reddy | Yuga Thulasi Party (YTP) | — | — | 2,232 | 0.98% | Fifth-place candidate |
| 6 | Kinnera Yadaiah | Independent (IND) | — | — | 1,998 | 0.88% | Sixth-place candidate |
| 7 | Nirudi Swamy | Independent (IND) | — | — | 1,400 | 0.61% | Seventh-place candidate |
| 8 | R. Nikhil | Independent (IND) | — | — | 1,371 | 0.60% | Eighth-place candidate |
| 9 | Poreddy Venugopal | Aabaad Party | — | — | 1,281 | 0.56% | Ninth-place candidate |
| 10 | V. Sadananda Reddy | People Protection Party | — | — | 1,049 | 0.46% | Tenth-place candidate |
| 11 | Rangannagari Jyothi | India Praja Bandhu Party | — | — | 967 | 0.42% | Eleventh-place candidate |
| 12 | Racha Subhadra Reddy | Socialist Party (India) | — | — | 721 | 0.32% | Twelfth-place candidate |
| 13 | Ashok Pothu | Mana Telangana Rashtra Samaikya Party | — | — | 647 | 0.28% | Thirteenth-place candidate |
| 14 | Navnanandi Limbareddy | Independent (IND) | — | — | 553 | 0.24% | Fourteenth-place candidate |
| 15 | Vollala Praveen Kumar Rao | Samaikyandhra Parirakshana Samithi | — | — | 508 | 0.22% | Fifteenth-place candidate |
| 16 | Pagidipala Rama Raju | Yuva Taram Party | — | — | 495 | 0.22% | Sixteenth-place candidate |
| — | **None of the Above (NOTA)** | Non-Candidate Choice | — | — | **832** | 0.37% of valid / 0.36% of polled | Statutory Ballot Choice |
| — | **TOTAL VALID VOTES** | — | — | — | **227,702** | 100.00% | Full Constituency Sum |

---

## 3. Statutory Finding on Form 20 vs Form 21E

1. **Eatala Rajender Vote Count Proven Conclusively:**
   All official statutory tables from the Election Commission of India (ECI Detailed Results, Constituency Summary, and Returning Officer declaration) confirm that Eatala Rajender received **66,653 votes** (65,961 EVM + 692 Postal). The figure of **91,753** previously stored in the W019 benchmark is an erroneous figure that does not correspond to statutory evidence.

2. **Victory Margin Proven Conclusively:**
   With KCR at 111,684 and Eatala Rajender at 66,653, the true victory margin is **45,031 votes** (not 19,931 votes).

3. **NOTA Proven Conclusively:**
   NOTA received **832 votes** (not 1,347 votes).

4. **Rejected Votes Classification:**
   No independent statutory Form 20 record for rejected votes has been retrieved for Gajwel. The previous figure of 1,347 was derived from $241,855 - 240,508 = 1,347$. Under CTO directive, this value **MUST REMAIN UNKNOWN** until an independent source artifact is verified.
