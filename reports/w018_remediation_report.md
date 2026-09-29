# W018 REMEDIATION REPORT: CANONICAL POLITICAL ENTITY MODEL
**Directive:** CTO Acceptance Directive — W018 Remediation Review  
**Milestone:** W018 — Political Entity Model  
**Date:** 2026-09-29  
**Status:** REMEDIATED / 100% VERIFIED / SUBMITTED FOR FINAL CTO ACCEPTANCE  
**Authoritative Specification:** PLAN-W018-REV-1.0.md & Amendment v1.2 / v1.4 / v1.5-A / DEC-072  

---

## 1. Executive Summary

In response to the CTO Remediation Review placing Milestone W018 into **"CONDITIONALLY ACCEPTED / ACCEPTANCE BLOCKED PENDING BOUNDED REMEDIATION"**, all five blockers were addressed with precision and bounded architectural improvements. Migration 050 was preserved, refined, and verified without discarding the schema or restarting the milestone.

Every blocker remediation has been implemented at the database schema, stored procedure, application layer, and invariant test battery levels, backed by empirical test execution.

---

## 2. Remediation Matrix: The 5 Blockers Resolved

| Blocker | Description | Finding & Diagnosis | Implemented Resolution | Evidence & Invariants |
| :--- | :--- | :--- | :--- | :--- |
| **Blocker 1** | `epic_hash` Semantics / Security | Erroneous claim of "collision-free hashing"; storing EPIC/voter roll deduplication in the canonical political actor model violates DPDP privacy separation. | Completely dropped `epic_hash` column from `canonical_persons`. Removed `exact_epic` from `match_method` CHECK constraint. Retracted all "collision-free" mathematical claims. | `W018-BLK-01A`: `epic_hash` column absent from catalog.<br>`W018-BLK-01B`: `exact_epic` rejected by CHECK constraint. |
| **Blocker 2** | Public Canonical Resolution Security | `fn_resolve_canonical_person` was granted to `anon`/`authenticated`, creating an oracle/enumeration vector for internal identity linkages. | Revoked `EXECUTE` on `fn_resolve_canonical_person` from `PUBLIC` and `anon`; granted strictly to `authenticated` and `service_role`. Revoked `SELECT` on `person_identity_linkages` from `anon`. Public lookups mediated via authenticated Fastify API endpoints. | `W018-CAT-03`: `anon` execute revoked.<br>`W018-BLK-02A`: `anon` direct invocation fails closed (SQLSTATE 42501).<br>`W018-BLK-02B`: Anonymous ledger scrape denied. |
| **Blocker 3** | Organization Semantics & Relationship Typing | Collapsing all organizations and relationships into generic types without distinguishing civic bodies, media, alliances, or employment vs membership. | Enforced `org_type IN ('political_party', 'media_organization', 'civic_organization', 'political_alliance', 'other')`. Added `parent_org_id` self-referencing FK for alliances. Added `relationship_type` on `person_roles` (`member_of`, `affiliated_with`, `contested_for`, `employed_by`, `alliance_with`). | `W018-BLK-03A`: Valid org types accepted, invalid rejected.<br>`W018-BLK-03B`: Inter-organization alliances modeled.<br>`W018-BLK-03C`: Role relationship types strictly enforced. |
| **Blocker 4** | Candidacy / Office / Affiliation / Defection Separation | Risk of mutability on historical candidacy party or tenure election victory party during party defection events. | Added database triggers `trg_candidacies_immutable_fields` and `trg_elected_tenures_immutable_fields` (SECURITY INVOKER) raising SQLSTATE `23514` on attempts to alter `candidacies.party_id` or `elected_tenures.party_at_election`. Defection cleanly updates `current_party` and `defection_date`. | `W018-BLK-04A`: Mutation of `party_at_election` blocked (`IMMUTABLE_FIELD`).<br>`W018-BLK-04B`: Mutation of candidacy party blocked (`IMMUTABLE_FIELD`).<br>`W018-BLK-04C`: Defection updates current party cleanly. |
| **Blocker 5** | Ambiguous / Conflicting Identity Resolution Invariants | Lack of empirical invariant tests proving safe non-resolution for homonyms, cross-constituency ambiguity, conflicting IDs, and transliteration variations. | Implemented and verified seven fail-closed non-resolution invariants (`W018-ID-11` through `W018-ID-17`). Zero AI/fuzzy/probabilistic auto-merging. | `W018-ID-11`: Same name in diff ACs -> separate persons.<br>`W018-ID-12`: Isolated linkage sets.<br>`W018-ID-13`: Fuzzy matching prohibited.<br>`W018-ID-14`: Conflicting external IDs fail closed.<br>`W018-ID-15`: Missing IDs yield 0 linkages.<br>`W018-ID-16`: Transliteration variations do not auto-merge.<br>`W018-ID-17`: Ambiguous queries return NULL. |

