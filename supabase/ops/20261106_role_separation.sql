-- 2026-11-06 — Owner-directed role separation (Phase 25):
--   * admin1@svs.local  SUPER_ADMIN → CLIENT_OWNER  (client dashboard ONLY)
--   * superadmin@svs.local  → SUPER_ADMIN (client + super admin dashboards)
--
-- Prerequisite: the superadmin@svs.local auth user must exist first
-- (Supabase dashboard → Authentication → Users → Add user, password set
-- by the owner; or the Auth Admin API). The profile row is created by
-- the handle_new_user trigger on first sign-up — this script promotes it.
--
-- Idempotent and audit-logged (§45), mirroring 20261009_bootstrap_superadmin.sql.

do $demote$
declare
  v_id  uuid;
  v_old app_role;
begin
  select id, role into v_id, v_old
  from public.profiles
  where email = 'admin1@svs.local'
  for update;

  if v_id is null then
    raise exception 'profile admin1@svs.local not found';
  end if;

  if v_old is distinct from 'CLIENT_OWNER' then
    update public.profiles
    set role = 'CLIENT_OWNER', updated_at = now()
    where id = v_id;

    insert into public.audit_logs
      (actor_profile_id, actor_role, action, entity_type, entity_id,
       old_value, new_value)
    values
      (v_id, 'SUPER_ADMIN', 'admin.role_change', 'profile', v_id::text,
       jsonb_build_object('role', v_old),
       jsonb_build_object('role', 'CLIENT_OWNER'));

    raise notice 'demoted admin1@svs.local from % to CLIENT_OWNER', v_old;
  else
    raise notice 'admin1@svs.local already CLIENT_OWNER — no-op';
  end if;
end
$demote$;

do $promote$
declare
  v_id  uuid;
  v_old app_role;
begin
  select id, role into v_id, v_old
  from public.profiles
  where email = 'superadmin@svs.local'
  for update;

  if v_id is null then
    raise exception 'profile superadmin@svs.local not found — create the auth user first (see file header)';
  end if;

  if v_old is distinct from 'SUPER_ADMIN' then
    update public.profiles
    set role = 'SUPER_ADMIN', updated_at = now()
    where id = v_id;

    insert into public.audit_logs
      (actor_profile_id, actor_role, action, entity_type, entity_id,
       old_value, new_value)
    values
      (v_id, 'SUPER_ADMIN', 'admin.role_change', 'profile', v_id::text,
       jsonb_build_object('role', v_old),
       jsonb_build_object('role', 'SUPER_ADMIN'));

    raise notice 'promoted superadmin@svs.local from % to SUPER_ADMIN', v_old;
  else
    raise notice 'superadmin@svs.local already SUPER_ADMIN — no-op';
  end if;
end
$promote$;
