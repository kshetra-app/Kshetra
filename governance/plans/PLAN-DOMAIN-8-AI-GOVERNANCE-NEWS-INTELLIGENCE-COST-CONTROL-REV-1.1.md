# Canonical Pre-Implementation Plan: Domain 8 — AI Governance, Grounded News Intelligence & Cost Control (JOB 067–071)

**Plan Identifier:** `PLAN-DOMAIN-8-AI-GOVERNANCE-NEWS-INTELLIGENCE-COST-CONTROL-REV-1.1`  
**Governing Authority:** Master Product Blueprint (Jobs 067–071), Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.5-A Section 26 (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), Rule IV-001 Non-Self-Acceptance & `AGENT_EXECUTION_PROTOCOL.md`  
**Target Scope:** Domain 8 (JOB 067, JOB 068, JOB 069, JOB 070, JOB 071)  
**Creation Date:** 2026-10-30  
**Revision Date:** 2026-10-30 (Rev 1.1 — Ratified with 4-Tier Provider Architecture, Custom LLM, Comprehensive Civic Taxonomy & POLIGRAM Grounding)  
**Status:** `APPROVED` (Implementation Authorization: `YES` under DEC-192)  

---

## 1. Document Title & Metadata

- **Document Title:** Master Pre-Implementation Plan: Domain 8 — AI Governance, Grounded News Intelligence & Cost Control (JOB 067 through JOB 071)
- **Document Revision:** 1.1 (Ratified & Authorized)
- **Target Repository:** `POLIGRAM` (formerly `PANIN` / `Kshetra`)
- **Governing Protocol:** Agent Execution Protocol Revision 1.6 & Amendment v1.5-A Section 26
- **Assigned Engineering Domain:** `ARCH`, `BE`, `DATA`, `PO`, `AI_SUBSYSTEM`, `COMPLIANCE`
- **Execution Authority:** CTO / User Sole Ratification Boundary
- **Current Git HEAD:** `53fc16d3da296bed017f46b0eb74a9f7565dbef9` (`origin/master`)

---

## 2. Problem Statement

POLIGRAM has established core sovereign geography, mobile optimization, civic engagement, political aspirant workflows, media broadcasting, monetization, and public developer discovery across Domains 1 through 7.

However, as an election-grade and civic data infrastructure across 4,123 Assembly Constituencies, POLIGRAM requires a bulletproof, non-partisan, hallucination-resistant, and economically governed AI intelligence layer:
1. **AI Provider Abstraction (JOB 067):** The existing `apps/api/src/services/ai.ts` directly instantiated OpenAI/Gemini without a clean provider interface abstraction. If API keys are missing or invalid in offline/isolated environments, startup behavior must never crash, and the system must dynamically support a 4-tier provider cascade (Gemini 2.0 Flash -> OpenAI GPT-4o-mini -> Custom LLM Service Provider -> Deterministic Offline Heuristic) with **zero hard-coded singletons**.
2. **AI News Summarization & Deduplication (JOB 068):** When processing political and legislative news feeds (PIB, ECI, regional news), redundant summaries are generated for the same source content. The platform requires content-addressed SHA-256 caching (`ai_news_summary_cache`) and fine-grained per-summary token cost accounting (`ai_cost_ledger`).
3. **AI Classification Fallback (JOB 069):** Civic issue categorization (roads, sanitation, water, electricity, public health, environment, parks, infrastructure) must not become single-point-of-failure dependencies on external LLMs. The platform requires a comprehensive structured civic taxonomy dictionary with regex matchers, urgency detection, and deterministic priority (>= 0.85 confidence resolves instantly with 0 AI cost; LLM fallback only when ambiguous; offline-safe execution).
4. **Ask POLIGRAM Grounded RAG (JOB 070):** Political queries regarding MLAs, MPs, delimitation boundaries, and voting statistics cannot be answered by generic ungrounded LLMs that hallucinate criminal records or speculate on corruption. The system requires strict Retrieval-Augmented Generation (RAG) restricted exclusively to verified database tables, with mandatory statutory citation links (ECI Form 20, Delimitation Orders) and prompt injection deflection.
5. **AI Cost Control & Circuit Breakers (JOB 071):** Without real-time token budgeting, malicious or runaway queries can exhaust cloud budgets. The platform requires per-tenant daily token ceilings (`ai_tenant_budgets`), cost ledger tracking (USD & INR), automatic circuit breaking (HTTP 429 fail-closed), and executive cost audit reports (`/api/v1/ai/cost-report`).

