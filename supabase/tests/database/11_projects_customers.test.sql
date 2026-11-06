-- Projects and customers (TASKS.md T1.2): checks and normalization, unique
-- customer names, every member works on every project (W4), duplicating and
-- archiving within the plan's limit, deleting, and project events in the
-- activity feed.
begin;
\ir _helpers.psql
select plan(34);

-- The `detail` of the error a statement raises (null if it succeeds).
create function tests.error_detail(p_sql text)
returns text
language plpgsql
as $$
declare
  v_detail text;
begin
  execute p_sql;
  return null;
exception when others then
  get stacked diagnostics v_detail = pg_exception_detail;
  return v_detail;
end;
$$;
grant execute on function tests.error_detail(text) to authenticated;

-- Kigen is on Starter: 3 open projects.
select tests.create_user('leo@kigen.example') as leo \gset
select tests.create_user('anna@kigen.example') as anna \gset
select tests.create_user('ratna@kigen.example') as ratna \gset
select tests.create_org(:'leo', 'Kigen') as kigen \gset
select tests.add_member(:'kigen', :'anna', 'admin');
select tests.add_member(:'kigen', :'ratna', 'member');
select tests.create_user('budi@acme.example') as budi \gset
select tests.create_org(:'budi', 'Acme', 'starter', 'ID', 'IDR') as acme \gset

-- ---------------------------------------------------------------- customers
select tests.authenticate_as(:'ratna');
select results_eq(
  $$insert into public.customers (name, contact_name, email, phone, address, notes)
    values ('  Raffles Tower  ', ' Mei Lin ', ' Mei@Raffles.example ', ' +65 6123-4567 ', '   ', '')
    returning name || '|' || contact_name || '|' || email || '|' || phone || '|'
              || coalesce(address, 'null') || '|' || coalesce(notes, 'null')$$,
  array['Raffles Tower|Mei Lin|mei@raffles.example|+65 6123-4567|null|null'],
  'a member adds a customer; fields are trimmed, blanks become null, the email lower-case');
insert into public.customers (name) values ('Harbour Mall') returning id as harbour \gset
select id as raffles from public.customers where name = 'Raffles Tower' \gset

select throws_ok($$insert into public.customers (name) values ('RAFFLES TOWER')$$,
  '23505', null, 'a customer name is unique in the organization, in any case');
select is(tests.error_detail($$insert into public.customers (name) values ('   ')$$),
  'name', 'a customer needs a name');
select is(tests.error_detail($$insert into public.customers (name, email) values ('X', 'not-an-email')$$),
  'email', 'the email must be valid');
select is(tests.error_detail($$insert into public.customers (name, phone) values ('X', 'call me')$$),
  'phone', 'the phone number must be digits, spaces and + ( ) - . /');
select is(tests.error_detail(format(
    $$update public.customers set notes = repeat('x', 2001) where id = %L$$, :'raffles')),
  'notes', 'notes are limited to 2,000 characters');

select tests.authenticate_as(:'budi');
select lives_ok($$insert into public.customers (name) values ('Raffles Tower')$$,
  'another organization may use the same name');

-- ------------------------------------------------------------------ projects
select tests.authenticate_as(:'ratna');
select public.create_project(' CCTV – Office Tower ', :'raffles', ' RT-114 ', '2026-12-01', 'id', '  ')
  as cctv \gset
select results_eq(
  format($$select name || '|' || reference_no || '|' || delivery_country || '|'
                  || coalesce(delivery_city, 'null') || '|' || status
           from public.projects where id = %L$$, :'cctv'),
  array['CCTV – Office Tower|RT-114|ID|null|active'],
  'a member creates a project; fields are trimmed and the country upper-cased');
select is(tests.error_detail(format(
    $$update public.projects set reference_no = repeat('x', 101) where id = %L$$, :'cctv')),
  'reference_no', 'the reference is limited to 100 characters');
select is(tests.error_detail(format(
    $$update public.projects set deadline = '1999-12-31' where id = %L$$, :'cctv')),
  'deadline', 'a deadline must be a plausible date');
select is(tests.error_detail(format(
    $$update public.projects set delivery_country = 'Singapore' where id = %L$$, :'cctv')),
  'delivery_country', 'the delivery country is a two-letter code');
select is(tests.error_detail(format(
    $$update public.projects set name = '' where id = %L$$, :'cctv')),
  'name', 'a project needs a name');

-- Every member works on every project (W4).
select tests.authenticate_as(:'leo');
select public.create_project('Fire alarm – Harbour Mall', :'harbour', null, null, null, 'Singapore')
  as fire \gset
select results_eq(
  format($$update public.projects set notes = 'Site visit on Monday' where id = %L returning delivery_country$$,
         :'cctv'),
  array['ID'], 'the Owner edits a project a member created');
select tests.authenticate_as(:'ratna');
select results_eq(
  format($$update public.projects set deadline = '2026-12-15' where id = %L returning name$$, :'fire'),
  array['Fire alarm – Harbour Mall'], 'a member edits a project the Owner created');
