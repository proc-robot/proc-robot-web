-- The worker role: least privilege, and confined to the organization of the
-- job it is running (TASKS.md T0.6.2, T0.6.6). Plus the sweeper and the
-- ping RPC (T0.6.5, T0.6.8).
begin;
\ir _helpers.psql
select plan(19);

select tests.create_user('a@a.example') as a_owner \gset
select tests.create_org(:'a_owner', 'Org A') as org_a \gset
select tests.create_user('b@b.example') as b_owner \gset
select tests.create_org(:'b_owner', 'Org B') as org_b \gset
select tests.create_user('loner@x.example') as loner \gset

select private.enqueue_job(:'org_a', 'ping') as job_a \gset
select private.enqueue_job(:'org_b', 'ping') as job_b \gset

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
