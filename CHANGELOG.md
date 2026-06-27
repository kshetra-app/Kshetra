# Changelog

All notable changes to KSHETRA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
