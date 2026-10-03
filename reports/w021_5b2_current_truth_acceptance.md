# W021.5-B2 CURRENT POLITICAL TRUTH & TEMPORAL ACCEPTANCE SPECIFICATION

**Milestone:** W021.5-B2 Architecture Freeze
**Scope:** Temporal Resolution Chain, Vacancies, By-Elections, Party Switches, and Affidavit Taxonomy

## 1. Complete Temporal Resolution Chain

$$\text{Representative}(\text{Seat}, D) = \Pi_{\text{person}}(\sigma_{\text{valid\_at}(D) \land \neg \text{vacated}(D)}(\text{elected\_tenures}))$$

| Step | Entity | Table | Role |
|---|---|---|---|
| 1 | **JURISDICTION** | `public.states` | Sovereign state/UT envelope (e.g. TS, UP, AS) |
| 2 | **SEAT** | `public.constituencies` | Constituency identity (e.g. TS-AC-065 Kodangal) |
| 3 | **STATUTORY_VERSION** | `public.constituency_versions` | Delimitation boundary version active at date D |
| 4 | **ELECTION_CONTEST** | `public.election_contests` | Specific electoral event in that seat (e.g. 2023 General Election) |
| 5 | **WINNING_CANDIDACY** | `public.candidacies` | Winning candidate record with immutable election party |
| 6 | **ELECTED_TENURE** | `public.elected_tenures` | Sovereign term starting on gazette notification date |
| 7 | **VACANCY_CHECK** | `public.tenure_vacancies` | Check if seat vacated before date D |
| 8 | **BY_ELECTION_LINK** | `public.election_contests` | If vacated, traverse to subsequent by-election winning tenure |
| 9 | **PARTY_SWITCH_CHECK** | `public.tenure_party_switches` | Check contemporaneous party switches valid at date D |
| 10 | **CURRENT_TRUTH** | `API DTO` | Resolved sovereign representative + contemporaneous party at date D |

## 2. Officeholder Fact vs Party Affiliation Fact

- **Officeholder Fact:** Elected tenure belongs to the HUMAN PERSON. Officeholder status remains valid until end of term, resignation, disqualification, or death.
- **Party Fact:** Political party affiliation is a temporal relationship. Changing party during a tenure creates a tenure_party_switch record, updating contemporaneous party without modifying the immutable election party or historical contest.

## 3. First-Class Vacancy Model

Supported reasons: `DEATH`, `RESIGNATION`, `DISQUALIFICATION_TENTH_SCHEDULE`, `DISQUALIFICATION_RPA_SEC_8`, `ELECTION_ANNULLED_COURT_ORDER`, `EXPULSION`, `VACANCY_GAZETTED`

Behavior: When asOfDate >= vacancy.effective_date (and before by-election winner takes oath), API returns status: "VACANT", representative: null, vacancy_details: {...}

## 4. Party Switch Temporal Ledger

- **Immutability Invariant:** candidacies.party_id is FROZEN and NEVER updated after election certification.
- **Resolution Query:**
```sql
      SELECT coalesce(tps.to_party_id, et.original_party_id) AS contemporaneous_party
      FROM public.elected_tenures et
      LEFT JOIN LATERAL (
        SELECT to_party_id
        FROM public.tenure_party_switches
        WHERE tenure_id = et.id AND effective_date <= asOfDate
        ORDER BY effective_date DESC, created_at DESC
        LIMIT 1
      ) tps ON true
      WHERE et.id = :tenureId;
    ```

## 5. Technical Affidavit Rights Taxonomy

| Classification | Legal Status | Description | API Exposure |
|---|---|---|---|
| `STATUTORY_FACT` | Public Statutory Filing | Mandatory statutory candidate declaration filed under RP Act 1950 Sec 33A / Form 26. | `PUBLIC_FREE_ACCESS` |
| `SOURCE_EXTRACTED_FACT` | Raw Extracted Value | Unprocessed string or numeric values directly scraped or parsed from Form 26. | `PUBLIC_FREE_ACCESS` |
| `NORMALIZED_FACT` | Engineered Entity | Parsed and typed fields (e.g. integer INR assets, date parsed DOB, enum education). | `PUBLIC_FREE_ACCESS` |
| `DERIVED_FACT` | Proprietary Derived Metric | Net worth calculations, asset growth percent, criminal severity scoring. | `PUBLIC_APPLICATION_API` |
| `SOURCE_NARRATIVE` | Third-Party Editorial | Editorial biography paragraphs, party commentary, news digests. | `RESTRICTED_ATTRIBUTED_ONLY` |
| `THIRD_PARTY_COMMENTARY` | Third-Party Proprietary | External opinion, political ratings, editorial evaluations. | `EXCLUDED_FROM_CANONICAL` |
| `UNKNOWN_RIGHTS_STATUS` | Unverified Origin | Data where provenance does not cleanly map to official ECI Form 26. | `PROHIBITED_FROM_PUBLIC_API` |