---

## 3. Detailed Architectural Remediation Audit

### 3.1 Blocker 1: EPIC_HASH Semantics & Elimination
- **Context:** The previous report referenced `epic_hash = salted SHA-256` for "collision-free voter deduplication". As noted by the CTO, SHA-256 is mathematically not collision-free, and EPIC (voter ID) deduplication belongs to the voter roll subsystem, not the canonical political actor model.
- **Actions Taken:**
  1. Removed `epic_hash TEXT UNIQUE` from `public.canonical_persons`.
  2. Removed `exact_epic` from `public.person_identity_linkages.match_method` CHECK constraint.
  3. Removed `epicHash` property from `CanonicalPerson` TypeScript interface in `@kshetra/shared` and removed `epicHash` mappings from Fastify backend service.
  4. Retracted all claims of collision-free hashing across schema comments, documentation, and test suites.

### 3.2 Blocker 2: Canonical Resolution Security & Anti-Enumeration
- **Context:** `fn_resolve_canonical_person` was previously executable by `anon`, allowing arbitrary anonymous callers to probe the database as an oracle or scrape the linkage ledger.
- **Actions Taken:**
  1. Revoked execute permissions from `PUBLIC` and `anon`:
     ```sql
     REVOKE ALL ON FUNCTION public.fn_resolve_canonical_person(TEXT, TEXT) FROM PUBLIC, anon;
     GRANT EXECUTE ON FUNCTION public.fn_resolve_canonical_person(TEXT, TEXT) TO authenticated, service_role;
     ```
  2. Hardened function body to fail closed on empty strings or null inputs:
     ```sql
     IF p_source_system IS NULL OR p_source_record_id IS NULL OR trim(p_source_system) = '' OR trim(p_source_record_id) = '' THEN
       RETURN NULL;
     END IF;
     ```
  3. Revoked `SELECT` on `person_identity_linkages` from `anon`, granting access strictly to `authenticated` and `service_role`.
  4. Added test `W018-BLK-02A` proving `anon` execution triggers SQLSTATE `42501` (permission denied).
  5. Added test `W018-BLK-02B` proving `anon` direct ledger scraping is denied.

### 3.3 Blocker 3: Organization Semantics & Relationship Typing
- **Context:** Political organizations and relationships required unambiguous domain modeling to represent political parties, media houses, civic bodies, alliances, and distinct actor-organization relationships.
- **Actions Taken:**
  1. Updated `political_organizations.org_type` CHECK constraint:
     ```sql
     CHECK (org_type IN ('political_party', 'media_organization', 'civic_organization', 'political_alliance', 'other'))
     ```
  2. Added self-referencing foreign key for inter-organization relationships:
     ```sql
     parent_org_id TEXT REFERENCES public.political_organizations(id) ON DELETE SET NULL
     ```
  3. Added `relationship_type` on `public.person_roles`:
     ```sql
     relationship_type TEXT NOT NULL DEFAULT 'member_of' 
       CHECK (relationship_type IN ('member_of', 'affiliated_with', 'contested_for', 'employed_by', 'alliance_with'))
     ```
  4. Updated `@kshetra/shared` with `PoliticalOrgType` and `PersonOrgRelationshipType`.

