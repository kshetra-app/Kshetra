-- Migration 078: Canonical 8-Stage Civic Issue Lifecycle Engine (JOB 036)
-- Master Product Blueprint — Section 1441
-- Ratified under DEC-182 and DEC-183
-- State Machine: REPORTED -> REVIEW -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CONFIRMED/DISPUTED -> CLOSED

-- 1. Enhance civic_issues with assignment, department, and confirmation metadata
ALTER TABLE public.civic_issues
  ADD COLUMN IF NOT EXISTS assigned_department TEXT,
  ADD COLUMN IF NOT EXISTS assigned_officer_name TEXT,
  ADD COLUMN IF NOT EXISTS estimated_completion_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ;

-- 2. Enhance issue_status_history with rich transition audit fields
ALTER TABLE public.issue_status_history
  ADD COLUMN IF NOT EXISTS actor_role TEXT DEFAULT 'citizen',
  ADD COLUMN IF NOT EXISTS evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS action_plan TEXT,
  ADD COLUMN IF NOT EXISTS assigned_department TEXT;

-- 3. High-performance chronological timeline index
CREATE INDEX IF NOT EXISTS idx_issue_status_history_timeline 
  ON public.issue_status_history (issue_id, created_at ASC);

-- 4. Status lookup index supporting canonical 8 stages
CREATE INDEX IF NOT EXISTS idx_civic_issues_status_canonical
  ON public.civic_issues (status, constituency_id);

COMMENT ON TABLE public.civic_issues IS 
  'Stores civic issues governed by canonical 8-stage state machine: REPORTED, REVIEW, VERIFIED, ASSIGNED, IN_PROGRESS, RESOLVED, CONFIRMED, DISPUTED, CLOSED (JOB 036, DEC-183).';

COMMENT ON TABLE public.issue_status_history IS 
  'Immutable audit trail recording state transitions, actor roles, notes, and evidence for civic issue lifecycle (JOB 036, DEC-183).';
