# Feature Parity Tracker — Multi-State Replication

> **Purpose**: This document is the single source of truth for tracking data completeness and feature replication across all Indian states in Kshetra. The original scope (TS, AP, KA, MH) has expanded significantly — 22 states now have GeoJSON polygons, and 8 states have full scraped MLA profiles.

> **Last updated: 2026-06-22 (Sprint 52)**
> **Status: Significantly ahead of original tracker — see Section 3 for current reality**

> **⭐ SINGLE SOURCE OF TRUTH (2026-06-22):** Where this tracker disagrees with
> `AUDIT_GOLD_STANDARD_STATUS.md` or `building.md` Sprint 52, **those win** — they are the
> verified canonical status (`tsc` EXIT 0 + 278/278 seed tests this session). Specific
> Sprint-52 corrections:
> - **Constituency seeds now at full official strength with REAL votes/margins/runner-ups:**
>   Gujarat 182, Punjab 117, Uttar Pradesh 403, Bihar 243, Goa 40 (rebuilt from authoritative TCPD).
> - **Historical results no longer stubs** — Kerala 2016=140, West Bengal 2016=294,
>   Uttar Pradesh 2017=403, Tamil Nadu 2016=232 (full per-AC).
> - **AS/TN/WB/KL/PY `2026` = actual results** (June-2026 timeline), not projections.
> - **Stale items below now done:** KL/WB/UP/TN/CompareSheet/intelligence/constituency
>   detail are state-aware (verified); historical-results "minimal/needs-verification" rows
>   are superseded by the full rebuild above.
> - Still short (current election post-dates TCPD dump): AS, CG, HR, JH, MP, OD, RJ, DL.

---

## 1. Reference: Telangana Feature Inventory (Gold Standard)

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

| Language | File | Status | Covers |
|----------|------|--------|--------|
| English | `en.ts` | ✅ Complete | All states |
| Telugu | `te.ts` | ✅ Complete | TS + AP |
| Hindi | `hi.ts` | ✅ Complete | UP, HR, RJ, MH fallback |
| Kannada | `kn.ts` | ✅ Complete | KA |
| Marathi | `mr.ts` | ✅ Complete | MH |

---

## 2. GeoJSON Boundary Coverage

> All GeoJSON files live in `apps/mobile/data/` and are registered in `geo-manifest.json`.
> **22 states have polygon boundaries confirmed in the manifest.**

| State Code | File | Constituencies | Status |
|-----------|------|---------------|--------|
| TS | `telangana-assembly.json` | 119 | ✅ |
| AP | `ap-assembly.json` | 175 | ✅ |
| KA | `ka-assembly.json` | 225 | ✅ |
| MH | `mh-assembly.json` | 288 | ✅ |
| TN | `tn-assembly.json` | 235 | ✅ |
| KL | `kl-assembly.json` | 141 | ✅ |
| WB | `wb-assembly.json` | 294 | ✅ |
| UP | `up-assembly.json` | 403 | ✅ |
| RJ | `rj-assembly.json` | 201 | ✅ |
| GJ | `gj-assembly.json` | 165 | ✅ |
| DL | `dl-assembly.json` | 70 | ✅ |
| OD | `od-assembly.json` | 147 | ✅ |
| JH | `jh-assembly.json` | 95 | ✅ |
| BR | `br-assembly.json` | 243 | ✅ |
| PB | `pb-assembly.json` | 117 | ✅ |
| HR | `hr-assembly.json` | 90 | ✅ |
| CG | `cg-assembly.json` | 90 | ✅ |
| MP | `mp-assembly.json` | 226 | ✅ |
| AS | `as-assembly.json` | 133 | ✅ |
| GA | `ga-assembly.json` | 40 | ✅ |
| HP | `hp-assembly.json` | 68 | ✅ |
| JK | `jk-assembly.json` | 107 | ✅ |
| **Total** | | **~3,766 constituencies** | **22 / 28+ states** |

**States without GeoJSON yet:** MN, MZ, NL, SK, TR, AR, ME, UT, TG (Northeast + smaller UTs)

---

## 3. Seed Data Coverage — All States

