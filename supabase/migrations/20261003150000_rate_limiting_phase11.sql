-- Phase 11 — Rate limiting (§46 security requirements).
--
-- Free plan, no Redis: a tiny fixed-window counter table is the whole
-- infrastructure (§55 rule 23). hit_rate_limit() is atomic — one upsert
-- both resets an expired window and increments the current one, so two
-- concurrent requests can never each see "under the limit". The caller
-- (lib/rate-limit.ts, service role) supplies a bucket key like
-- "order_place:1.2.3.4" and the limit/window; the function answers
-- {allowed, hits, retryAfterSeconds}. Fixed windows (not sliding) are a
-- deliberate simplification: at these limits the edge burst (2x across a
-- window boundary) is acceptable for a launch store.
--
-- Idempotent-by-construction: create if not exists / create or replace.

create table if not exists public.rate_limit_windows (
  key          text primary key,
  window_start timestamptz not null default now(),
  hits         integer not null default 0 check (hits >= 0)
);

-- No policies, privileges revoked, RLS on: only the service role (server
-- code) may touch counters — a browser must never read or reset them.
alter table public.rate_limit_windows enable row level security;
revoke all on public.rate_limit_windows from anon, authenticated;

create or replace function public.hit_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_cutoff timestamptz;
  v_hits   integer;
  v_start  timestamptz;
begin
  if btrim(coalesce(p_key, '')) = ''
     or p_limit is null or p_limit < 1
     or p_window_seconds is null or p_window_seconds < 1 then
    raise exception 'RATE_LIMIT_MISCONFIGURED';
  end if;

  v_cutoff := now() - make_interval(secs => p_window_seconds);

  insert into public.rate_limit_windows as w (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits         = case when w.window_start <= v_cutoff then 1 else w.hits + 1 end,
        window_start = case when w.window_start <= v_cutoff then excluded.window_start
                            else w.window_start end
  returning w.hits, w.window_start into v_hits, v_start;

  -- Occasional janitor pass: keys are per-IP-per-action and unbounded in
  -- principle; sweeping week-old buckets at ~2% of calls keeps the table
  -- tiny without a scheduler (Free plan has no pg_cron).
  if random() < 0.02 then
    delete from public.rate_limit_windows
      where window_start < now() - interval '7 days';
  end if;

  return jsonb_build_object(
    'allowed', v_hits <= p_limit,
    'hits', v_hits,
    'retryAfterSeconds',
      case when v_hits <= p_limit then 0
           else greatest(1, ceil(extract(epoch from
                  v_start + make_interval(secs => p_window_seconds) - now()))::int)
      end
  );
end;
$$;

-- Execute: server (service role) only — rate limiting is a server-side
-- guard, never a browser-direct call (§46; mirrors place_order).
revoke execute on function public.hit_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer)
  to service_role;
