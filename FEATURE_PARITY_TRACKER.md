# Feature Parity Tracker — Multi-State Replication

> **Purpose**: This document is the single source of truth for replicating all Telangana (TS) features across Andhra Pradesh (AP), Karnataka (KA), and Maharashtra (MH). Every feature, seed file, test, and integration that exists for Telangana MUST be created for the other three states. No exceptions.

---

## 1. Reference: Telangana Feature Inventory

### 1.1 Seed Data Files (`data/seed/`)

| # | File | Interface/Export | Records | Description |
|---|------|-----------------|---------|-------------|
| 1 | `telangana-constituencies.ts` | `ConstituencySeed`, `TELANGANA_CONSTITUENCIES` | 119 | All ACs with 2023 results (winner, runner-up, votes, margins, district, type) |
| 2 | `telangana-historical-results.ts` | `HistoricalResult`, `TELANGANA_2014_RESULTS`, `TELANGANA_2018_RESULTS` | 119×2 | Per-constituency winner+party for 2014 and 2018 elections |
| 3 | `telangana-election-history.ts` | `ElectionHistoryEntry`, `TELANGANA_ELECTION_HISTORY` | 3 entries | State-level aggregate results (seats, vote shares, turnout) for 2014/2018/2023 |
| 4 | `telangana-mla-profiles.ts` | `MLAProfile`, `TELANGANA_MLA_PROFILES` | 119 | Current MLAs: name, party, gender, terms, electedParty (defection tracking) |
| 5 | `telangana-demographics.ts` | `ConstituencyDemographics`, `TELANGANA_DEMOGRAPHICS` | 119 | Population, voters, turnout, literacy, urban%, SC/ST%, area per constituency |
| 6 | `telangana-political-timeline.ts` | `PoliticalLedgerEntry`, `TELANGANA_POLITICAL_LEDGER` | ~50 events | Double-entry ledger: defections, mergers, by-elections, deaths, party renames |
| 7 | `telangana-trivia.ts` | `TriviaItem`, `CURATED_TRIVIA` + derived | ~30+ items | "Did You Know?" facts — curated + auto-derived from ledger data |

### 1.2 Utility Functions (per seed file)

**historical-results.ts:**
- `getConstituencyHistory(acNo)` — 2014/2018 results for an AC
- `isPartyStronghold(acNo, party2023)` — won all 3 elections?
- `getPartyTally(year)` — party-wise seat count for 2014/2018
- `getSwingConstituencies(from, to)` — ACs that changed party between elections

**mla-profiles.ts:**
- `getMLAProfile(acNo)` — lookup by AC number
- `getMLAsByParty(party)` — all MLAs of a party
- `getDefectedMLAs()` — MLAs where electedParty ≠ currentParty
- `getFemaleMLAs()` — female MLAs
- `getVeteranMLAs()` — 3+ terms

**demographics.ts:**
- `getConstituencyDemographics(acNo)` — lookup by AC number

**political-timeline.ts:**
- `computePartyStrength(date?, assembly?)` — party seat tally at any point in time
- `auditLedger()` — validates total always = totalSeats
- `generateTimeline()` — snapshots for visualization
- `getMLAPartyTrail(name)` — MLA loyalty trail
- `getConstituencyTimeline(acNo)` — events for a specific AC
- `getDefectionSummary()` — party-to-party migration counts

**trivia.ts:**
- `getAllTrivia()` — curated + derived
- `getTriviaForConstituency(acNo)`
- `getTriviaForParty(party)`
- `getTriviaForMLA(name)`
- `getTriviaForElection(year)`
- `getRandomTrivia()` / `getRandomTriviaSet(n)`
- `getTriviaByCategory(category)`

### 1.3 Test Files (`data/seed/__tests__/`)

| # | Test File | Tests |
|---|-----------|-------|
| 1 | `telangana-constituencies.test.ts` | Validates 119 records, unique acNos, required fields |
| 2 | `telangana-historical-results.test.ts` | Validates 119×2 records, helper functions |
| 3 | `telangana-election-history.test.ts` | Validates aggregate entries, party totals |
| 4 | `telangana-mla-profiles.test.ts` | Validates 119 profiles, helper functions |
| 5 | `telangana-political-timeline.test.ts` | 21 tests: audit clean, snapshots, defection summary |
| 6 | `telangana-trivia.test.ts` | Validates trivia items, context queries, randomness |

### 1.4 Mobile App Integration (`apps/mobile/`)

