# Canonical Pre-Implementation Plan: Domain 5 — Media, News, Shorts & Live Broadcasting (JOB 037–045 & JOB 051–053)

**Plan Identifier:** `PLAN-DOMAIN-5-MEDIA-NEWS-SHORTS-AND-LIVE-BROADCASTING-REV-1.0`  
**Governing Authority:** Amendment v1.2 (`AMENDMENT_v1.2.md`), Amendment v1.5-A Section 26 (`AMENDMENT_v1.5-A.md`), Amendment v1.6 (`AMENDMENT_v1.6.md`), Rule IV-001 Non-Self-Acceptance & `AGENT_EXECUTION_PROTOCOL.md`  
**Target Scope:** Domain 5 (JOB 037, JOB 038, JOB 039, JOB 040, JOB 041, JOB 042, JOB 043, JOB 044, JOB 045, JOB 051, JOB 052, JOB 053)  
**Creation Date:** 2026-10-30  
**Status:** `SUBMITTED_FOR_REVIEW` (Implementation Authorization: `NO`)  

---

### Section 1: Executive Summary & Governing Authority

This authoritative Pre-Implementation Plan governs the engineering execution of **Domain 5: Media, News, Shorts & Live Broadcasting**, encompassing twelve interconnected jobs (**JOB 037 through JOB 045, and JOB 051 through JOB 053**) of the PANIN / Kshetra Master Blueprint and AI Agent Master Execution Job Book.

Domain 5 establishes the primary multimedia consumption, official accountability, political news curation, vertical video engagement, and live broadcasting infrastructure for PANIN across all 36 States/UTs and 4,123 Assembly Constituencies. It bridges the civic reporting of Domain 3 and the candidate political incubation of Domain 4 into an active, high-retention citizen information network.

Under **Rule IV-001** and **Amendment v1.5-A Section 26**, no production code modifications, database migrations, or endpoint deployments may begin until this plan is formally reviewed, architectural decisions are ratified, and `IMPLEMENTATION_AUTHORIZATION: YES` is granted by the user.

---

### Section 2: Architectural Scope & Work Breakdown Structure (12 Jobs)

Domain 5 is partitioned into twelve strictly defined jobs:

1. **JOB 037: Representative Civic Response Engine:**
   - Formal response pipeline for verified sitting representatives (MLAs, MPs, Corporators) and authorized staff.
   - Status updates, official resolution timeline, verified municipal attribution badges, and citizen dispute escalation.

2. **JOB 038: Political News Ingestion Pipeline:**
   - Multi-source factual news aggregation across the Election Commission of India (ECI), Press Information Bureau (PIB), State Legislative Assemblies, and verified regional RSS/Atom news feeds.
   - Ingestion deduplication, sentiment derivation, and fact-checking metadata tagging.

3. **JOB 039: News Rights & Multi-Lingual Presentation:**
   - Editorial presentation standards, fair-use statutory attribution, canonical source linking, and full multilingual localization across all 13 official Indian languages.

4. **JOB 040: Political Context Engine:**
   - Automated geospatial and political entity resolution binding news stories directly to specific Assembly Constituencies (AC), Parliamentary Constituencies (PC), sitting MLAs/MPs, and pending civic issues.

5. **JOB 041: Shorts Creation Pipeline:**
   - Vertical video (9:16) upload pipeline with strict constituency binding to prevent out-of-constituency political astroturfing.
   - Video duration validation (15–60s), captioning, metadata sanitization, and automated thumbnail extraction.

6. **JOB 042: Shorts Viewer & Mobile Player:**
   - Gesture-driven vertical video reel player with smooth scrolling, double-tap endorsement/upvoting, bottom-sheet civic comment threads, and multi-tier client caching.

7. **JOB 043: Shorts Analytics & Reach Engine:**
   - Granular privacy-compliant telemetry tracking watch time, completion rates, unique constituency reach, citizen engagement, and candidate discovery metrics.

8. **JOB 044: Notification & Alerts Engine:**
   - Multi-channel notification pipeline (Push notifications via APNs/FCM, Web Push, and in-app action outbox) for local civic alerts, MLA responses, breaking constituency news, and live townhall broadcasts.
   - Anti-spam rate limiting and user-configurable frequency caps.

9. **JOB 045: Retention Digests & Civic Recaps:**
   - Automated scheduled weekly and monthly constituency digests summarizing top resolved civic issues, newly announced government schemes, candidate debates, and upcoming townhalls.

10. **JOB 051: Live Consumer Experience:**
    - Low-latency HLS video stream playback via decoupled WebView/hls.js player (`HlsPlayer`), ensuring zero native video bloat in the consumer app.
    - Real-time stream discovery, live audience chat, live polling/Q&A overlays, and social share cards.

