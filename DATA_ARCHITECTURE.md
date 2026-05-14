# Kshetra Data Architecture — Zero Empty Fields Strategy
## Cofounder & Senior Technical Architect Design

> **Goal**: Fill 100% of LegislatorProfile fields for every MLA, MP (LS/RS), MLC  
> across all Indian states, and keep data current through automated periodic updates.

---

## 1. FIELD-TO-SOURCE MATRIX

Every field in the template is mapped to exactly which source fills it.  
**No field is left without a source. No source is left untapped.**

### 1.1 Personal Identity

| Field | Primary Source | Fallback | Extraction Method |
|-------|---------------|----------|-------------------|
| `fullName` | MyNeta affidavit | ECI results | HTML scrape `<title>` tag |
| `displayName` | Wikipedia first sentence | MyNeta short name | API + regex |
| `aliases` | Multi-election MyNeta names | Wikipedia redirects | Dedup across years |
| `gender` | MyNeta affidavit photo analysis + name DB | Wikipedia infobox `gender=` | Indian names gender DB (95% accuracy) + manual curation |
| `dob` | Wikipedia infobox `birth_date` | MyNeta age + election date (estimate) | MediaWiki API wikitext parse |
| `ageAtElection` | MyNeta `Age:` field | Computed from DOB + election date | Direct HTML scrape |
| `currentAge` | Computed from DOB | Computed from ageAtElection + years elapsed | `Date.now() - DOB` |
| `religion` | Wikipedia infobox `religion=` | N/A (optional field) | MediaWiki API |
| `caste` | ECI constituency reservation status | MyNeta constituency page | ECI master list |
| `maritalStatus` | MyNeta: presence of spouse data | Wikipedia infobox | If `Spouse Profession` exists → married |
| `spouseName` | MyNeta: spouse section | Wikipedia infobox `spouse=` | HTML parse |
| `dependents` | MyNeta: dependent ITR rows count | N/A | Count `dependent1`, `dependent2` etc. in HTML |
| `photoUrl` | MyNeta affidavit photo | PRS India MLA photo → Wikipedia thumbnail | Priority cascade |
| `photoSources` | All scrapers | — | Merged map |

### 1.2 Political Career

| Field | Primary Source | Fallback | Extraction Method |
|-------|---------------|----------|-------------------|
| `house` | Known (MLA/MP/MLC) | — | Configured per scrape run |
| `stateCode` | Configured | — | From config |
| `constituencyName` | MyNeta `<h5>` tag | ECI results | HTML scrape |
| `constituencyNumber` | ECI constituency master list | Seed data | Static JSON mapping |
| `constituencyType` | ECI master list (GEN/SC/ST) | Seed data | Static JSON mapping |
| `district` | MyNeta `(District)` in h5 | ECI master | HTML scrape |
| `currentParty` | MyNeta latest election | PRS India | Normalized via `utils.js` |
| `currentPartyFull` | MyNeta `Party:` field | PRS | Direct scrape |
| `previousParties` | **Cross-election diff** | Wikipedia | Compare party across MyNeta elections |
| `termsServed` | Count of won elections in history | PRS India | Computed |
| `firstElectedYear` | Earliest won election | Wikipedia | Min(winYears) |
| `isCurrentMember` | Latest election result = won | Legislature website | Check latest result |
| `isCabinetMinister` | **Wikipedia infobox** `office=` | Government gazette RSS | Wikitext parse |
| `ministerialPortfolio` | Wikipedia infobox `office=` | Gov press releases | Wikitext parse |
| `isChiefMinister` | Wikipedia + government websites | Known CM list (static) | Curated list + wiki |
| `isOppositionLeader` | Legislature website / Wikipedia | News monitor | Periodic check |
| `committeeMemberships` | PRS India profile page | Legislature website | Cheerio scrape |
| `specialPositions` | Legislature website / Wikipedia | News monitor | Curated + periodic |

### 1.3 Election History (per election)

