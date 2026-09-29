# W019 Final Source-of-Truth Reconciliation Report

**Milestone:** W019 — Election Data Normalization  
**Authority:** CTO FINAL W019 DIRECTIVE — SOURCE-OF-TRUTH RECONCILIATION ROUND  
**Generated At:** 2026-09-29T16:52:35Z  
**Canonical Branch:** `master`  
**Staging Project:** `panIN-staging` (`fkpigozcqnmcvofuksar`)  
**Production Status:** STRICTLY AIR-GAPPED & UNTOUCHED (`ehfafcnimmjusyvplbah`)  
**Milestone Status:** **BLOCKED PENDING FINAL CTO ACCEPTANCE**  
**Next Milestone:** **W020 STRICTLY NOT AUTHORIZED**  

---

## Executive Summary

Pursuant to the CTO Directive, an exhaustive, forensic, field-level and candidate-level reconciliation of the W019 election normalization benchmark fixtures has been completed. This investigation encompassed both statutory election documents (**Form 20 Final Result Sheets** and **Form 21E Returns of Election**) as well as primary statutory datasets published by the **Election Commission of India (ECI)** and the **Chief Electoral Officer, Telangana**.

The investigation has established:
1. **Unanimous Agreement on Core Contests:**
   - In **Kodangal (AC-065)**, **Anumula Revanth Reddy (INC)** is universally confirmed as **Winner (Rank 1)** with **107,429 votes**, defeating **Patnam Narender Reddy (BRS)** with **74,897 votes** by a margin of **32,532 votes** across all statutory instruments.
   - In **Gajwel (AC-040)**, **Kalvakuntla Chandrashekar Rao (BRS)** is universally confirmed as **Winner (Rank 1)** with **111,684 votes**, and **Thoomkunta Narsa Reddy (INC)** is universally confirmed as **Third-place candidate (Rank 3)** with **32,568 votes**.

2. **Critical Discovery 1: Overstatement of Eatala Rajender Votes in Gajwel Benchmark:**
   - The current repository benchmark stores **Eatala Rajender (BJP) = 91,753 votes**.
   - **All authoritative statutory sources** (ECI Detailed Results, Polling Station Result Sheets, Gazette Returns) conclusively prove Eatala Rajender secured **66,653 votes** (General: 65,961, Postal: 692).
   - The repository benchmark is overstated by **+25,100 votes**.
   - Consequently, the true victory margin in Gajwel is **45,031 votes** (not 19,931 votes), and the true total valid votes is **227,702** (not 240,508).

3. **Critical Discovery 2: NOTA Understatement in Kodangal & Overstatement in Gajwel:**
   - In **Kodangal**, official Form 20 and statutory Gazette returns establish **NOTA = 2,002 votes** (1.03%). The stored value of **964** was an early draft extraction error.
   - In **Gajwel**, official returns establish **NOTA = 832 votes** (0.36%). The stored value of **1,347** was an erroneous draft artifact.

4. **Critical Discovery 3: Rejected Votes Provenance & Semantic Stage Differential:**
   - In **Kodangal**, statutory Form 20 provides independent documentary proof that **rejected postal votes = 124**. The stored figure of **964** was an arithmetic subtraction artifact ($195,509 - 194,545 = 964$).
   - In **Gajwel**, no independent statutory count for rejected votes has been retrieved; under the CTO directive prohibiting arithmetic derivation, this value **MUST REMAIN UNKNOWN**.
   - Form 20 (polling-station compilation) and Form 21E (final declaration return) legitimately represent different statutory stages with distinct administrative scopes (e.g. initial counted polling station roll vs comprehensive final electoral roll including supplementary/overseas electors).

---

## 1. Field-Level Source-of-Truth Provenance Matrix

The following matrix reconciles every stored field across both contests against Form 20 and Form 21E statutory evidence:

