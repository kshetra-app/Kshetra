# KSHETRA — Delimitation Masterplan

> India's next delimitation (post-Census 2026) will redraw every constituency in the country.
> This is a once-in-a-generation event. Every political app built on current boundaries becomes obsolete overnight.
> Kshetra's play: be the ONLY platform with both the old AND new world mapped, with the transition intelligence layer in between.

---

## Strategic Context

### What Is Delimitation?
Delimitation is the constitutionally mandated redrawing of constituency boundaries based on the latest census population data. The process is governed by Article 82 (Lok Sabha) and Article 170 (State Assemblies) of the Indian Constitution.

### Timeline Signals
| Event | Expected | Status |
|---|---|---|
| Census 2024–2026 (delayed from 2021) | 2025–2026 | Pending |
| Delimitation Commission formation | Post-census | Not yet |
| Draft proposals (public consultation) | ~2027–2028 | Not yet |
| Final gazette notification | ~2028–2029 | Not yet |
| First elections on new boundaries | ~2029–2031 | Not yet |

### Why This Is Existential for Kshetra
- **806 constituencies** across 4 states with full data → all become historical data overnight
- **22 states with GeoJSON polygons** → all boundaries will change
- **Every competitor** (NaMo, JEENE, MyNeta, ADR) is built on current boundaries only
- **First-mover advantage**: whoever maps the new world first wins the market

---

## Our Unfair Advantages (Moat)

| Asset | Value |
|---|---|
| 806 constituency profiles (TS/AP/KA/MH) | Instant historical comparison when new boundaries arrive |
| GeoJSON polygons for 22 states | Overlay engine for old-vs-new comparison |
| Political Ledger (double-entry) | Track transitions across boundary changes |
| MLA profiles, defections, trivia | Context that nobody else has |
| Multi-state data adapter pattern | Extensible architecture, plug in new boundary data instantly |
| AI/LLM integration | Natural language queries about delimitation impact |
| Civic pipeline (issues, promises) | Map issues to new constituencies automatically |
| 5 languages (en/te/hi/kn/mr) | Reach across demographics |

---

## Implementation Phases

### Phase D0: Foundation Layer (Sprint 17)
**Goal**: Types, DB schema, core data structures for delimitation

| # | Task | Priority | Deliverable |
|---|---|---|---|
| D0.1 | Delimitation types & interfaces | HIGH | `lib/delimitationTypes.ts` |
| D0.2 | Supabase migration `011_delimitation.sql` | HIGH | 6 tables: proposals, proposed_constituencies, constituency_mapping, ward_population, delimitation_events, citizen_impact |
| D0.3 | Census 2011 ward-level data ingestion | HIGH | `data/census/` pipeline — seed with existing Census 2011 district/sub-district population |
| D0.4 | Delimitation store (Zustand) | HIGH | `stores/delimitation.ts` — seed event timeline, proposal states |
| D0.5 | Delimitation constants & config | MEDIUM | Ward/tehsil types, proposal status enum, event type enum |
| D0.6 | Tests for types & store | HIGH | Full test coverage for new types |

### Phase D1: Monitoring & Intelligence Pipeline (Sprint 18)
**Goal**: Automated watchers for government sources — be first to know

| # | Task | Priority | Deliverable |
|---|---|---|---|
| D1.1 | Gazette of India monitor | HIGH | `scripts/monitors/gazette-monitor.ts` — scrape egazette.gov.in for delimitation notifications |
| D1.2 | ECI website monitor | HIGH | `scripts/monitors/eci-monitor.ts` — track eci.gov.in for boundary updates |
| D1.3 | Parliament proceedings tracker | MEDIUM | `scripts/monitors/parliament-monitor.ts` — Lok Sabha/Rajya Sabha transcripts |
| D1.4 | RTI request manager | MEDIUM | `data/rti/` — RTI templates for Census Commissioner, Delimitation Commission |
| D1.5 | Notification dispatch | HIGH | Alert pipeline → push notifications when new delimitation event detected |
| D1.6 | Monitor cron job setup | MEDIUM | GitHub Actions workflow for periodic monitoring |

### Phase D2: Delimitation Simulator (Sprint 19)
**Goal**: The killer feature — predict new constituency boundaries before they're announced

