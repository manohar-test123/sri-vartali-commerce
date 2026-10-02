# Database — Sri Vartali Fashion Commerce

The v1 foundation lives in `supabase/migrations/20261002150000_init_schema.sql`
(Phase 1). It is **idempotent** — safe to re-run.

## Applying

Option A — **Supabase GitHub integration (primary)**: the project is connected
to this repo (Supabase → Integrations → GitHub; deploy-to-production ON,
production branch `main`). Merging a PR that adds
`supabase/migrations/<timestamp>_*.sql` applies it to the production database
automatically. Review happens on the PR; the owner's merge is the apply trigger.

Option B — **"Apply DB migration" workflow** (fallback; Actions tab →
*Apply DB migration* → Run workflow): applies a chosen SQL file to the project
database from a GitHub runner (the dev network blocks Postgres ports) and
prints the verification block below. Needs the `SUPABASE_DB_PASSWORD` repo
secret. Manual dispatch after review, nothing automatic.

Option C — Supabase SQL editor (from any network): paste the migration file, run.

Option D — Supabase CLI / psql directly, when on a network that allows
outbound 5432/6543 (pooler: `aws-0-ap-south-1.pooler.supabase.com`, session
mode 5432, user `postgres.khuumibmulagqgdrrtih`):

```bash
psql "postgresql://postgres.khuumibmulagqgdrrtih@aws-0-ap-south-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/20261002150000_init_schema.sql
```

> Project: `khuumibmulagqgdrrtih` (ap-south-1 / Mumbai, Free plan), org
> Stonebridge. Status updates are recorded in the operator `AUDITLOG.md`.

## What v1 encodes

- **Category-generic catalog** (rule 1, 24): `categories.attribute_schema`
  (jsonb) defines per-category fields; `products.attributes` (jsonb) stores
  values. Sarees/Dresses/Kurtis seeded with the spec §4 fields as data —
  adding "Lehengas" attributes later is a data edit, not a migration.
- **IDs** (rules 2-4): UUID PKs; `SVS-P-000001` product codes and
  `SVS-ORD-YYYYMMDD-NNNNN` order numbers from sequences via
  `next_product_code()` / `next_order_number()`.
- **Money** (rule 7): integer paise columns only; `orders` has a CHECK that
  `total = subtotal − discount + shipping`; `order_items` CHECKs
  `line_total = unit_price × quantity`.
- **Snapshots** (rules 5-6, 19): `order_items` snapshot columns;
  `orders.shipping_address_snapshot`; `on delete restrict` from order items to
  products/variants so history cannot be orphaned (archive instead of delete —
  §14).
- **Statuses** (§25): the three enums + automatic `order_status_history` rows
  via trigger on any status change.
- **RLS everywhere** (rule 21), role-aware via `profiles.role`:
  - public/anon: read published products, their media/variants/stock, active
    categories/collections, approved reviews, store settings (no secrets).
  - customers: read/update only their own carts-adjacent data, addresses,
    wishlists, orders (matched through `customers.user_id`).
  - client roles: catalog + orders + payments + shipments + moderation.
  - `CLIENT_OWNER`/`SUPER_ADMIN` alone may change payment settings (§30).
  - `SUPER_ADMIN` alone: webhook events, audit logs, WhatsApp consents,
    and **granting roles** (`guard_profile_role` trigger).
  - carts/cart_items: RLS on, **zero policies** — reachable only by the
    server's admin client, since checkout is server-authoritative (§22).
- **Signups** start as `CUSTOMER` (trigger on `auth.users`); elevation is a
  deliberate super-admin action.

## Deliberate decisions (documented for review)

- `whatsapp_messages` adds a `direction` column beyond spec §43 so inbound
  automation replies are distinguishable from outbound sends.
- Order numbers use one global sequence (no daily reset) — uniqueness stays
  provable; the date prefix remains human-readable.
- Order/payment creation happens server-side (no insert policies); RLS then
  governs reads and business updates.
- `inventory` exposes quantity of *published* products publicly — needed for
  sold-out/low-stock states (§12); quantities are not treated as sensitive.

## Deferred (later phases)

- PIN-code reference data + API (§21) — Phase 5
- reservation-release job for `reservation_expires_at` (§26) — Phase 6
- `orders.order_status` transitions beyond trigger history (guards per
  transition) — Phase 6, in app layer with audit
- full-text/trigram search indexes — Phase 4, when the shop UI lands
- Realtime is a Supabase config (no schema impact; §39)

## Post-apply verification

```sql
-- 1. RLS on every table
select relname, relrowsecurity from pg_class
join pg_namespace n on n.oid = relnamespace
where n.nspname = 'public' and relkind = 'r'
order by relname;  -- expect relrowsecurity = true for all

-- 2. singleton settings seeded
select count(*) = 1 as settings_ok from store_settings;

-- 3. ID generators wired to sequences (each call consumes the next number)
select public.next_product_code();  -- expect SVS-P-000001 on a fresh database
```