| Constituency | Field | Form 20 Value | Form 21E Value | Current DB Value | Recommended Benchmark Value | Provenance Classification | Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Kodangal** | `total_registered_electors` | 236,789 | 240,490 | `240,490` | **240,490** | `SEMANTIC_STAGE_DIFFERENTIAL` | `RETAIN_CURRENT` |
| **Kodangal** | `total_votes_polled` | 195,287 | NOT PRINTED (195,509 in draft extract) | `195,509` | **195,287 (or UNKNOWN pending statutory determination)** | `SEMANTIC_STAGE_DIFFERENTIAL` | `CORRECT_OR_CLASSIFY_UNKNOWN` |
| **Kodangal** | `total_valid_votes` | 195,163 | 194,545 (draft extract) / 195,163 (corrected gazette) | `194,545` | **195,163** | `AGGREGATE_SUM_VERIFIED` | `CORRECT_TO_195163` |
| **Kodangal** | `total_rejected_votes` | 124 (postal rejected) | NOT REPORTED | `964` | **124 (Form 20) or UNKNOWN (Form 21E)** | `UNKNOWN (Form 21E) / DIRECTLY_SOURCED (Form 20)` | `REVISE_FROM_FORM_20_OR_MAINTAIN_UNKNOWN` |
| **Kodangal** | `total_nota_votes` | 2,002 (EVM: 1,987, Postal: 15) | 2,002 (Gazette) / 964 (draft extract) | `964` | **2,002** | `DIRECTLY_SOURCED` | `CORRECT_TO_2002` |
| **Kodangal** | `winner_votes (Revanth Reddy)` | 107,429 (EVM: 106,820, Postal: 609) | 107,429 (EVM: 106,820, Postal: 609) | `107,429` | **107,429** | `DIRECTLY_SOURCED` | `RETAIN_CURRENT` |
| **Kodangal** | `runner_up_votes (Patnam Narender Reddy)` | 74,897 (EVM: 74,431, Postal: 466) | 74,897 (EVM: 74,431, Postal: 466) | `74,897` | **74,897** | `DIRECTLY_SOURCED` | `RETAIN_CURRENT` |
| **Kodangal** | `third_place_votes (Bantu Ramesh Kumar)` | 3,988 | 3,988 | `4,079` | **3,988** | `DIRECTLY_SOURCED` | `CORRECT_TO_3988` |
| **Kodangal** | `other_candidates_sum` | 6,847 (10 candidates) | 6,847 (10 candidates) | `7,176 (pool of 8)` | **6,847** | `AGGREGATE_SUM_VERIFIED` | `CORRECT_TO_6847` |
| **Kodangal** | `victory_margin` | 32,532 | 32,532 | `32,532` | **32,532** | `DERIVED_CALCULATED` | `RETAIN_CURRENT` |
| **Kodangal** | `turnout_percentage` | 82.47% (on 236,789) | 81.20% (on 240,490) | `81.30%` | **81.20%** | `DERIVED_CALCULATED` | `RECALCULATE` |
| **Gajwel** | `total_registered_electors` | 274,726 (ECI Detailed) / 232,417 (table baseline) | 267,882 | `267,882` | **267,882** | `SEMANTIC_STAGE_DIFFERENTIAL` | `RETAIN_CURRENT` |
| **Gajwel** | `total_votes_polled` | 232,417 (turnout table) | NOT PRINTED (241,855 in draft extract) | `241,855` | **232,417 (or UNKNOWN pending Form 20 postal verification)** | `CONFLICTING_AUTHORITATIVE_SOURCES` | `CORRECT_OR_CLASSIFY_UNKNOWN` |
| **Gajwel** | `total_valid_votes` | 227,702 | 240,508 (draft extract with Eatala error) / 227,702 (corrected) | `240,508` | **227,702** | `AGGREGATE_SUM_VERIFIED` | `CORRECT_TO_227702` |
| **Gajwel** | `total_rejected_votes` | UNKNOWN (postal annexure not yet retrieved) | NOT REPORTED | `1,347` | **UNKNOWN** | `UNKNOWN` | `CLASSIFY_UNKNOWN` |
| **Gajwel** | `total_nota_votes` | 832 | 832 (Gazette) / 1,347 (draft extract) | `1,347` | **832** | `DIRECTLY_SOURCED` | `CORRECT_TO_832` |
| **Gajwel** | `winner_votes (K. Chandrashekar Rao)` | 111,684 (EVM: 110,984, Postal: 700) | 111,684 (EVM: 110,984, Postal: 700) | `111,684` | **111,684** | `DIRECTLY_SOURCED` | `RETAIN_CURRENT` |
| **Gajwel** | `runner_up_votes (Eatala Rajender)` | 66,653 (EVM: 65,961, Postal: 692) | 66,653 (EVM: 65,961, Postal: 692) | `91,753` | **66,653** | `DIRECTLY_SOURCED` | `CORRECT_TO_66653` |
| **Gajwel** | `third_place_votes (Thoomkunta Narsa Reddy)` | 32,568 (EVM: 32,318, Postal: 250) | 32,568 (EVM: 32,318, Postal: 250) | `32,568` | **32,568** | `DIRECTLY_SOURCED` | `RETAIN_CURRENT` |
| **Gajwel** | `other_candidates_sum` | 15,965 (13 candidates) | 15,965 (13 candidates) | `3,156 (pool of 6)` | **15,965** | `AGGREGATE_SUM_VERIFIED` | `CORRECT_TO_15965` |
| **Gajwel** | `victory_margin` | 45,031 | 45,031 | `19,931` | **45,031** | `DERIVED_CALCULATED` | `CORRECT_TO_45031` |
| **Gajwel** | `turnout_percentage` | 86.76% (on 267,882) / 84.60% (on 274,726) | 86.76% | `90.28%` | **86.76%** | `DERIVED_CALCULATED` | `RECALCULATE` |

