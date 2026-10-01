# W020-G9 Governance Plan & Scope Reconciliation

**Milestone:** W020-G9 (Delimitation Engine Foundation — Verification Harness Hardening & Cross-Domain Audit Synthesis)  
**Parent Accepted Baseline:** W020-G8 (`f7fd1fa639d40427be3fc4d7f74149373cdd1108`)  
**Ratified Plan Commit:** `30dc36d7a20b634c41c5e6c68e8d46dc4bda38f4` (`PLAN-W020-G9-REV-1.0.md`)  
**Authorization Directive:** CTO AUTHORIZATION — W020-G9 IMPLEMENTATION (2026-10-01)  
**Remediation Directive:** CTO REMEDIATION DIRECTIVE — W020-G9 EVIDENCE INTEGRITY CLOSURE (2026-10-01)  
**Date:** 2026-10-01  
**Status:** SUBMITTED FOR CTO REVIEW (NON-SELF-ACCEPTANCE INVARIANT ENFORCED)  

---

## 1. Purpose & Authority

This document provides the formal governance reconciliation for Milestone W020-G9 in compliance with CTO Remediation Directive Item 8 (*Governance-plan reconciliation*).

In accordance with CTO instruction:
> "Do NOT rewrite the historical planning-only text of `PLAN-W020-G9-REV-1.0.md` unless instructed. Instead, prepare a bounded governance reconciliation document explaining that:  
> * `PLAN-W020-G9-REV-1.0.md` was submitted at `30dc36d` as planning-only;  
> * it was subsequently ratified by CTO in the implementation directive;  
> * implementation was authorized under those ratified terms;  
> * and this reconciliation bridges the planning text to execution state without fabricating historical planning approval."

---

