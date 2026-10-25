# W022 Webhook Worker Deployment Contract

## Purpose

Run the outbound event dispatcher as a separate service. The API publishes events through
`public.fn_enqueue_webhook_event`; this worker leases rows through the isolated wrapper
`panin_webhook_worker.claim_webhook_batch` and reports outcomes through
`panin_webhook_worker.complete_webhook_delivery`. It never uses the Supabase
service-role key and has no direct table privileges on webhook events or deliveries.

## Required runtime settings

- `WEBHOOK_WORKER_DATABASE_URL`: a PostgreSQL TLS connection URL whose username is exactly
  `webhook_worker` and whose database name is explicit. Never reuse a Supabase service-role
  API key or an administrative database account.
- `WEBHOOK_SECRETS_ENCRYPTION_KEY`: the exact 32-byte key used to encrypt this deployment's
  webhook secrets, represented as 64 hexadecimal characters. Provision through the runtime
  secret store, never in source control or an image layer.
- Optional: `WEBHOOK_WORKER_BATCH_SIZE` (1..20), `WEBHOOK_WORKER_CONCURRENCY` (1..20),
  `WEBHOOK_WORKER_LEASE_SECONDS` (15..300). Batch size must not exceed concurrency.

## Role activation — operator action, not performed by this migration

Migration 071 creates the role as `NOLOGIN`. After review of the migration in the intended
environment and explicit authorization to configure that environment, a database administrator
must enable login and set a strong password interactively, for example:

```sql
ALTER ROLE webhook_worker LOGIN;
```

Then use the interactive `psql` command `\\password webhook_worker`; do not put the password
in SQL files, shell history, CI variables visible in logs, or this repository. Store the resulting
direct database URL only in the worker platform's secret manager. Ensure the database endpoint
presents a TLS certificate trusted by the Node.js runtime. The worker verifies certificates and
rejects URLs that use a different database role.

Do not grant the role membership in `service_role`, `postgres`, or any administrator role.
Do not grant direct SELECT/INSERT/UPDATE/DELETE on the webhook tables. The migration creates an isolated `panin_webhook_worker` schema and grants the role USAGE there and EXECUTE only on its two worker wrappers. The worker has no direct table privileges on `webhook_events` or `webhook_deliveries`; public function ACLs remain subject to the local effective-privilege gate.

## Start command

```sh
npm run webhook-worker -w @kshetra/api
```

Run this process as a dedicated service with restart-on-failure and graceful SIGTERM shutdown.
Keep the API and worker's encryption-key versions aligned. The worker logs delivery identifiers
and status only; it must never log connection strings, secrets, payloads, or response bodies.

**Security boundary:** this document is provisioning guidance only. It does not authorize applying
migration 071 to staging or production.
