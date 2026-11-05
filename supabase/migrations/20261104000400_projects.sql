-- Customers and projects, with the plan's active-project limit.
-- TASKS.md T0.5.1 (and the tables for T1.2.1 / T1.2.4; their UI comes later).
--
-- The tenant-table pattern every later table follows:
-- * `organization_id` defaults to the caller's org, so clients never send it,
--   and it cannot be updated (no column grant).
-- * One policy per operation: `organization_id = auth_org_id()`; Super
--   Admins may read (and write where the matrix allows).
-- * Links to another tenant row use a composite foreign key that includes
--   `organization_id`, so a row can never point at another org's data.

-- ---------------------------------------------------------------------------
-- Customers (Q1)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.auth_org_id()
    references public.organizations (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  contact_name text,
  email text,
  phone text,
  address text,
  tax_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id)
);

create index customers_org_name_idx on public.customers (organization_id, name);

create trigger customers_updated_at before update on public.customers
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Projects (W1)
-- ---------------------------------------------------------------------------
create type public.project_status as enum ('active', 'submitted', 'won', 'lost', 'archived');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.auth_org_id()
    references public.organizations (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  customer_id uuid,
  reference_no text,
  deadline date,
  -- Where online prices are searched (L1/L2); defaults to the org's country.
  delivery_country text not null check (delivery_country ~ '^[A-Z]{2}$'),
  delivery_city text,
  status public.project_status not null default 'active',
  notes text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id) on delete set null (customer_id)
);

create index projects_org_status_idx on public.projects (organization_id, status);

create trigger projects_updated_at before update on public.projects
  for each row execute function private.set_updated_at();

-- Open projects count against the plan's `active_projects` limit: `active`
-- and `submitted` (a submitted tender is still open). Enforced in a trigger,
-- so creating, re-opening or restoring a project all go through it.
create function private.enforce_active_project_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
  v_open integer;
begin
  if new.status not in ('active', 'submitted') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('active', 'submitted') then
    return new;  -- already counted
  end if;

  v_limit := private.plan_limit(new.organization_id, 'active_projects');
  if v_limit is null then
    return new;
  end if;

  -- Serializes concurrent creates in one org so both cannot pass the check.
  perform pg_advisory_xact_lock(hashtextextended('active_projects:' || new.organization_id::text, 0));
  select count(*) into v_open
  from public.projects
  where organization_id = new.organization_id
    and status in ('active', 'submitted')
    and id <> new.id;

  if v_open >= v_limit then
    perform private.raise_plan_limit('active_projects');
  end if;
  return new;
end;
$$;

create trigger projects_active_limit
  before insert or update of status on public.projects
  for each row execute function private.enforce_active_project_limit();

-- Creates a project in the caller's organization. Runs as the caller, so RLS
-- applies; the trigger above enforces the plan limit.
create function public.create_project(
  p_name text,
  p_customer_id uuid default null,
  p_reference_no text default null,
  p_deadline date default null,
  p_delivery_country text default null,
  p_delivery_city text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_org uuid := public.auth_org_id();
  v_id uuid;
begin
  if v_org is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;

  insert into public.projects
    (organization_id, name, customer_id, reference_no, deadline,
     delivery_country, delivery_city, notes)
  values (
    v_org, btrim(p_name), p_customer_id, p_reference_no, p_deadline,
    coalesce(upper(p_delivery_country),
             (select country from public.organizations where id = v_org)),
    p_delivery_city, p_notes
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function
  public.create_project(text, uuid, text, date, text, text, text) from public, anon;
grant execute on function
  public.create_project(text, uuid, text, date, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security. All members work on all projects and customers (W4);
-- deleting is for Owner/Admin (archiving is the everyday path).
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.projects enable row level security;

revoke all on table public.customers, public.projects from anon, authenticated;
grant select, insert, delete on table public.customers, public.projects to authenticated;
grant update (name, contact_name, email, phone, address, tax_id, notes)
  on table public.customers to authenticated;
grant update (name, customer_id, reference_no, deadline, delivery_country, delivery_city,
              status, notes)
  on table public.projects to authenticated;

create policy "members read their customers" on public.customers
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "members add customers" on public.customers
  for insert to authenticated
  with check (organization_id = (select public.auth_org_id()));
create policy "members update their customers" on public.customers
  for update to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()))
  with check (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "owners and admins delete customers" on public.customers
  for delete to authenticated
  using (
    (organization_id = (select public.auth_org_id()) and (select public.auth_is_org_admin()))
    or (select public.is_super_admin())
  );

create policy "members read their projects" on public.projects
  for select to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "members add projects" on public.projects
  for insert to authenticated
  with check (organization_id = (select public.auth_org_id()));
create policy "members update their projects" on public.projects
  for update to authenticated
  using (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()))
  with check (organization_id = (select public.auth_org_id()) or (select public.is_super_admin()));
create policy "owners and admins delete projects" on public.projects
  for delete to authenticated
  using (
    (organization_id = (select public.auth_org_id()) and (select public.auth_is_org_admin()))
    or (select public.is_super_admin())
  );

create trigger customers_super_admin_audit
  after insert or update or delete on public.customers
  for each row execute function private.audit_super_admin_write();
create trigger projects_super_admin_audit
  after insert or update or delete on public.projects
  for each row execute function private.audit_super_admin_write();

-- Nothing in `private` is callable by users unless granted above (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
