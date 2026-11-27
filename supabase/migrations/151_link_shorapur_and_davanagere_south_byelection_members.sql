BEGIN;

LOCK TABLE public.canonical_persons, public.elected_tenures IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  member record;
  matches uuid[];
  person uuid;
  roster_provenance CONSTANT uuid := 'f4030f59-8d1a-4e39-9218-7c1fc0d00cc4';
BEGIN
  -- Confirmed in the 16th Assembly's by-election roster. Raja Venugopal Naik
  -- is distinct from the late 2023 Shorapur MLA Raja Venkatappa Naik.
  FOR member IN
    SELECT * FROM (VALUES
      (36, 'Raja Venugopal Naik', ARRAY['Raja Venugopal Nayak', 'Raja Venugopala Naik'],
       '01abec98-01a2-4dc0-9529-b12db113ec1f'::uuid, DATE '2024-06-11'),
      (107, 'Samarth Shamanuru Mallikarjuna', ARRAY['Samarth Shamanur Mallikarjuna'],
       'b7e7025e-2743-4a2d-9176-61efc4ffa489'::uuid, DATE '2026-05-04')
    ) AS named(ac_no, name, aliases, new_person_id, term_start)
  LOOP
    SELECT array_agg(p.id) INTO matches
    FROM public.canonical_persons p
    WHERE EXISTS (
      SELECT 1 FROM unnest(array_prepend(p.canonical_name, p.aliases)) AS stored(name)
      CROSS JOIN unnest(array_prepend(member.name, member.aliases)) AS official(name)
      WHERE regexp_replace(lower(stored.name), '[^a-z0-9]', '', 'g')
          = regexp_replace(lower(official.name), '[^a-z0-9]', '', 'g')
    );
    IF cardinality(matches) > 1 OR (cardinality(matches) = 1 AND NOT EXISTS (
      SELECT 1 FROM public.canonical_persons p
      WHERE p.id = matches[1] AND p.metadata->>'stateContext' = 'KA'
    )) THEN
      RAISE EXCEPTION 'Review ambiguous Karnataka by-election identity for seat %', member.ac_no;
    END IF;
    person := COALESCE(matches[1], member.new_person_id);

    IF NOT EXISTS (
      SELECT 1 FROM public.constituencies seat
      WHERE seat.state_code = 'KA' AND seat.ac_no = member.ac_no
        AND seat.primary_dataset_version_id = 'eci_karnataka_schedule_xiv_2026_11_27'
    ) OR EXISTS (
      SELECT 1 FROM public.elected_tenures t
      WHERE t.jurisdiction_id = 'KA-AC-' || member.ac_no
        AND t.office_type = 'mla' AND t.jurisdiction_type = 'assembly_constituency'
        AND (t.is_current OR t.term_start = member.term_start)
        AND (NOT t.is_current OR t.person_id <> person OR t.term_start <> member.term_start
          OR t.party_at_election IS DISTINCT FROM 'ORG-PARTY-INC'
          OR t.current_party IS DISTINCT FROM 'ORG-PARTY-INC')
    ) THEN
      RAISE EXCEPTION 'Review conflicting Karnataka tenure or geography for seat %', member.ac_no;
    END IF;

    IF matches IS NULL THEN
      INSERT INTO public.canonical_persons (id, canonical_name, aliases, data_status, provenance_id, metadata)
      VALUES (person, member.name, member.aliases, 'OFFICIAL', roster_provenance,
              jsonb_build_object('stateContext', 'KA'));
    END IF;

    INSERT INTO public.elected_tenures (
      person_id, office_type, jurisdiction_type, jurisdiction_id, constituency_version_id,
      term_start, is_current, tenure_status, party_at_election, current_party, data_status, provenance_id
    )
    SELECT person, 'mla', 'assembly_constituency', seat.id, seat.current_version_id,
           member.term_start, TRUE, 'ACTIVE', 'ORG-PARTY-INC', 'ORG-PARTY-INC', 'OFFICIAL', roster_provenance
    FROM public.constituencies seat
    WHERE seat.state_code = 'KA' AND seat.ac_no = member.ac_no
      AND NOT EXISTS (
        SELECT 1 FROM public.elected_tenures t
        WHERE t.jurisdiction_id = seat.id AND t.office_type = 'mla'
          AND t.jurisdiction_type = 'assembly_constituency' AND t.term_start = member.term_start
      );
  END LOOP;
END $$;

COMMIT;
