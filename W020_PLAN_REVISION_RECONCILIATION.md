# W020 PLAN REVISION RECONCILIATION: REV-1.0 → REV-1.1
**Milestone:** W020 (Delimitation Engine Foundation)  
**Date:** 2026-09-30  
**Authority:** CTO Directive — W020 Master Plan Revision Required  
**Reference Document:** [PLAN-W020-MASTER-REV-1.1.md](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/PLAN-W020-MASTER-REV-1.1.md)  
**Status:** DRAFT / SUBMITTED FOR CTO RATIFICATION (GATED)  

---

## 1. Executive Summary of Revisions

In response to the CTO's conditional ratification of REV-1.0, this reconciliation document enumerates every architectural, legal, mathematical, and schema correction made between `PLAN-W020-MASTER-REV-1.0.md` and `PLAN-W020-MASTER-REV-1.1.md`.

```text
================================================================================
REVISION SUMMARY MATRIX
================================================================================
#  AREA                       REV-1.0 DEFICIENCY                  REV-1.1 RECONCILIATION
--------------------------------------------------------------------------------
1  Census Terminology         Used "post-Census 2026"             Authoritative "Census 2027" established
2  Legal Geography Chain      Mislabeled 2008 as "TS boundaries"  Full 5-stage AP -> TS chain documented
3  Engine Audit               Assumed existing routes canonical   14 routes + 6 calculators classified
4  Typed Selection Model      Proposed redundant boolean flag     Reused delimitation_regimes.legal_status
5  Mathematical Model         Generic Article 170 statement       8-layer constitutional/statutory model
6  Scenario Semantics         Conflated future with scenario      10-attribute mandatory scenario envelope
7  Migration 055 Design       Included redundant boolean column   Stripped boolean; metadata JSONB used
8  Rollback Semantics         Suggested destructive down-mig      4-tier non-destructive supersession
9  Evidence Chain             Informal citation list              9-link formal registry with SHA-256
10 Test Suite                 10 basic invariant tests            20 semantic invariant tests (4 planes)
11 Implementation Gate        Ambiguous preflight boundary        Explicit STOP at G3; G4 strictly gated
================================================================================
```

---

## 2. Detailed Item-by-Item Reconciliation

### Correction 1: Census Terminology & Future-Delimitation Taxonomy
* **REV-1.0 Finding:** The plan repeatedly referred to "post-Census 2026" as an official future census.
* **REV-1.1 Correction (Section 2):** Replaced all references with the authoritative statutory census program: **Census 2027**. Established the four-tier taxonomy:
  1. *Census 2011:* Verified historical statutory demographic baseline (RGI PCA).
  2. *Census 2027:* Ongoing/future census operation whose final population totals are not yet available.
  3. *Future Anticipated Regime:* Expected statutory regime under Constitution Articles 82 & 170 (post-Census 2027), but not yet gazetted.
  4. *Scenario Proposed Regime:* PANIN-derived research simulation. Strictly non-statutory.
* **Evidence:** Registrar General & Census Commissioner of India program tracking; 84th Constitutional Amendment (2001) freezing seats until the first census post-2026 (Census 2027).

### Correction 2: Telangana & Andhra Pradesh Legal Succession Chain
* **REV-1.0 Finding:** Informally described the 2008 ECI schedule as "Telangana 2008 boundaries."
* **REV-1.1 Correction (Section 3):** Fully reconstructed the 5-stage legal chain of succession with Gazette and statutory references:
  1. *Stage 1 (2008):* Delimitation Order 2008, Schedule II (State of Andhra Pradesh: 294 ACs / 42 PCs).
  2. *Stage 2 (2014):* Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014), Sec 15 & Sched I bifurcating Schedule II into Schedule XXXI (Telangana: 119 ACs / 17 PCs) and amended Schedule II (Residuary AP: 175 ACs / 25 PCs).
  3. *Stage 3 (2015):* AP Reorganisation (Removal of Difficulties) Order, 2015 transferring 7 mandals of Khammam to residuary AP due to Polavaram project submergence.
  4. *Stage 4 (2018):* ECI Order No. 282/TEL/2018 (22 September 2018) re-assigning constituency territories and polling stations across 31 reorganised districts of Telangana.
  5. *Stage 5 (Current):* Current Telangana 119 AC / 17 PC stable identities mapped to `constituency_versions`.
* **Evidence:** [eci_delimitation_2008_schedule_xxxi.txt](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/data/evidence/w015_b2/eci_delimitation_2008_schedule_xxxi.txt); AP Reorganisation Act 2014; Gazette of India notifications.

### Correction 3: Comprehensive Audit of Existing Delimitation Engine
* **REV-1.0 Finding:** Assumed existing Fastify routes and mobile calculators were ready for hardening without auditing whether their calculations were canonical, prototype, or scenario.
* **REV-1.1 Correction (Section 4):** Performed a complete route-by-route and calculator-by-calculator audit classifying all 14 routes in `apps/api/src/routes/delimitation.ts` and all 6 modules in `apps/mobile/lib/delimitation/` under the 7-tier taxonomy:
  * *Canonical:* 3 routes (`/timeline`, `/status`, `/methodology`).
  * *Derived:* 3 routes (`/reservation`, `/reservation/:stateCode`, `/impact/:pinCode` wrapped).
  * *Scenario:* 7 routes (`/projections`, `/projections/:stateCode`, `/gainers-losers`, `/simulate/:stateCode`, `/compare`, `/mla-impact/:stateCode`, `/party-projections/:stateCode`).
  * *Prototype / Unsafe:* 1 route (`/monitor-webhook` - lacks token authentication guard; hardened in W020).
  * *Mobile Modules:* Documented limitations for `seatCalculator`, `boundarySimulator`, `constituencyMapper`, `pinCodeResolver`, `populationAggregator`, and `reservationAnalyzer`.