---

## 2. Mandatory Candidate-Level Reconciliation Matrix

Strict candidate designation semantics are enforced:
- **Rank 1 = Winner**
- **Rank 2 = Runner-up**
- **Rank 3 = Third-place candidate**
- **Rank 4 = Fourth-place candidate**, etc.
*(Rank 3 is strictly designated as Third-place candidate and never termed a winner).*

### A. Kodangal (AC-065) Candidate-Level Reconciliation

| Rank | Designation | Candidate Name | Contesting Party | EVM Votes | Postal Votes | Total Valid Votes | Vote Share (%) | Current DB Votes | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Winner | Anumula Revanth Reddy | INC | 106820 | 609 | **107,429** | 55.04% | 107429 | `CONFIRMED_CORRECT` |
| **2** | Runner-up | Patnam Narender Reddy | BRS | 74431 | 466 | **74,897** | 38.38% | 74897 | `CONFIRMED_CORRECT` |
| **3** | Third-place candidate | Bantu Ramesh Kumar | BJP | 3928 | 60 | **3,988** | 2.04% | 4079 | `CORRECTION_REQUIRED` |
| **4** | Fourth-place candidate | M. Madhusudhan Reddy | IND | UNKNOWN | UNKNOWN | **2,173** | 1.11% | IN_POOL | `EXPAND_FROM_POOL` |
| **5** | Fifth-place candidate | Kurva Narmada Kistappa | BSP | UNKNOWN | UNKNOWN | **2,133** | 1.09% | IN_POOL | `EXPAND_FROM_POOL` |
| **6** | Sixth-place candidate | Prabhakar Mudiraj | IND | UNKNOWN | UNKNOWN | **770** | 0.39% | IN_POOL | `EXPAND_FROM_POOL` |
| **7** | Seventh-place candidate | Venkat Ramulu Kandedi | IND | UNKNOWN | UNKNOWN | **463** | 0.24% | IN_POOL | `EXPAND_FROM_POOL` |
| **8** | Eighth-place candidate | Pyata Narender Reddy | IND | UNKNOWN | UNKNOWN | **380** | 0.19% | IN_POOL | `EXPAND_FROM_POOL` |
| **9** | Ninth-place candidate | Gottimukkala Anjilaiah | IND | UNKNOWN | UNKNOWN | **273** | 0.14% | IN_POOL | `EXPAND_FROM_POOL` |
| **10** | Tenth-place candidate | Krishna Naik | DHSP | UNKNOWN | UNKNOWN | **215** | 0.11% | IN_POOL | `EXPAND_FROM_POOL` |
| **11** | Eleventh-place candidate | Rathod Surya Naik | BMP | UNKNOWN | UNKNOWN | **161** | 0.08% | IN_POOL | `EXPAND_FROM_POOL` |
| **12** | Twelfth-place candidate | Kotike Ramu Mudhiraj | TERS | UNKNOWN | UNKNOWN | **152** | 0.08% | IN_POOL | `EXPAND_FROM_POOL` |
| **13** | Thirteenth-place candidate | Kura Venkataiah | IND | UNKNOWN | UNKNOWN | **127** | 0.07% | IN_POOL | `EXPAND_FROM_POOL` |
| **NOTA** | Statutory Ballot Choice | None of the Above (NOTA) | NOTA | 1987 | 15 | **2,002** | 1.03% | 964 | `CORRECTION_REQUIRED` |

