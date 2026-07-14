-- ============================================================================
-- 023: Local-Body Representatives & Urban/Rural Body Hierarchy
-- ============================================================================
-- Extends 022 (mandals, gram_panchayats, polling_booths, local_body_elections)
-- with first-class URBAN local bodies, ward/division sub-units for every
-- elected tier, a UNIFIED `representatives` office-holder table, and a
-- Wikipedia-style `representative_edits` provenance/history log.
--
-- ── DESIGN PRINCIPLES ──────────────────────────────────────────────────────
--   • ZERO FABRICATION: every representative row carries an explicit
--     `data_status` (verified | data_pending | crowdsourced_unverified) and a
--     `source_type` + `source_url`. Empty tiers are represented by the absence
--     of rows, never by synthesized placeholder holders.
--   • TENURE MODEL: `term_start` / `term_end` / `is_current`. Outgoing 2020–21
--     cohorts (terms expiring 2026) become historical automatically once a new
--     winner is declared for the same jurisdiction + office_type.
--   • POLYMORPHIC JURISDICTION: a representative points at exactly one
--     jurisdiction entity via (`jurisdiction_type`, `jurisdiction_id`).
--   • GEOMETRY OPTIONAL: ward / division polygons are nullable — a NULL geom
--     surfaces as "boundary pending" in the UI (list/tree still works).
--   • PROVENANCE: crowdsourced edits reuse the CCA/KYC forensic fingerprint
--     (`digital_fingerprint`) and flow through a moderation queue before they
--     mutate the canonical `representatives` row.
--
-- Dependencies: 001_initial_schema.sql, 022_administrative_hierarchy.sql
-- ============================================================================

