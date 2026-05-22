# Content Safety Architecture — CCA + CPP

> Comprehensive design document for Kshetra's Content Creator Accountability (CCA) and Content Promotion Pipeline (CPP) systems. These two systems work in tandem to prevent fraudulent, defamatory, litigious, illegal, and problematic content from spreading beyond local constituencies.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [System Overview](#system-overview)
3. [Content Creator Accountability (CCA)](#content-creator-accountability-cca)
4. [Content Promotion Pipeline (CPP)](#content-promotion-pipeline-cpp)
5. [How They Work Together](#how-they-work-together)
6. [Database Schema](#database-schema)
7. [Implementation Details](#implementation-details)
8. [Moderation Model](#moderation-model)
9. [Future Enhancements](#future-enhancements)

---

## Problem Statement

Kshetra is a civic-engagement platform where users create content (news, opinions, shorts, polls, civic issues) that reaches constituency, state, and national audiences. Without safeguards:

- **Fake news** can spread virally before fact-checking
- **Defamatory content** targeting politicians or citizens can go unchecked
- **Communally sensitive** posts can incite violence
- **Legally problematic** content creates liability
- **Anonymous trolls** can create harm without accountability

### Goals

1. **Accountability** — Every content creator is identified and traceable (CCA)
2. **Gatekeeping** — Content earns its reach through community validation (CPP)
3. **Speed** — Content is visible locally immediately (no delays for local audience)
4. **Fairness** — Trusted users get fast-tracked, new users go through full review
5. **Transparency** — All moderation decisions have audit trails

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT CREATION FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User taps "Create Post" / "Report Issue" / "Flag Content"      │
│                          ↓                                      │
│  ┌─────────────────────────────────────┐                        │
│  │  CCA GATE: Is user KYC verified?    │                        │
│  │  NO → Show KYC Verification Modal   │                        │
│  │  YES → Allow action + log forensic  │                        │
│  └─────────────────────────────────────┘                        │
│                          ↓                                      │
│  Content is created (locally visible in constituency feed)       │
│                          ↓                                      │
│  ┌─────────────────────────────────────┐                        │
│  │  CPP: Register in promotion pipeline │                        │
│  │  • Assign risk tier (high/med/low)  │                        │
│  │  • Set review window + thresholds   │                        │
│  │  • Start community review period    │                        │
│  └─────────────────────────────────────┘                        │
│                          ↓                                      │
│  Community members: Vouch ✅ / Flag 🚩 / Alert 🔔               │
│                          ↓                                      │
│  ┌─────────────────────────────────────┐                        │
│  │  AUTO-DECISION ENGINE               │                        │
│  │  • Vouches ≥ threshold → PROMOTE    │                        │
│  │  • Flags ≥ 3 → HOLD for moderator   │                        │
│  │  • Flags ≥ 5 or Alert → RESTRICT    │                        │
│  │  • Time expired + low score → LOCAL  │                        │
│  └─────────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Content Creator Accountability (CCA)

### Purpose

Ensure every person who creates content on the platform is identifiable and their actions are forensically traceable. This deters malicious actors and enables law enforcement cooperation if needed.

### Two-Tier Architecture

#### Tier 1: Creator KYC (One-Time Registration)

Collected once when a user first attempts a gated action:

| Field | Source | Purpose |
|-------|--------|---------|
| Full legal name | User input | Legal identity |
| Phone number | User input (Indian format) | Contact + OTP verification |
| Selfie photo | Front camera capture | Visual identity |
| Device ID | `expo-device` / `expo-application` | Device binding |
| GPS coordinates | `expo-location` | Location at registration |
| Public IP | ipify.org API | Network identity |
| WiFi/Carrier info | `@react-native-community/netinfo` | Network fingerprint |
| App version + build | `expo-application` | App state |
| Terms acceptance | User consent | Legal agreement |

#### Tier 2: Action Fingerprint (Per Content Action)

Captured every time a user performs a gated action:

| Field | Source | Purpose |
|-------|--------|---------|
| Action type | System | What was done (create_post, report_issue, etc.) |
| Content hash | SHA-256 of content | Tamper detection |
| Device state | Current device info | Was it same device as KYC? |
| Network state | Current IP + connection | Was it same network? |
| GPS coordinates | Current location | Where was action performed? |
| Timestamp | System | When precisely |

### Gated Actions (19 total)

**High-severity** (full forensic snapshot):
- `create_post`, `edit_post`, `delete_post`
- `create_comment`, `edit_comment`
- `report_issue`, `submit_report`
- `create_poll`, `create_news`, `create_short`
- `submit_evidence`, `dispute_resolution`
- `claim_aspirant_profile`

**Low-severity** (light snapshot — device + app only):
- `vote_poll`, `react_post`, `follow_issue`
- `vouch_content`, `flag_content`, `alert_content`

### KYC Status Flow

```
unverified → pending → verified
                    ↘ rejected → suspended
```

### Privacy & Security

- All KYC data stored with RLS — only the user + admin can access
- Fingerprint data encrypted at rest in Supabase
- No IMEI collection (not accessible on modern devices)
- Fingerprint capture failures are non-blocking (logged as warning)
- Data retention policy: fingerprints auto-expire after 2 years (future)

---

## Content Promotion Pipeline (CPP)

### Purpose

Prevent harmful content from reaching state/national audiences while keeping local discourse free-flowing. Content starts local and must "earn" wider reach.

### Visibility Levels

| Level | Audience | How to Reach |
|-------|----------|-------------|
| `constituency` | Local users only (~200K people) | Default for all new content |
| `district` | District-wide (~2M people) | Score ≥ 5 |
| `state` | State-wide (~50M people) | Score ≥ 10 |
| `national` | All platform users | Score ≥ 20 |
| `restricted` | Hidden from all feeds | Auto-restrict on 5+ flags or alert |

### Risk Tiers

Content is classified by type into risk tiers that determine review parameters:

| Tier | Content Types | Review Window | Vouch Needed | Flag to Hold |
|------|---------------|---------------|--------------|--------------|
| **High** | News articles, claims about individuals, headlines | 12 hours | 10 | 3 |
| **Medium** | Opinions, civic issues, shorts, promise evidence | 6 hours | 5 | 3 |
| **Low** | Polls, discussions, questions | 2 hours | 3 | 5 |

### Trust-Based Fast Track

Trusted users get reduced review parameters:

| User Type | Review Time Reduction | Vouch Reduction |
|-----------|----------------------|-----------------|
| Admin/Moderator | Instant (0h) | None needed |
| Verified Journalist | 75% shorter | 70% fewer |
| Verified Politician | 70% shorter | 60% fewer |
| Verified User | 50% shorter | 40% fewer |
| High Rep (≥100) | 40% shorter | 30% fewer |
| Medium Rep (≥50) | 20% shorter | 20% fewer |
| New User (<50) | Full duration | Full threshold |

### Community Actions

#### Vouch ✅
- "I've verified this content and believe it's accurate/genuine"
- Weight varies by role and reputation (1.0x to 7.0x)
- Each user can vouch once per content item
- Weighted vouches contribute to promotion score

#### Flag 🚩
- "This content has a problem"
- 10 predefined reasons with severity levels:
  - **Critical**: `communally_sensitive`, `hate_speech`, `incitement`
  - **High**: `fake_news`, `defamatory`, `legally_problematic`
  - **Medium**: `impersonation`, `copyright`, `explicit_content`
  - **Low**: `spam`
- Optional text description for details
- Flags reduce promotion score (2x weight)

#### Alert 🔔
- "This is URGENT and needs immediate moderator attention"
- 6 categories: `imminent_violence`, `doxxing`, `child_safety`, `election_interference`, `impersonation_official`, `other`
- Immediately holds content + notifies moderators
- Misuse affects reporter's reputation

### Auto-Decision Engine

```
Every content item follows this lifecycle:

1. CREATED → status: 'open', level: 'constituency'

2. During review window:
   - Vouches accumulate → promotion_score increases
   - Flags accumulate → promotion_score decreases
   - Flags ≥ flagThreshold → status: 'held' (moderator queue)
   - Flags ≥ 5 OR any alert → status: 'restricted', level: 'restricted'

3. After review window expires:
   - IF vouches ≥ threshold AND flags < 2:
     - Score > 20 → promote to 'national'
     - Score > 10 → promote to 'state'
     - Score > 5 → promote to 'district'
   - ELSE → status: 'expired' (stays local forever)
```

### Feed-Level Gating Implementation

The `feed.tsx` screen applies visibility filtering:

- **Constituency scope**: Shows ALL content (no filtering)
- **State scope**: Only shows content with `visibilityLevel` ≥ `district`
- **National scope**: Only shows content with `visibilityLevel` ≥ `state`

Seed data (pre-existing demo posts) bypasses this filter.

---

## How They Work Together

```
┌──────────┐     ┌──────────┐     ┌──────────────────────┐
│   CCA    │────→│   CPP    │────→│   Feed Visibility    │
│          │     │          │     │                      │
│ "Who are │     │ "Is your │     │ "Who gets to see     │
│  you?"   │     │  content │     │  your content?"      │
│          │     │  safe?"  │     │                      │
└──────────┘     └──────────┘     └──────────────────────┘
     ↓                ↓                      ↓
 KYC verified?   Risk assessed?      Promoted to state?
 Fingerprint     Community vouched?   Promoted to national?
 captured?       Not flagged?         Or restricted?
```

**Sequence for a news post:**
1. User taps "Create Post" → CCA checks KYC → gate passes
2. Post created → CCA logs forensic snapshot (device, GPS, IP, content hash)
3. CPP registers post as `risk_tier: high` (news)
4. Post visible to constituency users immediately
5. Constituency users vouch (5 vouches from verified users = score ~15)
6. 12h review expires → auto-promote to `state` feed
7. State users vouch further → if score reaches 20 → promote to `national`
8. If anyone flags → score drops, may trigger hold/restrict

---

## Database Schema

### CCA Tables (Migration 013)

```sql
-- KYC records
creator_kyc_records (id, user_id, status, full_name, phone, selfie_url,
  device_fingerprint, network_fingerprint, location_fingerprint, app_fingerprint,
  terms_accepted_at, verified_at, created_at)

-- Registered devices per user
contributor_devices (id, user_id, device_id, brand, model, os, platform,
  first_seen, last_seen, action_count, is_primary)

-- Per-action forensic logs
action_fingerprints (id, user_id, action_type, content_type, content_id,
  device_fingerprint, network_fingerprint, location_fingerprint, app_fingerprint,
  content_hash, created_at)
```

### CPP Tables (Migration 014)

```sql
-- Master visibility record per content item
content_visibility (id, content_type, content_id, author_id, constituency_id,
  state_code, risk_tier, visibility_level, review_status, vouch_count, flag_count,
  alert_count, promotion_score, vouch_threshold, flag_threshold, review_hours,
  review_started_at, review_expires_at, promoted_at, restricted_at)

-- Community vouches
content_vouches (id, content_visibility_id, user_id, weight, user_reputation,
  user_role, created_at)

-- Community flags
content_flags (id, content_visibility_id, user_id, reason, description,
  evidence_url, weight, user_reputation, resolved, resolved_by, resolution)

-- Urgent alerts
content_alerts (id, content_visibility_id, user_id, severity, reason,
  category, acknowledged, acknowledged_by, action_taken)

-- Audit trail
promotion_decisions (id, content_visibility_id, decision, decided_by,
  moderator_id, from_level, to_level, reason, vouch_count_at_decision,
  flag_count_at_decision, score_at_decision)

-- Local moderators
constituency_moderators (id, user_id, constituency_id, state_code,
  can_resolve_flags, can_restrict_content, can_promote_content,
  can_issue_warnings, can_ban_users, flags_resolved, content_promoted)
```

### Views

```sql
-- Moderator dashboard: content needing attention
moderator_queue AS SELECT ... WHERE review_status IN ('held','appealed') OR alert_count > 0

-- Content ready for auto-promotion
promotable_content AS SELECT ... WHERE review_status = 'open' AND vouch_count >= vouch_threshold

-- Per-constituency moderation stats
constituency_moderation_stats AS SELECT constituency_id, counts...
```

---

## Implementation Details

### File Structure

```
apps/mobile/
├── lib/
│   ├── contentAccountabilityTypes.ts    # CCA types + enums + validation
│   ├── deviceFingerprint.ts             # Device/network/location capture
│   ├── contentAccountability.ts         # Gate logic + forensic logging
│   └── contentPromotionTypes.ts         # CPP types + scoring utilities
├── stores/
│   ├── contributorVerification.ts       # CCA Zustand store (KYC state)
│   └── contentPromotion.ts              # CPP Zustand store (vouch/flag/promote)
├── components/
│   ├── KYCVerificationSheet.tsx         # 3-step KYC modal
│   └── ContentGateActions.tsx           # Vouch/Flag/Alert UI + sheets

supabase/migrations/
├── 013_content_accountability.sql       # CCA schema
└── 014_content_promotion_pipeline.sql   # CPP schema
```

### Dependencies Required

| Package | Purpose | Status |
|---------|---------|--------|
| `expo-device` | Device brand, model, memory | To install |
| `expo-application` | Android ID, app version | To install |
| `@react-native-community/netinfo` | Connection type, carrier | Installed |
| `expo-location` | GPS coordinates | Installed |
| `expo-camera` | Selfie capture for KYC | Installed |

All native packages use dynamic `import()` with try/catch fallback for graceful degradation.

---

## Moderation Model

### Hierarchy

```
Platform Admin (full access, all states)
     ↓
State Admin (state-level moderation)
     ↓
Constituency Moderator (local moderation, appointed)
     ↓
Community (vouch/flag/alert actions)
```

### Constituency Moderator Permissions

| Permission | Description |
|------------|-------------|
| `can_resolve_flags` | Mark flags as upheld/dismissed/partial |
| `can_restrict_content` | Hide content from feeds |
| `can_promote_content` | Manually promote to district/state |
| `can_issue_warnings` | Warn users about behavior |
| `can_ban_users` | Temporary constituency-level ban |

### Moderator Accountability

- All moderator actions logged in `promotion_decisions` table
- Moderator stats tracked (flags resolved, content promoted, warnings issued)
- Moderators themselves must be KYC-verified

---

## Future Enhancements

### Phase 2 (Planned)

- [ ] OTP verification for KYC (Twilio/MSG91 integration)
- [ ] Manual KYC review queue for platform admins
- [ ] Moderator dashboard UI (dedicated screen)
- [ ] Appeal system for restricted content
- [ ] Reputation system integration (vouch accuracy → reputation gain)
- [ ] Cross-constituency content sharing (user A vouches, shares to their constituency)

### Phase 3 (Future)

- [ ] AI-assisted content moderation (auto-flag suspicious content)
- [ ] Image/video content analysis (NSFW detection, deepfake detection)
- [ ] Multi-language content moderation (te/hi/kn/mr)
- [ ] Moderator election system (community votes for local moderators)
- [ ] Content insurance (high-value content gets bonded review)
- [ ] Legal compliance automation (IT Act Section 79 safe harbor)

### Phase 4 (Scale)

- [ ] Distributed moderation across time zones
- [ ] ML-based vouch weight calibration
- [ ] Content provenance tracking (origin + modification chain)
- [ ] Integration with fact-checking organizations
- [ ] Automated escalation to law enforcement for criminal content

---

## Design Principles

1. **Local-first, earn your reach** — No content is silenced locally; it just can't spread without validation
2. **Accountability without surveillance** — Know who created what, don't track browsing/reading
3. **Community-driven, not algorithmic** — Real people vouch/flag, not AI scores
4. **Transparency** — Users see their content's status, moderators have audit trails
5. **Graceful degradation** — If fingerprinting fails, content still gets created
6. **Indian context** — Phone format validation, Indian legal categories, local language support

---

*Document created: 2026-05-22*
*Last updated: 2026-05-22*
*Author: Kshetra Development Team*
