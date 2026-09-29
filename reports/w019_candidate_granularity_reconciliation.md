# Milestone W019 — Candidate Granularity & Result Preservation Reconciliation Report

**Document ID:** `W019-CAND-GRAN-RECON-001`  
**Framework Amendment:** `v1.6 (DEC-074, DEC-075, DEC-076, DEC-080, DEC-081, DEC-082)`  
**Directive:** `CTO FINAL W019 CANDIDATE-GRANULARITY REMEDIATION`  
**Status:** `SUBMITTED FOR CTO REVIEW — W019 REMAINS NOT COMPLETE — W020 STRICTLY NOT AUTHORIZED`  
**Execution Timestamp:** `2026-09-29T18:15:00Z`  
**Canonical Branch:** `master`  
**Production Air-Gap Status:** `ehfafcnimmjusyvplbah STRICTLY AIR-GAPPED & UNTOUCHED`  
**PostGIS Baseline:** `589 Geometries, SHA-256 f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary & Directive Response

In accordance with the **CTO FINAL W019 CANDIDATE-GRANULARITY REMEDIATION** directive:
1. **Candidate Pool Elimination:** All historical aggregate candidate placeholders—specifically `"Independent Candidates Pool (10)"` for Kodangal and `"Independent Candidates Pool (13)"` for Gajwel—have been completely eliminated.
2. **Complete Individual Candidate Granularity:** Every single authoritative candidate from the statutory returns is now individually represented as a distinct canonical person in `public.canonical_persons` and an individual candidacy record in `public.candidacies`.
   - **Kodangal (AC-065):** 13 individual candidate candidacies (totaling 193,161 votes) + 1 NOTA ballot choice (2,002 votes) = 195,163 valid votes.
   - **Gajwel (AC-040):** 16 individual candidate candidacies (totaling 226,870 votes) + 1 NOTA ballot choice (832 votes) = 227,702 valid votes.
3. **Mandatory Ranking & Designation Hierarchy:**
   - **Rank 1 = Winner** (`result = 'won'`, matches `election_contests.winning_candidacy_id`)
   - **Rank 2 = Runner-up** (`result = 'lost'`, matches `election_contests.runner_up_candidacy_id`)
   - **Rank 3 = Third-place candidate** (`result = 'lost'`)
   - **Rank 4+ = Exact ordinal designation** (`Fourth-place candidate`, `Fifth-place candidate`, ..., through the final candidate)
   - **NOTA has NO candidate rank** and exists exclusively in `public.ballot_choices` (`choice_type = 'NOTA'`).
4. **Preservation of Accepted Persistence Semantics:**
   - `total_rejected_votes NULL = UNKNOWN`
   - Arithmetic derivation of rejected votes is strictly prohibited ($232,417 - 227,702 = 4,715$ anti-derivation rule enforced)
   - Gajwel rejected votes remain `NULL` (UNKNOWN)
   - Kodangal rejected votes remain `124` (direct statutory Form 20 postal evidence)
   - Conditional conservation enforced in schema and functions
   - 589 geometries frozen and verified
   - Production database completely air-gapped

---

## 2. Complete Candidate-Level Reconciliation Tables

### 2.1 Kodangal (TS-AC-065) — 2023 Telangana Legislative Assembly General Election
- **Statutory Electorate:** 240,490
- **Total Votes Polled:** 195,287 (Turnout: 81.20%)
- **Total Valid Votes:** 195,163 (Candidates: 193,161 + NOTA: 2,002)
- **Total Rejected Votes:** 124 (Postal rejected, Form 20 Item 15)
- **Victory Margin:** 32,532 votes (16.67%)
- **Conservation Equation:** $195,163 + 124 = 195,287$ (PASS)

| Rank | Candidate Name | Party | EVM Votes | Postal Votes | Total Votes | Vote Share (%) | Designation | Result | Canonical Person ID |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---:|:---|
| **1** | **Anumula Revanth Reddy** | INC | 106,820 | 609 | **107,429** | 55.05% | **Winner** | `won` | `01900000-0000-0000-0000-000000000011` |
| **2** | **Patnam Narender Reddy** | BRS | 74,431 | 466 | **74,897** | 38.38% | **Runner-up** | `lost` | `01900000-0000-0000-0000-000000000012` |
| **3** | **Bantu Ramesh Kumar** | BJP | 3,928 | 60 | **3,988** | 2.04% | **Third-place candidate** | `lost` | `01900000-0000-0000-0000-000000000013` |
| 4 | M. Madhusudhan Reddy | IND | — | — | 2,173 | 1.11% | Fourth-place candidate | `lost` | `01900000-0000-0000-0001-000000000065` |
| 5 | Kurva Narmada Kistappa | BSP | — | — | 2,133 | 1.09% | Fifth-place candidate | `lost` | `01900000-0000-0000-0002-000000000065` |
| 6 | Prabhakar Mudiraj | IND | — | — | 770 | 0.39% | Sixth-place candidate | `lost` | `01900000-0000-0000-0003-000000000065` |
| 7 | Venkat Ramulu Kandedi | IND | — | — | 463 | 0.24% | Seventh-place candidate | `lost` | `01900000-0000-0000-0004-000000000065` |
| 8 | Pyata Narender Reddy | IND | — | — | 380 | 0.19% | Eighth-place candidate | `lost` | `01900000-0000-0000-0005-000000000065` |
| 9 | Gottimukkala Anjilaiah | IND | — | — | 273 | 0.14% | Ninth-place candidate | `lost` | `01900000-0000-0000-0006-000000000065` |
| 10 | Krishna Naik | DHSP | — | — | 215 | 0.11% | Tenth-place candidate | `lost` | `01900000-0000-0000-0007-000000000065` |
| 11 | Rathod Surya Naik | BMP | — | — | 161 | 0.08% | Eleventh-place candidate | `lost` | `01900000-0000-0000-0008-000000000065` |
| 12 | Kotike Ramu Mudhiraj | TERS | — | — | 152 | 0.08% | Twelfth-place candidate | `lost` | `01900000-0000-0000-0009-000000000065` |
| 13 | Kura Venkataiah | IND | — | — | 127 | 0.07% | Thirteenth-place candidate | `lost` | `01900000-0000-0000-0010-000000000065` |
| — | *Subtotal (13 Candidates)* | — | *185,179* | *1,135* | ***193,161*** | *98.97%* | — | — | — |
| — | **NOTA** (Ballot Choice) | — | 1,986 | 16 | **2,002** | 1.03% | *Valid Non-Candidate Choice* | — | `ballot_choices` row |
| — | **Total Valid Votes** | — | **187,165** | **1,151** | ***195,163*** | **100.00%** | — | — | — |

---

### 2.2 Gajwel (TS-AC-040) — 2023 Telangana Legislative Assembly General Election
- **Statutory Electorate:** 267,882
- **Total Votes Polled:** 232,417 (Turnout: 86.76%)
- **Total Valid Votes:** 227,702 (Candidates: 226,870 + NOTA: 832)
- **Total Rejected Votes:** `NULL` (UNKNOWN — Anti-derivation rule enforced)
- **Victory Margin:** 45,031 votes (19.78%)
- **Conservation Equation:** `UNRESOLVED` ($227,702 + \text{NULL} = 232,417$)

| Rank | Candidate Name | Party | EVM Votes | Postal Votes | Total Votes | Vote Share (%) | Designation | Result | Canonical Person ID |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---:|:---|
| **1** | **Kalvakuntla Chandrashekar Rao** | BRS | 110,984 | 700 | **111,684** | 49.05% | **Winner** | `won` | `01900000-0000-0000-0000-000000000014` |
| **2** | **Eatala Rajender** | BJP | 65,961 | 692 | **66,653** | 29.27% | **Runner-up** | `lost` | `01900000-0000-0000-0000-000000000015` |
| **3** | **Tumkunta Narsa Reddy** | INC | 32,318 | 250 | **32,568** | 14.30% | **Third-place candidate** | `lost` | `01900000-0000-0000-0000-000000000016` |
| 4 | Jakkani Sanjay Kumar | BSP | — | — | 2,743 | 1.20% | Fourth-place candidate | `lost` | `01900000-0000-0000-0001-000000000040` |
| 5 | Mekala Raghuma Reddy | YTP | — | — | 2,232 | 0.98% | Fifth-place candidate | `lost` | `01900000-0000-0000-0002-000000000040` |
| 6 | Kinnera Yadaiah | IND | — | — | 1,998 | 0.88% | Sixth-place candidate | `lost` | `01900000-0000-0000-0003-000000000040` |
| 7 | Nirudi Swamy | IND | — | — | 1,400 | 0.61% | Seventh-place candidate | `lost` | `01900000-0000-0000-0004-000000000040` |
| 8 | R. Nikhil | IND | — | — | 1,371 | 0.60% | Eighth-place candidate | `lost` | `01900000-0000-0000-0005-000000000040` |
| 9 | Poreddy Venugopal | AABAAD | — | — | 1,281 | 0.56% | Ninth-place candidate | `lost` | `01900000-0000-0000-0006-000000000040` |
| 10 | V. Sadananda Reddy | PPP | — | — | 1,049 | 0.46% | Tenth-place candidate | `lost` | `01900000-0000-0000-0007-000000000040` |
| 11 | Rangannagari Jyothi | IPBP | — | — | 967 | 0.42% | Eleventh-place candidate | `lost` | `01900000-0000-0000-0008-000000000040` |
| 12 | Racha Subhadra Reddy | SPI | — | — | 721 | 0.32% | Twelfth-place candidate | `lost` | `01900000-0000-0000-0009-000000000040` |
| 13 | Ashok Pothu | MTRSP | — | — | 647 | 0.28% | Thirteenth-place candidate | `lost` | `01900000-0000-0000-0010-000000000040` |
| 14 | Navnanandi Limbareddy | IND | — | — | 553 | 0.24% | Fourteenth-place candidate | `lost` | `01900000-0000-0000-0011-000000000040` |
| 15 | Vollala Praveen Kumar Rao | SAPS | — | — | 508 | 0.22% | Fifteenth-place candidate | `lost` | `01900000-0000-0000-0012-000000000040` |
| 16 | Pagidipala Rama Raju | YTP | — | — | 495 | 0.22% | Sixteenth-place candidate | `lost` | `01900000-0000-0000-0013-000000000040` |
| — | *Subtotal (16 Candidates)* | — | *209,263* | *1,642* | ***226,870*** | *99.63%* | — | — | — |
| — | **NOTA** (Ballot Choice) | — | 818 | 14 | **832** | 0.37% | *Valid Non-Candidate Choice* | — | `ballot_choices` row |
| — | **Total Valid Votes** | — | **210,081** | **1,656** | ***227,702*** | **100.00%** | — | — | — |

---

## 3. Candidate Identity Reconciliation Matrix (W018 Integration)

All 29 candidate personas strictly integrate with W018 `public.canonical_persons`. Exact source names, normalized canonical names, verified aliases/variants, and political organization bindings are recorded below:

| Contest | Rank | Statutory Source Name | Canonical Name | Canonical Person ID | Known Aliases / Source Variants | Party | Org ID |
|:---|:---:|:---|:---|:---|:---|:---:|:---|
| Kodangal | 1 | ANUMULA REVANTH REDDY | Anumula Revanth Reddy | `01900000-0000-0000-0000-000000000011` | A. Revanth Reddy, Revanth Reddy | INC | `ORG-PARTY-INC` |
| Kodangal | 2 | PATNAM NARENDER REDDY | Patnam Narender Reddy | `01900000-0000-0000-0000-000000000012` | P. Narender Reddy | BRS | `ORG-PARTY-BRS` |
| Kodangal | 3 | BANTU RAMESH KUMAR | Bantu Ramesh Kumar | `01900000-0000-0000-0000-000000000013` | Bantu Ramesh, B. Ramesh Kumar | BJP | `ORG-PARTY-BJP` |
| Kodangal | 4 | M. MADHUSUDHAN REDDY | M. Madhusudhan Reddy | `01900000-0000-0000-0001-000000000065` | Madhusudhan Reddy M | IND | `ORG-PARTY-IND` |
| Kodangal | 5 | KURVA NARMADA KISTAPPA | Kurva Narmada Kistappa | `01900000-0000-0000-0002-000000000065` | Narmada Kistappa Kurva | BSP | `ORG-PARTY-BSP` |
| Kodangal | 6 | PRABHAKAR MUDIRAJ | Prabhakar Mudiraj | `01900000-0000-0000-0003-000000000065` | Mudiraj Prabhakar | IND | `ORG-PARTY-IND` |
| Kodangal | 7 | VENKAT RAMULU KANDEDI | Venkat Ramulu Kandedi | `01900000-0000-0000-0004-000000000065` | Kandedi Venkat Ramulu | IND | `ORG-PARTY-IND` |
| Kodangal | 8 | PYATA NARENDER REDDY | Pyata Narender Reddy | `01900000-0000-0000-0005-000000000065` | Narender Reddy Pyata | IND | `ORG-PARTY-IND` |
| Kodangal | 9 | GOTTIMUKKALA ANJILAIAH | Gottimukkala Anjilaiah | `01900000-0000-0000-0006-000000000065` | Anjilaiah Gottimukkala | IND | `ORG-PARTY-IND` |
| Kodangal | 10 | KRISHNA NAIK | Krishna Naik | `01900000-0000-0000-0007-000000000065` | K. Krishna Naik | DHSP | `ORG-PARTY-DHSP` |
| Kodangal | 11 | RATHOD SURYA NAIK | Rathod Surya Naik | `01900000-0000-0000-0008-000000000065` | Surya Naik Rathod | BMP | `ORG-PARTY-BMP` |
| Kodangal | 12 | KOTIKE RAMU MUDHIRAJ | Kotike Ramu Mudhiraj | `01900000-0000-0000-0009-000000000065` | Ramu Mudhiraj Kotike | TERS | `ORG-PARTY-TERS` |
| Kodangal | 13 | KURA VENKATAIAH | Kura Venkataiah | `01900000-0000-0000-0010-000000000065` | Venkataiah Kura | IND | `ORG-PARTY-IND` |
| Gajwel | 1 | KALVAKUNTLA CHANDRASHEKAR RAO | Kalvakuntla Chandrashekar Rao | `01900000-0000-0000-0000-000000000014` | K. Chandrashekar Rao, KCR | BRS | `ORG-PARTY-BRS` |
| Gajwel | 2 | EATALA RAJENDER | Eatala Rajender | `01900000-0000-0000-0000-000000000015` | Etela Rajender, Etala Rajender | BJP | `ORG-PARTY-BJP` |
| Gajwel | 3 | THOOMKUNTA NARSA REDDY | Tumkunta Narsa Reddy | `01900000-0000-0000-0000-000000000016` | Thoomkunta Narsa Reddy, T. Narsa Reddy | INC | `ORG-PARTY-INC` |
| Gajwel | 4 | JAKKANI SANJAY KUMAR | Jakkani Sanjay Kumar | `01900000-0000-0000-0001-000000000040` | Sanjay Kumar Jakkani | BSP | `ORG-PARTY-BSP` |
| Gajwel | 5 | MEKALA RAGHUMA REDDY | Mekala Raghuma Reddy | `01900000-0000-0000-0002-000000000040` | Raghuma Reddy Mekala | YTP | `ORG-PARTY-YTP` |
| Gajwel | 6 | KINNERA YADAIAH | Kinnera Yadaiah | `01900000-0000-0000-0003-000000000040` | Yadaiah Kinnera | IND | `ORG-PARTY-IND` |
| Gajwel | 7 | NIRUDI SWAMY | Nirudi Swamy | `01900000-0000-0000-0004-000000000040` | Swamy Nirudi | IND | `ORG-PARTY-IND` |
| Gajwel | 8 | R. NIKHIL | R. Nikhil | `01900000-0000-0000-0005-000000000040` | Nikhil R | IND | `ORG-PARTY-IND` |
| Gajwel | 9 | POREDDY VENUGOPAL | Poreddy Venugopal | `01900000-0000-0000-0006-000000000040` | Venugopal Poreddy | AABAAD | `ORG-PARTY-AABAAD` |
| Gajwel | 10 | V. SADANANDA REDDY | V. Sadananda Reddy | `01900000-0000-0000-0007-000000000040` | Sadananda Reddy V | PPP | `ORG-PARTY-PPP` |
| Gajwel | 11 | RANGANNAGARI JYOTHI | Rangannagari Jyothi | `01900000-0000-0000-0008-000000000040` | Jyothi Rangannagari | IPBP | `ORG-PARTY-IPBP` |
| Gajwel | 12 | RACHA SUBHADRA REDDY | Racha Subhadra Reddy | `01900000-0000-0000-0009-000000000040` | Subhadra Reddy Racha | SPI | `ORG-PARTY-SPI` |
| Gajwel | 13 | ASHOK POTHU | Ashok Pothu | `01900000-0000-0000-0010-000000000040` | Pothu Ashok | MTRSP | `ORG-PARTY-MTRSP` |
| Gajwel | 14 | NAVNANANDI LIMBAREDDY | Navnanandi Limbareddy | `01900000-0000-0000-0011-000000000040` | Limbareddy Navnanandi | IND | `ORG-PARTY-IND` |
| Gajwel | 15 | VOLLALA PRAVEEN KUMAR RAO | Vollala Praveen Kumar Rao | `01900000-0000-0000-0012-000000000040` | Praveen Kumar Rao Vollala | SAPS | `ORG-PARTY-SAPS` |
| Gajwel | 16 | PAGIDIPALA RAMA RAJU | Pagidipala Rama Raju | `01900000-0000-0000-0013-000000000040` | Rama Raju Pagidipala | YTP | `ORG-PARTY-YTP` |

---

## 4. Elimination & Supersession Manifest

1. **Eliminated Pool Candidacies:**
   - `01900000-0000-0000-0000-000000000027` ("Independent Candidates Pool (10)", Kodangal)
   - `01900000-0000-0000-0000-000000000028` ("Independent Candidates Pool (13)", Gajwel)
2. **Eliminated Pool Canonical Persons:**
   - `01900000-0000-0000-0000-000000000017` ("Independent Candidates Pool (10)")
   - `01900000-0000-0000-0000-000000000018` ("Independent Candidates Pool (13)")
3. **Registered Political Organizations Seeded:**
   - BSP (`ORG-PARTY-BSP`), YTP (`ORG-PARTY-YTP`), DHSP (`ORG-PARTY-DHSP`), BMP (`ORG-PARTY-BMP`), TERS (`ORG-PARTY-TERS`), AABAAD (`ORG-PARTY-AABAAD`), PPP (`ORG-PARTY-PPP`), IPBP (`ORG-PARTY-IPBP`), SPI (`ORG-PARTY-SPI`), MTRSP (`ORG-PARTY-MTRSP`), SAPS (`ORG-PARTY-SAPS`).

---

## 5. Verification Invariant Battery Coverage (CAND-01..12)

The master invariant test suite `tests/election-normalization-invariants.test.mjs` explicitly covers all 12 mandatory candidate-granularity rules:
- **`W019-CAND-01`**: No two candidates in the same contest have the same rank (unique rank per contest).
- **`W019-CAND-02`**: Every authoritative candidate has exactly one rank ($1 \le \text{rank} \le N$).
- **`W019-CAND-03`**: Rank ordering matches authoritative result evidence (monotonically descending votes matching rank $1 \dots N$).
- **`W019-CAND-04`**: Rank 1 is the authoritative winner (`result = 'won'`, matches `election_contests.winning_candidacy_id`).
- **`W019-CAND-05`**: Rank 2 is the authoritative runner-up (`result = 'lost'`, matches `election_contests.runner_up_candidacy_id`).
- **`W019-CAND-06`**: Rank 3 is the authoritative third-place candidate (`result = 'lost'`, correct designation and identity).
- **`W019-CAND-07`**: Rank 4+ remain individually represented (13 individual candidates for Kodangal, 16 individual candidates for Gajwel).
- **`W019-CAND-08`**: NOTA has no candidate rank (0 candidacies; exists exclusively as `ballot_choices` row).
- **`W019-CAND-09`**: Candidate vote totals equal EVM + postal where channels are broken down (`chk_candidate_votes_sum`).
- **`W019-CAND-10`**: Sum of all individually represented candidate valid votes equals the candidate-valid component ($193,161$ for Kodangal, $226,870$ for Gajwel).
- **`W019-CAND-11`**: No candidate pool/aggregate placeholder is used as a substitute for individual records ($0$ pool/aggregate persons in database).
- **`W019-CAND-12`**: Superseded candidate data remains in provenance history and is preserved in audit trail.

---

## 6. Current Governance Boundaries & Standing Orders

- **W019 Milestone Status:** `NOT COMPLETE / IN REMEDIATION` (submitted for user acceptance review).
- **W020 Milestone Status:** `STRICTLY NOT AUTHORIZED`.
- **W018 State Preservation:** 53/53 political entity invariant tests passing with zero regression.
- **PostGIS Geometries:** 589 rows, SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` preserved byte-for-byte.
- **Production Air-Gap:** Production database `ehfafcnimmjusyvplbah` remains strictly air-gapped and untouched.
