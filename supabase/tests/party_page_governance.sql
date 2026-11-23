BEGIN;
SET LOCAL lock_timeout = '3s';

DO $$
DECLARE
  owner_id uuid := '4a1caae8-f83f-419e-8f09-47d12210bb55';
  reviewer_id uuid := '4a1caae8-f83f-419e-8f09-47d12210bb56';
  member_id uuid := '4a1caae8-f83f-419e-8f09-47d12210bb57';
  org_id text := 'ORG-PARTY-TRANSACTION-CHECK';
  claim_id uuid;
  test_page_id uuid;
  tally jsonb;
  report_url text := 'https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/List_Of_Political_Parties_Participated.pdf';
BEGIN
  IF public.resolve_party_report_code('BRS','TS','2023-12-03',report_url) IS DISTINCT FROM 'ORG-PARTY-BAHUJANA-RASHTRA-SAMITHI'
    OR public.resolve_party_report_code('BHRS','TS','2023-12-03',report_url) IS DISTINCT FROM 'ORG-PARTY-BRS'
    OR public.resolve_party_report_code('CPIM','TS','2023-12-03',report_url) IS DISTINCT FROM 'ORG-PARTY-CPI-ML-RED-STAR'
    OR public.resolve_party_report_code('CPI(M)','TS','2023-12-03',report_url) IS DISTINCT FROM 'ORG-PARTY-CPIM'
    OR public.resolve_party_report_code('BRS','TS','2018-12-11',report_url) IS NOT NULL
    OR public.resolve_party_report_code('BRS','AP','2023-12-03',report_url) IS NOT NULL
    OR public.resolve_party_report_code('BRS','TS','2023-12-03','https://example.test/other') IS NOT NULL THEN
    RAISE EXCEPTION 'Report abbreviation identity is incorrect';
  END IF;
  IF NOT EXISTS (SELECT FROM public.search_party_registry('జనసేన','te',0) WHERE id = 'ORG-PARTY-JSP')
    OR NOT EXISTS (SELECT FROM public.search_party_registry('Janasena Party','en',0) WHERE id = 'ORG-PARTY-JSP')
    OR NOT EXISTS (SELECT FROM public.search_party_registry('JSP','en',0) WHERE id = 'ORG-PARTY-JSP') THEN
    RAISE EXCEPTION 'Shared party search failed';
  END IF;

  INSERT INTO auth.users(id, email, raw_app_meta_data)
  VALUES (owner_id,'party-rollback-owner@example.test','{}'),
    (reviewer_id,'party-rollback-reviewer@example.test','{"role":"admin"}'),
    (member_id,'party-rollback-member@example.test','{}');
  INSERT INTO public.creator_kyc_records(user_id,full_legal_name,phone_number,status,verified_at)
  VALUES (owner_id,'Rollback owner','+919000005501','verified',now()),
    (member_id,'Rollback member','+919000005502','verified',now());
  INSERT INTO public.political_organizations(id,org_type,name,short_name,provenance_id) VALUES
    (org_id,'political_party','Rollback transaction test','RTT','7d585ccd-a8aa-4f0a-a6c5-26847dd8392f');
  INSERT INTO public.party_page_claims (organization_id, claimant_id, evidence_url, authority_summary)
  VALUES (org_id,owner_id,'https://example.test/authority','Transactions are rolled back at the end of this check')
  RETURNING id INTO claim_id;

  BEGIN
    PERFORM public.review_party_page_claim(claim_id,owner_id,'approved','This caller cannot approve a claim');
    RAISE EXCEPTION 'Unprivileged reviewer was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  SET LOCAL ROLE service_role;
  test_page_id := public.review_party_page_claim(claim_id,reviewer_id,'approved','Verified within the rollback transaction only');
  RESET ROLE;
  IF test_page_id IS NULL THEN RAISE EXCEPTION 'Approval did not link a Page'; END IF;
  PERFORM public.set_party_page_team_role(org_id,owner_id,member_id,'publisher');
  IF NOT EXISTS (SELECT FROM public.party_page_team t WHERE t.page_id = test_page_id AND t.user_id = member_id AND t.role = 'publisher') THEN
    RAISE EXCEPTION 'Delegation did not persist';
  END IF;
  BEGIN
    PERFORM public.set_party_page_team_role(org_id,member_id,reviewer_id,'publisher');
    RAISE EXCEPTION 'Team member could escalate privileges';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  tally := public.set_page_follow(test_page_id,member_id,true);
  IF (tally->>'followerCount')::int <> 1 THEN RAISE EXCEPTION 'First follow count is incorrect'; END IF;
  tally := public.set_page_follow(test_page_id,member_id,true);
  IF (tally->>'followerCount')::int <> 1 THEN RAISE EXCEPTION 'Retry duplicated the follow'; END IF;
  tally := public.set_page_follow(test_page_id,member_id,false);
  IF (tally->>'followerCount')::int <> 0 THEN RAISE EXCEPTION 'Unfollow count is incorrect'; END IF;
  INSERT INTO public.user_party_declarations(user_id,organization_id) VALUES (member_id,org_id);
  IF EXISTS (SELECT FROM public.user_party_declarations WHERE user_id = member_id AND is_public) THEN
    RAISE EXCEPTION 'Affiliation defaults to public';
  END IF;
  UPDATE public.user_party_declarations SET is_public = true WHERE user_id = member_id;
  DELETE FROM public.user_party_declarations WHERE user_id = member_id;
  IF has_table_privilege('authenticated','public.user_party_declarations','SELECT')
    OR has_table_privilege('anon','public.party_page_claims','SELECT')
    OR has_function_privilege('authenticated','public.review_party_page_claim(uuid,uuid,text,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Private records or service operations were granted to public clients';
  END IF;
  PERFORM public.review_party_page_claim(claim_id,reviewer_id,'revoked','Verified revocation within rollback transaction');
  IF EXISTS (SELECT FROM public.party_page_team t WHERE t.page_id = test_page_id)
    OR EXISTS (SELECT FROM public.search_party_registry('Rollback transaction test','en',0) s WHERE s.page_id IS NOT NULL)
    OR (SELECT count(*) FROM public.audit_log WHERE actor_id IN (reviewer_id,owner_id)) <> 3 THEN
    RAISE EXCEPTION 'Revocation or audit did not persist';
  END IF;
END;
$$;

SELECT 'party_governance_checks_passed' AS result;
ROLLBACK;
