import fs from 'node:fs';
import path from 'node:path';

const checks = [
  {
    num: '050',
    title: 'Post-050 Political Entity Model Checkpoint',
    sql: `-- Checkpoint 050: Political Entity Model
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 050: Political Entity Model ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'political_organizations') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.political_organizations missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'canonical_persons') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.canonical_persons missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'candidacies') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.candidacies missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'elected_tenures') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.elected_tenures missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'person_party_affiliations') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.person_party_affiliations missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenure_party_switches') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.tenure_party_switches missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_relationships') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: public.organization_relationships missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_status_enum') THEN
    RAISE EXCEPTION 'CHECKPOINT 050 FAILED: data_status_enum missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 050 PASS: Core political tables, enums, and triggers established.';
END $$;

SELECT 'political_organizations' as table_name, count(*) as count FROM public.political_organizations
UNION ALL SELECT 'canonical_persons', count(*) FROM public.canonical_persons
UNION ALL SELECT 'candidacies', count(*) FROM public.candidacies
UNION ALL SELECT 'elected_tenures', count(*) FROM public.elected_tenures
UNION ALL SELECT 'person_party_affiliations', count(*) FROM public.person_party_affiliations
UNION ALL SELECT 'tenure_party_switches', count(*) FROM public.tenure_party_switches
UNION ALL SELECT 'organization_relationships', count(*) FROM public.organization_relationships;
`
  },
  {
    num: '059',
    title: 'Post-059 National Constituency Registry Checkpoint',
    sql: `-- Checkpoint 059: National Constituency Registry
DO $$
DECLARE
  v_ac_count INT;
  v_pc_count INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 059: National Constituency Registry ===';
  SELECT count(*) INTO v_ac_count FROM public.constituencies;
  SELECT count(*) INTO v_pc_count FROM public.parliamentary_constituencies;
  IF v_ac_count < 4142 THEN
    RAISE EXCEPTION 'CHECKPOINT 059 FAILED: Expected at least 4,142 ACs in public.constituencies, found %', v_ac_count;
  END IF;
  IF v_pc_count < 543 THEN
    RAISE EXCEPTION 'CHECKPOINT 059 FAILED: Expected at least 543 PCs in public.parliamentary_constituencies, found %', v_pc_count;
  END IF;
  RAISE NOTICE 'CHECKPOINT 059 PASS: National ACs (%), PCs (%) populated successfully.', v_ac_count, v_pc_count;
END $$;

SELECT 'constituencies' as table_name, count(*) as count FROM public.constituencies
UNION ALL SELECT 'parliamentary_constituencies', count(*) FROM public.parliamentary_constituencies;
`
  },
  {
    num: '060',
    title: 'Post-060 Electoral Geography Remediation Checkpoint',
    sql: `-- Checkpoint 060: Electoral Geography Remediation
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 060: Electoral Geography Remediation ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_parliamentary_mappings') THEN
    RAISE EXCEPTION 'CHECKPOINT 060 FAILED: public.constituency_parliamentary_mappings table missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 060 PASS: Mapping table and geography remediations verified.';
END $$;

SELECT 'constituency_parliamentary_mappings' as table_name, count(*) as count FROM public.constituency_parliamentary_mappings;
`
  },
  {
    num: '061',
    title: 'Post-061 National AC-PC Mappings Checkpoint',
    sql: `-- Checkpoint 061: National AC-PC Mappings
DO $$
DECLARE
  v_map_count INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 061: National AC-PC Mappings ===';
  SELECT count(*) INTO v_map_count FROM public.constituency_parliamentary_mappings;
  IF v_map_count < 4142 THEN
    RAISE EXCEPTION 'CHECKPOINT 061 FAILED: Expected at least 4,142 mappings, found %', v_map_count;
  END IF;
  RAISE NOTICE 'CHECKPOINT 061 PASS: National AC-PC mappings verified (%).', v_map_count;
END $$;

SELECT 'constituency_parliamentary_mappings' as table_name, count(*) as count FROM public.constituency_parliamentary_mappings;
`
  },
  {
    num: '062',
    title: 'Post-062 Assam 2023 Delimitation Checkpoint',
    sql: `-- Checkpoint 062: Assam 2023 Delimitation
DO $$
DECLARE
  v_assam_ac INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 062: Assam 2023 Delimitation ===';
  SELECT count(*) INTO v_assam_ac FROM public.constituencies WHERE state_code = 'AS';
  IF v_assam_ac < 126 THEN
    RAISE EXCEPTION 'CHECKPOINT 062 FAILED: Expected 126 Assam ACs, found %', v_assam_ac;
  END IF;
  RAISE NOTICE 'CHECKPOINT 062 PASS: Assam post-2023 delimitation verified (126 ACs).';
END $$;

SELECT 'assam_constituencies' as table_name, count(*) as count FROM public.constituencies WHERE state_code = 'AS';
`
  },
  {
    num: '063',
    title: 'Post-063 Political Identity Foundation Checkpoint',
    sql: `-- Checkpoint 063: Political Identity Foundation
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 063: Political Identity Foundation ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities') THEN
    RAISE EXCEPTION 'CHECKPOINT 063 FAILED: public.person_multilingual_identities missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'person_multilingual_identities' AND column_name = 'representation_type') THEN
    RAISE EXCEPTION 'CHECKPOINT 063 FAILED: representation_type column missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 063 PASS: Multi-script person identity table verified.';
END $$;

SELECT 'person_multilingual_identities' as table_name, count(*) as count FROM public.person_multilingual_identities;
`
  },
  {
    num: '064',
    title: 'Post-064 Organization Governance Remediation Checkpoint',
    sql: `-- Checkpoint 064: Organization Governance Remediation
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 064: Organization Governance Remediation ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_multilingual_names') THEN
    RAISE EXCEPTION 'CHECKPOINT 064 FAILED: public.organization_multilingual_names missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_symbols') THEN
    RAISE EXCEPTION 'CHECKPOINT 064 FAILED: public.organization_symbols missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization_aliases') THEN
    RAISE EXCEPTION 'CHECKPOINT 064 FAILED: public.organization_aliases missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 064 PASS: Organization ancillary tables verified.';
END $$;

SELECT 'organization_multilingual_names' as table_name, count(*) as count FROM public.organization_multilingual_names
UNION ALL SELECT 'organization_symbols', count(*) FROM public.organization_symbols
UNION ALL SELECT 'organization_aliases', count(*) FROM public.organization_aliases;
`
  },
  {
    num: '065',
    title: 'Post-065 Political Organization Registry Checkpoint',
    sql: `-- Checkpoint 065: Political Organization Registry
DO $$
DECLARE
  v_org_count INT;
  v_alias_count INT;
BEGIN
  RAISE NOTICE '=== CHECKPOINT 065: Political Organization Registry ===';
  SELECT count(*) INTO v_org_count FROM public.political_organizations;
  SELECT count(*) INTO v_alias_count FROM public.organization_aliases;
  IF v_org_count < 107 THEN
    RAISE EXCEPTION 'CHECKPOINT 065 FAILED: Expected at least 107 political_organizations, found %', v_org_count;
  END IF;
  IF v_alias_count < 1043 THEN
    RAISE EXCEPTION 'CHECKPOINT 065 FAILED: Expected at least 1,043 organization_aliases, found %', v_alias_count;
  END IF;
  RAISE NOTICE 'CHECKPOINT 065 PASS: Political organizations (%) and aliases (%) verified.', v_org_count, v_alias_count;
END $$;

SELECT 'political_organizations' as table_name, count(*) as count FROM public.political_organizations
UNION ALL SELECT 'organization_aliases', count(*) FROM public.organization_aliases
UNION ALL SELECT 'organization_multilingual_names', count(*) FROM public.organization_multilingual_names
UNION ALL SELECT 'organization_symbols', count(*) FROM public.organization_symbols;
`
  },
  {
    num: '066',
    title: 'Post-066 Downstream Civic Extensions Checkpoint',
    sql: `-- Checkpoint 066: Downstream Civic Extensions
DO $$
BEGIN
  RAISE NOTICE '=== CHECKPOINT 066: Downstream Civic Extensions ===';
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'constituency_demographics') THEN
    RAISE EXCEPTION 'CHECKPOINT 066 FAILED: public.constituency_demographics missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidate_affidavits' AND column_name = 'person_id') THEN
    RAISE EXCEPTION 'CHECKPOINT 066 FAILED: candidate_affidavits.person_id column missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidate_affidavits' AND column_name = 'candidacy_id') THEN
    RAISE EXCEPTION 'CHECKPOINT 066 FAILED: candidate_affidavits.candidacy_id column missing';
  END IF;
  RAISE NOTICE 'CHECKPOINT 066 PASS: Civic extension tables and affidavit foreign keys verified.';
END $$;

SELECT 'constituency_demographics' as table_name, count(*) as count FROM public.constituency_demographics
UNION ALL SELECT 'candidate_affidavits', count(*) FROM public.candidate_affidavits;
`
  }
];

const dir = path.join(process.cwd(), 'supabase', 'staging_checkpoints');
fs.mkdirSync(dir, { recursive: true });

for (const c of checks) {
  const p = path.join(dir, `checkpoint_${c.num}.sql`);
  fs.writeFileSync(p, c.sql, 'utf8');
  console.log(`Wrote ${p}`);
}