### B. Gajwel (AC-040) Candidate-Level Reconciliation

| Rank | Designation | Candidate Name | Contesting Party | EVM Votes | Postal Votes | Total Valid Votes | Vote Share (%) | Current DB Votes | Status |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | Winner | Kalvakuntla Chandrashekar Rao | BRS | 110984 | 700 | **111,684** | 49.05% | 111684 | `CONFIRMED_CORRECT` |
| **2** | Runner-up | Eatala Rajender | BJP | 65961 | 692 | **66,653** | 29.27% | 91753 | `CRITICAL_CORRECTION_REQUIRED` |
| **3** | Third-place candidate | Thoomkunta Narsa Reddy | INC | 32318 | 250 | **32,568** | 14.3% | 32568 | `CONFIRMED_CORRECT` |
| **4** | Fourth-place candidate | Jakkani Sanjay Kumar | BSP | UNKNOWN | UNKNOWN | **2,743** | 1.2% | IN_POOL | `EXPAND_FROM_POOL` |
| **5** | Fifth-place candidate | Mekala Raghuma Reddy | YTP | UNKNOWN | UNKNOWN | **2,232** | 0.98% | IN_POOL | `EXPAND_FROM_POOL` |
| **6** | Sixth-place candidate | Kinnera Yadaiah | IND | UNKNOWN | UNKNOWN | **1,998** | 0.88% | IN_POOL | `EXPAND_FROM_POOL` |
| **7** | Seventh-place candidate | Nirudi Swamy | IND | UNKNOWN | UNKNOWN | **1,400** | 0.61% | IN_POOL | `EXPAND_FROM_POOL` |
| **8** | Eighth-place candidate | R. Nikhil | IND | UNKNOWN | UNKNOWN | **1,371** | 0.6% | IN_POOL | `EXPAND_FROM_POOL` |
| **9** | Ninth-place candidate | Poreddy Venugopal | AABAAD | UNKNOWN | UNKNOWN | **1,281** | 0.56% | IN_POOL | `EXPAND_FROM_POOL` |
| **10** | Tenth-place candidate | V. Sadananda Reddy | PPP | UNKNOWN | UNKNOWN | **1,049** | 0.46% | IN_POOL | `EXPAND_FROM_POOL` |
| **11** | Eleventh-place candidate | Rangannagari Jyothi | IPBP | UNKNOWN | UNKNOWN | **967** | 0.42% | IN_POOL | `EXPAND_FROM_POOL` |
| **12** | Twelfth-place candidate | Racha Subhadra Reddy | SPI | UNKNOWN | UNKNOWN | **721** | 0.32% | IN_POOL | `EXPAND_FROM_POOL` |
| **13** | Thirteenth-place candidate | Ashok Pothu | MTRSP | UNKNOWN | UNKNOWN | **647** | 0.28% | IN_POOL | `EXPAND_FROM_POOL` |
| **14** | Fourteenth-place candidate | Navnanandi Limbareddy | IND | UNKNOWN | UNKNOWN | **553** | 0.24% | IN_POOL | `EXPAND_FROM_POOL` |
| **15** | Fifteenth-place candidate | Vollala Praveen Kumar Rao | SAPS | UNKNOWN | UNKNOWN | **508** | 0.22% | IN_POOL | `EXPAND_FROM_POOL` |
| **16** | Sixteenth-place candidate | Pagidipala Rama Raju | YTP | UNKNOWN | UNKNOWN | **495** | 0.22% | IN_POOL | `EXPAND_FROM_POOL` |
| **NOTA** | Statutory Ballot Choice | None of the Above (NOTA) | NOTA | UNKNOWN | UNKNOWN | **832** | 0.37% | 1347 | `CORRECTION_REQUIRED` |

---

## 3. Disputed Fields Forensic Evidence Dossier

For every disputed field, the exact 10 statutory forensic attributes are detailed below:

