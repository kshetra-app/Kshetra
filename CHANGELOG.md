# Changelog

All notable changes to KSHETRA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — Campaign Manager Revamp: Grassroots Command Center & Simplified Outreach (2026-09-03)
- **Eliminated Regulatory Friction Channels**:
  - Dropped bulk WhatsApp (WABA) to prevent Meta anti-spam account blocks and template approval friction.
  - Dropped bulk SMS to avoid TRAI Telecom DLT registration bureaucracy and `{#var#}` template rejections.
- **Bespoke 4-Pillar UI / UX Architecture** — `apps/mobile/app/campaign-manager/index.tsx`:
  - Revamped cluttered 6-tab marketing view into 4 dignified hubs tailored for non-tech-savvy grassroots leaders:
    1. **Overview (నా ప్రచారం / मेरा अभियान)** — `GrassrootsOverview.tsx`: Candidate profile banner, 4 dignified KPI cards (Total Voters, Booths with In-charge, Active Cadre, Budget Spent), immediate action shortcuts, and unassigned booth warning banner.
    2. **Reach Voters (ప్రజలకు సందేశం / मतदाता संपर्क)** — `SimplifiedOutreach.tsx`: 3 compliant channels (WhatsApp Status & Groups, Bulk Voice OBD, Meta Facebook Page & Instagram).
    3. **Booths (బూత్ నిర్వహణ / बूथ प्रबंधन)** — `GrassrootsBooths.tsx`: ECI Polling Stations, support estimates, in-charge phone/WhatsApp direct actions, verified Kshetra user status badge, and appointment modal.
    4. **Cadre (కార్యకర్తలు / जमीनी कार्यकर्ता)** — `GrassrootsWorkers.tsx`: Ground cadre directory with real-time search, 1-tap Call/WhatsApp, and worker enrollment with Kshetra user checks.
- **Service-Specific Pricing & Guidance Notes**:
  - Configured transparent, non-cumulative pricing per channel with a 50% platform margin for Kshetra:
    - Voice OBD: ₹0.90 per connected call (₹0.60 telecom base + ₹0.30 50% platform margin).
    - Meta Boost packages: ₹1,500, ₹4,500, ₹9,000 (vendor spend + 50% fee).
    - WhatsApp Organic: ₹0 (unlimited status & group shares).
  - Contextual Guidance Boxes on every service explaining how it works, prerequisites, DOs, and DON'Ts.
- **Voter Segmentation & Targeting Engine**:
  - Dynamic filtering by Geography (Entire Constituency vs Specific Wards vs Specific Booths) and Cadre/Demographic groups (All Voters, Cadre Only, Women Voters, Youth).
  - Real-time price recalculation as filters adjust.
- **Booth In-charge Reality & Kshetra User Requirement**:
  - Grounded in Indian election mechanics: a polling booth is an ECI building; the actionable contact is the **Booth In-charge (బూత్ కన్వీనర్)**.
  - Phone check endpoint `GET /api/v1/campaign/users/check-kshetra` validates registered Kshetra status. If not yet registered, provides a 1-tap WhatsApp invite link.

### Added — Campaign Prepaid Wallet & Live Voice OBD Telecom Integration (2026-09-03)
- **Database Migration** — `supabase/migrations/026_campaign_wallet_and_obd.sql`:
  - `campaign_wallets`: Prepaid balances, total recharged, total spent with non-negative constraints.
  - `wallet_transactions`: Double-entry audit ledger for credits (recharges) and debits (Voice OBD blasts).
  - `voice_obd_broadcasts`: Call batches with recipient counts, rate per call, total cost, and delivery statistics.
  - Full Postgres RLS policies securing wallet data per candidate.
- **Backend Wallet & Telecom Services (`apps/api`)**:
  - `apps/api/src/services/wallet/walletService.ts`: Prepaid balance tracking, Razorpay/UPI recharge order generation, signature credit verification, and service debit deduction with insufficient balance protection (`402 Payment Required`).
  - `apps/api/src/services/outreach/obdTelecomService.ts`: Voice gateway dispatching with **TRAI Regulatory Calling Window Check** (strictly 9:00 AM – 8:00 PM IST per Indian telecom rules). Calls scheduled outside this window are automatically queued for next morning.
  - `apps/api/src/routes/campaign.ts`: Added `/api/v1/campaign/wallet`, `/wallet/transactions`, `/wallet/recharge/order`, `/wallet/recharge/verify`, `/obd/dispatch`, `/obd/broadcasts`, `/obd/trai-status`, and telecom delivery webhook handler `/webhooks/voice/:provider`.
