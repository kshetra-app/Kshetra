-- Reuse the organization registry and Pages. Election-report abbreviations are
-- resolved against the exact source and year before considering legacy aliases.
ALTER TABLE public.organization_aliases ADD COLUMN source_url text;
ALTER TABLE public.organization_aliases ADD CONSTRAINT organization_alias_source_https
  CHECK (source_url IS NULL OR source_url LIKE 'https://%');

CREATE OR REPLACE FUNCTION public.fn_validate_org_alias_temporal_invariants()
RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(6401, pg_catalog.hashtext(
    jsonb_build_array(NEW.raw_lookup_key, NEW.jurisdiction_scope, NEW.source_url)::text
  ));
  IF EXISTS (
    SELECT FROM public.organization_aliases other
    WHERE other.id <> NEW.id AND other.raw_lookup_key = NEW.raw_lookup_key
      AND other.jurisdiction_scope IS NOT DISTINCT FROM NEW.jurisdiction_scope
      AND other.source_url IS NOT DISTINCT FROM NEW.source_url
      AND daterange(other.valid_from, other.valid_to, '[]') &&
          daterange(NEW.valid_from, NEW.valid_to, '[]')
  ) THEN
    RAISE EXCEPTION 'Organization alias overlaps another alias in the same source and jurisdiction'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.dataset_versions
  (id, dataset_id, version_tag, effective_from, default_status, record_count, metadata)
VALUES ('eci_political_parties_ts_2023_report', 'eci_political_parties',
  'telangana_2023_codes_reconciled', '2023-12-03', 'OFFICIAL', 6,
  '{"scope":"Six individually reconciled abbreviations from the Telangana 2023 statistical report"}');

INSERT INTO public.provenance_records (id, dataset_version_id, status, transformation_type, metadata)
VALUES ('7d585ccd-a8aa-4f0a-a6c5-26847dd8392f', 'eci_political_parties_ts_2023_report', 'OFFICIAL', 'manual_reconciliation',
  jsonb_build_object(
    'sourceUrl', 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/List_Of_Political_Parties_Participated.pdf',
    'sourceTitle', 'Election Commission of India, Telangana 2023 list of political parties participated'
  ));

INSERT INTO public.political_organizations (id, org_type, name, short_name, provenance_id)
VALUES
  ('ORG-PARTY-BAHUJANA-RASHTRA-SAMITHI', 'political_party', 'Bahujana Rashtra Samithi', 'BRS (Bahujana)', '7d585ccd-a8aa-4f0a-a6c5-26847dd8392f'),
  ('ORG-PARTY-CPI-ML-RED-STAR', 'political_party', 'Communist Party of India (Marxist-Leninist) Red Star', 'CPI (ML) Red Star', '7d585ccd-a8aa-4f0a-a6c5-26847dd8392f'),
  ('ORG-PARTY-JATIYA-JANA-SENA', 'political_party', 'Jatiya Jana Sena Party', 'JJSP', '7d585ccd-a8aa-4f0a-a6c5-26847dd8392f');

INSERT INTO public.organization_aliases
  (raw_lookup_key, raw_original_string, organization_id, alias_type, jurisdiction_scope, valid_from, valid_to, provenance_id, source_url)
SELECT lower(code), code, org_id, 'ECI_PARTY_CODE', 'TS', '2023-01-01'::date,
  '2023-12-31'::date, '7d585ccd-a8aa-4f0a-a6c5-26847dd8392f'::uuid,
  'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/List_Of_Political_Parties_Participated.pdf'
FROM (VALUES
  ('BHRS','ORG-PARTY-BRS'), ('BRS','ORG-PARTY-BAHUJANA-RASHTRA-SAMITHI'),
  ('CPI(M)','ORG-PARTY-CPIM'), ('CPIM','ORG-PARTY-CPI-ML-RED-STAR'),
  ('JnP','ORG-PARTY-JSP'), ('JJSP','ORG-PARTY-JATIYA-JANA-SENA')
) AS report(code, org_id);

UPDATE public.political_organizations SET name = 'Janasena Party', updated_at = now()
WHERE id = 'ORG-PARTY-JSP' AND name = 'JSP';

-- The ECI hosts the TDP filing and the Janata Dal (United) constitution.
INSERT INTO public.provenance_records (id, dataset_version_id, status, transformation_type, metadata)
VALUES
  ('7d585ccd-a8aa-4f0a-a6c5-26847dd83930', 'eci_political_parties_2024_v1', 'OFFICIAL', 'manual_reconciliation',
    '{"sourceUrl":"https://www.eci.gov.in/eci-backend/public/pdf/report/November/1764227412.pdf","sourceTitle":"Telugu Desam Party Form 24-A"}'),
  ('7d585ccd-a8aa-4f0a-a6c5-26847dd83931', 'eci_political_parties_2024_v1', 'OFFICIAL', 'manual_reconciliation',
    '{"sourceUrl":"https://www.eci.gov.in/constitution-of-political-party","sourceTitle":"Janata Dal (United) party constitution"}');
