-- Match each archive entry to a full party name. Keep historical election
-- classifications separate from present-day recognition and Page ownership.
UPDATE public.political_organizations AS party
SET name = CASE WHEN party.name = party.short_name THEN evidence.name ELSE party.name END,
    profile_evidence = party.profile_evidence || jsonb_build_array(evidence.fact),
    updated_at = now()
FROM (VALUES
  ('ORG-PARTY-UKD', 'Uttarakhand Kranti Dal', '{
    "kind": "electionProfile", "election": "assembly", "year": 2002,
    "state": "UK", "category": "registered", "eciCode": "UKKD", "seatsWon": 4,
    "sourceUrl": "https://ceo.uk.gov.in/files/AC2002/Stat_rep_2002_UT.pdf",
    "resultsSourceUrl": "https://ceo.uk.gov.in/files/AC2002/Stat_rep_2002_UT.pdf"
  }'::jsonb),
  ('ORG-PARTY-MNM', 'Makkal Needhi Maiam', '{
    "kind": "founded", "year": 2018, "founder": "Kamal Haasan",
    "sourceUrl": "https://www.maiam.com/about-leader"
  }'::jsonb),
  ('ORG-PARTY-KRPP', 'Kalyana Rajya Pragathi Paksha', '{
    "kind": "assemblyElection", "year": 2023, "state": "KA",
    "sourceUrl": "https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm"
  }'::jsonb),
  ('ORG-PARTY-RPIA', 'Republican Party of India (Athawale)', '{
    "kind": "electionProfile", "election": "lokSabha", "year": 2024,
    "category": "registered", "eciCode": "RPPRINAT", "seatsWon": 0,
    "sourceUrl": "https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/3-List-Of-Political-Parties-Participated.pdf",
    "resultsSourceUrl": "https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/22-PERFORMANCE-OF-REGISTERED-(UNRECOGNISED)-PARTIES.pdf"
  }'::jsonb)
) AS evidence(id, name, fact)
WHERE party.id = evidence.id
  AND party.org_type = 'political_party'
  AND party.provenance_id IS NOT NULL
  AND NOT party.profile_evidence @> jsonb_build_array(evidence.fact);