| # | Task | Priority | Deliverable |
|---|---|---|---|
| D2.1 | Population-proportional seat calculator | HIGH | `lib/delimitation/seatCalculator.ts` — given state population, compute seat count |
| D2.2 | Ward-level population aggregator | HIGH | `lib/delimitation/populationAggregator.ts` — aggregate Census wards into constituency-sized units |
| D2.3 | Equal-population partitioning algorithm | HIGH | `lib/delimitation/boundarySimulator.ts` — constrained optimization: contiguity, admin boundaries, ±10% deviation, SC/ST reservation |
| D2.4 | Old-to-new constituency mapping | HIGH | `lib/delimitation/constituencyMapper.ts` — compute overlap percentages between old and new boundaries |
| D2.5 | Reservation analyzer | MEDIUM | `lib/delimitation/reservationAnalyzer.ts` — SC/ST population thresholds for reserved seats |
| D2.6 | Simulation API endpoints | HIGH | `routes/delimitation.ts` — simulate, compare, map endpoints |
| D2.7 | Validation suite | HIGH | Tests: seat totals balance, contiguity, reservation quotas met |

### Phase D3: Mobile UI — Delimitation Hub (Sprint 20)
**Goal**: User-facing screens for delimitation intelligence

| # | Task | Priority | Deliverable |
|---|---|---|---|
| D3.1 | Delimitation Hub screen | HIGH | `app/delimitation/index.tsx` — dashboard: timeline, latest events, simulation access |
| D3.2 | Boundary overlay on map | HIGH | Map layer toggle: current (solid) vs proposed (dashed) polygons |
| D3.3 | "What Changes For You" tool | HIGH | `app/delimitation/my-impact.tsx` — pin code/GPS → old constituency → new constituency |
| D3.4 | Constituency comparison view | HIGH | `app/delimitation/compare/[id].tsx` — side-by-side old vs new: demographics, voting history |
| D3.5 | Delimitation Timeline | MEDIUM | `components/DelimitationTimeline.tsx` — visual event timeline |
| D3.6 | State-wise impact summary | MEDIUM | `app/delimitation/state/[code].tsx` — seats gained/lost, reservation changes |
| D3.7 | i18n keys for delimitation | MEDIUM | All 5 locales updated |

### Phase D4: Political Impact Engine (Sprint 21)
**Goal**: Analysis that makes politicians, journalists, and strategists pay

| # | Task | Priority | Deliverable |
|---|---|---|---|
| D4.1 | Sitting MLA impact calculator | HIGH | Which MLAs lose safe seats, gain new territory, face merge with rival? |
| D4.2 | Party seat projection | HIGH | Given new boundaries + historical voting, project party-wise seats |
| D4.3 | Candidate viability scorer | HIGH | For each new constituency, rank potential candidates by historical performance in merged areas |
| D4.4 | Reservation shift analyzer | MEDIUM | GEN↔SC↔ST changes — who benefits, who's displaced |
| D4.5 | Alliance strategy modeler | MEDIUM | Seat-sharing optimization for coalitions under new geography |
| D4.6 | Floor Strength Transition Ledger | HIGH | Extend Political Ledger to track how the double-entry books close under old boundaries and open under new |
| D4.7 | AI-powered impact narratives | MEDIUM | Use LLM to generate human-readable impact stories per constituency |

### Phase D5: Monetization Layer (Sprint 22)
**Goal**: Revenue capture during the delimitation window

| # | Task | Priority | Deliverable |
|---|---|---|---|
| D5.1 | Delimitation API (licensed) | HIGH | REST API for media houses: real-time boundary data, projections, impact analysis |
| D5.2 | Embeddable map widget | HIGH | `<iframe>` / JS embed for news websites showing boundary changes |
| D5.3 | State Impact Report generator | HIGH | PDF/Excel downloadable reports per state — tiered pricing |
| D5.4 | Campaign Manager toolkit | HIGH | Booth-level strategy replanning for new boundaries |
| D5.5 | Subscription gates | MEDIUM | Free (basic impact) / Pro (full analysis) / Institutional (API + bulk reports) |
| D5.6 | Analytics dashboard for clients | MEDIUM | Usage tracking, report generation stats |

---

## Data Acquisition Strategy

### How to Get Delimitation Data FIRST

