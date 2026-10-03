# Backups — posture and restore runbook (Phase 11)

Last verified against live state: **2026-10-03**, via the Supabase
management API (`GET /v1/projects/khuumibmulagqgdrrtih/database/backups`):

```json
{ "walg_enabled": true, "pitr_enabled": false, "backups": [] }
```

## What Free actually gives us

| Layer | Status | Notes |
|---|---|---|
| Platform daily backups (WAL-G) | **enabled** | Supabase-managed; restore is a dashboard operation. Retention follows the Free plan (short — treat as days, not weeks). |
| Point-in-time recovery | **not available** | Paid feature. Deliberately not purchased (org decision 2026-10-02: Free plan only). |
| Schema snapshots | **weekly, in-repo** | `Backup DB schema` workflow (Mondays 02:17 UTC + manual dispatch): `pg_dump --schema=public` artifact, 90-day retention. Schema only — see below. |
| Seed/baseline data | **in-repo** | `supabase/migrations/*` + `supabase/ops/20261002_seed_launch_collection.sql` rebuild catalog structure and launch products from scratch. |
| Row-data export | **owner-manual** | The network this repo is operated from blocks Postgres ports (only 22/443), so `supabase db dump` cannot run locally. See owner options below. |

## Why the workflow dumps schema only

The repo is **public** (owner decision 2026-10-02, for free Vercel deploys).
Artifacts of public-repo workflow runs are downloadable by any signed-in
GitHub user. Order rows contain customer names, phones and addresses —
those must never land in an artifact. The schema is already public via the
committed migrations, so the snapshot adds freshness, not exposure.

## Restore runbooks

### Schema loss / bad migration (structure broken, data intact)

1. Download the latest `schema-snapshot-*` artifact from the
   **Backup DB schema** workflow run (Actions tab).
2. Review the diff against the current migrations to find the damage.
3. Fix forward with a new migration (project discipline: migrations are
   append-only) — or, for a rebuilt database, apply migrations in order,
   then re-apply any `supabase/ops/` one-offs.

### Full project loss (database gone)

1. Create a new Supabase project (owner, dashboard).
2. Apply `supabase/migrations/*` in filename order via the
   **Apply DB migration** workflow (point it at the new project's pooler),
   then `supabase/ops/` seeds.
3. Data: request the most recent platform backup restore from Supabase
   support / the dashboard **for the original project if it still exists**.
   If it is deleted, platform backups go with it — the realistic RPO is
   "catalog rebuildable from repo; orders since last platform backup lost."
4. Update `SUPABASE_DB_PASSWORD`, `NEXT_PUBLIC_SUPABASE_*` and
   `SUPABASE_SERVICE_ROLE_KEY` (Vercel env + repo secrets) to the new
   project.

### Owner manual row-data export (recommended monthly)

From any machine with open Postgres egress (e.g. mobile hotspot — the
office network blocks 5432/6543):

```bash
psql "postgresql://postgres.khuumibmulagqgdrrtih@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" \
  -c "\copy (select * from orders) to 'orders.csv' csv header"
```

Repeat for `order_items`, `customers`, `addresses`, `payments`,
`shipments`, `reviews` as desired. Store off-repo (never commit — PII).
