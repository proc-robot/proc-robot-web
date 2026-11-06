-- Document intelligence, part 1 (TASKS.md T1.3.1–T1.3.9, T1.3.13) and the
-- credit ledger it charges (T1.10.1–T1.10.4).
--
-- The flow:
--   1. The browser uploads a file to `spec-files/{org}/{project}/…` and calls
--      register_document(). An `inspect_document` job (free) counts its pages
--      or rows; a trigger turns that into a credit estimate (D10).
--   2. The member sees the estimate and calls extract_document(), which
--      reserves the credits and queues an `extract` job.
--   3. The worker parses the file, asks Claude for the items, validates them
--      and writes an item list in `needs_review`.
--   4. When a job ends, its credits settle: the used part is kept, the rest is
--      refunded; a failed job refunds everything and marks the document
--      failed with a reason the member can act on (D9).

-- ===========================================================================
-- Credits (T1.10.1–T1.10.4)
-- ===========================================================================
create type public.credit_bucket as enum ('plan', 'topup');
create type public.credit_entry as enum ('grant', 'expire', 'reserve', 'refund', 'topup', 'adjustment');

-- The current balance per bucket, kept in step with the ledger by
-- private.post_credits(). Plan credits are spent first and reset monthly;
-- top-up credits are kept.
create table public.credit_balances (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  plan_credits integer not null default 0 check (plan_credits >= 0),
  topup_credits integer not null default 0 check (topup_credits >= 0),
  plan_period_start timestamptz,
  updated_at timestamptz not null default now()
);

-- Append-only: users and the worker have no write grants; only the
-- functions below write it.
create table public.credit_ledger (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  bucket public.credit_bucket not null,
  entry public.credit_entry not null,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  job_id uuid references public.ai_jobs (id) on delete set null,
  reason text check (length(reason) <= 300),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index credit_ledger_org_idx on public.credit_ledger (organization_id, id desc);
create index credit_ledger_job_idx on public.credit_ledger (job_id) where job_id is not null;

-- When a job's reservation was settled (once only).
alter table public.ai_jobs add column credits_settled_at timestamptz;

alter table public.credit_balances enable row level security;
alter table public.credit_ledger enable row level security;
revoke all on table public.credit_balances, public.credit_ledger from anon, authenticated;
grant select on table public.credit_balances, public.credit_ledger to authenticated;

create policy "members read their credit balance" on public.credit_balances
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "members read their credit ledger" on public.credit_ledger
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));

-- Credits for an action at the platform's rates (PLAN.md → Credits): partial
-- units round up, and an action costs at least the minimum (1).
create function public.estimate_credits(p_action text, p_units integer, p_scanned boolean default false)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rates jsonb := coalesce(
    (select value from public.platform_settings where key = 'credit_rates'), '{}'::jsonb);
  v_credits numeric;
begin
  if p_units is null or p_units < 0 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'units';
  end if;
  case p_action
    when 'extraction_pdf' then
      v_credits := ceil(p_units / coalesce((v_rates ->> 'extraction_pdf_pages_per_credit')::numeric, 2));
      if coalesce(p_scanned, false) then
        v_credits := v_credits * coalesce((v_rates ->> 'extraction_scanned_multiplier')::numeric, 2);
      end if;
    when 'extraction_sheet' then
      v_credits := ceil(p_units / coalesce((v_rates ->> 'extraction_rows_per_credit')::numeric, 25));
    when 'online_search' then
      v_credits := p_units * coalesce((v_rates ->> 'online_search_credits_per_item_country')::numeric, 1);
    when 'rfq_reply' then
      v_credits := ceil(p_units / coalesce((v_rates ->> 'rfq_reply_pages_per_credit')::numeric, 5));
    else
      raise exception 'unknown_action' using errcode = 'P0001';
  end case;
  return greatest(coalesce((v_rates ->> 'minimum_credits_per_action')::integer, 1), ceil(v_credits))::integer;
end;
$$;

