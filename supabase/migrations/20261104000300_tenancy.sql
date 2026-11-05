-- Tenancy: organizations, profiles, invites, the JWT claims hook, onboarding
-- and plan helpers. TASKS.md T0.2.4, T0.3.3, T0.3.4, T0.3.5 (database side),
-- T0.4.2, T0.5.2, T0.5.3.
--
-- One organization per user, many users per organization. Users never write
-- `organization_id`, `org_role` or `app_role` themselves: only the functions
-- below change membership, and they read the tables, not the JWT.

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country text not null check (country ~ '^[A-Z]{2}$'),
  default_currency text not null check (default_currency ~ '^[A-Z]{3}$'),
  address text,
  tax_id text,
  -- Public supplier profile (O2): shown to other orgs from P3.
  email text,
  whatsapp_number text check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  website text,
  description text,
  logo_path text,
  -- Tax rates, numbering formats, default markup, minimum margin, rounding,
  -- email signature (O5). Validated by the settings form and RPCs (T1.1.6).
  settings jsonb not null default '{}'::jsonb,
  plan_id text not null default 'starter' references public.plans (id),
  status text not null default 'active' check (status in ('active', 'suspended', 'deleted')),
  verified_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created by a trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  -- Restrict: removing an org with members goes through the purge job
  -- (T1.1.8), which detaches them first.
  organization_id uuid references public.organizations (id) on delete restrict,
  org_role public.org_role,
  app_role public.app_role not null default 'user',
  format_locale text not null default 'en-US' check (format_locale in ('en-US', 'en-ID')),
  timezone text not null default 'UTC',
  display_currency text check (display_currency ~ '^[A-Z]{3}$'),
  home_view text not null default 'both' check (home_view in ('quotations', 'rfqs', 'both')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_role_iff_org check ((organization_id is null) = (org_role is null))
);

