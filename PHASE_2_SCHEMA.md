# Phase 2: SQLite Schema Design

## Overview
Convert 7.45 MB of bundled seed data (.ts files) into a prebuilt SQLite database. Lazy-load per state to avoid bundling all data. Preserve synchronous adapter APIs via in-memory cache.

## Schema

### Core Tables

#### `constituencies`
Unified constituency metadata (used by all states).
```sql
CREATE TABLE constituencies (
  id TEXT PRIMARY KEY,           -- "{stateCode}-AC-{acNo}"
  state_code TEXT NOT NULL,      -- 'TS', 'AP', 'KA', etc.
  ac_no INTEGER NOT NULL,        -- Assembly constituency number
  name TEXT NOT NULL,            -- Constituency name
  district TEXT,                 -- District name
  type TEXT,                     -- 'GEN', 'SC', 'ST'
  winner_party TEXT,             -- Winning party (latest election)
  winner_name TEXT,              -- Winner name (latest election)
  winner_votes INTEGER,          -- Winner votes
  runner_up TEXT,                -- Runner-up name
  margin INTEGER,                -- Victory margin
  current_party TEXT,            -- Current party (post-defections)
  election_year INTEGER,         -- Year of latest election
  UNIQUE(state_code, ac_no)
);
```

#### `mla_profiles`
MLA biographical and financial data.
```sql
CREATE TABLE mla_profiles (
  id TEXT PRIMARY KEY,           -- "{stateCode}-MLA-{acNo}"
  state_code TEXT NOT NULL,
  ac_no INTEGER NOT NULL,
  name TEXT,
  party TEXT,
  gender TEXT,                   -- 'M', 'F'
  terms_served INTEGER,
  age INTEGER,
  dob TEXT,                      -- ISO date
  dob_estimated BOOLEAN,
  education TEXT,
  profession TEXT,
  criminal_cases INTEGER,
  total_assets REAL,
  total_liabilities REAL,
  marital_status TEXT,
  photo_url TEXT,
  constituency_name TEXT,
  district TEXT,
  source_url TEXT,
  UNIQUE(state_code, ac_no)
);
```

#### `demographics`
Constituency demographic data.
```sql
CREATE TABLE demographics (
  id TEXT PRIMARY KEY,           -- "{stateCode}-DEMO-{acNo}"
  state_code TEXT NOT NULL,
  ac_no INTEGER NOT NULL,
  population INTEGER,
  total_voters INTEGER,
  turnout_2023 REAL,
  male_voters INTEGER,
  female_voters INTEGER,
  literacy REAL,
  urban_percent REAL,
  sc_percent REAL,
  st_percent REAL,
  area_sq_km REAL,
  UNIQUE(state_code, ac_no)
);
```

#### `historical_results`
Per-constituency historical election results.
```sql
CREATE TABLE historical_results (
  id TEXT PRIMARY KEY,           -- "{stateCode}-HIST-{acNo}-{year}"
  state_code TEXT NOT NULL,
  ac_no INTEGER NOT NULL,
  year INTEGER NOT NULL,         -- Election year
  winner TEXT,
  party TEXT,
  UNIQUE(state_code, ac_no, year)
);
```

#### `political_timeline`
Per-constituency political events (defections, deaths, by-elections, etc.).
```sql
CREATE TABLE political_timeline (
  id TEXT PRIMARY KEY,           -- Unique event ID
  state_code TEXT NOT NULL,
  ac_no INTEGER,                 -- NULL for state-level events
  date TEXT,                     -- ISO date
  assembly INTEGER,              -- 1 for assembly, 0 for lok sabha
  event_type TEXT,               -- 'DEFECTION', 'DEATH_IN_OFFICE', 'BY_ELECTION', etc.
  member_names TEXT,             -- JSON array of names
  debit_party TEXT,              -- Party losing seat
  credit_party TEXT,             -- Party gaining seat
  seats INTEGER,
  explanation TEXT,
  details TEXT,
  legal_status TEXT,
  verified BOOLEAN,
  UNIQUE(id)
);
```