11. **JOB 052: Professional Broadcast Architecture Certification:**
    - Formal verification of the decoupled broadcast architecture in `ACCEPTANCE_REGISTER.md`.
    - Zero-WebRTC bundle verification in the consumer mobile app, maintaining APK size $\le 45$ MB and AAB $\le 25$ MB.

12. **JOB 053: Professional Broadcast Studio Console:**
    - Dedicated web studio console (`/studio`) for verified candidates and news organizations with stream scheduling, RTMP/WHIP/SRT ingest credentials, real-time viewer telemetry, live poll orchestration, and automatic VOD archiving.

---

### Section 3: Existing Codebase Baseline & Defect Analysis

A rigorous structural audit of the repository reveals the existing foundation and areas for expansion:
- **News Ingestion & Feeds:** `apps/api/src/services/news/newsService.ts` and `apps/api/src/routes/news.ts` provide foundational RSS parsing and hourly refresh. However, automated constituency tagging, political entity linkage (JOB 040), and multi-lingual translation tagging (JOB 039) are not yet federated.
- **Shorts Engine:** `apps/api/src/routes/shorts.ts` provides baseline view and comment endpoints, while `apps/mobile/components/ShortsPlayerModal.tsx` and `UploadShortModal.tsx` provide mobile UI. However, backend video transcoding, analytics telemetry (JOB 043), and verified creator upload controls (JOB 041) require end-to-end integration.
- **Broadcast Architecture:** W052 successfully implemented Migration 074 (`074_professional_broadcast_architecture.sql`), decoupled `react-native-webrtc` from the consumer mobile app (DEF-003 resolved), and authored `/studio` web console. However, `JOB 051` (Live Consumer Experience HLS player tests) and `JOB 053` (Broadcast Studio flow tests) need formal dedicated automated test suites, and `JOB 052` needs certification in `ACCEPTANCE_REGISTER.md`.
- **Notifications & Digests:** Base push notification token storage exists, but unified multi-channel dispatch with constituency topic subscriptions (JOB 044) and scheduled weekly digests (JOB 045) must be formally certified.

---

### Section 4: Target Architecture & Design Principles

1. **Zero Mock / Zero Stub Invariant:**
   All routes and services must execute against live PostgreSQL schemas, typed contracts, and real logic. Simulated timeouts or hardcoded empty responses are strictly prohibited.
2. **Bundle Optimization & Tooling Isolation (DEF-003 Decoupling):**
   Live video playback in the mobile app utilizes `apps/mobile/components/HlsPlayer.tsx` (WebView + hls.js), keeping native bundle size well within the certified 34.15 MB baseline without bundling WebRTC.
3. **Constituency Geographic Containment:**
   Shorts and local broadcasts must be strictly bound to verified residential or target constituencies to eliminate astroturfing and foreign electoral interference.
4. **DPDP Act 2023 Compliance:**
   Viewer analytics, notification tokens, and live interaction logs must use salted hashes. No raw device identifiers, phone numbers, or Aadhaar numbers may be logged or transmitted.
5. **100% i18n Parity:**
   All user-facing news categories, digest templates, video controls, and live stream overlays must support all 13 official Indian languages without missing translation keys.

---

### Section 5: Database Schema Specifications (Migration 077)

A new canonical database migration (`supabase/migrations/077_media_news_shorts_and_broadcast_hardening.sql`) will be authored:

```sql
-- 1. Political News Articles & Context Table
CREATE TABLE IF NOT EXISTS political_news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL DEFAULT 'governance',
  state_code VARCHAR(2),
  constituency_id TEXT REFERENCES constituencies(id) ON DELETE SET NULL,
  tagged_representative_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sentiment_score NUMERIC(3, 2) DEFAULT 0.00,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  is_fact_checked BOOLEAN NOT NULL DEFAULT false,
  fact_check_verdict TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 2. Shorts Analytics & Retention Telemetry Table
CREATE TABLE IF NOT EXISTS political_shorts_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id UUID NOT NULL REFERENCES political_shorts(id) ON DELETE CASCADE,
  user_id_hash TEXT NOT NULL,
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  shared BOOLEAN NOT NULL DEFAULT false,
  constituency_id TEXT REFERENCES constituencies(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3. Notification Subscriptions & Outbox Table
CREATE TABLE IF NOT EXISTS user_notification_subscriptions (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  constituency_id TEXT NOT NULL REFERENCES constituencies(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, -- 'civic_alerts', 'breaking_news', 'live_townhalls', 'weekly_digest'
  push_token TEXT,
  token_platform TEXT CHECK (token_platform IN ('fcm', 'apns', 'web')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, constituency_id, topic)
);

-- 4. Representative Official Civic Responses Table
CREATE TABLE IF NOT EXISTS representative_civic_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  representative_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  response_text TEXT NOT NULL,
  action_plan TEXT,
  estimated_completion_date DATE,
  official_designation TEXT NOT NULL,
  is_official_statement BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Broadcast Stream Sessions & VOD Archives Extension
ALTER TABLE broadcast_sessions 
ADD COLUMN IF NOT EXISTS hls_playback_url TEXT,
ADD COLUMN IF NOT EXISTS vod_archive_url TEXT,
ADD COLUMN IF NOT EXISTS peak_live_viewers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;
```