create index profiles_org_idx on public.profiles (organization_id);
create unique index profiles_one_owner_per_org on public.profiles (organization_id)
  where org_role = 'owner';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Invites. Accepted by the invited email address only (it is proven by
-- Google or the magic link), so no secret token is stored.
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  org_role public.org_role not null check (org_role <> 'owner'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- One open invite per email and org; inviting again refreshes it.
create unique index invites_one_open_per_email on public.invites (organization_id, email)
  where accepted_at is null and revoked_at is null;
create index invites_email_idx on public.invites (email)
  where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Plan helpers (PLAN.md: plan gating happens in RPCs). Unlimited = null.
-- ---------------------------------------------------------------------------
create function private.plan_limit(p_organization_id uuid, p_limit text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limits jsonb;
begin
  select p.limits into v_limits
  from public.organizations o
  join public.plans p on p.id = o.plan_id
  where o.id = p_organization_id;

  if v_limits is null then
    raise exception 'organization % not found', p_organization_id;
  end if;
  if not v_limits ? p_limit then
    raise exception 'unknown plan limit %', p_limit;
  end if;
  return (v_limits ->> p_limit)::integer;
end;
$$;

create function private.plan_feature(p_organization_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((p.features ->> p_feature)::boolean, false)
  from public.organizations o
  join public.plans p on p.id = o.plan_id
  where o.id = p_organization_id
$$;

grant execute on function private.plan_feature(uuid, text) to authenticated;

-- Members plus open, unexpired invites: an invite holds its seat until it is
-- accepted, revoked or expires.
create function private.seats_used(p_organization_id uuid, p_ignore_invite uuid default null)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.profiles where organization_id = p_organization_id)::integer
    + (select count(*) from public.invites
       where organization_id = p_organization_id
         and accepted_at is null and revoked_at is null and expires_at > now()
         and id is distinct from p_ignore_invite)::integer
$$;

-- Raised by every plan check; the frontend maps `detail` to a message.
create function private.raise_plan_limit(p_limit text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'plan_limit_reached'
    using errcode = 'P0001', detail = p_limit,
          hint = 'Upgrade the plan to raise this limit.';
end;
$$;

-- ---------------------------------------------------------------------------
-- New auth users get a profile; email changes follow.
-- ---------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Custom Access Token Hook: adds org_id, org_role, app_role and plan to the
-- JWT, which the RLS helpers read. A suspended or deleted organization gets
-- no org_id, which cuts its members off at their next token refresh.
-- Enabled in supabase/config.toml ([auth.hook.custom_access_token]) and in
-- each hosted project's Auth settings.
-- ---------------------------------------------------------------------------
create function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_profile record;
begin
  select p.organization_id, p.org_role, p.app_role, o.plan_id, o.status as org_status
    into v_profile
  from public.profiles p
  left join public.organizations o on o.id = p.organization_id
  where p.id = (event ->> 'user_id')::uuid;

  v_claims := v_claims
    || jsonb_build_object(
      'app_role', coalesce(v_profile.app_role, 'user'),
      'org_status', v_profile.org_status
    );

  if v_profile.organization_id is not null and v_profile.org_status = 'active' then
    v_claims := v_claims || jsonb_build_object(
      'org_id', v_profile.organization_id,
      'org_role', v_profile.org_role,
      'plan', v_profile.plan_id
    );
  else
    v_claims := v_claims - 'org_id' - 'org_role' - 'plan';
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;

revoke all on table public.organizations, public.profiles, public.invites from anon, authenticated;

-- The auth hook runs as supabase_auth_admin and reads these two tables.
grant select on table public.organizations, public.profiles to supabase_auth_admin;
create policy "auth hook reads profiles" on public.profiles
  for select to supabase_auth_admin using (true);
create policy "auth hook reads organizations" on public.organizations
  for select to supabase_auth_admin using (true);

-- Organizations: members read their own; Owner/Admin edit the profile and
-- settings columns. Plan, status and verification change only through
-- Super Admin RPCs (T1.12.2); creation and deletion only through RPCs.
grant select on table public.organizations to authenticated;
grant update (name, country, default_currency, address, tax_id, email, whatsapp_number,
              website, description, logo_path, settings)
  on table public.organizations to authenticated;

create policy "members read their organization" on public.organizations
  for select to authenticated
  using (id = (select public.auth_org_id()) or (select public.is_super_admin()));

create policy "owners and admins update their organization" on public.organizations
  for update to authenticated
  using (
    (id = (select public.auth_org_id()) and (select public.auth_is_org_admin()))
    or (select public.is_super_admin())
  )
  with check (
    (id = (select public.auth_org_id()) and (select public.auth_is_org_admin()))
    or (select public.is_super_admin())
  );

-- Profiles: a user reads their own and their teammates'; edits only their
-- own personal fields. Membership columns change only through RPCs.
grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url, format_locale, timezone, display_currency, home_view)
  on table public.profiles to authenticated;

create policy "users read themselves and their teammates" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or organization_id = (select public.auth_org_id())
    or (select public.is_super_admin())
  );

create policy "users update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Invites: Owner/Admin see their org's invites. Writes only through RPCs.
grant select on table public.invites to authenticated;

create policy "owners and admins read their invites" on public.invites
  for select to authenticated
  using (
    (organization_id = (select public.auth_org_id()) and (select public.auth_is_org_admin()))
    or (select public.is_super_admin())
  );

-- Audit log: Super Admins read everything; an org's Owner/Admin read their
-- org's entries on plans with the org audit trail (Business).
create policy "audit log readers" on public.audit_logs
  for select to authenticated
  using (
    (select public.is_super_admin())
    or (
      organization_id = (select public.auth_org_id())
      and (select public.auth_is_org_admin())
      and private.plan_feature(organization_id, 'org_audit_trail')
    )
  );

create trigger organizations_super_admin_audit
  after insert or update or delete on public.organizations
  for each row execute function private.audit_super_admin_write();
create trigger profiles_super_admin_audit
  after update on public.profiles
  for each row execute function private.audit_super_admin_write();

-- ---------------------------------------------------------------------------
-- Onboarding RPCs (A3). After any of them, the client refreshes the session
-- so the new claims reach the JWT.
-- ---------------------------------------------------------------------------

-- The caller's profile row, locked; raises when the caller is not signed in.
create function private.current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  return v_profile;
end;
$$;

-- Creates an organization on the Starter plan and makes the caller its Owner.
create function public.create_organization(
  p_name text,
  p_country text,
  p_default_currency text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_base text;
  v_slug text;
  v_org_id uuid := gen_random_uuid();
begin
  if v_profile.organization_id is not null then
    raise exception 'already_in_organization' using errcode = 'P0001';
  end if;

  v_base := coalesce(nullif(btrim(regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'), '-'), ''), 'org');
  v_slug := left(v_base, 40);
  if exists (select 1 from public.organizations where slug = v_slug) then
    v_slug := left(v_base, 33) || '-' || substr(replace(v_org_id::text, '-', ''), 1, 6);
  end if;

  insert into public.organizations (id, name, slug, country, default_currency)
  values (v_org_id, btrim(p_name), v_slug, upper(p_country), upper(p_default_currency));

  update public.profiles
    set organization_id = v_org_id, org_role = 'owner'
    where id = v_profile.id;

  perform private.audit('organization.created', v_org_id, 'organization', v_org_id::text,
    jsonb_build_object('name', btrim(p_name)));
  return v_org_id;
end;
$$;

-- Open invites for the caller's confirmed email, for the onboarding screen.
create function public.my_pending_invites()
returns table (
  invite_id uuid,
  organization_name text,
  org_role public.org_role,
  invited_by_name text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, o.name, i.org_role, inviter.full_name, i.expires_at
  from auth.users u
  join public.invites i on i.email = lower(u.email)
  join public.organizations o on o.id = i.organization_id and o.status = 'active'
  left join public.profiles inviter on inviter.id = i.invited_by
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  order by i.created_at desc
$$;

-- Joins the organization of an open invite addressed to the caller's
-- confirmed email. Re-checks the seat limit: the plan may have changed.
create function public.accept_invite(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_invite public.invites;
  v_seats integer;
begin
  if v_profile.organization_id is not null then
    raise exception 'already_in_organization' using errcode = 'P0001';
  end if;

  select i.* into v_invite
  from public.invites i
  join auth.users u on u.id = v_profile.id
  join public.organizations o on o.id = i.organization_id
  where i.id = p_invite_id
    and i.email = lower(u.email)
    and u.email_confirmed_at is not null
    and o.status = 'active'
    and i.accepted_at is null and i.revoked_at is null and i.expires_at > now()
  for update of i;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('seats:' || v_invite.organization_id::text, 0));
  v_seats := private.plan_limit(v_invite.organization_id, 'seats');
  if v_seats is not null
     and private.seats_used(v_invite.organization_id, v_invite.id) + 1 > v_seats then
    perform private.raise_plan_limit('seats');
  end if;

  update public.profiles
    set organization_id = v_invite.organization_id, org_role = v_invite.org_role
    where id = v_profile.id;
  update public.invites
    set accepted_at = now(), accepted_by = v_profile.id
    where id = v_invite.id;

  perform private.audit('member.joined', v_invite.organization_id, 'profile', v_profile.id::text,
    jsonb_build_object('invite_id', v_invite.id, 'org_role', v_invite.org_role));
  return v_invite.organization_id;
end;
$$;

-- Owner/Admin invites someone by email (O3). Inviting an address that
-- already has an open invite refreshes it (the "resend"). Pending invites
-- hold a seat. The invite email itself is sent by the worker (T1.11.2) or the
-- Auth invite flow; this records the invite and returns its id.
create function public.invite_member(p_email text, p_org_role public.org_role default 'member')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_org uuid := v_profile.organization_id;
  v_email text := lower(btrim(p_email));
  v_existing public.invites;
  v_seats integer;
  v_invite_id uuid;
begin
  if v_org is null or v_profile.org_role not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_org_role = 'owner' then
    raise exception 'invalid_role' using errcode = 'P0001',
      hint = 'Ownership is transferred, not invited.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.profiles where organization_id = v_org and email = v_email) then
    raise exception 'already_member' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('seats:' || v_org::text, 0));

  select * into v_existing from public.invites
  where organization_id = v_org and email = v_email
    and accepted_at is null and revoked_at is null
  for update;

  -- An unexpired open invite already holds its seat; anything else needs one.
  if v_existing.id is null or v_existing.expires_at <= now() then
    v_seats := private.plan_limit(v_org, 'seats');
    if v_seats is not null and private.seats_used(v_org, v_existing.id) + 1 > v_seats then
      perform private.raise_plan_limit('seats');
    end if;
  end if;

  if v_existing.id is not null then
    update public.invites
      set org_role = p_org_role, invited_by = v_profile.id,
          expires_at = now() + interval '7 days'
      where id = v_existing.id
      returning id into v_invite_id;
  else
    insert into public.invites (organization_id, email, org_role, invited_by)
    values (v_org, v_email, p_org_role, v_profile.id)
    returning id into v_invite_id;
  end if;

  perform private.audit('member.invited', v_org, 'invite', v_invite_id::text,
    jsonb_build_object('email', v_email, 'org_role', p_org_role,
                       'resent', v_existing.id is not null));
  return v_invite_id;
end;
$$;

revoke execute on function
  public.create_organization(text, text, text),
  public.my_pending_invites(),
  public.accept_invite(uuid),
  public.invite_member(text, public.org_role)
  from public, anon;
grant execute on function
  public.create_organization(text, text, text),
  public.my_pending_invites(),
  public.accept_invite(uuid),
  public.invite_member(text, public.org_role)
  to authenticated;

-- Nothing in `private` is callable by users unless granted above (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
