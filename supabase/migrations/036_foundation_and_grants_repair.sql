-- ============================================================
-- Migration 036: Foundation and Grants Repair
-- Remediates DEF-013: Syntax error 0A000 in global_search RPC
-- ============================================================

-- In PostgreSQL, an ORDER BY clause cannot directly terminate a series of
-- UNION ALL subqueries without enclosing the unified set in an outer SELECT.
-- This migration replaces global_search with the properly parenthesized query.

CREATE OR REPLACE FUNCTION global_search(
  p_query TEXT,
  p_state_code TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_type TEXT,
  entity_id TEXT,
  title TEXT,
  subtitle TEXT,
  relevance REAL
) AS $$
DECLARE
  tsq tsquery;
BEGIN
  tsq := plainto_tsquery('english', p_query);

  RETURN QUERY
  SELECT
    search_results.entity_type,
    search_results.entity_id,
    search_results.title,
    search_results.subtitle,
    search_results.relevance
  FROM (
    -- Constituencies
    SELECT
      'constituency'::TEXT AS entity_type,
      c.id AS entity_id,
      c.name AS title,
      (c.district || ' · AC#' || c.ac_no) AS subtitle,
      ts_rank(c.fts, tsq) AS relevance
    FROM constituencies c
    WHERE c.fts @@ tsq AND (p_state_code IS NULL OR c.state_code = p_state_code)

    UNION ALL

    -- Civic issues
    SELECT
      'issue'::TEXT AS entity_type,
      ci.id::TEXT AS entity_id,
      ci.title AS title,
      (ci.category || ' · ' || ci.status) AS subtitle,
      ts_rank(ci.fts, tsq) AS relevance
    FROM civic_issues ci
    WHERE ci.fts @@ tsq AND (p_state_code IS NULL OR ci.state_code = p_state_code)

    UNION ALL

    -- Headlines
    SELECT
      'headline'::TEXT AS entity_type,
      h.id::TEXT AS entity_id,
      h.title AS title,
      h.source_name AS subtitle,
      ts_rank(h.fts, tsq) AS relevance
    FROM headlines h
    WHERE h.fts @@ tsq AND (p_state_code IS NULL OR h.state_code = p_state_code)

    UNION ALL

    -- Legislator profiles
    SELECT
      'legislator'::TEXT AS entity_type,
      lp.id AS entity_id,
      lp.display_name AS title,
      (lp.current_party || ' · ' || lp.constituency_name) AS subtitle,
      CASE
        WHEN lp.display_name ILIKE '%' || p_query || '%' THEN 1.0
        WHEN lp.full_name ILIKE '%' || p_query || '%' THEN 0.9
        WHEN lp.constituency_name ILIKE '%' || p_query || '%' THEN 0.7
        ELSE 0.3
      END::REAL AS relevance
    FROM legislator_profiles lp
    WHERE (
      lp.display_name ILIKE '%' || p_query || '%'
      OR lp.full_name ILIKE '%' || p_query || '%'
      OR lp.constituency_name ILIKE '%' || p_query || '%'
      OR lp.current_party ILIKE '%' || p_query || '%'
    )
    AND (p_state_code IS NULL OR lp.state_code = p_state_code)
  ) search_results
  ORDER BY search_results.relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Explicitly enforce least-privilege execution boundary for SECURITY DEFINER RPC
REVOKE EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION global_search(TEXT, TEXT, INTEGER) TO anon, authenticated, service_role;