| Field | Primary Source | Fallback | Extraction Method |
|-------|---------------|----------|-------------------|
| `electionYear` | MyNeta election key | — | Extract from key |
| `electionType` | Configured | — | assembly/lok_sabha/etc. |
| `electionKey` | MyNeta | — | Config |
| `constituencyName` | MyNeta candidate page | ECI results | Scrape |
| `constituencyNumber` | ECI master list | Seed data | Static mapping |
| `party` | MyNeta `Party:` | — | Normalized |
| `result` | MyNeta `(Winner)` tag | ECI results | Check presence |
| `votesReceived` | **ECI results PDF/CSV** | MyNeta constituency page | ECI data scrape |
| `evmVotes` | ECI detailed results | — | ECI portal CSV |
| `postalVotes` | ECI detailed results | — | ECI portal CSV |
| `voteShare` | Computed from votes/total | ECI results | `votesReceived / totalValidVotes * 100` |
| `margin` | **ECI results** | Seed data | `winnerVotes - runnerUpVotes` |
| `totalVoters` | ECI constituency stats | — | ECI data |
| `turnoutPercent` | ECI constituency stats | — | ECI data |
| `rank` | **MyNeta all-candidates page** | ECI results | Sort by votes, find position |
| `totalCandidates` | MyNeta constituency candidate count | ECI | Count all candidates |
| `runnerUp` / `runnerUpParty` / `runnerUpVotes` | **MyNeta all-candidates per constituency** | ECI results | Scrape all, sort, pick #2 |

### 1.4 Financial Disclosure (per election)

| Field | Primary Source | Extraction Method |
|-------|---------------|-------------------|
| `selfMovableAssets` | MyNeta `id=movable_assets` table → self row total | Sum self rows |
| `selfImmovableAssets` | MyNeta `id=immovable_assets` table → self row total | Sum self rows |
| `spouseMovableAssets` | MyNeta movable table → spouse rows total | Sum spouse rows |
| `spouseImmovableAssets` | MyNeta immovable table → spouse rows total | Sum spouse rows |
| `dependentsAssets` | MyNeta asset tables → dependent rows total | Sum dependent rows |
| `totalAssets` | Computed | Sum all above |
| `totalLiabilities` | MyNeta `Liabilities:` | Direct scrape |
| `netWorth` | Computed | `totalAssets - totalLiabilities` |
| `selfIncome` | MyNeta ITR table → self row | Parse ITR section |
| `spouseIncome` | MyNeta ITR table → spouse row | Parse ITR section |
| `totalIncome` | Computed | `selfIncome + spouseIncome` |
| `isCrorepati` | Computed | `totalAssets >= 1,00,00,000` |
| `wealthGrowth` | Computed | Compare across elections |
| `sourceUrl` | MyNeta candidate URL | Constructed |
| `affidavitFiledDate` | MyNeta page | Parse date field |

### 1.5 Criminal Record

| Field | Primary Source | Extraction Method |
|-------|---------------|-------------------|
| `hasCriminalCases` | MyNeta | `criminalCases > 0` |
| `totalCases` | MyNeta case table row count | Count `<tr>` in criminal section |
| `seriousCases` | MyNeta IPC filter | Filter IPC 302/307/376/420 etc. |
| `convictions` | MyNeta case status column | Count where status = 'convicted' |
| `caseDetails[].caseNo` | MyNeta `Case No.` column | Table cell parse |
| `caseDetails[].court` | MyNeta `Court` column | Table cell parse |
| `caseDetails[].ipcSections` | MyNeta `IPC Sections` column | Split by comma |
| `caseDetails[].otherActs` | MyNeta `Other Acts` column | Table cell parse |
| `caseDetails[].status` | MyNeta `Present Status` column | Parse status text |
| `caseDetails[].chargesFramed` | MyNeta `Charges Framed` column | Parse yes/no |
| `caseDetails[].cognizanceYear` | MyNeta `Date` column | Extract year |
| `caseDetails[].isSeriousIPC` | Computed | Check against serious IPC list |

### 1.6-1.12 Remaining Sections

| Section | Primary Source | Key Fields |
|---------|---------------|------------|
| **Education** | MyNeta (100%) | level, category, detail, profession, spouse profession |
| **Performance** | PRS India (MLAs), Sansad.in (MPs) | questions, debates, bills, attendance |
| **Constituency** | Census 2011 + ECI delimitation | population, area, literacy, SC/ST %, electors |
| **Dynasty** | Wikipedia family section + cross-ref | isDynast, family members, generation |
| **Key Dates** | Legislature sites, ECI, Wikipedia | oath, term start/end, timeline |
| **Insights** | All computed | red flags, ranks, trends |
| **Sources** | All scrapers | URLs, completeness, verification |

---

