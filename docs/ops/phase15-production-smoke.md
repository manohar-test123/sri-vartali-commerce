# Phase 15 — production smoke runbook (BLOCKED at the gate)

**Status 2026-10-10: BLOCKED.** The gate below failed, so the e2e was
**not** run and nothing was simulated. Evidence first, then the two ways
forward: (A) the owner fixes the env key (~5 min) and this runbook
executes end to end; (B) the owner runs it himself — every step is
self-serve.

## Evidence of the block (2026-10-10, from the operator's machine)

| Probe | Result |
|---|---|
| `GET /` | 200 |
| `GET /shop` | 200 (Phase 13 facets live — #28 merged) |
| `GET /cart`, `/account/login` | 200 |
| `GET /checkout` (empty cart) | 307 → correct redirect |
| `GET /api/health` | 200 — but it only checks the **public** env vars, so "ok" here does not clear the gate |
| `GET /track-order` (no params) | 200 |
| `GET /track-order?order=…&phone=1` | **500** |

The 500 is the documented signature of **`SUPABASE_SERVICE_ROLE_KEY`
missing on Vercel** (04-OPEN-ITEMS item 1, pre-dating Phase 6): the
public site works; every admin-client construction 500s — track-order
lookups, the final place-order step, payment verification, mark-shipped,
review moderation — and rate limiting **fail-opens silently** (a burst
creates zero `rate_limit_windows` rows).

## Owner fix (~5 minutes, two dashboards)

1. `https://supabase.com/dashboard/project/khuumibmulagqgdrrtih/settings/api`
   → copy the **service_role** secret — the long `eyJhbGciOi…` JWT
   (**not** the `sb_secret_…` format; the database rejects it).
2. `https://vercel.com/manoharpaturis-projects/sri-vartali-commerce/settings/environmentvariables`
   → Add → Name `SUPABASE_SERVICE_ROLE_KEY` → paste → environments: tick
   **Production** (Preview optional) → Save.
3. Deployments → latest production deploy → **⋯ → Redeploy** (env vars
   only apply to new deployments).
4. Gate re-check: `GET /track-order?order=X&phone=1` must return **200**
   (the "not found" answer page). Then everything below unblocks.

## Smoke sequence (after the gate passes)

Run in this order — the rate-limit burst throttles the caller's IP for
10 minutes, so it goes **last**.

### 1. Checkout e2e with a clearly-named test product

1. `/client` sign-in (`admin1@svs.local`) → create + publish product
   **"PHASE15 SMOKE TEST — DELETE ME"** with 2 units of stock
   (or reuse an existing published product and note the stock delta).
2. Storefront (incognito): product page → **Buy Now** → checkout form:
   name "Phase15 Smoke", a real WhatsApp-format phone you control
   (or `9000000001` — it only receives nothing until Meta is wired),
   address with a real PIN (e.g. `500001` → Hyderabad) → **Verify** →
   the **verified total** appears → place the order.
3. Record the Order ID (`SVS-ORD-YYYYMMDD-…`) — it rides every check
   below and lands on the purge list in step 3.
4. `/client/orders` → the new search box (PR #29) finds it by Order ID →
   open it → **Verify payment** (UTR optional) → payment chip flips.
5. Mark shipped: courier "PHASE15-TEST", tracking ID "SMOKE-1",
   tracking URL `https://example.com/track` → stock drops by the
   fulfilled quantity.
6. `/track-order` with the Order ID + the phone from step 2 → 200,
   ladder shows Shipped, courier block shows the tracking ID and link.
7. Payment-claimed path (optional but cheap): place a second order and
   reply "PAID" semantics via the dashboard claim button, confirm the
   CUSTOMER_CLAIMS_PAID → VERIFIED transition.

### 2. Rate-limit burst (do this last)

```bash
for i in $(seq 1 31); do
  curl -s -o /dev/null -w "%{http_code} " \
    "https://sri-vartali-commerce.vercel.app/track-order?order=X$i&phone=1"
done
# expect: 200 × 30, then the 31st response contains the throttle notice
# ("Too many tracking lookups") — grep the 31st body for it
```

DB proof the limiter is really writing (fail-open was the old symptom):
commit this SELECT-only file as `supabase/ops/20261010_ratelimit_readback.sql`
on a branch and dispatch it (`gh workflow run "Apply DB migration" --ref
<branch> -f migration=supabase/ops/20261010_ratelimit_readback.sql`):

```sql
select window_key, hit_count, window_start
from public.rate_limit_windows
where window_key like '%track_order%'
order by window_start desc limit 5;
```

Expect ≥ 1 row with hit_count ≈ 31. Read-backs need the workflow path —
never trust a claim without the row.

### 3. Purge (never before owner approval)

The smoke order(s) + product are real production rows. Propose the list
(Order IDs + product code) with read-back evidence, owner approves,
then the established ops-file purge runs (reserve-release mirrors
`cancel_order`, then guarded deletes). Precedent: the 2026-10-09 purge
(AUDITLOG §3).

## Owner self-serve extras (5 minutes, do anytime)

- **Free uptime monitor** — UptimeRobot (or Better Stack free): monitor
  `https://sri-vartali-commerce.vercel.app/api/health` every 5 min,
  alert to the owner's email. Pure dashboard work, no code.
- **Vercel Web Analytics** — Vercel project → Analytics → Enable
  (free tier). No code change needed for Next.js.
- **Supabase auth redirect URLs** —
  `https://supabase.com/dashboard/project/khuumibmulagqgdrrtih/auth/url-configuration`
  → add `https://sri-vartali-commerce.vercel.app/**` to Redirect URLs.
  Until then magic-link sign-in from the production domain breaks after
  click (password sign-in is unaffected).
- `/api/health` checks only the public env vars by design — do not read
  its "ok" as "service role configured".
