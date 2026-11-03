-- Two organizations: nothing of one is visible to or writable by the other
-- (TASKS.md T0.4.4). Every denied write is paired with a check that the
-- target row is intact. Super Admins see both, and their writes are audited.
begin;
\ir _helpers.psql
select plan(36);

-- Org A (Professional, no project limit in the way): owner + member.
select tests.create_user('a-owner@a.example') as a_owner \gset
select tests.create_user('a-member@a.example') as a_member \gset
select tests.create_org(:'a_owner', 'Org A', 'professional') as org_a \gset
select tests.add_member(:'org_a', :'a_member');
-- Org B: owner only.
select tests.create_user('b-owner@b.example') as b_owner \gset
select tests.create_org(:'b_owner', 'Org B', 'professional', 'ID', 'IDR') as org_b \gset
-- Platform staff.
select tests.create_user('staff@proc-robot.example') as staff \gset
update public.profiles set app_role = 'super_admin' where id = :'staff';

-- Each org's data, created as the system.
insert into public.customers (id, organization_id, name) values
  ('c0000000-0000-4000-8000-00000000000a', :'org_a', 'Customer A'),
  ('c0000000-0000-4000-8000-00000000000b', :'org_b', 'Customer B');
insert into public.projects (id, organization_id, name, delivery_country) values
  ('d0000000-0000-4000-8000-00000000000a', :'org_a', 'Project A', 'SG'),
  ('d0000000-0000-4000-8000-00000000000b', :'org_b', 'Project B', 'ID');
insert into public.invites (organization_id, email, org_role) values
  (:'org_a', 'new-a@a.example', 'member'),
  (:'org_b', 'new-b@b.example', 'member');
select private.enqueue_job(:'org_a', 'ping') as job_a \gset
select private.enqueue_job(:'org_b', 'ping') as job_b \gset

-- ---------------------------------------------------------------- member of A
select tests.authenticate_as(:'a_member');

select results_eq('select name from public.organizations', array['Org A'],
  'organizations: a member sees only their org');
select results_eq('select email from public.profiles order by email',
  array['a-member@a.example', 'a-owner@a.example'],
  'profiles: a member sees only their teammates');
select is_empty('select * from public.invites', 'invites: a member sees none (Owner/Admin only)');
select results_eq('select name from public.customers', array['Customer A'],
  'customers: only their org');
select results_eq('select name from public.projects', array['Project A'],
  'projects: only their org');
select results_eq('select id from public.ai_jobs', array[:'job_a'::uuid],
  'ai_jobs: only their org');
select is_empty('select * from public.audit_logs', 'audit_logs: a member reads none');

-- Writes into the other org.
select throws_ok(
  format($$insert into public.customers (organization_id, name) values (%L, 'Planted')$$, :'org_b'),
  '42501', null, 'customers: cannot insert into another org');
select throws_ok(
  format($$insert into public.projects (organization_id, name, delivery_country) values (%L, 'Planted', 'ID')$$, :'org_b'),
  '42501', null, 'projects: cannot insert into another org');
select is_empty(
  $$update public.projects set name = 'Hacked' where id = 'd0000000-0000-4000-8000-00000000000b' returning id$$,
  'projects: updating another org''s row changes nothing');
select is_empty(
  $$delete from public.customers where id = 'c0000000-0000-4000-8000-00000000000b' returning id$$,
  'customers: deleting another org''s row removes nothing');
select is_empty(
  format($$update public.organizations set name = 'Hacked' where id = %L returning id$$, :'org_b'),
  'organizations: updating another org changes nothing');

-- A link to another org's row is rejected by the composite foreign key.
select throws_ok(
  $$insert into public.projects (name, delivery_country, customer_id)
    values ('Linked', 'SG', 'c0000000-0000-4000-8000-00000000000b')$$,
  '23503', null, 'projects: cannot reference another org''s customer');

-- Inserting without organization_id lands in the caller's org.
select results_eq(
  $$insert into public.customers (name) values ('Walk-in') returning organization_id$$,
  array[:'org_a'::uuid], 'customers: organization_id defaults to the caller''s org');

