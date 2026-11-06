-- The worker role: least privilege, and confined to the organization of the
-- job it is running (TASKS.md T0.6.2, T0.6.6). Plus the sweeper and the
-- ping RPC (T0.6.5, T0.6.8).
begin;
\ir _helpers.psql
select plan(29);

select tests.create_user('a@a.example') as a_owner \gset
select tests.create_org(:'a_owner', 'Org A') as org_a \gset
select tests.create_user('b@b.example') as b_owner \gset
select tests.create_org(:'b_owner', 'Org B') as org_b \gset
select tests.create_user('loner@x.example') as loner \gset

select private.enqueue_job(:'org_a', 'ping') as job_a \gset
select private.enqueue_job(:'org_b', 'ping') as job_b \gset

-- Documents for the extraction handlers (T1.3): one per org, and a list org A
-- already confirmed.
insert into public.projects (id, organization_id, name, delivery_country) values
  ('e0000000-0000-4000-8000-00000000000a', :'org_a', 'Project A', 'SG'),
  ('e0000000-0000-4000-8000-00000000000b', :'org_b', 'Project B', 'SG');
insert into public.documents_in (id, organization_id, project_id, file_path, file_name, file_type, file_size) values
  ('f0000000-0000-4000-8000-00000000000a', :'org_a', 'e0000000-0000-4000-8000-00000000000a',
   'a/boq.xlsx', 'boq.xlsx', 'xlsx', 100),
  ('f0000000-0000-4000-8000-00000000000b', :'org_b', 'e0000000-0000-4000-8000-00000000000b',
   'b/boq.xlsx', 'boq.xlsx', 'xlsx', 100);
insert into public.item_lists (id, organization_id, project_id, title, status) values
  ('a1000000-0000-4000-8000-00000000000a', :'org_a', 'e0000000-0000-4000-8000-00000000000a',
   'Confirmed list', 'confirmed');

select ok(
  (select not rolsuper and not rolbypassrls and rolcanlogin from pg_roles where rolname = 'procrobot_worker'),
  'procrobot_worker can log in but has no superuser or RLS-bypass rights'
);

-- ------------------------------------------------------------ outside a job
-- Postgres 16+ does not let a role's creator switch to it by default; allow
-- it for this (rolled-back) test only.
grant procrobot_worker to postgres with inherit false, set true;
-- pgTAP's own functions live in `extensions`, which the worker never needs.
grant usage on schema extensions to procrobot_worker;
set local role procrobot_worker;
select is_empty('select id from public.ai_jobs', 'without a job org the worker sees no jobs');
select is_empty('select id from public.organizations', '... and no organizations');

-- ------------------------------------------------------- inside org A's job
select set_config('app.worker_org_id', :'org_a', true);
select results_eq('select id from public.ai_jobs', array[:'job_a'::uuid],
  'in org A''s job the worker sees only org A''s jobs');
select results_eq('select name from public.organizations', array['Org A'],
  '... and only org A');
select results_eq(
  format($$update public.ai_jobs set status = 'running', progress = 50 where id = %L returning progress::int$$, :'job_a'),
  array[50], 'it updates its own job');
select is_empty(
  format($$update public.ai_jobs set status = 'failed' where id = %L returning id$$, :'job_b'),
  'it cannot update another org''s job');
select throws_ok(
  format($$insert into public.jobs_dead_letter (queue, organization_id, message, attempts)
           values ('ping', %L, '{}', 1)$$, :'org_b'),
  '42501', null, 'it cannot file a dead letter for another org');
select lives_ok(
  $$insert into public.jobs_dead_letter (queue, message, attempts) values ('ping', '"garbage"', 1)$$,
  'it can file a dead letter for a message that names no org');

-- Least privilege: nothing beyond jobs, its org, queues and heartbeats.
select throws_ok('select * from public.profiles', '42501', null, 'no access to profiles');
select throws_ok('select * from public.projects', '42501', null, 'no access to projects (yet)');
select throws_ok('select * from public.audit_logs', '42501', null, 'no access to the audit log');
select throws_ok(
  format($$insert into public.ai_jobs (organization_id, queue) values (%L, 'ping')$$, :'org_a'),
  '42501', null, 'it cannot create jobs');
select is(
  (select count(*)::int from pgmq.read('ping', 30, 100)
   where message ->> 'job_id' in (:'job_a', :'job_b')),
  2, 'it reads queue messages');
select lives_ok(
  $$insert into public.worker_heartbeats (worker_id, hostname, started_at) values ('w-1', 'host', now())$$,
  'it writes its heartbeat');

-- Extraction (T1.3): its org's documents, item lists and items only.
select results_eq('select id from public.documents_in',
  array['f0000000-0000-4000-8000-00000000000a'::uuid], 'it sees only its org''s documents');
select results_eq(
  $$update public.documents_in set row_count = 60, status = 'ready'
    where id = 'f0000000-0000-4000-8000-00000000000a' returning estimated_credits$$,
  array[3], 'it records a document''s measurements, and the credit estimate follows');
select throws_ok(
  $$update public.documents_in set file_path = 'elsewhere' where id = 'f0000000-0000-4000-8000-00000000000a'$$,
  '42501', null, 'it cannot change which file a document is');
select is_empty(
  $$update public.documents_in set status = 'failed' where id = 'f0000000-0000-4000-8000-00000000000b' returning id$$,
  'it cannot touch another org''s document');
select lives_ok(
  format($$with list as (
             insert into public.item_lists (organization_id, project_id, document_id, title)
             values (%L, 'e0000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-00000000000a', 'BOQ')
             returning id)
           insert into public.list_items (organization_id, item_list_id, position, name, quantity, unit_code)
           select %L, id, 0, 'Dome camera', 4, 'pcs' from list$$, :'org_a', :'org_a'),
  'it writes an item list and its items');
select throws_ok(
  format($$insert into public.item_lists (organization_id, project_id, title)
           values (%L, 'e0000000-0000-4000-8000-00000000000b', 'Planted')$$, :'org_b'),
  '42501', null, 'it cannot write an item list for another org');
select is_empty(
  $$delete from public.item_lists where id = 'a1000000-0000-4000-8000-00000000000a' returning id$$,
  'it cannot replace a confirmed list');
select results_eq(
  $$delete from public.item_lists where document_id = 'f0000000-0000-4000-8000-00000000000a' returning title$$,
  array['BOQ'], 'it can replace an unconfirmed list (a repeated delivery)');
select ok((select count(*) from public.units) > 10, 'it reads the units');
select throws_ok('select * from public.credit_ledger', '42501', null, 'no access to credits');

reset role;
select results_eq(
  format('select status::text from public.ai_jobs where id = %L', :'job_b'),
  array['queued'], 'the other org''s job is untouched');

-- ------------------------------------------------------------- the sweeper
update public.ai_jobs set status = 'running', heartbeat_at = now() - interval '5 minutes'
  where id = :'job_a';
select is(private.sweep_stale_jobs(), 1, 'the sweeper requeues a job whose worker went silent');

-- ------------------------------------------------------------ ping_worker()
select tests.authenticate_as(:'a_owner');
select public.ping_worker() as ping \gset
select is(public.ping_worker(), :'ping'::uuid, 'asking again returns the open ping');

select tests.authenticate_as(:'loner');
select throws_ok('select public.ping_worker()', '42501', 'no_organization',
  'a user without an org cannot ping');

select * from finish();
rollback;