## 2. ENHANCED SCRAPER ARCHITECTURE

### 2.1 Scraper Hierarchy (8 layers)

```
Layer 1: myneta-deep-scraper.js     ← Full affidavit parse (spouse, deps, cases, ITR)
Layer 2: myneta-constituency.js     ← All candidates per constituency (key contestants)
Layer 3: prs-scraper.js             ← MLA/MP photos + legislative performance
Layer 4: wikipedia-enricher.js      ← DOB, gender, religion, minister status, dynasty
Layer 5: eci-master-data.js         ← Constituency master list (numbers, types, electors)
Layer 6: eci-results-scraper.js     ← Exact vote counts, turnout, all candidates
Layer 7: sansad-scraper.js          ← MP profiles (Puppeteer)
Layer 8: census-scraper.js          ← Demographics per constituency
```

### 2.2 Constituency Master List

Static JSON mapping every constituency across India:
```json
{
  "TS-AC-1": { "name": "Adilabad", "number": 1, "type": "st", "district": "Adilabad", "electors2023": 245000 },
  "TS-AC-2": { "name": "Boath", "number": 2, "type": "st", "district": "Adilabad", "electors2023": 232000 }
}
```
Source: ECI delimitation orders (PDF → parsed or manually transcribed once).

### 2.3 Gender Inference

Indian name-based gender detection:
1. Build a name→gender map from Wikipedia infoboxes (harvest `gender=` from all politician articles)
2. Use prefixes: `Smt.` / `Kumari` → female; `Shri` / `Sri` → male
3. MyNeta photo-based: photos with `images_candidate/` URLs → visual (future ML)
4. Manual curation list for ambiguous names

---

## 3. STORAGE ARCHITECTURE

### 3.1 Three-Tier Storage

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Supabase (PostgreSQL)  — Source of Truth           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  legislator_profiles        (master table)              │ │
│  │  legislator_elections       (one row per election)      │ │
│  │  legislator_finances        (one row per election)      │ │
│  │  legislator_criminal_cases  (one row per case)          │ │
│  │  legislator_performance     (one row per term)          │ │
│  │  legislator_events          (defections, deaths, etc.)  │ │
│  │  constituency_master        (static demographics)       │ │
│  │  scraper_runs               (audit trail)               │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │ pg_cron daily export
         ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 2: Static JSON Snapshots  — App Bundle                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  data/{STATE}-profiles.json   (per state, ~200KB each)  │ │
│  │  data/photo-map.json          (name → photo URL)        │ │
│  │  data/constituency-master.json (static reference)       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
         │ OTA update check on app open
         ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 3: Device Cache (AsyncStorage)  — Offline             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Cached profiles, last sync timestamp                   │ │
│  │  Diff-based incremental updates                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Supabase Migration: `012_legislator_profiles.sql`

