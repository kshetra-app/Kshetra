-- ==============================================================================
-- Migration 060: Canonical Electoral Geography Remediation (W021.5-B1-R1)
-- Target: Staging Supabase & Local PostgreSQL (fkpigozcqnmcvofuksar)
-- Authority: CTO Master Implementation Specification W021.5-B1-R1
-- Scope:
--   1. Explicit deprecation of legacy political fields in geography domain
--   2. Authoritative Delimitation Regimes registration for statutory transitions
--   3. Statutory transition alignment for J&K, AP, TS, and DNH&DD
--   4. Canonical Constituency Lineage table deployment (public.constituency_lineage)
--   5. Temporal PC <-> AC Relationship table deployment (public.constituency_parliamentary_mappings)
--   6. Seed verified PC <-> AC mappings with strict provenance
--   7. Enhanced migration conflict tracking schema & structured backfill
-- ==============================================================================

BEGIN;

-- ─── 1. DEPRECATION OF STATIC POLITICAL FIELDS IN GEOGRAPHY DOMAIN ───────────

COMMENT ON COLUMN public.states.ruling_party IS 'DEPRECATED [W021.5-B1-R1]: Legacy World-A compatibility field. Do NOT consume as canonical political truth. Canonical ruling party/government must be derived from elected_tenures and executive_governments in W021.5-B2+.';

COMMENT ON COLUMN public.constituencies.current_mla IS 'DEPRECATED [W021.5-B1-R1]: Legacy World-A compatibility field. Do NOT consume as canonical political truth. Canonical representative must be derived from elected_tenures in W021.5-B2+.';

-- ─── 2. REGISTER FIRST-CLASS STATUTORY DELIMITATION REGIMES ───────────────────