- **Mobile Prepaid Wallet Experience & Live Progress Tracker** — `SimplifiedOutreach.tsx`:
  - Top Campaign Wallet banner displaying available balance (`₹5,000 Available`) with a 1-tap `[+ Top-up]` button.
  - Pre-dispatch balance gate: checks cost against wallet balance. If balance is sufficient, allows 1-tap schedule; if insufficient, highlights deficit and changes button to `[Top-Up ₹X to Schedule Blast]`.
  - Wallet recharge modal with quick packs (₹1,000, ₹2,500, ₹5,000, ₹10,000) and custom amount UPI checkout.
  - Live OBD call delivery progress tracker with animated progress bar and live breakdown meters: Answered (88%), Busy (8%), Unreachable (4%).
- **Multi-Language (i18n) Localization**:
  - Full localization in English (`en.ts`), Telugu (`te.ts`), and Hindi (`hi.ts`), with graceful fallback across all 13 supported languages.

### Changed — Groq Removed & Replaced with Google Gemini Across System (2026-09-03)
- **Migrated Mobile AI service to Google Gemini** — `apps/mobile/lib/aiService.ts`:
  - Dropped all Groq endpoints, keys, and model candidates (`openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, etc.).
  - Integrated Google Gemini chat completions endpoint:
    `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`.
  - Configured with `gemini-3.6-flash` as primary model, with resilient fallbacks to
    `gemini-flash-latest`, `gemini-3.8-flash`, and `gemini-3.5-flash`.
  - Increased completion `max_tokens` to 2048 to accommodate Gemini thinking tokens.
  - Wired `EXPO_PUBLIC_GEMINI_API_KEY` with fallback to default key.
- **Backend Fastify AI service updated** — `apps/api/src/services/ai.ts`:
  - Wired `getAIClient()` to connect to Google Gemini endpoint `https://generativelanguage.googleapis.com/v1beta/openai` with model `gemini-3.6-flash`.
  - Updated `chatWithAI`, `smartSearch`, `analyzeConstituency`, `analyzeElectionTrends`, and `summarizeIssues` to leverage Gemini.
  - Updated `apps/api/src/routes/ai.ts` `/api/v1/ai/status` route to report `provider: 'gemini'` and `model: 'gemini-3.6-flash'`.
  - Updated `apps/api/src/routes/lmx.ts` to check `GEMINI_API_KEY`.
- **Environment and documentation scrub** —
  - `apps/mobile/.env` & `.env.example`: Removed `EXPO_PUBLIC_GROQ_API_KEY` / `EXPO_PUBLIC_GROK_API_KEY`; added `EXPO_PUBLIC_GEMINI_API_KEY`.
  - `apps/api/.env` & `.env.example`: Removed `GROQ_API_KEY`; added `GEMINI_API_KEY`.
  - `apps/mobile/i18n/locales/en.ts` & `hi.ts`: Updated `poweredBy` attribution from Groq to *"Powered by KSHETRA AI • Google Gemini"*.
  - `SUPABASE_SETUP.md` & `RUNBOOK_DEPLOY.md`: Scrubbed all Groq references and replaced with Gemini keys.
- **Testing & Verification** —
  - Tested live Gemini chat completion over HTTP (status 200 OK).
  - Added Gemini-configured test suite in `apps/api/src/__tests__/ai-openai.test.ts`.
  - All 29 API tests in `ai-openai.test.ts`, `ai.test.ts`, and `services.test.ts` passing.
  - `tsc --noEmit` clean on both `apps/mobile` and `apps/api`.

### Added — News Aggregator, In-App Reader & Campaign Outreach (2026-07-02, Sprint 53)
- **Hourly RSS news backend (Fastify)** — new `apps/api/src/services/news/`
  (`sources.ts`, `rssParser.ts`, `newsService.ts`) + `routes/news.ts`. Aggregates
  reputable outlets' **official RSS feeds** (The Hindu incl. TS/AP/TN/KA/KL, Indian
  Express, NDTV, Times of India, Aaj Tak, News18 Hindi, Hindu Tamil), storing only
  headline/summary/thumbnail/publisher + a canonical link (never re-hosting bodies —
  the Google News / Inshorts model). Dependency-free RSS 2.0 + Atom parser; parallel
  scrape with `Promise.allSettled`, dedupe, recency sort, in-memory cache and an
  **hourly `setInterval` scheduler** primed on boot. YouTube links auto-tagged as video.
  - `GET /api/v1/news/feed` (filters: `lang/scope/state/category/limit`, 5-min cache) +
    `POST /api/v1/news/refresh`. Registered in `server.ts`; scheduler started in `start()`.