```sql
-- Master legislator profiles
CREATE TABLE legislator_profiles (
  id TEXT PRIMARY KEY,                      -- MLA_TS_2023_KODANGAL_141
  full_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  gender TEXT NOT NULL DEFAULT 'male',
  dob DATE,
  photo_url TEXT,
  photo_sources JSONB DEFAULT '{}',
  religion TEXT,
  reservation_category TEXT,                -- general/sc/st
  marital_status TEXT,
  spouse_name TEXT,
  dependents INTEGER DEFAULT 0,

  -- Career
  house TEXT NOT NULL,                      -- state_assembly/lok_sabha/rajya_sabha/state_council
  state_code TEXT NOT NULL REFERENCES states(code),
  constituency_name TEXT NOT NULL,
  constituency_number INTEGER,
  constituency_type TEXT,
  district TEXT,
  current_party TEXT NOT NULL,
  current_party_full TEXT,
  previous_parties JSONB DEFAULT '[]',
  terms_served INTEGER DEFAULT 1,
  first_elected_year INTEGER,
  is_current_member BOOLEAN DEFAULT true,
  is_cabinet_minister BOOLEAN DEFAULT false,
  ministerial_portfolio TEXT,
  is_chief_minister BOOLEAN DEFAULT false,
  is_opposition_leader BOOLEAN DEFAULT false,
  committee_memberships TEXT[] DEFAULT '{}',
  special_positions TEXT[] DEFAULT '{}',

  -- Education
  education_level TEXT,
  education_category TEXT,
  education_detail TEXT,
  self_profession TEXT,
  spouse_profession TEXT,

  -- Performance
  questions_asked INTEGER DEFAULT 0,
  debates_participated INTEGER DEFAULT 0,
  private_member_bills INTEGER DEFAULT 0,
  attendance_percent NUMERIC(5,2) DEFAULT 0,
  performance_score NUMERIC(5,2) DEFAULT 0,

  -- Dynasty
  is_dynast BOOLEAN DEFAULT false,
  political_generation INTEGER DEFAULT 1,
  family_in_politics JSONB DEFAULT '[]',

  -- Computed
  data_completeness INTEGER DEFAULT 0,
  red_flags JSONB DEFAULT '[]',

  -- Sources
  myneta_url TEXT,
  prs_url TEXT,
  sansad_url TEXT,
  wikipedia_article TEXT,
  data_sources TEXT[] DEFAULT '{}',
  verification_status TEXT DEFAULT 'unverified',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_scraped_at TIMESTAMPTZ
);

-- Election history
CREATE TABLE legislator_elections (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT REFERENCES legislator_profiles(id),
  election_year INTEGER NOT NULL,
  election_type TEXT NOT NULL,
  election_key TEXT,
  constituency_name TEXT,
  party TEXT,
  result TEXT NOT NULL,                     -- won/lost/forfeited_deposit
  votes_received INTEGER DEFAULT 0,
  evm_votes INTEGER DEFAULT 0,
  postal_votes INTEGER DEFAULT 0,
  vote_share NUMERIC(5,2) DEFAULT 0,
  margin INTEGER DEFAULT 0,
  total_voters INTEGER DEFAULT 0,
  turnout_percent NUMERIC(5,2) DEFAULT 0,
  rank INTEGER DEFAULT 0,
  total_candidates INTEGER DEFAULT 0,
  runner_up TEXT,
  runner_up_party TEXT,
  runner_up_votes INTEGER DEFAULT 0,
  UNIQUE(legislator_id, election_year, constituency_name)
);

-- Financial history
CREATE TABLE legislator_finances (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT REFERENCES legislator_profiles(id),
  election_year INTEGER NOT NULL,
  self_movable_assets BIGINT DEFAULT 0,
  self_immovable_assets BIGINT DEFAULT 0,
  spouse_movable_assets BIGINT DEFAULT 0,
  spouse_immovable_assets BIGINT DEFAULT 0,
  dependents_assets BIGINT DEFAULT 0,
  total_assets BIGINT GENERATED ALWAYS AS (
    self_movable_assets + self_immovable_assets +
    spouse_movable_assets + spouse_immovable_assets + dependents_assets
  ) STORED,
  total_liabilities BIGINT DEFAULT 0,
  self_income BIGINT DEFAULT 0,
  spouse_income BIGINT DEFAULT 0,
  source_url TEXT,
  affidavit_filed_date DATE,
  UNIQUE(legislator_id, election_year)
);

-- Criminal cases
CREATE TABLE legislator_criminal_cases (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT REFERENCES legislator_profiles(id),
  case_no TEXT,
  fir_no TEXT,
  court TEXT,
  ipc_sections TEXT[] DEFAULT '{}',
  other_acts TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  charges_framed BOOLEAN DEFAULT false,
  cognizance_date DATE,
  description TEXT,
  is_serious BOOLEAN DEFAULT false
);

-- Live events (defections, deaths, appointments)
CREATE TABLE legislator_events (
  id SERIAL PRIMARY KEY,
  legislator_id TEXT REFERENCES legislator_profiles(id),
  event_type TEXT NOT NULL,                 -- defection/death/appointment/resignation/disqualification/arrest/acquittal
  event_date DATE NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT,                           -- e.g. old party
  new_value TEXT,                           -- e.g. new party
  source_url TEXT,
  detected_by TEXT,                         -- 'scraper'/'manual'/'news_monitor'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scraper audit trail
CREATE TABLE scraper_runs (
  id SERIAL PRIMARY KEY,
  scraper_name TEXT NOT NULL,
  state_code TEXT,
  election_key TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  records_scraped INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running',            -- running/completed/failed
  log TEXT
);
```

---

## 4. PERIODIC UPDATE SYSTEM

### 4.1 Update Triggers & Frequencies