**Data layer (`lib/`):**
- `data.ts` — barrel re-export of all seed data + helpers
- `stateDataAdapter.ts` — normalizes state-specific seed → `ConstituencyBrief`
- `stateRegistry.ts` — state metadata (hasFullData, center coords, zoom)
- `enrichGeoJSON.ts` — enriches GeoJSON with election data per state

**UI consumers (`app/`, `components/`):**
- `app/constituency/[id].tsx` — MLA profile, demographics, trivia, election history, timeline
- `app/(tabs)/index.tsx` — map with trivia overlay, party strength
- `app/(tabs)/intelligence.tsx` — election history aggregates, swing analysis
- `components/CompareSheet.tsx` — compare constituencies (uses history, demographics, trivia)

### 1.5 i18n (`apps/mobile/i18n/locales/`)

| Language | File | Status |
|----------|------|--------|
| English | `en.ts` | ✅ Complete |
| Telugu | `te.ts` | ✅ Complete (TS + AP) |
| Hindi | `hi.ts` | ✅ Complete (MH fallback) |
| Kannada | `kn.ts` | ✅ Complete (KA) |
| **Marathi** | `mr.ts` | ❌ **Not yet created** (needed for MH) |

---

## 2. State-Specific Parameters

| Parameter | Telangana (TS) | Andhra Pradesh (AP) | Karnataka (KA) | Maharashtra (MH) |
|-----------|---------------|---------------------|-----------------|-------------------|
| **Total Seats** | 119 | 175 | 224 | 288 |
| **Latest Election** | 2023 | 2024 | 2023 | 2024 |
| **Historical Elections** | 2014, 2018 | 2014, 2019 | 2013, 2018 | 2014, 2019 |
| **Major Parties** | INC, BRS, BJP, AIMIM | TDP, YSRCP, JSP, BJP | INC, BJP, JD(S) | BJP, SHSUBT, NCPSP, INC, NCP, SHS |
| **Regional Language** | Telugu (te) | Telugu (te) | Kannada (kn) | Marathi (mr) |
| **Key Political Events** | TRS→BRS rename, INC→TRS merger, BRS→INC defections | YSRCP→TDP mass defections 2024, Jagan era end | JD(S)-INC coalition collapse 2019, Operation Lotus | Sena split (SHS vs SHSUBT), NCP split (NCP vs NCPSP) |
| **Census Base** | 2011 | 2011 | 2011 | 2011 |

---

## 3. Replication Checklist

### Legend
- ✅ Done
- 🔨 In Progress
- ❌ Not Started

### 3.1 Andhra Pradesh (AP) — 175 seats

| # | Feature | File to Create | Status |
|---|---------|---------------|--------|
| 1 | Constituencies (2024 results) | `andhra-pradesh-constituencies.ts` | ✅ Done |
| 2 | Historical results (2019 per-AC) | `andhra-pradesh-historical-results.ts` | 🔨 Created (needs verification) |
| 3 | Election history (aggregate) | `andhra-pradesh-election-history.ts` | ✅ Done |
| 4 | MLA profiles (175 MLAs) | `andhra-pradesh-mla-profiles.ts` | ❌ |
| 5 | Demographics (175 ACs) | `andhra-pradesh-demographics.ts` | ❌ |
| 6 | Political timeline/ledger | `andhra-pradesh-political-timeline.ts` | ❌ |
| 7 | Trivia engine | `andhra-pradesh-trivia.ts` | ❌ |
| 8 | Tests (all 6 test files) | `__tests__/andhra-pradesh-*.test.ts` | ❌ |
| 9 | Data adapter integration | Update `stateDataAdapter.ts` | ✅ Done |
| 10 | Data barrel re-export | Update `data.ts` | ❌ (only constituencies exported) |

### 3.2 Karnataka (KA) — 224 seats

| # | Feature | File to Create | Status |
|---|---------|---------------|--------|
| 1 | Constituencies (2023 results) | `karnataka-constituencies.ts` | ✅ Done |
| 2 | Historical results (2013/2018 per-AC) | `karnataka-historical-results.ts` | ❌ |
| 3 | Election history (aggregate) | `karnataka-election-history.ts` | ❌ |
| 4 | MLA profiles (224 MLAs) | `karnataka-mla-profiles.ts` | ❌ |
| 5 | Demographics (224 ACs) | `karnataka-demographics.ts` | ❌ |
| 6 | Political timeline/ledger | `karnataka-political-timeline.ts` | ❌ |
| 7 | Trivia engine | `karnataka-trivia.ts` | ❌ |
| 8 | Tests (all 6 test files) | `__tests__/karnataka-*.test.ts` | ❌ |
| 9 | Data adapter integration | Update `stateDataAdapter.ts` | ✅ Done |
| 10 | Data barrel re-export | Update `data.ts` | ❌ (only constituencies exported) |

