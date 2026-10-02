# Sri Vartali Fashion Commerce

Premium fashion commerce platform. Launches as **Sri Vartali Sarees**; the underlying
system stays category-generic so dresses, kurtis, lehengas, blouses, dupattas and
accessories can be added without rebuilding the core.

Three areas:

| Area | Purpose |
|------|---------|
| Customer storefront | Browse, search, cart, multi-product checkout, order tracking |
| Client dashboard | Products, images, stock, orders, payment verification, shipping |
| Super admin | Users/roles, integrations, webhook logs, audit, diagnostics |

**Invariants** (from the build spec — non-negotiable):

- Database (Supabase PostgreSQL) is the source of truth; WhatsApp is a communication
  and payment-coordination layer, never the database.
- Orders are created **before** WhatsApp opens; all money math is authoritative on the
  server; browser-supplied prices are never trusted.
- A customer typing "PAID" only sets `CUSTOMER_CLAIMS_PAID` — payment is verified
  manually by an authorized client user.
- Money is stored as integer paise. UUIDs internally, readable codes externally
  (`SVS-P-000121`, `SVS-ORD-20261002-00129`).

## Status

Phase 1 (foundation) complete — app scaffold, design tokens, Supabase client layer,
auth with role gates, database schema v1 (RLS on every table), CI. Phases 2-11 per
the build spec: [`Sri_Vartali_AI_Agent_Build_Spec.md`](./Sri_Vartali_AI_Agent_Build_Spec.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, RLS) ·
Cloudinary (media) · WhatsApp Business Cloud API.

## Structure (spec §50)

```text
app/
  (storefront)/     public storefront (Phase 4)
  account/          customer auth + profile
  client/           client/seller dashboard (Phase 3/6; role-gated)
  admin/            super admin panel (Phase 10; SUPER_ADMIN-gated)
  api/              route handlers
components/         ui · commerce · product · checkout · client · admin
lib/
  db/               Supabase browser/server/admin clients (service-role: server-only)
  auth/             roles, permissions, session
  env.ts            typed env access with clear guards
docs/db/            schema.sql (v1) + README
tests/              unit · integration · e2e (suites land with Phase 2+)
```

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials first
npm run dev
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck` (CI runs typecheck →
lint → build on every PR and on main).

**First-time setup**: create a Supabase project, fill `.env.local`, then apply
[`supabase/migrations/20261002150000_init_schema.sql`](./supabase/migrations/20261002150000_init_schema.sql) (SQL editor or `supabase db push`).
Until then, pages degrade to setup notices instead of crashing.


Org: `manohar-test123` (Stonebridge). Operating rules: `AGENTS.md`, `GOVERNANCE.md`,
`REPORUNBOOK.md` in the operator workspace.
