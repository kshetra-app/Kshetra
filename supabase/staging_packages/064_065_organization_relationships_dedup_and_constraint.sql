-- ==============================================================================
-- W021.5 Stage C: Organization Relationships Deduplication & Natural Key Guard
-- Target Environment: Staging (fkpigozcqnmcvofuksar)
-- Batch Provenance: 0215b22c-0000-0000-0000-000000000001
-- Authority: Master Execution Framework Amendment v1.6 / DEC-162
-- ==============================================================================

BEGIN;

-- 1. Deduplicate identical relationship tuples under batch provenance, preserving the earliest row
DELETE FROM public.organization_relationships a
USING public.organization_relationships b
WHERE a.ctid > b.ctid
  AND a.source_org_id = b.source_org_id
  AND a.target_org_id = b.target_org_id
  AND a.relationship_type = b.relationship_type
  AND a.valid_from = b.valid_from
  AND a.provenance_id = '0215b22c-0000-0000-0000-000000000001'::uuid;

-- 2. Add permanent natural key unique constraint to prevent future duplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_org_rel_natural_key'
  ) THEN
    ALTER TABLE public.organization_relationships
    ADD CONSTRAINT uq_org_rel_natural_key
    UNIQUE (source_org_id, target_org_id, relationship_type, valid_from);
  END IF;
END $$;

COMMIT;