BEGIN;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  1. URBAN LOCAL BODIES (Corporation / Municipality / Nagar Panchayat)      ║
-- ║     Rural bodies stay in `gram_panchayats` (022). This table models the    ║
-- ║     urban tier as a first-class citizen so ULB wards + mayors/chairs are   ║
-- ║     not shoe-horned into the rural GP schema.                              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS urban_local_bodies (
  -- Composite ID: <state_code>-ULB-<lgd_code>  e.g. 'TS-ULB-803416' (GHMC)
  id            TEXT PRIMARY KEY,

  name          TEXT NOT NULL,
  local_name    TEXT,

  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT NOT NULL,

  lgd_code      INTEGER,

  -- Urban body classification (rural handled by gram_panchayats.type)
  type          TEXT NOT NULL DEFAULT 'municipality'
                CHECK (type IN ('corporation', 'municipality', 'nagar_panchayat', 'cantonment')),

  -- Head office title varies: Mayor (corporation) vs Chairperson (municipality)
  head_office_type TEXT NOT NULL DEFAULT 'chairperson'
                CHECK (head_office_type IN ('mayor', 'chairperson')),

  -- Coverage: which AC / PC does this ULB fall in (denormalized, may be multi)
  primary_constituency_id TEXT REFERENCES constituencies(id),

  total_wards       INTEGER,
  population_2011   INTEGER,
  total_voters      INTEGER,
  area_sq_km        NUMERIC(10, 2),

  centroid      GEOMETRY(Point, 4326),
  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  urban_local_bodies IS 'Urban local bodies (corporation/municipality/nagar panchayat). Rural bodies live in gram_panchayats. Head is Mayor (corp) or Chairperson (municipality).';
COMMENT ON COLUMN urban_local_bodies.head_office_type IS 'mayor for corporations, chairperson for municipalities/nagar panchayats.';

CREATE INDEX IF NOT EXISTS idx_ulb_state_code    ON urban_local_bodies(state_code);
CREATE INDEX IF NOT EXISTS idx_ulb_state_district ON urban_local_bodies(state_code, district);
CREATE INDEX IF NOT EXISTS idx_ulb_lgd_code       ON urban_local_bodies(lgd_code);
CREATE INDEX IF NOT EXISTS idx_ulb_type           ON urban_local_bodies(type);
CREATE INDEX IF NOT EXISTS idx_ulb_boundary       ON urban_local_bodies USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  2. ULB WARDS (Corporator / Councillor division inside an urban body)      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS ulb_wards (
  -- Composite ID: <ulb_id>-W<ward_no>  e.g. 'TS-ULB-803416-W042'
  id            TEXT PRIMARY KEY,

  ulb_id        TEXT NOT NULL REFERENCES urban_local_bodies(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  ward_no       INTEGER NOT NULL,
  name          TEXT,
  local_name    TEXT,

  -- LGD ward code where published
  lgd_ward_code INTEGER,

  -- Reservation for this ward's seat
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  -- Which AC does this ward map to (a ULB can straddle multiple ACs)
  constituency_id TEXT REFERENCES constituencies(id),

  population_2011 INTEGER,
  total_voters    INTEGER,

  -- Boundary optional → NULL renders "boundary pending"
  centroid      GEOMETRY(Point, 4326),
  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(ulb_id, ward_no)
);

COMMENT ON TABLE  ulb_wards IS 'Ward inside an urban local body — the corporator/councillor seat. boundary NULL => "boundary pending".';
COMMENT ON COLUMN ulb_wards.reservation IS 'Seat reservation incl. woman variants (-W). Assigned per SEC rotation each cycle.';

CREATE INDEX IF NOT EXISTS idx_ulb_wards_ulb          ON ulb_wards(ulb_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_state         ON ulb_wards(state_code);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_constituency  ON ulb_wards(constituency_id);
CREATE INDEX IF NOT EXISTS idx_ulb_wards_boundary      ON ulb_wards USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  3. ZILLA PARISHADS (District rural council) + ZPTC divisions              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS zilla_parishads (
  -- Composite ID: <state_code>-ZP-<district_slug>  e.g. 'TS-ZP-mancherial'
  id            TEXT PRIMARY KEY,

  name          TEXT NOT NULL,
  local_name    TEXT,

  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT NOT NULL,

  lgd_code      INTEGER,

  total_divisions INTEGER,          -- number of ZPTC divisions (usually 1 per mandal)
  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(state_code, district)
);

COMMENT ON TABLE zilla_parishads IS 'District-level rural local government. Chairperson is the ZP Chairperson. One ZPTC division per mandal (typically).';

CREATE INDEX IF NOT EXISTS idx_zp_state    ON zilla_parishads(state_code);
CREATE INDEX IF NOT EXISTS idx_zp_district  ON zilla_parishads(state_code, district);


CREATE TABLE IF NOT EXISTS zptc_divisions (
  -- Composite ID: <zp_id>-ZPTC-<lgd_code or slug>
  id            TEXT PRIMARY KEY,

  zilla_parishad_id TEXT NOT NULL REFERENCES zilla_parishads(id),
  -- ZPTC divisions are (usually) coterminous with a mandal
  mandal_id     TEXT REFERENCES mandals(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  name          TEXT NOT NULL,
  division_no   INTEGER,
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE zptc_divisions IS 'Zilla Parishad Territorial Constituency — one elected ZPTC member per division (≈ one per mandal).';

CREATE INDEX IF NOT EXISTS idx_zptc_zp       ON zptc_divisions(zilla_parishad_id);
CREATE INDEX IF NOT EXISTS idx_zptc_mandal    ON zptc_divisions(mandal_id);
CREATE INDEX IF NOT EXISTS idx_zptc_state      ON zptc_divisions(state_code);
CREATE INDEX IF NOT EXISTS idx_zptc_boundary   ON zptc_divisions USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  4. MANDAL PARISHADS (Block-level rural council) + MPTC divisions          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS mandal_parishads (
  -- Composite ID: <mandal_id>-MP  (one mandal parishad per mandal)
  id            TEXT PRIMARY KEY,

  mandal_id     TEXT NOT NULL REFERENCES mandals(id),
  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT NOT NULL,

  name          TEXT NOT NULL,
  total_divisions INTEGER,          -- number of MPTC divisions

  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(mandal_id)
);

COMMENT ON TABLE mandal_parishads IS 'Mandal Parishad — block-level rural body. Head is the Mandal Parishad President (MPP), elected by MPTC members.';

CREATE INDEX IF NOT EXISTS idx_mp_mandal   ON mandal_parishads(mandal_id);
CREATE INDEX IF NOT EXISTS idx_mp_state     ON mandal_parishads(state_code);


CREATE TABLE IF NOT EXISTS mptc_divisions (
  -- Composite ID: <mandal_parishad_id>-MPTC-<division_no>
  id            TEXT PRIMARY KEY,

  mandal_parishad_id TEXT NOT NULL REFERENCES mandal_parishads(id),
  -- MPTC divisions usually align to one or more gram panchayats
  primary_panchayat_id TEXT REFERENCES gram_panchayats(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  name          TEXT NOT NULL,
  division_no   INTEGER,
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  population_2011 INTEGER,

  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE mptc_divisions IS 'Mandal Parishad Territorial Constituency — one elected MPTC member per division.';

CREATE INDEX IF NOT EXISTS idx_mptc_mp        ON mptc_divisions(mandal_parishad_id);
CREATE INDEX IF NOT EXISTS idx_mptc_panchayat  ON mptc_divisions(primary_panchayat_id);
CREATE INDEX IF NOT EXISTS idx_mptc_state       ON mptc_divisions(state_code);
CREATE INDEX IF NOT EXISTS idx_mptc_boundary    ON mptc_divisions USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5. GP WARDS (Gram Panchayat ward-member seats) — INCLUDED at launch       ║
-- ║     Highest-volume tier. Bulk-loaded, lazily rendered.                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS gp_wards (
  -- Composite ID: <panchayat_id>-W<ward_no>
  id            TEXT PRIMARY KEY,

  panchayat_id  TEXT NOT NULL REFERENCES gram_panchayats(id),
  state_code    TEXT NOT NULL REFERENCES states(code),

  ward_no       INTEGER NOT NULL,
  name          TEXT,
  reservation   TEXT NOT NULL DEFAULT 'GEN'
                CHECK (reservation IN ('GEN', 'SC', 'ST', 'BC', 'GEN-W', 'SC-W', 'ST-W', 'BC-W')),

  population_2011 INTEGER,

  centroid      GEOMETRY(Point, 4326),
  boundary      GEOMETRY(MultiPolygon, 4326),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(panchayat_id, ward_no)
);

COMMENT ON TABLE gp_wards IS 'Gram Panchayat ward — the ward-member seat. Highest-volume tier (~200k+ nationwide). boundary NULL => "boundary pending".';

CREATE INDEX IF NOT EXISTS idx_gp_wards_panchayat  ON gp_wards(panchayat_id);
CREATE INDEX IF NOT EXISTS idx_gp_wards_state        ON gp_wards(state_code);
CREATE INDEX IF NOT EXISTS idx_gp_wards_boundary     ON gp_wards USING GIST(boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  5b. Extend polling_booths with an optional catchment polygon              ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE polling_booths
  ADD COLUMN IF NOT EXISTS catchment_boundary GEOMETRY(MultiPolygon, 4326);

COMMENT ON COLUMN polling_booths.catchment_boundary IS 'Optional booth catchment polygon where CEO/GIS publishes it. NULL => "boundary pending".';

CREATE INDEX IF NOT EXISTS idx_polling_booths_catchment ON polling_booths USING GIST(catchment_boundary);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  6. REPRESENTATIVES (Unified elected office-holder — all local tiers)      ║
-- ║     Mirrors the MLA/MP profile shape (name, party, age, assets, criminal   ║
-- ║     cases, education …) plus office_type + polymorphic jurisdiction +      ║
-- ║     tenure + provenance summary.                                           ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS representatives (
  id            TEXT PRIMARY KEY,   -- e.g. 'TS-REP-GHMC-W042-2020'

  -- ── Office ──
  office_type   TEXT NOT NULL
                CHECK (office_type IN (
                  'mayor', 'deputy_mayor', 'corporator',
                  'ulb_chairperson', 'ulb_vice_chairperson',
                  'ward_member',                    -- ULB councillor (non-corp) or generic
                  'sarpanch', 'gp_ward_member',
                  'mptc_member', 'mandal_parishad_president',
                  'zptc_member', 'zilla_parishad_chairperson'
                )),

  -- ── Polymorphic jurisdiction: exactly one target ──
  jurisdiction_type TEXT NOT NULL
                CHECK (jurisdiction_type IN (
                  'urban_local_body', 'ulb_ward',
                  'zilla_parishad', 'zptc_division',
                  'mandal_parishad', 'mptc_division',
                  'gram_panchayat', 'gp_ward'
                )),
  jurisdiction_id TEXT NOT NULL,     -- FK enforced at app level (polymorphic)

  state_code    TEXT NOT NULL REFERENCES states(code),
  district      TEXT,

  -- ── Identity / person (mirrors MLAProfile) ──
  name          TEXT NOT NULL,
  local_name    TEXT,
  party         TEXT,                -- de-facto party; NULL when officially non-party
  party_official BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE for AP panchayats (non-party)
  elected_party TEXT,
  gender        TEXT CHECK (gender IN ('M', 'F', 'O')),
  age           INTEGER,
  dob           DATE,
  dob_estimated BOOLEAN NOT NULL DEFAULT FALSE,
  education     TEXT,
  profession    TEXT,
  marital_status TEXT,
  terms         INTEGER,

  -- ── Affidavit-derived (nullable → "data pending") ──
  criminal_cases   INTEGER,
  total_assets     BIGINT,
  total_liabilities BIGINT,

  -- ── Contact / media (sparse — crowdsourced over time) ──
  photo_url     TEXT,
  phone         TEXT,
  email         TEXT,

  -- ── Tenure ──
  election_year INTEGER,
  election_id   INTEGER REFERENCES local_body_elections(id),
  term_start    DATE,
  term_end      DATE,
  is_current    BOOLEAN NOT NULL DEFAULT TRUE,

  -- ── Provenance summary (detailed history in representative_edits) ──
  source_type   TEXT NOT NULL DEFAULT 'curated'
                CHECK (source_type IN (
                  'lgd', 'sec', 'lok_dhaba', 'opencity', 'wikipedia',
                  'eci', 'myneta', 'news', 'curated', 'crowdsourced'
                )),
  source_url    TEXT,
  data_status   TEXT NOT NULL DEFAULT 'data_pending'
                CHECK (data_status IN ('verified', 'data_pending', 'crowdsourced_unverified')),

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE  representatives IS 'Unified local-body office-holder. office_type + (jurisdiction_type, jurisdiction_id) identifies the seat. data_status enforces zero-fabrication honesty.';
COMMENT ON COLUMN representatives.party_official IS 'FALSE where the poll is officially non-party (e.g. AP gram panchayats) — party is de-facto/unofficial.';
COMMENT ON COLUMN representatives.data_status IS 'verified = from official source; data_pending = seat exists but holder unknown; crowdsourced_unverified = user-submitted, awaiting moderation.';
COMMENT ON COLUMN representatives.jurisdiction_id IS 'Polymorphic reference resolved via jurisdiction_type. Not a hard FK (multiple possible parents).';

-- Only one CURRENT holder per seat + office (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_representatives_current_seat
  ON representatives (jurisdiction_type, jurisdiction_id, office_type)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_reps_state          ON representatives(state_code);
CREATE INDEX IF NOT EXISTS idx_reps_office          ON representatives(office_type);
CREATE INDEX IF NOT EXISTS idx_reps_jurisdiction    ON representatives(jurisdiction_type, jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_reps_current          ON representatives(is_current);
CREATE INDEX IF NOT EXISTS idx_reps_data_status       ON representatives(data_status);
CREATE INDEX IF NOT EXISTS idx_reps_election          ON representatives(election_id);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  7. REPRESENTATIVE EDITS (Wikipedia-style crowdsourced history)            ║
-- ║     Every crowdsourced edit is fingerprinted (reuse CCA/KYC) and moderated ║
-- ║     before it mutates the canonical `representatives` row.                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS representative_edits (
  id            BIGSERIAL PRIMARY KEY,

  representative_id TEXT NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,

  editor_user_id    UUID,                          -- Supabase auth uid (nullable for system imports)
  editor_kyc_verified BOOLEAN NOT NULL DEFAULT FALSE,

  -- Provenance
  source_type   TEXT NOT NULL
                CHECK (source_type IN (
                  'lgd', 'sec', 'lok_dhaba', 'opencity', 'wikipedia',
                  'eci', 'myneta', 'news', 'curated', 'crowdsourced'
                )),
  source_url    TEXT,
  citation      TEXT,                              -- free-text citation / note

  -- The proposed change: { field: { from, to } }
  diff          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Forensic fingerprint (reuse CCA/KYC action fingerprint snapshot)
  digital_fingerprint JSONB,

  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Moderation
  moderation_status TEXT NOT NULL DEFAULT 'pending'
                CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'auto_applied')),
  moderated_by  UUID,
  moderated_at  TIMESTAMPTZ,
  moderation_note TEXT
);

COMMENT ON TABLE  representative_edits IS 'Immutable-ish audit log of every edit to a representative — Wikipedia-style provenance with forensic fingerprint + moderation gate.';
COMMENT ON COLUMN representative_edits.diff IS 'JSONB of proposed field changes: { "phone": { "from": null, "to": "+91..." } }.';
COMMENT ON COLUMN representative_edits.digital_fingerprint IS 'CCA/KYC forensic snapshot (device, network, location, content hash) captured at submit time.';

CREATE INDEX IF NOT EXISTS idx_rep_edits_rep      ON representative_edits(representative_id);
CREATE INDEX IF NOT EXISTS idx_rep_edits_editor    ON representative_edits(editor_user_id);
CREATE INDEX IF NOT EXISTS idx_rep_edits_status     ON representative_edits(moderation_status);
CREATE INDEX IF NOT EXISTS idx_rep_edits_submitted  ON representative_edits(submitted_at);


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  8. TENURE + PROVENANCE TRIGGERS                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Reuse fn_set_updated_at() defined in 022.
CREATE TRIGGER trg_ulb_updated_at
  BEFORE UPDATE ON urban_local_bodies
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_ulb_wards_updated_at
  BEFORE UPDATE ON ulb_wards
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_zp_updated_at
  BEFORE UPDATE ON zilla_parishads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_zptc_updated_at
  BEFORE UPDATE ON zptc_divisions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_mp_updated_at
  BEFORE UPDATE ON mandal_parishads
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_mptc_updated_at
  BEFORE UPDATE ON mptc_divisions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_gp_wards_updated_at
  BEFORE UPDATE ON gp_wards
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_representatives_updated_at
  BEFORE UPDATE ON representatives
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- When a NEW current holder is inserted for a seat+office, retire any prior
-- current holder for the SAME seat (tenure model: outgoing cohort → historical).
CREATE OR REPLACE FUNCTION fn_retire_prior_representative()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE representatives
       SET is_current = FALSE,
           term_end   = COALESCE(term_end, NEW.term_start, CURRENT_DATE),
           updated_at = now()
     WHERE jurisdiction_type = NEW.jurisdiction_type
       AND jurisdiction_id   = NEW.jurisdiction_id
       AND office_type       = NEW.office_type
       AND id <> NEW.id
       AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_retire_prior_representative
  AFTER INSERT ON representatives
  FOR EACH ROW EXECUTE FUNCTION fn_retire_prior_representative();


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  9. ROLLUP VIEWS                                                            ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Coverage / completeness per state + office_type (drives "data pending" UX)
CREATE OR REPLACE VIEW v_representative_coverage AS
SELECT
  state_code,
  office_type,
  COUNT(*)                                              AS total_seats_with_holder,
  COUNT(*) FILTER (WHERE data_status = 'verified')       AS verified,
  COUNT(*) FILTER (WHERE data_status = 'data_pending')   AS data_pending,
  COUNT(*) FILTER (WHERE data_status = 'crowdsourced_unverified') AS crowdsourced,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL)          AS with_photo,
  COUNT(*) FILTER (WHERE phone IS NOT NULL)              AS with_phone
FROM representatives
WHERE is_current = TRUE
GROUP BY state_code, office_type;

COMMENT ON VIEW v_representative_coverage IS 'Per-state, per-office coverage counts — powers honest completeness badges & "data pending" states.';

-- Moderation queue for pending crowdsourced edits
CREATE OR REPLACE VIEW v_representative_edit_queue AS
SELECT
  re.id,
  re.representative_id,
  r.name           AS representative_name,
  r.office_type,
  r.state_code,
  re.editor_user_id,
  re.editor_kyc_verified,
  re.source_type,
  re.source_url,
  re.diff,
  re.submitted_at
FROM representative_edits re
JOIN representatives r ON r.id = re.representative_id
WHERE re.moderation_status = 'pending'
ORDER BY re.submitted_at ASC;

COMMENT ON VIEW v_representative_edit_queue IS 'Pending crowdsourced representative edits awaiting moderation.';


-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  10. ROW LEVEL SECURITY                                                     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

ALTER TABLE urban_local_bodies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ulb_wards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE zilla_parishads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zptc_divisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandal_parishads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE mptc_divisions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gp_wards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE representatives      ENABLE ROW LEVEL SECURITY;
ALTER TABLE representative_edits ENABLE ROW LEVEL SECURITY;

-- Public read for structural + representative data
CREATE POLICY "Public read urban_local_bodies"  ON urban_local_bodies  FOR SELECT USING (true);
CREATE POLICY "Public read ulb_wards"            ON ulb_wards            FOR SELECT USING (true);
CREATE POLICY "Public read zilla_parishads"      ON zilla_parishads      FOR SELECT USING (true);
CREATE POLICY "Public read zptc_divisions"       ON zptc_divisions       FOR SELECT USING (true);
CREATE POLICY "Public read mandal_parishads"     ON mandal_parishads     FOR SELECT USING (true);
CREATE POLICY "Public read mptc_divisions"       ON mptc_divisions       FOR SELECT USING (true);
CREATE POLICY "Public read gp_wards"             ON gp_wards             FOR SELECT USING (true);
CREATE POLICY "Public read representatives"      ON representatives      FOR SELECT USING (true);

-- Service-role write on structural + representative tables
CREATE POLICY "Service write urban_local_bodies" ON urban_local_bodies  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write ulb_wards"          ON ulb_wards            FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write zilla_parishads"    ON zilla_parishads      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write zptc_divisions"     ON zptc_divisions       FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write mandal_parishads"   ON mandal_parishads     FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write mptc_divisions"     ON mptc_divisions       FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write gp_wards"           ON gp_wards             FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "Service write representatives"    ON representatives      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- representative_edits: public read; authenticated users may submit; service/admin moderate.
CREATE POLICY "Public read representative_edits"
  ON representative_edits FOR SELECT USING (true);

CREATE POLICY "Authenticated submit representative_edits"
  ON representative_edits FOR INSERT
  WITH CHECK (auth.uid() = editor_user_id);

CREATE POLICY "Service moderate representative_edits"
  ON representative_edits FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


COMMIT;
