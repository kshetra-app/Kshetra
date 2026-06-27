-- ============================================================================
-- 022: Administrative Hierarchy Framework
-- ============================================================================
-- Booth → Gram Panchayat → Mandal → Constituency → District → State
--
-- This migration builds the sub-constituency data layer that powers
-- booth-level election analytics, local body election tracking, and
-- the many-to-many mandal↔constituency mapping that reflects India's
-- real administrative geography.
--
-- Key design decisions:
--   • Mandal boundaries do NOT align with constituency boundaries.
--     A single mandal can span multiple ACs, and a single AC can
--     contain parts of multiple mandals. We model this via
--     `mandal_constituency_map` (M:N junction table).
--   • Booths ALWAYS belong to exactly one constituency (ECI rule).
--   • The `type` column on mandals handles regional terminology:
--     TS/AP → mandal, UP/Bihar → block/tehsil, TN → taluk, etc.
--   • Revenue villages are the Census 2011 atomic unit, mapped to
--     panchayats. A panchayat may contain 1–N revenue villages.
--   • Local body elections (sarpanch, ZPTC, MPTC) are tracked at
--     panchayat level, separate from assembly/parliament elections.
--
-- Dependencies: 001_initial_schema.sql (states, constituencies, elections)
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. MANDALS (Block / Mandal / Tehsil / Taluk / Circle)                ║
-- ║     The intermediate administrative unit between district and village. ║
-- ║     Different Indian states use different names for this level.        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mandals (
  -- Composite ID: <state_code>-MDL-<lgd_code>  e.g. 'TS-MDL-501'
  id          TEXT PRIMARY KEY,

  -- Display names
  name        TEXT NOT NULL,
  local_name  TEXT,                             -- Telugu/Hindi/Tamil script name

  -- Parent references
  state_code  TEXT NOT NULL REFERENCES states(code),
  district    TEXT NOT NULL,                    -- District name (denormalized for query speed)

  -- Government directory code (unique within a state)
  lgd_code    INTEGER,

  -- Regional terminology for this administrative level
  type        TEXT NOT NULL DEFAULT 'mandal'
              CHECK (type IN ('mandal', 'block', 'tehsil', 'taluk', 'circle')),

  -- Metadata
  headquarters    TEXT,                         -- Name of the HQ town/village
  area_sq_km      NUMERIC(10, 2),              -- Total geographic area
  population_2011 INTEGER,                     -- Census 2011 population

  -- Spatial data (EPSG:4326 = WGS84, standard for India Survey/ECI data)
  centroid    GEOMETRY(Point, 4326),
  boundary    GEOMETRY(MultiPolygon, 4326),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  mandals IS 'Block/Mandal/Tehsil/Taluk — intermediate admin unit between district and village. Different states use different terminology.';
COMMENT ON COLUMN mandals.id IS 'Format: <state_code>-MDL-<lgd_code>, e.g. TS-MDL-501';
COMMENT ON COLUMN mandals.lgd_code IS 'Local Government Directory code — unique within a state, assigned by MoPR';
COMMENT ON COLUMN mandals.type IS 'State-specific terminology: mandal (TS/AP), block (UP/Bihar), tehsil (Raj/MP), taluk (TN/KA), circle (NE)';

-- Indexes: query patterns are by state+district, by lgd_code, and spatial
CREATE INDEX IF NOT EXISTS idx_mandals_state_code      ON mandals(state_code);
CREATE INDEX IF NOT EXISTS idx_mandals_state_district   ON mandals(state_code, district);
CREATE INDEX IF NOT EXISTS idx_mandals_lgd_code         ON mandals(lgd_code);
CREATE INDEX IF NOT EXISTS idx_mandals_centroid         ON mandals USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_mandals_boundary         ON mandals USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. GRAM PANCHAYATS (Village / Urban Local Body)                      ║
-- ║     The lowest elected government body. Includes rural panchayats,    ║
-- ║     nagar panchayats, municipalities, and municipal corporations.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS gram_panchayats (
  -- Composite ID: <state_code>-GP-<lgd_code>  e.g. 'TS-GP-50101'
  id          TEXT PRIMARY KEY,

  -- Display names
  name        TEXT NOT NULL,
  local_name  TEXT,

  -- Parent references
  mandal_id   TEXT NOT NULL REFERENCES mandals(id),
  state_code  TEXT NOT NULL REFERENCES states(code),

  -- Government directory code
  lgd_code    INTEGER,

  -- Body type — rural vs urban distinction matters for election rules
  type        TEXT NOT NULL DEFAULT 'gram_panchayat'
              CHECK (type IN (
                'gram_panchayat',        -- Rural village panchayat
                'village_panchayat',     -- Some states use this term
                'nagar_panchayat',       -- Small urban body
                'municipality',          -- Medium urban body
                'corporation',           -- Large city (e.g. GHMC)
                'cantonment'             -- Military cantonment board
              )),

  -- Demographics
  population_2011   INTEGER,
  total_households  INTEGER,
  total_voters      INTEGER,                  -- Latest electoral roll count

  -- Geography
  area_sq_km  NUMERIC(10, 2),
  centroid    GEOMETRY(Point, 4326),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  gram_panchayats IS 'Village-level elected body. Includes rural GPs, nagar panchayats, municipalities, and corporations.';
COMMENT ON COLUMN gram_panchayats.type IS 'Body type determines election rules: GP has sarpanch election, municipality has councillor wards, etc.';
COMMENT ON COLUMN gram_panchayats.total_voters IS 'Latest voter count from the most recent electoral roll (may differ from Census 2011 population).';

CREATE INDEX IF NOT EXISTS idx_gram_panchayats_mandal      ON gram_panchayats(mandal_id);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_state_code   ON gram_panchayats(state_code);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_lgd_code     ON gram_panchayats(lgd_code);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_type         ON gram_panchayats(type);
CREATE INDEX IF NOT EXISTS idx_gram_panchayats_centroid     ON gram_panchayats USING GIST(centroid);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. REVENUE VILLAGES (Census village → panchayat mapping)             ║
-- ║     Census 2011 atomic unit. Multiple revenue villages may belong to  ║
-- ║     a single gram panchayat. Provides the bridge between census data  ║
-- ║     and the electoral/panchayat hierarchy.                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS revenue_villages (
  -- Composite ID: <state_code>-RV-<census_code>  e.g. 'TS-RV-581452'
  id           TEXT PRIMARY KEY,

  -- Display names
  name         TEXT NOT NULL,
  local_name   TEXT,

  -- Parent references
  panchayat_id TEXT REFERENCES gram_panchayats(id),  -- Nullable: some uninhabited villages have no GP
  mandal_id    TEXT NOT NULL REFERENCES mandals(id),
  state_code   TEXT NOT NULL REFERENCES states(code),

  -- Census & LGD codes for cross-referencing govt datasets
  census_code  TEXT,                            -- Census 2011 village code
  lgd_code     INTEGER,                         -- LGD village code

  -- Demographics
  population_2011 INTEGER,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  revenue_villages IS 'Census 2011 village-level unit. Maps to gram_panchayats. Some uninhabited villages may not belong to any GP.';
COMMENT ON COLUMN revenue_villages.census_code IS 'Census of India 2011 village/town code for cross-referencing demographic datasets.';

CREATE INDEX IF NOT EXISTS idx_revenue_villages_panchayat  ON revenue_villages(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_mandal     ON revenue_villages(mandal_id);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_state_code ON revenue_villages(state_code);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_census     ON revenue_villages(census_code);
CREATE INDEX IF NOT EXISTS idx_revenue_villages_lgd_code   ON revenue_villages(lgd_code);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. POLLING BOOTHS (Atomic electoral unit)                            ║
-- ║     ~1000-1500 voters per booth. Each booth belongs to exactly one    ║
-- ║     assembly constituency — this is the ECI's fundamental unit for   ║
-- ║     conducting elections.                                             ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS polling_booths (
  -- Composite ID: <constituency_id>-B<booth_number>  e.g. 'TS-AC1-B001'
  id                       TEXT PRIMARY KEY,

  -- Booth identification
  booth_number             INTEGER NOT NULL,
  booth_name               TEXT NOT NULL,          -- Official booth name from ECI
  polling_station_name     TEXT,                   -- Physical building name (e.g. 'Govt Primary School')
  polling_station_address  TEXT,                   -- Full address of the building

  -- Parent references — booth ALWAYS belongs to exactly one AC
  constituency_id          TEXT NOT NULL REFERENCES constituencies(id),
  panchayat_id             TEXT REFERENCES gram_panchayats(id),   -- Nullable for urban booths
  mandal_id                TEXT REFERENCES mandals(id),
  state_code               TEXT NOT NULL REFERENCES states(code),

  -- Voter demographics from latest electoral roll
  total_voters             INTEGER NOT NULL DEFAULT 0,
  male_voters              INTEGER NOT NULL DEFAULT 0,
  female_voters            INTEGER NOT NULL DEFAULT 0,
  third_gender_voters      INTEGER NOT NULL DEFAULT 0,

  -- Auxiliary booths are created when voter count exceeds capacity
  is_auxiliary             BOOLEAN NOT NULL DEFAULT FALSE,

  -- Spatial: GPS location of the polling station building
  location                 GEOMETRY(Point, 4326),

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ECI guarantees booth numbers are unique within a constituency
  UNIQUE(constituency_id, booth_number)
);

COMMENT ON TABLE  polling_booths IS 'ECI polling booth — the atomic unit of Indian elections. ~1000-1500 voters. Always belongs to exactly one AC.';
COMMENT ON COLUMN polling_booths.is_auxiliary IS 'TRUE if this is an auxiliary booth split from a parent booth due to voter count exceeding capacity.';
COMMENT ON COLUMN polling_booths.panchayat_id IS 'NULL for urban booths that fall under a municipality/corporation rather than a gram panchayat.';

CREATE INDEX IF NOT EXISTS idx_polling_booths_constituency ON polling_booths(constituency_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_panchayat    ON polling_booths(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_mandal       ON polling_booths(mandal_id);
CREATE INDEX IF NOT EXISTS idx_polling_booths_state_code   ON polling_booths(state_code);
CREATE INDEX IF NOT EXISTS idx_polling_booths_location     ON polling_booths USING GIST(location);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. MANDAL ↔ CONSTITUENCY MAP (Many-to-Many junction)                ║
-- ║     Mandal boundaries predate delimitation; constituency boundaries   ║
-- ║     were drawn later. A mandal can span 2-3 ACs and an AC can        ║
-- ║     contain parts of 3-8 mandals.                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mandal_constituency_map (
  id                  SERIAL PRIMARY KEY,

  -- The two sides of the M:N relationship
  mandal_id           TEXT NOT NULL REFERENCES mandals(id),
  constituency_id     TEXT NOT NULL REFERENCES constituencies(id),

  -- How much of this mandal falls within this constituency?
  overlap_type        TEXT NOT NULL DEFAULT 'full'
                      CHECK (overlap_type IN ('full', 'partial')),
  overlap_percentage  NUMERIC(5, 2),            -- % of mandal's population/area in this AC

  -- Denormalized counts for fast dashboard queries
  panchayats_in_ac    INTEGER NOT NULL DEFAULT 0,   -- # of panchayats from this mandal in this AC
  voters_in_ac        INTEGER NOT NULL DEFAULT 0,   -- Total voters from this mandal in this AC

  UNIQUE(mandal_id, constituency_id)
);

COMMENT ON TABLE  mandal_constituency_map IS 'Many-to-many: mandal boundaries do not align with constituency boundaries. Tracks overlap details.';
COMMENT ON COLUMN mandal_constituency_map.overlap_type IS '''full'' = entire mandal is within one AC; ''partial'' = mandal is split across multiple ACs.';
COMMENT ON COLUMN mandal_constituency_map.overlap_percentage IS 'Approximate percentage of the mandal''s population/area that falls within this constituency.';

CREATE INDEX IF NOT EXISTS idx_mandal_constituency_mandal        ON mandal_constituency_map(mandal_id);
CREATE INDEX IF NOT EXISTS idx_mandal_constituency_constituency   ON mandal_constituency_map(constituency_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. BOOTH ELECTION RESULTS (Per-booth aggregate for one election)     ║
-- ║     Stores the booth-level turnout and vote summary for each          ║
-- ║     assembly/parliament election. Links to booth_candidate_votes      ║
-- ║     for per-candidate breakdowns.                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS booth_election_results (
  id                      SERIAL PRIMARY KEY,

  -- References
  booth_id                TEXT NOT NULL REFERENCES polling_booths(id),
  election_id             INTEGER NOT NULL REFERENCES elections(id),
  constituency_id         TEXT NOT NULL REFERENCES constituencies(id),

  -- Turnout data
  total_voters_in_roll    INTEGER NOT NULL DEFAULT 0,   -- Voters in electoral roll for this booth
  votes_polled            INTEGER NOT NULL DEFAULT 0,   -- Total votes cast (EVM + postal)
  valid_votes             INTEGER NOT NULL DEFAULT 0,   -- votes_polled - rejected_votes
  rejected_votes          INTEGER NOT NULL DEFAULT 0,   -- NOTA + invalid ballots
  nota_votes              INTEGER NOT NULL DEFAULT 0,   -- NOTA specifically

  -- Derived (stored for query performance, validated by trigger)
  turnout_percent         NUMERIC(5, 2) NOT NULL DEFAULT 0,

  UNIQUE(booth_id, election_id)
);

COMMENT ON TABLE  booth_election_results IS 'Booth-level election result summary: turnout, valid votes, rejected votes. One row per booth per election.';
COMMENT ON COLUMN booth_election_results.rejected_votes IS 'Includes NOTA votes + invalid/rejected ballots. nota_votes is a subset of this.';
COMMENT ON COLUMN booth_election_results.turnout_percent IS 'Derived: (votes_polled / total_voters_in_roll) * 100. Validated by trigger to ensure consistency.';

CREATE INDEX IF NOT EXISTS idx_booth_results_booth          ON booth_election_results(booth_id);
CREATE INDEX IF NOT EXISTS idx_booth_results_election       ON booth_election_results(election_id);
CREATE INDEX IF NOT EXISTS idx_booth_results_constituency   ON booth_election_results(constituency_id);
CREATE INDEX IF NOT EXISTS idx_booth_results_election_const ON booth_election_results(election_id, constituency_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. BOOTH CANDIDATE VOTES (Per-candidate, per-booth)                  ║
-- ║     The most granular election data: how many votes each candidate    ║
-- ║     received at each booth. Aggregating these MUST match the          ║
-- ║     constituency-level totals.                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS booth_candidate_votes (
  id                SERIAL PRIMARY KEY,

  -- Parent reference
  booth_result_id   INTEGER NOT NULL REFERENCES booth_election_results(id) ON DELETE CASCADE,

  -- Candidate info
  candidate_name    TEXT NOT NULL,
  party             TEXT NOT NULL,

  -- Vote count at this booth
  votes             INTEGER NOT NULL DEFAULT 0,

  -- Did this candidate get the most votes at THIS specific booth?
  is_winner         BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE(booth_result_id, candidate_name)
);

COMMENT ON TABLE  booth_candidate_votes IS 'Per-candidate vote count at each booth. SUM(votes) across booths must match constituency-level totals.';
COMMENT ON COLUMN booth_candidate_votes.is_winner IS 'TRUE if this candidate received the highest votes at this specific booth (booth-level winner, not constituency winner).';

CREATE INDEX IF NOT EXISTS idx_booth_candidate_result  ON booth_candidate_votes(booth_result_id);
CREATE INDEX IF NOT EXISTS idx_booth_candidate_party   ON booth_candidate_votes(party);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. LOCAL BODY ELECTIONS (Panchayat / Municipal / ZPTC / MPTC)       ║
-- ║     Separate election cycle from assembly elections. Sarpanch         ║
-- ║     elections are at GP level; ward-member elections are per-ward.    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS local_body_elections (
  id                SERIAL PRIMARY KEY,

  -- Which panchayat/municipality is this election for?
  panchayat_id      TEXT NOT NULL REFERENCES gram_panchayats(id),
  state_code        TEXT NOT NULL REFERENCES states(code),

  -- Election details
  election_year     INTEGER NOT NULL,
  election_type     TEXT NOT NULL
                    CHECK (election_type IN (
                      'sarpanch',        -- Village head
                      'ward_member',     -- Ward-level councillor
                      'municipality',    -- Municipal councillor
                      'zptc',            -- Zilla Parishad Territorial Constituency
                      'mptc',            -- Mandal Parishad Territorial Constituency
                      'corporation'      -- Municipal corporation councillor
                    )),

  -- For ward-level elections only; NULL for sarpanch (GP-wide) elections
  ward_number       INTEGER,

  -- Turnout
  total_voters      INTEGER NOT NULL DEFAULT 0,
  votes_polled      INTEGER NOT NULL DEFAULT 0,
  turnout_percent   NUMERIC(5, 2) NOT NULL DEFAULT 0,

  -- Result status
  result_status     TEXT NOT NULL DEFAULT 'declared'
                    CHECK (result_status IN ('declared', 'pending', 'disputed', 'unanimous')),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index (not a table constraint): expression-based uniqueness with
-- COALESCE handles NULL ward_number for sarpanch/GP-wide elections.
-- Postgres UNIQUE table constraints cannot contain expressions.
CREATE UNIQUE INDEX IF NOT EXISTS uq_local_body_elections
  ON local_body_elections (panchayat_id, election_year, election_type, COALESCE(ward_number, 0));

COMMENT ON TABLE  local_body_elections IS 'Panchayat and municipal elections — separate cycle from assembly/parliament elections.';
COMMENT ON COLUMN local_body_elections.ward_number IS 'NULL for sarpanch/GP-wide elections; set for ward_member/municipality/corporation elections.';
COMMENT ON COLUMN local_body_elections.result_status IS '''unanimous'' = won uncontested (common in village sarpanch elections).';

CREATE INDEX IF NOT EXISTS idx_local_body_panchayat    ON local_body_elections(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_local_body_state        ON local_body_elections(state_code);
CREATE INDEX IF NOT EXISTS idx_local_body_year         ON local_body_elections(election_year);
CREATE INDEX IF NOT EXISTS idx_local_body_type         ON local_body_elections(election_type);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. LOCAL BODY CANDIDATES (Candidates in panchayat/municipal polls)   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS local_body_candidates (
  id                SERIAL PRIMARY KEY,

  -- Parent election reference
  election_id       INTEGER NOT NULL REFERENCES local_body_elections(id) ON DELETE CASCADE,

  -- Candidate details
  candidate_name    TEXT NOT NULL,
  party             TEXT NOT NULL DEFAULT 'IND',    -- Most local body candidates are independents

  -- Results
  votes             INTEGER NOT NULL DEFAULT 0,
  result            TEXT
                    CHECK (result IN ('won', 'lost', 'forfeited_deposit', 'unanimous')),

  -- Was this candidate the incumbent (previous term holder)?
  is_incumbent      BOOLEAN NOT NULL DEFAULT FALSE,

  UNIQUE(election_id, candidate_name)
);

COMMENT ON TABLE  local_body_candidates IS 'Candidates in panchayat/municipal elections. Most are independents (party = ''IND'').';
COMMENT ON COLUMN local_body_candidates.result IS '''forfeited_deposit'' = received less than 1/6th of votes (loses security deposit).';

CREATE INDEX IF NOT EXISTS idx_local_body_cand_election ON local_body_candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_local_body_cand_party    ON local_body_candidates(party);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VALIDATION TRIGGERS                                                   ║
-- ║  Enforce data integrity rules that can't be expressed as constraints.  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1. Auto-compute turnout_percent and validate vote counts on booth results
CREATE OR REPLACE FUNCTION fn_validate_booth_result()
RETURNS TRIGGER AS $$
BEGIN
  -- Turnout percentage: guard against division by zero
  IF NEW.total_voters_in_roll > 0 THEN
    NEW.turnout_percent := ROUND(
      (NEW.votes_polled::NUMERIC / NEW.total_voters_in_roll) * 100, 2
    );
  ELSE
    NEW.turnout_percent := 0;
  END IF;

  -- valid_votes + rejected_votes MUST equal votes_polled
  IF NEW.valid_votes + NEW.rejected_votes <> NEW.votes_polled THEN
    RAISE EXCEPTION
      'Data integrity violation on booth %: valid_votes (%) + rejected_votes (%) ≠ votes_polled (%)',
      NEW.booth_id, NEW.valid_votes, NEW.rejected_votes, NEW.votes_polled;
  END IF;

  -- NOTA is a subset of rejected_votes
  IF NEW.nota_votes > NEW.rejected_votes THEN
    RAISE EXCEPTION
      'Data integrity violation on booth %: nota_votes (%) cannot exceed rejected_votes (%)',
      NEW.booth_id, NEW.nota_votes, NEW.rejected_votes;
  END IF;

  -- Votes polled cannot exceed voters in roll (allows small margin for postal ballots)
  IF NEW.votes_polled > NEW.total_voters_in_roll * 1.05 THEN
    RAISE EXCEPTION
      'Data integrity violation on booth %: votes_polled (%) exceeds 105%% of total_voters_in_roll (%)',
      NEW.booth_id, NEW.votes_polled, NEW.total_voters_in_roll;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_booth_result
  BEFORE INSERT OR UPDATE ON booth_election_results
  FOR EACH ROW EXECUTE FUNCTION fn_validate_booth_result();


-- 2. Auto-compute turnout_percent on local body elections
CREATE OR REPLACE FUNCTION fn_validate_local_body_turnout()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_voters > 0 THEN
    NEW.turnout_percent := ROUND(
      (NEW.votes_polled::NUMERIC / NEW.total_voters) * 100, 2
    );
  ELSE
    NEW.turnout_percent := 0;
  END IF;

  IF NEW.votes_polled > NEW.total_voters * 1.05 THEN
    RAISE EXCEPTION
      'Data integrity violation on local body election %: votes_polled (%) exceeds 105%% of total_voters (%)',
      NEW.id, NEW.votes_polled, NEW.total_voters;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_local_body_turnout
  BEFORE INSERT OR UPDATE ON local_body_elections
  FOR EACH ROW EXECUTE FUNCTION fn_validate_local_body_turnout();


-- 3. Auto-set updated_at timestamp on hierarchy tables
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mandals_updated_at
  BEFORE UPDATE ON mandals
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_gram_panchayats_updated_at
  BEFORE UPDATE ON gram_panchayats
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_polling_booths_updated_at
  BEFORE UPDATE ON polling_booths
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  AGGREGATION VIEWS                                                     ║
-- ║  Pre-computed views for dashboard queries. These replace the need for  ║
-- ║  complex JOINs in the application layer.                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 1: v_constituency_booth_summary
-- For each constituency: total booths, total voters, booth coverage metrics.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_constituency_booth_summary AS
SELECT
  c.id                    AS constituency_id,
  c.name                  AS constituency_name,
  c.state_code,
  c.district,
  COUNT(pb.id)            AS total_booths,
  COALESCE(SUM(pb.total_voters), 0)           AS total_voters,
  COALESCE(SUM(pb.male_voters), 0)            AS total_male_voters,
  COALESCE(SUM(pb.female_voters), 0)          AS total_female_voters,
  COALESCE(SUM(pb.third_gender_voters), 0)    AS total_third_gender_voters,
  COUNT(pb.id) FILTER (WHERE pb.is_auxiliary)  AS auxiliary_booths,
  COUNT(pb.id) FILTER (WHERE pb.location IS NOT NULL) AS booths_with_gps,
  -- Coverage: what % of booths have GPS coordinates?
  CASE
    WHEN COUNT(pb.id) > 0
    THEN ROUND(
      COUNT(pb.id) FILTER (WHERE pb.location IS NOT NULL)::NUMERIC
      / COUNT(pb.id) * 100, 2
    )
    ELSE 0
  END AS gps_coverage_percent
FROM constituencies c
LEFT JOIN polling_booths pb ON pb.constituency_id = c.id
GROUP BY c.id, c.name, c.state_code, c.district;

COMMENT ON VIEW v_constituency_booth_summary IS 'Per-constituency aggregation: booth count, voter totals, GPS coverage. Used for dashboard cards.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 2: v_mandal_summary
-- For each mandal: panchayat count, booth count, voter totals, AC overlaps.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_mandal_summary AS
SELECT
  m.id                    AS mandal_id,
  m.name                  AS mandal_name,
  m.state_code,
  m.district,
  m.type                  AS mandal_type,
  m.population_2011,

  -- Panchayat counts
  COUNT(DISTINCT gp.id)   AS total_panchayats,

  -- Booth counts (booths linked to this mandal)
  COUNT(DISTINCT pb.id)   AS total_booths,

  -- Voter totals
  COALESCE(SUM(DISTINCT pb.total_voters), 0)  AS total_voters,

  -- How many assembly constituencies does this mandal overlap?
  (
    SELECT COUNT(*)
    FROM mandal_constituency_map mcm
    WHERE mcm.mandal_id = m.id
  ) AS constituencies_overlapped,

  -- Revenue village count
  (
    SELECT COUNT(*)
    FROM revenue_villages rv
    WHERE rv.mandal_id = m.id
  ) AS total_revenue_villages

FROM mandals m
LEFT JOIN gram_panchayats gp ON gp.mandal_id = m.id
LEFT JOIN polling_booths pb  ON pb.mandal_id = m.id
GROUP BY m.id, m.name, m.state_code, m.district, m.type, m.population_2011;

COMMENT ON VIEW v_mandal_summary IS 'Per-mandal aggregation: panchayat/booth/village counts, voter totals, AC overlap count.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 3: v_panchayat_summary
-- For each panchayat: booth count, voter totals, latest local body results.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_panchayat_summary AS
SELECT
  gp.id                   AS panchayat_id,
  gp.name                 AS panchayat_name,
  gp.state_code,
  gp.type                 AS panchayat_type,
  m.name                  AS mandal_name,
  m.district,

  -- Booths
  COUNT(DISTINCT pb.id)   AS total_booths,
  COALESCE(SUM(pb.total_voters), 0) AS total_voters,

  -- Revenue villages
  (
    SELECT COUNT(*)
    FROM revenue_villages rv
    WHERE rv.panchayat_id = gp.id
  ) AS total_revenue_villages,

  -- Latest sarpanch election result (subquery for latest year)
  (
    SELECT lbc.candidate_name
    FROM local_body_elections lbe
    JOIN local_body_candidates lbc ON lbc.election_id = lbe.id
    WHERE lbe.panchayat_id = gp.id
      AND lbe.election_type = 'sarpanch'
      AND lbc.result IN ('won', 'unanimous')
    ORDER BY lbe.election_year DESC
    LIMIT 1
  ) AS current_sarpanch,

  (
    SELECT lbc.party
    FROM local_body_elections lbe
    JOIN local_body_candidates lbc ON lbc.election_id = lbe.id
    WHERE lbe.panchayat_id = gp.id
      AND lbe.election_type = 'sarpanch'
      AND lbc.result IN ('won', 'unanimous')
    ORDER BY lbe.election_year DESC
    LIMIT 1
  ) AS current_sarpanch_party

FROM gram_panchayats gp
LEFT JOIN mandals m        ON m.id = gp.mandal_id
LEFT JOIN polling_booths pb ON pb.panchayat_id = gp.id
GROUP BY gp.id, gp.name, gp.state_code, gp.type, m.name, m.district;

COMMENT ON VIEW v_panchayat_summary IS 'Per-panchayat aggregation: booth/voter counts, revenue village count, current sarpanch from latest election.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 4: v_constituency_hierarchy
-- Full denormalized view: constituency → mandals → panchayats → booths.
-- Each row is one mandal-in-constituency with aggregated sub-counts.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_constituency_hierarchy AS
SELECT
  c.id                    AS constituency_id,
  c.name                  AS constituency_name,
  c.ac_no,
  c.state_code,
  c.district,
  c.reservation_status,

  -- Mandal details
  mcm.mandal_id,
  m.name                  AS mandal_name,
  m.type                  AS mandal_type,
  mcm.overlap_type,
  mcm.overlap_percentage,

  -- Panchayats from this mandal that are within this AC
  mcm.panchayats_in_ac,
  mcm.voters_in_ac,

  -- Total booths from this mandal in this constituency
  (
    SELECT COUNT(*)
    FROM polling_booths pb
    WHERE pb.constituency_id = c.id
      AND pb.mandal_id = m.id
  ) AS booths_in_ac,

  -- Total booths across all mandals for this constituency
  (
    SELECT COUNT(*)
    FROM polling_booths pb2
    WHERE pb2.constituency_id = c.id
  ) AS total_constituency_booths

FROM constituencies c
JOIN mandal_constituency_map mcm ON mcm.constituency_id = c.id
JOIN mandals m ON m.id = mcm.mandal_id
ORDER BY c.state_code, c.ac_no, m.name;

COMMENT ON VIEW v_constituency_hierarchy IS 'Denormalized hierarchy: one row per mandal-in-constituency. Includes overlap type, panchayat/booth/voter counts.';


-- ────────────────────────────────────────────────────────────────────────────
-- VIEW 5: v_booth_result_aggregation
-- Party-wise vote aggregation from booth level → constituency level.
-- Used to VALIDATE that booth-level sums match official constituency totals.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_booth_result_aggregation AS
SELECT
  ber.election_id,
  ber.constituency_id,
  c.name                          AS constituency_name,
  c.state_code,

  -- Booth-level aggregate turnout
  COUNT(DISTINCT ber.booth_id)    AS booths_counted,
  SUM(ber.total_voters_in_roll)   AS agg_total_voters_in_roll,
  SUM(ber.votes_polled)           AS agg_votes_polled,
  SUM(ber.valid_votes)            AS agg_valid_votes,
  SUM(ber.rejected_votes)         AS agg_rejected_votes,
  SUM(ber.nota_votes)             AS agg_nota_votes,
  CASE
    WHEN SUM(ber.total_voters_in_roll) > 0
    THEN ROUND(
      SUM(ber.votes_polled)::NUMERIC / SUM(ber.total_voters_in_roll) * 100, 2
    )
    ELSE 0
  END AS agg_turnout_percent,

  -- Party-wise vote breakdown (as JSONB for flexible consumption)
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'party', sub.party,
        'candidate_name', sub.candidate_name,
        'total_votes', sub.total_votes,
        'booths_won', sub.booths_won
      ) ORDER BY sub.total_votes DESC
    )
    FROM (
      SELECT
        bcv.party,
        bcv.candidate_name,
        SUM(bcv.votes)                                    AS total_votes,
        COUNT(*) FILTER (WHERE bcv.is_winner)             AS booths_won
      FROM booth_candidate_votes bcv
      JOIN booth_election_results ber2 ON ber2.id = bcv.booth_result_id
      WHERE ber2.election_id = ber.election_id
        AND ber2.constituency_id = ber.constituency_id
      GROUP BY bcv.party, bcv.candidate_name
    ) sub
  ) AS party_wise_results

FROM booth_election_results ber
JOIN constituencies c ON c.id = ber.constituency_id
GROUP BY ber.election_id, ber.constituency_id, c.name, c.state_code;

COMMENT ON VIEW v_booth_result_aggregation IS 'Aggregates booth-level votes to constituency level. Used for validation: these sums MUST match official ECI totals.';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  VALIDATION FUNCTION                                                   ║
-- ║  Callable function to verify booth-level data sums correctly to the   ║
-- ║  constituency level for a given election.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION fn_validate_booth_aggregation(
  p_election_id   INTEGER,
  p_constituency_id TEXT
)
RETURNS TABLE (
  check_name      TEXT,
  expected_value  BIGINT,
  actual_value    BIGINT,
  is_valid        BOOLEAN,
  error_detail    TEXT
) AS $$
DECLARE
  v_official_votes    INTEGER;
  v_official_valid    INTEGER;
  v_booth_sum_votes   BIGINT;
  v_booth_sum_valid   BIGINT;
  v_candidate_sum     BIGINT;
  v_booth_valid_sum   BIGINT;
  v_total_booths      INTEGER;
  v_results_booths    INTEGER;
BEGIN
  -- Get total booth count for this constituency
  SELECT COUNT(*) INTO v_total_booths
  FROM polling_booths
  WHERE constituency_id = p_constituency_id;

  -- Get booths with results
  SELECT COUNT(*) INTO v_results_booths
  FROM booth_election_results
  WHERE election_id = p_election_id
    AND constituency_id = p_constituency_id;

  -- Check 1: All booths have results
  RETURN QUERY SELECT
    'booth_coverage'::TEXT,
    v_total_booths::BIGINT,
    v_results_booths::BIGINT,
    (v_total_booths = v_results_booths),
    CASE
      WHEN v_total_booths <> v_results_booths
      THEN format('Missing results for %s of %s booths', v_total_booths - v_results_booths, v_total_booths)
      ELSE NULL
    END;

  -- Get booth-level sums
  SELECT COALESCE(SUM(votes_polled), 0), COALESCE(SUM(valid_votes), 0)
  INTO v_booth_sum_votes, v_booth_sum_valid
  FROM booth_election_results
  WHERE election_id = p_election_id
    AND constituency_id = p_constituency_id;

  -- Get official constituency result for comparison
  SELECT COALESCE(er.winner_votes + er.margin, 0)
  INTO v_official_votes
  FROM election_results er
  WHERE er.election_id = p_election_id
    AND er.constituency_id = p_constituency_id;

  -- Check 2: Candidate vote sum equals valid_votes per booth
  SELECT COALESCE(SUM(bcv.votes), 0)
  INTO v_candidate_sum
  FROM booth_candidate_votes bcv
  JOIN booth_election_results ber ON ber.id = bcv.booth_result_id
  WHERE ber.election_id = p_election_id
    AND ber.constituency_id = p_constituency_id;

  RETURN QUERY SELECT
    'candidate_votes_vs_valid_votes'::TEXT,
    v_booth_sum_valid,
    v_candidate_sum,
    (v_booth_sum_valid = v_candidate_sum),
    CASE
      WHEN v_booth_sum_valid <> v_candidate_sum
      THEN format('Sum of candidate votes (%s) ≠ sum of valid_votes (%s). Difference: %s',
                  v_candidate_sum, v_booth_sum_valid, ABS(v_candidate_sum - v_booth_sum_valid))
      ELSE NULL
    END;

  -- Check 3: Per-booth valid_votes + rejected_votes = votes_polled
  -- (Already enforced by trigger, but check in aggregate)
  RETURN QUERY SELECT
    'vote_arithmetic_consistency'::TEXT,
    v_booth_sum_votes,
    (
      SELECT COALESCE(SUM(valid_votes + rejected_votes), 0)
      FROM booth_election_results
      WHERE election_id = p_election_id
        AND constituency_id = p_constituency_id
    ),
    v_booth_sum_votes = (
      SELECT COALESCE(SUM(valid_votes + rejected_votes), 0)
      FROM booth_election_results
      WHERE election_id = p_election_id
        AND constituency_id = p_constituency_id
    ),
    CASE
      WHEN v_booth_sum_votes <> (
        SELECT COALESCE(SUM(valid_votes + rejected_votes), 0)
        FROM booth_election_results
        WHERE election_id = p_election_id
          AND constituency_id = p_constituency_id
      )
      THEN 'valid_votes + rejected_votes does not sum to votes_polled across booths'
      ELSE NULL
    END;

  -- Check 4: Exactly one winner per booth
  RETURN QUERY SELECT
    'single_winner_per_booth'::TEXT,
    v_results_booths::BIGINT,
    (
      SELECT COUNT(DISTINCT ber3.id)
      FROM booth_election_results ber3
      JOIN booth_candidate_votes bcv3 ON bcv3.booth_result_id = ber3.id
      WHERE ber3.election_id = p_election_id
        AND ber3.constituency_id = p_constituency_id
        AND bcv3.is_winner = TRUE
      GROUP BY ber3.id
      HAVING COUNT(*) = 1
    )::BIGINT,
    v_results_booths::BIGINT = (
      SELECT COUNT(DISTINCT ber3.id)
      FROM booth_election_results ber3
      JOIN booth_candidate_votes bcv3 ON bcv3.booth_result_id = ber3.id
      WHERE ber3.election_id = p_election_id
        AND ber3.constituency_id = p_constituency_id
        AND bcv3.is_winner = TRUE
      GROUP BY ber3.id
      HAVING COUNT(*) = 1
    )::BIGINT,
    'Each booth should have exactly one winner marked';

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_validate_booth_aggregation IS 'Validates booth-level data integrity: coverage, vote arithmetic, candidate sums, single-winner rule. Returns a table of check results.';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  ROW LEVEL SECURITY                                                    ║
-- ║  All hierarchy tables: public read, service-role write.                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Enable RLS on all new tables
ALTER TABLE mandals                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gram_panchayats          ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_villages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE polling_booths           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandal_constituency_map  ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_election_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE booth_candidate_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_body_elections     ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_body_candidates    ENABLE ROW LEVEL SECURITY;

-- Public read access (anonymous + authenticated users)
CREATE POLICY "Public read mandals"
  ON mandals FOR SELECT USING (true);

CREATE POLICY "Public read gram_panchayats"
  ON gram_panchayats FOR SELECT USING (true);

CREATE POLICY "Public read revenue_villages"
  ON revenue_villages FOR SELECT USING (true);

CREATE POLICY "Public read polling_booths"
  ON polling_booths FOR SELECT USING (true);

CREATE POLICY "Public read mandal_constituency_map"
  ON mandal_constituency_map FOR SELECT USING (true);

CREATE POLICY "Public read booth_election_results"
  ON booth_election_results FOR SELECT USING (true);

CREATE POLICY "Public read booth_candidate_votes"
  ON booth_candidate_votes FOR SELECT USING (true);

CREATE POLICY "Public read local_body_elections"
  ON local_body_elections FOR SELECT USING (true);

CREATE POLICY "Public read local_body_candidates"
  ON local_body_candidates FOR SELECT USING (true);

-- Service-role write access (INSERT, UPDATE, DELETE)
-- Supabase service_role bypasses RLS by default, but we add explicit
-- policies for defense-in-depth and to document intent.
CREATE POLICY "Service role write mandals"
  ON mandals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write gram_panchayats"
  ON gram_panchayats FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write revenue_villages"
  ON revenue_villages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write polling_booths"
  ON polling_booths FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write mandal_constituency_map"
  ON mandal_constituency_map FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write booth_election_results"
  ON booth_election_results FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write booth_candidate_votes"
  ON booth_candidate_votes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write local_body_elections"
  ON local_body_elections FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role write local_body_candidates"
  ON local_body_candidates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


COMMIT;
