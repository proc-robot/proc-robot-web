-- Background jobs: ai_jobs (progress the UI watches over Realtime), the
-- dead-letter table and the pgmq queues. TASKS.md T0.2.10.
--
-- Flow: an RPC calls private.enqueue_job() in the same transaction as its
-- own writes → the Railway worker reads the queue, updates ai_jobs as it
-- goes, archives the message on success → after N failed attempts the
-- message goes to jobs_dead_letter (T0.6.3 / T0.6.4).

create type public.job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');

create table public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  queue text not null,
  status public.job_status not null default 'queued',
  progress smallint not null default 0 check (progress between 0 and 100),
  progress_message text,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  msg_id bigint,
  attempts integer not null default 0,
  credits_reserved integer not null default 0 check (credits_reserved >= 0),
  credits_consumed integer check (credits_consumed >= 0),
  input_tokens bigint,
  output_tokens bigint,
  cost_usd numeric(12, 6),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  heartbeat_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index ai_jobs_org_created_idx on public.ai_jobs (organization_id, created_at desc);
create index ai_jobs_open_idx on public.ai_jobs (status, heartbeat_at)
  where status in ('queued', 'running');

create trigger ai_jobs_updated_at before update on public.ai_jobs
  for each row execute function private.set_updated_at();

alter table public.ai_jobs enable row level security;
revoke all on table public.ai_jobs from anon, authenticated;
grant select on table public.ai_jobs to authenticated;

-- Members watch their org's jobs. Only RPCs (enqueue) and the worker write.
create policy "members read their jobs" on public.ai_jobs
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));

-- Realtime sends row changes to subscribers who pass the select policy.
alter publication supabase_realtime add table public.ai_jobs;

create table public.jobs_dead_letter (
  id bigint generated always as identity primary key,
  queue text not null,
  msg_id bigint,
  job_id uuid references public.ai_jobs (id) on delete set null,
  organization_id uuid,
  message jsonb not null,
  error text,
  attempts integer not null,
  failed_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index jobs_dead_letter_open_idx on public.jobs_dead_letter (failed_at desc)
  where resolved_at is null;

alter table public.jobs_dead_letter enable row level security;
revoke all on table public.jobs_dead_letter from anon, authenticated;
grant select on table public.jobs_dead_letter to authenticated;
grant update (resolved_at, resolved_by) on table public.jobs_dead_letter to authenticated;

create policy "super admins read dead letters" on public.jobs_dead_letter
  for select to authenticated using ((select public.is_super_admin()));
create policy "super admins resolve dead letters" on public.jobs_dead_letter
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

-- Queues from PLAN.md (MVP), plus `ping` for the end-to-end check (T0.6.8).
-- Not exposed through the Data API: only RPCs and the worker touch them.
select pgmq.create(queue_name)
from unnest(array[
  'extract', 'import_price_list', 'price_discovery', 'render_document', 'analyze_template', 'ping'
]) as queue_name;

-- Records the job and sends its message in one transaction, so a job is
-- never queued without its row (or the reverse). The message carries the
-- organization: the worker bypasses RLS and must scope every query to it.
create function private.enqueue_job(
  p_organization_id uuid,
  p_queue text,
  p_payload jsonb default '{}'::jsonb,
  p_credits_reserved integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
  v_msg_id bigint;
begin
  insert into public.ai_jobs (organization_id, queue, payload, credits_reserved, created_by)
  values (p_organization_id, p_queue, coalesce(p_payload, '{}'::jsonb), p_credits_reserved, auth.uid())
  returning id into v_job_id;

  select * into v_msg_id from pgmq.send(
    p_queue,
    jsonb_build_object('job_id', v_job_id, 'organization_id', p_organization_id,
                       'payload', coalesce(p_payload, '{}'::jsonb))
  );

  update public.ai_jobs set msg_id = v_msg_id where id = v_job_id;
  return v_job_id;
end;
$$;

-- Nothing in `private` is callable by users unless granted above (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
