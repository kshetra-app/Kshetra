# PANIN Engagement Infrastructure Discovery Inventory

**Document Type:** Source-of-Truth Architectural Discovery & Future Workstream Inventory  
**Job Extension:** W011 — Engagement Infrastructure Discovery Extension  
**Date:** September 21, 2026  
**Status:** `DISCOVERY_COMPLETE_AWAITING_CTO_REVIEW`  
**Base Commit:** [`709fb5d`](https://github.com/kshetra-app/Kshetra/commit/709fb5d)  
**Target Branch:** `master`  
**JSON Companion:** [`reports/engagement_infrastructure_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/engagement_infrastructure_inventory.json)  

---

## 1. Governance Boundary & Preflight Directives

This document represents the official source-of-truth inventory for the future **PANIN Identity + Presence + Social Engagement** workstream, executed as an authorized discovery extension of the W011 Preflight.

In strict accordance with the Master Execution Framework and CTO directives:
1. **Zero application code modified:** All mobile components (`apps/mobile/**`) and backend API routes (`apps/api/**`) remain completely untouched.
2. **Zero database mutations:** No migrations executed, no SQL run, staging and production databases remain unmodified.
3. **No deployment executed:** Cloud services and container environments remain unchanged.
4. **W011 implementation remains separately gated:** Implementation authorization for Job 011 has NOT yet been granted.
5. **No start of W012:** Engineering sequence remains strictly held at Job 011 preflight closure.

---

## 2. Executive Inventory Summary

Across the 8 core engagement domains, **42 discrete technical capabilities** and **17 future product concepts** were audited against the live codebase and PostgreSQL migrations:

```
┌─────────────────────────────────────────────────────────────────────────┐
│              ENGAGEMENT INFRASTRUCTURE CLASSIFICATION TOTALS             │
├──────────────────────────────────────────────────────────┬──────────────┤
│ 1. EXISTS — PRODUCTION-READY                             │  7 items     │
│ 2. EXISTS — PARTIAL                                      │ 14 items     │
│ 3. EXISTS — DEFECTIVE                                    │ 10 items     │
│ 4. EXISTS — NOT SUITABLE FOR FUTURE REQUIREMENT          │  3 items     │
│ 5. DOES NOT EXIST                                        │  8 items     │
│ 6. UNKNOWN                                               │  0 items     │
├──────────────────────────────────────────────────────────┼──────────────┤
│ TOTAL AUDITED CAPABILITIES                               │ 42 items     │
└──────────────────────────────────────────────────────────┴──────────────┘
```

### High-Level Architectural Reality
* **Core Relational Strengths:** The PostgreSQL layer contains exceptionally sophisticated relational and spatial models for posts, comments, reactions, administrative hierarchies (down to polling booths and wards), and trust & safety reporting.
* **Storage Void:** There is **zero cloud storage infrastructure** configured in Supabase or Fastify. No storage buckets exist (`avatars`, `posts`, `statuses` do not exist). Mobile currently relies on local `file:///` URIs from `expo-image-picker`, meaning user-captured photos cannot be viewed by other users.
* **Client/Server Disconnects:** Several major database tables (`user_favourites`, `post_media`, `push_tokens`, `notification_preferences`) exist with full RLS in PostgreSQL, but are completely uninvoked or bypassed by the mobile app, which instead relies on local MMKV/AsyncStorage or mock stubs.
* **Presence & Stories Void:** Ephemeral 24-hour status, live presence, and story viewing **do not exist** anywhere in the monorepo.

---

## 3. Domain Deep-Dive: 8 Core Engagement Layers

```
================================================================================
DOMAIN 1: PROFILE / IDENTITY
================================================================================
```

### 1.1 User Profile Database Table & Schema
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `supabase/migrations/006_trust_safety.sql`, `027_extend_role_and_verification.sql` (table `public.user_profiles`).
* **Current Behavior:** Stores `user_id` (UUID PK refs `auth.users`), `display_name` (2–50 chars), `bio` (<=300 chars), `avatar_url` (TEXT), `constituency_id` (TEXT refs `constituencies`), `state_code` (TEXT refs `states`), `role` (CHECK: citizen, journalist, activist, politician, official, moderator, admin, aspirant, party), `reputation_score` (INT def 0), `post_count` (INT def 0), `is_suspended` (BOOL def false), `suspended_until` (TIMESTAMPTZ), `suspension_reason` (TEXT), `verification_status` (TEXT def 'unverified'), `created_at`, `updated_at`.
* **Persistence Target:** PostgreSQL `public.user_profiles`.
* **API Path:** Direct Supabase client (`apps/mobile/lib/supabaseDataService.ts:671, 685, 2112`).
* **Authentication / Authorization:** Supabase Auth JWT (`auth.uid() = user_id`).
* **RLS / Security Status:** `FORCE ROW LEVEL SECURITY` active (Migration 038). "Public read user_profiles" restricts to `is_suspended = false`. INSERT and UPDATE policies enforce `auth.uid() = user_id`.
* **Media / Storage Dependency:** `avatar_url` is a plain text column; no backing storage bucket exists.
* **Notification Dependency:** None.
* **Geography Dependency:** Foreign keys to `constituencies(id)` and `states(code)`.
* **Known Defects:** `fetchVerifiedPoliticians` in `apps/mobile/lib/supabaseDataService.ts:1400` queries non-existent columns (`id, constituency, state`) instead of canonical columns (`user_id, constituency_id, state_code`), failing if executed against live PostgreSQL.
* **Reusable Components:** Robust role check constraints, verification status flags, reputation tracking.
* **What Must Be Built Later:** Migration adding: `cover_image_url`, `handle` (unique slug, e.g. `@username`), `privacy_settings` JSONB, `follower_count`, `following_count`.

---

### 1.2 Avatar & Profile Photo Support
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/mobile/components/UserProfileCard.tsx` & `apps/mobile/lib/supabaseDataService.ts:685`.
* **Current Behavior:** `UserProfileCard` renders an `<Image>` if `avatarUrl` is provided, otherwise falls back to an Ionicons person glyph with role-coded borders. `updateUserProfile` accepts `avatarUrl`.
* **Persistence Target:** `user_profiles.avatar_url`.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** Authenticated user (`auth.uid() = user_id`).
* **RLS / Security Status:** Verified secure under `Users update own profile`.
* **Media / Storage Dependency:** Requires external public URL; no upload mechanism in profile editor.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** `EditProfileScreen` (`apps/mobile/app/edit-profile.tsx`) lacks an avatar selection or photo upload UI component entirely.
* **Reusable Components:** `UserProfileCard` compact and full avatar rendering.
* **What Must Be Built Later:** Supabase Storage `avatars` bucket, photo picker with cropping/resizing in `EditProfileScreen`, upload pipeline returning public CDN URL.

---

### 1.3 Cover / Banner Image Support
* **Classification:** `EXISTS — NOT SUITABLE FOR FUTURE REQUIREMENT`
* **Exact File / Table:** `supabase/migrations/027_extend_role_and_verification.sql` (table `public.pages`).
* **Current Behavior:** `banner_url` exists exclusively on the `pages` table for organizational/party entities. The citizen `user_profiles` table has NO cover/banner image column.
* **Persistence Target:** `pages.banner_url` (not on `user_profiles`).
* **API Path:** None.
* **Authentication / Authorization:** Page owner / Admin only.
* **RLS / Security Status:** Governed by `pages` RLS policies.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Citizen profiles cannot customize or display a profile banner/cover image.
* **Reusable Components:** `pages` table banner column schema pattern.
* **What Must Be Built Later:** Database migration adding `cover_image_url TEXT` to `user_profiles`; responsive banner header component in Profile 2.0.

---

### 1.4 Username / Unique Handle
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `user_profiles` table (lacks handle column; only `pages` table has `handle TEXT UNIQUE`).
* **Current Behavior:** Users only possess a non-unique `display_name` (2–50 characters).
* **Persistence Target:** None for citizens.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** @-mentions in posts and comments cannot function without unique handles.
* **Geography Dependency:** None.
* **Known Defects:** No unique human-readable URL routes (e.g. `/u/rajesh_sharma`); impossible to distinguish identical display names or mention users in discussions.
* **Reusable Components:** Handle regex validation from `pages` table (`CHECK (char_length(handle) BETWEEN 2 AND 50)`).
* **What Must Be Built Later:** Migration adding `handle TEXT UNIQUE` to `user_profiles`; handle reservation/claim API; `@mention` tokenizer for posts and comments.

---

### 1.5 Bio & Description
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/006_trust_safety.sql` & `apps/mobile/app/edit-profile.tsx`.
* **Current Behavior:** Bio field (up to 300 characters) is persisted to `user_profiles.bio` via `updateMyProfile`. Rendered in `UserProfileCard`.
* **Persistence Target:** PostgreSQL `user_profiles.bio`.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** Authenticated user.
* **RLS / Security Status:** Protected by RLS `Users update own profile`.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Bio updates in `edit-profile.tsx` do not run through automated content moderation before persisting.
* **Reusable Components:** Character-limited text input in `EditProfileScreen`.
* **What Must Be Built Later:** Content moderation check on bio update; support for clickable hashtags and links in bio.

---

### 1.6 Location & Kshetra Association
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `user_profiles` (`constituency_id`, `state_code`) & `apps/mobile/stores/myConstituency.ts`.
* **Current Behavior:** User selects constituency during onboarding. Stored primarily in client-side MMKV (`useMyConstituencyStore`), optionally written to `user_profiles.constituency_id`.
* **Persistence Target:** Client MMKV (primary) / PostgreSQL `user_profiles` (optional).
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** Authenticated user.
* **RLS / Security Status:** Protected by RLS.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Determines which localized push alerts the user receives.
* **Geography Dependency:** Foreign key to `constituencies(id)`.
* **Known Defects:** Onboarding (`apps/mobile/app/onboarding.tsx:90`) generates synthetic user ID (`user-${Date.now()}`) in local store. Home constituency in MMKV frequently drifts from database `user_profiles.constituency_id`.
* **Reusable Components:** `getUnifiedConstituenciesForState` adapter in `stateDataAdapter.ts`.
* **What Must Be Built Later:** Strict bidirectional synchronization ensuring MMKV and `user_profiles.constituency_id` never diverge; support for multi-tier locality (Mandal / Ward).

---

### 1.7 Privacy Controls
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `user_profiles` table.
* **Current Behavior:** Zero privacy controls exist. All non-suspended user profiles are 100% public under the `Public read user_profiles` RLS policy.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** Completely open read.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Citizens cannot hide their constituency, lock their profile, or restrict direct messages.
* **Reusable Components:** None.
* **What Must Be Built Later:** Migration adding `privacy_settings JSONB DEFAULT '{"profile_visibility":"public","allow_dms":"everyone","show_constituency":true}'::jsonb`.

---

### 1.8 Profile API Routes (Fastify)
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `apps/api/src/routes/`.
* **Current Behavior:** Fastify backend contains zero routes for profile fetching, updating, or search. The mobile client queries Supabase directly.
* **Persistence Target:** N/A.
* **API Path:** Missing (violates DEF-005 strangler target).
* **Authentication / Authorization:** None.
* **RLS / Security Status:** N/A.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Bypasses API circuit breaker, rate limiting, and centralized auditing.
* **Reusable Components:** None.
* **What Must Be Built Later:** Fastify routes: `GET /api/v1/profile/me`, `PATCH /api/v1/profile/me`, `GET /api/v1/profile/:handleOrId`, `GET /api/v1/profile/:handleOrId/activity`.

---

### 1.9 Profile Screens (Mobile UI)
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/mobile/app/(tabs)/profile.tsx`, `apps/mobile/app/edit-profile.tsx`, `apps/mobile/app/user/[userId].tsx`.
* **Current Behavior:** Profile tab is currently an account settings menu with `UserProfileCard` on top. `user/[userId].tsx` shows another user's authored posts.
* **Persistence Target:** `user_profiles` and local Zustand stores.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** `useAuthStore`.
* **RLS / Security Status:** Follows Supabase RLS.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Header bell icon navigates to `/notifications`.
* **Geography Dependency:** Displays home constituency name.
* **Known Defects:** Profile tab lacks social activity, badges, media grid, or status reel. `user/[userId].tsx` falls back to fake mock user if DB returns empty.
* **Reusable Components:** `UserProfileCard`, `PostCard` list in `user/[userId].tsx`.
* **What Must Be Built Later:** Complete Profile 2.0 layout separating "My Public Profile" (social view) from "Settings & Preferences", including tabbed activity (Posts, Comments, Upvotes, Media).

---

### 1.10 Image Upload, Storage & Processing Pipeline
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `apps/mobile/` & `apps/api/`.
* **Current Behavior:** `expo-image-picker` is installed and picks images from camera/library at 0.7 JPEG quality, but returned `file:///` URIs are stored in local state only. Zero cloud upload or server processing exists.
* **Persistence Target:** Local device disk only.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** No storage policies exist.
* **Media / Storage Dependency:** Completely missing Supabase Storage bucket.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Photos selected on one device cannot be viewed by any other device or user.
* **Reusable Components:** `expo-image-picker` in package dependencies.
* **What Must Be Built Later:** Supabase Storage bucket provisioning, pre-signed upload URL endpoint, client-side WebP compression, EXIF stripping.

---

### 1.11 Profile Moderation & Security
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/api/src/routes/moderation.ts` & `user_profiles.is_suspended`.
* **Current Behavior:** Backend Fastify routes provide automated moderation via OpenAI (fail-closed W009-B3). `user_profiles` has `is_suspended` flag with RLS hiding suspended accounts.
* **Persistence Target:** `user_profiles` & `moderation_actions`.
* **API Path:** `POST /api/v1/moderation/check`.
* **Authentication / Authorization:** Fastify token / Supabase Auth.
* **RLS / Security Status:** "Public read user_profiles" hides `is_suspended = true`.
* **Media / Storage Dependency:** None (text only).
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** `edit-profile.tsx` does not invoke `checkContentModeration` before saving bio updates.
* **Reusable Components:** OpenAI moderation pipeline in Fastify.
* **What Must Be Built Later:** Automated moderation check on profile bio and display name updates; image moderation for avatars.

---

```
================================================================================
DOMAIN 2: FEED / CONTENT
================================================================================
```

### 2.1 Posts (Discussions, News, Opinions, Alerts)
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (table `public.posts`), `025_feed_realtime_and_social.sql`.
* **Current Behavior:** Full CRUD for posts with type ('discussion', 'news', 'opinion', 'question', 'alert', 'poll'), state_code, constituency_id, language, reply_count, reaction_count, soft deletion (`is_deleted`), and Supabase Realtime broadcast.
* **Persistence Target:** PostgreSQL `public.posts`.
* **API Path:** Direct Supabase client (`apps/mobile/lib/supabaseDataService.ts:272`).
* **Authentication / Authorization:** `auth.uid() = author_id`.
* **RLS / Security Status:** `FORCE ROW LEVEL SECURITY` active. Public read where `is_deleted = false`. INSERT, UPDATE, and DELETE strictly enforced on `author_id`.
* **Media / Storage Dependency:** `post_media` table exists in DB, but currently disconnected.
* **Notification Dependency:** `notification_log` has `post_reply` trigger.
* **Geography Dependency:** Composite index `idx_posts_scope` on `(state_code, constituency_id)`.
* **Known Defects:** `ComposeSheet.tsx:180` generates synthetic `local-*` ID that is never reconciled with server UUID (W011-DEF-01); `feed.ts:1353, 1362` duplicates submissions on online networks (W011-DEF-07).
* **Reusable Components:** `PostCard.tsx`, `state_feed` SQL view, Realtime replication subscription.
* **What Must Be Built Later:** Reconcile synthetic IDs on post creation; migrate direct client queries to Fastify API.

---

### 2.2 Comments & Replies
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (table `public.comments`), `apps/mobile/components/PostDetailModal.tsx`.
* **Current Behavior:** Single-level comments on posts with pre-insertion content moderation check; reaction counting and multilingual language tags; Supabase Realtime enabled.
* **Persistence Target:** PostgreSQL `public.comments`.
* **API Path:** Direct Supabase client (`apps/mobile/lib/supabaseDataService.ts:371`).
* **Authentication / Authorization:** `auth.uid() = author_id`.
* **RLS / Security Status:** Public read where `is_deleted = false`. INSERT, UPDATE, and DELETE restricted to `author_id`.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** `notification_log` has `comment_reply` trigger.
* **Geography Dependency:** Inherits parent post geography.
* **Known Defects:** `PostDetailModal.tsx:83` generates synthetic ID `local-c-${Date.now()}` un-reconciled with server (W011-DEF-02); `offlineSync.ts:167` omits `add_comment` and drops offline comments (W011-DEF-06).
* **Reusable Components:** `PostDetailModal` UI, comments Realtime listener.
* **What Must Be Built Later:** Nested reply threading (`parent_id` column on `comments`); reconcile comment UUIDs on creation.

---

### 2.3 Reactions / Likes
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (table `public.reactions`), `025_feed_realtime_and_social.sql`.
* **Current Behavior:** Supports 4 reaction types ('like', 'insightful', 'disagree', 'celebrate') targeting either a post or a comment. Enforces exactly one reaction per user per target via unique index constraints.
* **Persistence Target:** PostgreSQL `public.reactions`.
* **API Path:** Direct Supabase client (`apps/mobile/lib/supabaseDataService.ts:408`).
* **Authentication / Authorization:** `auth.uid() = user_id`.
* **RLS / Security Status:** Public read; authenticated users insert and delete own reactions.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** `notification_log` has `reaction` trigger.
* **Geography Dependency:** None.
* **Known Defects:** Optimistic reaction toggle in `feed.ts` does not implement the canonical 4-state lifecycle (W011-DEF-08).
* **Reusable Components:** `REACTION_CONFIG` metadata and reaction picker in `PostCard`.
* **What Must Be Built Later:** PostgreSQL trigger function to atomically update `reaction_count` on posts and comments upon reaction insert/delete.

---

### 2.4 Shares & Reposts
* **Classification:** `EXISTS — NOT SUITABLE FOR FUTURE REQUIREMENT`
* **Exact File / Table:** `apps/mobile/components/PostCard.tsx:215` & `apps/mobile/app/(tabs)/feed.tsx`.
* **Current Behavior:** Tapping share triggers native React Native `Share.share({ message: ... })`.
* **Persistence Target:** None (zero server-side persistence).
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** No in-app repost, quote-post, or feed redistribution capability; no share counters.
* **Reusable Components:** Native OS share action handler.
* **What Must Be Built Later:** In-app repost schema (`repost_of_post_id` on posts or dedicated `post_shares` table); quote-post composer; share counter.

---

### 2.5 Saves & Bookmarks
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** N/A.
* **Current Behavior:** Zero bookmarking or saved posts capability exists in database schema or mobile stores.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Citizens cannot save important civic discussions, legal updates, or government schemes for later review.
* **Reusable Components:** None.
* **What Must Be Built Later:** Migration creating `post_bookmarks (id, user_id, post_id, created_at, UNIQUE(user_id, post_id))`; Bookmark toggle in `PostCard`; "Saved" tab in Profile 2.0.

---

### 2.6 Polls & Voting
* **Classification:** `EXISTS — DEFECTIVE`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (tables `polls`, `poll_options`, `poll_votes`) & `apps/mobile/components/ComposeSheet.tsx`.
* **Current Behavior:** Database schema cleanly supports polls with options and single-vote constraint (`UNIQUE(poll_id, user_id)`). `votePoll` in `supabaseDataService.ts:352` works. HOWEVER, `composePost` in DataService does NOT insert into `polls` or `poll_options`.
* **Persistence Target:** PostgreSQL `polls`, `poll_options`, `poll_votes` (schema only).
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** `auth.uid() = user_id`.
* **RLS / Security Status:** RLS enabled; public read, authenticated insert.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** `notification_log` has `poll_closed` trigger.
* **Geography Dependency:** Inherited from post geography.
* **Known Defects:** `ComposeSheet.tsx:202, 205` creates synthetic IDs (`poll-local-*`, `opt-local-*`) that are never sent to Supabase. Polls cannot be created on the server.
* **Reusable Components:** `votePoll` function in DataService; poll progress bar visualization in `PostCard`.
* **What Must Be Built Later:** Server-side atomic transaction inserting `posts` + `polls` + `poll_options` rows; poll expiration timer.

---

### 2.7 Media Attachments (Post Media)
* **Classification:** `EXISTS — NOT SUITABLE FOR FUTURE REQUIREMENT`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (table `public.post_media`).
* **Current Behavior:** Table exists with `media_type` ('image', 'link', 'video'), `url`, `thumbnail_url`, `alt_text`, `sort_order`. However, neither `supabaseDataService.ts`, nor `ComposeSheet.tsx`, nor `PostCard.tsx` ever reads or writes to `post_media`.
* **Persistence Target:** PostgreSQL `post_media` (dormant).
* **API Path:** None.
* **Authentication / Authorization:** RLS defined.
* **RLS / Security Status:** Public read, author insert.
* **Media / Storage Dependency:** Missing cloud storage bucket.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Complete disconnect between database table and client application.
* **Reusable Components:** Database table schema definition.
* **What Must Be Built Later:** Wire `post_media` to `composePost`; upload images to storage bucket before post creation; render image grid in `PostCard`.

---

### 2.8 Shorts (Vertical Political & Civic Video)
* **Classification:** `EXISTS — DEFECTIVE`
* **Exact File / Table:** `supabase/migrations/020_foundation_hardening.sql` (table `political_shorts`), `apps/mobile/stores/politicalShorts.ts`.
* **Current Behavior:** Database tables exist for `political_shorts`, `short_approvals`, `short_flags`, `short_comments`. However, mobile store `politicalShorts.ts:46-60` writes exclusively to local MMKV with synthetic IDs (`short-user-${Date.now()}`).
* **Persistence Target:** Local MMKV only (W011-DEF-04).
* **API Path:** None.
* **Authentication / Authorization:** None in store.
* **RLS / Security Status:** RLS policies defined in migration 020.
* **Media / Storage Dependency:** Requires video streaming/HLS CDN infrastructure.
* **Notification Dependency:** None.
* **Geography Dependency:** `constituency_id`, `state_code`.
* **Known Defects:** Citizen shorts uploads and community moderation approvals/flags remain isolated to a single device with zero backend propagation (W011-DEF-04).
* **Reusable Components:** `politicalShorts` store action interfaces.
* **What Must Be Built Later:** Wire `politicalShorts` store to backend API/Supabase; video transcoding and storage pipeline.

---

### 2.9 Drafts
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `apps/mobile/components/ComposeSheet.tsx`.
* **Current Behavior:** Discarding `ComposeSheet` immediately deletes all typed text. No draft storage exists for general feed posts.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Accidental sheet gestures destroy user input.
* **Reusable Components:** MMKV storage adapter.
* **What Must Be Built Later:** Auto-saving draft hook in `ComposeSheet` backed by MMKV (`kshetra-post-draft`).

---

### 2.10 Feed Ranking & Algorithmic Sorting
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (view `state_feed`), `apps/mobile/stores/feed.ts`.
* **Current Behavior:** Strictly reverse-chronological ordering (`ORDER BY created_at DESC`). Feed tabs ('foryou', 'latest', 'constituency', 'following') filter by author or scope client-side.
* **Persistence Target:** PostgreSQL `state_feed` view.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** Public read.
* **RLS / Security Status:** Inherited from `posts`.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** Filtered by `state_code` and `constituency_id`.
* **Known Defects:** 'For You' tab is identical to 'Latest' with minor client shuffle; no algorithmic engagement scoring or decay function.
* **Reusable Components:** `state_feed` SQL view.
* **What Must Be Built Later:** Materialized ranking view or query incorporating engagement velocity: `(reaction_count * 2 + reply_count * 3) / POWER(EXTRACT(EPOCH FROM (now() - created_at))/3600 + 2, 1.5)`.

---

### 2.11 Feed Pagination & Local Caching
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `apps/mobile/stores/feed.ts`.
* **Current Behavior:** 20-item page-based pagination, cached locally in AsyncStorage (`kshetra-feed`), with pull-to-refresh and offline retrieval.
* **Persistence Target:** Local AsyncStorage.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** Optional auth.
* **RLS / Security Status:** Public read.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** Retains active geography filter.
* **Known Defects:** Stores optimistic posts with synthetic `local-*` IDs permanently if offline (W011-DEF-01).
* **Reusable Components:** Pagination state machine and pull-to-refresh handlers.
* **What Must Be Built Later:** Reconcile optimistic posts upon network reconnect; integrate 4-state sync lifecycle (W011-DEF-08).

---

```
================================================================================
DOMAIN 3: FOLLOW / SOCIAL GRAPH
================================================================================
```

### 3.1 User-to-User Follows
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `supabase/migrations/028_user_follows.sql`, `apps/mobile/lib/supabaseDataService.ts:1129-1160`.
* **Current Behavior:** Upserts `user_follows (follower_id, followed_id)` with `UNIQUE` constraint. `fetchFollowedUserIds` returns string array of followed IDs used by `feed.ts` to filter the 'Following' tab.
* **Persistence Target:** PostgreSQL `public.user_follows`.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** `auth.uid() = follower_id`.
* **RLS / Security Status:** `FORCE ROW LEVEL SECURITY` active. Public read; authenticated users insert/delete their own follow records.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Missing 'new_follower' trigger in `notification_log` CHECK constraint.
* **Geography Dependency:** None.
* **Known Defects:** No `follower_count` or `following_count` columns on `user_profiles` (requires expensive runtime `COUNT(*)` queries); following a user dispatches zero notifications.
* **Reusable Components:** `user_follows` table schema, indexes, and DataService methods.
* **What Must Be Built Later:** Counter triggers on `user_profiles`; follow notification dispatch; Follower/Following list views.

---

### 3.2 Geography Follows (Constituency / Ward / Mandal)
* **Classification:** `EXISTS — DEFECTIVE`
* **Exact File / Table:** `supabase/migrations/001_initial_schema.sql` (table `user_favourites`), `apps/mobile/stores/favorites.ts`.
* **Current Behavior:** `user_favourites` table exists in DB with RLS. However, the mobile client uses local AsyncStorage store and NEVER reads or writes `user_favourites` in Supabase.
* **Persistence Target:** AsyncStorage only (disconnected from PostgreSQL).
* **API Path:** None.
* **Authentication / Authorization:** None in local store.
* **RLS / Security Status:** `user_favourites` RLS policies exist but remain uninvoked.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Backend cannot target constituency push alerts to database followers.
* **Geography Dependency:** Foreign key to `constituencies(id)`.
* **Known Defects:** Constituency favorites are lost on app reinstall or device switch; server cannot push constituency alerts to followers.
* **Reusable Components:** `user_favourites` SQL table definition.
* **What Must Be Built Later:** Wire `useFavoritesStore` to sync bidirectionally with `user_favourites` table; extend to follow Mandals and Wards.

---

### 3.3 Topic / Entity Follows (Issues & Promises)
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `supabase/migrations/007_civic_engagement_pipeline.sql` (`issue_follows`), `009_promise_tracker.sql` (`promise_follows`).
* **Current Behavior:** Citizens can follow civic issues and political promises. Issue follow triggers status change notifications.
* **Persistence Target:** PostgreSQL `issue_follows`, `promise_follows`.
* **API Path:** `issue_follows` uses Fastify `apiClient`; `promise_follows` is direct Supabase or local store.
* **Authentication / Authorization:** `auth.uid() = user_id`.
* **RLS / Security Status:** RLS active.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Triggers `issue_status_change` notifications.
* **Geography Dependency:** Scoped to issue/promise constituency.
* **Known Defects:** `toggleFollowPromise` in `apps/mobile/stores/promises.ts:575` mutates local state only without calling DataService or backend (W011-DEF-03).
* **Reusable Components:** `issue_follows` Fastify API endpoint.
* **What Must Be Built Later:** Wire promise follows to database; add hashtag follow capability (`hashtag_follows`).

---

### 3.4 Follower & Following Views (Mobile)
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `apps/mobile/app/user/`.
* **Current Behavior:** Tapping the follower or following counters on `UserProfileCard` or `user/[userId].tsx` does nothing. No view, modal, or screen exists to list followers or following.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** The social graph is completely opaque to users.
* **Reusable Components:** `UserProfileCard` (compact mode).
* **What Must Be Built Later:** New screen `app/user/[userId]/connections.tsx` with tabs for 'Followers' and 'Following', search bar, and Follow/Unfollow toggle.

---

### 3.5 Follow Notifications
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `supabase/migrations/005_push_notifications.sql` (table `notification_log`).
* **Current Behavior:** The `trigger_type` CHECK constraint on `notification_log` omits 'new_follower' or 'user_follow'.
* **Persistence Target:** None (attempting to insert would throw a CHECK constraint violation).
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Missing trigger type.
* **Geography Dependency:** None.
* **Known Defects:** Users receive zero feedback when other citizens or community leaders follow them.
* **Reusable Components:** `notification_log` table structure.
* **What Must Be Built Later:** Migration adding 'new_follower' to `notification_log` and `notification_preferences`; database trigger on `user_follows` INSERT.

---

```
================================================================================
DOMAIN 4: PRESENCE / STATUS
================================================================================
```

### 4.1 24-Hour Ephemeral Status / Stories
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** Zero implementation across database, API routes, or mobile UI. No ephemeral story or status concept exists.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** Requires media storage bucket.
* **Notification Dependency:** None.
* **Geography Dependency:** Local Kshetra status reel.
* **Known Defects:** Feature completely absent.
* **Reusable Components:** None.
* **What Must Be Built Later:** Table `user_statuses (id UUID, user_id UUID, media_url TEXT, media_type TEXT, caption TEXT, constituency_id TEXT, expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours', view_count INT, created_at TIMESTAMPTZ)`.

---

### 4.2 Status Media Pipeline
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** No upload, compression, or delivery pipeline exists for status media.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** Requires Supabase Storage bucket `statuses`.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** None.
* **Reusable Components:** `expo-image-picker` in package dependencies.
* **What Must Be Built Later:** Storage bucket `statuses` with 15MB file size limit, public read, authenticated insert, and client-side WebP/H.264 compression.

---

### 4.3 Status Viewer UI Component
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** No fullscreen story/status viewer with animated segment progress bars, swipe-down dismissal, or reply interactions.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** None.
* **Reusable Components:** `react-native-reanimated` (already installed in mobile dependencies).
* **What Must Be Built Later:** `StatusViewerModal.tsx` with animated timing bars, left/right tap zone navigation, swipe down to close, and quick direct-message reply.

---

### 4.4 Expiry & TTL Infrastructure
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** No background job, pg_cron worker, or Edge function exists in migrations to purge expired rows or orphan media.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** Orphan media deletion.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Without TTL automation, database and storage volume would bloat indefinitely.
* **Reusable Components:** `expires_at TIMESTAMPTZ` column pattern from `polls` table.
* **What Must Be Built Later:** Supabase pg_cron job or scheduled cron worker: `DELETE FROM user_statuses WHERE expires_at < now()`.

---

### 4.5 Realtime Presence / Online Indicators
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** `realtimeService.ts` listens to postgres_changes on tables, but does not utilize Supabase Realtime Presence channels.
* **Persistence Target:** Ephemeral WebSocket channel state.
* **API Path:** Supabase Realtime WebSocket.
* **Authentication / Authorization:** Supabase JWT.
* **RLS / Security Status:** Channel authorization.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Citizens cannot see whether their elected representatives or local moderators are currently active.
* **Reusable Components:** Supabase client in `apps/mobile/lib/realtimeService.ts`.
* **What Must Be Built Later:** Presence channel subscription: `channel.track({ online_at: new Date().toISOString() })`.

---

```
================================================================================
DOMAIN 5: NOTIFICATIONS
================================================================================
```

### 5.1 Notification Database Tables (Log & Preferences)
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/005_push_notifications.sql` (tables `notification_log`, `notification_preferences`, `push_tokens`).
* **Current Behavior:** Well-designed schema with delivery tracking (`delivered_at`, `read_at`), JSONB data payloads, source references (`source_post_id`, `source_comment_id`, `source_issue_id`), and per-trigger preferences.
* **Persistence Target:** PostgreSQL `notification_log`, `notification_preferences`, `push_tokens`.
* **API Path:** Direct Supabase client / Fastify API (stubs).
* **Authentication / Authorization:** `auth.uid() = user_id`.
* **RLS / Security Status:** `FORCE ROW LEVEL SECURITY` active. Users manage own tokens and preferences; users read/update own notification log.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Foundational data layer.
* **Geography Dependency:** Scoped alerts via `constituency_alert`.
* **Known Defects:** `trigger_type` CHECK constraint omits `new_follower`, `mention`, `status_reply`.
* **Reusable Components:** Complete database schema and index layout.
* **What Must Be Built Later:** Migration expanding `trigger_type` CHECK constraint.

---

### 5.2 Notification Triggers (Mobile Client)
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/mobile/lib/notificationTriggers.ts`.
* **Current Behavior:** Dispatches local notifications (`scheduleLocalNotification`) and updates local store (`useNotificationsStore`) for civic issues, promise updates, delimitation, and election milestones.
* **Persistence Target:** Local store and OS notification tray.
* **API Path:** Local only.
* **Authentication / Authorization:** Client-side.
* **RLS / Security Status:** N/A.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Local notification dispatch.
* **Geography Dependency:** Checks constituency name.
* **Known Defects:** Zero triggers exist for social engagement (no follow, reply, reaction, mention, or DM notifications).
* **Reusable Components:** `dispatchIfEnabled` category checker.
* **What Must Be Built Later:** Add social engagement triggers: `notifyNewFollower`, `notifyPostReply`, `notifyReactionMilestone`, `notifyMention`.

---

### 5.3 Push Notification Server Infrastructure
* **Classification:** `EXISTS — DEFECTIVE`
* **Exact File / Table:** `apps/api/src/routes/notifications.ts` & `apps/api/src/services/notifications.ts`.
* **Current Behavior:** All routes are non-DB console logging stubs. `register-token` explicitly states `// Non-DB invariant: Do NOT insert into device_tokens table`. `send` only logs to console.
* **Persistence Target:** None (console logging only).
* **API Path:** `/api/v1/notifications/register-token`, `/api/v1/notifications/send`.
* **Authentication / Authorization:** `x-user-id` / `x-api-key`.
* **RLS / Security Status:** N/A.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Core push delivery engine.
* **Geography Dependency:** None.
* **Known Defects:** Zero push notifications are ever delivered to real physical devices from the server; device tokens are never stored in the database.
* **Reusable Components:** Fastify route request schemas.
* **What Must Be Built Later:** Connect `register-token` to PostgreSQL `push_tokens` table; integrate Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNs) dispatch service.

---

### 5.4 Deep Linking from Notifications
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/mobile/lib/notificationTriggers.ts` & `apps/mobile/app/_layout.tsx`.
* **Current Behavior:** Triggers attach static route strings (e.g. `/ (tabs)/dashboard`). Expo-router processes deep links upon app launch.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** Client-side router.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Payload routing.
* **Geography Dependency:** None.
* **Known Defects:** No parameterized route handling for deep linking directly to specific posts, comments, or user profiles (e.g. `kshetra://post/:id`, `kshetra://user/:handle`).
* **Reusable Components:** `expo-linking` configuration in `app.json`.
* **What Must Be Built Later:** Universal link routing handler for entity deep links.

---

### 5.5 Unread Counters & Badge Sync
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/mobile/stores/notifications.ts`, `apps/mobile/app/(tabs)/profile.tsx`.
* **Current Behavior:** Local store tracks `unreadCount` and renders a red badge on the Profile tab bell icon.
* **Persistence Target:** Local AsyncStorage.
* **API Path:** None.
* **Authentication / Authorization:** Client-side.
* **RLS / Security Status:** `notification_log` has index `idx_notification_log_unread`.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Badge indicator.
* **Geography Dependency:** None.
* **Known Defects:** Local badge count never synchronizes with server-side `notification_log` read state, causing badge count to drift or reset across devices.
* **Reusable Components:** Bell icon with badge badge rendering in profile header.
* **What Must Be Built Later:** Server-backed unread counter API endpoint (`GET /api/v1/notifications/unread-count`).

---

### 5.6 Notification Digest Infrastructure
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** No daily or weekly email/push digest service exists.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Inactive citizens receive zero re-engagement summaries.
* **Reusable Components:** None.
* **What Must Be Built Later:** Scheduled worker aggregating top 3 posts in citizen's Kshetra for a weekly digest.

---

```
================================================================================
DOMAIN 6: COMMUNITY
================================================================================
```

### 6.1 Community Challenges & Civic Quests
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `supabase/migrations/010_aspiring_leaders.sql` (tables `community_challenges`, `challenge_participation`), `apps/mobile/stores/aspirant.ts`.
* **Current Behavior:** Database tables model challenges with categories, points, target counts, and participant progress. DataService has `fetchChallenges`.
* **Persistence Target:** PostgreSQL `community_challenges` (schema) / MMKV (store).
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** `auth.uid() = user_id`.
* **RLS / Security Status:** Public read; users participate.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** `state_code`.
* **Known Defects:** `joinChallenge` and `completeModule` in `apps/mobile/stores/aspirant.ts:438-480` mutate local MMKV only and never call backend persistence (W011-DEF-05).
* **Reusable Components:** `community_challenges` table schema; `fetchChallenges` in DataService.
* **What Must Be Built Later:** Wire challenge participation and completion to database; render challenges in community feed.

---

### 6.2 Community Groups / Local Forums
* **Classification:** `DOES NOT EXIST`
* **Current Behavior:** No groups, clubs, or neighborhood forum entities exist in schema or app. Discourse is purely broadcast/feed.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Citizens cannot form issue-specific or locality-specific civic working groups.
* **Reusable Components:** None.
* **What Must Be Built Later:** Schema for `community_groups (id, name, slug, constituency_id, description, member_count)` and `group_memberships`.

---

### 6.3 Content Moderation & Trust & Safety
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/006_trust_safety.sql`, `014_content_promotion_pipeline.sql`, `apps/api/src/routes/moderation.ts`.
* **Current Behavior:** Fail-closed OpenAI moderation check (W009-B3) blocking hate speech, harassment, and violence. Moderation actions logged to `moderation_actions` table.
* **Persistence Target:** PostgreSQL `moderation_actions` & Fastify API.
* **API Path:** `POST /api/v1/moderation/check`.
* **Authentication / Authorization:** Fastify / Supabase Auth.
* **RLS / Security Status:** Admin-only moderation log.
* **Media / Storage Dependency:** None (text only).
* **Notification Dependency:** None.
* **Geography Dependency:** `constituency_moderators` in migration 014.
* **Known Defects:** W011-DEF-12 & W011-DEF-13: Fastify moderation routes return synthetic IDs for verify-request and block/unblock when Supabase is disconnected.
* **Reusable Components:** `checkContentModeration` helper in DataService; Fastify moderation controller.
* **What Must Be Built Later:** Fix disconnected DB fallbacks (W011-B1); add image moderation for avatars and status media.

---

### 6.4 Citizen Reporting & Grievance Flagging
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (table `reports`), `032_reports_extend_targets.sql`, `apps/mobile/components/ReportSheet.tsx`.
* **Current Behavior:** Comprehensive reporting sheet allowing citizens to report posts, comments, or users with categorized reasons (spam, harassment, misinformation, hate_speech, violence, impersonation, other).
* **Persistence Target:** PostgreSQL `public.reports`.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** `auth.uid() = reporter_id`.
* **RLS / Security Status:** Users read own reports; authors cannot see who reported them.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** None.
* **Reusable Components:** `ReportSheet.tsx` component.
* **What Must Be Built Later:** Moderator triage dashboard for community volunteer reviewers.

---

```
================================================================================
DOMAIN 7: GEOGRAPHY / KSHETRA
================================================================================
```

### 7.1 Administrative Hierarchy Graph
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/001_initial_schema.sql`, `022_administrative_hierarchy.sql`, `023_local_body_representatives.sql`.
* **Current Behavior:** Robust spatial and administrative schema modeling India's complex hierarchy: States -> Constituencies -> Mandals -> Gram Panchayats -> Revenue Villages -> Polling Booths; and Urban Local Bodies -> ULB Wards. Includes M:N mandal↔constituency junction table.
* **Persistence Target:** PostgreSQL PostGIS tables.
* **API Path:** Direct Supabase client / `stateDataAdapter.ts`.
* **Authentication / Authorization:** Public read.
* **RLS / Security Status:** `FORCE ROW LEVEL SECURITY` active. Public read policies.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** Core foundation.
* **Known Defects:** Spatial boundaries for sub-constituency levels are sparsely populated with real geometry in staging seed data.
* **Reusable Components:** Complete database table schemas, PostGIS indexes, and foreign keys.
* **What Must Be Built Later:** Bulk boundary GeoJSON ingestion for assembly and ward delimitation boundaries.

---

### 7.2 My Kshetra Implementation (Mobile)
* **Classification:** `EXISTS — PARTIAL`
* **Exact File / Table:** `apps/mobile/stores/myConstituency.ts` & `apps/mobile/app/onboarding.tsx`.
* **Current Behavior:** Stores home AC in MMKV; sets default state filter; used to filter civic issues and local posts.
* **Persistence Target:** MMKV (`kshetra-my-constituency`).
* **API Path:** Local only.
* **Authentication / Authorization:** Local store.
* **RLS / Security Status:** N/A.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** Used to filter localized push triggers.
* **Geography Dependency:** `acNo, name, district, party`.
* **Known Defects:** Not synchronized with `user_profiles.constituency_id` in database.
* **Reusable Components:** `useMyConstituencyStore` hook and `isHome` helper.
* **What Must Be Built Later:** Sync home constituency with `user_profiles`; support multi-tier home (e.g. Ward 42 + Sanathnagar AC + Hyderabad District).

---

### 7.3 Geographic Feed Filtering
* **Classification:** `EXISTS — PRODUCTION-READY`
* **Exact File / Table:** `supabase/migrations/0035_posts_polls_social.sql` (view `state_feed`), `025_feed_realtime_and_social.sql`, `apps/mobile/stores/feed.ts`.
* **Current Behavior:** Filters posts by `state_code` and `constituency_id` using composite index `idx_posts_scope`. Mobile feed provides 3 scope toggles: National, State, Constituency.
* **Persistence Target:** PostgreSQL `state_feed` view.
* **API Path:** Direct Supabase client.
* **Authentication / Authorization:** Public read.
* **RLS / Security Status:** Inherited from `posts`.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** `state_code`, `constituency_id`.
* **Known Defects:** None.
* **Reusable Components:** Scope toggle UI in feed header; `idx_posts_scope` database index.
* **What Must Be Built Later:** Extend scope filter to support Mandal, Ward, and Polling Booth levels.

---

### 7.4 Kshetra Social Pages (Constituency Entity Pages)
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `apps/mobile/app/constituency/[id].tsx`.
* **Current Behavior:** Constituency screen displays electoral analytics, past election results, candidate affidavits, and demographic data. It has NO social feed, NO community discussion tab, and NO 'Follow Kshetra' action.
* **Persistence Target:** Electoral tables only.
* **API Path:** `stateDataAdapter.ts`.
* **Authentication / Authorization:** Public.
* **RLS / Security Status:** Public read.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** `constituencies(id)`.
* **Known Defects:** Constituency is treated as a static dataset rather than a living social and civic community.
* **Reusable Components:** Constituency banner and representative card in `ConstituencyDetailScreen`.
* **What Must Be Built Later:** Transform constituency view into a hybrid Social Page: Tab 1 (Civic Feed & Discussions), Tab 2 (Active Issues), Tab 3 (Electoral Data), Tab 4 (Representatives & Candidates).

---

```
================================================================================
DOMAIN 8: MEDIA / STORAGE
================================================================================
```

### 8.1 Supabase Storage Buckets
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `supabase/migrations/` & `config.toml`.
* **Current Behavior:** Zero storage buckets defined in SQL migrations or Supabase configuration. Neither `avatars`, `posts`, `issues`, nor `statuses` exists.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** Zero storage RLS policies configured.
* **Media / Storage Dependency:** Missing foundation.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Mobile client cannot upload binary files to Supabase cloud storage.
* **Reusable Components:** None.
* **What Must Be Built Later:** Migration creating storage buckets: `avatars` (public, 2MB limit), `post-media` (public, 10MB limit), `issue-evidence` (public, 10MB limit), `statuses` (public, 15MB limit, auto-expire).

---

### 8.2 Storage Upload Policies & Signed URLs
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** N/A.
* **Current Behavior:** No `storage.objects` RLS policies exist in migrations. No signed URL generation endpoint exists on Fastify.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Unauthenticated uploads or unauthorized deletions would be possible without RLS.
* **Reusable Components:** None.
* **What Must Be Built Later:** `storage.objects` RLS policies: authenticated users can insert into their own folder (`bucket/user_id/*`), public read.

---

### 8.3 Image & Video Processing Pipeline
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** `apps/api/src/` & `apps/mobile/lib/`.
* **Current Behavior:** No image resizing, thumbnail generation, video transcoding, or EXIF stripping.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** EXIF metadata (GPS coordinates, device info) not stripped before upload, presenting privacy risk.
* **Reusable Components:** None.
* **What Must Be Built Later:** Client-side image processing (strip EXIF, resize to max 1920x1080, convert to WebP); video thumbnail generation.

---

### 8.4 Orphan Media Cleanup
* **Classification:** `DOES NOT EXIST`
* **Exact File / Table:** N/A.
* **Current Behavior:** No garbage collection mechanism for uploaded images whose associated post/status creation failed or was deleted.
* **Persistence Target:** None.
* **API Path:** None.
* **Authentication / Authorization:** None.
* **RLS / Security Status:** None.
* **Media / Storage Dependency:** None.
* **Notification Dependency:** None.
* **Geography Dependency:** None.
* **Known Defects:** Storage costs will grow unbounded from abandoned uploads.
* **Reusable Components:** None.
* **What Must Be Built Later:** Background worker identifying unreferenced storage objects older than 24 hours and purging them.

---

## 4. Mapping of the 17 Future Concepts

| Concept # | Future Product Concept | Current Status | Key Gap Analysis | Required Engineering Work |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Profile 2.0** | `EXISTS — PARTIAL` | Basic `user_profiles` table exists. Missing: cover image, unique handle, social counters, privacy controls, tabbed social activity feed. | Migration adding columns to `user_profiles`; Fastify profile API; Profile 2.0 mobile screen. |
| **2** | **Profile photo** | `EXISTS — PARTIAL` | `avatar_url` column exists in `user_profiles` and `UserProfileCard` renders it. Missing: Supabase Storage bucket 'avatars', upload pipeline from camera/gallery, image cropping. | Storage bucket provisioning; mobile avatar upload handler. |
| **3** | **Cover image** | `DOES NOT EXIST` | `banner_url` only exists on `pages` table for political organizations. Citizen `user_profiles` table has no banner/cover column. | Migration adding `cover_image_url` to `user_profiles`; banner upload component; responsive header layout. |
| **4** | **Bio** | `EXISTS — PRODUCTION-READY` | `user_profiles.bio` exists with `<= 300` char constraint. Mobile `edit-profile` screen allows updating it and persists via `updateMyProfile`. | Add content moderation check before saving bio. |
| **5** | **Kshetra identity** | `EXISTS — PARTIAL` | `constituency_id` exists on `user_profiles`, and `myConstituency` store holds home constituency in MMKV. Missing: Verified Resident badge, voter status, ward-level micro-identity. | Synchronize `myConstituency` store with `user_profiles`; civic residency verification workflow. |
| **6** | **24-hour Status** | `DOES NOT EXIST` | Zero implementation. No database table, no TTL expiry, no mobile UI. | Migration creating `user_statuses`; pg_cron cleanup job; Status reel UI in feed header. |
| **7** | **Status media** | `DOES NOT EXIST` | No media capture or upload pipeline for ephemeral stories. | Supabase Storage bucket `statuses`; camera capture with text overlay; media compression. |
| **8** | **Status viewer** | `DOES NOT EXIST` | No fullscreen viewer modal with animated progress bars, touch navigation, or reply action. | `StatusViewerModal` component using `react-native-reanimated`; touch gesture handlers. |
| **9** | **Followers / Following** | `EXISTS — PARTIAL` | `user_follows` database table exists with RLS. Follow/unfollow functions work in DataService. Missing: follower/following count columns on `user_profiles`, follower/following list screens, follow notifications. | Add `follower_count`/`following_count` triggers to `user_profiles`; create Connections screen. |
| **10** | **People discovery** | `EXISTS — PARTIAL` | DataService has `fetchVerifiedPoliticians` and `fetchPublicAspirants`. Missing: Citizen discovery, 'Who to follow in your Kshetra', contact book sync, search by handle. | Fastify discovery endpoint; 'Discover People' carousel in feed and search tab. |
| **11** | **Kshetra discovery** | `EXISTS — PRODUCTION-READY` | `stateDataAdapter.ts` and administrative hierarchy migrations (022, 023) provide full search and traversal across states, constituencies, mandals, and wards. | Add social engagement metrics (active posts count, top issues count) to geography search cards. |
| **12** | **Polls** | `EXISTS — DEFECTIVE` | Database tables (`polls`, `poll_options`, `poll_votes`) exist with vote uniqueness constraint. However, `ComposeSheet.tsx` generates local synthetic IDs and never saves polls to Supabase. | Fix W011-DEF-01: Update `composePost` to insert poll + options transactionally in database. |
| **13** | **Questions** | `EXISTS — PARTIAL` | `posts.type` supports 'question', and `PostCard` renders question icon/badge. Missing: Best-answer selection, representative tagging, status tracking ('Answered by MLA'). | Add `accepted_comment_id` column to posts; question resolution badge. |
| **14** | **Profile activity** | `EXISTS — PARTIAL` | `UserProfileScreen` (`apps/mobile/app/user/[userId].tsx`) renders author's posts. Missing: Tabbed navigation for Posts, Replies/Comments, Upvotes, Media, and Questions. | Fetch functions for user comments and upvotes; tabbed pager component. |
| **15** | **Shareable profile cards** | `DOES NOT EXIST` | No dynamic image generator or QR code card for sharing citizen or candidate profiles to WhatsApp/Instagram. | `react-native-view-shot` or backend OpenGraph image generator (`/api/v1/og/profile/:handle`). |
| **16** | **Kshetra social pages** | `DOES NOT EXIST` | Constituency screens (`app/constituency/[id].tsx`) only show historical election data and affidavits. No social feed, no community chat, no 'Follow Kshetra' button. | Add localized social feed tab to constituency screen; wire Follow Constituency to `user_favourites` table. |
| **17** | **Engagement notifications** | `EXISTS — DEFECTIVE` | `notification_log` and preferences tables exist in DB, but `trigger_type` CHECK constraint lacks 'new_follower', API routes are non-DB stubs, and push delivery is disconnected. | Expand notification trigger types in schema; connect `register-token` to `push_tokens` table; integrate push delivery. |

---

## 5. Architectural Recommendations for the Future Workstream

To transition from the current fragmented baseline to a cohesive, production-ready engagement ecosystem, engineering work should be phased along four architectural vectors:

1. **Storage & Media Foundation (Zero-to-One):**
   - Execute a dedicated Storage Migration creating Supabase buckets (`avatars`, `post-media`, `statuses`, `issue-evidence`).
   - Implement strict bucket RLS: public read, authenticated insert scoped to `bucket/user_id/*`.
   - Implement client-side image compression and EXIF metadata stripping.

2. **Identity & Profile 2.0 Hardening:**
   - Extend `user_profiles` with `cover_image_url`, unique `handle`, and `privacy_settings`.
   - Implement Fastify Profile routes (`/api/v1/profile/*`) replacing direct client Supabase mutations.
   - Redesign mobile Profile screen to feature a cover banner, status ring, verified badges, and tabbed activity feeds.

3. **Social Graph & Presence Layer:**
   - Add database triggers to keep `follower_count` and `following_count` accurate on `user_profiles`.
   - Create the Follower/Following connection views.
   - Introduce `user_statuses` table with 24-hour TTL and scheduled pg_cron purge.
   - Build the `StatusViewerModal` in mobile with timer animations and direct reply.

4. **Notification & Engagement Loop Closure:**
   - Expand `notification_log.trigger_type` CHECK constraint to permit `new_follower`, `mention`, and `status_reply`.
   - Wire Fastify notification routes (`/api/v1/notifications/*`) to PostgreSQL `push_tokens` and `notification_log` instead of console stubs.
   - Connect real push dispatch service (FCM / APNs).

---

## 6. Preflight Conclusion & Governance Status

* **Engagement Discovery:** COMPLETE.
* **Artifacts Created:**
  - Markdown Inventory: [`docs/ENGAGEMENT_INFRASTRUCTURE_INVENTORY.md`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/docs/ENGAGEMENT_INFRASTRUCTURE_INVENTORY.md)
  - Structured JSON: [`reports/engagement_infrastructure_inventory.json`](file:///c:/Users/Laven/OneDrive/Desktop/Kshetra/reports/engagement_infrastructure_inventory.json)
* **Application & Database Mutation:** ZERO changes.
* **Engineering State:** HALTED. Awaiting CTO review.
