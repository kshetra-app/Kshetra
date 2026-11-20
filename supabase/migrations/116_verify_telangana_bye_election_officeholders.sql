BEGIN;

-- Telangana CEO Form 21D declarations and ECI constituency reports.
-- Add each official result to the existing identity and tenure registries once.
LOCK TABLE public.canonical_persons, public.candidacies, public.elected_tenures IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  result record;
  people uuid[];
  official_person uuid;
  official_candidacy uuid;
BEGIN
  FOR result IN
    SELECT * FROM (VALUES
      ('TS-AC-61', 'Jubilee Hills', 2025, DATE '2025-11-14', 'Naveen Yadav V',
       ARRAY['Naveen Yadav. V', 'V Naveen Kumar Yadav', 'Naveen Kumar Yadav'],
       '8d131cc3-679d-4afb-acba-9891aa0116c1'::uuid,
       '82552634-6222-452a-a5c1-590741a67694'::uuid,
       'b1c44fe8-551d-48a0-bcc6-dfe8aff1d344'::uuid,
       'ff3f539b4e7c603cdd4e907ec42514afcf08916c8acaf775aaf04d2f79eb2f8b',
       'https://ceotelangana.nic.in/Bye-Election%20to%20the%2061-Jubilee%20Hills-2025/2080-163_AC_61_Declaration%20of%20result%20in%20Form-21D%20-%20Published%20in%20State%20GAzette.pdf'),
      ('TS-AC-71', 'Secunderabad Cantonment', 2024, DATE '2024-06-04', 'Sri Ganesh Narayanan',
       ARRAY['Sriganesh', 'Sri Ganesh', 'Narayanan Sri Ganesh', 'Sriganesh N'],
       '94088fd0-1f1a-4063-abe5-afd73bac7b10'::uuid,
       '568326b7-8b9e-414e-b79f-028ba5a0bbe1'::uuid,
       'a4e6d049-02b5-430a-9ee1-f76b2991932c'::uuid,
       '59908d87aa26a4c7bac18cfd9e8b36ffd1ffda7dd4551e78b87da059643e554b',
       'https://ceotelangana.nic.in/BYE_ELECTION%2871-SEC_CANTT%29/2090-82-Bye%20Elecs%20to%20TSLA%2071-Sec%27bad%20cant%20Declaration%20of%20Result-Reg.pdf')
    ) AS incoming(seat, seat_name, year, term_start, winner, aliases, person_id, evidence_id, provenance_id, sha256, source_url)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.constituencies
      WHERE id = result.seat AND state_code = 'TS' AND name = result.seat_name
    ) OR NOT EXISTS (SELECT 1 FROM public.political_organizations WHERE id = 'ORG-PARTY-INC')
      OR NOT EXISTS (SELECT 1 FROM public.dataset_versions WHERE id = 'telangana_assembly_roster_2026_11_20')
    THEN
      RAISE EXCEPTION 'Missing Telangana roster prerequisites for %', result.seat;
    END IF;

    SELECT array_agg(person.id) INTO people
    FROM public.canonical_persons person
    WHERE EXISTS (
      SELECT 1
      FROM unnest(array_prepend(person.canonical_name, person.aliases)) AS existing(name)
      CROSS JOIN unnest(array_prepend(result.winner, result.aliases)) AS incoming(name)
      WHERE regexp_replace(lower(existing.name), '[^a-z0-9]', '', 'g')
        = regexp_replace(lower(incoming.name), '[^a-z0-9]', '', 'g')
    );
    IF cardinality(people) > 1 THEN
      RAISE EXCEPTION 'Multiple canonical people match %', result.seat;
    END IF;

    official_person := COALESCE(people[1], result.person_id);
    IF EXISTS (
      SELECT 1 FROM public.elected_tenures
      WHERE jurisdiction_type = 'assembly_constituency' AND office_type = 'mla'
        AND jurisdiction_id = result.seat AND is_current AND person_id <> official_person
    ) THEN
      RAISE EXCEPTION 'Conflicting current MLA for %', result.seat;
    END IF;

    INSERT INTO public.evidence_records (
      id, dataset_version_id, artifact_name, artifact_sha256,
      verification_authority, verified_by, verification_notes
    ) VALUES (
      result.evidence_id, 'telangana_assembly_roster_2026_11_20', result.seat || ' Form 21D',
      result.sha256, 'Chief Electoral Officer, Telangana', 'poligram_data_reconciliation', result.source_url
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.provenance_records (
      id, dataset_version_id, source_record_id, status, transformation_type,
      operator, verification_evidence_id, metadata
    ) VALUES (
      result.provenance_id, 'telangana_assembly_roster_2026_11_20', result.seat || ' Form 21D',
      'OFFICIAL', 'verified_bye_election', 'poligram_data_reconciliation',
      result.evidence_id, jsonb_build_object('source_url', result.source_url)
    ) ON CONFLICT (id) DO NOTHING;

    IF people IS NULL THEN
      INSERT INTO public.canonical_persons (id, canonical_name, aliases, gender, data_status, provenance_id)
      VALUES (official_person, result.winner, result.aliases, 'male', 'OFFICIAL', result.provenance_id);
    END IF;

    SELECT candidacy.id INTO official_candidacy
    FROM public.candidacies candidacy
    WHERE candidacy.person_id = official_person AND candidacy.election_type = 'assembly'
      AND candidacy.constituency_id IN (result.seat, substr(result.seat, 4))
      AND candidacy.election_year = result.year AND candidacy.result = 'won';

    IF official_candidacy IS NULL THEN
      INSERT INTO public.candidacies (
        person_id, election_year, election_type, constituency_type, constituency_id, party_id,
        is_independent, result, rank, data_status, provenance_id
      ) VALUES (
        official_person, result.year, 'assembly', 'assembly', result.seat, 'ORG-PARTY-INC',
        FALSE, 'won', 1, 'OFFICIAL', result.provenance_id
      ) RETURNING id INTO official_candidacy;
    END IF;

    INSERT INTO public.elected_tenures (
      person_id, office_type, jurisdiction_type, jurisdiction_id, term_start,
      party_at_election, current_party, candidacy_id, is_current, tenure_status,
      data_status, provenance_id
    )
    SELECT official_person, 'mla', 'assembly_constituency', result.seat, result.term_start,
           'ORG-PARTY-INC', 'ORG-PARTY-INC', official_candidacy, TRUE, 'ACTIVE',
           'OFFICIAL', result.provenance_id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.elected_tenures
      WHERE jurisdiction_type = 'assembly_constituency' AND office_type = 'mla'
        AND jurisdiction_id = result.seat AND (is_current OR term_start = result.term_start)
    );
  END LOOP;
END $$;

COMMIT;
