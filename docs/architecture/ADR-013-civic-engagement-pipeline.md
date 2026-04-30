# ADR-013: Civic Engagement Pipeline

**Status**: Proposed  
**Date**: 2026-04-30

## Context

The Civic Dashboard (Sprint 4) has a working UI shell — IssueCard, ReportIssueSheet, SentimentBar, HeadlineCard — but all data is hardcoded seed. There is no real content entry point, no persistence, no impact loop. The questions are:

1. **Who posts what?** Who creates civic issues, who writes headlines, who provides sentiment?
2. **What is the entry point?** How does content get into the system?
3. **What are user actionables?** How do users create real-world civic impact?

## Decision

Build a 4-layer civic engagement system with clear content pipelines, accountability mechanisms, and impact measurement.

---

## Architecture

### Layer 1: Issue Reporting Pipeline

```
Citizen → ReportIssueSheet → Moderation Queue → Published Issue → Community Engagement
```

**Entry points:**
- **Any authenticated user** can report a civic issue via `ReportIssueSheet`
- Issue is geotagged to their constituency (auto from "My Constituency" or manual pick)
- Photo evidence supported via `expo-image-picker` (stored in Supabase Storage)
- GPS coordinates captured at report time for precise location

**Issue lifecycle:**
```
OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
                                         ↑
                                    REOPENED (if community disputes resolution)
```

**Who moves status forward:**
| Transition | Actor | Mechanism |
|---|---|---|
| open → acknowledged | Moderator / Verified Official | Manual via dashboard |
| acknowledged → in_progress | Verified Official / Admin | Status update + comment |
| in_progress → resolved | Verified Official | Must include resolution note |
| resolved → closed | Auto (after 7 days) or Admin | Community can dispute within 7 days |
| resolved → reopened | Community (5+ dispute votes) | Dispute mechanism |

**Content moderation:**
- New issues enter a moderation queue (leverages Sprint 6 Trust & Safety)
- AI pre-screening: check for spam, hate speech, duplicate issues
- Verified users (journalists, officials) bypass queue
- Reputation score affects queue priority

### Layer 2: Community Engagement Actions

**What users can do to create impact:**

| Action | Mechanism | Impact |
|---|---|---|
| **Upvote** | Tap upvote on IssueCard | Surfaces priority; triggers milestone notifications at 10/50/100/500 |
| **Comment** | Add context, photos, evidence | Builds case; notifies reporter + upvoters |
| **Share** | Deep-link to issue via `expo-sharing` | Amplifies reach outside app |
| **Tag MLA** | "@MLA" button on issue | Sends push notification to MLA's verified account |
| **Dispute Resolution** | Vote "not resolved" on resolved issues | 5+ disputes → auto-reopen |
| **Follow** | Follow an issue for updates | Push notification on every status change |
| **Verify** | "I've seen this too" with photo | Corroborates report; adds to evidence count |

**Milestone notifications (via Sprint 5 infra):**
- 10 upvotes → notify reporter ("Your issue is gaining traction")
- 50 upvotes → notify constituency MLA ("A civic issue needs attention")  
- 100 upvotes → notify state-level dashboard ("Trending civic issue")
- 500 upvotes → auto-promote to Headlines tab

### Layer 3: Headlines & News Pipeline

**Entry points (3 sources):**

1. **Automated RSS/Scraper** (Phase 2)
   - Sources: Telangana Today, Deccan Chronicle, The Hindu, NDTV, Indian Express, Sakshi
   - Supabase Edge Function runs every 30 min
   - AI summarizer (GPT-4o-mini) creates 1-2 sentence summaries
   - Auto-tagged to state + constituency via NER (named entity recognition)
   - Stored in `headlines` table

2. **Admin/Editorial** (Phase 1)
   - Admin panel (web, Phase 2) or direct Supabase insert
   - Curated, fact-checked headlines
   - Can be constituency-specific or state-wide

3. **Community-promoted issues** (Phase 1)
   - Issues hitting 500+ upvotes auto-generate a headline
   - Template: "[Constituency]: [Issue Title] — [upvote_count] citizens demand action"

### Layer 4: Sentiment Engine

**Computed, not user-entered.** Sentiment is derived from:

1. **Issue sentiment** — Each open issue in a constituency contributes negative sentiment weighted by severity (critical=4x, high=3x, medium=2x, low=1x)
2. **Resolution sentiment** — Each resolved issue contributes positive sentiment
3. **Post sentiment** — NLP analysis of posts in the Feed tab tagged to a constituency
4. **Comment tone** — AI-analyzed comment sentiment on issues

