# W009-B4 â€” RUNTIME PERSISTENCE EVIDENCE CLOSURE REPORT

**JOB:** W009-B4 â€” Mobile Strangler / Mutation Consolidation  
**STATUS:** IMPLEMENTED / TESTED / VERIFIED / AWAITING CTO ACCEPTANCE  
**CTO ACCEPTANCE:** PENDING  
**DATE:** 2026-09-19  

---

## 1. RUNTIME & CONTAINER IDENTITY

All persistence verification tests were executed against an isolated, disposable Docker PostgreSQL/PostGIS container. Neither staging nor production databases were touched.

* **Database Container:** `w009-b4-postgres`
* **Base Image:** `postgis/postgis:16-3.4-alpine`
* **Network:** `w009-b4-net` (isolated bridge network)
* **PostgreSQL Port:** `127.0.0.1:55432` -> `5432/tcp`
* **PostgREST Container:** `w009-b4-postgrest` (`public.ecr.aws/supabase/postgrest:v14.13`) on `127.0.0.1:55431`
* **Local PostgREST Reverse Proxy:** Node.js HTTP bridge on `127.0.0.1:55430` mapping `/rest/v1/*` to `/*`
* **Test Database Name:** `w009_b4_test`

---

## 2. POSTGRESQL & POSTGIS RUNTIME VERSION

Direct query against the isolated PostgreSQL runtime:
```sql
SELECT version();
```
**Runtime Output:**
```
PostgreSQL 16.4 on x86_64-pc-linux-musl, compiled by gcc (Alpine 13.2.1_git20240309) 13.2.1 20240309, 64-bit
```
PostGIS extension:
```sql
SELECT PostGIS_Full_Version();
```
**Output:** PostGIS 3.4.2, GEOS 3.12.1, PROJ 9.4.0.

---

## 3. MIGRATION APPLICATION RESULT

The complete migration history of the repository (38 migration files, `001_initial_schema.sql` through `036_foundation_and_grants_repair.sql`) was bundled using `scripts/bundle_migrations.mjs` and executed cleanly against `w009_b4_test`:

* **Total Migrations Applied:** 38 files
* **Execution Result:** Clean run, **0 errors**
* **New Migrations Created:** **0** (`037_*.sql` strictly forbidden and was NOT created)
* **Existing Migrations Modified:** **0** (All migrations in `supabase/migrations/` remain strictly immutable and byte-for-byte identical to baseline)

---

## 4. DB CATALOG SCHEMA RECONCILIATION

Direct queries against `information_schema.tables` and `pg_catalog` in the runtime container established the following verified schema targets:

| Entity / Domain | Target Table | Primary Key | Key Foreign Keys / Denormalized Columns |
| :--- | :--- | :--- | :--- |
| **Civic Issues** | `civic_issues` | `id` (UUID) | `reporter_id`, `upvote_count`, `comment_count`, `follow_count`, `status` |
| **Issue Upvotes** | `issue_upvotes` | `(issue_id, user_id)` | FK to `civic_issues(id)` |
| **Issue Follows** | `issue_follows` | `(issue_id, user_id)` | FK to `civic_issues(id)` |
| **Issue Comments** | `issue_comments` | `id` (UUID) | `issue_id`, `user_id`, `body`, `is_official` |
| **Issue Status History** | `issue_status_history` | `id` (UUID) | `issue_id`, `from_status`, `to_status`, `changed_by`, `note` |
| **Political Events** | `political_events` | `id` (UUID) | `politician_id`, `rsvp_count`, `event_date` |
| **Event RSVPs** | `event_rsvps` | `id` (UUID) | `event_id`, `user_id`, `status` ('going') |
| **Politician Surveys** | `politician_surveys` | `id` (UUID) | `politician_id`, `response_count`, `is_active` |
| **Survey Responses** | `survey_responses` | `id` (UUID) | `survey_id`, `user_id`, `answers` (JSONB) |
| **Bills & Legislation** | `bills` | `id` (UUID) | `public_opinion` (JSONB: `{support, oppose, neutral}`) |
| **RTI Queries** | `rti_requests` | `id` (UUID) | `user_id`, `subject`, `department`, `upvotes`, `status` |
| **Manifestos** | `e_manifestos` | `id` (UUID) | Authoring only. **Zero** citizen vote tables exist. |
| **Grievances** | *(None)* | N/A | **Zero** politician grievance tables exist in catalog. |