UPDATE public.political_organizations SET name = 'Telugu Desam Party',
  provenance_id = '7d585ccd-a8aa-4f0a-a6c5-26847dd83930', updated_at = now()
WHERE id = 'ORG-PARTY-TDP' AND name = 'TDP';
UPDATE public.political_organizations SET name = 'Janata Dal (United)',
  provenance_id = '7d585ccd-a8aa-4f0a-a6c5-26847dd83931', updated_at = now()
WHERE id = 'ORG-PARTY-JDU' AND name = 'JDU';

CREATE FUNCTION public.resolve_party_report_code(p_code text, p_state text, p_date date, p_source_url text)
RETURNS text LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN count(DISTINCT organization_id) = 1 THEN min(organization_id) END
  FROM public.organization_aliases
  WHERE source_url = p_source_url AND jurisdiction_scope = p_state
    AND raw_lookup_key = lower(btrim(p_code))
    AND p_date BETWEEN valid_from AND coalesce(valid_to, 'infinity'::date)
    AND confidence = 'VERIFIED';
$$;

CREATE UNIQUE INDEX political_organizations_one_record_per_page
  ON public.political_organizations(page_id) WHERE page_id IS NOT NULL;

-- The claimant's evidence and the reviewer's independent verification notes
-- are private. A registry entry by itself does not confer Page authority.
CREATE TABLE public.party_page_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.political_organizations(id),
  claimant_id uuid NOT NULL REFERENCES auth.users(id),
  evidence_url text NOT NULL CHECK (evidence_url LIKE 'https://%' AND char_length(evidence_url) <= 2000),
  authority_summary text NOT NULL CHECK (char_length(btrim(authority_summary)) BETWEEN 20 AND 1200),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revoked')),
  reviewer_id uuid REFERENCES auth.users(id),
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX party_page_claim_one_pending_per_claimant
  ON public.party_page_claims(organization_id, claimant_id) WHERE status = 'pending';
CREATE UNIQUE INDEX party_page_claim_one_approved_per_party
  ON public.party_page_claims(organization_id) WHERE status = 'approved';

CREATE TABLE public.party_page_team (
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('editor','approver','publisher','moderator')),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page_id, user_id)
);

