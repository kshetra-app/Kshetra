# W020 Delimitation Seat Baseline Source-Truth Preflight & Legislative-Status Audit

**Milestone**: W020 — Delimitation Engine Foundation & Governance  
**Directive**: W020 — DELIMITATION SEAT BASELINE SOURCE-TRUTH CORRECTION DIRECTIVE  
**Date**: 2026-10-01  
**Status**: PREFLIGHT AUDIT & ARCHITECTURAL SPECIFICATION COMPLETE — SUBMITTED FOR CTO REVIEW  
**Git Coordinates**: Clean Working Tree at `c1d150fa2efe9a672bdebc6e28ce691fcdcb19f1`  

---

## 1. Executive Summary

In response to the CTO Directive on Delimitation Seat Baseline Source-Truth Correction, this audit was conducted to resolve the simplistic proposition of globally replacing `543` with `850`.

### Key Findings
1. **The Three 2026 Delimitation Bills & Legislative Reality:**
   * On **April 16, 2026**, the Government introduced a legislative package of three bills in the Lok Sabha:
     1. **Constitution (One Hundred and Thirty-First Amendment) Bill, 2026** (Bill No. 45 of 2026)
     2. **Delimitation Bill, 2026** (Bill No. 46 of 2026)
     3. **Union Territories Laws (Amendment) Bill, 2026** (Bill No. 47 of 2026)
   * On **April 17, 2026**, the Constitution (131st Amendment) Bill was **REJECTED / NEGATIVED** by the Lok Sabha, receiving 298 ayes against 230 noes, failing the constitutionally mandated two-thirds special majority under Article 368.
   * Following the defeat of the 131st Amendment, the companion **Delimitation Bill, 2026** and **Union Territories Laws (Amendment) Bill, 2026** were rendered infructuous/withdrawn or left pending without constitutional authorization.
   * **No nationwide Delimitation Commission has been constituted**. No presidential order, gazette notification, or seat readjustment order has been published.
2. **Current Legal Baseline:**
   * The operative constitutional ceiling remains **Article 81 (max 550 members)**.
   * The operative statutory elected strength under the Delimitation Order, 2008 and 104th Constitutional Amendment Act, 2019 (eliminating 2 Anglo-Indian nominations) remains **543 elected members**.
   * The freeze under the 84th Constitutional Amendment Act, 2001 (Articles 82 & 170(3)) remains operative until the first census after 2026 is published.
3. **Engineering Verdict:**
   * Blind replacement of `543` with `850` would be a **severe falsification of statutory fact**.
   * `850` was only a **proposed constitutional ceiling** (`maximum: 850`, with `up to 815` for States and `up to 35` for UTs) within a Bill that **failed to pass Parliament**.
   * It is neither enacted law, nor an operative ceiling, nor an actual seat allocation.

---

## 2. 543 Inventory & Classification

Across the entire PANIN repository (excluding GeoJSON geometry coordinate streams), `543` appears in the following locations participating in seat-baseline and historical logic:

| File | Line | Semantic Purpose | Legal Classification | Retain or Change? | Architectural Reason |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `data/census/india-district-population-2011.ts` | 492 | `export const TOTAL_LOK_SABHA_SEATS = 543;` | **CURRENT STATUTORY FACT** | **RETAIN** (Clarify type & name) | 543 is the current operative elected strength of the Lok Sabha under Delimitation Order 2008 & 104th Amendment. It must not be deleted. It should be typed as `CURRENT_STATUTORY_LOK_SABHA_SEATS`. |
| `data/census/india-district-population-2011.ts` | 498 | `export const IDEAL_POP_PER_LS_SEAT_2011 = Math.round(INDIA_TOTAL_POPULATION_2011 / TOTAL_LOK_SABHA_SEATS);` | **DERIVED CALCULATION INPUT** | **RETAIN** (Label as Historical 2011 Baseline) | Computes population quota per seat (~2,229,936) under the 2011 census across the existing 543 seats. |
| `apps/mobile/lib/delimitationTypes.ts` | 483 | `export const NATIONAL_AVG_POP_PER_LS_SEAT = 2_251_103; // ~1.21B / 543 seats` | **DERIVED CALCULATION INPUT** | **RETAIN** (Clarify documentation) | Historical benchmark derived from 2011 population divided by 543 seats. |
| `apps/mobile/stores/delimitation.ts` | 25 | Historical timeline: 1976 freeze at 543 seats under 42nd Amendment | **HISTORICAL ELECTED-HOUSE FACT** | **RETAIN** | Historical factual timeline event. |
| `apps/mobile/stores/delimitation.ts` | 77 | Historical timeline: 2008 Delimitation Commission kept 543 seats | **HISTORICAL ELECTED-HOUSE FACT** | **RETAIN** | Historical factual timeline event. |
| `apps/mobile/stores/delimitation.ts` | 185 | National status event: Constitutional freeze in effect at 543 seats | **CURRENT STATUTORY FACT** | **RETAIN** | Reflects current legal reality (Articles 82 & 170(3)). |
| `apps/api/src/services/delimitationQueryService.ts` | 780-794 | Rule catalog: `RULE-CONST-ART81-LOK-SABHA`, constitutionalCeiling: 550 | **CURRENT CONSTITUTIONAL FACT** | **RETAIN** | Reflects Article 81 constitutional ceiling (530 States + 20 UTs = 550). |

