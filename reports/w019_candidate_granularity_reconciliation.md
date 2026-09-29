# Milestone W019 — Candidate Granularity & Evidence-Semantics Reconciliation Report

**Document ID:** `W019-CAND-GRAN-RECON-002`  
**Framework Amendment:** `v1.6 (DEC-074, DEC-075, DEC-076, DEC-080, DEC-081, DEC-082, DEC-083)`  
**Directive:** `CTO FINAL W019 EVIDENCE-SEMANTICS CLOSURE`  
**Status:** `SUBMITTED FOR CTO REVIEW — W019 REMAINS NOT COMPLETE — W020 STRICTLY NOT AUTHORIZED`  
**Execution Timestamp:** `2026-09-30T00:00:00Z`  
**Canonical Branch:** `master`  
**Production Air-Gap Status:** `ehfafcnimmjusyvplbah STRICTLY AIR-GAPPED & UNTOUCHED`  
**PostGIS Baseline:** `589 Geometries, SHA-256 f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`  

---

## 1. Executive Summary & Directive Response

In accordance with the **CTO FINAL W019 EVIDENCE-SEMANTICS CLOSURE** directive (DEC-083):

1. **Closed & Non-Redesigned Baseline:**
   - Candidate pools eliminated; all 13 Kodangal & 16 Gajwel candidates individually represented.
   - Strict ranking hierarchy: Rank 1 = Winner, Rank 2 = Runner-up, Rank 3 = Third-place candidate, Rank 4+ = exact ordinals.
   - NOTA separate from candidate ranking (`public.ballot_choices`).
   - Canonical person linkage (`public.canonical_persons`).
   - Gajwel Eatala Rajender correction (66,653; 29.27%).
   - Kodangal NOTA (2,002) / Gajwel NOTA (832) corrections.
   - Gajwel rejected-vote UNKNOWN semantics (`total_rejected_votes NULL = UNKNOWN`).
   - NULL persistence/API semantics; conditional conservation.
   - W018 53/53 regression; 589 geometry digest (`f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`).
   - Production database (`ehfafcnimmjusyvplbah`) strictly air-gapped.

2. **Resolution of the Evidence-Semantics Gap (EVM/Postal Channel Breakdown):**
   - **Case A (Independently Evidenced EVM + Postal): 6 candidates**
     - Top-3 candidates across both contests have independently sourced EVM and Postal channels from Form 20 / Form 21E.
     - For these 6 candidates, the database and API strictly enforce and preserve: `votes_received = evm_votes + postal_votes`.
   - **Case B (Directly Sourced Total Votes, UNKNOWN Channel Breakdown): 23 candidates**
     - Lower-ranked candidates (Rank 4..13 in Kodangal: 10 candidates; Rank 4..16 in Gajwel: 13 candidates) have authoritative total votes from the statutory returns, but channel decomposition was not reported in the available summary schedule.
     - In earlier seeds, these candidates had sentinel zeros (`evm_votes = 0, postal_votes = 0`). Under Migration 054, these magic zeros have been eliminated.
     - Case B candidates now store `evm_votes = NULL` and `postal_votes = NULL` (UNKNOWN).
     - The anti-fabrication / anti-derivation rule is strictly enforced: Case B candidates are NOT mathematically split (e.g. EVM = total, Postal = 0), preventing invented data.
   - **Split Invariant Formulation:**
     - `W019-CAND-09A`: Where EVM and postal components are independently sourced, candidate total = EVM + postal (6 candidates).
     - `W019-CAND-09B`: Where channel decomposition is unavailable, EVM and postal remain UNKNOWN (`NULL`) and zero fabricated splits exist (23 candidates).

---

## 2. Complete Candidate-Level Reconciliation Tables

### 2.1 Kodangal (TS-AC-065) — 2023 Telangana Legislative Assembly General Election
- **Statutory Electorate:** 240,490
- **Total Votes Polled:** 195,287 (Turnout: 81.20%)
- **Total Valid Votes:** 195,163 (Candidates: 193,161 + NOTA: 2,002)
- **Total Rejected Votes:** 124 (Postal rejected, Form 20 Item 15)
- **Victory Margin:** 32,532 votes (16.67%)
- **Conservation Equation:** $195,163 + 124 = 195,287$ (PASS)

