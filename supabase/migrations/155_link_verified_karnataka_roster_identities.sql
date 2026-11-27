-- Continue the Karnataka roster after reviewing constituency- and person-level
-- evidence from the Assembly roster and ECI 2023 Detailed Results.
-- Reuse existing canonical people for reviewed aliases. New people are guarded
-- against matching identities. Legacy affidavits retain their existing links.
BEGIN;

LOCK TABLE public.canonical_persons, public.elected_tenures IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE reviewed_ka_member_links (
  ac_no integer PRIMARY KEY, person_id uuid UNIQUE NOT NULL, canonical_name text NOT NULL,
  aliases text[] NOT NULL, gender text NOT NULL, party_code text, new_person boolean NOT NULL
) ON COMMIT DROP;
INSERT INTO reviewed_ka_member_links VALUES
  (54, '0215b22d-0001-0000-0000-000000004821', 'Dr Shivraj Patil', ARRAY['Dr Shivraj Patil'], 'male', 'BJP', FALSE),
  (62, '42134cdf-532f-5ebd-9d5b-54222702aeb9', 'G Janardhan Reddy', ARRAY['G Janardhan Reddy'], 'male', 'KRPP', TRUE),
  (70, '3431738a-35b1-5dc0-aebd-d77bd56f9e0a', 'M R Patil', ARRAY['M R Patil'], 'male', 'BJP', TRUE),
  (182, '0215b22d-0001-0000-0000-000000002212', 'H C Balakrishna', ARRAY['H C Balakrishna'], 'male', 'INC', FALSE),
  (198, '66161d3a-019b-599f-a38d-ba644d0643af', 'A Manju', ARRAY['A Manju'], 'male', 'JDS', TRUE),
  (213, '0215b22d-0001-0000-0000-000000004863', 'Anil Chikkamadu', ARRAY['Anil Chikkamadu'], 'male', 'INC', FALSE),
  (221, '490b8a3c-8d09-53e8-aeea-37026aaf734c', 'M R Manjunath', ARRAY['M R Manjunath'], 'male', 'JDS', TRUE);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.provenance_records WHERE id = 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
  ) OR (SELECT count(*) FROM public.constituencies
        WHERE state_code = 'KA' AND primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27') <> 224
  THEN
    RAISE EXCEPTION 'Review Karnataka geography and official roster evidence first';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviewed_ka_member_links r
    LEFT JOIN public.canonical_persons p ON p.id = r.person_id
    WHERE (p.id IS NULL AND NOT r.new_person)
       OR (p.id IS NOT NULL AND (p.canonical_name <> r.canonical_name
         OR p.metadata->>'stateContext' IS DISTINCT FROM 'KA'))
  ) THEN
    RAISE EXCEPTION 'A reviewed Karnataka identity differs in this environment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviewed_ka_member_links r
    JOIN public.canonical_persons p ON p.id <> r.person_id
    WHERE r.new_person AND EXISTS (
      SELECT 1
      FROM unnest(array_prepend(p.canonical_name, p.aliases)) AS stored(name)
      CROSS JOIN unnest(array_prepend(r.canonical_name, r.aliases)) AS source(name)
      WHERE regexp_replace(lower(stored.name), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(source.name), '[^a-z0-9]', '', 'g')
    )
  ) THEN
    RAISE EXCEPTION 'An existing person has a matching Karnataka name. Review the identity before import';
  END IF;

  IF EXISTS (
    SELECT 1 FROM reviewed_ka_member_links r
    JOIN public.elected_tenures t ON t.office_type = 'mla'
      AND t.jurisdiction_type = 'assembly_constituency'
      AND ((t.is_current AND t.person_id = r.person_id) OR
        (t.jurisdiction_id = 'KA-AC-' || r.ac_no
          AND (t.is_current OR t.term_start = DATE '2023-05-22')))
    WHERE t.person_id <> r.person_id OR t.jurisdiction_id <> 'KA-AC-' || r.ac_no
      OR NOT t.is_current OR t.term_start <> DATE '2023-05-22'
      OR t.current_party IS DISTINCT FROM 'ORG-PARTY-' || r.party_code
      OR t.party_at_election IS DISTINCT FROM 'ORG-PARTY-' || r.party_code
  ) THEN
    RAISE EXCEPTION 'A Karnataka tenure already exists with different evidence';
  END IF;
END $$;

INSERT INTO public.canonical_persons (
  id, canonical_name, aliases, gender, data_status, provenance_id, metadata
)
SELECT person_id, canonical_name, array_remove(aliases, canonical_name), gender,
       'OFFICIAL', 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4',
       jsonb_build_object('stateContext', 'KA')
FROM reviewed_ka_member_links WHERE new_person
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.elected_tenures (
  person_id, office_type, jurisdiction_type, jurisdiction_id, constituency_version_id,
  term_start, is_current, tenure_status, party_at_election, current_party, data_status, provenance_id
)
SELECT r.person_id, 'mla', 'assembly_constituency', c.id, c.current_version_id,
       DATE '2023-05-22', TRUE, 'ACTIVE', 'ORG-PARTY-' || r.party_code, 'ORG-PARTY-' || r.party_code,
       'OFFICIAL', 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
FROM reviewed_ka_member_links r
JOIN public.constituencies c ON c.state_code = 'KA' AND c.ac_no = r.ac_no
WHERE NOT EXISTS (
  SELECT 1 FROM public.elected_tenures t WHERE t.office_type = 'mla'
    AND t.jurisdiction_type = 'assembly_constituency' AND t.jurisdiction_id = c.id
    AND t.term_start = DATE '2023-05-22'
);

DO $$
BEGIN
  IF (SELECT count(*) FROM reviewed_ka_member_links r
      JOIN public.elected_tenures t ON t.jurisdiction_id = 'KA-AC-' || r.ac_no AND t.person_id = r.person_id
      WHERE t.is_current AND t.jurisdiction_type = 'assembly_constituency' AND t.office_type = 'mla') <> 7
  THEN
    RAISE EXCEPTION 'Karnataka roster verification failed';
  END IF;
END $$;

COMMIT;
