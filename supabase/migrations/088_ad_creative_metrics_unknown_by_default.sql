-- Ad delivery has no durable event source yet. Unknown performance must stay NULL,
-- rather than being written as a successful-looking bundle of zero metrics.
ALTER TABLE ad_creatives
  ALTER COLUMN performance DROP DEFAULT;

-- Drafts cannot have delivery performance. Clear only the exact legacy default
-- payload so manually supplied/non-default data is left untouched.
UPDATE ad_creatives
SET performance = NULL
WHERE status = 'draft'
  AND performance = '{"impressions":0,"reach":0,"clicks":0,"engagements":0,"shares":0,"ctr":0,"cpm":0,"cpc":0,"cpe":0,"frequency":0,"spend":0,"conversions":0,"conversionRate":0,"roi":0}'::jsonb;
