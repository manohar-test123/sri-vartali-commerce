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

Phase 1 (foundation) in progress. Build phases, schema and acceptance criteria are
defined in [`Sri_Vartali_AI_Agent_Build_Spec.md`](./Sri_Vartali_AI_Agent_Build_Spec.md).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth, RLS) ·
Cloudinary (media) · WhatsApp Business Cloud API.

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase/Cloudinary/WhatsApp credentials
npm run dev
```

Org: `manohar-test123` (Stonebridge). Operating rules: `AGENTS.md`, `GOVERNANCE.md`,
`REPORUNBOOK.md` in the operator workspace.
