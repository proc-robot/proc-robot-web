-- Account & organization (TASKS.md T1.1): profile pictures and logos, the
-- public supplier profile, org settings, members, the activity feed, data
-- export, and deleting an account or an organization.
--
-- The hosted database already runs the earlier migrations, so this file only
-- adds and replaces; it never edits them.

-- ---------------------------------------------------------------------------
-- RLS helpers read the membership from the tables, not the JWT.
--
-- The token keeps its claims for up to an hour. Read from the JWT, a member
-- who was removed, demoted or whose organization was deleted would keep
-- their old access until the token expired. Read from the tables, the change
-- applies at once. Policies call these once per statement (`(select …)`), and
-- each is two primary-key lookups. SECURITY DEFINER (owner `postgres`, which
-- bypasses RLS) so the profiles policy can call them without recursion.
-- The app still routes on the JWT (src/proxy.ts) and refreshes it when the
-- two disagree.
-- ---------------------------------------------------------------------------
create or replace function public.auth_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid() and o.status = 'active'
$$;

create or replace function public.auth_org_role()
returns public.org_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.org_role
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid() and o.status = 'active'
$$;

-- ---------------------------------------------------------------------------
-- Organizations: categories served (O2) and validation
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column category_slugs text[] not null default '{}';

grant update (category_slugs) on table public.organizations to authenticated;

-- Invalid fields raise `invalid_field` with the field in `detail` (`website`,
-- `settings.tax_rate`, …); the UI maps it to a message.

