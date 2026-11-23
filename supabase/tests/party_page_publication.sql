BEGIN;
SET LOCAL lock_timeout = '3s';

DO $$
DECLARE
  owner_id uuid := '3000d0c1-b047-4dab-aa53-249975320420';
  publisher_id uuid := '3000d0c1-b047-4dab-aa53-249975320421';
  reviewer_id uuid := '3000d0c1-b047-4dab-aa53-249975320422';
  org_id text := 'ORG-PARTY-ROLLBACK-PUBLICATION';
  claim_id uuid;
  test_page_id uuid;
  entry public.posts%ROWTYPE;
  video public.political_shorts%ROWTYPE;
BEGIN
  INSERT INTO auth.users(id, email, raw_app_meta_data)
  VALUES (owner_id,'rollback-publication-owner@example.test','{}'),
    (publisher_id,'rollback-publication-publisher@example.test','{}'),
    (reviewer_id,'rollback-publication-reviewer@example.test','{"role":"admin"}');
  INSERT INTO public.creator_kyc_records(user_id,full_legal_name,phone_number,status,verified_at)
  VALUES (owner_id,'Rollback page owner','+919000005603','verified',now()),
    (publisher_id,'Rollback publisher','+919000005604','verified',now());
  INSERT INTO public.political_organizations(id,org_type,name,short_name,provenance_id)
  VALUES (org_id,'political_party','Rollback publication test','RPT','7d585ccd-a8aa-4f0a-a6c5-26847dd8392f');
  INSERT INTO public.party_page_claims (organization_id, claimant_id, evidence_url, authority_summary)
  VALUES (org_id,owner_id,'https://example.test/authority','Rollback publication check uses no persisted fixtures')
  RETURNING id INTO claim_id;
  test_page_id := public.review_party_page_claim(claim_id,reviewer_id,'approved','Rollback test verifies the approved workflow');

  BEGIN
    INSERT INTO public.posts(author_id,type,content,publisher_page_id,review_status)
    VALUES (publisher_id,'discussion','Unauthorized rollback check',test_page_id,'pending');
    RAISE EXCEPTION 'Nonmember posted as the party';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM public.set_party_page_team_role(org_id,owner_id,publisher_id,'publisher');
  SELECT * INTO entry FROM public.create_post_with_media(
    jsonb_build_object('content','Party publication rollback check','type','discussion','author_id',publisher_id,
      'language','en','publisher_page_id',test_page_id),
    '[{"mediaType":"link","url":"https://example.test/rollback"}]'
  );
  IF entry.publisher_page_id IS DISTINCT FROM test_page_id OR entry.author_id IS DISTINCT FROM publisher_id
    OR entry.review_status <> 'pending' THEN
    RAISE EXCEPTION 'Feed post lost its Page, responsible person, or review state';
  END IF;

  BEGIN
    PERFORM public.review_creator_post(entry.id,owner_id,'approved',entry.updated_at);
    RAISE EXCEPTION 'Page owner reviewed own team submission';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM public.review_creator_post(entry.id,reviewer_id,'approved',entry.updated_at);
  IF NOT EXISTS (SELECT FROM public.feed_posts_with_publisher
    WHERE id = entry.id AND review_status = 'approved' AND publisher_party_id = org_id AND publisher_verified) THEN
    RAISE EXCEPTION 'Approved Feed publication was not linked to its verified party';
  END IF;

  INSERT INTO public.political_shorts(title,video_url,channel_name,uploaded_by,state_code,publisher_page_id,status)
  VALUES ('Rollback publication check', 'rollback/short.mp4', 'Rollback publication test', publisher_id,'TS',test_page_id,'pending')
  RETURNING * INTO video;
  BEGIN
    PERFORM public.review_creator_short(video.id,owner_id,'approved',video.updated_at);
    RAISE EXCEPTION 'Page owner reviewed own team Short';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM public.review_creator_short(video.id,reviewer_id,'approved',video.updated_at);
  IF NOT EXISTS (SELECT FROM public.political_shorts
    WHERE id = video.id AND status = 'approved' AND publisher_page_id = test_page_id AND uploaded_by = publisher_id) THEN
    RAISE EXCEPTION 'Short publication lost its original Page or responsible person';
  END IF;
  IF (SELECT count(*) FROM public.audit_log
    WHERE actor_id = publisher_id AND action = 'party_page_content_submitted') <> 2 THEN
    RAISE EXCEPTION 'Submission audit did not persist';
  END IF;

  PERFORM public.set_page_follow(test_page_id, reviewer_id, true);
  PERFORM set_config('request.jwt.claim.sub', reviewer_id::text, true);
  IF NOT EXISTS (SELECT FROM public.feed_posts_with_publisher WHERE id = entry.id AND follows_publisher) THEN
    RAISE EXCEPTION 'The approved post did not appear in its follower feed';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  IF EXISTS (SELECT FROM public.feed_posts_with_publisher WHERE id = entry.id AND follows_publisher) THEN
    RAISE EXCEPTION 'One member inherited another member''s Page follows';
  END IF;
  PERFORM public.set_page_follow(test_page_id, reviewer_id, false);
  PERFORM set_config('request.jwt.claim.sub', reviewer_id::text, true);
  IF EXISTS (SELECT FROM public.feed_posts_with_publisher WHERE id = entry.id AND follows_publisher) THEN
    RAISE EXCEPTION 'Unfollow did not remove the approved post from the followed Page feed';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '', true);

  PERFORM public.set_party_page_team_role(org_id,owner_id,publisher_id,NULL);
  BEGIN
    UPDATE public.posts SET content = 'Unauthorized edit after revocation' WHERE id = entry.id;
    RAISE EXCEPTION 'Former publisher still edited the post';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF public.can_publish_for_party_page(test_page_id,publisher_id) THEN
    RAISE EXCEPTION 'Role revocation did not remove Page publishing access';
  END IF;
END;
$$;

SELECT 'party_content_checks_passed' AS result;
ROLLBACK;