INSERT INTO public.delimitation_regimes (
  id, name, legal_status, authority, legal_basis, notified_at, effective_from, effective_to, is_active, dataset_version_id, metadata
)
VALUES
  (
    'eci_delimitation_2014_ap_ts',
    'Andhra Pradesh Reorganisation Act, 2014 Electoral Allocation',
    'CURRENT_LEGAL_REGIME',
    'Parliament of India / Election Commission of India',
    'Andhra Pradesh Reorganisation Act, 2014 (Act No. 6 of 2014)',
    '2014-03-01'::date,
    '2014-06-02'::date,
    NULL,
    true,
    'mha_national_jurisdictions_2024_v1',
    '{"statutory_reference": "AP Reorganisation Act 2014 Sec 15 & 22", "jurisdictions": ["AP", "TS"], "ts_ac_count": 119, "ts_pc_count": 17, "ap_ac_count": 175, "ap_pc_count": 25}'::jsonb
  ),
  (
    'eci_delimitation_2019_dnh_dd',
    'Dadra and Nagar Haveli and Daman and Diu (Merger of Union Territories) Act, 2019',
    'CURRENT_LEGAL_REGIME',
    'Parliament of India / Election Commission of India',
    'Dadra and Nagar Haveli and Daman and Diu (Merger of Union Territories) Act, 2019 (Act No. 44 of 2019)',
    '2019-12-09'::date,
    '2020-01-26'::date,
    NULL,
    true,
    'mha_national_jurisdictions_2024_v1',
    '{"statutory_reference": "Act No. 44 of 2019 Sec 7", "jurisdictions": ["DN"], "pc_count": 2}'::jsonb
  ),
  (
    'eci_delimitation_2022_jk',
    'Delimitation Commission Order (Jammu & Kashmir), 2022',
    'CURRENT_LEGAL_REGIME',
    'Delimitation Commission of India',
    'Jammu and Kashmir Reorganisation Act, 2019 (Act No. 34 of 2019) & Delimitation Act, 2002',
    '2022-05-05'::date,
    '2022-05-20'::date,
    NULL,
    true,
    'eci_national_ac_2008_v1',
    '{"statutory_reference": "Delimitation Commission Order No. 2 (J&K) / S.O. 2223(E)", "jurisdictions": ["JK", "LA"], "jk_ac_count": 90, "jk_pc_count": 5, "la_pc_count": 1}'::jsonb
  ),
  (
    'eci_delimitation_2023_as',
    'Delimitation Order (Assam), 2023',
    'CURRENT_LEGAL_REGIME',
    'Election Commission of India',
    'Representation of the People Act, 1950 (Section 8A)',
    '2023-08-11'::date,
    '2023-08-16'::date,
    NULL,
    true,
    'eci_national_ac_2008_v1',
    '{"statutory_reference": "ECI Notification No. 282/AS/2023", "jurisdictions": ["AS"], "ac_count": 126, "pc_count": 14}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  legal_status = EXCLUDED.legal_status,
  authority = EXCLUDED.authority,
  legal_basis = EXCLUDED.legal_basis,
  notified_at = EXCLUDED.notified_at,
  effective_from = EXCLUDED.effective_from,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata;

-- ─── 3. STATUTORY TRANSITION ALIGNMENT FOR CONSTITUENCIES & VERSIONS ───────────

-- 3.1 Jammu & Kashmir Statutory Delimitation Alignment (2022 Order)
UPDATE public.constituencies
SET
  delimitation_regime_id = 'eci_delimitation_2022_jk',
  valid_from = '2022-05-20'::date,
  updated_at = now()
WHERE state_code = 'JK';

UPDATE public.constituency_versions cv
SET
  delimitation_regime_id = 'eci_delimitation_2022_jk',
  version_code = c.canonical_code || '-2022',
  valid_from = '2022-05-20'::date,
  updated_at = now()
FROM public.constituencies c
WHERE cv.constituency_internal_id = c.internal_id AND c.state_code = 'JK';

UPDATE public.parliamentary_constituencies
SET
  delimitation_regime_id = 'eci_delimitation_2022_jk',
  valid_from = '2022-05-20'::date,
  updated_at = now()
WHERE state_code IN ('JK', 'LA');

UPDATE public.parliamentary_constituency_versions pcv
SET
  delimitation_regime_id = 'eci_delimitation_2022_jk',
  version_code = pc.code || '-2022',
  valid_from = '2022-05-20'::date,
  updated_at = now()
FROM public.parliamentary_constituencies pc
WHERE pcv.pc_id = pc.id AND pc.state_code IN ('JK', 'LA');

-- 3.2 Telangana & Andhra Pradesh Statutory Reorganisation Alignment (2014 Act)
UPDATE public.constituencies
SET
  delimitation_regime_id = 'eci_delimitation_2014_ap_ts',
  valid_from = '2014-06-02'::date,
  updated_at = now()
WHERE state_code IN ('TS', 'AP');

UPDATE public.constituency_versions cv
SET
  delimitation_regime_id = 'eci_delimitation_2014_ap_ts',
  version_code = c.canonical_code || '-2014',
  valid_from = '2014-06-02'::date,
  updated_at = now()
FROM public.constituencies c
WHERE cv.constituency_internal_id = c.internal_id AND c.state_code IN ('TS', 'AP');

UPDATE public.parliamentary_constituencies
SET
  delimitation_regime_id = 'eci_delimitation_2014_ap_ts',
  valid_from = '2014-06-02'::date,
  updated_at = now()
WHERE state_code IN ('TS', 'AP');

UPDATE public.parliamentary_constituency_versions pcv
SET
  delimitation_regime_id = 'eci_delimitation_2014_ap_ts',
  version_code = pc.code || '-2014',
  valid_from = '2014-06-02'::date,
  updated_at = now()
FROM public.parliamentary_constituencies pc
WHERE pcv.pc_id = pc.id AND pc.state_code IN ('TS', 'AP');

-- 3.3 Dadra & Nagar Haveli and Daman & Diu Merger Alignment (2019 Act)
UPDATE public.parliamentary_constituencies
SET
  delimitation_regime_id = 'eci_delimitation_2019_dnh_dd',
  valid_from = '2020-01-26'::date,
  updated_at = now()
WHERE state_code = 'DN';

UPDATE public.parliamentary_constituency_versions pcv
SET
  delimitation_regime_id = 'eci_delimitation_2019_dnh_dd',
  version_code = pc.code || '-2019',
  valid_from = '2020-01-26'::date,
  updated_at = now()
FROM public.parliamentary_constituencies pc
WHERE pcv.pc_id = pc.id AND pc.state_code = 'DN';

-- ─── 4. CANONICAL CONSTITUENCY LINEAGE TABLE ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.constituency_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  target_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  relationship_type VARCHAR(50) NOT NULL CHECK (
    relationship_type IN (
      'CONTINUES_AS',
      'RENAMED_AS',
      'RENUMBERED_AS',
      'REPLACED_BY',
      'SPLIT_INTO',
      'MERGED_INTO',
      'ABOLISHED'
    )
  ),
  effective_date DATE NOT NULL,
  source_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  evidence_record_id UUID REFERENCES public.evidence_records(id) ON DELETE SET NULL,
  data_status VARCHAR(50) NOT NULL DEFAULT 'RECONCILED' CHECK (
    data_status IN ('PRESENT', 'RECONCILED', 'VERIFIED', 'PROVISIONAL', 'CONFLICTING', 'MISSING')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_constituency_lineage UNIQUE (
    source_constituency_version_id, target_constituency_version_id, relationship_type, effective_date
  ),
  CONSTRAINT chk_constituency_lineage_no_self_link CHECK (
    source_constituency_version_id <> target_constituency_version_id
  )
);

CREATE INDEX IF NOT EXISTS idx_constituency_lineage_source ON public.constituency_lineage(source_constituency_version_id);
CREATE INDEX IF NOT EXISTS idx_constituency_lineage_target ON public.constituency_lineage(target_constituency_version_id);
CREATE INDEX IF NOT EXISTS idx_constituency_lineage_rel ON public.constituency_lineage(relationship_type);
CREATE INDEX IF NOT EXISTS idx_constituency_lineage_date ON public.constituency_lineage(effective_date);

ALTER TABLE public.constituency_lineage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read constituency_lineage" ON public.constituency_lineage;
CREATE POLICY "Public read constituency_lineage" ON public.constituency_lineage FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Service role write constituency_lineage" ON public.constituency_lineage;
CREATE POLICY "Service role write constituency_lineage" ON public.constituency_lineage FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 5. TEMPORAL PC <-> AC MAPPINGS TABLE ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.constituency_parliamentary_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_constituency_version_id UUID NOT NULL REFERENCES public.constituency_versions(id) ON DELETE RESTRICT,
  parliamentary_constituency_version_id UUID NOT NULL REFERENCES public.parliamentary_constituency_versions(id) ON DELETE RESTRICT,
  delimitation_regime_id VARCHAR(50) NOT NULL REFERENCES public.delimitation_regimes(id) ON DELETE RESTRICT,
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_current BOOLEAN NOT NULL DEFAULT true,
  source_dataset_version_id TEXT NOT NULL REFERENCES public.dataset_versions(id) ON DELETE RESTRICT,
  evidence_record_id UUID REFERENCES public.evidence_records(id) ON DELETE SET NULL,
  data_status VARCHAR(50) NOT NULL DEFAULT 'RECONCILED' CHECK (
    data_status IN ('PRESENT', 'RECONCILED', 'VERIFIED', 'PROVISIONAL', 'CONFLICTING', 'MISSING')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ac_pc_version_mapping UNIQUE (
    assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from
  )
);

CREATE INDEX IF NOT EXISTS idx_cpm_ac_version ON public.constituency_parliamentary_mappings(assembly_constituency_version_id);
CREATE INDEX IF NOT EXISTS idx_cpm_pc_version ON public.constituency_parliamentary_mappings(parliamentary_constituency_version_id);
CREATE INDEX IF NOT EXISTS idx_cpm_current ON public.constituency_parliamentary_mappings(assembly_constituency_version_id) WHERE is_current = true;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cpm_single_current_ac ON public.constituency_parliamentary_mappings(assembly_constituency_version_id) WHERE is_current = true;

ALTER TABLE public.constituency_parliamentary_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read constituency_parliamentary_mappings" ON public.constituency_parliamentary_mappings;
CREATE POLICY "Public read constituency_parliamentary_mappings" ON public.constituency_parliamentary_mappings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Service role write constituency_parliamentary_mappings" ON public.constituency_parliamentary_mappings;
CREATE POLICY "Service role write constituency_parliamentary_mappings" ON public.constituency_parliamentary_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ─── 6. SEED VERIFIED PC <-> AC MAPPINGS WITH STRICT PROVENANCE ───────────────

-- 6.1 Telangana (119 ACs -> 17 PCs per AP Reorganisation Act 2014 & Delimitation Order 2008 Schedule XXXI)
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id,
  parliamentary_constituency_version_id,
  delimitation_regime_id,
  effective_from,
  effective_to,
  is_current,
  source_dataset_version_id,
  data_status,
  notes
)
SELECT
  cv.id,
  pcv.id,
  'eci_delimitation_2014_ap_ts',
  '2014-06-02'::date,
  NULL,
  true,
  'eci_national_ac_2008_v1',
  'VERIFIED',
  'Statutory mapping established under AP Reorganisation Act 2014 & Delimitation Order 2008 Schedule XXXI'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
