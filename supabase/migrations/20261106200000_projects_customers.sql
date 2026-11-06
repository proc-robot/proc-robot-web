-- Projects and customers (TASKS.md T1.2): every write is normalized and
-- checked, a customer's name is unique in its organization, projects can be
-- duplicated, and project events join the activity feed. The tables, the
-- plan limit and `create_project()` come from the projects migration.

-- ---------------------------------------------------------------------------
-- Customers (Q1)
-- ---------------------------------------------------------------------------

-- Trims every field (blank → null), lower-cases the email, and refuses values
-- the forms would refuse, with the field's name in `detail`.
create function private.validate_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := coalesce(btrim(new.name), '');
  new.contact_name := nullif(btrim(new.contact_name), '');
  new.email := lower(nullif(btrim(new.email), ''));
  new.phone := nullif(btrim(new.phone), '');
  new.address := nullif(btrim(new.address), '');
  new.tax_id := nullif(btrim(new.tax_id), '');
  new.notes := nullif(btrim(new.notes), '');

  if new.name = '' or length(new.name) > 200 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'name';
  end if;
  if length(new.contact_name) > 120 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'contact_name';
  end if;
  if new.email is not null
     and (length(new.email) > 254 or new.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'email';
  end if;
  if new.phone is not null
     and (new.phone !~ '^[0-9+() ./-]{1,40}$'
          or length(regexp_replace(new.phone, '[^0-9]', '', 'g')) < 5) then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'phone';
  end if;
  if length(new.address) > 500 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'address';
  end if;
  if length(new.tax_id) > 50 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'tax_id';
  end if;
  if length(new.notes) > 2000 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'notes';
  end if;
  return new;
end;
$$;

create trigger customers_validate
  before insert or update on public.customers
  for each row execute function private.validate_customer();

-- One customer per name (any case) in an organization, so the picker never
-- shows two "Raffles Tower Management". Duplicates raise 23505.
create unique index customers_org_name_key on public.customers (organization_id, lower(name));

-- Search by part of a name (`ilike '%…%'`).
create index customers_name_trgm_idx on public.customers using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Projects (W1)
-- ---------------------------------------------------------------------------
create function private.validate_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := coalesce(btrim(new.name), '');
  new.reference_no := nullif(btrim(new.reference_no), '');
  new.delivery_country := upper(btrim(new.delivery_country));
  new.delivery_city := nullif(btrim(new.delivery_city), '');
  new.notes := nullif(btrim(new.notes), '');

  if new.name = '' or length(new.name) > 200 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'name';
  end if;
  if length(new.reference_no) > 100 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'reference_no';
  end if;
  if new.deadline is not null
     and (new.deadline < date '2000-01-01' or new.deadline > date '2100-12-31') then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'deadline';
  end if;
  if new.delivery_country is null or new.delivery_country !~ '^[A-Z]{2}$' then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'delivery_country';
  end if;
  if length(new.delivery_city) > 100 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'delivery_city';
  end if;
  if length(new.notes) > 2000 then
    raise exception 'invalid_field' using errcode = 'P0001', detail = 'notes';
  end if;
  return new;
end;
$$;

create trigger projects_validate
  before insert or update on public.projects
  for each row execute function private.validate_project();

-- The project list filters by customer and searches names.
create index projects_org_customer_idx on public.projects (organization_id, customer_id);
create index projects_name_trgm_idx on public.projects using gin (name extensions.gin_trgm_ops);

-- Copies a project as a new open project (W3): customer, delivery place and
-- notes. The tender's reference and deadline are left blank: a copy is for a
-- new tender. Its documents and items are copied too once they exist (T1.3).
-- Runs as the caller: RLS and the plan's open-project limit apply.
create function public.duplicate_project(p_project_id uuid, p_name text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_source public.projects;
  v_id uuid;
begin
  select * into v_source
  from public.projects
  where id = p_project_id and organization_id = public.auth_org_id();
  if not found then
    raise exception 'project_not_found' using errcode = 'P0001';
  end if;

  insert into public.projects
    (organization_id, name, customer_id, delivery_country, delivery_city, notes)
  values (
    v_source.organization_id,
    coalesce(nullif(btrim(p_name), ''), left(v_source.name, 193) || ' (copy)'),
    v_source.customer_id, v_source.delivery_country, v_source.delivery_city, v_source.notes
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Project events for the activity feed (O6): created, status changes
-- (submitted, won, lost, archived, reopened) and deletion. Changes without a
-- signed-in user (seed data, the daily purge of a deleted org) are not logged.
create function private.audit_project_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    perform private.audit('project.created', new.organization_id, 'project', new.id::text,
      jsonb_build_object('name', new.name));
  elsif tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      perform private.audit('project.status_changed', new.organization_id, 'project', new.id::text,
        jsonb_build_object('name', new.name, 'from', old.status, 'to', new.status));
    end if;
  else
    perform private.audit('project.deleted', old.organization_id, 'project', old.id::text,
      jsonb_build_object('name', old.name));
  end if;
  return null;
end;
$$;

create trigger projects_audit
  after insert or update of status or delete on public.projects
  for each row execute function private.audit_project_change();

-- The activity feed now includes project events.
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
      'project.created', 'project.status_changed', 'project.deleted'
    ])
  order by a.occurred_at desc, a.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
$$;

revoke execute on function public.duplicate_project(uuid, text) from public, anon;
grant execute on function public.duplicate_project(uuid, text) to authenticated;

revoke execute on all functions in schema private from public;
