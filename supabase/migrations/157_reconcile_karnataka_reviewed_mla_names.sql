BEGIN;

-- The Assembly and ECI give the same 2023 person, constituency and party.
-- Keep the established person IDs and the old aliases. No legacy filing or
-- candidacy is used as the current-tenure evidence.
CREATE TEMP TABLE reviewed_ka_display_names (
  ac_no integer PRIMARY KEY, person_id uuid NOT NULL UNIQUE, stored_name text NOT NULL,
  reviewed_name text NOT NULL, party_code text NOT NULL
) ON COMMIT DROP;
INSERT INTO reviewed_ka_display_names VALUES
  (29, '0215b22d-0001-0000-0000-000000002156', 'M B Patil', 'M B Patil', 'INC'),
  (129, '0215b22d-0001-0000-0000-000000002225', 'S Shadakshari', 'K Shadakshari', 'INC'),
  (155, '0215b22d-0001-0000-0000-000000002094', 'Muniraju Jr', 'S Muniraju', 'BJP');

LOCK TABLE public.canonical_persons, public.elected_tenures IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF (SELECT count(*) FROM reviewed_ka_display_names r
      JOIN public.canonical_persons p ON p.id=r.person_id
        AND p.metadata->>'stateContext'='KA' AND p.canonical_name IN (r.stored_name,r.reviewed_name)
      JOIN public.constituencies c ON c.state_code='KA' AND c.ac_no=r.ac_no
        AND c.primary_dataset_version_id='eci_karnataka_schedule_xiv_2026_11_27') <> 3
    OR EXISTS (
      SELECT 1 FROM reviewed_ka_display_names r
      JOIN public.canonical_persons p ON p.id <> r.person_id AND p.metadata->>'stateContext'='KA'
      WHERE EXISTS (
        SELECT 1 FROM unnest(array_prepend(p.canonical_name, p.aliases)) AS n(name)
        WHERE regexp_replace(lower(n.name), '[^a-z0-9]', '', 'g') =
          regexp_replace(lower(r.reviewed_name), '[^a-z0-9]', '', 'g')
      )
    ) OR EXISTS (
      SELECT 1 FROM reviewed_ka_display_names r
      JOIN public.elected_tenures t ON t.office_type='mla' AND t.jurisdiction_type='assembly_constituency'
        AND (t.jurisdiction_id='KA-AC-' || r.ac_no OR t.person_id=r.person_id)
        AND (t.is_current OR t.term_start=DATE '2023-05-22')
      WHERE t.person_id <> r.person_id OR t.jurisdiction_id <> 'KA-AC-' || r.ac_no
        OR NOT t.is_current OR t.term_start <> DATE '2023-05-22'
        OR t.party_at_election IS DISTINCT FROM 'ORG-PARTY-' || r.party_code
        OR t.current_party IS DISTINCT FROM 'ORG-PARTY-' || r.party_code
    )
  THEN
    RAISE EXCEPTION 'Review a conflicting Karnataka person, seat or tenure';
  END IF;
END $$;

UPDATE public.canonical_persons p
SET canonical_name=r.reviewed_name,
    aliases=CASE WHEN r.stored_name=ANY(p.aliases) THEN p.aliases ELSE array_append(p.aliases,r.stored_name) END,
    updated_at=now()
FROM reviewed_ka_display_names r
WHERE p.id=r.person_id AND p.canonical_name<>r.reviewed_name;

INSERT INTO public.elected_tenures (
  person_id, office_type, jurisdiction_type, jurisdiction_id, constituency_version_id,
  term_start, is_current, tenure_status, party_at_election, current_party, data_status, provenance_id
)
SELECT r.person_id, 'mla', 'assembly_constituency', c.id, c.current_version_id,
       DATE '2023-05-22', TRUE, 'ACTIVE', 'ORG-PARTY-' || r.party_code, 'ORG-PARTY-' || r.party_code,
       'OFFICIAL', 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
FROM reviewed_ka_display_names r
JOIN public.constituencies c ON c.state_code='KA' AND c.ac_no=r.ac_no
WHERE NOT EXISTS (
  SELECT 1 FROM public.elected_tenures t WHERE t.office_type='mla'
    AND t.jurisdiction_type='assembly_constituency' AND t.jurisdiction_id=c.id
    AND t.term_start=DATE '2023-05-22'
);

COMMIT;
