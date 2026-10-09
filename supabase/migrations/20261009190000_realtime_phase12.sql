-- Phase 12 (§39 realtime + §9 super admin), 2026-10-09.
--
-- 1. Realtime for the client dashboard: orders join the supabase_realtime
--    publication so postgres_changes can reach the dashboard; replica
--    identity full lets payloads carry the OLD row so the toast can diff
--    payment_status / fulfilment_status (under default identity payload.old
--    holds only the primary key). RLS still scopes every event — clients
--    only ever receive rows they may select.
-- 2. Super admin users/roles pages need profiles.email: email lives in
--    auth.users, which the API surface cannot join. Column added here,
--    backfilled once, and kept in sync by the signup trigger.
--
-- Idempotent: safe to re-run (re-adding a table to a publication raises
-- duplicate_object; add column if not exists; create or replace).

do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;  -- already a member — nothing to do
end $$;

alter table public.orders replica identity full;

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is distinct from u.email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone',
    new.email
  )
  on conflict (id) do update
    set email = coalesce(public.profiles.email, excluded.email);
  return new;
end;
$$;