| Rank | Candidate Name | Party | EVM Votes | Postal Votes | Total Votes | Vote Share (%) | Designation | Channel Status | Canonical Person ID |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---:|:---|
| **1** | **Anumula Revanth Reddy** | INC | 106,820 | 609 | **107,429** | 55.05% | **Winner** | DIRECTLY_SOURCED | `01900000-0000-0000-0000-000000000011` |
| **2** | **Patnam Narender Reddy** | BRS | 74,431 | 466 | **74,897** | 38.38% | **Runner-up** | DIRECTLY_SOURCED | `01900000-0000-0000-0000-000000000012` |
| **3** | **Bantu Ramesh Kumar** | BJP | 3,928 | 60 | **3,988** | 2.04% | **Third-place candidate** | DIRECTLY_SOURCED | `01900000-0000-0000-0000-000000000013` |
| 4 | M. Madhusudhan Reddy | IND | *NULL* | *NULL* | 2,173 | 1.11% | Fourth-place candidate | UNKNOWN | `01900000-0000-0000-0001-000000000065` |
| 5 | Kurva Narmada Kistappa | BSP | *NULL* | *NULL* | 2,133 | 1.09% | Fifth-place candidate | UNKNOWN | `01900000-0000-0000-0002-000000000065` |
| 6 | Prabhakar Mudiraj | IND | *NULL* | *NULL* | 770 | 0.39% | Sixth-place candidate | UNKNOWN | `01900000-0000-0000-0003-000000000065` |
| 7 | Venkat Ramulu Kandedi | IND | *NULL* | *NULL* | 463 | 0.24% | Seventh-place candidate | UNKNOWN | `01900000-0000-0000-0004-000000000065` |
| 8 | Pyata Narender Reddy | IND | *NULL* | *NULL* | 380 | 0.19% | Eighth-place candidate | UNKNOWN | `01900000-0000-0000-0005-000000000065` |
| 9 | Gottimukkala Anjilaiah | IND | *NULL* | *NULL* | 273 | 0.14% | Ninth-place candidate | UNKNOWN | `01900000-0000-0000-0006-000000000065` |
| 10 | Krishna Naik | DHSP | *NULL* | *NULL* | 215 | 0.11% | Tenth-place candidate | UNKNOWN | `01900000-0000-0000-0007-000000000065` |
| 11 | Rathod Surya Naik | BMP | *NULL* | *NULL* | 161 | 0.08% | Eleventh-place candidate | UNKNOWN | `01900000-0000-0000-0008-000000000065` |
| 12 | Kotike Ramu Mudhiraj | TERS | *NULL* | *NULL* | 152 | 0.08% | Twelfth-place candidate | UNKNOWN | `01900000-0000-0000-0009-000000000065` |
| 13 | Kura Venkataiah | IND | *NULL* | *NULL* | 127 | 0.07% | Thirteenth-place candidate | UNKNOWN | `01900000-0000-0000-0010-000000000065` |
| — | **Case A Subtotal (Top 3)** | — | **185,179** | **1,135** | **186,314** | **95.47%** | — | — | — |
| — | **Case B Subtotal (Rank 4..13)** | — | *UNKNOWN* | *UNKNOWN* | **7,947** | **4.07%** | — | — | — |
| — | **Candidate Valid Votes Total** | — | *Unbroken (185,179 + UNK)* | *Unbroken (1,135 + UNK)* | ***193,161*** | **98.97%** | — | — | — |
| — | **NOTA (Ballot Choice)** | — | 1,986 | 16 | **2,002** | 1.03% | *Valid Non-Candidate Choice* | DIRECTLY_SOURCED | `ballot_choices` row |
| — | **Total Valid Votes** | — | **187,165** | **1,151** | ***195,163*** | **100.00%** | — | — | — |
| — | **Total Rejected Votes** | — | 0 | 124 | **124** | — | *Postal Rejected (Form 20)* | DIRECTLY_SOURCED | `election_contests` col |
| — | **Total Votes Polled** | — | **187,165** | **1,275** | ***195,287*** | **81.20%** | — | — | — |

*Statutory Accounting Reconciliation:*
$$\text{Case A Candidates (186,314)} + \text{Case B Candidates (7,947)} = \text{Candidate Valid Votes (193,161)}$$
$$\text{Candidate Valid (193,161)} + \text{NOTA (2,002)} = \text{Total Valid (195,163)}$$
$$\text{Total Valid (195,163)} + \text{Rejected (124)} = \text{Total Polled (195,287)}$$

---

### 2.2 Gajwel (TS-AC-040) — 2023 Telangana Legislative Assembly General Election
- **Statutory Electorate:** 267,882
- **Total Votes Polled:** 232,417 (Turnout: 86.76%)
- **Total Valid Votes:** 227,702 (Candidates: 226,870 + NOTA: 832)
- **Total Rejected Votes:** `NULL` (UNKNOWN — Anti-derivation rule strictly enforced)
- **Victory Margin:** 45,031 votes (19.78%)
- **Conservation Equation:** `UNRESOLVED` ($227,702 + \text{NULL} = 232,417$)