### 3.3 Maharashtra (MH) — 288 seats

| # | Feature | File to Create | Status |
|---|---------|---------------|--------|
| 1 | Constituencies (2024 results) | `maharashtra-constituencies.ts` | ✅ Done |
| 2 | Historical results (2014/2019 per-AC) | `maharashtra-historical-results.ts` | ❌ |
| 3 | Election history (aggregate) | `maharashtra-election-history.ts` | ❌ |
| 4 | MLA profiles (288 MLAs) | `maharashtra-mla-profiles.ts` | ❌ |
| 5 | Demographics (288 ACs) | `maharashtra-demographics.ts` | ❌ |
| 6 | Political timeline/ledger | `maharashtra-political-timeline.ts` | ❌ |
| 7 | Trivia engine | `maharashtra-trivia.ts` | ❌ |
| 8 | Tests (all 6 test files) | `__tests__/maharashtra-*.test.ts` | ❌ |
| 9 | Data adapter integration | Update `stateDataAdapter.ts` | ✅ Done |
| 10 | Data barrel re-export | Update `data.ts` | ❌ (only constituencies exported) |

---

## 4. Cross-Cutting Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Fix i18n bug (Explore + Feed hardcoded English) | ✅ Done |
| 2 | Add Marathi (mr) locale file | ❌ |
| 3 | Register Marathi in `i18n/index.ts` LANGUAGES array | ❌ |
| 4 | Update `data.ts` to re-export all state seed data | ❌ |
| 5 | Update `stateDataAdapter.ts` with demographics/trivia/history per state | ❌ |
| 6 | Make constituency detail screen state-aware (not TS-only) | ❌ |
| 7 | Make CompareSheet state-aware | ❌ |
| 8 | Make intelligence tab state-aware | ❌ |
| 9 | GeoJSON boundaries for AP, KA, MH | ❌ |
| 10 | Update `building.md` with progress | ❌ |

---

## 5. File Naming Convention

All seed files follow the pattern:
```
data/seed/{state-name}-{feature}.ts
data/seed/__tests__/{state-name}-{feature}.test.ts
```

Examples:
- `andhra-pradesh-mla-profiles.ts`
- `karnataka-political-timeline.ts`
- `maharashtra-trivia.ts`

---

## 6. Interface Reuse Strategy

All states share the same TypeScript interfaces defined in the Telangana files:
- `ConstituencySeed` → each state has its own variant (e.g., `APConstituencySeed`)
- `HistoricalResult` — reused directly (import from telangana-historical-results)
- `ElectionHistoryEntry` / `PartyElectionResult` — reused directly
- `MLAProfile` — reused directly
- `ConstituencyDemographics` — reused directly (rename `turnout2023` → `turnoutLatest`)
- `PoliticalLedgerEntry` / `PartyStrengthSnapshot` — reused directly
- `TriviaItem` / `TriviaCategory` / `TriviaContext` — reused directly

---

## 7. Data Sources

| Source | URL | Used For |
|--------|-----|----------|
| ECI Results | https://results.eci.gov.in/ | Election results, vote counts |
| Wikipedia | https://en.wikipedia.org/ | Historical results, MLA profiles |
| MyNeta / ADR | https://myneta.info/ | MLA assets, criminal cases, education |
| Census 2011 | https://censusindia.gov.in/ | Demographics |
| State EC portals | Various | Voter rolls, turnout data |

---

## 8. Priority Order

1. **AP** (closest to TS, shares Telugu language, most data already seeded)
2. **KA** (second priority, Kannada locale already exists)
3. **MH** (largest state, needs Marathi locale creation)

Within each state, build in this order:
1. Election history (aggregate) — smallest, establishes pattern
2. Historical results (per-AC) — enables comparison features
3. MLA profiles — enables profile screens
4. Demographics — enables enriched views
5. Political timeline — enables ledger/defection features
6. Trivia — depends on timeline, builds on all above
7. Tests — validate everything
8. Integration — wire into mobile app

---

*Last updated: 2025-04-29*
*Status: AP partially started, KA and MH constituencies only*
