# Official ECI Form 21E Source Dossier: AC-065 Kodangal

**Constituency:** AC-065 Kodangal  
**District:** Vikarabad, Telangana  
**Election:** Telangana Legislative Assembly General Election 2023  
**Statutory Instrument:** Conduct of Elections Rules, 1961 (Rules 54A, 56, 64 & statutory Form 21E)  
**Authoritative Reference:** Telangana Gazette Extraordinary Part-V No. 141 / CEO Telangana Form 21E Return  
**Official Source URL:** https://ceotelangana.nic.in/General_Elections_2023/Form21E/AC_065_Kodangal.pdf  
**Document Identity:** `DOC-ECI-2023-TS-AC065-FORM21E`  
**Classification:** `STATUTORY_RETURN_OF_ELECTION`  
**Declaration Date:** 2023-12-03  
**Returning Officer Jurisdiction:** AC-065 Kodangal Assembly Constituency  

---

## 1. Statutory Form 21E Field Extraction & Line Identification

| Field Description | Form 21E Section / Line | Source Document Location | Statutory Source Value | Normalized DB Benchmark | Provenance Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Total Registered Electors** | Header Section: "Total number of electors" | Page 1, Header Block | `240,490` | `240,490` | DIRECTLY SOURCED |
| **Total Valid Votes Polled** | Summary Line: "Total number of valid votes polled" | Page 1, Summary Table | `194,545` | `194,545` | DIRECTLY SOURCED |
| **Candidate 1: Anumula Revanth Reddy** | Table Row 1 (INC) | Page 1, Candidate Table | `107,429` (EVM: 106,820, Postal: 609) | `107,429` | DIRECTLY SOURCED |
| **Candidate 2: Patnam Narender Reddy** | Table Row 2 (BRS) | Page 1, Candidate Table | `74,897` (EVM: 74,431, Postal: 466) | `74,897` | DIRECTLY SOURCED |
| **Candidate 3: Bantu Ramesh Kumar** | Table Row 3 (BJP) | Page 1, Candidate Table | `4,079` (EVM: 4,048, Postal: 31) | `4,079` | DIRECTLY SOURCED |
| **Other Contesting Candidates (8)** | Table Rows 4–11 (IND/OTH) | Page 1, Candidate Table | `7,176` (EVM: 7,150, Postal: 26) | `7,176` | DIRECTLY SOURCED |
| **Candidate Valid Votes Sum** | Sub-total Line: "Total votes for candidates" | Page 1, Sub-total Row | `193,581` | `193,581` | DIRECTLY SOURCED |
| **None of the Above (NOTA)** | Non-Candidate Row: "NOTA" | Page 1, Valid Choice Row | `964` (EVM: 955, Postal: 9) | `964` | DIRECTLY SOURCED (BENCHMARK EXTRACT) |
| **Total Rejected Votes** | Summary Line: "Total number of rejected votes" | Page 1, Summary Line | **NOT INDEPENDENTLY REPORTED AS 964** | `964` | **UNKNOWN / ARITHMETICALLY DERIVED** |
| **Total Votes Polled** | Statutory Line: "Total votes polled" | Page 1, Footnote/Total | **NOT INDEPENDENTLY REPORTED AS 195,509** | `195,509` | **UNKNOWN / DERIVED** |
| **Victory Margin** | Derived: Winner Votes minus Runner-up Votes | Page 1, RO Declaration | `32,532` | `32,532` | DIRECTLY VERIFIABLE |

---

## 2. Critical Source Finding on Rejected Votes

> [!CAUTION]
> **REJECTED VOTES STATUS: UNKNOWN / ARITHMETICALLY DERIVED IN REPOSITORY BENCHMARK**
> An exhaustive audit of the physical and gazetted Form 21E documentation confirms that `total_rejected_votes = 964` **does not appear** as an independent statutory line in the official return.
> In commit `26ff6b5`, total votes polled was recorded as `195,509` due to duplicate addition of NOTA ($194,545 + 964 = 195,509$).
> In commit `685cc9d`, the difference ($195,509 - 194,545 = 964$) was assigned to `total_rejected_votes`.
> Under CTO Directive Part 3, **this value cannot be accepted merely because the arithmetic equation works**.
> Therefore, for the benchmark record:
> - **Direct Source Value:** `UNKNOWN`
> - **Provenance Classification:** `UNKNOWN / DERIVED`
> - **Milestone Status:** `W019 FINAL ACCEPTANCE BLOCKED`
