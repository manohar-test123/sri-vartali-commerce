# Phase 12 live verification runbook (PR #26)

The last two Definition-of-Done items need a browser and a real
`.env.local` — they cannot be verified from a machine without it:

1. **Realtime (§39):** placing a test order in one tab flips
   `/client/orders` in another without a reload.
2. **§9 rendering:** all ten `/admin` pages render role-appropriate data
   for a SUPER_ADMIN.

Anyone with the owner-transferred `.env.local` can run this in ~5 minutes.
Capture a screenshot or note per ✅ and attach it to PR #26.

## Prerequisites

- `.env.local` in the repo root with at minimum:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (the legacy `eyJ…` service JWT, **not**
  `sb_secret_…`).
- **Where the env lives:** the canonical `.env.local` is in the owner's
  (ManoharPaturi's) local workspace — `~/Desktop/Stonebridge/sri_vartali_sarees/`
  — and is owner-transferred only (never chat, never committed). This
  runbook is therefore most naturally run **by the owner on that machine**;
  anyone else needs the file transferred to them first.
- The database is the **production** project — every artifact created
   below is real data and gets cleaned up in step 6.
- `admin1@svs.local` is SUPER_ADMIN (bootstrapped 2026-10-09, audit row
  `admin.role_change`). Password sign-in per the handoff.

## Steps

1. `git checkout feat/phase12-super-admin-realtime && npx next dev --port 3123`
2. **Tab A:** `http://localhost:3123/client/orders` (exactly this host —
   not 127.0.0.1) → sign in `admin1@svs.local` / `admin@1`.
3. **Tab B:** the storefront → add any in-stock product → checkout →
   place an order with the name **PHASE12 REALTIME TEST** (any 6-digit
   PIN that validates; address text is arbitrary).
4. **Watch tab A — no reload:**
   - ✅ toast: `New order SVS-ORD-… placed.` and the order appears in
     the list within a second or two.
   - Open the order → **Verify payment** → ✅ second toast:
     `Order …: payment pending → verified.`
   - (If nothing fires: check the browser console for the realtime
     subscription — `supabase_realtime` must list `public.orders`, which
     the pre-applied migration already ensured.)
5. **`/admin` click-through as SUPER_ADMIN** — all ten pages, expect:
   - `/admin` counters + integration rollup + recent audit (you should
     see `admin.role_change` at the top).
   - `/admin/users` + `/admin/roles`: your profile, role picker; trying
     to demote yourself is refused (last-super-admin guard).
   - `/admin/client`: client team + §30 settings.
   - `/admin/integrations/whatsapp` + `/cloudinary`: set / not set only.
   - `/admin/logs`: message log (NOT_CONFIGURED failures are expected
     while WhatsApp stays unwired).
   - `/admin/webhooks`: the two stuck RECEIVED rows — **the owner's own
     "Mark resolved" clicks close them** (each audit-logged).
   - `/admin/audit`: newest-first log + action filter.
   - `/admin/system`: health JSON, env matrix, backup posture.
6. **Cleanup:** note the test order number and either cancel it in the
   dashboard, or hand the number to the operator — it gets purged via
   the ops workflow (release reservation → delete → read-back), recorded
   in the workspace AUDITLOG.
7. Report ✅/❌ per item (screenshot or text) as a PR #26 comment.

## Status at time of writing

All other Definition-of-Done items are verified and evidenced in the PR
body (build, 242/242 tests, CI green, migration pre-applied + read
back, bootstrap executed + read back). The two browser items above are
the only outstanding ones, blocked solely on access to `.env.local`
(owner-transferred, never committed or pasted in chat).