---

### Section 6: Shared Contracts & DTOs

Contracts in `packages/shared/src/contracts/` will define:
- `PoliticalNewsArticleDTO`, `NewsFilterRequest`, `NewsAggregationSummaryDTO`
- `RepresentativeCivicResponseDTO`, `RepresentativeResponseCreateRequest`
- `ShortsVideoMetadataDTO`, `ShortsAnalyticsEventDTO`, `ShortsFeedResponseDTO`
- `NotificationTopicSubscriptionDTO`, `ConstituencyDigestDTO`
- `LiveStreamConsumerViewDTO`, `BroadcastStudioSessionDTO`

---

### Section 7: Backend Services & Route Specifications

1. `apps/api/src/services/newsService.ts`: Extends ingestion with political context resolution (JOB 040) and state/AC filtering.
2. `apps/api/src/services/representativeResponseService.ts`: Official response handling and issue state linking (JOB 037).
3. `apps/api/src/services/shortsAnalyticsService.ts`: Telemetry ingestion and completion-rate calculations (JOB 043).
4. `apps/api/src/services/notificationDigestService.ts`: Outbox generation for weekly digests and real-time alerts (JOB 044, JOB 045).
5. `apps/api/src/services/broadcastManagementService.ts`: Live consumer view resolution and studio session lifecycle (JOB 051, JOB 053).

---

### Section 8: Mobile Client Architecture

- **Live Stream Viewer (`apps/mobile/components/HlsPlayer.tsx`):**
  Renders live HLS video using the optimized WebView wrapper without pulling in heavyweight native WebRTC libraries.
- **Shorts Feed (`apps/mobile/components/ShortsPlayerModal.tsx`):**
  Handles vertical paging, double-tap endorsements, and analytics beacon emission upon completion.
- **Civic Digests & Alerts:**
  Subscribes to constituency notification channels via `useNotificationStore` and caches weekly summaries in MMKV/SQLite.

---

### Section 9: Web Studio Console Architecture (`/studio`)

The standalone web studio broadcaster hosted on `/studio` provides:
- Low-latency WebRTC-WHIP broadcast ingestion directly from desktop webcams, OBS Studio, or professional video switchers.
- Interactive live poll authoring and Q&A management.
- Real-time viewer metrics and instant stream termination with automatic VOD archiving.

---

### Section 10: Video & Stream Processing Pipeline

- **Stream Ingress:** RTMP and WebRTC-WHIP.
- **Stream Distribution:** Standardized HLS (`application/vnd.apple.mpegurl`) delivered via CDN edge nodes.
- **Video Playback Quality:** Multi-bitrate ABR (Adaptive Bitrate) streaming from 1080p down to 360p for low-bandwidth rural connectivity.

---

### Section 11: Notification & Fan-out Dispatch Pipeline

- Push notification dispatcher grouping users by `constituency_id` and subscribed topics.
- Queue-backed fan-out with exponential backoff on delivery errors.
- Strict anti-spam rate limiting: max 3 broadcast push notifications per week per user, except for critical emergency civic alerts.

---

### Section 12: Security Baseline, Content Moderation & Anti-Abuse

- **Anti-Astroturfing Geofence:** Users may only upload political shorts to their verified residential constituency or an authorized candidate page.
- **AI Safety Filter:** All shorts transcripts, comments, and live chat messages pass through automated content moderation (`apps/api/src/services/contentModeration.ts`) rejecting hate speech, violence, or obscenity.
- **Anti-Sybil Polling Tokens:** Live broadcast poll votes use HMAC-salted tokens to prevent vote stuffing.

---

### Section 13: DPDP Act 2023 & Statutory Privacy Compliance

- Analytics and viewing habits are anonymized via daily-salted cryptographic hashes (`user_id_hash`).
- Zero tracking of personal identity against video watch histories.
- Push notification tokens are stored with consent timestamps and instant revocation controls.

---

### Section 14: Internationalization & 13 Official Languages Support

- News article categorization, error envelopes, shorts player UI, and digest headers localized across: `en`, `te`, `hi`, `ta`, `kn`, `ml`, `mr`, `bn`, `gu`, `or`, `pa`, `as`, and `ne`.
- RTL and Indic script text rendering tested against layout clipping.

---

### Section 15: Verification Strategy & Test Battery (12 Test Suites)

