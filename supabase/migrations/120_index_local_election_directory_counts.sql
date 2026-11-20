BEGIN;

-- Cover the district and coverage aggregates without reading every representative profile.
CREATE INDEX IF NOT EXISTS representatives_sec_district_counts
  ON public.representatives(state_code, election_year DESC, district_slug, gp_key)
  INCLUDE (office_type, district)
  WHERE source_type = 'sec' AND data_status = 'verified' AND district_slug IS NOT NULL;

ANALYZE public.representatives;

CREATE OR REPLACE FUNCTION public.read_local_election_directory(
  p_view text, p_state text, p_district text, p_mandal text, p_id text
) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  WITH selected_year AS (
    SELECT max(election_year) AS year
    FROM public.representatives
    WHERE state_code = p_state AND source_type = 'sec' AND data_status = 'verified'
      AND district_slug IS NOT NULL AND office_type IN ('sarpanch', 'gp_ward_member')
  ),
  scoped AS NOT MATERIALIZED (
    SELECT r.*
    FROM public.representatives r
    WHERE r.source_type = 'sec' AND r.data_status = 'verified' AND r.district_slug IS NOT NULL
      AND (CASE WHEN p_view = 'representative' THEN r.id = p_id
        ELSE r.state_code = p_state AND r.election_year = (SELECT year FROM selected_year) END)
      AND (p_district IS NULL OR r.district_slug = p_district)
      AND (p_mandal IS NULL OR r.mandal_slug = p_mandal)
  )
  SELECT CASE p_view
    WHEN 'coverage' THEN (
      SELECT jsonb_build_object('total', count(*), 'electionYear', max(election_year))
      FROM public.representatives
      WHERE state_code = p_state AND election_year = (SELECT year FROM selected_year)
        AND source_type = 'sec' AND data_status = 'verified' AND district_slug IS NOT NULL
    )
    WHEN 'districts' THEN (
      SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.name), '[]'::jsonb)
      FROM (
        SELECT min(gp.district) AS name, gp.district_slug AS "districtKey",
          count(gp.gp_key) AS "gpCount", sum(gp.sarpanches)::bigint AS "sarpanchCount",
          sum(gp.wards)::bigint AS "wardCount"
        FROM (
          SELECT district_slug, gp_key, min(district) AS district,
            count(*) FILTER (WHERE office_type = 'sarpanch') AS sarpanches,
            count(*) FILTER (WHERE office_type = 'gp_ward_member') AS wards
          FROM public.representatives
          WHERE state_code = p_state AND election_year = (SELECT year FROM selected_year)
            AND source_type = 'sec' AND data_status = 'verified' AND district_slug IS NOT NULL
          GROUP BY district_slug, gp_key
        ) gp
        GROUP BY gp.district_slug
      ) d
    )
    WHEN 'mandals' THEN (
      SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m."mandalKey" = '__no_mandal__', m.name), '[]'::jsonb)
      FROM (
        SELECT coalesce(min(mandal), 'Other Gram Panchayats') AS name,
          mandal_slug AS "mandalKey", count(DISTINCT gp_key) AS "gpCount"
        FROM scoped
        WHERE mandal_slug IS NOT NULL AND office_type IN ('sarpanch', 'gp_ward_member', 'mptc_member')
        GROUP BY mandal_slug
      ) m
    )
    ELSE (
      SELECT coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', id, 'name', name, 'stateCode', state_code, 'officeType', office_type,
        'jurisdictionType', jurisdiction_type, 'jurisdictionId', jurisdiction_id,
        'district', district, 'mandal', mandal, 'gramPanchayat', gram_panchayat,
        'wardNo', ward_no, 'constituency', constituency, 'party', party,
        'partyOfficial', party_official, 'electedParty', elected_party,
        'gender', gender, 'reservation', reservation, 'electionYear', election_year,
        'isCurrent', is_current, 'officeholdingStatus', officeholding_status,
        'sourceType', source_type, 'sourceUrl', source_url, 'dataStatus', data_status,
        'gpKey', gp_key
      )) ORDER BY gram_panchayat, length(ward_no), ward_no, constituency, name, id), '[]'::jsonb)
      FROM scoped
      WHERE CASE p_view
        WHEN 'panchayats' THEN gp_key IS NOT NULL AND office_type IN ('sarpanch', 'gp_ward_member')
        WHEN 'mptc' THEN office_type = 'mptc_member'
        WHEN 'zptc' THEN office_type = 'zptc_member'
        WHEN 'representative' THEN true
        ELSE false END
    )
  END;
$$;

COMMIT;
