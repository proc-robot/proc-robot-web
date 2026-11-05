-- The audit log is append-only for everyone, and readable per plan.
begin;
\ir _helpers.psql
select plan(9);

select tests.create_user('owner@biz.example') as biz_owner \gset
select tests.create_user('member@biz.example') as biz_member \gset
select tests.create_org(:'biz_owner', 'Biz Co', 'business') as biz \gset
select tests.add_member(:'biz', :'biz_member');
select tests.create_user('owner@starter.example') as starter_owner \gset
select tests.create_org(:'starter_owner', 'Starter Co') as starter \gset
select tests.create_user('staff@proc-robot.example') as staff \gset
update public.profiles set app_role = 'super_admin' where id = :'staff';

select private.audit('test.biz_event', :'biz');
select private.audit('test.starter_event', :'starter');

select throws_ok($$update public.audit_logs set action = 'test.changed'$$,
  '42501', 'audit_logs is append-only', 'not even the table owner can update entries');
select throws_ok($$delete from public.audit_logs$$,
  '42501', 'audit_logs is append-only', 'or delete them');
select throws_ok($$truncate public.audit_logs$$,
  '42501', 'audit_logs is append-only', 'or truncate the table');

select tests.authenticate_as(:'biz_owner');
select results_eq($$select action from public.audit_logs where action like 'test.%'$$,
  array['test.biz_event'], 'a Business owner reads their own org''s trail');
select throws_ok(
  format($$insert into public.audit_logs (organization_id, action) values (%L, 'test.forged')$$, :'biz'),
  '42501', null, 'users cannot write entries');

select tests.authenticate_as(:'biz_member');
select is_empty($$select * from public.audit_logs$$, 'a member does not read the trail');

select tests.authenticate_as(:'starter_owner');
select is_empty($$select * from public.audit_logs$$,
  'a Starter owner does not read the trail (Business feature)');

select tests.authenticate_as(:'staff');
select results_eq(
  $$select action from public.audit_logs where action like 'test.%' order by action$$,
  array['test.biz_event', 'test.starter_event'], 'a Super Admin reads every org''s trail');

select tests.clear_authentication();
select results_eq(
  $$select count(*)::int from public.audit_logs where action like 'test.%'$$,
  array[2], 'all entries are still there');

select * from finish();
rollback;