JOIN public.parliamentary_constituencies pc ON c.parliamentary_constituency_id = pc.id
JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
WHERE c.state_code = 'TS' AND c.parliamentary_constituency_id IS NOT NULL
ON CONFLICT (assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from) DO UPDATE SET
  is_current = EXCLUDED.is_current,
  data_status = EXCLUDED.data_status,
  updated_at = now();

-- 6.2 Single-PC States & UTs (100% Statutory Whole-State PC Coverage)
-- Mizoram (40 ACs in MZ-PC-01)
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from, effective_to, is_current, source_dataset_version_id, data_status, notes
)
SELECT
  cv.id, pcv.id, 'eci_delimitation_2008', '2008-02-19'::date, NULL, true, 'eci_national_ac_2008_v1', 'VERIFIED', 'All 40 Mizoram ACs comprise single PC MZ-PC-01 per Delimitation Order 2008'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
CROSS JOIN (
  SELECT pcv.id FROM public.parliamentary_constituencies pc
  JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
  WHERE pc.code = 'MZ-PC-01'
) pcv
WHERE c.state_code = 'MZ'
ON CONFLICT DO NOTHING;

-- Nagaland (60 ACs in NL-PC-01)
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from, effective_to, is_current, source_dataset_version_id, data_status, notes
)
SELECT
  cv.id, pcv.id, 'eci_delimitation_2008', '2008-02-19'::date, NULL, true, 'eci_national_ac_2008_v1', 'VERIFIED', 'All 60 Nagaland ACs comprise single PC NL-PC-01 per Delimitation Order 2008'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