-- The org settings (O5). Every key is optional; unknown keys are refused so
-- a typo never passes silently. calculate_quotation() (T1.8) and numbering
-- (T1.9) read them.
--   tax_rate            0–100 (percent)
--   tax_label           e.g. "GST", "PPN", "VAT"
--   default_markup_pct  0–1000
--   minimum_margin_pct  0–99.99
--   numbering           { sales_quote, rfq }: e.g. "KIGEN-QUO-{YYYY}-{NNNN}"
--   rounding            { mode: none | nearest | up | down, increment > 0 }
--   email_signature     up to 2000 characters
-- Returns the first invalid key (`settings.tax_rate`), or null when valid.
create function private.invalid_org_setting(p_settings jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_key text;
  v_value jsonb;
  v_number numeric;
  v_pattern constant text :=
    '^([A-Za-z0-9/_.-]|\{YYYY\}|\{YY\}|\{MM\}|\{N{3,8}\})+$';
begin
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    return 'settings';
  end if;

  for v_key, v_value in select key, value from jsonb_each(p_settings) loop
    v_number := case when jsonb_typeof(v_value) = 'number' then (v_value #>> '{}')::numeric end;
    case v_key
      when 'tax_rate' then
        if v_number is null or v_number not between 0 and 100 then
          return 'settings.tax_rate';
        end if;
      when 'tax_label' then
        if jsonb_typeof(v_value) <> 'string'
           or length(btrim(v_value #>> '{}')) not between 1 and 20 then
          return 'settings.tax_label';
        end if;
      when 'default_markup_pct' then
        if v_number is null or v_number not between 0 and 1000 then
          return 'settings.default_markup_pct';
        end if;
      when 'minimum_margin_pct' then
        if v_number is null or v_number < 0 or v_number >= 100 then
          return 'settings.minimum_margin_pct';
        end if;
      when 'numbering' then
        if jsonb_typeof(v_value) <> 'object'
           or exists (select 1 from jsonb_object_keys(v_value) k
                      where k not in ('sales_quote', 'rfq')) then
          return 'settings.numbering';
        end if;
        if v_value ? 'sales_quote' and (
             jsonb_typeof(v_value -> 'sales_quote') <> 'string'
             or length(v_value ->> 'sales_quote') > 60
             or (v_value ->> 'sales_quote') !~ v_pattern
             or (v_value ->> 'sales_quote') !~ '\{N{3,8}\}') then
          return 'settings.numbering.sales_quote';
        end if;
        if v_value ? 'rfq' and (
             jsonb_typeof(v_value -> 'rfq') <> 'string'
             or length(v_value ->> 'rfq') > 60
             or (v_value ->> 'rfq') !~ v_pattern
             or (v_value ->> 'rfq') !~ '\{N{3,8}\}') then
          return 'settings.numbering.rfq';
        end if;
      when 'rounding' then
        if jsonb_typeof(v_value) <> 'object'
           or exists (select 1 from jsonb_object_keys(v_value) k
                      where k not in ('mode', 'increment'))
           or coalesce(v_value ->> 'mode', '') not in ('none', 'nearest', 'up', 'down') then
          return 'settings.rounding';
        end if;
        if v_value ->> 'mode' <> 'none' and (
             jsonb_typeof(v_value -> 'increment') is distinct from 'number'
             or (v_value ->> 'increment')::numeric <= 0
             or (v_value ->> 'increment')::numeric > 1000000) then
          return 'settings.rounding.increment';
        end if;
      when 'email_signature' then
        if jsonb_typeof(v_value) <> 'string' or length(v_value #>> '{}') > 2000 then
          return 'settings.email_signature';
        end if;
      else
        return 'settings.' || v_key;
    end case;
  end loop;
  return null;
end;
$$;

-- Normalizes and checks the organization profile on every write, whatever
-- the path (the settings form, a Super Admin, a later RPC). Empty strings
-- become null. SECURITY DEFINER because it calls a private helper, which
-- users may not execute.
create function private.validate_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invalid text;
begin
  new.name := btrim(new.name);
  new.address := nullif(btrim(new.address), '');
  new.tax_id := nullif(btrim(new.tax_id), '');
  new.email := nullif(lower(btrim(new.email)), '');
  new.whatsapp_number :=
    nullif(regexp_replace(coalesce(new.whatsapp_number, ''), '[\s()-]', '', 'g'), '');
  new.website := nullif(btrim(new.website), '');
  new.description := nullif(btrim(new.description), '');
  new.category_slugs := coalesce(
    (select array_agg(distinct s order by s) from unnest(new.category_slugs) s), '{}');

  v_invalid := case
    when length(new.address) > 500 then 'address'
    when length(new.tax_id) > 50 then 'tax_id'
    when new.email is not null
         and (length(new.email) > 254 or new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then 'email'
    when new.whatsapp_number is not null
         and new.whatsapp_number !~ '^\+[1-9][0-9]{6,14}$' then 'whatsapp_number'
    when new.website is not null
         and (length(new.website) > 200
              or new.website !~* '^https?://[a-z0-9-]+(\.[a-z0-9-]+)+(:[0-9]+)?(/\S*)?$') then 'website'
    when length(new.description) > 1000 then 'description'
    when cardinality(new.category_slugs) > 30
         or exists (select 1 from unnest(new.category_slugs) s
                    where not exists (select 1 from public.categories c where c.slug = s))
      then 'category_slugs'
    else private.invalid_org_setting(new.settings)
  end;

  if v_invalid is not null then
    raise exception 'invalid_field' using errcode = 'P0001', detail = v_invalid;
  end if;
  return new;
end;
$$;

create trigger organizations_validate
  before insert or update on public.organizations
  for each row execute function private.validate_organization();

-- Profile and settings edits feed the activity log (which fields, not their
-- values). RPCs log their own changes (status, plan, deletion).
create function private.audit_organization_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fields text[];
begin
  if auth.uid() is null then
    return new;
  end if;
  select array_agg(n.key order by n.key) into v_fields
  from jsonb_each(to_jsonb(new)) n
  where n.key in ('name', 'country', 'default_currency', 'address', 'tax_id', 'email',
                  'whatsapp_number', 'website', 'description', 'logo_path', 'category_slugs',
                  'settings')
    and n.value is distinct from (to_jsonb(old) -> n.key);
  if v_fields is not null then
    perform private.audit('organization.updated', new.id, 'organization', new.id::text,
      jsonb_build_object('fields', v_fields));
  end if;
  return new;
end;
$$;

create trigger organizations_audit_update
  after update on public.organizations
  for each row execute function private.audit_organization_update();

-- ---------------------------------------------------------------------------
-- Profile: the time zone must be a real one (it drives every date shown).
-- ---------------------------------------------------------------------------
create function private.validate_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.full_name := nullif(btrim(new.full_name), '');
  if length(new.full_name) > 120 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'full_name';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'timezone';
  end if;
  return new;
end;
$$;

create trigger profiles_validate
  before insert or update of full_name, timezone on public.profiles
  for each row execute function private.validate_profile();

-- ---------------------------------------------------------------------------
-- Storage: profile pictures and organization logos (public buckets, served
-- from the CDN). Avatars live under `{user_id}/…`, logos under `{org_id}/…`.
-- SVG is refused: it can carry scripts.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('org-logos', 'org-logos', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- private.object_org_id() returns an object's first folder as a uuid; for
-- avatars that folder is the user's id.
create policy "users manage their avatar: read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and private.object_org_id(name) = (select auth.uid()));
create policy "users manage their avatar: add" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and private.object_org_id(name) = (select auth.uid()));
create policy "users manage their avatar: replace" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and private.object_org_id(name) = (select auth.uid()))
  with check (bucket_id = 'avatars' and private.object_org_id(name) = (select auth.uid()));
create policy "users manage their avatar: delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and private.object_org_id(name) = (select auth.uid()));

create policy "members read their org's logo" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-logos'
    and (private.object_org_id(name) = (select public.auth_org_id())
         or (select public.is_super_admin()))
  );
create policy "owners and admins add the org logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  );
create policy "owners and admins replace the org logo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  )
  with check (
    bucket_id = 'org-logos'
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  );
create policy "owners and admins delete the org logo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  );

-- ---------------------------------------------------------------------------
-- Membership helpers for the RPCs below
-- ---------------------------------------------------------------------------

-- The caller's profile, locked, when they hold one of p_roles in an active
-- organization. Reads the tables, never the JWT.
create function private.require_org_role(p_roles public.org_role[])
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  if v_profile.organization_id is null
     or not exists (select 1 from public.organizations
                    where id = v_profile.organization_id and status = 'active') then
    raise exception 'no_organization' using errcode = '42501';
  end if;
  if not (v_profile.org_role = any (p_roles)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return v_profile;
end;
$$;

-- A member of p_org, locked; raises member_not_found otherwise.
create function private.org_member(p_org uuid, p_user uuid)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.profiles;
begin
  select * into v_member from public.profiles
  where id = p_user and organization_id = p_org
  for update;
  if not found then
    raise exception 'member_not_found' using errcode = 'P0001';
  end if;
  return v_member;
end;
$$;

-- Ends every session of a user: their refresh tokens stop working, so the
-- app signs them out at the next refresh. (The access token already in their
-- browser lives on until it expires, but the RLS helpers above no longer
-- grant it anything.)
create function private.end_sessions(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user
$$;

-- ---------------------------------------------------------------------------
-- Invites and members (O3, O4)
-- ---------------------------------------------------------------------------

-- Same as before, but only for an active organization, through the shared
-- membership check.
create or replace function public.invite_member(
  p_email text,
  p_org_role public.org_role default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_org_role(array['owner', 'admin']::public.org_role[]);
  v_org uuid := v_profile.organization_id;
  v_email text := lower(btrim(p_email));
  v_existing public.invites;
  v_seats integer;
  v_invite_id uuid;
begin
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

-- Owner/Admin withdraws an open invite; its seat is free at once.
create function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_org_role(array['owner', 'admin']::public.org_role[]);
  v_email text;
begin
  update public.invites
    set revoked_at = now()
    where id = p_invite_id
      and organization_id = v_profile.organization_id
      and accepted_at is null and revoked_at is null
    returning email into v_email;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;

  perform private.audit('member.invite_revoked', v_profile.organization_id, 'invite',
    p_invite_id::text, jsonb_build_object('email', v_email));
end;
$$;

-- Owner/Admin makes a member an Admin or the reverse. Nobody changes their
-- own role, and the Owner's role changes only through a transfer.
create function public.change_member_role(p_user_id uuid, p_org_role public.org_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_org_role(array['owner', 'admin']::public.org_role[]);
  v_member public.profiles;
begin
  if p_org_role = 'owner' then
    raise exception 'invalid_role' using errcode = 'P0001',
      hint = 'Use transfer_ownership to make someone the Owner.';
  end if;
  if p_user_id = v_profile.id then
    raise exception 'not_allowed' using errcode = '42501', hint = 'You cannot change your own role.';
  end if;

  v_member := private.org_member(v_profile.organization_id, p_user_id);
  if v_member.org_role = 'owner' then
    raise exception 'not_allowed' using errcode = '42501', hint = 'The Owner''s role is transferred.';
  end if;
  if v_member.org_role = p_org_role then
    return;
  end if;

  update public.profiles set org_role = p_org_role where id = p_user_id;
  perform private.audit('member.role_changed', v_profile.organization_id, 'profile',
    p_user_id::text,
    jsonb_build_object('name', coalesce(v_member.full_name, v_member.email),
                       'from', v_member.org_role, 'to', p_org_role));
end;
$$;

-- Owner/Admin removes a member (never the Owner, never themselves). The
-- member loses access at once and is signed out everywhere.
create function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_org_role(array['owner', 'admin']::public.org_role[]);
  v_member public.profiles;
begin
  if p_user_id = v_profile.id then
    raise exception 'not_allowed' using errcode = '42501',
      hint = 'Leave the organization instead.';
  end if;

  v_member := private.org_member(v_profile.organization_id, p_user_id);
  if v_member.org_role = 'owner' then
    raise exception 'not_allowed' using errcode = '42501', hint = 'The Owner cannot be removed.';
  end if;

  update public.profiles set organization_id = null, org_role = null where id = p_user_id;
  perform private.end_sessions(p_user_id);
  perform private.audit('member.removed', v_profile.organization_id, 'profile', p_user_id::text,
    jsonb_build_object('name', coalesce(v_member.full_name, v_member.email),
                       'email', v_member.email));
end;
$$;

-- A member or Admin leaves their organization (the Owner transfers first).
-- Also the way out of an organization that was deleted.
create function public.leave_organization()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  if v_profile.organization_id is null then
    raise exception 'no_organization' using errcode = '42501';
  end if;
  if v_profile.org_role = 'owner' then
    raise exception 'owner_must_transfer' using errcode = 'P0001';
  end if;

  update public.profiles set organization_id = null, org_role = null where id = v_profile.id;
  perform private.audit('member.left', v_profile.organization_id, 'profile', v_profile.id::text,
    jsonb_build_object('name', coalesce(v_profile.full_name, v_profile.email)));
end;
$$;

-- The Owner hands the organization to another member, and becomes an Admin.
create function public.transfer_ownership(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_org_role(array['owner']::public.org_role[]);
  v_member public.profiles;
begin
  if p_user_id = v_profile.id then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  v_member := private.org_member(v_profile.organization_id, p_user_id);

  -- One Owner per org (unique index): step down first.
  update public.profiles set org_role = 'admin' where id = v_profile.id;
  update public.profiles set org_role = 'owner' where id = p_user_id;

  perform private.audit('organization.ownership_transferred', v_profile.organization_id,
    'profile', p_user_id::text,
    jsonb_build_object('from', coalesce(v_profile.full_name, v_profile.email),
                       'to', coalesce(v_member.full_name, v_member.email)));
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity feed (O6): the organization's own audit entries, limited to the
-- actions every member may see. Later features add their actions to the list
-- (document uploaded, quotation sent, prices added, …) by replacing this
-- function.
-- ---------------------------------------------------------------------------
create function public.org_activity(p_limit integer default 20)
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
      'member.role_changed', 'member.removed', 'member.left', 'account.deleted'
    ])
  order by a.occurred_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

-- ---------------------------------------------------------------------------
-- Account: data export and deletion (A6)
-- ---------------------------------------------------------------------------

-- Everything Proc-Robot holds about the caller as a person, as one JSON
-- document. Organization data (projects, prices, quotations) belongs to the
-- organization and is exported by it (T1.12.5), so only what this user
-- created is listed.
create function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
begin
  if v_user is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  select lower(email) into v_email from auth.users where id = v_user;

  return jsonb_build_object(
    'exported_at', now(),
    'account', (
      select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at,
                                'last_sign_in_at', u.last_sign_in_at)
      from auth.users u where u.id = v_user),
    'profile', (
      select jsonb_build_object('full_name', p.full_name, 'avatar_url', p.avatar_url,
                                'format_locale', p.format_locale, 'timezone', p.timezone,
                                'display_currency', p.display_currency, 'home_view', p.home_view,
                                'created_at', p.created_at, 'updated_at', p.updated_at)
      from public.profiles p where p.id = v_user),
    'organization', (
      select jsonb_build_object('id', o.id, 'name', o.name, 'role', p.org_role)
      from public.profiles p join public.organizations o on o.id = p.organization_id
      where p.id = v_user),
    'invites_received', coalesce((
      select jsonb_agg(jsonb_build_object('organization', o.name, 'role', i.org_role,
                                          'created_at', i.created_at, 'accepted_at', i.accepted_at,
                                          'revoked_at', i.revoked_at, 'expires_at', i.expires_at)
                       order by i.created_at)
      from public.invites i join public.organizations o on o.id = i.organization_id
      where i.email = v_email), '[]'::jsonb),
    'invites_sent', coalesce((
      select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.org_role,
                                          'created_at', i.created_at, 'accepted_at', i.accepted_at,
                                          'revoked_at', i.revoked_at)
                       order by i.created_at)
      from public.invites i where i.invited_by = v_user), '[]'::jsonb),
    'projects_created', coalesce((
      select jsonb_agg(jsonb_build_object('id', pr.id, 'name', pr.name,
                                          'created_at', pr.created_at)
                       order by pr.created_at)
      from public.projects pr where pr.created_by = v_user), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('occurred_at', a.occurred_at, 'action', a.action,
                                          'target_type', a.target_type, 'target_id', a.target_id)
                       order by a.occurred_at desc)
      from (select * from public.audit_logs where actor_id = v_user
            order by occurred_at desc limit 1000) a), '[]'::jsonb)
  );
end;
$$;

-- Deletes the caller's account for good: the auth user, their profile and
-- their sessions. An Owner transfers ownership (or deletes the organization)
-- first, so no organization is left without one. What they created for the
-- organization stays with it, no longer linked to them.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  if v_profile.org_role = 'owner'
     and exists (select 1 from public.organizations
                 where id = v_profile.organization_id and status <> 'deleted') then
    raise exception 'owner_must_transfer' using errcode = 'P0001';
  end if;

  perform private.audit('account.deleted', v_profile.organization_id, 'profile',
    v_profile.id::text, '{}'::jsonb);
  -- Cascades to the profile and to auth.sessions / refresh tokens.
  delete from auth.users where id = v_profile.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deleting an organization (O7): soft delete, 30 days to restore, then purge.
-- ---------------------------------------------------------------------------

-- The Owner deletes the organization, typing its name to confirm. Every
-- member loses access at once (the RLS helpers and the token hook only honor
-- active orgs); open invites are revoked.
create function public.delete_organization(p_confirm_name text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.require_org_role(array['owner']::public.org_role[]);
  v_org public.organizations;
begin
  select * into v_org from public.organizations where id = v_profile.organization_id for update;
  if lower(btrim(coalesce(p_confirm_name, ''))) <> lower(v_org.name) then
    raise exception 'confirmation_mismatch' using errcode = 'P0001';
  end if;

  update public.organizations set status = 'deleted', deleted_at = now() where id = v_org.id;
  update public.invites set revoked_at = now()
    where organization_id = v_org.id and accepted_at is null and revoked_at is null;

  perform private.audit('organization.deleted', v_org.id, 'organization', v_org.id::text,
    jsonb_build_object('name', v_org.name, 'purge_after', now() + interval '30 days'));
  return now() + interval '30 days';
end;
$$;

-- The Owner restores a deleted organization within the 30 days.
create function public.restore_organization()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
begin
  if v_profile.org_role is distinct from 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.organizations set status = 'active', deleted_at = null
    where id = v_profile.organization_id
      and status = 'deleted' and deleted_at > now() - interval '30 days';
  if not found then
    raise exception 'organization_not_restorable' using errcode = 'P0001';
  end if;

  perform private.audit('organization.restored', v_profile.organization_id, 'organization',
    v_profile.organization_id::text, '{}'::jsonb);
end;
$$;

-- The caller's organization whatever its status, for the screens shown when
-- it is not active (onboarding: suspended or deleted).
create function public.my_organization_state()
returns table (
  organization_id uuid,
  name text,
  status text,
  org_role public.org_role,
  deleted_at timestamptz,
  purge_after timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.name, o.status, p.org_role, o.deleted_at, o.deleted_at + interval '30 days'
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid()
$$;

-- Daily: organizations deleted more than 30 days ago are removed with their
-- data (customers, projects, invites, jobs cascade). Members are detached
-- first, so they can create or join another organization.
-- Storage files are not removed here: Storage objects are deleted through
-- the Storage API only, which the worker will do (TASKS.md T1.1.9).
create function private.purge_deleted_organizations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org record;
  v_count integer := 0;
begin
  for v_org in
    select id, name from public.organizations
    where status = 'deleted' and deleted_at < now() - interval '30 days'
    for update skip locked
  loop
    update public.profiles set organization_id = null, org_role = null
      where organization_id = v_org.id;
    delete from public.organizations where id = v_org.id;
    perform private.audit('organization.purged', v_org.id, 'organization', v_org.id::text,
      jsonb_build_object('name', v_org.name));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('purge-deleted-organizations', '30 3 * * *',
  $$select private.purge_deleted_organizations()$$);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function
  public.revoke_invite(uuid),
  public.change_member_role(uuid, public.org_role),
  public.remove_member(uuid),
  public.leave_organization(),
  public.transfer_ownership(uuid),
  public.org_activity(integer),
  public.export_my_data(),
  public.delete_my_account(),
  public.delete_organization(text),
  public.restore_organization(),
  public.my_organization_state()
  from public, anon;
grant execute on function
  public.revoke_invite(uuid),
  public.change_member_role(uuid, public.org_role),
  public.remove_member(uuid),
  public.leave_organization(),
  public.transfer_ownership(uuid),
  public.org_activity(integer),
  public.export_my_data(),
  public.delete_my_account(),
  public.delete_organization(text),
  public.restore_organization(),
  public.my_organization_state()
  to authenticated;

-- Nothing in `private` is callable by users unless granted above (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