- **In-app reader — no external browser hops** — new `apps/mobile/app/reader.tsx`,
  a modal `WebView` that opens articles in-page and plays **videos** via the YouTube
  IFrame Player API HTML (neutral `baseUrl`, avoiding embed Error 152). `NewsCard`
  dropped `Linking.openURL`; taps now route to `/reader`. Registered as a modal route.
- **Mobile feed wired to the live API** — `stores/news.ts` fetches
  `${API_BASE_URL}/api/v1/news/feed` and **falls back to the bundled seed** when the
  API is unreachable or empty (offline / dev), so the feed is never blank.
- **Campaign Manager — Outreach admin panel** — new `Outreach` tab
  (`components/CampaignOutreachPanel.tsx`): compose over **WhatsApp / SMS / Voice**
  with audience segments, `{variable}` templates, SMS-segment/credit estimator and
  send-now/scheduled delivery; broadcast **History** with live delivery progress
  (sent/delivered/read/failed); template CRUD. Backed by a provider-adapter seam
  (`OutreachProvider` + `MockOutreachProvider` — **simulation only, no real messages**);
  real Msg91/Twilio/Exotel wiring is a drop-in for Phase 2. Persisted store + seed data.
- **Localization** — `news / shorts / more` tab labels added to **all 13 locales**
  (`en, hi, te, ta, kn, ml, mr, bn, gu, pa, or, as, ne`) in native scripts.
- **Verified**: `tsc --noEmit` clean for both `apps/mobile` and `apps/api`.

### Go-Live — Supabase backend stood up + Fastify API deployable (2026-06-22, P1 Steps 1 & 2)
- **All 24 migrations now apply cleanly** (verified via local `supabase start` /
  `db reset`). Fixed latent defects that had never been integration-tested:
  - `003_multi_state.sql` redefined `states`/`constituencies` incompatibly with
    `001` (e.g. `assembly_seats` vs `total_seats`, `reservation` vs
    `reservation_status`) and ran `ALTER`/`CREATE VIEW` against `posts`/
    `civic_issues` that are created in *later* migrations. Rewritten to be purely
    additive (`ALTER TABLE … ADD COLUMN IF NOT EXISTS`) with an UPSERT seed.
  - Duplicate migration version `003` (two files) broke the version PK — the
    social migration was renamed `003_posts_polls_social.sql` →
    `0035_posts_polls_social.sql`; the (previously broken) `state_feed` view moved
    here and fixed to use `is_deleted` (posts has no `status` column).
  - `019_live_election.sql`: column `leading` (a reserved keyword) → quoted.
  - `022_administrative_hierarchy.sql`: expression in a `UNIQUE` constraint
    (`COALESCE(ward_number,0)`) → converted to a unique index.
- **Added `023_data_api_grants.sql`** — grants the Data API roles
  (`anon`/`authenticated`/`service_role`) so the app works on projects created
  with the new no-auto-expose default. RLS still gates every row.
- **RLS verified**: 120/120 application tables have RLS enabled (220 policies);
  only PostGIS `spatial_ref_sys` is exempt (standard). Enforcement proven: `anon`
  reads public tables and gets 0 rows from owner-only tables.