| Event Type | Detection Method | Frequency | Action |
|------------|-----------------|-----------|--------|
| **Election results** | MyNeta new election key appears | On election | Full scrape of new election |
| **By-election** | ECI schedule monitor | Weekly check | Scrape by-election results |
| **Defection / Party change** | Wikipedia edit monitor + news RSS | Daily | Update `currentParty`, add to `previousParties`, create event |
| **Death** | Wikipedia edit monitor + news RSS | Daily | Set `isCurrentMember=false`, create event |
| **New ministry** | Government gazette RSS + Wikipedia | Weekly | Update `isCabinetMinister`, `ministerialPortfolio` |
| **Court verdict** | IndiaKanoon RSS + news | Weekly | Update case status in `legislator_criminal_cases` |
| **New session data** | PRS India session pages | After each session | Update attendance, questions, debates |
| **Resignation** | News + legislature website | Daily | Set `isCurrentMember=false`, create event |
| **Disqualification** | ECI notifications + news | Daily | Set `isCurrentMember=false`, create event |
| **Asset re-declaration** | MyNeta (annual for some) | Monthly | Update financial record |

### 4.2 Monitor Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  CRON SCHEDULER (GitHub Actions / Supabase Edge Functions)   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Every 6 hours:  news-monitor.js                             │
│    → Scans Google News RSS for "[politician name] defect*",  │
│      "[politician name] died", "[politician name] resign*"   │
│    → Scans Wikipedia Recent Changes for politician articles  │
│    → Creates events in legislator_events                     │
│                                                              │
│  Daily (2 AM):  wiki-change-detector.js                      │
│    → Checks Wikipedia revision timestamps for all profiles   │
│    → If changed: re-scrape DOB, office, party, status        │
│    → Updates affected legislator_profiles                    │
│                                                              │
│  Weekly (Sunday 3 AM):  full-refresh.js                      │
│    → PRS India: re-scrape performance for current term       │
│    → Sansad.in: re-scrape MP committee data                  │
│    → Government websites: check for new ministry changes     │
│                                                              │
│  On-demand:  election-scraper.js                             │
│    → Triggered manually when new election results available  │
│    → Full MyNeta deep scrape for new election                │
│    → ECI results for vote counts                             │
│                                                              │
│  Monthly (1st, 4 AM):  completeness-audit.js                 │
│    → Scans all profiles for empty fields                     │
│    → Generates priority list for manual curation             │
│    → Emails report to team                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Change Detection & Propagation

```
Scraper detects change
        │
        ▼
Write to Supabase legislator_profiles + legislator_events
        │
        ▼
Supabase Realtime broadcasts change
        │
        ├──→ Re-export static JSON snapshot
        │
        ├──→ Mobile app receives push notification
        │     "Revanth Reddy changed party from INC to..."
        │
        └──→ Audit log in scraper_runs
```

---

## 5. DATA COMPLETENESS ENFORCEMENT

### 5.1 Mandatory vs Optional Fields

**MANDATORY (must be filled for every legislator, every state):**
- fullName, gender, ageAtElection, house, stateCode, constituencyName
- currentParty, electionHistory (≥1), photoUrl, education, profession
- At least 1 financial record, criminal case count, totalAssets

**BEST-EFFORT (fill from automated sources, curate gaps):**
- dob, religion, maritalStatus, spouseName, dependents
- displayName, aliases, district, constituencyNumber, constituencyType
- previousParties, termsServed, committeeMemberships
- performance metrics, constituency demographics, dynasty info

**COMPUTED (never empty if inputs exist):**
- currentAge, netWorth, isCrorepati, wealthGrowth, voteShare
- dataCompleteness, redFlags, ranks, trends

### 5.2 Gap-Filling Strategies

| Gap | Automated Fix | Manual Fix |
|-----|--------------|------------|
| Missing DOB | Wikipedia infobox scrape | Research team enters from party bio |
| Missing gender | Name prefix analysis + photo heuristic | Manual flag |
| Missing constituency number | ECI delimitation PDF mapping | One-time transcription |
| Missing vote counts | ECI results archive + GitHub datasets | State EC website |
| Missing performance data | PRS India scrape | Legislature website manual check |
| Missing dynasty info | Wikipedia family section + surname match | Journalist curation |
| Missing constituency demographics | Census 2011 dataset | data.gov.in bulk |

### 5.3 Completeness Score Calculation

