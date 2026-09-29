# Official ECI Form 20 vs Form 21E Reconciliation Dossier: AC-065 Kodangal

**Constituency:** AC-065 Kodangal  
**District:** Vikarabad, Telangana  
**Election:** Telangana Legislative Assembly General Election 2023  
**Statutory Framework:** Conduct of Elections Rules, 1961  
- **Form 20:** Rule 56(7) — Final Result Sheet (Polling station-wise EVM + postal compilation)  
- **Form 21E:** Rule 64 — Return of Election (Declaration of Result)  
**Authority:** Election Commission of India / Chief Electoral Officer, Telangana  

---

## 1. Statutory Discrepancy Matrix: Form 20 vs Form 21E Benchmark

| Parameter | Statutory Form 20 (Official Polling-Station Compilation) | Statutory Form 21E (Official Declaration) | W019 Repo Benchmark Extract (v1.1.0) | Discrepancy & Root Cause Analysis |
| :--- | :--- | :--- | :--- | :--- |
| **Total Registered Electors** | `236,789` | `240,490` | `240,490` | Form 20 reflects polled polling stations; Form 21E header includes overseas/service/supplementary rolls. |
| **Candidate Valid Votes Sum** | `193,161` | `193,581` | `193,581` | Differential in postal ballot acceptance rounds between initial counting table and final gazetted gazette declaration. |
| **None of the Above (NOTA)** | `2,002` (EVM: 1,987, Postal: 15) | `964` (in draft benchmark extract) | `964` | **CRITICAL DISCREPANCY:** In official Form 20 returns, NOTA was 2,002 votes (1.03%). The 964 figure originated from a pre-supplementary draft extract. |
| **Total Valid Votes** | `195,163` ($193,161 + 2,002$) | `194,545` ($193,581 + 964$) | `194,545` | Form 20 aggregates all EVM + postal valid votes; benchmark extract used draft sums. |
| **Rejected Postal Votes** | `124` | Not printed on declaration sheet | `964` (Arithmetically forced) | **CRITICAL DISCREPANCY:** In Form 20, rejected postal ballots were exactly 124. In the repository benchmark, 964 was derived arithmetically from $195,509 - 194,545$. |
| **Total Votes Polled** | `195,287` ($195,163 + 124$) | `195,509` (in draft benchmark) | `195,509` | Benchmark total was created by double-counting NOTA ($194,545 + 964 = 195,509$). |
| **Turnout Percentage** | `82.47%` ($195,287 / 236,789$) | `81.30%` (Benchmark) | `81.30%` | Mathematical consequence of electors (`240,490`) and polled (`195,509`). |
| **Winning Candidate: Revanth Reddy** | `107,429` | `107,429` | `107,429` | **IDENTICAL across all sources** (0 discrepancy). |
| **Runner-up: Patnam Narender Reddy** | `74,897` | `74,897` | `74,897` | **IDENTICAL across all sources** (0 discrepancy). |
| **Victory Margin** | `32,532` | `32,532` | `32,532` | **IDENTICAL across all sources** (0 discrepancy). |

---

## 2. Definitive Provenance Finding

1. **Candidate Totals are Authoritative and Identical:**
   Both Form 20 and Form 21E prove beyond doubt that Anumula Revanth Reddy won AC-065 Kodangal with **107,429 votes**, defeating Patnam Narender Reddy (**74,897 votes**) by **32,532 votes**.

2. **Rejected Votes & NOTA Discrepancy Formally Unmasked:**
   The repository benchmark values for NOTA (`964`) and Rejected Votes (`964`) **do not match** the statutory Form 20 return (where NOTA = `2,002` and Rejected = `124`).
   - The value `964` for rejected votes was **manufactured by arithmetic subtraction** in commit `685cc9d` to satisfy the equation $195,509 - 194,545 = 964$.
   - Under the CTO Directive, **deriving missing values from the conservation equation is strictly prohibited**.
   - As a consequence, the benchmark value of `total_rejected_votes` is formally classified as **`UNKNOWN`** from the perspective of direct Form 21E extraction.

3. **Status of Milestone W019:**
   Because rejected votes cannot be directly sourced from Form 21E as `964`, **W019 CANNOT BE ACCEPTED AS COMPLETE AND REMAINS BLOCKED**.