#### `election_history`
State-level election results (assembly-wide).
```sql
CREATE TABLE election_history (
  id TEXT PRIMARY KEY,           -- "{stateCode}-ELEC-{year}"
  state_code TEXT NOT NULL,
  year INTEGER NOT NULL,
  type TEXT,                     -- 'assembly'
  total_seats INTEGER,
  ruling_party TEXT,
  notes TEXT,
  UNIQUE(state_code, year)
);
```

#### `election_history_results`
Party-wise results for each election (normalized from Record-based format).
```sql
CREATE TABLE election_history_results (
  id TEXT PRIMARY KEY,           -- "{stateCode}-ELEC-{year}-{party}"
  election_id TEXT NOT NULL,     -- FK to election_history.id
  party TEXT NOT NULL,
  seats_won INTEGER,
  seats_contested INTEGER,
  FOREIGN KEY(election_id) REFERENCES election_history(id)
);
```

### Metadata Table

#### `seed_manifest`
Version and state coverage metadata.
```sql
CREATE TABLE seed_manifest (
  state_code TEXT PRIMARY KEY,
  version TEXT,                  -- Content hash (e.g., "abc123def456")
  has_mla_profiles BOOLEAN,
  has_demographics BOOLEAN,
  has_historical_results BOOLEAN,
  has_political_timeline BOOLEAN,
  has_election_history BOOLEAN,
  constituency_count INTEGER,
  last_updated TEXT              -- ISO timestamp
);
```

## Indexes

```sql
CREATE INDEX idx_constituencies_state ON constituencies(state_code);
CREATE INDEX idx_mla_profiles_state ON mla_profiles(state_code);
CREATE INDEX idx_demographics_state ON demographics(state_code);
CREATE INDEX idx_historical_results_state_year ON historical_results(state_code, year);
CREATE INDEX idx_political_timeline_state_ac ON political_timeline(state_code, ac_no);
CREATE INDEX idx_election_history_state ON election_history(state_code);
```

## Size Estimates

| Table | Rows | Size (MB) |
|-------|------|-----------|
| constituencies | ~4,500 | 0.5 |
| mla_profiles | ~4,500 | 3.5 |
| demographics | ~4,500 | 0.8 |
| historical_results | ~9,000 | 0.4 |
| political_timeline | ~2,000 | 0.5 |
| election_history | ~150 | 0.05 |
| election_history_results | ~1,500 | 0.1 |
| **Total** | | **~5.8 MB** |

**Compression**: SQLite with default settings achieves ~70% compression on text data.
- Uncompressed: ~5.8 MB
- Gzipped: ~1.7 MB (wire size)

## Loading Strategy

### Phase 2a: Prebuilt Database
- Build script generates `seed-data.db` (5.8 MB uncompressed)
- Embed in `apps/mobile/data/seed-data.db`
- Bundled with app (unavoidable for first load)

### Phase 2b: Lazy Per-State Loading
- On first access to state data, check in-memory cache
- If not cached, load from bundled DB into memory
- Cache persists for session lifetime
- Subsequent accesses are instant (in-memory)

### Phase 2c: Future Optimization (Phase 4+)
- Stream state-specific SQLite dumps from API (like GeoJSON)
- Replace bundled DB with API-streamed per-state SQLite files
- Reduces initial bundle by ~5.8 MB

## Backward Compatibility

All existing APIs remain synchronous:
- `getMLAProfileForState(stateCode, acNo)` → queries in-memory cache
- `getDemographicsForState(stateCode, acNo)` → queries in-memory cache
- `getHistoryForState(stateCode, acNo)` → queries in-memory cache
- `getTimelineForState(stateCode, acNo)` → queries in-memory cache
- `getElectionHistoryForState(stateCode)` → queries in-memory cache

No UI changes required. Lazy loading is transparent.

## Implementation Steps

1. **Phase 2a**: Design schema (this document)
2. **Phase 2b**: Build script to convert seed .ts → SQLite
3. **Phase 2c**: Mobile `seedDataLoader` module (DB init + in-memory cache)
4. **Phase 2d**: Refactor `stateDataDispatcher` to use SQLite queries
5. **Phase 2e**: Verify bundle size reduction (~7.5 MB)