-- Membership and role columns are not writable by users.
select throws_ok(
  format($$update public.profiles set org_role = 'owner' where id = %L$$, :'a_member'),
  '42501', null, 'profiles: a member cannot promote themselves');
select throws_ok(
  format($$update public.profiles set organization_id = %L where id = %L$$, :'org_b', :'a_member'),
  '42501', null, 'profiles: a member cannot move to another org');
select throws_ok(
  format($$update public.organizations set plan_id = 'business' where id = %L$$, :'org_a'),
  '42501', null, 'organizations: members cannot change the plan');
select is_empty(
  format($$update public.organizations set name = 'Renamed' where id = %L returning id$$, :'org_a'),
  'organizations: a member cannot edit org settings');
select results_eq(
  format($$update public.profiles set full_name = 'Member A' where id = %L returning full_name$$, :'a_member'),
  array['Member A'], 'profiles: a user edits their own name');
select is_empty(
  format($$update public.profiles set full_name = 'X' where id = %L returning id$$, :'a_owner'),
  'profiles: a user cannot edit a teammate');

-- Jobs and queues are written by RPCs and the worker only.
select throws_ok(
  format($$insert into public.ai_jobs (organization_id, queue) values (%L, 'ping')$$, :'org_a'),
  '42501', null, 'ai_jobs: users cannot insert jobs');
select throws_ok(
  format($$select private.enqueue_job(%L, 'ping')$$, :'org_a'),
  '42501', null, 'users cannot call private.enqueue_job');
select throws_ok(
  $$select pgmq.send('ping', '{}'::jsonb)$$,
  '42501', null, 'users cannot write to queues directly');

-- ---------------------------------------------------------------- owner of A
select tests.authenticate_as(:'a_owner');
select results_eq('select email from public.invites', array['new-a@a.example'],
  'invites: the owner sees their org''s invites only');
select results_eq(
  format($$update public.organizations set name = 'Org A Ltd' where id = %L returning name$$, :'org_a'),
  array['Org A Ltd'], 'organizations: the owner edits their org');

-- ---------------------------------------------------------------- owner of B
select tests.authenticate_as(:'b_owner');
select results_eq('select name from public.projects', array['Project B'],
  'projects: org B sees only its own');
select results_eq('select name from public.customers', array['Customer B'],
  'customers: org B sees only its own');
select results_eq('select id from public.ai_jobs', array[:'job_b'::uuid],
  'ai_jobs: org B sees only its own');

-- Denied writes left the targets intact.
select tests.clear_authentication();
select results_eq(
  $$select name from public.projects where id = 'd0000000-0000-4000-8000-00000000000b'$$,
  array['Project B'], 'the denied update left org B''s project intact');
select results_eq(
  $$select count(*)::int from public.customers where id = 'c0000000-0000-4000-8000-00000000000b'$$,
  array[1], 'the denied delete left org B''s customer in place');
select results_eq(
  format('select name from public.organizations where id = %L', :'org_b'),
  array['Org B'], 'the denied update left org B intact');

-- ---------------------------------------------------------------- super admin
select tests.authenticate_as(:'staff');
select results_eq(
  format('select count(*)::int from public.projects where organization_id in (%L, %L)', :'org_a', :'org_b'),
  array[2], 'a Super Admin sees every org''s projects');
select results_eq(
  format('select count(*)::int from public.organizations where id in (%L, %L)', :'org_a', :'org_b'),
  array[2], 'a Super Admin sees every org');
select results_eq(
  $$update public.projects set notes = 'Checked by support'
    where id = 'd0000000-0000-4000-8000-00000000000b' returning notes$$,
  array['Checked by support'], 'a Super Admin can correct another org''s project');

select tests.clear_authentication();
select results_eq(
  format($$select action || '|' || target_type from public.audit_logs
           where actor_id = %L and organization_id = %L$$, :'staff', :'org_b'),
  array['super_admin.update|projects'],
  'the Super Admin''s cross-tenant write is in the audit log');
select results_eq(
  format($$select count(*)::int from public.audit_logs
           where action like 'super_admin.%%' and organization_id in (%L, %L)$$, :'org_a', :'org_b'),
  array[1], 'tenants'' own writes are not logged as Super Admin access');

select * from finish();
rollback;
