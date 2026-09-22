# RELEASE REGISTER: PANIN / KSHETRA
**Last Updated:** 2026-09-21
**Standard:** AI Agent Master Execution Job Book & Amendment v1.2 (Sections 0.8, Parts 9–14)

---

## Production & Staging Releases

| Release Tag | Target Env | Target Binary | Measured Size (AAB/APK) | JS Bundle Size | API Version | Git Commit | Release Gate Status | Verified By | Independent Verifier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `v0.1.0-audit` | Dev Baseline | Android Universal | Pending measurement | TBD | v1 | `0f7e104` | Baseline Audit | ARCH / DEVOPS | N/A |
| `v0.1.0-w000-rec2`| Dev Audit Reconciled | Monorepo Source | N/A | N/A | v1 (0.1.0) | `7d89b3e` | W000-REC2 (Superseded by REC2A) | ARCH | Reopened |
| `v0.1.0-w000-rec2a`| Dev Audit Reconciled | Monorepo Source | N/A | N/A | v1 (0.1.0) | `5f7c8a5` | W000-REC2A Accepted | ARCH | PASS (IV Pass 2026-09-09) |
| `v0.1.0-w001` | Production | Railway API + Supabase | Backend Gateway | N/A | v1 (0.1.0) | `77fb553` | W001-R1..R5 Verified | DEVOPS+QA | Reconciled via Amendment v1.2 |
| `v0.1.0-w002` | Staging | Railway API + Supabase | Staging Gateway | N/A | v1 (0.1.0) | `c117f8c` | W002 Accepted (Staging Isolation) | DEVOPS | PASS (IV Pass 2026-09-09) |
| `v0.1.0-w003` | CI/CD Pipeline | Automated Quality Gate | GitHub Actions | N/A | v1 (0.1.0) | `d81fd33` | W003 Accepted (CI/CD Pipeline) | DEVOPS | PASS (IV Pass 2026-09-10) |
| `v0.1.0-w004` | Production/Staging | API Observability & Telemetry | Backend Gateway | N/A | v1 (0.1.0) | `811b5dd` | W004 Accepted (Observability & Metrics Hardening) | DEVOPS | PASS (IV Pass 2026-09-10) |
| `v0.1.0-w005` | Staging / Recovery | Disaster Recovery & Backup Verification | Staging Gateway & Database | N/A | v1 (0.1.0) | `acc32fe` | W005 Accepted (w/ Documented Limitations) | DEVOPS | PASS (IV Pass 2026-09-11) |
| `v0.1.0-w007` | Mobile Client | Canonical API Client Layer (`apps/mobile/lib/api`) | Monorepo Source | N/A | v1 (0.1.0) | `1d253cd` | W007 Accepted / Closed | BE+MOB | PASS (CTO Accepted 2026-09-12) |
| `v0.1.0-w008-c` | Production / Staging | Phase-1 Domain API Contracts (`states`, `moderation`, `notifications`, `civic`) | Backend Gateway | N/A | v1 (0.1.0) | `8984704` | W008-C Accepted / Complete | BE | PASS (CTO Accepted 2026-09-14) |
| `v0.1.0-w009-b5` | Staging | Railway API + Supabase | Backend Gateway + Staging DB | N/A | v1 (0.1.0) | `45ebb7d` | W009-B5 Accepted (Migrations 035-037, Provider Sandbox/Mock, Lineage Closure) | BE+DEVOPS | PASS (CTO Accepted 2026-09-21) |
| `v0.1.0-w010` | Staging DB / Monorepo | Security Baseline & RLS Hardening (Migration 038, Batches L1–L3, DEF-014..DEF-017) | N/A | 100% 13-locale parity (2,371 keys) | v1 (0.1.0) | `75b0ba2` | W010 Accepted / Complete | SEC+ARCH | PASS (CTO Accepted 2026-09-21; 36/36 security tests pass; Checks 1–7 pass) |
| `v0.1.0-w015` | Staging DB | Geography Relationship Engine (Migration 042, DEF-15-01, DEF-15-02) | N/A | N/A | v1 (0.1.0) | `8766c65` | W015 Submitted / Pending CTO | DATA+BE | PENDING CTO ACCEPTANCE (9/9 battery pass, 13/13 W013 pass, 9/9 W014 pass) |

---

### Release Size & Performance Gates
- **Max Consumer AAB:** 30 MB (Target: ≤ 25 MB)
- **Max Universal APK:** 45 MB
- **Cold App Startup:** < 2.0s
- **Warm App Startup:** < 500ms
- **API Health Gate:** `GET /health` == `200 OK`
- **13-Language i18n Gate (Part 16):** 100% string coverage across `en`, `te`, `hi`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `or`, `pa`, `as`, `ne` with 0 missing keys and 0 visual text overflow/clipping bugs in release builds.

---

### Launch Gate & Critical Milestone Governance (Amendment v1.2)
- **Launch Gate A (Core Platform):** Mandatory independent verification of Product (Map, Explore, My Kshetra, Constituency, Delimitation, Community, Civic, News, Shorts, Notifications), Data (core geography, provenance, delimitation), Security (auth, RLS, reporting, blocking, deletion), Performance (build size ≤ 30MB, startup < 2s), i18n (all 13 languages), and Operations (Railway, Supabase, backup). Produces `INDEPENDENT_VERIFICATION_REPORT.md`.
- **Launch Gate B (Full Platform):** Final independent verification across Aspirants, Groups, Live, Broadcasting, Academy, Campaign, Political Ads, Commercial Ads, SaaS/API, Analytics, DPDP compliance, and Recovery.
- **Rule IV-001 Enforcement:** Implementing agent ≠ final acceptance authority. Independent verifier (clean AI session, separate audit workflow, or human QA) must issue `PASS` or `PASS WITH NON-BLOCKING EXCEPTIONS`.
- **Remote Reproducibility & Freshness (Parts 7 & 8):** All evidence must be committed in `reports/` with metadata (repo, branch, commit, DB version, API version, mobile version, env, timestamp). Stale evidence is automatically invalid upon code changes.
