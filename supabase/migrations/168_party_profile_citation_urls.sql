-- Use working publisher URLs for these same source records.
-- The ECI's national performance table excludes uncontested Surat.
-- The PIB's June 2024 results table includes it in the BJP total and
-- includes the IUML's Tamil Nadu seat alongside its two Kerala seats.
UPDATE public.political_organizations AS party
SET profile_evidence = (
      SELECT jsonb_agg(
        CASE WHEN entry.fact->>'resultsSourceUrl' = 'https://elections24.eci.gov.in/docs/50qq4HbUXP.pdf'
          THEN entry.fact || jsonb_build_object('resultsSourceUrl', CASE
            WHEN party.id IN ('ORG-PARTY-BJP', 'ORG-PARTY-IUML')
              THEN 'https://newindiasamachar.pib.gov.in/WriteReadData/Magazine/2024/Jun/M202406161.pdf'
            WHEN entry.fact->>'category' = 'national'
              THEN 'https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/20-Performance-of-National-Parties.pdf'
            WHEN entry.fact->>'category' = 'state'
              THEN 'https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/21-Performance-of-State-Parties.pdf'
            ELSE 'https://www.eci.gov.in/eci-backend/public/all_files/GE-2024-statistical-report/22-PERFORMANCE-OF-REGISTERED-(UNRECOGNISED)-PARTIES.pdf'
          END)
        ELSE entry.fact
        END ORDER BY entry.position
      )
      FROM jsonb_array_elements(party.profile_evidence) WITH ORDINALITY AS entry(fact, position)
    ),
    updated_at = now()
WHERE party.org_type = 'political_party'
  AND party.profile_evidence @> '[{"resultsSourceUrl":"https://elections24.eci.gov.in/docs/50qq4HbUXP.pdf"}]';

UPDATE public.political_organizations AS party
SET profile_evidence = (
      SELECT jsonb_agg(
        CASE entry.fact->>'sourceUrl'
          WHEN 'https://www.dmk.in/DMK_Manifesto_English_2026.pdf'
            THEN entry.fact || '{"sourceUrl":"https://dmk.in/DMK_Manifesto_English_2026.pdf"}'::jsonb
          WHEN 'https://ceo.uk.gov.in/files/AC2002/Stat_rep_2002_UT.pdf'
            THEN entry.fact || '{
              "sourceUrl":"https://cdnbbsr.s3waas.gov.in/s3cbf8710b43df3f2c1553e649403426df/uploads/2025/05/20250513691902642.pdf",
              "resultsSourceUrl":"https://cdnbbsr.s3waas.gov.in/s3cbf8710b43df3f2c1553e649403426df/uploads/2025/05/20250513691902642.pdf"
            }'::jsonb
          ELSE entry.fact
        END ORDER BY entry.position
      )
      FROM jsonb_array_elements(party.profile_evidence) WITH ORDINALITY AS entry(fact, position)
    ),
    updated_at = now()
WHERE (
    party.id = 'ORG-PARTY-DMK'
    AND party.profile_evidence @> '[{"sourceUrl":"https://www.dmk.in/DMK_Manifesto_English_2026.pdf"}]'
  ) OR (
    party.id = 'ORG-PARTY-UKD'
    AND party.profile_evidence @> '[{"sourceUrl":"https://ceo.uk.gov.in/files/AC2002/Stat_rep_2002_UT.pdf"}]'
  );
