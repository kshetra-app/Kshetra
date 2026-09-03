# KSHETRA — Go-Live Runbook (P1 Steps 1 & 2)

This runbook turns the prototype into a live product: a real Supabase backend
and a deployed Fastify API, with the mobile app pointed at both.

It reflects the work already completed and verified locally:

- **All 24 migrations apply cleanly** (`supabase/migrations/001`–`023`).
- **RLS verified**: 120/120 application tables, 220 policies; `anon` public reads
  work and owner-only tables correctly return 0 rows for `anon`.
- **API verified**: all 12 route groups respond (`scripts/smoke-api.mjs`).

> Latent bugs fixed while standing this up (see CHANGELOG):
> - `003_multi_state.sql` redefined `states`/`constituencies` incompatibly with
>   `001` and ran `ALTER`/`VIEW` against tables created later → made additive.
> - Duplicate migration version `003` (two files) → social migration renamed to
>   `0035_posts_polls_social.sql`.
> - `019_live_election.sql` used reserved word `leading` → quoted.
> - `022_administrative_hierarchy.sql` had an expression in a `UNIQUE` constraint
>   → converted to a unique index.
> - Added `023_data_api_grants.sql` so the Data API roles work on projects created
>   with the new (no-auto-expose) default.
> - API `start` script + tsconfig were never runnable as plain Node → API now runs
>   via `tsx` (see `apps/api/package.json`, `apps/api/Dockerfile`).

---

## Part A — Local stack (already running / how to reproduce)

Requires Docker Desktop running.

```powershell
# From repo root
npx supabase start          # boots db + auth + rest; applies all migrations
npx supabase status         # shows API URL, DB URL, anon (publishable) key
npx supabase db reset       # re-apply all migrations from scratch (idempotent check)
```

Non-essential local services (storage, realtime, studio, analytics, edge
functions, imgproxy) are disabled in `supabase/config.toml` so a minimal,
healthy stack starts on Windows/Docker. Re-enable any you need.

Verify RLS:

```powershell
docker exec supabase_db_Kshetra psql -U postgres -d postgres -c "SELECT count(*) total, count(*) FILTER (WHERE relrowsecurity) rls_on FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r';"
```

Run the API + smoke test locally:

```powershell
cd apps/api
npm start                   # tsx src/server.ts  → http://localhost:3001
# in another shell, from repo root:
node scripts/smoke-api.mjs http://localhost:3001
```

---

## Part B — Step 1: Stand up the real Supabase project

1. **Create the project** at https://supabase.com/dashboard (choose region close
   to your users, e.g. Mumbai `ap-south-1`). Save the database password.

2. **Get credentials** — Dashboard → Project Settings → API:
   - Project URL → `https://<ref>.supabase.co`
   - `anon` / publishable key
   - `service_role` / secret key (server-side only — never ship in the app)

3. **Link and push migrations** (from repo root):

   ```powershell
   npx supabase login                      # opens browser for access token
   npx supabase link --project-ref <ref>   # prompts for DB password
   npx supabase db push                    # applies all 24 migrations to cloud
   ```

   `db push` orders migrations by version string; the `0035` version slots
   correctly between `003` and `004`. If push reports a non-numeric/version
   issue, run `npx supabase migration list` to inspect.

4. **Verify RLS on cloud** — Dashboard → Database → Advisors/Linter, or:

   ```sql
   SELECT count(*) total,
          count(*) FILTER (WHERE relrowsecurity) rls_on
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relkind='r';
   ```

   Expect `rls_on = total - 1` (PostGIS `spatial_ref_sys` is the standard
   exception). `023_data_api_grants.sql` ensures `anon`/`authenticated` can reach
   the tables; RLS still gates every row.

5. **Point the mobile app at Supabase** — `apps/mobile/.env`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
   ```

   The client (`apps/mobile/lib/supabase.ts`) auto-enables backend mode when
   these are set; otherwise it stays offline.

---

## Part C — Step 2: Deploy the Fastify API

The API is self-contained (no Supabase dependency) and runs via `tsx`.

### Build & test the image locally (from repo root)

```powershell
docker build -f apps/api/Dockerfile -t kshetra-api .
docker run --rm -p 3001:3001 kshetra-api
node scripts/smoke-api.mjs http://localhost:3001
```

> If `npm ci` fails inside the image due to the cross-platform lockfile
> (this monorepo hoists mobile deps to the root), change the Dockerfile install
> line to `npm install --omit=dev --no-audit --no-fund`.

### Deploy to a container host (pick one)

**Fly.io**
```bash
fly launch --no-deploy --dockerfile apps/api/Dockerfile   # creates fly.toml
fly secrets set NODE_ENV=production
fly deploy
```

**Render** — New → Web Service → Docker; Dockerfile path `apps/api/Dockerfile`,
context = repo root; health check path `/api/health`.

**Railway** — New → Deploy from repo → Dockerfile; set root as context.

Set these env vars on the host as needed:
`PORT` (host usually injects), `HOST=0.0.0.0`, `NODE_ENV=production`,
`CORS_ORIGINS=<comma-separated app origins>`, and optionally `GEMINI_API_KEY` /
`OPENAI_API_KEY` for AI routes.

### Point the mobile app at the deployed API — `apps/mobile/.env`

```
EXPO_PUBLIC_API_URL=https://<your-api-host>/api/v1
```

### Smoke-test the live API (all 12 route groups)

```powershell
node scripts/smoke-api.mjs https://<your-api-host>
```

Expect 12/12 responding (10× `200`; `notifications` → `401` and `moderation`
→ `403` without the `x-user-id` / `x-user-role` headers — these are intentional
auth/role gates that return `200` when the headers are supplied).

---

## Notes / follow-ups

- **Key format**: recent Supabase CLI emits `sb_publishable_…` / `sb_secret_…`
  keys. `supabase-js` accepts the publishable key as the anon key. Cloud projects
  still expose the legacy JWT `anon`/`service_role` keys in the dashboard if you
  prefer those.
- **Image size**: the container installs the whole hoisted monorepo dep tree.
  A future optimization is to bundle the API with esbuild into a single file for
  a much smaller image.
- **CORS**: set `CORS_ORIGINS` to your real app origins before public launch.
