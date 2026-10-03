# W021.5-B2 CANONICAL POLITICAL IDENTITY RESOLUTION & DISAMBIGUATION MATRIX

**Milestone:** W021.5-B2 Architecture Freeze
**Governance Principle:** Zero False Merges Invariant (Rule IV-001)

> **Absolute Rule:** A numerical confidence score is NOT the sole merge authority. No automated merge may override an explicit identity conflict merely because a string similarity score is high.

## TIER_1_DETERMINISTIC (Authority: HIGHEST)

- **Auto-Merge Permitted:** true
- **Confidence Requirement:** 1

### Deterministic Identifiers

- **`ECI_CANDIDATE_ID`**: Unique candidate identifier issued by Election Commission of India on Affidavit Portal *(Provenance: ECI Candidate Affidavit Portal (affidavit.eci.gov.in))*
- **`SANSAD_MEMBER_ID`**: Official Lok Sabha / Rajya Sabha Secretariat member biographical ID *(Provenance: Parliament of India (sansad.in / loksabha.nic.in))*
- **`OFFICIAL_GAZETTE_REF`**: State Election Commission / Chief Electoral Officer Form 21E Declaration Notification *(Provenance: Official Extraordinary State Gazette)*
- **`EXISTING_CANONICAL_UUID`**: Verified foreign key linkage already sealed in public.canonical_persons *(Provenance: Kshetra Canonical Database Ledger)*

## TIER_2_STRONG_COMPOUND (Authority: HIGH_STAGING_PROMOTION)

- **Auto-Merge Permitted:** true
- **Confidence Requirement:** 0.95

### Strong Compound Keys

- **`COMPOUND_BIOGRAPHICAL_KEY`**: Components = `[normalized_name, dob, father_or_spouse_name, state_code]`. Two individuals with identical legal names, exact identical dates of birth, identical parent names, in the same state is statistically zero.
- **`COMPOUND_POLITICAL_CAREER_KEY`**: Components = `[normalized_name, consecutive_election_history, party_continuity, constituency_lineage]`. Incumbent winning 2018 and contesting 2023 in the same constituency under the same or continuous party platform.

## TIER_3_AMBIGUOUS_STAGING_QUEUE (Authority: REVIEW_REQUIRED)

- **Auto-Merge Permitted:** false
- **Confidence Requirement:** [0.7,0.94]

### Ambiguity Handling

- Names match but dates of birth differ by 1-3 years (potential age misreporting in affidavit vs true DOB)
- Names match and constituency matches but party differs without an explicit recorded defection/switch event
- Common patronymics or title variations (e.g., "Rao", "Reddy", "Sharma", "Singh", "Kumar") with partial career overlap
- Must remain separate canonical candidates in public.candidacies without merging human identities until human verification

## TIER_4_CONFLICT_HARD_LOCK (Authority: STRICT_LOCKOUT)

- **Auto-Merge Permitted:** false
- **Confidence Requirement:** PROHIBITED

### Hard-Lock Conflict Triggers (Merge Forbidden)

- **`SIMULTANEOUS_DIFFERENT_STATE_OFFICES`**: A person cannot simultaneously be an active sitting MLA in Telangana and an active sitting MLA in Bihar on the same date D.
- **`BIOLOGICAL_IMPOSSIBILITY`**: Date of birth discrepancies > 5 years or parent name contradiction.
- **`SAME_NAME_CONTESTANTS_IN_SAME_ELECTION`**: Different human beings with identical or similar names contesting the same seat in the same election cycle (common dummy candidate tactic in Indian elections).
- **`EXPLICIT_SOURCE_CONFLICT`**: Source records explicitly identify the candidates as distinct individuals.