---

## 5. REAL RUNTIME PERSISTENCE EVIDENCE (11 AUTHORIZED MUTATIONS)

All 11 authorized mutations were executed through the canonical Fastify API layer (`apps/api/src/server.ts`) authenticated with valid JWTs against the runtime database.

### 1. `4. reportIssue` (Civic Issue Creation)
* **Endpoint:** `POST /api/v1/civic/issues`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **Request Payload:**
```json
{
  "title": "Water pipe leakage in Jubilee Hills",
  "description": "Fresh water pipeline leaking continuously for 48 hours",
  "category": "water",
  "severity": "high",
  "stateCode": "TS"
}
```
* **HTTP Response:** `HTTP 200 OK`
```json
{
  "success": true,
  "id": "c761648d-3dfc-4578-96b0-1c4386f9ee66",
  "message": "Civic issue reported successfully"
}
```
* **Database State Verified:**
  * Row created in `civic_issues` with id `c761648d-3dfc-4578-96b0-1c4386f9ee66`
  * `reporter_id`: `00000000-0000-0000-0000-000000000001`
  * `status`: `open`
  * `upvote_count`: `0`, `follow_count`: `0`, `comment_count`: `0`

---

### 2. `1. upvoteIssue` (Add Upvote)
* **Endpoint:** `POST /api/v1/civic/issues/c761648d-3dfc-4578-96b0-1c4386f9ee66/upvote`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"issueId":"c761648d-3dfc-4578-96b0-1c4386f9ee66","message":"Issue upvoted successfully"}`)
* **Database State Before:** `civic_issues.upvote_count = 0`, `issue_upvotes` row absent
* **Database State After:**
  * Row inserted in `issue_upvotes` `(issue_id: c761648d-..., user_id: 00000000-...)`
  * Trigger `trg_issue_upvote_count` automatically incremented `civic_issues.upvote_count` from `0` to `1`

---

### 3. `2. removeUpvote` (Delete Upvote)
* **Endpoint:** `DELETE /api/v1/civic/issues/c761648d-3dfc-4578-96b0-1c4386f9ee66/upvote`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"issueId":"c761648d-3dfc-4578-96b0-1c4386f9ee66","message":"Issue upvote removed successfully"}`)
* **Database State Before:** `civic_issues.upvote_count = 1`, `issue_upvotes` row present
* **Database State After:**
  * Row deleted from `issue_upvotes`
  * Trigger `trg_issue_upvote_count` automatically decremented `civic_issues.upvote_count` from `1` to `0`

---

### 4. `3. followIssue` (Follow Civic Issue)
* **Endpoint:** `POST /api/v1/civic/issues/c761648d-3dfc-4578-96b0-1c4386f9ee66/follow`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **Request Payload:** `{"follow": true}`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"issueId":"c761648d-...","following":true,"message":"Issue followed"}`)
* **Database State Before:** `civic_issues.follow_count = 0`, `issue_follows` row absent
* **Database State After:**
  * Row inserted in `issue_follows` `(issue_id: c761648d-..., user_id: 00000000-...)`
  * Triggers `trg_issue_follow_count` / `issue_follow_count_trigger` incremented `civic_issues.follow_count`

---

### 5. `5. updateIssueStatus` (Issue Status Transition & Audit Trail)
* **Endpoint:** `PATCH /api/v1/civic/issues/c761648d-3dfc-4578-96b0-1c4386f9ee66/status`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001` (reporter of issue)
* **Request Payload:**
```json
{
  "status": "in_progress",
  "note": "Municipal team dispatched to repair pipeline"
}
```
* **HTTP Response:** `HTTP 200 OK`
```json
{
  "success": true,
  "issueId": "c761648d-3dfc-4578-96b0-1c4386f9ee66",
  "status": "in_progress",
  "message": "Status updated to in_progress"
}
```
* **Database State Before:** `civic_issues.status = 'open'`, `issue_status_history` count = 0
* **Database State After:**
  * `civic_issues.status` updated to `'in_progress'`
  * Row inserted in `issue_status_history`:
    * `from_status`: `'open'`
    * `to_status`: `'in_progress'`
    * `changed_by`: `'00000000-0000-0000-0000-000000000001'`
    * `note`: `'Municipal team dispatched to repair pipeline'`