### Correction 4: Reconciled Single Source of Truth for Typed Selection
* **REV-1.0 Finding:** Proposed adding `is_scenario BOOLEAN` and `scenario_model VARCHAR(50)` directly to `public.delimitation_proposals`.
* **REV-1.1 Correction (Section 5 & 7):** Eliminated `is_scenario BOOLEAN` from the proposed persistent schema. Proved that `public.delimitation_regimes.legal_status` (Migration 041) is already the authoritative single source of truth (`HISTORICAL_LEGAL_REGIME`, `CURRENT_LEGAL_REGIME`, `FUTURE_ANTICIPATED_REGIME`, `SCENARIO_PROPOSED_REGIME`).
  * Enforced foreign key `delimitation_regime_id REFERENCES public.delimitation_regimes(id)`.
  * `is_scenario` is strictly a **DERIVED READ-ONLY FIELD** generated at API serialization time from `regime.legal_status == 'SCENARIO_PROPOSED_REGIME'`, preventing dual-source-of-truth drift.
  * Model parameters moved to `metadata JSONB`.

### Correction 5: Rewritten Eight-Layer Mathematical Acceptance Model
* **REV-1.0 Finding:** Relied on generic statements such as "Article 170 bounds are 60 to 500."
* **REV-1.1 Correction (Section 6):** Decomposed the mathematical model into eight formal, rigorous layers:
  * *A. Constitutional Constraints:* Articles 81, 82, 170(1), 170(2), 330, 332, 84th/87th Amendments.
  * *B. Statutory Constraints:* Delimitation Act 2002 Sec 9(1), APRA 2014 Sec 15 and Sec 26.
  * *C. Legally Assigned Current Seat Counts:* TS (119/17), AP (175/25), LS (543).
  * *D. Population-Based Allocation:* Ideal divisor ($\approx 293,896$) and Hare-Niemeyer (Largest Remainder) step-by-step algorithm.
  * *E. SC/ST Reservation:* Article 332 proportional integer rounding and geographic concentration heuristic.
  * *F. Scenario Assumptions:* `EXPANSION_SAFE` vs `PROPORTIONAL` models.
  * *G. Mathematical Invariants:* Seat conservation, quota conservation, Article 170 bounds.
  * *H. Source-Evidenced Legal Rules:* Statutory supremacy over mathematical simulations.

### Correction 6: Future Scenario Semantics & 10 Mandatory Attributes
* **REV-1.0 Finding:** Lacked explicit mandatory metadata attributes required for simulation API envelopes.
* **REV-1.1 Correction (Section 2.1):** Enforced that every scenario emitted by PANIN must carry 10 mandatory metadata elements (`scenario_id`, `model_version`, `input_dataset_version_id`, `population_assumptions`, `geography_assumptions`, `mathematical_methodology`, `generated_timestamp`, `legal_status`, `evidence_id`, and `statutory_disclaimer`).

### Correction 7: Reworked Migration 055 Design & Preflight Isolation
* **REV-1.0 Finding:** Included proposed boolean column and lacked column-by-column lifecycle specification.
* **REV-1.1 Correction (Section 7):** Stripped redundant columns. Confirmed that Migration 055 is strictly DEFERRED and NOT executed. Documented the complete lifecycle, foreign key constraints, mutability, and RLS policies for every column.

### Correction 8: Rollback, Correction & Supersession Semantics
* **REV-1.0 Finding:** Proposed a simple down-migration that could risk destructive data loss if executed after evidence ingestion.
* **REV-1.1 Correction (Section 8):** Established a four-tier recovery matrix distinguishing Mode A (Transactional Rollback), Mode B (Schema-Only Reversal), Mode C (Authoritative Data Correction with audit trail), and Mode D (Provenance Supersession). Prohibited destructive data loss.

### Correction 9: Comprehensive Nine-Link Evidence Chain
* **REV-1.0 Finding:** Cited evidence informal without an immutable registry.
* **REV-1.1 Correction (Section 9):** Formulated an authoritative 9-link evidence registry tracking exact document titles, authorities, notification dates, effective dates, retrieval dates, raw file paths, and SHA-256 checksums.

### Correction 10: Expanded Semantic Invariant Test Suite
* **REV-1.0 Finding:** Listed 10 basic tests with generic invariant names.
* **REV-1.1 Correction (Section 10):** Expanded to 20 comprehensive, non-tautological semantic invariant tests across four verification planes (`W020-LEGAL-01..05`, `W020-SCEN-01..05`, `W020-ENG-01..04`, `W020-MTH-01..06`).

### Correction 11: Hard Gates & Strict Gated Status
* **REV-1.0 Finding:** Implementation gating was implied but not explicitly enforced at Gate G3.
* **REV-1.1 Correction (Section 1 & 13):** Formally asserted that Gates W020-G0 through W020-G3 are preflight planning gates, while Gates W020-G4 onward are STRICTLY NOT AUTHORIZED until formal written CTO ratification. Execution is halted.

---

## 3. Conclusion & Submission

All 13 directives issued by the CTO have been fully incorporated into `PLAN-W020-MASTER-REV-1.1.md`. No product code, database migrations, or staging mutations have been executed. The codebase remains 100% clean and air-gapped awaiting CTO review.