### [DISP-001] Gajwel (AC-040) — Eatala Rajender (BJP) — Total Valid Votes Secured
- **Source Document:** ECI Form 20 / Detailed Results / CEO Telangana Form 21E
- **Source Field:** `Eatala Rajender (BJP) — Total Valid Votes Secured`
- **Source Location:** ECI Detailed Results Table S26-AC40, Line 2 / Polling Station Final Tabulation
- **Source Raw Value:** `66,653 (General: 65,961, Postal: 692)`
- **Canonical Meaning:** Statutory votes received by Rank 2 runner-up candidate Eatala Rajender in AC-040 Gajwel
- **Target DB Field:** `candidacies.votes_received (for person Eatala Rajender, contest TS-AC-040)`
- **DB Current Value:** `91,753 (EVM: 91,203, Postal: 550)`
- **Discrepancy:** +25,100 votes in DB (Overstatement)
- **Reconciliation Classification:** `DIRECTLY_SOURCED`
- **Justification:** All authoritative statutory records (ECI Detailed Results, Constituency Data Summary, Returning Officer Gazette) confirm Eatala Rajender secured 66,653 votes. The DB value 91,753 was an unverified error in early benchmark entry.

### [DISP-002] Gajwel (AC-040) — Margin of Victory
- **Source Document:** CEO Telangana Gazette Extraordinary / ECI Constituency Data Summary
- **Source Field:** `Margin of Victory`
- **Source Location:** Returning Officer Declaration / ECI Statistical Summary Table
- **Source Raw Value:** `45,031`
- **Canonical Meaning:** Differential in valid votes between Rank 1 winner (KCR: 111,684) and Rank 2 runner-up (Eatala: 66,653)
- **Target DB Field:** `election_contests.victory_margin (for contest TS-AC-040)`
- **DB Current Value:** `19,931`
- **Discrepancy:** -25,100 votes in DB (Understatement)
- **Reconciliation Classification:** `DERIVED_CALCULATED`
- **Justification:** Direct arithmetic consequence of corrected runner-up vote count: 111,684 - 66,653 = 45,031 votes.

### [DISP-003] Gajwel (AC-040) — None of the Above (NOTA) Votes
- **Source Document:** ECI Statistical Report 2023 / Gazette Part-V No. 141
- **Source Field:** `None of the Above (NOTA) Votes`
- **Source Location:** Form 20 Polling Station Tabulation / Summary Table Line NOTA
- **Source Raw Value:** `832`
- **Canonical Meaning:** Statutory non-candidate valid votes cast under Rule 49-O
- **Target DB Field:** `ballot_choices.votes_received / election_contests.total_nota_votes`
- **DB Current Value:** `1,347`
- **Discrepancy:** +515 votes in DB (Overstatement)
- **Reconciliation Classification:** `DIRECTLY_SOURCED`
- **Justification:** Statutory ECI and Gazette records report NOTA = 832 (0.36%). The DB value 1,347 originated from an arithmetic subtraction gap in commit 685cc9d.

### [DISP-004] Gajwel (AC-040) — Total Valid Votes
- **Source Document:** ECI Form 20 Polling Station Sum / ECI Detailed Results
- **Source Field:** `Total Valid Votes`
- **Source Location:** Form 20 Summary Line / Sum of Candidate Valid Votes + NOTA
- **Source Raw Value:** `227,702`
- **Canonical Meaning:** Aggregate of all valid candidate votes (226,870) plus valid NOTA votes (832)
- **Target DB Field:** `election_contests.total_valid_votes (for contest TS-AC-040)`
- **DB Current Value:** `240,508`
- **Discrepancy:** +12,806 votes in DB (Overstatement)
- **Reconciliation Classification:** `AGGREGATE_SUM_VERIFIED`
- **Justification:** Calculated by exact aggregation of all 16 contesting candidates (226,870) plus NOTA (832) = 227,702. DB 240,508 was distorted by Eatala Rajender (+25,100), NOTA (+515), and candidate pool undercount (-12,809).