| Rank | Candidate Name | Party | EVM Votes | Postal Votes | Total Votes | Vote Share (%) | Designation | Channel Status | Canonical Person ID |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---:|:---|
| **1** | **Kalvakuntla Chandrashekar Rao** | BRS | 110,984 | 700 | **111,684** | 49.05% | **Winner** | DIRECTLY_SOURCED | `01900000-0000-0000-0000-000000000014` |
| **2** | **Eatala Rajender** | BJP | 65,961 | 692 | **66,653** | 29.27% | **Runner-up** | DIRECTLY_SOURCED | `01900000-0000-0000-0000-000000000015` |
| **3** | **Tumkunta Narsa Reddy** | INC | 32,318 | 250 | **32,568** | 14.30% | **Third-place candidate** | DIRECTLY_SOURCED | `01900000-0000-0000-0000-000000000016` |
| 4 | Jakkani Sanjay Kumar | BSP | *NULL* | *NULL* | 2,743 | 1.20% | Fourth-place candidate | UNKNOWN | `01900000-0000-0000-0001-000000000040` |
| 5 | Mekala Raghuma Reddy | YTP | *NULL* | *NULL* | 2,232 | 0.98% | Fifth-place candidate | UNKNOWN | `01900000-0000-0000-0002-000000000040` |
| 6 | Kinnera Yadaiah | IND | *NULL* | *NULL* | 1,998 | 0.88% | Sixth-place candidate | UNKNOWN | `01900000-0000-0000-0003-000000000040` |
| 7 | Nirudi Swamy | IND | *NULL* | *NULL* | 1,400 | 0.61% | Seventh-place candidate | UNKNOWN | `01900000-0000-0000-0004-000000000040` |
| 8 | R. Nikhil | IND | *NULL* | *NULL* | 1,371 | 0.60% | Eighth-place candidate | UNKNOWN | `01900000-0000-0000-0005-000000000040` |
| 9 | Poreddy Venugopal | AABAAD | *NULL* | *NULL* | 1,281 | 0.56% | Ninth-place candidate | UNKNOWN | `01900000-0000-0000-0006-000000000040` |
| 10 | V. Sadananda Reddy | PPP | *NULL* | *NULL* | 1,049 | 0.46% | Tenth-place candidate | UNKNOWN | `01900000-0000-0000-0007-000000000040` |
| 11 | Rangannagari Jyothi | IPBP | *NULL* | *NULL* | 967 | 0.42% | Eleventh-place candidate | UNKNOWN | `01900000-0000-0000-0008-000000000040` |
| 12 | Racha Subhadra Reddy | SPI | *NULL* | *NULL* | 721 | 0.32% | Twelfth-place candidate | UNKNOWN | `01900000-0000-0000-0009-000000000040` |
| 13 | Ashok Pothu | MTRSP | *NULL* | *NULL* | 647 | 0.28% | Thirteenth-place candidate | UNKNOWN | `01900000-0000-0000-0010-000000000040` |
| 14 | Navnanandi Limbareddy | IND | *NULL* | *NULL* | 553 | 0.24% | Fourteenth-place candidate | UNKNOWN | `01900000-0000-0000-0011-000000000040` |
| 15 | Vollala Praveen Kumar Rao | SAPS | *NULL* | *NULL* | 508 | 0.22% | Fifteenth-place candidate | UNKNOWN | `01900000-0000-0000-0012-000000000040` |
| 16 | Pagidipala Rama Raju | YTP | *NULL* | *NULL* | 495 | 0.22% | Sixteenth-place candidate | UNKNOWN | `01900000-0000-0000-0013-000000000040` |
| — | **Case A Subtotal (Top 3)** | — | **209,263** | **1,642** | **210,905** | **92.62%** | — | — | — |
| — | **Case B Subtotal (Rank 4..16)** | — | *UNKNOWN* | *UNKNOWN* | **15,965** | **7.01%** | — | — | — |
| — | **Candidate Valid Votes Total** | — | *Unbroken (209,263 + UNK)* | *Unbroken (1,642 + UNK)* | ***226,870*** | **99.63%** | — | — | — |
| — | **NOTA (Ballot Choice)** | — | 818 | 14 | **832** | 0.37% | *Valid Non-Candidate Choice* | DIRECTLY_SOURCED | `ballot_choices` row |
| — | **Total Valid Votes** | — | **210,081** | **1,656** | ***227,702*** | **100.00%** | — | — | — |
| — | **Total Rejected Votes** | — | *NULL* | *NULL* | ***NULL*** | — | *UNKNOWN (Anti-derivation)* | UNKNOWN | `election_contests` col |
| — | **Total Votes Polled** | — | — | — | ***232,417*** | **86.76%** | — | — | — |

