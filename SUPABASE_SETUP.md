# Kshetra — Supabase Backend Setup Guide

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create a new project (Region: **Mumbai / ap-south-1** for lowest latency)
3. Note down:
   - **Project URL**: `https://xxxx.supabase.co`
   - **Anon Key**: `eyJhbGci...` (public, safe for client)
   - **Service Role Key**: `eyJhbGci...` (secret, server-only)

### 2. Configure Environment Variables

**Mobile app** (`apps/mobile/.env`):
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key-here
```

**API server** (`apps/api/.env`):
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
GEMINI_API_KEY=your-gemini-key-here
```

### 3. Run Migrations

In the Supabase Dashboard → **SQL Editor**, run these migrations **in order**:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_seed_telangana.sql
supabase/migrations/003_multi_state.sql
supabase/migrations/003_posts_polls_social.sql
supabase/migrations/004_civic_dashboard.sql
supabase/migrations/005_push_notifications.sql
supabase/migrations/006_trust_safety.sql
supabase/migrations/007_civic_engagement_pipeline.sql
supabase/migrations/008_election_affidavits.sql
supabase/migrations/009_promise_tracker.sql
supabase/migrations/010_aspiring_leaders.sql
supabase/migrations/011_delimitation.sql
supabase/migrations/012_legislator_profiles.sql
supabase/migrations/013_content_accountability.sql
supabase/migrations/014_content_promotion_pipeline.sql
supabase/migrations/015_journalist_platform.sql
supabase/migrations/016_politician_portal.sql
supabase/migrations/017_campaign_manager.sql
supabase/migrations/018_enhanced_civic.sql
supabase/migrations/019_live_election.sql
supabase/migrations/020_foundation_hardening.sql    ← NEW
supabase/migrations/021_seed_demo_data.sql          ← NEW
```

Or use the Supabase CLI:
```bash
npx supabase db push --db-url "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres"
```

### 4. Create Storage Buckets

In Dashboard → **Storage**, create these buckets:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `avatars` | ✅ | User profile photos |
| `kyc-selfies` | ❌ | KYC verification selfies |
| `issue-media` | ✅ | Civic issue photos/videos |
| `short-videos` | ✅ | Political short thumbnails |
| `evidence` | ✅ | Promise evidence uploads |
| `manifesto-docs` | ✅ | Party manifesto PDFs |

For each **public** bucket, add this storage policy:
- **SELECT**: Allow for all users (`true`)
- **INSERT**: Allow for authenticated users (`auth.uid() IS NOT NULL`)

For `kyc-selfies`:
- **SELECT**: Only admins (`EXISTS(SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin')`)
- **INSERT**: Authenticated users, own folder (`bucket_id = 'kyc-selfies' AND (storage.foldername(name))[1] = auth.uid()::text`)

### 5. Enable Realtime

In Dashboard → **Database** → **Replication**:

Enable realtime for these tables:
- `civic_issues`
- `posts`
- `comments`
- `election_promises`
- `delimitation_events`
- `political_shorts`

### 6. Refresh Materialized Views

After seeding data, run in SQL Editor:
```sql
SELECT refresh_materialized_views();
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Zustand   │  │ useSupabase  │  │ Offline Sync     │  │
│  │ Stores    │←→│ Query Hook   │  │ Queue (MMKV)     │  │
│  │ (seed +   │  │ (SWR)        │  │ (enqueue/flush)  │  │
│  │  live)    │  └──────┬───────┘  └────────┬─────────┘  │
│  └────┬──────┘         │                   │            │
│       │                │                   │            │
│  ┌────▼────────────────▼───────────────────▼─────────┐  │
│  │         supabaseDataService.ts                     │  │
│  │  (guard → Supabase client → error handling)        │  │
│  └────────────────────────┬──────────────────────────┘  │
│                           │                             │
│  ┌────────────────────────▼──────────────────────────┐  │
│  │         supabaseBootstrap.ts                       │  │
│  │  (profile sync, hydrate stores, start realtime)    │  │
│  └────────────────────────┬──────────────────────────┘  │
└───────────────────────────┼─────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   Supabase     │
                    │                │
                    │ ├─ Auth        │
                    │ ├─ Database    │
                    │ │  ├─ 50+ tables
                    │ │  ├─ RPC functions
                    │ │  ├─ Triggers  │
                    │ │  └─ Mat. views│
                    │ ├─ Realtime    │
                    │ ├─ Storage     │
                    │ └─ Edge Funcs  │
                    └────────────────┘
```

## Data Flow

### Write (optimistic update + background sync):
1. User taps "Upvote" → Zustand store updates **instantly** (optimistic)
2. `enqueue('upvote_issue', {...})` → tries immediate Supabase call
3. If online: Supabase upserts, trigger updates counter → done
4. If offline: MMKV queue persists op → replayed when connectivity returns

### Read (stale-while-revalidate):
1. Store initializes with seed data (instant UI)
2. `bootstrapSupabase()` calls `hydrateFromServer()`
3. Server data merges into store (server wins, seed fills gaps)
4. Realtime subscriptions push live updates

## Key RPC Functions

| Function | Purpose |
|----------|---------|
| `get_feed(state, constituency?, type?, cursor, limit)` | Paginated feed with author profiles, polls, media, hashtags |
| `get_issues(state, constituency?, status?, category?, cursor, limit)` | Issues with user upvote/follow status |
| `global_search(query, state?, limit)` | Cross-entity search (constituencies, issues, headlines, legislators) |
| `get_trending_hashtags(state?, limit)` | Top hashtags by post count in last 7 days |
| `get_user_dashboard(user_id)` | User metrics (posts, issues, reputation, tier) |
| `get_constituency_stats(constituency_id)` | Constituency analytics (issues, resolution time, top categories) |

## Materialized Views

| View | Purpose | Refresh |
|------|---------|---------|
| `mv_state_election_summary` | Party seats, votes, margins per election | After election data import |
| `mv_platform_metrics` | Total users, posts, issues, etc. | Every 15 min (pg_cron) |

## Security Model

- **Row-Level Security** on every table
- **Anon key**: Read-only access to public data
- **Auth key**: Read + write own data
- **Service role**: Full access (API server only, never in client)
- **Auto-profile creation**: Postgres trigger on `auth.users` INSERT
- **KYC gating**: Content creation requires contributor verification