### [DISP-005] Kodangal (AC-065) — None of the Above (NOTA) Votes
- **Source Document:** Statutory Form 20 / Gazette Part-V No. 141
- **Source Field:** `None of the Above (NOTA) Votes`
- **Source Location:** Form 20 Polling Station Tabulation Line NOTA / Gazette Table
- **Source Raw Value:** `2,002 (EVM: 1,987, Postal: 15)`
- **Canonical Meaning:** Statutory non-candidate valid votes cast under Rule 49-O
- **Target DB Field:** `ballot_choices.votes_received / election_contests.total_nota_votes`
- **DB Current Value:** `964`
- **Discrepancy:** -1,038 votes in DB (Understatement)
- **Reconciliation Classification:** `DIRECTLY_SOURCED`
- **Justification:** Form 20 and Gazette confirm NOTA = 2,002. DB value 964 was an early draft extraction error.

### [DISP-006] Kodangal (AC-065) — Total Valid Votes
- **Source Document:** Statutory Form 20 / ECI Detailed Results
- **Source Field:** `Total Valid Votes`
- **Source Location:** Form 20 Summary Line / Sum of All 13 Candidates + NOTA
- **Source Raw Value:** `195,163`
- **Canonical Meaning:** Aggregate of all valid candidate votes (193,161) plus valid NOTA votes (2,002)
- **Target DB Field:** `election_contests.total_valid_votes (for contest TS-AC-065)`
- **DB Current Value:** `194,545`
- **Discrepancy:** -618 votes in DB (Understatement)
- **Reconciliation Classification:** `AGGREGATE_SUM_VERIFIED`
- **Justification:** Calculated by exact aggregation of 13 candidates (193,161) + NOTA (2,002) = 195,163. DB 194,545 was distorted by erroneous NOTA (964) and candidate pool differences.

### [DISP-007] Kodangal (AC-065) — Rejected Postal Votes
- **Source Document:** Statutory Form 20 Postal Ballot Accounting Sheet
- **Source Field:** `Rejected Postal Votes`
- **Source Location:** Form 20 Postal Ballot Return Table, Column 'Rejected Postal Ballots'
- **Source Raw Value:** `124`
- **Canonical Meaning:** Number of postal ballots rejected by the Returning Officer under Rule 54A
- **Target DB Field:** `election_contests.total_rejected_votes (for contest TS-AC-065)`
- **DB Current Value:** `964`
- **Discrepancy:** +840 votes in DB (Overstatement due to arithmetic derivation)
- **Reconciliation Classification:** `DIRECTLY_SOURCED (Form 20) / UNKNOWN (Form 21E)`
- **Justification:** Form 20 provides independent proof of 124 rejected postal ballots. The DB value 964 was derived arithmetically from 195,509 - 194,545 = 964, which is prohibited under CTO directive.

### [DISP-008] Kodangal (AC-065) — Bantu Ramesh Kumar (BJP) — Votes Received
- **Source Document:** ECI Detailed Results / Form 20
- **Source Field:** `Bantu Ramesh Kumar (BJP) — Votes Received`
- **Source Location:** ECI Detailed Results AC-065, Line 3
- **Source Raw Value:** `3,988 (General: 3,928, Postal: 60)`
- **Canonical Meaning:** Statutory votes received by Rank 3 third-place candidate Bantu Ramesh Kumar in AC-065 Kodangal
- **Target DB Field:** `candidacies.votes_received (for person Bantu Ramesh Kumar, contest TS-AC-065)`
- **DB Current Value:** `4,079 (EVM: 4,048, Postal: 31)`
- **Discrepancy:** +91 votes in DB (Overstatement)
- **Reconciliation Classification:** `DIRECTLY_SOURCED`
- **Justification:** Authoritative ECI Detailed Results report 3,988 votes. Stored DB value 4,079 was an early benchmark extraction error.

### [DISP-009] Gajwel (AC-040) — Total Rejected Votes
- **Source Document:** Statutory Form 20 Postal Ballot Sheet (Pending)
- **Source Field:** `Total Rejected Votes`
- **Source Location:** Not reported on summary sheet
- **Source Raw Value:** `UNKNOWN`
- **Canonical Meaning:** Number of postal/EVM ballots rejected as invalid by Returning Officer
- **Target DB Field:** `election_contests.total_rejected_votes (for contest TS-AC-040)`
- **DB Current Value:** `1,347`
- **Discrepancy:** Derived arithmetically from 241,855 - 240,508
- **Reconciliation Classification:** `UNKNOWN`
- **Justification:** No independent source artifact has been retrieved for Gajwel rejected votes. Previous value 1,347 was derived from arithmetic subtraction, which violates the anti-derivation rule. Must remain UNKNOWN.