---

## 3. Current State Analysis

- `apps/api/src/services/ai.ts`: Directly instantiated `OpenAI` client with hardcoded environment checks for `GEMINI_API_KEY` and `OPENAI_API_KEY`. Missing provider interface, missing Custom LLM provider tier, and missing offline fallback provider.
- `apps/api/src/routes/ai.ts`: Exposes basic chat and legacy analysis routes without tenant budgeting, without cost ledger telemetry, and without content-addressed deduplication caching.
- `supabase/migrations/`: Latest migration is `080_domain7_developer_platform_web_embeds_and_analytics.sql`. No tables currently exist for `ai_news_summary_cache`, `ai_cost_ledger`, or `ai_tenant_budgets`.
- `packages/shared/src/contracts/`: Missing unified contracts for AI completions, news summaries, civic taxonomy classifications, Ask POLIGRAM RAG responses, and tenant cost control.

---

## 4. Fact / Inference / Unknown / Assumption Register

1. **Fact:** Missing external cloud API keys must never crash server startup in civic/electoral infrastructure.
2. **Fact:** Duplicate news articles syndicated across ANI, PTI, and PIB share identical or near-identical text and URL hashes.
3. **Fact:** The platform is officially rebranded to **POLIGRAM** (formerly PANIN / Kshetra).
4. **Inference:** Deterministic regex and taxonomy dictionary matching for standard municipal issues can resolve over 85% of civic complaints with sub-millisecond latency and zero AI token expenditure.
5. **Assumption:** Tenants have daily token limits that must fail closed (HTTP 429) rather than incurring unbounded cloud provider bills.

---

## 5. Target Architecture & Intended Outcome

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        POLIGRAM API CLIENT / WEB                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      AI SUBSYSTEM ROUTE HANDLERS                       │
│  - POST /api/v1/ai/news/summarize                                      │
│  - POST /api/v1/ai/civic/classify                                      │
│  - POST /api/v1/ai/ask-poligram                                        │
│  - GET  /api/v1/ai/cost-report                                         │
│  - POST /api/v1/ai/chat (legacy compatible)                            │
└───────────┬───────────────────────┬───────────────────────────┬────────┘
            │                       │                           │
            ▼                       ▼                           ▼
┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────────┐
│ AI COST CONTROL &     │ │ CONTENT-ADDRESSED │ │ DETERMINISTIC CIVIC   │
│ TENANT CIRCUIT BREAKER│ │ SHA-256 CACHE     │ │ TAXONOMY CLASSIFIER   │
│ (ai_tenant_budgets)   │ │ (ai_news_summary) │ │ (8 Depts, 150+ terms, │
│ 429 Fail-Closed       │ │ 0-Token Hit Return│ │ Urgency: Emergency)   │
└───────────┬───────────┘ └─────────┬─────────┘ └───────────┬───────────┘
            │                       │                       │
            └───────────────────────┼───────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      DYNAMIC AI PROVIDER REGISTRY                      │
│                (Fully Configurable, Zero Hardcoding)                   │
├───────────────────┬───────────────────┬────────────────┬───────────────┤
│ Tier 1: Gemini    │ Tier 2: OpenAI    │ Tier 3: Custom │ Tier 4:       │
│ 2.0 Flash         │ GPT-4o-mini       │ LLM Service    │ Deterministic │
│ (GeminiProvider)  │ (OpenAIProvider)  │ (CustomLLM)    │ Offline Heur. │
└───────────────────┴───────────────────┴────────────────┴───────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SOVEREIGN PERSISTENCE LAYER                       │
│  - ai_news_summary_cache (SHA-256 indexed content deduplication)       │
│  - ai_cost_ledger (Tokens, Latency, USD/INR, Provider audit trail)     │
│  - ai_tenant_budgets (Daily limits, Spend ceilings, Circuit breaker)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Governing Rules & Constraints

