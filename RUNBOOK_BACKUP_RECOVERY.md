# RUNBOOK: DISASTER RECOVERY & BACKUP VERIFICATION (PANIN / KSHETRA)

**Authority:** Master Execution Framework Amendment v1.2 (Part 11 & Part 15), Amendment v1.4, AI Agent Master Execution Job Book (JOB W005)  
**Classification:** Operational Security & Business Continuity Standard  
**Scope:** PostgreSQL Database, Fastify API, Media Storage, Reference Data, and Mobile Client Caching  
**Last Verified:** 2026-09-11  

---

## 1. Executive Summary & Objectives

This runbook defines the authoritative procedures for backup management, emergency failover, cold-start reconstruction, and disaster recovery (DR) across all PANIN / Kshetra environments.

### Core Recovery Metrics

| Objective | Target Threshold | Operational Mechanism |
| :--- | :---: | :--- |
| **Recovery Point Objective (RPO)** | **≤ 5 minutes** | Supabase continuous Write-Ahead Log (WAL) archiving & automated Point-in-Time Recovery (PITR) |
| **Cloud Instance Failover RTO** | **≤ 30 minutes** | Provider-managed cloud standby restoration / snapshot replay |
| **Cold-Start Reconstruction RTO** | **≤ 15 minutes** | Fully deterministic script-driven schema bootstrap (`supabase/all_migrations_combined.sql`) |
| **Client Offline Degradation RTO** | **0 seconds** | Local-first MMKV and SQLite cache tier with non-blocking graceful offline degradation |

---

## 2. Backup Topology & Architecture

The platform backup strategy operates across four defensive layers:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      PANIN BACKUP & RECOVERY LAYERS                     │
└─────────────────────────────────────────────────────────────────────────┘
  Layer 1: Continuous WAL Archiving (Supabase PITR - RPO ≤ 5 min)
     │
  Layer 2: Committed Source Migrations (36 Files, 100% Code-Managed Schema)
     │
  Layer 3: Bundled Cold-Start SQL (supabase/all_migrations_combined.sql)
     │
  Layer 4: Static Reference Seeds (Demographics, Geography, Candidates, Trivia)