---

## 3. 850 / 815 / 35 Inventory & Legislative Origin

| Figure | Source Legislative Instrument | Instrument Type | Legal Status | Semantic Meaning | Analytical Mode | Used Computationally? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **850** | Constitution (131st Amendment) Bill, 2026, Clause 2 | Bill introduced in Lok Sabha (16 Apr 2026) | **PROPOSED / LEGISLATIVE (DEFEATED)** | Proposed constitutional **maximum** size of Lok Sabha (not actual allocation) | `SCENARIO_PROPOSED_REGIME` | Currently **NOT** used in code (not hardcoded). |
| **815** | Constitution (131st Amendment) Bill, 2026, Clause 2(a) | Bill introduced in Lok Sabha (16 Apr 2026) | **PROPOSED / LEGISLATIVE (DEFEATED)** | Proposed statutory **ceiling** for representatives chosen from States ("not more than 815") | `SCENARIO_PROPOSED_REGIME` | Currently **NOT** used in code. |
| **35** | Constitution (131st Amendment) Bill, 2026, Clause 2(b) | Bill introduced in Lok Sabha (16 Apr 2026) | **PROPOSED / LEGISLATIVE (DEFEATED)** | Proposed statutory **ceiling** for representatives of Union Territories ("not more than 35") | `SCENARIO_PROPOSED_REGIME` | Currently **NOT** used in code (only used as heuristic risk score in API). |

---

## 4. Complete Provenance Matrix of All Seat Figures

| Figure | Meaning | Source | Source Type | Legal Status | System Mode | Used in Calculation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **543** | Current operative elected Lok Sabha strength | Delimitation Order 2008; 104th Constitutional Amendment Act, 2019 | Gazette Notification / Act | **CURRENT / OFFICIAL** | `CURRENT_LEGAL_REGIME` | Yes (divisor for 2011 historical national quota) |
| **550** | Constitutional maximum size of Lok Sabha under operative Article 81 | Constitution of India, Article 81(1) | Constitutional Text | **CURRENT / OFFICIAL** | `CURRENT_LEGAL_REGIME` | Yes (in `delimitationQueryService.ts` Rule 6 ceiling) |
| **850** | Proposed maximum ceiling of Lok Sabha | Constitution (131st Amendment) Bill, 2026 | Introduced Bill (Defeated 17 Apr 2026) | **PROPOSED / LEGISLATIVE (UNENACTED)** | `SCENARIO_PROPOSED_REGIME` | Permitted strictly as scenario input; forbidden as current official baseline |
| **815** | Proposed maximum ceiling for States | Constitution (131st Amendment) Bill, 2026 | Introduced Bill (Defeated 17 Apr 2026) | **PROPOSED / LEGISLATIVE (UNENACTED)** | `SCENARIO_PROPOSED_REGIME` | Scenario parameter only |
| **35** | Proposed maximum ceiling for UTs | Constitution (131st Amendment) Bill, 2026 | Introduced Bill (Defeated 17 Apr 2026) | **PROPOSED / LEGISLATIVE (UNENACTED)** | `SCENARIO_PROPOSED_REGIME` | Scenario parameter only |
| **119** | Statutory Assembly strength of Telangana | AP Reorganisation Act, 2014, Sec 17 | Statutory Act | **CURRENT / OFFICIAL** | `CURRENT_LEGAL_REGIME` | Yes (Telangana official baseline) |
| **153** | Anticipated Assembly strength of Telangana | AP Reorganisation Act, 2014, Sec 26 | Statutory Mandate (Subject to Delimitation) | **PROPOSED / DERIVED** | `FUTURE_ANTICIPATED_REGIME` | Yes (in mobile `seatCalculator.ts` expansion model) |

---

## 5. Legislative-Status Evidence Dossier

### A. Constitution (One Hundred and Thirty-First Amendment) Bill, 2026
* **Bill Identity**: Bill No. 45 of 2026, Lok Sabha.
* **Short Title**: The Constitution (One Hundred and Thirty-First Amendment) Bill, 2026.
* **Introduction**: April 16, 2026, by the Ministry of Law and Justice.
* **Substantive Provisions**:
  * Amends Article 81(1)(a) to substitute "not more than 530 members" with "not more than 815 members from States".
  * Amends Article 81(1)(b) to substitute "not more than 20 members" with "not more than 35 members from Union territories".
  * Total potential constitutional ceiling: 850 members.
  * Sought to fast-track women's reservation (106th Amendment) by delinking from post-2026 census completion.
* **Legislative Action & Outcome**:
  * **April 17, 2026**: Division of votes called on motion for consideration.
  * **Result**: **NEGATIVED / DEFEATED**.
  * Ayes: 298. Noes: 230.
  * Requirement under Article 368: Two-thirds majority of members present and voting (required ~352 out of 528 voting).
  * The Bill fell short by 54 votes and lapsed.