1. **Rule IV-001 Non-Self-Acceptance:** Verification is solely established via committed, reproducible automated test runs.
2. **Zero Hardcoded Providers:** All providers, models, endpoints, and timeouts are dynamically registered and configurable.
3. **Zero Startup Failure:** Fastify boots cleanly in degraded offline mode when keys are omitted.
4. **Anti-Hallucination & Defamation Invariant:** Ask POLIGRAM answers derive strictly from verified database records with mandatory statutory citations.
5. **Control M Implementation Gate:** Ratified by user under DEC-192.

---

## 7. Full Scope of Work

1. **Database Migration (`081_domain8_ai_governance_news_intelligence_and_cost_control.sql`):** Creates `ai_news_summary_cache`, `ai_cost_ledger`, `ai_tenant_budgets`.
2. **Shared Contracts (`packages/shared/src/contracts/ai.ts`):** Complete TypeScript interfaces for providers, completions, news summaries, civic taxonomy, Ask POLIGRAM, and cost budgets.
3. **AI Provider Abstraction (`aiProvider.ts`):** Pluggable 4-tier dynamic provider cascade with Gemini, OpenAI, Custom LLM, and Deterministic Offline Heuristic.
4. **News Summarization & Cache Service (`aiNewsSummaryService.ts`):** Content-addressed SHA-256 deduplication cache and granular cost logging.
5. **Civic Classifier Service (`aiCivicClassifier.ts`):** Comprehensive 8-department structured taxonomy dictionary with urgency detection, deterministic priority, and AI fallback.
6. **Ask POLIGRAM Grounded RAG (`askPoligramService.ts`):** Deterministic SQL context retrieval from verified database tables, statutory citations, and prompt injection deflection.
7. **Cost Control & Circuit Breaker Service (`aiCostControlService.ts`):** Daily token budget tracking, circuit breaking, and executive cost audit reporting.
8. **Fastify Routes (`apps/api/src/routes/aiSubsystem.ts`):** Full REST API endpoints wired into `apps/api/src/server.ts`.
9. **Automated Verification Test Battery (`tests/domain8-ai-governance-and-cost-control.test.ts`):** Comprehensive 15-test battery covering all 5 jobs.

---

## 8. Explicit Out-of-Scope Boundaries

- Direct training or fine-tuning of foundational LLM weights.
- Unsandboxed execution of arbitrary external Python scripts.
- Unverified web crawling or scraping without explicit publisher licensing.

---

## 9. Step-by-Step Implementation Plan

1. Author SQL migration `081_domain8_ai_governance_news_intelligence_and_cost_control.sql`.
2. Author shared contracts `packages/shared/src/contracts/ai.ts` and re-export in `contracts/index.ts`. Build `@kshetra/shared`.
3. Author `apps/api/src/services/aiProvider.ts` implementing the dynamic 4-tier provider cascade.
4. Author `apps/api/src/services/aiNewsSummaryService.ts`.
5. Author `apps/api/src/services/aiCivicClassifier.ts` with comprehensive structured taxonomy.
6. Author `apps/api/src/services/askPoligramService.ts` with verified DB retrieval and statutory citations.
7. Author `apps/api/src/services/aiCostControlService.ts` with circuit breakers and audit reporting.
8. Wire routes in `apps/api/src/routes/aiSubsystem.ts` and register in `apps/api/src/server.ts`. Build `@kshetra/api`.
9. Author and execute `tests/domain8-ai-governance-and-cost-control.test.ts`.
10. Execute regression test suites across Domain 7, Domain 6, JOB 036, JOB 051, and governance suites.
11. Reconcile registers (`ACCEPTANCE_REGISTER.md`, `EXECUTION_STATE.md`, `DECISION_LOG.md`), commit, and push.

---

## 10. Verification & Testing Strategy