CROSS JOIN (
  SELECT pcv.id FROM public.parliamentary_constituencies pc
  JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
  WHERE pc.code = 'NL-PC-01'
) pcv
WHERE c.state_code = 'NL'
ON CONFLICT DO NOTHING;

-- Puducherry (30 ACs in PY-PC-01)
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from, effective_to, is_current, source_dataset_version_id, data_status, notes
)
SELECT
  cv.id, pcv.id, 'eci_delimitation_2008', '2008-02-19'::date, NULL, true, 'eci_national_ac_2008_v1', 'VERIFIED', 'All 30 Puducherry ACs comprise single PC PY-PC-01 per Delimitation Order 2008'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
CROSS JOIN (
  SELECT pcv.id FROM public.parliamentary_constituencies pc
  JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
  WHERE pc.code = 'PY-PC-01'
) pcv
WHERE c.state_code = 'PY'
ON CONFLICT DO NOTHING;

-- Sikkim (32 ACs in SK-PC-01)
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from, effective_to, is_current, source_dataset_version_id, data_status, notes
)
SELECT
  cv.id, pcv.id, 'eci_delimitation_2008', '2008-02-19'::date, NULL, true, 'eci_national_ac_2008_v1', 'VERIFIED', 'All 32 Sikkim ACs comprise single PC SK-PC-01 per Delimitation Order 2008'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
CROSS JOIN (
  SELECT pcv.id FROM public.parliamentary_constituencies pc
  JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
  WHERE pc.code = 'SK-PC-01'
) pcv
WHERE c.state_code = 'SK'
ON CONFLICT DO NOTHING;