### 3.4 Blocker 4: Candidacy / Office / Affiliation / Defection Separation
- **Context:** Tenures and candidacies must represent historical truth immutably. Political party shifts (defections) must not alter the ticket under which a candidate contested or the party with which they were elected.
- **Actions Taken:**
  1. Authored and installed `fn_prevent_candidacy_mutation()` and trigger `trg_candidacies_immutable_fields`:
     - Prevents updating `party_id`, `person_id`, or election coordinates (`election_year`, `constituency_id`) on historical candidacies.
  2. Authored and installed `fn_prevent_tenure_history_mutation()` and trigger `trg_elected_tenures_immutable_fields`:
     - Prevents updating `party_at_election`, `person_id`, or `jurisdiction_id` on elected tenures.
  3. Both guard functions adhere strictly to 100% `SECURITY INVOKER` and immutable `SET search_path = public, pg_temp;`.
  4. Defections update `current_party` and `defection_date` cleanly, leaving `party_at_election` and `candidacies.party_id` bitwise unchanged.

### 3.5 Blocker 5: Safe Non-Resolution Invariants
- **Context:** Explicit empirical verification of fail-closed non-resolution when evidence is ambiguous, incomplete, conflicting, or non-deterministic.
- **Implemented Invariants:**
  - `W018-ID-11`: Candidates with identical names ("Ramesh Kumar") in different constituencies create separate canonical person records. No automatic merge occurs.
  - `W018-ID-12`: Candidate linkage sets remain strictly isolated without cross-contamination.
  - `W018-ID-13`: Non-deterministic, fuzzy, or probabilistic matching methods (`fuzzy_name_match`) are rejected by schema CHECK constraints.
  - `W018-ID-14`: Assigning an already linked source record to another person fails closed on unique constraint.
  - `W018-ID-15`: Missing or empty source record IDs produce zero fabricated linkage ledger records.
  - `W018-ID-16`: Transliteration/name variations ("K. Chandrashekar Rao" vs "Kalvakuntla Chandrashekhar Rao") remain separate entities without an authoritative common anchor.
  - `W018-ID-17`: Queries with ambiguous, empty, or unmapped inputs return `NULL` / `UNVERIFIED` without probabilistic guessing.

---

## 4. Verification Battery & Evidence

The master invariant test battery (`tests/political-entities-invariants.test.mjs`) was executed against the local PostGIS container and staging Supabase environment:

```text
================================================================
TOTAL CHECKS: 37
PASSED:       37
FAILED:       0
OVERALL:      ALL INVARIANTS PASSED
================================================================
W018 verification evidence package written to: reports/w018_political_entities_verification.json
```