---

### 6. `6. addIssueComment` (Add Civic Comment)
* **Endpoint:** `POST /api/v1/civic/issues/c761648d-3dfc-4578-96b0-1c4386f9ee66/comments`
* **Auth User ID:** `00000000-0000-0000-0000-000000000002`
* **Request Payload:**
```json
{
  "body": "Repair crew arrived and isolated the pipeline valve.",
  "userName": "Citizen Monitor"
}
```
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"id":"437340fc-8086-444f-b648-93630f9a2636","issueId":"c761648d-...","message":"Comment added successfully"}`)
* **Database State Before:** `civic_issues.comment_count = 0`, `issue_comments` count = 0
* **Database State After:**
  * Row inserted in `issue_comments` with id `437340fc-8086-444f-b648-93630f9a2636`
  * Triggers `trg_issue_comment_count` / `issue_comment_count_trigger` incremented `civic_issues.comment_count`

---

### 7. `7. Event RSVP` (Political Event RSVP)
* **Endpoint:** `POST /api/v1/politician/events/11111111-1111-1111-1111-111111111111/rsvp`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"eventId":"11111111-1111-1111-1111-111111111111","message":"RSVP recorded"}`)
* **Database State After:**
  * Row inserted in `event_rsvps` `(event_id: 11111111-..., user_id: 00000000-..., status: 'going')`
  * Trigger `trg_event_rsvp` updated `political_events.rsvp_count` to `1`

---

### 8. `8. Survey Response` (Citizen Response to Politician Survey)
* **Endpoint:** `POST /api/v1/politician/surveys/22222222-2222-2222-2222-222222222222/respond`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **Request Payload:** `{"answers": {"q1": "Yes, water pressure is normal now."}}`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"surveyId":"22222222-2222-2222-2222-222222222222","message":"Response submitted"}`)
* **Database State After:**
  * Row inserted in `survey_responses` with JSONB answers
  * Trigger `trg_survey_response` incremented `politician_surveys.response_count` to `1`

---

### 9. `9. Bill Opinion` (Citizen Vote/Opinion on Legislation)
* **Endpoint:** `POST /api/v1/civic/bills/33333333-3333-3333-3333-333333333333/opinion`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **Request Payload:** `{"support": true}`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"billId":"33333333-3333-3333-3333-333333333333","support":true,"message":"Opinion recorded"}`)
* **Database State Before:** `bills.public_opinion = {"support": 3, "oppose": 0, "neutral": 0}`
* **Database State After:** `bills.public_opinion = {"support": 4, "oppose": 0, "neutral": 0}`
* **Logic Attribution:** Handled by application logic in Fastify route handler updating JSONB field atomically.

---

### 10. `10. RTI Submission` (File Right-To-Information Query)
* **Endpoint:** `POST /api/v1/civic/rti`
* **Auth User ID:** `00000000-0000-0000-0000-000000000001`
* **Request Payload:**
```json
{
  "subject": "Budget allocation for Jubilee Hills road repairs",
  "department": "Municipal Administration and Urban Development",
  "authority": "Public Information Officer - GHMC",
  "description": "Provide detailed list of sanctioned and spent funds for Ward 95 road maintenance in FY 2025-26",
  "stateCode": "TS"
}
```
* **HTTP Response:** `HTTP 200 OK`
```json
{
  "success": true,
  "id": "27978c2f-ced3-462e-bc16-4ff1f33ccd2a",
  "message": "RTI request filed"
}
```
* **Database State After:**
  * Row inserted in `rti_requests` with id `27978c2f-ced3-462e-bc16-4ff1f33ccd2a`
  * `status`: `'draft'`, `upvotes`: `0`

---

