-- Use official state election evidence for verified historical registry aliases.
UPDATE public.political_organizations AS party
SET name = CASE WHEN party.name = party.short_name THEN evidence.name ELSE party.name END,
    profile_evidence = party.profile_evidence || jsonb_build_array(evidence.fact),
    updated_at = now()
FROM (VALUES
  ('ORG-PARTY-HLP', 'Haryana Lokhit Party', '{"kind":"electionProfile","election":"assembly","state":"HR","year":2024,"category":"registered","eciCode":"HaLP","seatsWon":0,"sourceUrl":"https://www.eci.gov.in/eci-backend/public/all_files/AE-2024-statistical-report-HR/3-List-Of-Political-Parties-Participated.pdf","resultsSourceUrl":"https://www.eci.gov.in/eci-backend/public/all_files/AE-2024-statistical-report-HR/2-List-of-Successful-Candidates.pdf"}'::jsonb),
  ('ORG-PARTY-HJSP', 'Haryana Jan Sevak Party', '{"kind":"electionProfile","election":"assembly","state":"HR","year":2024,"category":"registered","eciCode":"HRJNSVKP","seatsWon":0,"sourceUrl":"https://www.eci.gov.in/eci-backend/public/all_files/AE-2024-statistical-report-HR/3-List-Of-Political-Parties-Participated.pdf","resultsSourceUrl":"https://www.eci.gov.in/eci-backend/public/all_files/AE-2024-statistical-report-HR/2-List-of-Successful-Candidates.pdf"}'::jsonb),
  ('ORG-PARTY-JSS', 'Jan Surajya Shakti', '{"kind":"electionProfile","election":"assembly","state":"MH","year":2024,"category":"registered","eciCode":"JSS","seatsWon":2,"sourceUrl":"https://www.eci.gov.in/eci-backend/public//all_files/election_report/Maharashtra_Legislative_Assembly_Election__2024_2024/3-List_Of_Political_Parties_Participated_1744889410.pdf","resultsSourceUrl":"https://www.eci.gov.in/eci-backend/public//all_files/election_report/Maharashtra_Legislative_Assembly_Election__2024_2024/2-List_of_Successful_Candidates_1744889384.pdf","symbol":"COCONUT FARM"}'::jsonb),
  ('ORG-PARTY-RMPI', 'Revolutionary Marxist Party of India', '{"kind":"electionProfile","election":"assembly","state":"KL","year":2026,"category":"registered","eciCode":"RMPOI","seatsWon":1,"sourceUrl":"https://www.eci.gov.in/eci-backend/public//all_files/election_report/General_Election_to_the_Legislative_Assembly_of_Kerala_2026_2026/3-List_Of_Political_Parties_Participated_1778164525.pdf","resultsSourceUrl":"https://www.eci.gov.in/eci-backend/public//all_files/election_report/General_Election_to_the_Legislative_Assembly_of_Kerala_2026_2026/2-List_of_Successful_Candidates_1778164525.pdf","symbol":"Television"}'::jsonb)
) AS evidence(id, name, fact)
WHERE party.id = evidence.id
  AND party.org_type = 'political_party'
  AND party.provenance_id IS NOT NULL
  AND NOT party.profile_evidence @> jsonb_build_array(evidence.fact);