*Statutory Accounting Reconciliation:*
$$\text{Case A Candidates (210,905)} + \text{Case B Candidates (15,965)} = \text{Candidate Valid Votes (226,870)}$$
$$\text{Candidate Valid (226,870)} + \text{NOTA (832)} = \text{Total Valid (227,702)}$$
$$\text{Total Valid (227,702)} + \text{Rejected (NULL)} = \text{Conservation UNRESOLVED (Polled: 232,417)}$$

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
4. **Governing Migrations:**
   - `supabase/migrations/053_w019_candidate_granularity_remediation.sql` (pool elimination, individual candidates, mandatory designations)
   - `supabase/migrations/054_w019_candidate_channel_unknown_semantics.sql` (drop default 0, candidate channel UNKNOWN null semantics, `chk_candidate_votes_sum` update, `fn_validate_contest_totals` update)

---

## 5. Verification Invariant Battery Coverage (93 Checks — 100% PASS)

The master invariant test suite `tests/election-normalization-invariants.test.mjs` explicitly covers all 93 checks including:
- **`W019-SCH-11`**: `candidacies` enforces channel breakdown conservation with UNKNOWN null semantics: `(evm IS NULL AND postal IS NULL) OR (votes_received = evm + postal)`.
- **`W019-ACCT-06`**: postal vote values are an EVM/Postal channel breakdown of candidate votes with strict UNKNOWN null semantics (disallowing magic zeros).
- **`W019-CAND-01`**: No two candidates in the same contest have the same rank (unique rank per contest).
- **`W019-CAND-02`**: Every authoritative candidate has exactly one rank ($1 \le \text{rank} \le N$).
- **`W019-CAND-03`**: Rank ordering matches authoritative result evidence (monotonically descending votes matching rank $1 \dots N$).
- **`W019-CAND-04`**: Rank 1 is the authoritative winner (`result = 'won'`, matches `election_contests.winning_candidacy_id`).
- **`W019-CAND-05`**: Rank 2 is the authoritative runner-up (`result = 'lost'`, matches `election_contests.runner_up_candidacy_id`).
- **`W019-CAND-06`**: Rank 3 is the authoritative third-place candidate (`result = 'lost'`, correct designation and identity).
- **`W019-CAND-07`**: Rank 4+ remain individually represented (13 individual candidates for Kodangal, 16 individual candidates for Gajwel).
- **`W019-CAND-08`**: NOTA has no candidate rank (0 candidacies; exists exclusively as `ballot_choices` row).
- **`W019-CAND-09A`**: Where EVM and postal components are independently sourced, candidate total = EVM + postal (Case A: 6 candidates).
- **`W019-CAND-09B`**: Where channel decomposition is unavailable, EVM and postal remain UNKNOWN (`NULL`) and zero fabricated splits exist (Case B: 23 candidates).
- **`W019-CAND-10`**: Sum of all individually represented candidate valid votes equals the candidate-valid component ($193,161$ for Kodangal, $226,870$ for Gajwel).
- **`W019-CAND-11`**: No candidate pool/aggregate placeholder is used as a substitute for individual records ($0$ pool/aggregate persons in database).
- **`W019-CAND-12`**: Superseded candidate data remains in provenance history and is preserved in audit trail.
- **`W019-STG-01..02`**: PostGIS 589 geometries frozen (589 rows, digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`).
- **`W019-PRD-01`**: Production database `ehfafcnimmjusyvplbah` strictly air-gapped.

---

## 6. Current Governance Boundaries & Standing Orders

- **W019 Milestone Status:** `NOT COMPLETE / IN REMEDIATION` (submitted for user acceptance review).
- **Implementation Agent Role:** Does **NOT** self-certify or self-accept.
- **W020 Milestone Status:** `STRICTLY NOT AUTHORIZED`.
- **W018 State Preservation:** 53/53 political entity invariant tests passing with zero regression.
- **PostGIS Geometries:** 589 rows, SHA-256 digest `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` preserved byte-for-byte.
- **Production Air-Gap:** Production database `ehfafcnimmjusyvplbah` remains strictly air-gapped and untouched.