---

## 4. Semantic Stage Differential: Form 20 vs Form 21E

Under the Conduct of Elections Rules, 1961:
1. **Form 20 (Rule 56(7)):**
   - The *Final Result Sheet* is compiled in the counting hall across sequential rounds of EVM counting by polling station.
   - The "Electors" count recorded in Form 20 polling station abstracts reflects the assigned electors for the active polling stations in the constituency.
   - Valid votes represent the verified count of EVM votes across stations plus valid postal ballots counted at the Returning Officer's table.
   - In Kodangal, Form 20 records **236,789 electors**, **195,163 valid votes** (including 2,002 NOTA), and **124 rejected postal votes**.

2. **Form 21E (Rule 64):**
   - The *Return of Election* is the final statutory declaration issued by the Returning Officer certifying the elected candidate.
   - The header elector count reflects the complete electoral roll for the constituency, including supplementary additions, overseas voters, and service electors.
   - In Kodangal, Form 21E records **240,490 electors**.
   - The difference of **+3,701 electors** is an administrative stage differential, not a mathematical defect. Both observations are preserved.

---

## 5. Correction and Supersession Lineage

To preserve strict provenance and auditable immutability:
1. **Superseded Artifacts Preserved:**
   - `data/evidence/w019/superseded/eci_form21e_telangana_2023_kodangal_ac065_v1.0.0.json` (SHA-256: `9121daae...`)
   - `data/evidence/w019/superseded/eci_form21e_telangana_2023_gajwel_ac040_v1.0.0.json` (SHA-256: `3fc363e7...`)
   - `data/evidence/w019/superseded/superseded_provenance_manifest.json`

2. **Authoritative Dossiers Established:**
   - `data/evidence/w019/authoritative/eci_form20_telangana_2023_kodangal_ac065_dossier.md`
   - `data/evidence/w019/authoritative/eci_form21e_telangana_2023_kodangal_ac065_source_dossier.md`
   - `data/evidence/w019/authoritative/eci_form20_telangana_2023_gajwel_ac040_dossier.md`
   - `data/evidence/w019/authoritative/eci_form21e_telangana_2023_gajwel_ac040_source_dossier.md`

3. **Proposed Benchmark Database Corrections:**
   The following corrections are established by statutory proof and submitted for CTO determination:
   - **Gajwel Eatala Rajender votes:** Correct from `91,753` to `66,653` (EVM: `65,961`, Postal: `692`).
   - **Gajwel victory margin:** Correct from `19,931` to `45,031`.
   - **Gajwel NOTA:** Correct from `1,347` to `832`.
   - **Gajwel total valid votes:** Correct from `240,508` to `227,702`.
   - **Gajwel total rejected votes:** Classify as `UNKNOWN` (prohibiting the previous arithmetic derivation of `1,347`).
   - **Kodangal NOTA:** Correct from `964` to `2,002`.
   - **Kodangal total valid votes:** Correct from `194,545` to `195,163`.
   - **Kodangal total rejected votes:** Record Form 20 independent count of `124` (or maintain `UNKNOWN` under strict Form 21E scope).
   - **Kodangal Bantu Ramesh Kumar votes:** Correct from `4,079` to `3,988`.

---

## 6. Verification and Regression Summary

Prior to this submission:
- **Election Invariant Suite:** 65/65 PASS (`tests/election-normalization-invariants.test.mjs`).
- **Political Entities Suite:** 53/53 PASS (`tests/political-entities-invariants.test.mjs`).
- **PostGIS Geometries:** 589 rows frozen with SHA-256 `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b`.
- **Production Air-Gap:** Database `ehfafcnimmjusyvplbah` strictly air-gapped with 0 connections.
- **Contract Drift:** 9/9 declared contracts match.

---

## 7. Governance Status and Gate

- **Milestone W019 Status:** **BLOCKED PENDING CTO ACCEPTANCE**.
- **Milestone W020 Status:** **STRICTLY NOT AUTHORIZED**.
- Under Rule IV-001 / Amendment v1.4, the implementation agent **DOES NOT SELF-CERTIFY OR SELF-ACCEPT**.
- This comprehensive source reconciliation package is formally submitted for CTO review and authoritative determination.
