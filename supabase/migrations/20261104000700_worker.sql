-- The Railway worker's database access. TASKS.md T0.6.2, T0.6.5, T0.6.6,
-- T0.6.8.
--
-- The worker connects as `procrobot_worker`, a role WITHOUT bypassrls. It
-- runs each database step in a short transaction that names the job's
-- organization (`app.worker_org_id`, set by the worker's db helper), and the
-- policies below only let it see and change that organization's rows. A
-- handler bug therefore cannot reach another tenant's data: the database
-- refuses, not the handler's own discipline.

-- ---------------------------------------------------------------------------
-- Role. The password is set per environment and never stored in git:
--   alter role procrobot_worker with password '…';
-- (local development: supabase/seed.sql). Hosted, connect through the
-- Supavisor pooler as `procrobot_worker.<project-ref>`.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'procrobot_worker') then
    create role procrobot_worker login noinherit connection limit 30;
  end if;
end;
$$;

-- The organization the current transaction works for; null outside a job.
create function private.worker_org_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.worker_org_id', true), '')::uuid
$$;

grant usage on schema public, private to procrobot_worker;
grant execute on function private.worker_org_id() to procrobot_worker;

-- ---------------------------------------------------------------------------
-- Queues: read, extend, archive and delete messages.
-- ---------------------------------------------------------------------------
grant usage on schema pgmq to procrobot_worker;
grant select, insert, update, delete on all tables in schema pgmq to procrobot_worker;
grant usage, select on all sequences in schema pgmq to procrobot_worker;
grant execute on all functions in schema pgmq to procrobot_worker;
-- Queues created by later migrations (pgmq.create runs as postgres).
alter default privileges in schema pgmq grant select, insert, update, delete on tables to procrobot_worker;
alter default privileges in schema pgmq grant usage, select on sequences to procrobot_worker;

-- ---------------------------------------------------------------------------
-- Jobs: the worker reports progress and results on its job's org only.
-- ---------------------------------------------------------------------------
grant select on table public.ai_jobs to procrobot_worker;
grant update (status, progress, progress_message, result, error, attempts, credits_consumed,
              input_tokens, output_tokens, cost_usd, started_at, heartbeat_at, finished_at)
  on table public.ai_jobs to procrobot_worker;

create policy "worker reads its job's org jobs" on public.ai_jobs
  for select to procrobot_worker
  using (organization_id = (select private.worker_org_id()));
create policy "worker updates its job's org jobs" on public.ai_jobs
  for update to procrobot_worker
  using (organization_id = (select private.worker_org_id()))
  with check (organization_id = (select private.worker_org_id()));

-- Handlers read their organization's settings (country, currency, …).
grant select on table public.organizations to procrobot_worker;
create policy "worker reads its job's organization" on public.organizations
  for select to procrobot_worker
  using (id = (select private.worker_org_id()));

-- Dead letters: also for messages so malformed they name no organization.
grant insert on table public.jobs_dead_letter to procrobot_worker;
create policy "worker files dead letters" on public.jobs_dead_letter
  for insert to procrobot_worker
  with check (organization_id is null or organization_id = (select private.worker_org_id()));

-- ---------------------------------------------------------------------------
-- Worker heartbeats (T0.6.5): each worker process upserts its row every few
-- seconds; the Super Admin's jobs monitor reads them.
-- ---------------------------------------------------------------------------
create table public.worker_heartbeats (
  worker_id text primary key,
  hostname text not null,
  version text,
  started_at timestamptz not null,
  beat_at timestamptz not null default now(),
  running_jobs integer not null default 0,
  queues text[] not null default '{}'
);

alter table public.worker_heartbeats enable row level security;
revoke all on table public.worker_heartbeats from anon, authenticated;
grant select on table public.worker_heartbeats to authenticated;
grant select, insert, update, delete on table public.worker_heartbeats to procrobot_worker;

create policy "super admins read worker heartbeats" on public.worker_heartbeats
  for select to authenticated using ((select public.is_super_admin()));
create policy "workers maintain their heartbeats" on public.worker_heartbeats
  for all to procrobot_worker using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Stale-job sweeper (T0.6.5). A running job whose heartbeat stopped belongs
-- to a worker that died; its queue message becomes visible again after the
-- visibility timeout and another worker retries it. The sweeper puts the
-- job row back to `queued` so the UI says so, and forgets dead workers.
-- ---------------------------------------------------------------------------
create function private.sweep_stale_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.ai_jobs
    set status = 'queued',
        progress_message = 'The worker stopped responding; the job will be retried.'
    where status = 'running'
      and coalesce(heartbeat_at, started_at, updated_at) < now() - interval '2 minutes';
  get diagnostics v_count = row_count;

  delete from public.worker_heartbeats where beat_at < now() - interval '1 day';
  return v_count;
end;
$$;

select cron.schedule('sweep-stale-jobs', '* * * * *', 'select private.sweep_stale_jobs()');

-- ---------------------------------------------------------------------------
-- Worker check (T0.6.8): any member queues a `ping` for their org and
-- watches it over Realtime — RPC → queue → worker → ai_jobs → UI. One open
-- ping per organization; asking again returns the open one.
-- ---------------------------------------------------------------------------
create function public.ping_worker()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_job uuid;
begin
  if v_profile.organization_id is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('ping:' || v_profile.organization_id::text, 0));
  select id into v_job from public.ai_jobs
  where organization_id = v_profile.organization_id
    and queue = 'ping' and status in ('queued', 'running')
  limit 1;
  if found then
    return v_job;
  end if;

  return private.enqueue_job(v_profile.organization_id, 'ping',
                             jsonb_build_object('requested_at', now()));
end;
$$;

revoke execute on function public.ping_worker() from public, anon;
grant execute on function public.ping_worker() to authenticated;

-- Nothing in `private` is callable by users unless granted (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