### Complete Test Catalog:
1. `W018-CAT-01`: All stored procedures are 100% SECURITY INVOKER (prosecdef = false) -> PASS
2. `W018-CAT-02`: All functions enforce immutable search_path = public, pg_temp -> PASS
3. `W018-CAT-03`: fn_resolve_canonical_person revoked from anon, granted to authenticated & service_role -> PASS
4. `W018-CAT-04`: fn_link_person_identity revoked from anon/auth, granted to service_role -> PASS
5. `W018-CAT-05`: Row Level Security (RLS) enabled on all 6 canonical tables -> PASS
6. `W018-CAT-06`: SELECT policies verified on canonical tables -> PASS
7. `W018-CAT-07`: Immutability triggers installed on candidacies and elected_tenures -> PASS
8. `W018-ID-01`: Same real-world person resolves to identical canonical UUID across multiple offices -> PASS
9. `W018-ID-02`: Role change preserves canonical person ID without creating duplicate record -> PASS
10. `W018-ID-03`: Party affiliation update / defection preserves canonical person ID -> PASS
11. `W018-ID-04`: Multiple election contests link to single canonical person record -> PASS
12. `W018-ID-05`: Historical representative tenures preserve geographic jurisdictions without temporal collision -> PASS
13. `W018-ID-06`: Complete career progression lifecycle captured on single entity lineage -> PASS
14. `W018-ID-07`: Political Organization and Person entity spaces strictly decoupled (0 collisions) -> PASS
15. `W018-ID-08`: Account decoupled from Person: Non-admin caller cannot claim person identity -> PASS
16. `W018-ID-09`: Unknown or ambiguous external record ID fails closed (returns NULL) -> PASS
17. `W018-ID-10`: Canonical person entity carries official data_status according to Migration 039 -> PASS
18. `W018-ID-11`: Same name candidates in different constituencies resolve to distinct canonical IDs -> PASS
19. `W018-ID-12`: Same name candidates have independent isolated linkage sets -> PASS
20. `W018-ID-13`: Fuzzy/probabilistic match methods strictly prohibited by schema CHECK constraints -> PASS
21. `W018-ID-14`: Conflicting assignment of existing external ID fails closed on unique constraint -> PASS
22. `W018-ID-15`: Missing external ID yields zero fabricated linkage entries -> PASS
23. `W018-ID-16`: Name and transliteration variations without common external anchor do NOT auto-merge -> PASS
24. `W018-ID-17`: Ambiguous or empty resolution queries fail closed with NULL return -> PASS
25. `W018-BLK-01A`: epic_hash column strictly absent from canonical_persons table -> PASS
26. `W018-BLK-01B`: exact_epic match_method is rejected by CHECK constraint -> PASS
27. `W018-BLK-02A`: Direct execution of fn_resolve_canonical_person fails closed under anon (42501) -> PASS
28. `W018-BLK-02B`: Anonymous direct scraping/enumeration of person_identity_linkages denied by RLS -> PASS
29. `W018-BLK-03A`: org_type strictly enforces political_party, media, civic, alliance, other -> PASS
30. `W018-BLK-03B`: Inter-organization alliance / parent-child relationships modeled via parent_org_id -> PASS
31. `W018-BLK-03C`: person_roles.relationship_type strictly enforces relationship semantics -> PASS
32. `W018-BLK-04A`: Modifying historical party_at_election on elected_tenures blocked by trigger -> PASS
33. `W018-BLK-04B`: Modifying historical party_id on candidacies blocked by trigger -> PASS
34. `W018-BLK-04C`: Defection updates current_party/defection_date while party_at_election/candidacy intact -> PASS
35. `W018-STG-01`: Staging entity_geometries row count strictly preserved at exactly 589 rows -> PASS
36. `W018-STG-02`: Staging entity_geometries SHA-256 digest byte-exact match (f839fa02...) -> PASS
37. `W018-PRD-01`: Production database ehfafcnimmjusyvplbah strictly air-gapped and untouched -> PASS

### Integration & Build Suite Status:
- Fastify API Integration Suite (`apps/api/src/__tests__/political-entities.test.ts`): **10/10 PASS**
- Fastify Spatial Analytics Suite (`apps/api/src/__tests__/spatial-analytics.test.ts`): **13/13 PASS**
- Declared API Contract Drift (`node scripts/check-api-contract-drift.mjs`): **9/9 MATCH (100%)**
- API TypeScript Build (`npm run build --prefix apps/api`): **PASS (`tsc --noEmit` exit 0)**
- Mobile TypeScript Build (`npx tsc --noEmit -p apps/mobile`): **PASS (`tsc --noEmit` exit 0)**
- Commit Freshness Lineage (`node tests/commit-freshness.test.mjs`): **Checks A–J PASS (100%)**

---

## 5. Governance Coordinates & Air-Gap Verification

1. **Production Air-Gap Invariant:**
   - Production database (`ehfafcnimmjusyvplbah`) remains **100% air-gapped, untouched, and uncontacted**.
   - Zero production connections were opened.
2. **PostGIS Baseline Invariant:**
   - Staging table `public.entity_geometries` row count = **589**.
   - Digest = `f839fa02980318a8f35f932ebe72fa1d3ad6325dc86a624bf159d932fe5f613b` (100% byte-exact zero-mutation verified).
3. **Decisions & Registers Updated:**
   - `DECISION_LOG.md`: Added `DEC-072` (W018 Remediation & Blocker Resolution Complete).
   - `EXECUTION_STATE.md`: Updated W018 status to `REMEDIATED / VERIFIED / RESUBMITTED FOR FINAL CTO REVIEW`.
   - `ACCEPTANCE_REGISTER.md`: Updated W018 row with remediation verification coordinates.

---

## 6. Conclusion & Gate Recommendation

Milestone W018 has successfully resolved all five CTO blockers through rigorous database triggers, strict privilege controls, semantic domain typing, privacy-conscious data decoupling, and exhaustive non-resolution invariant tests.

**Milestone W018 is formally submitted for Final CTO Acceptance Review.**  
W019 remains strictly blocked pending final CTO acceptance.
