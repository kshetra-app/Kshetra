# RELEASE REGISTER: PANIN / KSHETRA
**Last Updated:** 2026-09-08
**Standard:** AI Agent Master Execution Job Book & Amendment v1.2 (Sections 0.8, Parts 9–14)

---

## Production & Staging Releases

| Release Tag | Target Env | Target Binary | Measured Size (AAB/APK) | JS Bundle Size | API Version | Git Commit | Release Gate Status | Verified By | Independent Verifier |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `v0.1.0-audit` | Dev Baseline | Android Universal | Pending measurement | TBD | v1 | `0f7e104` | Baseline Audit | ARCH / DEVOPS | N/A |
| `v0.1.0-w000-rec2`| Dev Audit Reconciled | Monorepo Source | N/A | N/A | v1 (0.1.0) | `7d89b3e` | W000-REC2 (Superseded by REC2A) | ARCH | Reopened |
| `v0.1.0-w000-rec2a`| Dev Audit Reconciled | Monorepo Source | N/A | N/A | v1 (0.1.0) | `b78376a` | W000-REC2A Reconciled | ARCH | Pending IV |
| `v0.1.0-w001` | Production | Railway API + Supabase | Backend Gateway | N/A | v1 (0.1.0) | `77fb553` | W001-R1..R5 Verified | DEVOPS+QA | Reconciled via Amendment v1.2 |

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