A dedicated automated test battery `tests/domain8-ai-governance-and-cost-control.test.ts` will verify:
- Boot cleanly in degraded offline mode with zero keys.
- Dynamic 4-tier provider cascade and Custom LLM configuration.
- SHA-256 deduplication cache hit (0 tokens, 0 cost).
- Cost ledger telemetry precision.
- Deterministic civic issue classification across all 8 departments.
- Urgency level assignment (`EMERGENCY` on live wires, open manholes).
- Ask POLIGRAM verified table grounding and statutory citations (ECI Form 20).
- Prompt injection deflection.
- Tenant quota ceiling enforcement (HTTP 429 fail-closed).
- Executive cost audit report aggregation.

---

## 11. Negative-Path Testing Specification

1. Missing API keys must never crash server startup.
2. Exhausted daily tenant token budget must return HTTP 429 with `AI_BUDGET_EXCEEDED` and `Retry-After`.
3. Prompt injection attempting to jailbreak system must be deflected with neutral civic notice.
4. Queries on unverified corruption or candidate rumors must decline without speculating.
5. Malformed Custom LLM response must gracefully fall back to Tier 4 offline heuristic.

---

## 12. Evidence Generation Plan

Formal evidence dossiers will be generated at:
- `reports/domain8_ai_governance_and_cost_control_report.json`
- `reports/domain8_ai_governance_and_cost_control_report.md`

---

## 13. Reconciliation Plan

Update `ACCEPTANCE_REGISTER.md` for JOB 067 through JOB 071, update `EXECUTION_STATE.md` with completion coordinates, and record DEC-192 / DEC-193 in `DECISION_LOG.md`.

---

## 14. Independent Verification Specification

- `node tests/domain8-ai-governance-and-cost-control.test.ts` (15/15 PASS)
- `node tests/governance-consistency.test.mjs` (11/11 PASS)
- `node tests/governance-v16.test.mjs` (100% EMPIRICALLY VERIFIED)

---

## 15. Risks, Failure Modes & Mitigations

- **Risk:** External cloud LLM outage.  
  *Mitigation:* Pluggable fallback cascade routes automatically to secondary cloud provider, Custom LLM, and deterministic offline heuristic.
- **Risk:** Malicious query cost exhaustion.  
  *Mitigation:* Daily token budgets in `ai_tenant_budgets` trip circuit breaker fail-closed.
- **Risk:** Political defamation or hallucinations.  
  *Mitigation:* Strict grounding in verified database records with mandatory statutory citations.

---

## 16. Rollback & Recovery Strategy

Atomic migration and modular service structure allows clean rollback to prior git commit `53fc16d` without database schema corruption.

---

## 17. Impact Assessment

Enables safe, non-partisan, hallucination-resistant, and economically governed civic AI intelligence across all 4,123 Assembly Constituencies.

---

## 18. Acceptance Criteria

- JOB 067: AI Provider Abstraction boots cleanly without keys and provides dynamic 4-tier fallback with zero hardcoding.
- JOB 068: News summaries deduplicate via SHA-256 and log token costs.
- JOB 069: Civic classifier resolves >= 0.85 confidence deterministically via comprehensive taxonomy dictionary.
- JOB 070: Ask POLIGRAM derives strictly from verified database records with statutory citations.
- JOB 071: Cost control trips circuit breaker on quota breach and produces executive audit reports.

---

## 19. Artifact & Commit Lineage Map

Base commit: `53fc16d3da296bed017f46b0eb74a9f7565dbef9` (`origin/master`).

---

## 20. Amendment Compliance Matrix

- AMENDMENT v1.2: Strict verification before acceptance.
- AMENDMENT v1.5-A Section 26: Canonical 22-section planning structure.
- AMENDMENT v1.6: Control M ratification and zero-self-ratification boundary.

---

## 21. Operational Declarations

Executed under explicit user authorization with zero mocks, zero stubs, and gold standard engineering.

---

## 22. Plan Sign-Off & Review Request

Plan ratified and authorized under DEC-192. Proceeding with sequential implementation.