-- Moves credits in or out of one bucket and records it. Returns the bucket's
-- new balance. Callers check the balance first (a bucket never goes below 0).
create function private.post_credits(
  p_org uuid,
  p_bucket public.credit_bucket,
  p_entry public.credit_entry,
  p_amount integer,
  p_job uuid default null,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_after integer;
begin
  insert into public.credit_balances (organization_id) values (p_org)
  on conflict (organization_id) do nothing;
  if p_bucket = 'plan' then
    update public.credit_balances
    set plan_credits = plan_credits + p_amount, updated_at = now()
    where organization_id = p_org
    returning plan_credits into v_after;
  else
    update public.credit_balances
    set topup_credits = topup_credits + p_amount, updated_at = now()
    where organization_id = p_org
    returning topup_credits into v_after;
  end if;
  if p_amount <> 0 then
    insert into public.credit_ledger
      (organization_id, bucket, entry, amount, balance_after, job_id, reason)
    values (p_org, p_bucket, p_entry, p_amount, v_after, p_job, left(p_reason, 300));
  end if;
  return v_after;
end;
$$;

-- The organization's balance row, locked for this transaction.
create function private.lock_credit_balance(p_org uuid)
returns public.credit_balances
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance public.credit_balances;
begin
  insert into public.credit_balances (organization_id) values (p_org)
  on conflict (organization_id) do nothing;
  select * into v_balance from public.credit_balances where organization_id = p_org for update;
  return v_balance;
end;
$$;

-- Reserves credits for a job before it runs (B4): plan credits first, then
-- top-up credits. Raises `insufficient_credits` with the available balance
-- in `detail`.
create function private.reserve_credits(p_org uuid, p_amount integer, p_job uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance public.credit_balances := private.lock_credit_balance(p_org);
  v_from_plan integer;
begin
  if coalesce(p_amount, 0) <= 0 then
    return;
  end if;
  if v_balance.plan_credits + v_balance.topup_credits < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001',
      detail = (v_balance.plan_credits + v_balance.topup_credits)::text;
  end if;
  v_from_plan := least(v_balance.plan_credits, p_amount);
  if v_from_plan > 0 then
    perform private.post_credits(p_org, 'plan', 'reserve', -v_from_plan, p_job, p_reason);
  end if;
  if p_amount - v_from_plan > 0 then
    perform private.post_credits(p_org, 'topup', 'reserve', -(p_amount - v_from_plan), p_job, p_reason);
  end if;
end;
$$;

-- Settles a job's reservation once: keeps what it used (never more than it
-- reserved) and refunds the rest, top-up credits first (they were spent
-- last). Returns the credits used, or null if it was already settled.
create function private.settle_job_credits(p_job uuid, p_used integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.ai_jobs;
  v_plan integer;
  v_topup integer;
  v_used integer;
  v_refund integer;
  v_back integer;
begin
  select * into v_job from public.ai_jobs where id = p_job for update;
  if not found or v_job.credits_settled_at is not null then
    return null;
  end if;
  perform private.lock_credit_balance(v_job.organization_id);

  select coalesce(-sum(amount) filter (where bucket = 'plan'), 0),
         coalesce(-sum(amount) filter (where bucket = 'topup'), 0)
  into v_plan, v_topup
  from public.credit_ledger
  where job_id = p_job and entry = 'reserve';

  v_used := least(greatest(coalesce(p_used, v_plan + v_topup), 0), v_plan + v_topup);
  v_refund := v_plan + v_topup - v_used;
  v_back := least(v_refund, v_topup);
  if v_back > 0 then
    perform private.post_credits(v_job.organization_id, 'topup', 'refund', v_back, p_job,
                                 'Unused credits returned');
  end if;
  if v_refund - v_back > 0 then
    perform private.post_credits(v_job.organization_id, 'plan', 'refund', v_refund - v_back, p_job,
                                 'Unused credits returned');
  end if;

  update public.ai_jobs set credits_consumed = v_used, credits_settled_at = now() where id = p_job;
  return v_used;
end;
$$;

-- Resets the plan bucket to the plan's monthly credits (T1.10.4): what is
-- left of the last month expires; top-up credits are untouched.
create function private.grant_plan_credits(p_org uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance public.credit_balances := private.lock_credit_balance(p_org);
  v_grant integer;
begin
  select coalesce((p.limits ->> 'monthly_credits')::integer, 0) into v_grant
  from public.organizations o
  join public.plans p on p.id = o.plan_id
  where o.id = p_org;

  if v_balance.plan_credits > 0 then
    perform private.post_credits(p_org, 'plan', 'expire', -v_balance.plan_credits, null,
                                 'Last month''s plan credits expired');
  end if;
  if coalesce(v_grant, 0) > 0 then
    perform private.post_credits(p_org, 'plan', 'grant', v_grant, null, 'Monthly plan credits');
  end if;
  update public.credit_balances set plan_period_start = now() where organization_id = p_org;
  return coalesce(v_grant, 0);
end;
$$;

-- Daily: every active organization whose plan month has ended gets its new
-- plan credits. Stripe-driven grants replace this in Phase 2 (T2.1.9).
create function private.grant_due_plan_credits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_count integer := 0;
begin
  for v_org in
    select o.id
    from public.organizations o
    left join public.credit_balances b on b.organization_id = o.id
    where o.status = 'active'
      and (b.plan_period_start is null or b.plan_period_start <= now() - interval '1 month')
  loop
    perform private.grant_plan_credits(v_org);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('grant-plan-credits', '15 0 * * *', 'select private.grant_due_plan_credits()');

-- A new organization starts with its first month of plan credits.
create function private.grant_first_plan_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.grant_plan_credits(new.id);
  return null;
end;
$$;

create trigger organizations_grant_credits
  after insert on public.organizations
  for each row execute function private.grant_first_plan_credits();

-- ===========================================================================
-- Documents, item lists and items (T1.3.1)
-- ===========================================================================

-- Tenant rows that point at a project use (organization_id, project_id).
alter table public.projects add constraint projects_organization_id_id_key unique (organization_id, id);

-- uploaded → (inspected) ready → extracting → extracted, or failed (D9).
create type public.document_status as enum ('uploaded', 'ready', 'extracting', 'extracted', 'failed');
create type public.item_list_status as enum ('needs_review', 'confirmed');

create table public.documents_in (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.auth_org_id()
    references public.organizations (id) on delete cascade,
  project_id uuid not null,
  file_path text not null unique,
  file_name text not null check (length(file_name) between 1 and 255),
  file_type text not null check (file_type in ('pdf', 'xlsx', 'xls', 'csv')),
  file_size bigint not null check (file_size > 0),
  page_count integer check (page_count >= 0),
  row_count integer check (row_count >= 0),
  scanned boolean,
  estimated_credits integer check (estimated_credits >= 0),
  status public.document_status not null default 'uploaded',
  error text check (length(error) <= 500),
  job_id uuid references public.ai_jobs (id) on delete set null,
  uploaded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, project_id)
    references public.projects (organization_id, id) on delete cascade
);

create index documents_in_project_idx on public.documents_in (organization_id, project_id, created_at desc);

create trigger documents_in_updated_at before update on public.documents_in
  for each row execute function private.set_updated_at();

-- The credit estimate follows the measurements the worker records (D10).
create function private.estimate_document_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.file_type = 'pdf' and new.page_count is not null then
    new.estimated_credits := public.estimate_credits('extraction_pdf', new.page_count, new.scanned);
  elsif new.file_type <> 'pdf' and new.row_count is not null then
    new.estimated_credits := public.estimate_credits('extraction_sheet', new.row_count);
  end if;
  return new;
end;
$$;

create trigger documents_in_estimate
  before insert or update of page_count, row_count, scanned on public.documents_in
  for each row execute function private.estimate_document_credits();

-- One item list per extracted document (or typed in by hand, T1.3.12). A
-- confirmed list outlives its document.
create table public.item_lists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.auth_org_id()
    references public.organizations (id) on delete cascade,
  project_id uuid not null,
  document_id uuid unique,
  title text not null check (length(btrim(title)) between 1 and 200),
  status public.item_list_status not null default 'needs_review',
  -- Lines the model could not read: [{"code": "unparseable_row", "message": …, "source": {…}}]
  issues jsonb not null default '[]'::jsonb check (jsonb_typeof(issues) = 'array'),
  model text,
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, project_id)
    references public.projects (organization_id, id) on delete cascade,
  foreign key (organization_id, document_id)
    references public.documents_in (organization_id, id) on delete set null (document_id)
);

