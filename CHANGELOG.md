# Changelog

All notable changes to KSHETRA are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
