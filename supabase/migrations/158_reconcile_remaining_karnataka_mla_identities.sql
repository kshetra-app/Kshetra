-- Match the remaining confirmed 2023 Assembly members by seat, party and
-- individual biography in https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf.
-- Keep the existing person IDs. Vijayanagar and Bangalore South elected two
-- different people called M Krishnappa, with separate biographies and filings.
BEGIN;

LOCK TABLE public.canonical_persons, public.elected_tenures IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE reviewed_ka_members (
  ac_no integer PRIMARY KEY, person_id uuid NOT NULL UNIQUE, previous_name text,
  display_name text NOT NULL, official_alias text NOT NULL, party_code text NOT NULL
) ON COMMIT DROP;

INSERT INTO reviewed_ka_members VALUES
  (91, '0215b22d-0001-0000-0000-000000002227', 'J N Ganesh', 'J N Ganesh', 'Ganesh J N', 'INC'),
  (113, '0215b22d-0001-0000-0000-000000007129', 'S N Channabasappa', 'Channabasappa (Chenni)', 'Channabasappa S N (Chenni)', 'BJP'),
  (135, '0215b22d-0001-0000-0000-000000002153', 'S R Srinivas', 'S R Srinivas (Vasu)', 'Srinivas S R (Vasu)', 'INC'),
  (147, '0215b22d-0001-0000-0000-000000004905', 'S N Narayanaswamy', 'S N Narayanaswamy K M', 'Narayanaswamy S N K M', 'INC'),
  (167, '0443ab4f-394e-5aa9-a0b9-698fe0926a3a', NULL, 'M Krishnappa', 'Krishnappa M', 'INC'),
  (206, '0215b22d-0001-0000-0000-000000002190', 'Ashok Kumar Rana', 'Ashok Kumar Rai', 'Ashok Kumar Rai K S', 'INC');

DO $check$
BEGIN
  IF (SELECT count(*) FROM reviewed_ka_members r JOIN public.constituencies c
      ON c.state_code = 'KA' AND c.ac_no = r.ac_no
      AND c.primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27') <> 6
    OR NOT EXISTS (
      SELECT 1 FROM public.elected_tenures
      WHERE person_id = '0215b22d-0001-0000-0000-000000002059'
        AND jurisdiction_id = 'KA-AC-176' AND jurisdiction_type = 'assembly_constituency'
        AND office_type = 'mla' AND is_current AND party_at_election = 'ORG-PARTY-BJP'
    ) OR EXISTS (
      SELECT 1 FROM reviewed_ka_members r
      LEFT JOIN public.canonical_persons p ON p.id = r.person_id
      WHERE (r.previous_name IS NOT NULL AND p.id IS NULL)
        OR (p.id IS NOT NULL AND (p.metadata->>'stateContext' IS DISTINCT FROM 'KA'
          OR (p.canonical_name IS DISTINCT FROM r.previous_name AND p.canonical_name <> r.display_name)))
    ) OR EXISTS (
      SELECT 1 FROM reviewed_ka_members r
      JOIN public.canonical_persons p ON p.id <> r.person_id AND p.metadata->>'stateContext' = 'KA'
      WHERE NOT (r.ac_no = 167 AND p.id = '0215b22d-0001-0000-0000-000000002059')
        AND EXISTS (
          SELECT 1 FROM unnest(array_prepend(p.canonical_name, p.aliases)) AS n(name)
          WHERE regexp_replace(lower(n.name), '[^a-z0-9]', '', 'g') IN (
            regexp_replace(lower(r.display_name), '[^a-z0-9]', '', 'g'),
            regexp_replace(lower(r.official_alias), '[^a-z0-9]', '', 'g')
          )
        )
    ) OR EXISTS (
      SELECT 1 FROM reviewed_ka_members r
      JOIN public.elected_tenures t ON t.office_type = 'mla' AND t.jurisdiction_type = 'assembly_constituency'
        AND ((t.is_current AND t.person_id = r.person_id) OR
          (t.jurisdiction_id = 'KA-AC-' || r.ac_no AND (t.is_current OR t.term_start = DATE '2023-05-22')))
      WHERE t.person_id <> r.person_id OR t.jurisdiction_id <> 'KA-AC-' || r.ac_no
        OR NOT t.is_current OR t.term_start <> DATE '2023-05-22'
        OR t.current_party IS DISTINCT FROM 'ORG-PARTY-' || r.party_code
        OR t.party_at_election IS DISTINCT FROM 'ORG-PARTY-' || r.party_code
    )
  THEN
    RAISE EXCEPTION 'Review an existing Karnataka identity, seat or tenure before applying';
  END IF;
END $check$;

INSERT INTO public.canonical_persons (id, canonical_name, aliases, gender, data_status, provenance_id, metadata)
SELECT person_id, display_name, ARRAY[official_alias], 'male', 'OFFICIAL',
       'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4', jsonb_build_object('stateContext', 'KA')
FROM reviewed_ka_members WHERE previous_name IS NULL
ON CONFLICT (id) DO NOTHING;

UPDATE public.canonical_persons p
SET canonical_name = r.display_name,
    aliases = CASE WHEN r.official_alias = ANY(p.aliases) THEN p.aliases
                   ELSE array_append(p.aliases, r.official_alias) END,
    gender = 'male',
    updated_at = now()
FROM reviewed_ka_members r
WHERE p.id = r.person_id AND r.previous_name IS NOT NULL
  AND (p.canonical_name <> r.display_name OR NOT (r.official_alias = ANY(p.aliases))
    OR p.gender IS DISTINCT FROM 'male');

INSERT INTO public.elected_tenures (
  person_id, office_type, jurisdiction_type, jurisdiction_id, constituency_version_id,
  term_start, is_current, tenure_status, party_at_election, current_party, data_status, provenance_id
)
SELECT r.person_id, 'mla', 'assembly_constituency', c.id, c.current_version_id,
       DATE '2023-05-22', TRUE, 'ACTIVE', 'ORG-PARTY-' || r.party_code, 'ORG-PARTY-' || r.party_code,
       'OFFICIAL', 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4'
FROM reviewed_ka_members r
JOIN public.constituencies c ON c.state_code = 'KA' AND c.ac_no = r.ac_no
WHERE NOT EXISTS (
  SELECT 1 FROM public.elected_tenures t WHERE t.office_type = 'mla'
    AND t.jurisdiction_type = 'assembly_constituency' AND t.jurisdiction_id = c.id
    AND t.term_start = DATE '2023-05-22'
);

DO $check$
BEGIN
  IF (SELECT count(*) FROM reviewed_ka_members r JOIN public.elected_tenures t
      ON t.jurisdiction_id = 'KA-AC-' || r.ac_no AND t.person_id = r.person_id
      WHERE t.is_current AND t.jurisdiction_type = 'assembly_constituency' AND t.office_type = 'mla') <> 6
  THEN
    RAISE EXCEPTION 'Karnataka roster verification failed';
  END IF;
END $check$;

COMMIT;
