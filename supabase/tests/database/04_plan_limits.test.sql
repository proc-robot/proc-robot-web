-- Plan limits (TASKS.md T0.5): active projects and seats, on every path.
begin;
\ir _helpers.psql
select plan(18);

select tests.create_user('owner@starter.example') as owner \gset
select tests.create_user('member@starter.example') as member \gset
select tests.create_org(:'owner', 'Starter Co') as starter \gset
select tests.add_member(:'starter', :'member');

select tests.create_user('owner@pro.example') as pro_owner \gset
select tests.create_org(:'pro_owner', 'Pro Co', 'professional') as pro \gset

-- ------------------------------------------------------------ active projects
select tests.authenticate_as(:'member');
select public.create_project('One') as p1 \gset
select public.create_project('Two') as p2 \gset
select lives_ok($$select public.create_project('Three')$$, 'Starter: the 3rd open project is allowed');
select throws_ok($$select public.create_project('Four')$$,
  'P0001', 'plan_limit_reached', 'Starter: the 4th open project is blocked');
select throws_ok($$insert into public.projects (name, delivery_country) values ('Direct', 'SG')$$,
  'P0001', 'plan_limit_reached', 'a direct insert is blocked too');

select results_eq(
  format($$update public.projects set status = 'archived' where id = %L returning status::text$$, :'p1'),
  array['archived'], 'archiving frees a slot');
select lives_ok($$select public.create_project('Four')$$, '... so a new project fits');
select throws_ok(
  format($$update public.projects set status = 'active' where id = %L$$, :'p1'),
  'P0001', 'plan_limit_reached', 're-opening an archived project is blocked when full');
select lives_ok(
  format($$update public.projects set status = 'submitted' where id = %L$$, :'p2'),
  'moving between open statuses is fine');
select results_eq(
  format($$update public.projects set status = 'won' where id = %L returning status::text$$, :'p2'),
  array['won'], 'closing a project frees a slot');
select results_eq(
  format('select delivery_country from public.projects where id = %L', :'p2'),
  array['SG'], 'delivery country defaults to the org''s country');

select tests.authenticate_as(:'pro_owner');
select lives_ok(
  $$select public.create_project('P' || n) from generate_series(1, 6) n$$,
  'Professional: no limit on open projects');

-- ------------------------------------------------------------------- seats
-- Starter has 3 seats: owner + member + one invite fills it.
select tests.authenticate_as(:'member');
select throws_ok($$select public.invite_member('x@starter.example')$$,
  '42501', 'not_allowed', 'a member cannot invite');

select tests.authenticate_as(:'owner');
select public.invite_member('x@starter.example') as invite_x \gset
select throws_ok($$select public.invite_member('y@starter.example')$$,
  'P0001', 'plan_limit_reached', 'Starter: no 4th seat, pending invites included');
select is(public.invite_member('x@starter.example', 'admin'), :'invite_x'::uuid,
  'inviting the same email again refreshes the invite instead of taking a seat');
select throws_ok($$select public.invite_member('member@starter.example')$$,
  'P0001', 'already_member', 'existing members cannot be invited');
select throws_ok($$select public.invite_member('z@starter.example', 'owner')$$,
  'P0001', 'invalid_role', 'nobody is invited as Owner');

-- An expired invite gives its seat back.
select tests.clear_authentication();
update public.invites set expires_at = now() - interval '1 minute' where id = :'invite_x';
select tests.authenticate_as(:'owner');
select lives_ok($$select public.invite_member('y@starter.example')$$,
  'an expired invite no longer holds a seat');

-- Accepting re-checks seats (e.g. the org filled up some other way).
select tests.create_user('y@starter.example') as y \gset
select tests.create_user('extra@starter.example') as extra \gset
select tests.clear_authentication();
select tests.add_member(:'starter', :'extra');
select tests.authenticate_as(:'y');
select throws_ok(
  $$select public.accept_invite((select invite_id from public.my_pending_invites()))$$,
  'P0001', 'plan_limit_reached', 'accepting is blocked when the org is already full');

select tests.clear_authentication();
select results_eq(
  format($$select count(*)::int from public.audit_logs
           where organization_id = %L and action = 'member.invited'$$, :'starter'),
  array[3], 'every invite (and re-invite) is audited');

select * from finish();
rollback;