-- 6.3 Goa (40 ACs across 2 PCs per Delimitation Order 2008 Schedule VI)
-- North Goa (GA-PC-01): ACs 1 to 20
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from, effective_to, is_current, source_dataset_version_id, data_status, notes
)
SELECT
  cv.id, pcv.id, 'eci_delimitation_2008', '2008-02-19'::date, NULL, true, 'eci_national_ac_2008_v1', 'VERIFIED', 'Goa AC 1-20 belong to North Goa PC GA-PC-01 per Delimitation Order 2008'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
CROSS JOIN (
  SELECT pcv.id FROM public.parliamentary_constituencies pc
  JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
  WHERE pc.code = 'GA-PC-01'
) pcv
WHERE c.state_code = 'GA' AND c.ac_no BETWEEN 1 AND 20
ON CONFLICT DO NOTHING;

-- South Goa (GA-PC-02): ACs 21 to 40
INSERT INTO public.constituency_parliamentary_mappings (
  assembly_constituency_version_id, parliamentary_constituency_version_id, delimitation_regime_id, effective_from, effective_to, is_current, source_dataset_version_id, data_status, notes
)
SELECT
  cv.id, pcv.id, 'eci_delimitation_2008', '2008-02-19'::date, NULL, true, 'eci_national_ac_2008_v1', 'VERIFIED', 'Goa AC 21-40 belong to South Goa PC GA-PC-02 per Delimitation Order 2008'
FROM public.constituencies c
JOIN public.constituency_versions cv ON c.internal_id = cv.constituency_internal_id AND cv.is_current = true
CROSS JOIN (
  SELECT pcv.id FROM public.parliamentary_constituencies pc
  JOIN public.parliamentary_constituency_versions pcv ON pc.id = pcv.pc_id AND pcv.is_current = true
  WHERE pc.code = 'GA-PC-02'
) pcv
WHERE c.state_code = 'GA' AND c.ac_no BETWEEN 21 AND 40
ON CONFLICT DO NOTHING;

-- ─── 7. ENHANCE MIGRATION CONFLICTS SCHEMA (SECTION 14 SPECIFICATION) ─────────

ALTER TABLE public.migration_conflicts
  ADD COLUMN IF NOT EXISTS source_dataset_version_id TEXT REFERENCES public.dataset_versions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS field_name TEXT,
  ADD COLUMN IF NOT EXISTS observed_value JSONB,
  ADD COLUMN IF NOT EXISTS expected_value JSONB,
  ADD COLUMN IF NOT EXISTS conflict_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS resolution_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS resolver TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS evidence_record_id UUID REFERENCES public.evidence_records(id) ON DELETE SET NULL;

-- Backfill structured audit attributes for the 3 reconciled seed anomalies
UPDATE public.migration_conflicts
SET
  source_dataset_version_id = 'eci_national_pc_2008_v1',
  entity_id = 'HP-PC-04',
  field_name = 'state_code',
  observed_value = '"UP"'::jsonb,
  expected_value = '"HP"'::jsonb,
  conflict_type = 'STATE_MISATTRIBUTION',
  resolution_method = 'STATUTORY_RECONCILIATION',
  resolver = 'CTO_W021_5_AUDIT',
  resolved_at = now()
WHERE source_record_id = 'LS_Hamirpur_HP';

UPDATE public.migration_conflicts
SET
  source_dataset_version_id = 'eci_national_pc_2008_v1',
  entity_id = 'UP-PC-63',
  field_name = 'state_code',
  observed_value = '"BR"'::jsonb,
  expected_value = '"UP"'::jsonb,
  conflict_type = 'STATE_MISATTRIBUTION',
  resolution_method = 'STATUTORY_RECONCILIATION',
  resolver = 'CTO_W021_5_AUDIT',
  resolved_at = now()
WHERE source_record_id = 'LS_Maharajganj_UP';

UPDATE public.migration_conflicts
SET
  source_dataset_version_id = 'eci_national_pc_2008_v1',
  entity_id = 'BR-PC-37',
  field_name = 'state_code',
  observed_value = '"MH"'::jsonb,
  expected_value = '"BR"'::jsonb,
  conflict_type = 'STATE_MISATTRIBUTION',
  resolution_method = 'STATUTORY_RECONCILIATION',
  resolver = 'CTO_W021_5_AUDIT',
  resolved_at = now()
WHERE source_record_id = 'LS_Aurangabad_BR';

COMMIT;