#### Tier 1: Automated Monitoring (Build Now)
| Source | URL | Data | Method |
|---|---|---|---|
| Gazette of India | egazette.gov.in | Official delimitation orders | Scraper + keyword alerts |
| Election Commission | eci.gov.in | Draft proposals, public consultations | Web monitor + diff |
| Census India | censusindia.gov.in | Ward-level population as released | Data pipeline |
| Parliament of India | parliamentofindia.nic.in | Committee reports, discussions | Transcript parser |
| PRS Legislative Research | prsindia.org | Bill tracking, policy briefs | RSS + scraper |

#### Tier 2: Strategic RTI Requests
| Target Authority | What to Request | Legal Basis |
|---|---|---|
| Registrar General & Census Commissioner | District/sub-district projected populations | RTI Act 2005, Sec 6 |
| Delimitation Commission (once formed) | Methodology document, criteria for boundary drawing | RTI Act 2005, Sec 6 |
| Election Commission | Current booth-to-constituency mapping (granular) | RTI Act 2005, Sec 6 |
| State Revenue Departments | Ward-level administrative maps (digital) | RTI Act 2005, Sec 6 |
| Survey of India | Updated administrative boundary shapefiles | National Map Policy 2005 |

#### Tier 3: Crowdsourced Intelligence
- **Delimitation Watch** community challenge (in our Civic Awakening system)
- Citizens report: local ward boundary changes, gram panchayat records
- Local newspaper reports on administrative reorganization
- Ground-level signals that precede formal delimitation

#### Tier 4: Research Partnerships
| Partner Type | Value Exchange |
|---|---|
| Demographers (IIHS, IIPS, JNU) | They get visualization tools, we get population models |
| TCPD (Ashoka University) | They get platform reach, we get historical constituency data |
| Lok Dhaba / ADR | Data sharing for mutual enrichment |
| State Election Commissions | Official data access in exchange for public dashboard |

---

## Delimitation Simulator — Algorithm Design

### Core Principle
Article 81/170 requires constituencies to have "as nearly equal population as practicable." The Delimitation Commission follows:

1. **Equal population per seat**: `ideal_pop = state_population / num_seats`
2. **Deviation tolerance**: ±10% from ideal
3. **Administrative boundary alignment**: Constituency boundaries should follow district/tehsil/ward lines
4. **Geographic contiguity**: Each constituency must be a single connected region
5. **SC/ST reservation**: Seats reserved where SC/ST population proportion exceeds threshold
6. **Compactness**: Minimize gerrymandering — boundaries should be reasonably compact

### Algorithm (Phased)

#### Phase A: Rough Partitioning
```
Input: State boundary polygon, ward-level population data, target seat count
1. Compute ideal_population = total_pop / target_seats
2. Use existing district boundaries as initial partition
3. For each district:
   a. If district_pop ≈ ideal_pop (±10%) → 1 seat
   b. If district_pop > ideal_pop → split into floor(district_pop / ideal_pop) units
   c. If district_pop < ideal_pop → merge with adjacent under-populated district
4. Output: rough constituency boundaries following admin lines
```

#### Phase B: Population Balancing
```
Input: Rough partitions from Phase A
1. For each over-populated partition:
   a. Identify boundary wards
   b. Move boundary wards to adjacent under-populated partition
   c. Re-check contiguity after each move
   d. Repeat until all partitions within ±10%
2. Output: balanced constituency boundaries
```

#### Phase C: Reservation Assignment
```
Input: Balanced partitions, SC/ST ward-level data
1. Compute SC% and ST% for each partition
2. Rank partitions by SC% descending → assign SC reservation to top-N (proportional to state SC%)
3. Rank remaining by ST% descending → assign ST reservation to top-M
4. Remaining → General
5. Output: final constituencies with reservation status
```

#### Phase D: Old-to-New Mapping
```
Input: Old constituency polygons, new constituency polygons
1. For each new constituency:
   a. Compute geometric intersection with ALL old constituencies
   b. Record overlap_percentage = intersection_area / new_area
   c. Primary predecessor = old constituency with highest overlap
2. Output: mapping table (old_ac_no → new_ac_no, overlap%)
```

---

## Seat Projection Model (Post-Delimitation)

### Current vs Expected
| State | Current Seats | Population (2011 Census, millions) | Pop/Seat | Expected Seats (proportional) |
|---|---|---|---|---|
| UP | 403 | 199.8 | 496K | ~550+ |
| MH | 288 | 112.4 | 390K | ~310+ |
| BR | 243 | 104.1 | 428K | ~290+ |
| WB | 294 | 91.3 | 311K | ~250 |
| TN | 234 | 72.1 | 308K | ~200 (decrease) |
| KA | 224 | 61.1 | 273K | ~170 (decrease) |
| KL | 140 | 33.4 | 239K | ~90 (decrease) |
| TS | 119 | 35.0 | 294K | ~95 (decrease) |
| AP | 175 | 49.4 | 282K | ~135 (decrease) |

