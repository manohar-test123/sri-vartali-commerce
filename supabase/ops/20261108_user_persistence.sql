-- 2026-11-08 — User session persistence (Phase 31):
--   * carts.user_id: links a cart to the authenticated user so it can be
--     restored on any device after login (the cookie token stays as the
--     per-browser pointer; user_id is the cross-device identity).
--   * profiles.wishlist: JSON snapshot of the user's wishlisted product
--     IDs — synced from localStorage when signed in, restored on any device.
-- Idempotent; safe to re-run.

alter table public.carts
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_carts_user_id on public.carts (user_id)
  where user_id is not null;

alter table public.profiles
  add column if not exists wishlist jsonb not null default '[]'::jsonb;