* **Citations**: PRS Legislative Research (Bill Track 2026); Lok Sabha Debates (Uncorrected, 17 Apr 2026); Ministry of Parliamentary Affairs.

### B. Delimitation Bill, 2026
* **Bill Identity**: Bill No. 46 of 2026, Lok Sabha.
* **Introduction**: April 16, 2026.
* **Purpose**: Ordinary law to establish a Delimitation Commission and authorize seat readjustment based on the 2011 census.
* **Current Status**: **INFRUCTUOUS / PENDING WITHDRAWAL**. Because the companion 131st Constitutional Amendment failed, the ordinary bill cannot constitutionally override Article 82's freeze. No Delimitation Commission was constituted.

### C. Delimitation Commission Status
* **Status**: **NOT CONSTITUTED**.
* No notification in the Gazette of India has been issued under any Delimitation Act for a post-2026 or post-2011 nationwide delimitation.
* No constituency allocation or boundary order exists.

---

## 6. Analytical Architecture & Calculator Baseline Resolution

The mobile and backend delimitation calculators currently calculate:
1. **State Assembly (Vidhan Sabha) Allocations** under Article 170 (range 60–500 seats), utilizing Census 2011 district populations.
2. The current `seatCalculator.ts` supports two analytical models:
   * `EXPANSION_SAFE`: Guarantees no state loses seats; applies statutory expansions (TS 119 $\to$ 153, AP 175 $\to$ 225 under Section 26 of AP Reorganisation Act 2014; JK 90 under 2022 Order).
   * `PROPORTIONAL`: Article 170 pure demographic quota.

### Resolution for Lok Sabha Projections
When PANIN models Lok Sabha projections:
1. **Current Elected Baseline Mode (`CURRENT_LEGAL_REGIME`)**:
   * Baseline = **543 elected seats**.
   * Status = `CURRENT_STATUTORY_FACT`.
2. **2026 Defeated Legislative Scenario (`SCENARIO_PROPOSED_REGIME`)**:
   * Mode = `SCENARIO_PROPOSED_REGIME`.
   * Title = "Constitution (131st Amendment) Bill, 2026 Research Model".
   * Parameter = `maximum: 850` (States: up to 815, UTs: up to 35).
   * Mandatory Status Banner = **PROPOSAL DEFEATED IN PARLIAMENT (17 Apr 2026) — RESEARCH SCENARIO ONLY**.
3. **Disclaimers & Truth in UI**:
   * All outputs must retain:
     * `Legal Status: SCENARIO_PROPOSED_REGIME`
     * `Source: Unenacted Constitution (131st Amendment) Bill, 2026`
     * `Commission Status: No Delimitation Commission Constituted`
     * `Statutory Disclaimer: Non-statutory research projection — no official boundaries or seat allocations exist.`

---

## 7. W023 Watch Integration Design

In accordance with Section 9 of the Directive, broad W023 implementation is **strictly avoided**. Below is the interface and data contract specification for the downstream Delimitation Watch system.

### Integration Pipeline Contract
$$\text{Capture} \longrightarrow \text{Normalize} \longrightarrow \text{Validate} \longrightarrow \text{Compare} \longrightarrow \text{Version} \longrightarrow \text{Notify} \longrightarrow \text{Publish}$$

```typescript
export interface DelimitationWatchRecord {
  id: string;
  sourceDomain: 'PARLIAMENT_BILL' | 'GAZETTE_NOTIFICATION' | 'COMMISSION_ORDER' | 'ECI_NOTIFICATION';
  instrumentTitle: string;
  billNumber?: string;
  introducingHouse?: 'LOK_SABHA' | 'RAJYA_SABHA';
  introducedDate?: string;
  legislativeStatus: 
    | 'INTRODUCED'
    | 'REFERRED_TO_COMMITTEE'
    | 'PASSED_LOK_SABHA'
    | 'PASSED_RAJYA_SABHA'
    | 'NEGATIVED_DEFEATED'
    | 'WITHDRAWN'
    | 'INFRUCTUOUS'
    | 'ENACTED_OPERATIVE';
  actionDate: string;
  commissionConstituted: boolean;
  commissionGazetteRef?: string;
  draftOrdersPublished: boolean;
  finalOrdersPublished: boolean;
  proposedLokSabhaCeiling?: number;
  proposedStateMax?: number;
  proposedUtMax?: number;
  enactedLokSabhaTotal?: number;
  authoritativeUrl: string;
  digestSha256: string;
  verifiedAt: string;
}
```

---

## 8. Preflight Gate Conclusion & Stop State

* **543 Inventory**: Complete (7 verified occurrences across code, data, tests, and stores). 543 is confirmed as the legitimate current elected factual baseline.
* **850/815/35 Inventory**: Complete. Proved to be parameters of an un-enacted, defeated constitutional bill.
* **Authoritative Legislation**: Independently verified via PRS and Lok Sabha legislative records.
* **Zero Casual Patching**: Code untouched. 543 was NOT mutated to 850.
* **Production Safety**: Zero production access, zero DDL/DML, zero schema changes, zero mobile changes.

**SUBMITTED FOR CTO REVIEW — NOT SELF-ACCEPTED**