**The political earthquake**: Southern states (TN, KA, KL, TS, AP) that controlled population growth will LOSE seats. Northern states (UP, BR, RJ, MP) that didn't will GAIN massively. This is the most politically sensitive aspect.

---

## Revenue Projections

| Product | Target Customer | Price Point | TAM |
|---|---|---|---|
| Delimitation API | Media houses (50+) | ₹5L–25L/year | ₹5–12Cr |
| State Impact Reports | Political parties (100+) | ₹1L–10L per report | ₹2–10Cr |
| Campaign Replanning Toolkit | Campaign managers (500+) | ₹25K–2L/month | ₹3–12Cr |
| Embeddable Widgets | News websites (200+) | ₹50K–5L/year | ₹1–5Cr |
| "What Changes For You" (freemium) | Citizens (10M+) | Ad-supported + ₹99/yr premium | ₹5–15Cr |
| Institutional/Academic License | Universities, think tanks | ₹2L–10L/year | ₹1–3Cr |
| **Total addressable** | | | **₹17–57Cr/year** |

---

## Implementation Order (What We Build Now)

### Sprint 17: Delimitation Foundation (Phase D0) ← START HERE
1. `lib/delimitationTypes.ts` — All types and interfaces
2. `supabase/migrations/011_delimitation.sql` — DB schema
3. `stores/delimitation.ts` — Zustand store with seed timeline
4. `data/census/india-district-population-2011.ts` — Census 2011 district data (public domain)
5. `data/census/india-ward-population-estimates.ts` — Sub-district projections
6. Tests for all new types and data

### Sprint 18: Monitoring Pipeline (Phase D1)
1. `scripts/monitors/gazette-monitor.ts` — eGazette scraper
2. `scripts/monitors/eci-monitor.ts` — ECI website diff monitor
3. `.github/workflows/delimitation-monitor.yml` — Cron workflow
4. Push notification integration for delimitation events

### Sprint 19: Simulator Core (Phase D2)
1. Seat calculator algorithm
2. Population aggregator
3. Boundary simulation (district-level first)
4. Old-to-new mapping engine
5. API endpoints
6. Comprehensive test suite

### Sprint 20: Mobile UI (Phase D3)
1. Delimitation Hub screen
2. Map overlay (old vs proposed)
3. "What Changes For You" screen
4. Timeline visualization

### Sprint 21: Impact Engine (Phase D4)
1. MLA impact calculator
2. Party seat projections
3. AI-generated impact narratives
4. Ledger transition system

### Sprint 22: Monetization (Phase D5)
1. Licensed API
2. Embeddable widgets
3. Report generator
4. Subscription gates

---

## Risk Mitigation

| Risk | Probability | Mitigation |
|---|---|---|
| Census delayed beyond 2026 | MEDIUM | Use Census 2011 + projections; our simulator still provides value as a "what-if" tool |
| Delimitation frozen (political opposition from South) | LOW-MEDIUM | The conversation itself generates demand; media will cover the debate, driving traffic |
| Competitor copies our approach | MEDIUM | Speed + data depth + mobile-first + AI = hard to replicate quickly |
| Data accuracy of simulation | HIGH | Heavy disclaimers ("projection, not prediction"), transparent methodology, academic partnerships for validation |
| Legal risks with government data scraping | LOW | Gazette is public record; Census is public data; RTI is a legal right |

---

## Success Metrics

| Metric | 6-Month Target | 12-Month Target |
|---|---|---|
| Delimitation Hub MAU | 50K | 500K |
| Media partnerships | 5 | 25 |
| API customers | 3 | 15 |
| Revenue from delimitation products | ₹10L | ₹1Cr |
| "What Changes For You" queries | 100K | 5M |
| Simulation accuracy (post-announcement) | N/A | >70% ward-level match |

---

## Document History

| Date | Author | Change |
|---|---|---|
| 2026-04-30 | Kshetra Team | Initial masterplan created |

---

*"In the confusion of boundary changes, information is power. Kshetra will be the source of truth."*