**Computation:**
- Supabase Edge Function runs daily (or on-demand via API)
- Stores rolling 30-day sentiment per constituency in a `constituency_sentiment` materialized view
- Score: -1.0 (crisis) to +1.0 (thriving)

**Formula:**
```
score = (resolved_weight + positive_posts) - (open_issues_weight + negative_posts)
        / total_signals
```

---

## Database Changes Required

### New table: `issue_comments`
```sql
CREATE TABLE issue_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### New table: `issue_follows`
```sql
CREATE TABLE issue_follows (
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);
```

### New table: `issue_disputes`
```sql
CREATE TABLE issue_disputes (
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT CHECK (char_length(reason) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);
```

### New table: `issue_evidence`
```sql
CREATE TABLE issue_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT CHECK (char_length(caption) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### New materialized view: `constituency_sentiment`
```sql
CREATE MATERIALIZED VIEW constituency_sentiment AS
SELECT
  c.id AS constituency_id,
  c.name AS constituency_name,
  COUNT(*) FILTER (WHERE ci.status = 'resolved') AS resolved_count,
  COUNT(*) FILTER (WHERE ci.status IN ('open','acknowledged','in_progress')) AS open_count,
  SUM(CASE ci.severity
    WHEN 'critical' THEN 4 WHEN 'high' THEN 3
    WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 1 END
  ) FILTER (WHERE ci.status IN ('open','acknowledged','in_progress')) AS negative_weight,
  COUNT(*) AS total_issues
FROM constituencies c
LEFT JOIN civic_issues ci ON ci.constituency_id = c.id
  AND ci.created_at > now() - INTERVAL '30 days'
GROUP BY c.id, c.name;
```

### Alter `civic_issues` — add columns
```sql
ALTER TABLE civic_issues ADD COLUMN follow_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE civic_issues ADD COLUMN evidence_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE civic_issues ADD COLUMN dispute_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE civic_issues ADD COLUMN resolution_note TEXT;
ALTER TABLE civic_issues ADD COLUMN resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE civic_issues ADD COLUMN mla_tagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE civic_issues ADD COLUMN mla_responded BOOLEAN NOT NULL DEFAULT false;
```

---

## Notification Triggers (extends Sprint 5)

| Trigger | Recipient | Template |
|---|---|---|
| `issue_upvote_milestone` | Reporter | "Your issue '{title}' reached {count} upvotes!" |
| `issue_status_change` | Reporter + followers | "Issue '{title}' is now {status}" |
| `issue_mla_tagged` | MLA (verified account) | "Citizens in {constituency} tagged you on: {title}" |
| `issue_mla_responded` | Reporter + followers | "Your MLA responded to '{title}'" |
| `issue_comment` | Reporter + followers | "{user} commented on '{title}'" |
| `issue_dispute` | Admin + resolver | "Resolution disputed on '{title}' ({dispute_count} disputes)" |
| `issue_promoted_headline` | Constituency followers | "Trending: {title} — {upvote_count} citizens" |

---

## Implementation Phases

### Phase 1 (Current Sprint — Offline-First Demo)
- ✅ UI components exist (IssueCard, ReportIssueSheet, SentimentBar, HeadlineCard)
- ✅ Supabase schema exists (004_civic_dashboard.sql)
- **Enhanced seed data** — multi-state, showcases full lifecycle (open→resolved, MLA tagged, disputes)
- **ReportIssueSheet** — multi-state aware (use active state, not hardcoded TS)

### Phase 2 (Supabase Wiring)
- Connect civic store to Supabase realtime
- Issue CRUD (create, upvote, comment, follow)
- Headline fetch from DB
- Push notifications on status change

### Phase 3 (Impact Features)
- MLA tagging + response tracking
- Dispute mechanism on resolved issues
- Evidence/corroboration uploads
- Auto-promote to headlines at milestone

### Phase 4 (Intelligence)
- Automated headline ingestion (RSS + AI summarizer)
- NLP sentiment from posts + comments
- Constituency health score dashboard
- Predictive: "Issues likely to escalate" based on upvote velocity

---

## Consequences

- **Positive**: Creates a genuine civic accountability loop — citizens report → community amplifies → officials respond → resolution tracked
- **Positive**: Differentiates Kshetra from generic political apps — this is actionable, not just informational
- **Positive**: Built on existing infrastructure (Supabase, Push Notifications, Trust & Safety)
- **Risk**: Content moderation at scale — misinformation, political weaponization of issue reports
- **Risk**: MLA tagging could be abused — rate limiting + verification required
- **Mitigation**: Reputation system (Sprint 6) + AI pre-screening + human moderator queue