```

1. **Continuous Physical Backups:** Managed at the PostgreSQL infrastructure layer via Supabase cloud WAL streaming, enabling point-in-time recovery to any second within the retention window.
2. **Committed Logical Migrations:** 36 sequential, deterministic SQL migrations in `supabase/migrations/` (001 through 034, including social extensions bootstrap).
3. **Combined Bootstrap Script:** `supabase/all_migrations_combined.sql` (360+ KB) consolidates all 36 migrations into a single idempotent script executable directly via `psql` or Supabase SQL Editor.
4. **Deterministic Reference Seeds:** Scriptable seed generators (`scripts/build-seed-db.mjs`, `scripts/rebuild-5-states.mjs`) regenerate all baseline political geographies, assembly constituencies, and demographic distributions.

---

## 3. Disaster Scenarios & Step-by-Step Restoration Runbooks

### Scenario 1: Total Cloud Database Outage / Loss (Cold Reconstruction)

**Trigger:** Supabase project deletion, catastrophic provider outage in primary region, or irreversible schema corruption.  
**Target RTO:** ≤ 15 minutes.

#### Procedure:
1. **Provision New Database Project:**
   - Log into Supabase Dashboard (or self-hosted PostgreSQL 15+).
   - Create project in Mumbai (`ap-south-1`) region.
   - Note database connection string, project reference ID, and API keys.

2. **Configure Environment Variables:**
   ```powershell
   # Update apps/api/.env and apps/mobile/.env with new project credentials
   SUPABASE_URL=https://<new-project-ref>.supabase.co
   SUPABASE_ANON_KEY=<new-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>
   ```

3. **Replay Full Schema (Cold Bootstrap):**
   - **Option A (CLI / Fast Push):**
     ```powershell
     npx supabase link --project-ref <new-project-ref>
     npx supabase db push
     ```
   - **Option B (Direct SQL / Cold-Start Bundle):**
     ```powershell
     # Execute all_migrations_combined.sql directly
     psql "<new-db-connection-string>" -f supabase/all_migrations_combined.sql
     ```

4. **Restore Reference Seeds & State Data:**
   ```powershell
   node scripts/rebuild-5-states.mjs
   node scripts/build-seed-db.mjs
   ```

5. **Verify Database Health:**
   ```powershell
   node scripts/verify-backup-recovery.mjs
   npm test --prefix apps/api -- src/__tests__/health.test.ts
   ```

---

### Scenario 2: Accidental Table Deletion or Corruption (Selective Rollback)

**Trigger:** Unintended `DROP TABLE`, faulty batch migration, or rogue bulk update.  
**Target RTO:** ≤ 20 minutes.

#### Procedure:
1. **Point-In-Time Recovery (PITR):**
   - Open Supabase Dashboard → **Project Settings** → **Database** → **Backups**.
   - Select timestamp immediately preceding the incident (e.g. 5 minutes prior).
   - Initiate PITR clone to a temporary restore instance.

2. **Selective Table Dump & Extraction:**
   ```powershell
   # Extract the affected table from the restored clone
   pg_dump -h <restore-host> -U postgres -d postgres -t <corrupted_table> --data-only > table_recovery.sql
   ```

3. **Reapply Extracted Data to Production:**
   ```powershell
   psql -h <prod-host> -U postgres -d postgres -f table_recovery.sql
   ```

4. **Validate Table Consistency:**
   ```powershell
   node scripts/audit-data-quality.js
   ```

---

### Scenario 3: API Container Host Failure (Railway Outage / Failover)

**Trigger:** Railway container host failure, regional cloud network routing degradation.  
**Target RTO:** ≤ 10 minutes.

#### Procedure:
1. **Verify Outage:**
   ```powershell
   curl -I https://kshetra-api-production-9f06.up.railway.app/health
   ```

2. **Trigger Failover Deployment to Standby Provider (Fly.io / Render):**
   ```powershell
   # Deploy container image to standby host
   docker build -f apps/api/Dockerfile -t kshetra-api-failover .
   # Deploy to Fly.io or alternate cloud host
   fly deploy --config apps/api/fly.toml
   ```

3. **Verify API Smoke Tests on Failover Endpoint:**
   ```powershell
   node scripts/smoke-api.mjs https://<failover-host>
   ```

4. **Update DNS / Mobile Remote API Gateway:**
   - Update cloudflare/DNS record or push remote config update to point mobile client to failover gateway.

---

### Scenario 4: Storage Outage & Media CDN Disruption

**Trigger:** Supabase Storage bucket outage or corrupted media uploads.  
**Target RTO:** ≤ 15 minutes.

#### Procedure:
1. **Inspect Storage Health:**
   - Attempt `GET /storage/v1/bucket` with service-role credentials.
2. **Rehydrate Missing Buckets:**
   ```sql
   INSERT INTO storage.buckets (id, name, public) 
   VALUES ('avatars', 'avatars', true),
          ('civic-issues', 'civic-issues', true),
          ('election-media', 'election-media', true)
   ON CONFLICT (id) DO NOTHING;
   ```
3. **Verify Asset Fallback:**
   - The mobile application is configured with local vector/placeholder assets (`lib/maplibreCompat.tsx`, bundled icon fallback) so UI renders gracefully even when remote image CDNs are unreachable.

---

### Scenario 5: Network Partition & Mobile Client Degradation

**Trigger:** User in zero-connectivity zone, carrier network drop, or server maintenance window.  
**Behavior:**
1. **Local-First Rehydration:** Mobile Zustand stores rehydrate from synchronous MMKV storage immediately upon boot.
2. **Non-Blocking Degradation:** Feeds, electoral maps, and cached civic issues display last-known data with an explicit "Offline Mode / Reconnecting" indicator.
3. **Offline Queue:** Moderation, civic issue creation, and follow actions queue locally and synchronize idempotently when connectivity is restored.

---

## 4. Disaster Recovery Testing & Automated CI/CD Gates

The backup and disaster recovery mechanisms are continuously validated via automated scripts:

```powershell
# 1. Full Backup & Recovery Audit (6 verification gates)
node scripts/verify-backup-recovery.mjs --write-report

# 2. Automated Regression Test Suite
node tests/backup-recovery.test.mjs

# 3. Static Migration Snapshot Integrity
node scripts/audit-migration-snapshot.mjs

# 4. API Health Probe & Graceful Failure Verification
npm test --prefix apps/api -- src/__tests__/health.test.ts
```

---

## 5. Incident Management & Escalation Protocol

1. **Detection:** High-priority alerts triggered via Pino structured logs (`APPLICATION_ERROR_EVENT`, category `DATABASE_FAILURE`) or uptime probes.
2. **Classification:**
   - **SEV-1 (Critical):** Complete primary database unavailability or data loss (RTO clock active).
   - **SEV-2 (High):** API container failure or major third-party provider outage.
   - **SEV-3 (Moderate):** Storage CDN degradation or localized non-critical table delay.
3. **Resolution Sign-Off:** Execution of `scripts/verify-backup-recovery.mjs` with 100% check pass rate is required before declaring any SEV-1 incident resolved.
