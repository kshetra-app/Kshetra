BEGIN;

-- Cabinet approval and the subsequent foundation-stone ceremony are documented.
-- The announcement supplies no audited spending or construction percentage.
INSERT INTO public.development_projects (
  id, name, category, phase, state_code, district_name, description, sanctioned_cost_crores,
  sanctioned_date, expected_completion, expenditure_crores, delay_days,
  physical_progress, financial_progress, source, source_verified_on
)
SELECT
  'd41d7983-b6b8-5e51-8e9d-9ecc96b22f88'::uuid,
  'Bengaluru Metro Phase 3', 'metro', 'approved', 'KA', 'Bengaluru Urban',
  'Phase 3 adds 44.65 km across the JP Nagar Fourth Phase–Kempapura and Hosahalli–Kadabagere corridors. The Union Cabinet approved the project on 16 August 2024. The foundation stone was laid on 10 August 2025.',
  15611, DATE '2024-09-16', NULL, NULL, NULL, NULL, NULL,
  'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2154848&lang=2&reg=48', DATE '2026-11-27'
WHERE NOT EXISTS (
  SELECT 1 FROM public.development_projects p
  WHERE p.state_code = 'KA'
    AND (p.source = 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=2154848&lang=2&reg=48'
      OR (p.name ~* '(bangalore|bengaluru|namma).*metro' AND p.name ~* 'phase[- ]*(3|iii)(\M)'))
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