### Legend
- ✅ Done
- 🔨 In Progress / Created (needs verification)
- ❌ Not Started
- N/A — Not Applicable for this state

### 3.1 Telangana (TS) — 119 seats ⭐ Gold Standard

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies | `telangana-constituencies.ts` | ✅ Done |
| 2 | Historical results (2014/2018) | `telangana-historical-results.ts` | ✅ Done |
| 3 | Election history (aggregate) | `telangana-election-history.ts` | ✅ Done |
| 4 | MLA profiles (119) | `telangana-mla-profiles.ts` | ✅ Done |
| 5 | Demographics (119 ACs) | `telangana-demographics.ts` | ✅ Done |
| 6 | Political timeline/ledger | `telangana-political-timeline.ts` | ✅ Done |
| 7 | Trivia engine | `telangana-trivia.ts` | ✅ Done |
| 8 | Tests (6 test files) | `__tests__/telangana-*.test.ts` | ✅ Done |
| 9 | GeoJSON boundary | `telangana-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.2 Andhra Pradesh (AP) — 175 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies (2024 results) | `andhra-pradesh-constituencies.ts` | ✅ Done |
| 2 | Historical results (2019 per-AC) | `andhra-pradesh-historical-results.ts` | ✅ Done |
| 3 | Election history (aggregate) | `andhra-pradesh-election-history.ts` | ✅ Done |
| 4 | MLA profiles (175 MLAs) | `andhra-pradesh-mla-profiles.ts` | ✅ Done |
| 5 | Demographics (175 ACs) | `andhra-pradesh-demographics.ts` | ✅ Done |
| 6 | Political timeline/ledger | `andhra-pradesh-political-timeline.ts` | ✅ Done |
| 7 | Trivia engine | `andhra-pradesh-trivia.ts` | ✅ Done |
| 8 | Tests | `__tests__/andhra-pradesh-seed.test.ts` | ✅ Done |
| 9 | GeoJSON boundary | `ap-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.3 Karnataka (KA) — 224 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies (2023 results) | `karnataka-constituencies.ts` | ✅ Done |
| 2 | Historical results (2013/2018 per-AC) | `karnataka-historical-results.ts` | ✅ Done |
| 3 | Election history (aggregate) | `karnataka-election-history.ts` | ✅ Done |
| 4 | MLA profiles (224 MLAs) | `karnataka-mla-profiles.ts` | ✅ Done |
| 5 | Demographics (224 ACs) | `karnataka-demographics.ts` | 🔨 Partial (5.4KB — needs full 224 ACs) |
| 6 | Political timeline/ledger | `karnataka-political-timeline.ts` | ✅ Done |
| 7 | Trivia engine | `karnataka-trivia.ts` | ✅ Done |
| 8 | Tests | `__tests__/karnataka-seed.test.ts` | ✅ Done |
| 9 | GeoJSON boundary | `ka-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.4 Maharashtra (MH) — 288 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies (2024 results) | `maharashtra-constituencies.ts` | ✅ Done |
| 2 | Historical results (2014/2019 per-AC) | `maharashtra-historical-results.ts` | ✅ Done |
| 3 | Election history (aggregate) | `maharashtra-election-history.ts` | ✅ Done |
| 4 | MLA profiles (288 MLAs) | `maharashtra-mla-profiles.ts` | ✅ Done |
| 5 | Demographics (288 ACs) | `maharashtra-demographics.ts` | 🔨 Partial (5.4KB — needs full 288 ACs) |
| 6 | Political timeline/ledger | `maharashtra-political-timeline.ts` | ✅ Done |
| 7 | Trivia engine | `maharashtra-trivia.ts` | ✅ Done |
| 8 | Tests | `__tests__/maharashtra-seed.test.ts` | ✅ Done |
| 9 | GeoJSON boundary | `mh-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.5 Kerala (KL) — 140 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies | `kerala-constituencies.ts` | ✅ Done |
| 2 | Historical results | `kerala-historical-results.ts` | 🔨 Created (minimal — needs verification) |
| 3 | Election history (aggregate) | `kerala-election-history.ts` | ✅ Done (2021 stub) |
| 4 | MLA profiles (121 MLAs) | `kerala-mla-profiles.ts` | ✅ Done |
| 5 | Demographics | `kerala-demographics.ts` | ✅ Done (140 constituencies stub) |
| 6 | Political timeline/ledger | `kerala-political-timeline.ts` | ✅ Done (stub) |
| 7 | Trivia engine | `kerala-trivia.ts` | ✅ Done (stub) |
| 8 | Tests | `__tests__/new-states-seed.test.ts` | 🔨 Partial (covered in new-states test) |
| 9 | GeoJSON boundary | `kl-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.6 West Bengal (WB) — 294 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies | `west-bengal-constituencies.ts` | ✅ Done |
| 2 | Historical results | `west-bengal-historical-results.ts` | 🔨 Created (minimal — needs verification) |
| 3 | Election history (aggregate) | `west-bengal-election-history.ts` | ✅ Done (2021 stub) |
| 4 | MLA profiles (294 MLAs) | `west-bengal-mla-profiles.ts` | ✅ Done |
| 5 | Demographics | `west-bengal-demographics.ts` | ✅ Done (293 constituencies stub) |
| 6 | Political timeline/ledger | `west-bengal-political-timeline.ts` | ✅ Done (stub) |
| 7 | Trivia engine | `west-bengal-trivia.ts` | ✅ Done (stub) |
| 8 | Tests | `__tests__/new-states-seed.test.ts` | 🔨 Partial (covered in new-states test) |
| 9 | GeoJSON boundary | `wb-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.7 Uttar Pradesh (UP) — 403 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies | `uttar-pradesh-constituencies.ts` | ✅ Done |
| 2 | Historical results | `uttar-pradesh-historical-results.ts` | 🔨 Created (minimal — needs verification) |
| 3 | Election history (aggregate) | `uttar-pradesh-election-history.ts` | ✅ Done (2022 stub) |
| 4 | MLA profiles (403 MLAs) | `uttar-pradesh-mla-profiles.ts` | ✅ Done |
| 5 | Demographics | `uttar-pradesh-demographics.ts` | ✅ Done (401 constituencies stub) |
| 6 | Political timeline/ledger | `uttar-pradesh-political-timeline.ts` | ✅ Done (stub) |
| 7 | Trivia engine | `uttar-pradesh-trivia.ts` | ✅ Done (stub) |
| 8 | Tests | `__tests__/new-states-seed.test.ts` | 🔨 Partial (covered in new-states test) |
| 9 | GeoJSON boundary | `up-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.8 Tamil Nadu (TN) — 234 seats

| # | Feature | File | Status |
|---|---------|------|--------|
| 1 | Constituencies | `tamil-nadu-constituencies.ts` | ✅ Done |
| 2 | Historical results | `tamil-nadu-historical-results.ts` | 🔨 Created (minimal — needs verification) |
| 3 | Election history (aggregate) | `tamil-nadu-election-history.ts` | ✅ Done (2021 stub) |
| 4 | MLA profiles (234 MLAs) | `tamil-nadu-mla-profiles.ts` | ✅ Done |
| 5 | Demographics | `tamil-nadu-demographics.ts` | ✅ Done (234 constituencies stub) |
| 6 | Political timeline/ledger | `tamil-nadu-political-timeline.ts` | ✅ Done (stub) |
| 7 | Trivia engine | `tamil-nadu-trivia.ts` | ✅ Done (stub) |
| 8 | Tests | `__tests__/new-states-seed.test.ts` | 🔨 Partial (covered in new-states test) |
| 9 | GeoJSON boundary | `tn-assembly.json` | ✅ Done |
| 10 | Data adapter integration | `stateDataAdapter.ts` | ✅ Done |

### 3.9 Auto-Generated States (full seed data + wired)

These states have auto-generated seed data (constituencies, demographics, election history, MLA profiles, political timeline, trivia) all wired into dispatchers, data.ts, and stateRegistry.

| State | Code | GeoJSON | Constituencies | MLA Profiles | Demographics | Election Hx | Timeline | Trivia | Wired |
|-------|------|---------|---------------|-------------|-------------|------------|---------|--------|-------|
| Rajasthan | RJ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gujarat | GJ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delhi | DL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Odisha | OD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Jharkhand | JH | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Punjab | PB | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Haryana | HR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chhattisgarh | CG | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Madhya Pradesh | MP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assam | AS | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Goa | GA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Himachal Pradesh | HP | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manipur | MN | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Meghalaya | ML | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mizoram | MZ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Nagaland | NL | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tripura | TR | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sikkim | SK | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Arunachal Pradesh | AR | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Uttarakhand | UK | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Puducherry | PY | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Bihar | BR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Jammu & Kashmir | JK | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 4. Lok Sabha / Rajya Sabha (MP Data)

| Feature | File | Status | Notes |
|---------|------|--------|-------|
| Lok Sabha MPs (18th, 2024) | `mp-profiles.ts` | ✅ Done — 543/543 MPs | Full coverage with stateCodes |
| Rajya Sabha MPs | `mp-profiles.ts` | ✅ Done — 142/245 MPs | 58% coverage; 103 remaining |
| `stateCode` field populated | `mp-profiles.ts` | ✅ Done | All 543 LS + 142 RS have stateCodes |
| Parliament screen wired | `app/parliament/index.tsx` | ✅ Done | 3 tabs, alliance strength, state breakdown |

---

## 5. Cross-Cutting Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Fix i18n bug (Explore + Feed hardcoded English) | ✅ Done |
| 2 | Add Marathi (mr) locale file | ✅ Done |
| 3 | Register Marathi in `i18n/index.ts` LANGUAGES array | 🔨 Verify |
| 4 | Update `data.ts` to re-export all state seed data | ✅ Done (31 states) |
| 5 | Update `stateDataAdapter.ts` for all states | ✅ Done (31 states) |
| 6 | Make constituency detail screen state-aware (not TS-only) | ❌ |
| 7 | Make CompareSheet state-aware | ❌ |
| 8 | Make intelligence tab state-aware | ❌ |
| 9 | GeoJSON boundaries for AP, KA, MH | ✅ Done (+ 19 more states) |
| 10 | Update `building.md` with progress | ✅ Done |
| 11 | Populate `stateCode` for all 543 Lok Sabha MPs | ✅ Done |
| 12 | Scrape Rajya Sabha MPs (245 members) | 🔨 142/245 done |
| 13 | Full demographics for KA (currently partial) | ❌ |
| 14 | Full demographics for MH (currently partial) | ❌ |
| 15 | Demographics/timeline/trivia for KL, WB, UP, TN, BR, JK | ✅ Done (all 6 states) |
| 16 | Wire NE states into `stateDataDispatcher.ts` | ✅ Done |
| 17 | Add NE states + PY to `PartyCode` and `PARTY_CONFIG` | ✅ Done |
| 18 | Update `stateRegistry.ts` for all 31 states | ✅ Done |
| 19 | Update `FULLY_SUPPORTED_STATES` for all 31 states | ✅ Done |

---

## 6. Overall Progress Summary

| Dimension | Done | Total | % |
|-----------|------|-------|---|
| States with GeoJSON | 22 | 31 | ~71% |
| States with MLA profiles (wired) | **31** | 31 | **100%** ✅ |
| States with constituencies (wired) | **31** | 31 | **100%** ✅ |
| States with demographics (wired) | **31** | 31 | **100%** ✅ |
| States with election history (wired) | **31** | 31 | **100%** ✅ |
| States with political timeline (wired) | **31** | 31 | **100%** ✅ |
| States with trivia (wired) | **31** | 31 | **100%** ✅ |
| States with full TS-level seed data | 4 | 31 | 13% |
| Lok Sabha MPs scraped & seeded | **543** | 543 | **100%** ✅ |
| Rajya Sabha MPs scraped & seeded | **142** | 245 | **58%** |
| Parliament screen wired & TS-clean | ✅ | — | **100%** |
| TypeScript build errors | **0** | — | **✅ Clean** |
| i18n locales complete | 5 | 5 | 100% |
| `stateDataDispatcher.ts` — all dispatchers | **31 states** | — | **100%** ✅ |
| `data.ts` — barrel re-exports | **31 states** | — | **100%** ✅ |
| `stateRegistry.ts` — state metadata | **31 states** | — | **100%** ✅ |
| `stateDataAdapter.ts` — constituency adapters | **31 states** | — | **100%** ✅ |

---

## 7. File Naming Convention

All seed files follow the pattern:
```
data/seed/{state-name}-{feature}.ts
data/seed/__tests__/{state-name}-{feature}.test.ts
```

Examples:
- `andhra-pradesh-mla-profiles.ts`
- `karnataka-political-timeline.ts`
- `maharashtra-trivia.ts`
- `west-bengal-constituencies.ts`

---

## 8. Interface Reuse Strategy

All states share the same TypeScript interfaces defined in the Telangana files:
- `ConstituencySeed` → each state has its own variant (e.g., `APConstituencySeed`)
- `HistoricalResult` — reused directly (import from telangana-historical-results)
- `ElectionHistoryEntry` / `PartyElectionResult` — reused directly
- `MLAProfile` — reused directly
- `ConstituencyDemographics` — reused directly (rename `turnout2023` → `turnoutLatest`)
- `PoliticalLedgerEntry` / `PartyStrengthSnapshot` — reused directly
- `TriviaItem` / `TriviaCategory` / `TriviaContext` — reused directly

---

## 9. Data Sources

| Source | URL | Used For |
|--------|-----|----------|
| ECI Results | https://results.eci.gov.in/ | Election results, vote counts |
| Wikipedia | https://en.wikipedia.org/ | Historical results, MLA profiles |
| MyNeta / ADR | https://myneta.info/ | MLA assets, criminal cases, education, MP profiles |
| Sansad.in | https://sansad.in/ | MP profiles, committee data |
| Census 2011 | https://censusindia.gov.in/ | Demographics |
| State EC portals | Various | Voter rolls, turnout data |

---

## 10. Priority Order — Next Steps

### Tier 1 (Immediate — completes near-full states)
1. ✅ ~~**Populate `stateCode` for 473 Lok Sabha MPs**~~ — DONE (543/543 with stateCodes)
2. ✅ ~~**Scrape remaining 70 Lok Sabha MPs**~~ — DONE (543/543 complete)
3. ✅ ~~**Scrape Rajya Sabha MPs**~~ — 142/245 done; 103 remaining
4. **KA demographics** — fill remaining ACs (file exists, only partial)
5. **MH demographics** — fill remaining ACs (file exists, only partial)
6. **Wire KL, WB, UP, TN into `stateDataAdapter.ts`** — they have data, just not wired

### Tier 2 (Short-term — deepens new states)
7. **Scrape remaining 103 Rajya Sabha MPs** (complete 245/245)
8. **KL** election history + political timeline + trivia
9. **WB** election history + political timeline + trivia
10. **UP** election history + political timeline + trivia
11. **TN** election history + political timeline + trivia

### Tier 3 (Medium-term — expand to GeoJSON-only states)
12. Scrape MLA profiles for: RJ, GJ, BR, PB, HR, MP (high-priority large states)
13. Complete GeoJSON for remaining 6 states + UTs

---

*Last updated: 2026-05-27*
*Session summary (2026-05-27 #1): Parliament screen fully wired to new MP seed. All 543 LS + 142 RS MPs seeded. TypeScript build is now 0 errors — all data.ts export mismatches, delimitation screen type errors, MLAProfile.phone, SeatAllocation.popPerSeat, and optional native module declarations all resolved.*

*Session summary (2026-05-27 #2): Full wiring sprint — 31 states now fully wired across all layers: stateDataDispatcher.ts (demographics/election-history/timeline for 21 auto-generated states via type adapters), data.ts (barrel re-exports for all 31 states), stateRegistry.ts (31 state entries), stateDataAdapter.ts (already had 31 states), FULLY_SUPPORTED_STATES expanded to 31. Added 8 NE states + Puducherry to STATES constant, PartyCode type, and PARTY_CONFIG. TypeScript build: 0 errors.*