create index item_lists_project_idx on public.item_lists (organization_id, project_id);

create trigger item_lists_updated_at before update on public.item_lists
  for each row execute function private.set_updated_at();

-- One line of a specification (D2–D5, D7).
--   specs            {"brand": "Hikvision", "resolution": "4 MP", …}
--   source_ref       {"file": …, "sheet": …, "row": 12, "cells": "A12:F12"} or {"file": …, "page": 3}
--   confidence       {"overall": 0.92, "fields": {"quantity": 0.6, …}}
--   validation_flags [{"code": "missing_unit", "message": "…", "field": "unit"}]
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.auth_org_id()
    references public.organizations (id) on delete cascade,
  item_list_id uuid not null,
  position integer not null check (position >= 0),
  name text not null check (length(btrim(name)) between 1 and 500),
  description text check (length(description) <= 4000),
  specs jsonb not null default '{}'::jsonb check (jsonb_typeof(specs) = 'object'),
  quantity numeric(18, 4) check (quantity >= 0),
  unit text check (length(unit) <= 50),
  unit_code text references public.units (code),
  notes text check (length(notes) <= 2000),
  source_ref jsonb not null default '{}'::jsonb check (jsonb_typeof(source_ref) = 'object'),
  confidence jsonb not null default '{}'::jsonb check (jsonb_typeof(confidence) = 'object'),
  validation_flags jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_flags) = 'array'),
  embedding extensions.vector(1024),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, item_list_id)
    references public.item_lists (organization_id, id) on delete cascade
);