CREATE TABLE public.user_party_declarations (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id text NOT NULL REFERENCES public.political_organizations(id),
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.party_page_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_page_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_party_declarations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.party_page_claims, public.party_page_team, public.user_party_declarations
  FROM public, anon, authenticated;

ALTER TABLE public.aspirant_profiles ADD COLUMN party_id text REFERENCES public.political_organizations(id);
ALTER TABLE public.aspirant_profiles ADD CONSTRAINT independent_aspirants_no_declared_party
  CHECK (party_id IS NULL OR NOT is_independent);

-- Reconcile the original Page follows schema from migration 076.
CREATE TABLE IF NOT EXISTS public.page_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_page_followers_user ON public.page_followers(user_id);
ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.page_followers TO authenticated;
CREATE POLICY party_release_follow_own_rows ON public.page_followers
  AS RESTRICTIVE FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY party_release_follow_private_read ON public.page_followers
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.page_followers FROM public, anon, authenticated;

-- Full replays can already have the follower counter trigger from 076.
-- Retain one counter writer for all Pages, including cascading user deletion.
DROP TRIGGER IF EXISTS trg_sync_page_follower_count ON public.page_followers;
CREATE FUNCTION public.refresh_page_follower_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.pages SET follower_count = follower_count + 1 WHERE id = NEW.page_id;
  ELSE
    UPDATE public.pages SET follower_count = greatest(follower_count - 1, 0) WHERE id = OLD.page_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER page_follower_total_after_change AFTER INSERT OR DELETE ON public.page_followers
  FOR EACH ROW EXECUTE FUNCTION public.refresh_page_follower_total();

UPDATE public.pages page SET follower_count = (
  SELECT count(*) FROM public.page_followers follow WHERE follow.page_id = page.id
)
WHERE follower_count IS DISTINCT FROM (
  SELECT count(*) FROM public.page_followers follow WHERE follow.page_id = page.id
);

CREATE FUNCTION public.set_page_follow(p_page uuid, p_actor uuid, p_follow boolean)
RETURNS jsonb LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE selected_page public.pages%ROWTYPE;
BEGIN
  SELECT * INTO selected_page FROM public.pages WHERE id = p_page FOR UPDATE;
  IF NOT FOUND OR (p_follow AND selected_page.role = 'party' AND NOT EXISTS (
    SELECT FROM public.political_organizations org
    JOIN public.party_page_claims claim ON claim.organization_id = org.id
    WHERE org.page_id = p_page AND claim.status = 'approved'
  )) THEN
    RAISE EXCEPTION 'Page unavailable' USING ERRCODE = 'P0002';
  END IF;
  IF p_follow THEN
    INSERT INTO public.page_followers (page_id, user_id) VALUES (p_page, p_actor)
    ON CONFLICT (page_id, user_id) DO NOTHING;
  ELSE
    DELETE FROM public.page_followers WHERE page_id = p_page AND user_id = p_actor;
  END IF;
  RETURN (SELECT jsonb_build_object('pageId',id,'isFollowing',p_follow,'followerCount',follower_count)
    FROM public.pages WHERE id = p_page);
END;
$$;

CREATE FUNCTION public.review_party_page_claim(p_claim uuid, p_reviewer uuid, p_decision text, p_note text)
RETURNS uuid LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE claim public.party_page_claims%ROWTYPE;
DECLARE org public.political_organizations%ROWTYPE;
DECLARE target_page uuid;
BEGIN
  IF NOT EXISTS (SELECT FROM auth.users WHERE id = p_reviewer
    AND raw_app_meta_data->>'role' IN ('admin','super_admin','compliance_officer')) THEN
    RAISE EXCEPTION 'Party verification permission required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO claim FROM public.party_page_claims WHERE id = p_claim;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO org FROM public.political_organizations WHERE id = claim.organization_id
    AND org_type = 'political_party' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Party not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO claim FROM public.party_page_claims WHERE id = p_claim FOR UPDATE;
  IF claim.claimant_id = p_reviewer THEN
    RAISE EXCEPTION 'Claimants cannot review their own claim' USING ERRCODE = '42501';
  END IF;
  IF p_note IS NULL OR char_length(btrim(p_note)) NOT BETWEEN 20 AND 1600 THEN
    RAISE EXCEPTION 'Record the independent verification outcome' USING ERRCODE = '22023';
  END IF;

  target_page := org.page_id;
  IF p_decision = 'approved' AND claim.status = 'pending' THEN
    IF EXISTS (SELECT FROM public.party_page_claims WHERE organization_id = org.id AND status = 'approved') THEN
      RAISE EXCEPTION 'The party already has verified ownership' USING ERRCODE = '23505';
    END IF;
    IF NOT EXISTS (SELECT FROM public.creator_kyc_records WHERE user_id = claim.claimant_id AND status = 'verified') THEN
      RAISE EXCEPTION 'Claimant must complete contributor verification' USING ERRCODE = '23514';
    END IF;
    IF target_page IS NULL THEN
      INSERT INTO public.pages (owner_id, title, handle, role)
      VALUES (claim.claimant_id, left(org.name, 100), 'party-' || substr(md5(org.id), 1, 18), 'party')
      RETURNING id INTO target_page;
      UPDATE public.political_organizations SET page_id = target_page, updated_at = now() WHERE id = org.id;
    ELSE
      UPDATE public.pages SET owner_id = claim.claimant_id, updated_at = now()
        WHERE id = target_page AND role = 'party';
      IF NOT FOUND THEN RAISE EXCEPTION 'Existing Page has a different identity' USING ERRCODE = '23514'; END IF;
    END IF;
  ELSIF p_decision = 'revoked' AND claim.status = 'approved' THEN
    DELETE FROM public.party_page_team WHERE page_id = target_page;
  ELSIF p_decision IS DISTINCT FROM 'rejected' OR claim.status <> 'pending' THEN
    RAISE EXCEPTION 'Claim status has changed or decision is invalid' USING ERRCODE = '23514';
  END IF;

  UPDATE public.party_page_claims SET status = p_decision, reviewer_id = p_reviewer,
    review_note = btrim(p_note), reviewed_at = now() WHERE id = claim.id;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (p_reviewer, 'party_page_claim_' || p_decision, 'verification', claim.id::text,
    jsonb_build_object('status',claim.status),
    jsonb_build_object('status',p_decision,'partyId',org.id,'pageId',target_page,'claimantId',claim.claimant_id,
      'verificationNote',btrim(p_note)));
  RETURN target_page;
END;
$$;

CREATE FUNCTION public.set_party_page_team_role(p_org text, p_actor uuid, p_member uuid, p_role text)
RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target_page uuid;
DECLARE previous_role text;
BEGIN
  SELECT page_id INTO target_page FROM public.political_organizations WHERE id = p_org FOR UPDATE;
  IF NOT EXISTS (SELECT FROM public.pages p JOIN public.party_page_claims claim
    ON claim.organization_id = p_org AND claim.status = 'approved'
    WHERE p.id = target_page AND p.role = 'party' AND p.owner_id = p_actor
      AND claim.claimant_id = p_actor) OR p_actor = p_member THEN
    RAISE EXCEPTION 'Verified Page owner permission required' USING ERRCODE = '42501';
  END IF;
  SELECT role INTO previous_role FROM public.party_page_team WHERE page_id = target_page AND user_id = p_member;
  IF previous_role IS NOT DISTINCT FROM p_role THEN RETURN; END IF;
  IF p_role IS NULL THEN
    DELETE FROM public.party_page_team WHERE page_id = target_page AND user_id = p_member;
  ELSE
    IF NOT EXISTS (SELECT FROM public.creator_kyc_records WHERE user_id = p_member AND status = 'verified') THEN
      RAISE EXCEPTION 'Team member must complete contributor verification' USING ERRCODE = '23514';
    END IF;
    INSERT INTO public.party_page_team (page_id, user_id, role, granted_by)
    VALUES (target_page, p_member, p_role, p_actor)
    ON CONFLICT (page_id, user_id) DO UPDATE SET role = excluded.role, granted_by = excluded.granted_by;
  END IF;
  INSERT INTO public.audit_log(actor_id, action, entity_type, entity_id, old_value, new_value)
  VALUES (p_actor, 'party_page_team_role_changed', 'verification', target_page::text,
    jsonb_build_object('role',previous_role),
    jsonb_build_object('role',p_role,'memberId',p_member,'partyId',p_org));
END;
$$;

CREATE FUNCTION public.search_party_registry(p_query text, p_language text, p_offset integer)
RETURNS TABLE (
  id text, name text, short_name text, local_name text, symbol_url text, page_id uuid,
  source_url text
)
LANGUAGE sql STABLE SET search_path = '' AS $$
  WITH input AS (
    SELECT lower(btrim(coalesce(p_query,''))) AS query
  )
  SELECT org.id, org.name, org.short_name, preferred.name_value, org.symbol_url,
    CASE WHEN claim.id IS NOT NULL THEN org.page_id END, provenance.metadata->>'sourceUrl'
  FROM public.political_organizations org CROSS JOIN input
  LEFT JOIN public.provenance_records provenance ON provenance.id = org.provenance_id
  LEFT JOIN public.party_page_claims claim ON claim.organization_id = org.id AND claim.status = 'approved'
  LEFT JOIN LATERAL (
    SELECT name_value FROM public.organization_multilingual_names n
    WHERE n.organization_id = org.id AND n.language_code = p_language
      AND current_date BETWEEN n.valid_from AND coalesce(n.valid_to,'infinity'::date)
    ORDER BY n.is_preferred DESC, n.is_official DESC, n.name_value
    LIMIT 1
  ) preferred ON true
  WHERE org.org_type = 'political_party' AND org.provenance_id IS NOT NULL
    AND (strpos(lower(org.name), input.query) > 0 OR strpos(lower(org.short_name), input.query) > 0
      OR EXISTS (SELECT FROM public.organization_aliases a WHERE a.organization_id = org.id
        AND a.confidence IN ('VERIFIED','RECONCILED') AND strpos(a.raw_lookup_key, input.query) > 0)
      OR EXISTS (SELECT FROM public.organization_multilingual_names n WHERE n.organization_id = org.id
        AND (strpos(lower(n.name_value), input.query) > 0 OR strpos(lower(n.short_name_value), input.query) > 0)))
  ORDER BY (input.query <> '' AND input.query IN (lower(org.short_name),lower(org.name))) DESC, org.name, org.id
  LIMIT 31 OFFSET greatest(p_offset,0);
$$;

REVOKE ALL ON FUNCTION public.refresh_page_follower_total(),
  public.set_page_follow(uuid, uuid, boolean),
  public.review_party_page_claim(uuid, uuid, text, text),
  public.set_party_page_team_role(text, uuid, uuid, text),
  public.search_party_registry(text, text, integer)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_page_follow(uuid, uuid, boolean),
  public.review_party_page_claim(uuid, uuid, text, text),
  public.set_party_page_team_role(text, uuid, uuid, text),
  public.search_party_registry(text, text, integer) TO service_role;
