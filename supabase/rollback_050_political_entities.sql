-- ==============================================================================
-- Rollback Script: 050_political_entity_model.sql
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- ==============================================================================

BEGIN;

DROP FUNCTION IF EXISTS public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.fn_resolve_canonical_person(TEXT, TEXT);

DROP TABLE IF EXISTS public.person_identity_linkages CASCADE;
DROP TABLE IF EXISTS public.elected_tenures CASCADE;
DROP TABLE IF EXISTS public.candidacies CASCADE;
DROP TABLE IF EXISTS public.person_roles CASCADE;
DROP TABLE IF EXISTS public.political_organizations CASCADE;
DROP TABLE IF EXISTS public.canonical_persons CASCADE;

COMMIT;