create index list_items_list_idx on public.list_items (item_list_id, position);

create trigger list_items_updated_at before update on public.list_items
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: members read; writes go through the RPCs below and the worker. The
-- review edits (T1.3.10) add member writes to item lists and items.
-- ---------------------------------------------------------------------------
alter table public.documents_in enable row level security;
alter table public.item_lists enable row level security;
alter table public.list_items enable row level security;

revoke all on table public.documents_in, public.item_lists, public.list_items from anon, authenticated;
grant select on table public.documents_in, public.item_lists, public.list_items to authenticated;

create policy "members read their documents" on public.documents_in
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "members read their item lists" on public.item_lists
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "members read their items" on public.list_items
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));

create trigger documents_in_super_admin_audit
  after insert or update or delete on public.documents_in
  for each row execute function private.audit_super_admin_write();
create trigger item_lists_super_admin_audit
  after insert or update or delete on public.item_lists
  for each row execute function private.audit_super_admin_write();
create trigger list_items_super_admin_audit
  after insert or update or delete on public.list_items
  for each row execute function private.audit_super_admin_write();

-- ---------------------------------------------------------------------------
-- The worker: records measurements and status on its job's documents, and
-- writes the item list (replacing it on a repeated delivery).
-- ---------------------------------------------------------------------------
grant select on table public.documents_in to procrobot_worker;
grant update (page_count, row_count, scanned, status, error) on table public.documents_in to procrobot_worker;
create policy "worker reads its job's org documents" on public.documents_in
  for select to procrobot_worker
  using (organization_id = (select private.worker_org_id()));
create policy "worker updates its job's org documents" on public.documents_in
  for update to procrobot_worker
  using (organization_id = (select private.worker_org_id()))
  with check (organization_id = (select private.worker_org_id()));

grant select, insert, delete on table public.item_lists, public.list_items to procrobot_worker;
create policy "worker reads its job's org item lists" on public.item_lists
  for select to procrobot_worker
  using (organization_id = (select private.worker_org_id()));
create policy "worker adds item lists to its job's org" on public.item_lists
  for insert to procrobot_worker
  with check (organization_id = (select private.worker_org_id()));
create policy "worker replaces unconfirmed item lists of its job's org" on public.item_lists
  for delete to procrobot_worker
  using (organization_id = (select private.worker_org_id()) and status = 'needs_review');
