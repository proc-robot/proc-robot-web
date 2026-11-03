-- Foundation: extensions, the private schema, roles, RLS helpers and the
-- append-only audit log. TASKS.md T0.2.3, T0.2.7, T0.4.1.
--
-- Conventions used by every later migration:
-- * Every table in `public` has RLS enabled and explicit grants. `anon` gets
--   nothing: the public site is static and never queries the database.
-- * Business rules live in functions. Internal helpers live in `private`,
--   which the Data API does not expose; callable RPCs live in `public`.
-- * Functions pin `search_path = ''` and schema-qualify every name.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;      -- embeddings (T1.5.3)
create extension if not exists pg_trgm with schema extensions;     -- fuzzy keyword search (T1.5.4)
create extension if not exists pgmq;                               -- Supabase Queues (schema pgmq)
create extension if not exists pg_cron;                            -- scheduled jobs (schema cron)
create extension if not exists pg_net with schema extensions;      -- HTTP from SQL (schema net)
create extension if not exists supabase_vault with schema vault;   -- encrypted secrets (search API keys)

-- ---------------------------------------------------------------------------
-- Private schema: helpers that must not be callable through the Data API
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon;
-- RLS policies run as the querying role, so `authenticated` needs to reach
-- the few helpers they call. EXECUTE is granted function by function.
grant usage on schema private to authenticated, service_role;
-- Postgres lets PUBLIC execute every new function, and a per-schema
-- ALTER DEFAULT PRIVILEGES cannot take that back. So every migration that
-- creates functions in `private` ends with
--   revoke execute on all functions in schema private from public;
-- (tests/database/01_schema.test.sql fails if one is left callable).

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
-- Role inside an organization (CORE_FEATURES.md §1, §17).
create type public.org_role as enum ('owner', 'admin', 'member');
-- Platform role. `super_admin` is Proc-Robot staff.
create type public.app_role as enum ('user', 'super_admin');

-- ---------------------------------------------------------------------------
-- RLS helpers. They read the claims the custom access token hook puts in the
-- JWT (see the tenancy migration), so a policy costs no extra query. Wrap
-- them in a sub-select inside policies — `(select public.auth_org_id())` —
-- so Postgres evaluates them once per statement, not once per row.
--
-- Claims are refreshed when the session refreshes (at most `jwt_expiry`,
-- 1 hour). Anything where a stale claim would matter (joining or leaving an
-- org, role changes, plan limits) is decided by RPCs that read the tables.
-- ---------------------------------------------------------------------------
create function public.auth_org_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'org_id', '')::uuid
$$;

create function public.auth_org_role()
returns public.org_role
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'org_role', '')::public.org_role
$$;

-- Owner or Admin of their organization.
create function public.auth_is_org_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(public.auth_org_role() in ('owner', 'admin'), false)
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'app_role' = 'super_admin', false)
$$;

revoke execute on function
  public.auth_org_id(), public.auth_org_role(), public.auth_is_org_admin(), public.is_super_admin()
  from public, anon;
grant execute on function
  public.auth_org_id(), public.auth_org_role(), public.auth_is_org_admin(), public.is_super_admin()
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit log (immutable). Written only through private.audit(); never updated
-- or deleted, not even by the table owner (the trigger below also stops
-- `postgres`). The read policy is added in the tenancy migration, once plans
-- exist (the org audit trail is a Business-plan feature).
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  -- auth.uid() of whoever acted; null for the system (cron, worker, webhooks).
  actor_id uuid,
  actor_app_role public.app_role,
  -- The organization affected. No foreign key: the log outlives deleted orgs.
  organization_id uuid,
  -- Dotted verb, e.g. 'organization.created', 'member.invited'.
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb
);

create index audit_logs_org_time_idx on public.audit_logs (organization_id, occurred_at desc);
create index audit_logs_time_idx on public.audit_logs (occurred_at desc);

alter table public.audit_logs enable row level security;
revoke all on table public.audit_logs from anon, authenticated, service_role;
grant select on table public.audit_logs to authenticated;
grant select, insert on table public.audit_logs to service_role;

create function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger audit_logs_no_update_delete
  before update or delete on public.audit_logs
  for each row execute function private.audit_logs_immutable();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.audit_logs_immutable();

-- Writes one audit entry as the current user. SECURITY DEFINER so RPCs and
-- triggers can log without users holding INSERT on the table.
create function private.audit(
  p_action text,
  p_organization_id uuid,
  p_target_type text default null,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs
    (actor_id, actor_app_role, organization_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    nullif(auth.jwt() ->> 'app_role', '')::public.app_role,
    p_organization_id,
    p_action,
    p_target_type,
    p_target_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
$$;

-- Logs a Super Admin's write to another organization's rows (PLAN.md →
-- Security: every cross-tenant access is audited). Attached to tenant tables.
-- Reads cannot be caught by triggers; the admin console logs those (T1.12.4).
create function private.audit_super_admin_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_org uuid := coalesce((v_row ->> 'organization_id')::uuid,
                         case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid end);
begin
  if public.is_super_admin() and v_org is distinct from public.auth_org_id() then
    perform private.audit(
      'super_admin.' || lower(tg_op),
      v_org,
      tg_table_name,
      v_row ->> 'id',
      jsonb_build_object('table', tg_table_name)
    );
  end if;
  return coalesce(new, old);
end;
$$;

-- Nothing in `private` is callable by users unless granted (see above).
revoke execute on all functions in schema private from public;
