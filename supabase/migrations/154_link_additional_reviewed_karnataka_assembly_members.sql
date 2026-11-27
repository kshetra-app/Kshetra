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
  (14, '1d302dc2-13ba-5698-85a7-d6daadb75361', 'Vithal Somanna Halagekar', ARRAY['Vithal Somanna Halagekar'], 'male', 'BJP', TRUE),
  (22, '0daa6db3-3d02-5a96-9112-afc90b4c06c4', 'Jagadish Thimmanagouda Patil', ARRAY['J. T. Patil.'], 'male', 'INC', TRUE),
  (44, '9c735ef8-30d0-5175-b22c-6d7737adf69f', 'Allam Prabhu Patil', ARRAY['Allam Prabhu Patil'], 'male', 'INC', TRUE),
  (48, '0c712fe7-95f1-52de-84b9-86e808d9f1fa', 'Siddu Patil', ARRAY['Siddu Patil'], 'male', 'BJP', TRUE),
  (58, 'a9a9f11a-ebad-5132-abdc-f3869b7ffabb', 'Badarli Hampangouda', ARRAY['Hampanagouda Badarli'], 'male', 'INC', TRUE),
  (73, '0215b22d-0001-0000-0000-000000004787', 'Mahesh Tenginkai', ARRAY['Mahesh Tenginkai'], 'male', 'BJP', FALSE),
  (96, '39bf8cf7-345c-56b8-822c-aa5542b004c8', 'Srinivas N T', ARRAY['Srinivas N T'], 'male', 'INC', TRUE),
  (102, '15c23992-2d5d-5d82-b509-3562e83cbeac', 'M Chandrappa', ARRAY['M Chandrappa'], 'male', 'BJP', TRUE),
  (104, '039c85f5-4660-5ad7-bb1b-ba85521b580e', 'Latha Mallikarjun', ARRAY['Latha Mallikarjun'], 'female', NULL, TRUE),
  (117, '0215b22d-0001-0000-0000-000000007131', 'Belur Gopalakrishna', ARRAY['Belur Gopalakrishna'], 'male', 'INC', FALSE),
  (120, '0215b22d-0001-0000-0000-000000002230', 'Yashpal', ARRAY['Yashpal'], 'male', 'BJP', FALSE),
  (126, '3da32b0a-11ec-5b1d-b190-0a1be742f6b0', 'G H Srinivasa', ARRAY['G H Srinivasa'], 'male', 'INC', TRUE),
  (127, 'fd36dbaf-2c02-5518-9eeb-1684358c40b3', 'Anand K S', ARRAY['Anand K S'], 'male', 'INC', TRUE),
  (128, 'd53072ef-3695-530b-b112-844948ded367', 'C B Suresh Babu', ARRAY['C B Suresh Baabu'], 'male', 'JDS', TRUE),
  (132, '0215b22d-0001-0000-0000-000000004889', 'G B Jyothi Ganesh', ARRAY['G B Jyothi Ganesh'], 'male', 'BJP', FALSE),
  (138, '0215b22d-0001-0000-0000-000000002160', 'K N Rajanna', ARRAY['K N Rajanna'], 'male', 'INC', FALSE),
  (143, '3e5afb03-5fa8-5055-aa0f-16c7e11a2abe', 'Dr M C Sudhakar', ARRAY['Dr M C Sudhakar'], 'male', 'INC', TRUE),
  (145, '3f0a8786-002c-58b3-8e1b-841611b1a61c', 'Samruddhi V Manjunath', ARRAY['Samruddhi V Manjunath'], 'male', 'JDS', TRUE),
  (160, '980889c7-9e49-5d68-b3ac-de3c8d1dd694', 'K J George', ARRAY['Kelachandra Joseph George', 'K J George', 'K J Georges'], 'male', 'INC', TRUE),
  (174, 'edda404d-3fc2-5a46-941b-579f289a4400', 'Manjula S', ARRAY['Manjula S'], 'female', 'BJP', TRUE),
  (177, '0215b22d-0001-0000-0000-000000002047', 'Shivanna', ARRAY['Shivanna'], 'male', 'INC', FALSE),
  (187, 'bd1dfbb6-61c6-531c-a890-2a382d28062b', 'Udaya K M', ARRAY['Udaya K M'], 'male', 'INC', TRUE),
  (189, 'ef5be28e-324c-5b90-8252-f82cc6585867', 'Ravi Kumar Gowda (Ganiga)', ARRAY['Ravi Kumar Gowda (Ganiga)'], 'male', 'INC', TRUE),
  (192, '77d11be8-6dcb-5b6e-bdba-6fe7be1ca413', 'H T Manju', ARRAY['H T Manju'], 'male', 'JDS', TRUE),
  (195, '0215b22d-0001-0000-0000-000000007168', 'H K Suresh', ARRAY['H K Suresh'], 'male', 'BJP', FALSE),
  (196, '0215b22d-0001-0000-0000-000000002115', 'H. P. Swaroop', ARRAY['H. P. Swaroop'], 'male', 'JDS', FALSE),
  (199, 'e5c7f38c-d500-5b05-9e39-2dc77e09777f', 'Cement Manju', ARRAY['Cement Manjunath'], 'male', 'BJP', TRUE),
  (201, '0215b22d-0001-0000-0000-000000004881', 'Umanath Kotian', ARRAY['Umanath Kotian'], 'male', 'BJP', FALSE),
  (215, '0215b22d-0001-0000-0000-000000004860', 'G T Devegowda', ARRAY['G T Devegowda'], 'male', 'JDS', FALSE),
  (224, '9b266434-47f1-5091-8772-a1c1aaac37ca', 'H M Ganesh Prasad', ARRAY['H M Ganeshaprasad', 'Ganesh Prasad H M'], 'male', 'INC', TRUE);

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
      WHERE t.is_current AND t.jurisdiction_type = 'assembly_constituency' AND t.office_type = 'mla') <> 30
  THEN
    RAISE EXCEPTION 'Karnataka roster verification failed';
  END IF;
END $$;

COMMIT;