select results_eq(
  $$select name from public.projects order by name$$,
  array['CCTV – Office Tower', 'Fire alarm – Harbour Mall'], 'members see all the org''s projects');
select is_empty(
  format('delete from public.projects where id = %L returning id', :'fire'),
  'a member cannot delete a project (archiving is the everyday path)');
select is_empty(
  format('delete from public.customers where id = %L returning id', :'harbour'),
  'a member cannot delete a customer');

-- ---------------------------------------------------------------- duplicating
select public.duplicate_project(:'cctv') as cctv_copy \gset
select results_eq(
  format($$select name || '|' || coalesce(customer_id::text, 'none') || '|'
                  || coalesce(reference_no, 'null') || '|' || coalesce(deadline::text, 'null') || '|'
                  || delivery_country || '|' || coalesce(notes, 'null') || '|' || status || '|'
                  || (created_by = %L)::text
           from public.projects where id = %L$$, :'ratna', :'cctv_copy'),
  array[format('CCTV – Office Tower (copy)|%s|null|null|ID|Site visit on Monday|active|true', :'raffles')],
  'a copy keeps the customer, place and notes; the reference and deadline start blank');

-- Kigen now has 3 open projects: the Starter limit.
select throws_ok(format('select public.duplicate_project(%L, ''Another'')', :'cctv'),
  'P0001', 'plan_limit_reached', 'a copy counts against the open-project limit');

select tests.authenticate_as(:'budi');
select throws_ok(format('select public.duplicate_project(%L)', :'cctv'),
  'P0001', 'project_not_found', 'another organization cannot copy the project');

-- ---------------------------------------------------- archiving and statuses
select tests.authenticate_as(:'ratna');
select results_eq(
  format($$update public.projects set status = 'archived' where id = %L returning status::text$$, :'cctv_copy'),
  array['archived'], 'a member archives a project');
select lives_ok(
  format($$select public.duplicate_project(%L, 'Lift upgrade')$$, :'fire'),
  '... which frees a place for another, named copy');
select throws_ok(
  format($$update public.projects set status = 'active' where id = %L$$, :'cctv_copy'),
  'P0001', 'plan_limit_reached', 'restoring needs a free place too');
select results_eq(
  format($$update public.projects set status = 'submitted' where id = %L returning status::text$$, :'cctv'),
  array['submitted'], 'a submitted tender stays open');
select results_eq(
  format($$update public.projects set status = 'won' where id = %L returning status::text$$, :'cctv'),
  array['won'], 'a won project no longer counts');
select lives_ok(
  format($$update public.projects set status = 'active' where id = %L$$, :'cctv_copy'),
  '... so the archived copy can be restored');

-- ------------------------------------------------------------------ deleting
select tests.authenticate_as(:'anna');
select results_eq(
  format('delete from public.customers where id = %L returning name', :'raffles'),
  array['Raffles Tower'], 'an Admin deletes a customer');
select results_eq(
  format($$select coalesce(customer_id::text, 'none') from public.projects where id in (%L, %L)$$,
         :'cctv', :'cctv_copy'),
  array['none', 'none'], '... and its projects stay, without a customer');
select results_eq(
  format('delete from public.projects where id = %L returning name', :'cctv_copy'),
  array['CCTV – Office Tower (copy)'], 'an Admin deletes a project');

-- ------------------------------------------------------------- activity feed
select results_eq(
  $$select action || coalesce(':' || (metadata ->> 'to'), '') || ':' || (metadata ->> 'name')
    from public.org_activity(50) where action like 'project.%' order by id$$,
  array[
    'project.created:CCTV – Office Tower',
    'project.created:Fire alarm – Harbour Mall',
    'project.created:CCTV – Office Tower (copy)',
    'project.status_changed:archived:CCTV – Office Tower (copy)',
    'project.created:Lift upgrade',
    'project.status_changed:submitted:CCTV – Office Tower',
    'project.status_changed:won:CCTV – Office Tower',
    'project.status_changed:active:CCTV – Office Tower (copy)',
    'project.deleted:CCTV – Office Tower (copy)'
  ],
  'project events are in the activity feed, in order');
select results_eq(
  $$select actor_name from public.org_activity(1)$$,
  array['Anna'], '... with who did them');
select is_empty(
  $$select 1 from public.org_activity(50) where action like 'project.%' and metadata ->> 'name' is null$$,
  'every project event names its project');

select tests.authenticate_as(:'budi');
select is_empty($$select 1 from public.org_activity(50) where action like 'project.%'$$,
  'another organization sees none of them');

-- Without a signed-in user (seed data, the daily purge) nothing is logged.
select tests.clear_authentication();
delete from public.projects where id = :'fire';
select is_empty(
  format($$select 1 from public.audit_logs
           where organization_id = %L and action = 'project.deleted'
             and metadata ->> 'name' = 'Fire alarm – Harbour Mall'$$, :'kigen'),
  'changes without a signed-in user are not logged');

select * from finish();
rollback;
