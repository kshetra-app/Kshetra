-- Migration 021 labels these rows as demo challenges. Retire only the exact
-- seeded records so production listings do not present illustrative targets
-- and points as live community programs. Participation history is preserved.

UPDATE public.community_challenges
SET is_active = FALSE
WHERE is_active = TRUE
  AND (
    (
      title = 'Report 3 Local Issues'
      AND description = 'Document and report 3 civic issues in your constituency with photos and descriptions. Help make local problems visible!'
      AND category = 'civic'
      AND points = 30
      AND target_count = 3
      AND state_code IS NULL
    )
    OR (
      title = 'Attend a Gram Sabha / Ward Meeting'
      AND description = 'Attend your local governance meeting and share a summary of what was discussed. Active participation starts here.'
      AND category = 'civic'
      AND points = 20
      AND target_count = 1
      AND state_code IS NULL
    )
    OR (
      title = 'Verify 5 Election Promises'
      AND description = 'Track and verify the status of 5 election promises made by your local MLA. Submit evidence for each.'
      AND category = 'accountability'
      AND points = 50
      AND target_count = 5
      AND state_code IS NULL
    )
    OR (
      title = 'Complete 3 Leadership Modules'
      AND description = 'Learn about the Indian electoral process by completing any 3 modules from the Leadership Academy.'
      AND category = 'awareness'
      AND points = 30
      AND target_count = 3
      AND state_code IS NULL
    )
    OR (
      title = 'Start a Constituency Discussion'
      AND description = 'Create a meaningful discussion post about a local issue that gets at least 5 replies from community members.'
      AND category = 'community'
      AND points = 25
      AND target_count = 1
      AND state_code IS NULL
    )
    OR (
      title = 'Telangana Water Audit Challenge'
      AND description = 'Survey and document the status of public water supply in your ward. Report broken taps, dry borewells, or contamination.'
      AND category = 'civic'
      AND points = 40
      AND target_count = 5
      AND state_code = 'TS'
    )
    OR (
      title = 'Karnataka Guarantee Tracker'
      AND description = 'Verify whether 3 households in your area have received benefits under Karnataka''s 5 Guarantee schemes.'
      AND category = 'accountability'
      AND points = 35
      AND target_count = 3
      AND state_code = 'KA'
    )
  );