```
Weight distribution:
  fullName:           5%    (always present)
  dob:               10%    (Wikipedia)
  gender:             3%    (inferred)
  photoUrl:           8%    (MyNeta/PRS)
  constituency:       5%    (always present)
  party:              5%    (always present)
  electionHistory:   15%    (MyNeta + ECI)
  financialHistory:  15%    (MyNeta deep scrape)
  criminalRecord:    10%    (MyNeta)
  education:          5%    (MyNeta)
  performance:       10%    (PRS India)
  sources:            4%    (always present)
  dynasty:            5%    (Wikipedia)
                    ─────
  TOTAL:            100%
```

---

## 6. UNIFORMITY ENFORCEMENT ACROSS ALL STATES

### 6.1 Same Scraper, Same Schema, Every State

The `config.js` file defines ALL 31 states/UTs with their MyNeta keys.  
Every scraper loops over the same state list → outputs the same JSON schema.

### 6.2 State-Specific Edge Cases

| State | Edge Case | Handling |
|-------|-----------|----------|
| Jammu & Kashmir | New UT, first assembly 2024 | Only `JammuAndKashmir2024` key |
| Telangana | Split from AP in 2014 | Pre-2014 elections under AP keys |
| Andhra Pradesh | Lost seats to TS | Pre/post bifurcation separate keys |
| Bihar | MLC exists (Legislative Council) | Separate MLC scrape run |
| UP, Karnataka, Maharashtra | MLC exists | Separate MLC scrape run |
| Delhi | UT with assembly | Treated same as state |
| Puducherry | UT with assembly | Treated same as state |
| Northeast states | Smaller assemblies | Same scraper, fewer records |

### 6.3 Quality Gates

Before any data enters Tier 1 (Supabase):
1. **Schema validation**: Every record must pass `LegislatorProfile` type check
2. **Name sanity**: fullName must be 3+ characters, no HTML tags
3. **Asset sanity**: totalAssets must be non-negative integer
4. **Age sanity**: ageAtElection must be 25-100
5. **Party normalization**: Must match known party abbreviations
6. **Photo validation**: URL must return 200 and be JPEG/PNG (HEAD check)
7. **Deduplication**: Same person across elections must be merged (fuzzy name match)

---

## 7. IMPLEMENTATION PRIORITY

### Phase 1: Deep MyNeta (fills 70% of fields) — THIS WEEK
- Enhanced parser: spouse assets, dependent assets, ITR income, full criminal table
- All-candidates-per-constituency scrape (key contestants + runner-up data)
- Run for all 31 states × latest election

### Phase 2: Enrichment (fills to 85%) — NEXT WEEK
- Wikipedia enricher: DOB, gender, religion, minister status, dynasty
- ECI master data: constituency numbers, types, electors
- PRS scrape for legislative performance
- Gender inference engine

### Phase 3: Full Coverage (fills to 95%) — WEEK 3
- Census demographics per constituency
- Sansad.in for MP committee data
- Legislature website scrapes for oath dates, session data
- Manual curation queue for remaining 5%

### Phase 4: Live Updates (perpetual) — WEEK 4+
- News monitor daemon
- Wikipedia change detector
- Monthly completeness audit
- Push notification integration for changes

---

## 8. MONITORING DASHBOARD

Track health of the entire data pipeline:

```
┌────────────────────────────────────────────────────────┐
│  KSHETRA DATA HEALTH DASHBOARD                         │
├────────────────────────────────────────────────────────┤
│  Total Profiles: 4,847 across 31 states                │
│  Avg Completeness: 87%                                 │
│                                                        │
│  ■■■■■■■■■■░░ Telangana    107 profiles  92%           │
│  ■■■■■■■■░░░░ Andhra       175 profiles  84%           │
│  ■■■■■■■░░░░░ Karnataka    224 profiles  78%           │
│  ...                                                   │
│                                                        │
│  Fields with lowest coverage:                          │
│  - DOB:           45% (need more Wikipedia scraping)   │
│  - Performance:   30% (PRS only covers current term)   │
│  - Dynasty:       15% (requires manual curation)       │
│  - Religion:      20% (Wikipedia only)                 │
│                                                        │
│  Last scraper run: 2 hours ago (myneta-deep)           │
│  Next scheduled:   wiki-change-detector in 4 hours     │
│  Events this week: 3 defections, 1 appointment         │
└────────────────────────────────────────────────────────┘
```
