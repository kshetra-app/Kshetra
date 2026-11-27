BEGIN;

-- Reuse the existing publisher registry and the same scheduled review workflow.
INSERT INTO public.data_sources (
  id, name, publisher, authority_level, canonical_url, retrieval_method, refresh_frequency
)
VALUES
  ('karnataka_legislative_council_bill_index', 'Karnataka Legislative Council bill sessions',
    'Karnataka Legislative Council', 'statutory',
    'https://kla.kar.nic.in/council/house/bills/bills.htm', 'html', 'daily'),
  ('karnataka_assembly_tenth_session_bills', 'Karnataka Assembly tenth-session bill status',
    'Karnataka Legislative Assembly', 'statutory',
    'https://kla.kar.nic.in/assembly/bills/bills16100.htm', 'html', 'daily')
ON CONFLICT (id) DO NOTHING;

COMMIT;