## 2. Milestone Lineage & Chronological Transitions

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        W020-G9 GOVERNANCE AUTHORIZATION TIMELINE                       │
├─────────────────────┬───────────────────┬──────────────────────────────────────────────┤
│ Milestone Phase     │ Git Commit        │ Governance Event                             │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ W020-G8 Acceptance  │ f7fd1fa           │ CTO Decision: G8 ACCEPTED / COMPLETE / CLOSED│
│                     │                   │ Next permitted action: W020-G9 PLANNING ONLY │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ W020-G9 Planning    │ 30dc36d           │ Authoring & Submission of PLAN-W020-G9-REV-1 │
│                     │                   │ Status: DRAFT / SUBMITTED FOR RATIFICATION   │
│                     │                   │ Implementation strictly NOT authorized       │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ CTO Plan Ratification│ Written Directive│ CTO AUTHORIZATION — W020-G9 IMPLEMENTATION   │
│                     │                   │ PLAN-W020-G9-REV-1.0 ratified                │
│                     │                   │ Scope strictly bounded to ratified plan      │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ Initial G9 Impl.    │ ebf5eea           │ Initial master battery & audit dossier       │
│                     │                   │ Status: SUBMITTED (Review revealed defects)  │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ CTO Remediation     │ Written Directive│ CTO REMEDIATION DIRECTIVE — EVIDENCE CLOSURE │
│                     │                   │ Evidence provenance coordinates, honest      │
│                     │                   │ benchmark semantics, genuine concurrency.    │
├─────────────────────┼───────────────────┼──────────────────────────────────────────────┤
│ Remediated G9 Impl. │ Current Submission│ Complete remediation package submitted       │
│                     │                   │ Awaiting formal CTO acceptance review        │
└─────────────────────┴───────────────────┴──────────────────────────────────────────────┘
```

---

## 3. Scope Reconciliation: 19 Ratified Plan Endpoints vs 20 Registered Endpoints

### 3.1 Historical Context
Section 10 of `PLAN-W020-G9-REV-1.0.md` stated:
> *"All 19 Fastify endpoints maintain their exact TypeScript contracts defined in `packages/shared/src/contracts/delimitation.ts`."*

The original 19 endpoints defined during W020-G5 were:
1. `GET /api/v1/delimitation/projections`
2. `GET /api/v1/delimitation/projections/:stateCode`
3. `GET /api/v1/delimitation/timeline`
4. `GET /api/v1/delimitation/status`
5. `GET /api/v1/delimitation/gainers-losers`
6. `POST /api/v1/delimitation/monitor-webhook`
7. `GET /api/v1/delimitation/impact/:pinCode`
8. `GET /api/v1/delimitation/simulate/:stateCode`
9. `GET /api/v1/delimitation/reservation`
10. `GET /api/v1/delimitation/reservation/:stateCode`
11. `GET /api/v1/delimitation/compare`
12. `GET /api/v1/delimitation/mla-impact/:stateCode`
13. `GET /api/v1/delimitation/party-projections/:stateCode`
14. `GET /api/v1/delimitation/methodology`
15. `GET /api/v1/delimitation/regimes`
16. `GET /api/v1/delimitation/regimes/resolve`
17. `GET /api/v1/delimitation/proposals`
18. `GET /api/v1/delimitation/proposals/:id`
19. `GET /api/v1/delimitation/mapping`

### 3.2 The 20th Endpoint: `/api/v1/delimitation/lineage/:acCode`
During Milestone W020-G6 (ingestion of Andhra Pradesh Reorganisation Act, 2014 and Ministry of Home Affairs Order G.S.R. 311(E)) and W020-G7 (canonical query surface), the technical authority specifically mandated evidencing that within examined authoritative statutory instruments, constituency-level predecessor/successor lineage for Telangana ACs 110 (Pinapaka), 118 (Aswaraopeta), and 119 (Bhadrachalam) is **UNKNOWN**.

To expose these evidence-backed statutory lineage determinations to clients without fabricating speculative relationships, Fastify route `GET /api/v1/delimitation/lineage/:acCode` was implemented, tested, and accepted in W020-G7 at commit `65c32c8d62a3d5c4a42efe4adb6de5a6e8629fca` (DEC-096, DEC-097).

### 3.3 Reconciliation Statement
The presence of 20 endpoints in the Fastify routing registry:
1. Does **not** represent unauthorized scope creep in Milestone W020-G9.
2. Is fully traceable to accepted milestone W020-G7.
3. Is verified in E2E-13 as: `Total verified: 20 (Ratified plan: 19, Reconciled total: 20 including /lineage/:acCode), Missing: none`.
4. Zero endpoints have been removed, suppressed, or modified without authorization.

---

## 4. Test Accounting Reconciliation: 367 Total Passing Checks

In accordance with CTO Directive Item 6:
> "Correct master-test accounting language: The reports state: `367+ PASS (221 Suite Checks + 34 Inventory Checks + 93 W019 + 53 W018)`. That arithmetic adds to 401, not 367. The 34 inventory checks are already inside the 221 suite checks. Unify all accounting language across reports to state:  
> - 221 suite checks  
> - 53 W018 invariants  
> - 93 W019 invariants  
> - **367 total passing checks**"

All governance registers and audit reports have been standardized to this precise formula:
- **W020 Unified Master Battery (9 Suites):**
  1. W020-G4 Preflight (Migration 055 & Staging Schema): **23 checks**
  2. W020-G5 Engine Core Invariants (Hamilton Apportionment): **34 checks**
  3. W020-G5 Fastify Route Integration (Jest): **33 checks**
  4. W020-G6 Historical Ingestion & Evidence: **27 checks**
  5. W020-G7 Canonical Query Surface (5 Typed Selection Modes): **25 checks**
  6. W020-G8 Integration (MLA Profiles, Party Projections, Assembly Bounds): **25 checks**
  7. W020-G8 Legal Applicability & Temporal Boundary Resolution: **30 checks**
  8. API Contract Drift (9 Declared Endpoints): **9 checks**
  9. W020-G9 Master E2E & Concurrency Battery: **15 checks**
  - **Subtotal W020 Suite Checks:** **221 checks** (100% PASS)
- **Upstream Verified Invariants:**
  - W018 Political Entity Model: **53 checks** (100% PASS)
  - W019 Election Normalization Invariants: **93 checks** (100% PASS)
- **Unified Master Total Accounted:** $221 + 53 + 93 =$ **367 passing checks** (100.0% Pass Rate).

---

## 5. Non-Self-Ratification Boundary Confirmation

Under Master Execution Framework Amendment v1.4 (Rule IV-001) and Part 34:
- The implementing agent is strictly prohibited from self-certifying or declaring W020-G9 complete.
- All evidence artifacts, registers, and dossiers mark Milestone W020-G9 as **SUBMITTED FOR CTO REVIEW & ACCEPTANCE**.
- Milestone W021 and subsequent milestones remain **STRICTLY NOT AUTHORIZED / BLOCKED**.
- Zero production mutations, zero database migrations, and zero mobile codebase modifications have been made.
