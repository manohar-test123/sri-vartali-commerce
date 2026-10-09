-- 2026-10-09 — Owner-approved bootstrap (recorded this session): promote
-- admin1@svs.local to SUPER_ADMIN so the §9 panel (PR #26) is reachable.
-- Idempotent: a no-op when already SUPER_ADMIN. Audit-logged (§45).

do $boot$
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

    raise notice 'promoted admin1@svs.local from % to SUPER_ADMIN', v_old;
  else
    raise notice 'admin1@svs.local already SUPER_ADMIN — no-op';
  end if;
end
$boot$;

\echo '=== read-back: expect SUPER_ADMIN ==='
select email, role, is_active from public.profiles where email = 'admin1@svs.local';

\echo '=== read-back: newest audit rows (expect admin.role_change) ==='
select action, new_value, created_at
from public.audit_logs
order by created_at desc
limit 3;
