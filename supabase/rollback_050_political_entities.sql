-- ==============================================================================
-- Rollback Script: 050_political_entity_model.sql
-- Target: Staging Supabase (fkpigozcqnmcvofuksar)
-- ==============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_candidacies_immutable_fields ON public.candidacies;
DROP FUNCTION IF EXISTS public.fn_prevent_candidacy_mutation();

DROP TRIGGER IF EXISTS trg_elected_tenures_immutable_fields ON public.elected_tenures;
DROP FUNCTION IF EXISTS public.fn_prevent_tenure_history_mutation();

DROP FUNCTION IF EXISTS public.fn_get_tenure_party_at_date(UUID, DATE);
DROP FUNCTION IF EXISTS public.fn_link_person_identity(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.fn_resolve_canonical_person(TEXT, TEXT);

DROP TABLE IF EXISTS public.person_identity_linkages CASCADE;
DROP TABLE IF EXISTS public.tenure_party_switches CASCADE;
DROP TABLE IF EXISTS public.elected_tenures CASCADE;
DROP TABLE IF EXISTS public.candidacies CASCADE;
DROP TABLE IF EXISTS public.person_party_affiliations CASCADE;
DROP TABLE IF EXISTS public.person_roles CASCADE;
DROP TABLE IF EXISTS public.organization_relationships CASCADE;
DROP TABLE IF EXISTS public.political_organizations CASCADE;
DROP TABLE IF EXISTS public.canonical_persons CASCADE;

COMMIT;