- **Fastify API made runnable in production**: `start` was `node dist/server.js`
  (wrong path; tsconfig emitted extensionless ESM that plain Node can't run). API
  now runs via `tsx` (`apps/api/package.json`: `start`/`build` fixed, `tsx`
  promoted to a runtime dependency). All **12 route groups smoke-tested** green
  via new `scripts/smoke-api.mjs` (auth-gated routes return 200 with headers).
- **Deployment artifacts**: `apps/api/Dockerfile` (+ root `.dockerignore`) for any
  container host, and `RUNBOOK_DEPLOY.md` with step-by-step cloud Supabase + API
  deploy instructions. Local stack tuned via `supabase/config.toml` (non-essential
  services disabled for a minimal, healthy Windows/Docker stack).

### Added — Authoritative data rebuild, historical backfill & Hierarchy UI (2026-06-22, Sprint 52)
- **Constituency seeds rebuilt to official strength from authoritative TCPD "Lok Dhaba"
  (ECI-sourced) data** — Gujarat (169→182), Punjab (111→117), Uttar Pradesh (401→403),
  Bihar (227→243), Goa (34→40). Now carry **real** winner/runner-up (party + name), vote
  counts, margins, turnout, electors, and corrected districts (the old seeds had
  `winnerVotes: 0`, empty runner-ups, and corrupted `'Sc'/'St'` districts). Party tallies
  match official results. New `scripts/rebuild-short-seed.mjs` (strictly validated).
- **Per-AC historical results backfilled from stubs to full coverage** —
  Kerala 2016 (25→140), West Bengal 2016 (→294), Uttar Pradesh 2017 (→403),
  Tamil Nadu 2016 (→232; the 2 postponed seats omitted, not fabricated). New
  `scripts/build-historical-results.mjs`.
- **Administrative Hierarchy drill-down UI** (`app/hierarchy/[id].tsx` + `lib/hierarchyData.ts`):
  Constituency → Mandal → Gram Panchayat → Booth with breadcrumbs, rollup stats, Sarpanch
  party badges and booth voter detail. Linked from the constituency screen when data exists
  (TS ACs 1–5, AP ACs 1–3). This makes the Sprint-51 hierarchy backend user-visible.

### Fixed — Tamil Nadu map geometry (source-clean)
- `apps/mobile/data/tn-assembly.json`: removed 12 degenerate/unclosed rings and 2 duplicate
  acNo features (Tirupattur, Nannilam) at source — **bad rings 12→0, duplicate acNo 2→0** —
  so the map no longer relies on the runtime `sanitizeGeoJSON()` mask. New `scripts/fix-tn-geo.mjs`.

### Verified
- `tsc --noEmit` clean across mobile/api/shared; seed test suite **278/278 passing**.

### Notes — clarified (not projections)
- Assam, Tamil Nadu, West Bengal, Kerala and Puducherry `2026` fields are **actual** results
  (the app timeline is June 2026), not projections, and were preserved untouched.

### Added — Leadership Academy: full content, videos, quizzes & citations (2026-06-17)
- Extended the `LeadershipModule` data model with rich content fields: `sections`,
  `keyTakeaways`, `video` (`ModuleVideo`), `quiz` (`QuizQuestion[]`), and `citations`
  (`ModuleCitation[]`) — defined in `apps/mobile/lib/aspirantTypes.ts`.
- New `apps/mobile/data/leadershipContent.ts` authoring **full educational content for
  all 12 modules** across the 8 categories (electoral process, campaign strategy, legal
  framework, public speaking, community organizing, digital campaigning, policy making,
  ethics & governance), each with multi-section reading, key takeaways, and source
  citations drawn from authoritative public bodies (ECI, RPA 1950/1951, Symbols Order
  1968, 73rd/74th Amendments, Nolan Principles, PRS).
- Attributed, copyright-safe videos: ECI's official EVM/VVPAT demo and TEDx "Speak like a
  leader" embedded via the existing YouTube WebView pipeline, streamed from the original
  publisher's channel (never re-hosted) with on-screen attribution captions and source links.
- New `ModuleDetailModal` component: renders reading sections, the attributed video,
  an **interactive scored quiz** (correct/incorrect highlighting + explanations), key
  takeaways, a tappable **Sources & Further Reading** block, a legal/attribution notice,
  and a "Mark as Complete" action that records quiz score and updates Civic Score.
- New `RegisterAspirantModal` component implementing the previously non-functional
  "Become an Aspirant" CTA — collects public name, bio, target constituency (prefilled
  from home), election year, Independent/party affiliation, and a public-listing toggle,
  with validation; creates the profile so the Civic Score card appears.
- Community tab is now interactive: each aspirant card has a working **Endorse** button
  (new `endorseAspirant` action + `endorsedIds` state in the aspirant store) that updates
  endorsement count and civic score.

### Added — Immersive territorial Political Shorts
- Replaced generic/placeholder shorts with **16 real, locally-relevant political videos**
  (verified YouTube IDs) in `apps/mobile/data/politicalShortsData.ts`, spanning Telangana
  (Hyderabad water/GHMC, KTR–Revanth, Singareni), Karnataka (Bengaluru footpaths, BBMP→GBA,
  Siddaramaiah budget, Hosur Rd cave-in), Maharashtra (Ladki Bahin scheme), and Andhra
  Pradesh (Amaravati capital), with constituency/state/national visibility coverage and a
  Serilingampally (TS-AC-67) constituency-tagged short.
- Bumped the `politicalShorts` store to `version: 2` with a `migrate` to force existing
  installs to re-seed the new territorial catalogue.

### Added — Seed content for full scope coverage
- New Telangana **Serilingampally (TS-AC-67)** feed posts covering every post type
  (discussion, news, poll, opinion, question) plus national-scope discussion and question
  posts, so all Feed menu options return content at every scope.
- New **constituency-level** (Serilingampally) and **national-level** promises in the
  promises store so the Dashboard Promises tab is populated at all three scopes.

### Changed — Strict geographic scope demarcation
- Rewrote the Feed scope filter (`apps/mobile/app/(tabs)/feed.tsx`) to **strictly** separate
  content: Constituency shows only that constituency's posts; State shows only that state's
  posts (its constituencies + state-wide), never national or other states; National shows
  only national + content promoted to national. Applies to all type filters (discuss/news/
  Q&A/polls/opinion).
- Applied the same strict three-scope demarcation to Dashboard promises
  (`apps/mobile/app/(tabs)/dashboard.tsx`) via a new `scopedPromises` selector; the
  Government Report Card now renders only at state scope.

### Changed — Legislator profiles & Chief Minister data
- Replaced the "Performance data will be available after PRS India sync" placeholder with
  **"Coming soon"** in `PerformanceCard.tsx` (shown across all MLA/MP profiles) after
  confirming PRS MLATrack exposes no per-MLA performance metrics.
- Aligned the Chief Minister registry (`apps/mobile/lib/chiefMinisters.ts`) with the app's
  2026 election dataset: updated KA, TN, KL, WB and corrected the PY party code (AINRC);
  added Wikipedia photo article keys for `V. D. Satheesan` and `N. Rangaswamy`
  (`candidatePhotos.ts`); routed AP MLA lookups through `adaptLegislatorProfile`
  (`stateDataDispatcher.ts`).

### Fixed — TypeScript: zero-error build restored
- `apps/mobile/lib/supabaseDataService.ts`: removed always-true conditions in `uid()` and
  the `incrementShortView` fallback (now a correct read-modify-write `view_count` update),
  and replaced an invalid `.catch()` on a Postgrest builder with a `try/catch` around the
  `increment_aspirant_modules` RPC. `tsc --noEmit` for `apps/mobile` now reports **0 errors**.

### Added — North-East, J&K, Puducherry, Sikkim & Uttarakhand election data expansion
- Expanded/refreshed full assembly datasets for **10 states/UTs**, each across
  constituencies, demographics, election history, MLA profiles, political timeline, and
  trivia seed files in `data/seed/`:
  - **Jammu & Kashmir** — 2024 assembly election.
  - **Tripura** — 2023.
  - **Arunachal Pradesh** — 2024 (with 2019 history).
  - **Manipur** — 2022.
  - **Meghalaya** — 2023.
  - **Mizoram** — 2023 (with 2018 history).
  - **Nagaland** — 2023.
  - **Sikkim** — 2024 (with 2019 history).
  - **Puducherry** — 2026 (projected dataset, with 2021 history).
  - **Uttarakhand** — 2022.
- Added source assembly GeoJSON boundaries and compressed AE result CSVs under `scripts/`
  for Arunachal Pradesh, Manipur, Meghalaya, Mizoram, Nagaland, Puducherry, Sikkim, Tripura,
  and Uttarakhand.
- Added build/repair tooling: `scripts/build-ne-geo.mjs`, `build-jk-geo.mjs`,
  `build-jk-seed.mjs`, `build-py-2026.mjs`, `rekey-jk-mla.mjs`, `rekey-tripura.mjs`,
  `jk-missing-profiles.mjs`, and `audit-tripura.mjs`; updated `apps/mobile/data/jk-assembly.json`.

### Added — Engineering Excellence (SDLC Gold Standard alignment)
- CI: coverage-enforced test job, mobile/API typecheck, ESLint gate.
- Security workflow: SAST (Semgrep), SCA (`npm audit` + OSV), SBOM (CycloneDX).
- Governance: `CODEOWNERS`, pull request template, Dependabot config, `CHANGELOG`, `LICENSE`.
- API: request validation (Zod), rate limiting, scoped CORS, global error handler.
- Architecture: backfilled ADR-002–007, OpenAPI specification.
- Testing: mobile test harness (`jest-expo` + Testing Library) with store/component tests.
- Testing: API `services/ai` OpenAI-configured path fully covered via a mocked client
  (`ai-openai.test.ts`), lifting branch coverage from ~76% to ~85%.
- Tooling: shared ESLint config with complexity / size budgets.

### Changed — Quality gates
- API Jest coverage thresholds ratcheted up to 90% statements/functions/lines and
  82% branches (from 80/75) now that the AI live path is mocked.

### Changed
- API error responses no longer leak internal exception messages in production.

### Security
- CORS origin is now allow-listed via `CORS_ORIGINS` instead of reflecting any origin.

## [0.1.0] — Initial
- Telangana-first political intelligence platform: interactive map, 119 constituency
  profiles, civic dashboard, feed, delimitation engine, AI analysis.