1. `tests/job037-representative-civic-response.test.ts` (Official response creation, verification badge, timeline sync).
2. `tests/job038-political-news-ingestion.test.ts` (Multi-source ingestion, deduplication, sentiment derivation).
3. `tests/job039-news-rights-presentation.test.ts` (Attribution, canonical links, multi-language tagging).
4. `tests/job040-political-context-engine.test.ts` (Constituency and representative entity linking).
5. `tests/job041-shorts-creation-pipeline.test.ts` (Video upload validation, constituency containment).
6. `tests/job042-shorts-viewer-mobile.test.ts` (Vertical reel gestures, comments sheet, caching).
7. `tests/job043-shorts-analytics-telemetry.test.ts` (Watch time, completion rate, unique reach).
8. `tests/job044-notification-engine.test.ts` (Topic subscriptions, fan-out dispatch, anti-spam caps).
9. `tests/job045-retention-digests.test.ts` (Constituency weekly digest generation and formatting).
10. `tests/job051-live-consumer-experience.test.ts` (Stream discovery, HLS player resolution, live chat).
11. `tests/job052-broadcast-architecture-benchmark.test.ts` (Zero-WebRTC mobile bundle size & memory check).
12. `tests/job053-broadcast-studio-flow.test.ts` (Studio lifecycle, RTMP/WHIP credentials, live polls, VOD archive).

---

### Section 16: Defect Remediation & Regression Safeguards

- Monorepo compilation must be 100% clean across `@kshetra/shared`, `@kshetra/api`, and `apps/mobile` (`tsc --noEmit`, 0 errors).
- All existing regression suites (`manage-pages-routes-unit.test.ts`, Domain 3 civic tests, Domain 4 academy tests) must maintain 100% pass rates.

---

### Section 17: Multi-State & Multilingual Scalability

- Scalable to all 4,123 Assembly Constituencies and 543 Lok Sabha Constituencies.
- RSS ingestion handles multi-state government portals with language-specific character encoding (UTF-8).

---

### Section 18: Evidence Generation & Audit Trail Artifacts

- Comprehensive audit dossiers to be generated upon completion:
  - `reports/domain5_media_broadcasting_report.json`
  - `reports/domain5_media_broadcasting_report.md`

---

### Section 19: Acceptance Criteria & Adjudication Framework

A job will be marked `ACCEPTED / COMPLETE (TESTED & VERIFIED)` only when:
1. All positive and negative automated test cases pass with a 100% success rate.
2. Zero placeholders, stubs, or mocks remain in the execution path.
3. RLS policies and database constraints are enforced.
4. Git working tree is clean and pushed to `origin/master`.

---

### Section 20: Rollback & Contingency Plan

- Schema rollback script provided: `supabase/migrations/rollback_077_media_news_shorts_and_broadcast.sql`.
- In-memory service fallbacks ensure continuous uptime in the event of upstream RSS feed or transcode engine downtime.

---

### Section 21: Execution Timetable & Resource Allocation

Sequential execution across four targeted batches:
- **Batch 1 (News & Context):** JOB 037, JOB 038, JOB 039, JOB 040
- **Batch 2 (Shorts & Analytics):** JOB 041, JOB 042, JOB 043
- **Batch 3 (Notifications & Retention):** JOB 044, JOB 045
- **Batch 4 (Live Streaming & Broadcast Studio):** JOB 051, JOB 052, JOB 053

---

### Section 22: Key Architectural Decision Points for User Ratification

To ensure perfect alignment with user intent before implementation commences, the following three architectural decisions are submitted for formal user ratification:

1. **Decision 1 (News Aggregation vs Direct Publishing):**
   - **Option A (Recommended):** Hybrid Ingestion Model — Automated RSS ingestion from official government portals (ECI, PIB, State Gazettes) paired with verified accredited journalist/media house direct submissions.
   - **Option B:** Purely RSS Ingestion — Automated crawling only without manual news publishing endpoints.

2. **Decision 2 (Shorts Storage & Transcoding Pipeline):**
   - **Option A (Recommended):** Cloud Object Storage + CDN Streaming — Mobile uploads generate presigned URLs to Supabase/S3 Storage, and backend validates MP4/HLS manifests with automated thumbnail generation.
   - **Option B:** Embed & Social Bridge — Allows verified YouTube Shorts / external video embeds alongside native uploads.

3. **Decision 3 (Live Streaming Latency vs Reach):**
   - **Option A (Recommended):** Low-Latency HLS (LL-HLS, 2–4s latency) via CDN — Guarantees infinite viewer scalability across millions of mobile devices without native WebRTC bundle bloat.
   - **Option B:** Ultra-Low Latency WebRTC (<1s latency) — Lowest latency for real-time auctions/debates, but requires heavier client resource consumption.

---
