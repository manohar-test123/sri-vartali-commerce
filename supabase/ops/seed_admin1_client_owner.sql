-- One-off ops seed, applied via the db-apply workflow from its own branch.
-- Deliberately NOT under supabase/migrations: the Supabase GitHub integration
-- must never re-apply it on main. Creates the first CLIENT_OWNER staff
-- account with a password, bypassing email entirely (magic-link delivery is
-- unreliable on the free plan). Idempotent: re-runs reset the password and
-- re-confirm the account. auth.users has no usable unique constraint for
-- ON CONFLICT (email), so existence is checked explicitly.
create extension if not exists pgcrypto;

insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, recovery_token,
  email_change, email_change_token_new
)
select
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'admin1@svs.local',
  crypt('admin@1', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  now(), now(),
  '', '', '', ''
where not exists (select 1 from auth.users where email = 'admin1@svs.local');

-- Idempotent for both paths: sets/refreshes the password and confirms the
-- email whether the row was just inserted or already existed.
update auth.users set
  encrypted_password = crypt('admin@1', gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email = 'admin1@svs.local';

-- Profile is normally created by the on_auth_user_created trigger; guard for
-- a pre-existing user that somehow lacks one.
insert into public.profiles (id, role)
select id, 'CUSTOMER' from auth.users where email = 'admin1@svs.local'
on conflict (id) do nothing;

-- Server-side (no JWT) writes bypass the role guard by design.
update public.profiles set role = 'CLIENT_OWNER', updated_at = now()
where id = (select id from auth.users where email = 'admin1@svs.local');

\echo '--- read-back: admin1 account (expect confirmed=t, role=CLIENT_OWNER) ---'
select u.email,
       u.email_confirmed_at is not null as confirmed,
       p.role
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'admin1@svs.local';