### 11. `11. RTI Upvote` (Upvote RTI Request)
* **Endpoint:** `POST /api/v1/civic/rti/27978c2f-ced3-462e-bc16-4ff1f33ccd2a/upvote`
* **Auth User ID:** `00000000-0000-0000-0000-000000000002`
* **HTTP Response:** `HTTP 200 OK` (`{"success":true,"rtiId":"27978c2f-...","message":"Upvote recorded"}`)
* **Database State Before:** `rti_requests.upvotes = 0`
* **Database State After:** `rti_requests.upvotes = 1`
* **Logic Attribution:** Handled by application logic in Fastify route handler.

---

## 6. NEGATIVE & SECURITY VERIFICATION

| Check | Target / Condition | HTTP Status | Error Code | Verification Result |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication Enforcement** | Missing Bearer token on mutation endpoint | `401` | `UNAUTHORIZED` | **PASS** â€” Rejected without touching database |
| **Authorization Check** | Non-author non-official user attempting issue status update | `403` | `FORBIDDEN` | **PASS** â€” Guarded by reporter check |
| **Duplicate Prevention** | Redundant upvote request by same user | `200` | Safe idempotency | **PASS** â€” Exactly 1 row in DB; no counter explosion |
| **Blocked Operation 8** | Manifesto item vote endpoint | `501` | `PERSISTENCE_TARGET_UNAVAILABLE` | **PASS** â€” Strictly fail-closed |
| **Blocked Operation 10** | Politician grievance endpoint | `501` | `PERSISTENCE_TARGET_UNAVAILABLE` | **PASS** â€” Strictly fail-closed |
| **Unavailable Database** | Database down or unconfigured | `503` | `DATABASE_UNAVAILABLE` | **PASS** â€” Truthful 503; zero fake success |

---

## 7. TRIGGER & COUNTER ATTRIBUTION TABLE

| Table | Column | Type | Mechanism | Details |
| :--- | :--- | :--- | :--- | :--- |
| `civic_issues` | `upvote_count` | Database Trigger | `trg_issue_upvote_count` | `update_issue_upvote_count()` AFTER INSERT OR DELETE on `issue_upvotes` |
| `civic_issues` | `follow_count` | Database Trigger | `trg_issue_follow_count` | `update_issue_follow_count()` AFTER INSERT OR DELETE on `issue_follows` |
| `civic_issues` | `comment_count` | Database Trigger | `trg_issue_comment_count` | `update_issue_comment_count()` AFTER INSERT OR DELETE on `issue_comments` |
| `political_events` | `rsvp_count` | Database Trigger | `trg_event_rsvp` | `update_event_rsvp_count()` AFTER INSERT OR DELETE OR UPDATE on `event_rsvps` |
| `politician_surveys` | `response_count` | Database Trigger | `trg_survey_response` | `update_survey_response_count()` AFTER INSERT on `survey_responses` |
| `civic_issues` | `status` transitions | Application Audit | Fastify `civic.ts` | Records `from_status`, `to_status`, `changed_by`, `note` into `issue_status_history` |
| `bills` | `public_opinion` | Application Counter | Fastify `civic.ts` | Updates JSONB `{support, oppose, neutral}` |
| `rti_requests` | `upvotes` | Application Counter | Fastify `civic.ts` | Increments `upvotes` column |

---

## 8. TEST EXECUTION COMMANDS

* **Runtime Verification Script:** `npx tsx tests/verify_w009_b4_runtime_persistence.mjs`
* **JSON Evidence Output:** `reports/w009_b4_runtime_persistence_report.json`
* **Vitest Suite Execution:** `npm test -- tests/api-strangler-b4.test.ts` (17/17 tests passing)

---

## 9. REPOSITORY & GOVERNANCE STATE

* **Baseline Commit:** `1a715c87f50a5006a7020a7047794daa3542d798`
* **Tree ID:** `c111e3de8ecd41dc66aa66ee0d8bd25451065e49`
* **Working Tree:** Clean of untracked changes once report is staged.
* **Remote Synchronization:** In sync with `origin/master`.
* **Zero Migrations Policy:** Strictly maintained. No files added to `supabase/migrations/`.
* **Blocked Operations Policy:** Operations 8 and 10 remain strictly 501 blocked.
* **Batch W009-B5 Status:** Strictly **FROZEN / NOT AUTHORIZED**.

