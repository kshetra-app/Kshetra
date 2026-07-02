# Hierarchy Framework — Task Tracker

## Scope
- Telangana first, then AP
- Booth-level election results (vote counts per booth) included
- Panchayat/local body election data (Sarpanch, ward members) included
- Normalized hierarchy with state-specific labels

---

## Component 1: Database Schema ✅
- `[x]` Create `022_administrative_hierarchy.sql` migration
  - `[x]` `mandals` table
  - `[x]` `gram_panchayats` table
  - `[x]` `revenue_villages` table
  - `[x]` `polling_booths` table
  - `[x]` `mandal_constituency_map` table (booth_panchayat_map replaced by direct FK)
  - `[x]` `booth_election_results` table (booth-level vote counts)
  - `[x]` `booth_candidate_votes` table (per-candidate per-booth)
  - `[x]` `local_body_elections` table (Sarpanch/ward results)
  - `[x]` `local_body_candidates` table
  - `[x]` 5 Aggregation views
  - `[x]` 18 RLS policies
  - `[x]` 28 Indexes + 3 validation triggers

## Component 2: TypeScript Types ✅
- `[x]` Create `packages/shared/src/types/hierarchy.ts`
- `[x]` Update `packages/shared/src/types/constituency.ts`
- `[x]` Update `packages/shared/src/index.ts`

## Component 3: Aggregation Engine ✅
- `[x]` Create `packages/shared/src/analytics/aggregation-engine.ts`
- `[x]` Create unit tests in `packages/shared/src/__tests__/aggregation-engine.test.ts`

## Component 4: Scrapers ✅
- `[x]` Create `scrapers/lgd-scraper.js` (Local Government Directory)
- `[x]` Create `scrapers/ceo-booth-scraper.js` (CEO portal booth data)
- `[x]` Create `scrapers/booth-result-scraper.js` (booth-level election results)
- `[x]` Create `scrapers/local-body-scraper.js` (panchayat/ward election results)
- `[x]` Create `scrapers/hierarchy-seed-generator.js`
- `[x]` Update `scrapers/config.js` with hierarchy config

## Component 5: Validation ✅
- `[x]` Create `scrapers/hierarchy-validator.js`

## Component 6: Framework Reference Document ✅
- `[x]` Create `HIERARCHY_FRAMEWORK.md` at project root

## Component 7: Seed Data ✅
- `[x]` Create `data/seed/telangana-hierarchy.ts` (pilot)
- `[x]` Create `data/seed/andhra-pradesh-hierarchy.ts` (pilot)
- `[x]` Create unit tests in `data/seed/__tests__/telangana-hierarchy.test.ts`
- `[x]` Create unit tests in `data/seed/__tests__/andhra-pradesh-hierarchy.test.ts`

## Component 8: Mobile UI (Sprint 52) ✅
- `[x]` Create `apps/mobile/lib/hierarchyData.ts` — unified query layer (TS + AP)
- `[x]` Create `apps/mobile/app/hierarchy/[id].tsx` — Constituency → Mandal → GP → Booth drill-down
  - `[x]` Breadcrumb navigation + rollup stat cards
  - `[x]` Sarpanch name/party badges at GP level
  - `[x]` Booth voter counts (M/F), urban/rural tag, GPS
  - `[x]` Honest empty-state for un-seeded constituencies
- `[x]` Entry point on `apps/mobile/app/constituency/[id].tsx` (gated by `hasHierarchyData`)
- `[x]` Verified: `tsc --noEmit` EXIT 0 (mobile); 278/278 seed tests pass

### Status
- **Data + types + engine + scrapers + pilot seed + UI: COMPLETE** for the pilot
  (Telangana ACs 1–5, Andhra Pradesh ACs 1–3).
- **Pending (production ingestion):** run the scraper pipeline (`run_hierarchy_ingestion.ps1`)
  to populate ALL constituencies from live LGD/CEO/SEC sources; wire Supabase persistence.

---

# Sprint 53 — News Aggregator, In-App Reader & Campaign Outreach (2026-07-02)

## Component 1: News feed backend — hourly RSS aggregator ✅
- `[x]` `apps/api/src/services/news/sources.ts` — curated RSS `FeedSource` registry
- `[x]` `apps/api/src/services/news/rssParser.ts` — dependency-free RSS 2.0 + Atom parser
- `[x]` `apps/api/src/services/news/newsService.ts` — scrape + dedupe + cache + hourly scheduler
- `[x]` `apps/api/src/routes/news.ts` — `GET /api/v1/news/feed`, `POST /api/v1/news/refresh`
- `[x]` Register routes + start scheduler in `apps/api/src/server.ts`

## Component 2: In-app reader (no external browser) ✅
- `[x]` `apps/mobile/app/reader.tsx` — modal WebView (articles + YouTube IFrame video)
- `[x]` Register `reader` modal route in `apps/mobile/app/_layout.tsx`
- `[x]` `apps/mobile/components/NewsCard.tsx` — route to `/reader` (removed `Linking.openURL`)

## Component 3: Mobile feed wiring ✅
- `[x]` `apps/mobile/stores/news.ts` — fetch live `/news/feed`, fall back to seed when empty/offline

## Component 4: Campaign Manager — Outreach admin panel ✅
- `[x]` `apps/mobile/components/CampaignOutreachPanel.tsx` — Compose / History / Templates
  - `[x]` WhatsApp / SMS / Voice channels, audience segments, `{variable}` templates
  - `[x]` SMS-segment + credit estimator; send-now / scheduled delivery
  - `[x]` History with live delivery progress (sent/delivered/read/failed)
  - `[x]` Template create / delete
- `[x]` `lib/outreachTypes.ts` + `lib/outreachProvider.ts` (MockOutreachProvider) — provider seam
- `[x]` `data/outreachSeed.ts` + `stores/outreach.ts` (persisted, simulated lifecycle)
- `[x]` Add `Outreach` tab to `apps/mobile/app/campaign-manager/index.tsx`

## Component 5: Localization ✅
- `[x]` `news / shorts / more` tab labels in all 13 locales (`en, hi, te, ta, kn, ml, mr, bn, gu, pa, or, as, ne`)

## Verification ✅
- `[x]` `tsc --noEmit` EXIT 0 (mobile)
- `[x]` `tsc --noEmit` EXIT 0 (api)

### Deferred (Phase 2 — reserved as requested)
- **Real outreach delivery:** implement Msg91/Twilio/Exotel against `OutreachProvider`
  (credentials, DLT-approved templates, consent/opt-in ledger) — zero UI change.
- **Feed scale-out:** persist scraped items + per-user personalization/ranking; add
  more regional-language sources; optional CDN caching of the feed JSON.
