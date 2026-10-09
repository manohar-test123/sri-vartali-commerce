-- Read-back only (no mutations): prove the Phase 12 realtime state.

\echo '=== supabase_realtime publication tables (expect public.orders listed) ==='
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

\echo '=== orders replica identity (expect f = full) ==='
select relreplident as replica_identity from pg_class
join pg_namespace n on n.oid = pg_class.relnamespace
where n.nspname = 'public' and relname = 'orders';

\echo '=== profiles.email backfill (expect backfilled = count where email set) ==='
select count(*) as profiles, count(email) as with_email from public.profiles;
