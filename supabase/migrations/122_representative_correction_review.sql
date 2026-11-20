-- Review through the staff API and apply a verified correction to the existing row.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.representative_edits FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.review_representative_correction(
  p_edit_id bigint, p_reviewer uuid, p_decision text, p_note text
) RETURNS boolean LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  edit public.representative_edits%ROWTYPE;
  rep public.representatives%ROWTYPE;
  field record;
  stored_value text;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') OR p_reviewer IS NULL
    OR COALESCE(char_length(trim(p_note)), 0) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'A reviewer and an evidence note are required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO edit FROM public.representative_edits WHERE id = p_edit_id FOR UPDATE;
  IF NOT FOUND OR edit.moderation_status <> 'pending' THEN RETURN false; END IF;
  IF edit.editor_user_id = p_reviewer THEN
    RAISE EXCEPTION 'A second reviewer is required' USING ERRCODE = '42501';
  END IF;

  IF p_decision = 'approved' THEN
    IF NOT edit.editor_kyc_verified OR edit.source_url !~ '^https://' OR edit.source_url IS NULL
      OR jsonb_typeof(edit.diff) <> 'object' OR edit.diff = '{}'::jsonb THEN
      RAISE EXCEPTION 'A verified contributor and an HTTPS citation are required' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO STRICT rep FROM public.representatives WHERE id = edit.representative_id FOR UPDATE;
    FOR field IN SELECT key, value FROM jsonb_each(edit.diff) LOOP
      stored_value := CASE field.key
        WHEN 'name' THEN rep.name WHEN 'photoUrl' THEN rep.photo_url WHEN 'party' THEN rep.party
        WHEN 'phone' THEN rep.phone WHEN 'email' THEN rep.email END;
      IF field.key NOT IN ('name','photoUrl','party','phone','email')
        OR jsonb_typeof(field.value) <> 'object' OR NOT field.value ? 'from' OR NOT field.value ? 'to'
        OR jsonb_typeof(field.value->'to') NOT IN ('null','string')
        OR (field.key = 'name' AND COALESCE(char_length(field.value->>'to'), 0) NOT BETWEEN 2 AND 160)
        OR (field.key = 'party' AND NOT rep.party_official)
        OR (field.key = 'photoUrl' AND (field.value->>'to') !~ '^https://')
      THEN
        RAISE EXCEPTION 'Unsupported or invalid correction field' USING ERRCODE = '22023';
      END IF;
      IF NULLIF(stored_value, '') IS DISTINCT FROM NULLIF(field.value->>'from', '') THEN
        RAISE EXCEPTION 'The profile changed after the submission' USING ERRCODE = '40001';
      END IF;
    END LOOP;

    UPDATE public.representatives SET
      name = CASE WHEN edit.diff ? 'name' THEN edit.diff->'name'->>'to' ELSE rep.name END,
      party = CASE WHEN edit.diff ? 'party' THEN edit.diff->'party'->>'to' ELSE rep.party END,
      photo_url = CASE WHEN edit.diff ? 'photoUrl' THEN edit.diff->'photoUrl'->>'to' ELSE rep.photo_url END,
      phone = CASE WHEN edit.diff ? 'phone' THEN edit.diff->'phone'->>'to' ELSE rep.phone END,
      email = CASE WHEN edit.diff ? 'email' THEN edit.diff->'email'->>'to' ELSE rep.email END
    WHERE id = edit.representative_id;
  END IF;

  UPDATE public.representative_edits
  SET moderation_status = p_decision, moderated_by = p_reviewer, moderated_at = now(), moderation_note = p_note
  WHERE id = p_edit_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.review_representative_correction(bigint,uuid,text,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_representative_correction(bigint,uuid,text,text) TO service_role;

-- Keep the profile on the same directory reader as the election archive.
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
      SELECT jsonb_build_object('total', count(*), 'electionYear', max(election_year)) FROM scoped
    )
    WHEN 'districts' THEN (
      SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.name), '[]'::jsonb)
      FROM (
        SELECT min(district) AS name, district_slug AS "districtKey",
          count(DISTINCT gp_key) AS "gpCount",
          count(*) FILTER (WHERE office_type = 'sarpanch') AS "sarpanchCount",
          count(*) FILTER (WHERE office_type = 'gp_ward_member') AS "wardCount"
        FROM scoped GROUP BY district_slug
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
        'gpKey', gp_key,
        'photoUrl', CASE WHEN p_view = 'representative' THEN photo_url END,
        'phone', CASE WHEN p_view = 'representative' THEN phone END,
        'email', CASE WHEN p_view = 'representative' THEN email END
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
