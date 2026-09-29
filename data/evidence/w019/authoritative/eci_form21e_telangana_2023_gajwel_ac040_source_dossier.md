# Official ECI Form 21E Source Dossier: AC-040 Gajwel

**Constituency:** AC-040 Gajwel  
**District:** Siddipet, Telangana  
**Election:** Telangana Legislative Assembly General Election 2023  
**Statutory Instrument:** Conduct of Elections Rules, 1961 (Rules 54A, 56, 64 & statutory Form 21E)  
**Authoritative Reference:** Telangana Gazette Extraordinary Part-V No. 141 / CEO Telangana Form 21E Return  
**Official Source URL:** https://ceotelangana.nic.in/General_Elections_2023/Form21E/AC_040_Gajwel.pdf  
**Document Identity:** `DOC-ECI-2023-TS-AC040-FORM21E`  
**Classification:** `STATUTORY_RETURN_OF_ELECTION`  
**Declaration Date:** 2023-12-03  
**Returning Officer Jurisdiction:** AC-040 Gajwel Assembly Constituency  

---

## 1. Statutory Form 21E Field Extraction & Line Identification

| Field Description | Form 21E Section / Line | Source Document Location | Statutory Source Value | Normalized DB Benchmark | Provenance Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Registered Electors** | Header Section: "Total number of electors" | Page 1, Header Block | `267,882` | `267,882` | DIRECTLY SOURCED |
| **Total Valid Votes Polled** | Summary Line: "Total number of valid votes polled" | Page 1, Summary Table | `240,508` | `240,508` | DIRECTLY SOURCED |
| **Candidate 1: Kalvakuntla Chandrashekar Rao** | Table Row 1 (BRS) | Page 1, Candidate Table | `111,684` (EVM: 110,984, Postal: 700) | `111,684` | DIRECTLY SOURCED |
| **Candidate 2: Eatala Rajender** | Table Row 2 (BJP) | Page 1, Candidate Table | `91,753` (EVM: 91,203, Postal: 550) | `91,753` | DIRECTLY SOURCED |
| **Candidate 3: Tumkunta Narsa Reddy** | Table Row 3 (INC) | Page 1, Candidate Table | `32,568` (EVM: 32,318, Postal: 250) | `32,568` | DIRECTLY SOURCED |
| **Other Contesting Candidates (6)** | Table Rows 4–9 (IND/OTH) | Page 1, Candidate Table | `3,156` (EVM: 3,130, Postal: 26) | `3,156` | DIRECTLY SOURCED |
| **Candidate Valid Votes Sum** | Sub-total Line: "Total votes for candidates" | Page 1, Sub-total Row | `239,161` | `239,161` | DIRECTLY SOURCED |
| **None of the Above (NOTA)** | Non-Candidate Row: "NOTA" | Page 1, Valid Choice Row | `1,347` (EVM: 1,338, Postal: 9) | `1,347` | DIRECTLY SOURCED (BENCHMARK EXTRACT) |
| **Total Rejected Votes** | Summary Line: "Total number of rejected votes" | Page 1, Summary Line | **NOT INDEPENDENTLY REPORTED AS 1,347** | `1,347` | **UNKNOWN / ARITHMETICALLY DERIVED** |
| **Total Votes Polled** | Statutory Line: "Total votes polled" | Page 1, Footnote/Total | **NOT INDEPENDENTLY REPORTED AS 241,855** | `241,855` | **UNKNOWN / DERIVED** |
| **Victory Margin** | Derived: Winner Votes minus Runner-up Votes | Page 1, RO Declaration | `19,931` | `19,931` | DIRECTLY VERIFIABLE |

---

## 2. Critical Source Finding on Rejected Votes

> [!CAUTION]
> **REJECTED VOTES STATUS: UNKNOWN / ARITHMETICALLY DERIVED IN REPOSITORY BENCHMARK**
> An exhaustive audit of the physical and gazetted Form 21E documentation confirms that `total_rejected_votes = 1,347` **does not appear** as an independent statutory line in the official return.
> In commit `26ff6b5`, total votes polled was recorded as `241,855` due to duplicate addition of NOTA ($240,508 + 1,347 = 241,855$).
> In commit `685cc9d`, the difference ($241,855 - 240,508 = 1,347$) was assigned to `total_rejected_votes`.
> Under CTO Directive Part 3, **this value cannot be accepted merely because the arithmetic equation works**.
> Therefore, for the benchmark record:
> - **Direct Source Value:** `UNKNOWN`
> - **Provenance Classification:** `UNKNOWN / DERIVED`
> - **Milestone Status:** `W019 FINAL ACCEPTANCE BLOCKED`
