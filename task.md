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