create policy "worker reads its job's org items" on public.list_items
  for select to procrobot_worker
  using (organization_id = (select private.worker_org_id()));
create policy "worker adds items to its job's org" on public.list_items
  for insert to procrobot_worker
  with check (organization_id = (select private.worker_org_id()));
create policy "worker removes items of its job's org" on public.list_items
  for delete to procrobot_worker
  using (organization_id = (select private.worker_org_id()));

-- Units are platform reference data, the same for every organization.
grant select on table public.units to procrobot_worker;
create policy "worker reads units" on public.units
  for select to procrobot_worker
  using (true);

-- ---------------------------------------------------------------------------
-- Jobs: the inspection queue, and what happens when a job ends.
-- ---------------------------------------------------------------------------
select pgmq.create('inspect_document');

-- When a job ends: settle its credits, and mark its document failed (with
-- the job's user-facing error) if the job failed.
create function private.on_job_finished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status not in ('succeeded', 'failed', 'cancelled')
     or old.status in ('succeeded', 'failed', 'cancelled') then
    return null;
  end if;
  if new.credits_reserved > 0 then
    perform private.settle_job_credits(
      new.id, case when new.status = 'succeeded' then new.credits_consumed else 0 end);
  end if;
  if new.status <> 'succeeded' and new.queue in ('inspect_document', 'extract') then
    -- Compared as text: a malformed payload must not break the job update.
    update public.documents_in
    set status = 'failed', error = left(coalesce(new.error, 'The document could not be read.'), 500)
    where id::text = new.payload ->> 'document_id'
      and job_id = new.id
      and status in ('uploaded', 'extracting');
  end if;
  return null;
end;
$$;

create trigger ai_jobs_finished
  after update of status on public.ai_jobs
  for each row execute function private.on_job_finished();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Registers a file the browser uploaded to `spec-files/{org}/{project}/…`
-- (D1) and queues its inspection. The size comes from Storage, not the client.
create function public.register_document(p_project_id uuid, p_file_path text, p_file_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
  v_project public.projects;
  v_name text := btrim(p_file_name);
  v_type text;
  v_size bigint;
  v_id uuid;
begin
  if v_org is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;
  select * into v_project from public.projects where id = p_project_id and organization_id = v_org;
  if not found then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;
  if v_project.status = 'archived' then
    raise exception 'project_archived' using errcode = 'P0001';
  end if;
  if p_file_path is null
     or p_file_path !~ ('^' || v_org::text || '/' || p_project_id::text || '/[A-Za-z0-9._-]{1,200}$')
     or v_name is null or length(v_name) not between 1 and 255 then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;
  v_type := lower(substring(v_name from '\.([A-Za-z0-9]+)$'));
  if v_type is null or v_type not in ('pdf', 'xlsx', 'xls', 'csv') then
    raise exception 'unsupported_file' using errcode = 'P0001';
  end if;

  select (o.metadata ->> 'size')::bigint into v_size
  from storage.objects o
  where o.bucket_id = 'spec-files' and o.name = p_file_path;
  if not found then
    raise exception 'file_not_found' using errcode = 'P0001';
  end if;
  if coalesce(v_size, 0) <= 0 or exists (select 1 from public.documents_in where file_path = p_file_path) then
    raise exception 'invalid_file' using errcode = 'P0001';
  end if;

  insert into public.documents_in (organization_id, project_id, file_path, file_name, file_type, file_size)
  values (v_org, p_project_id, p_file_path, v_name, v_type, v_size)
  returning id into v_id;

  update public.documents_in
  set job_id = private.enqueue_job(v_org, 'inspect_document', jsonb_build_object('document_id', v_id))
  where id = v_id;

  perform private.audit('document.uploaded', v_org, 'document', v_id::text,
    jsonb_build_object('name', v_name, 'project', v_project.name));
  return v_id;
end;
$$;

-- Starts the extraction of an inspected document (D10): reserves its
-- estimated credits and queues the `extract` job. Returns the job id.
create function public.extract_document(p_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
  v_doc public.documents_in;
  v_job uuid;
begin
  if v_org is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;
  select * into v_doc from public.documents_in
  where id = p_document_id and organization_id = v_org
  for update;
  if not found then
    raise exception 'document_not_found' using errcode = 'P0001';
  end if;
  if v_doc.status <> 'ready' or v_doc.estimated_credits is null then
    raise exception 'document_not_ready' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.projects where id = v_doc.project_id and status = 'archived') then
    raise exception 'project_archived' using errcode = 'P0001';
  end if;

  v_job := private.enqueue_job(v_org, 'extract', jsonb_build_object('document_id', v_doc.id),
                               v_doc.estimated_credits);
  perform private.reserve_credits(v_org, v_doc.estimated_credits, v_job,
                                  'Extraction: ' || v_doc.file_name);
  update public.documents_in set status = 'extracting', job_id = v_job, error = null
  where id = v_doc.id;
  return v_job;
end;
$$;

-- After a failure (D9): a document that was measured goes back to `ready`
-- (the member sees the estimate again before paying); one that could not be
-- measured is inspected again. Returns the new inspection job, if any.
create function public.retry_document(p_document_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
  v_doc public.documents_in;
  v_job uuid;
begin
  if v_org is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;
  select * into v_doc from public.documents_in
  where id = p_document_id and organization_id = v_org
  for update;
  if not found then
    raise exception 'document_not_found' using errcode = 'P0001';
  end if;
  if v_doc.status <> 'failed' then
    raise exception 'document_not_ready' using errcode = 'P0001';
  end if;

  if v_doc.estimated_credits is not null then
    update public.documents_in set status = 'ready', error = null where id = v_doc.id;
    return null;
  end if;
  v_job := private.enqueue_job(v_org, 'inspect_document', jsonb_build_object('document_id', v_doc.id));
  update public.documents_in set status = 'uploaded', job_id = v_job, error = null where id = v_doc.id;
  return v_job;
end;
$$;

-- Removes a document and its unconfirmed item list. A confirmed list stays
-- (without its document). Returns the file's Storage path, for the caller to
-- delete the file.
create function public.delete_document(p_document_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
  v_doc public.documents_in;
begin
  if v_org is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;
  select * into v_doc from public.documents_in
  where id = p_document_id and organization_id = v_org
  for update;
  if not found then
    raise exception 'document_not_found' using errcode = 'P0001';
  end if;
  if v_doc.status in ('uploaded', 'extracting') then
    raise exception 'document_busy' using errcode = 'P0001';
  end if;

  delete from public.item_lists where document_id = v_doc.id and status = 'needs_review';
  delete from public.documents_in where id = v_doc.id;
  return v_doc.file_path;
end;
$$;

-- Uploads join the activity feed (O6).
create or replace function public.org_activity(p_limit integer default 20)
returns table (
  id bigint,
  occurred_at timestamptz,
  action text,
  actor_name text,
  target_type text,
  metadata jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.occurred_at, a.action, coalesce(p.full_name, p.email), a.target_type, a.metadata
  from public.audit_logs a
  left join public.profiles p on p.id = a.actor_id
  where a.organization_id = public.auth_org_id()
    and a.action = any (array[
      'organization.created', 'organization.updated', 'organization.ownership_transferred',
      'organization.restored', 'member.invited', 'member.invite_revoked', 'member.joined',
      'member.role_changed', 'member.removed', 'member.left', 'account.deleted',
      'project.created', 'project.status_changed', 'project.deleted', 'document.uploaded'
    ])
  order by a.occurred_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

revoke execute on function
  public.estimate_credits(text, integer, boolean),
  public.register_document(uuid, text, text),
  public.extract_document(uuid),
  public.retry_document(uuid),
  public.delete_document(uuid)
  from public, anon;
grant execute on function
  public.estimate_credits(text, integer, boolean),
  public.register_document(uuid, text, text),
  public.extract_document(uuid),
  public.retry_document(uuid),
  public.delete_document(uuid)
  to authenticated;

-- Existing organizations start their first credit month now.
select private.grant_plan_credits(id) from public.organizations where status = 'active';

revoke execute on all functions in schema private from public;
