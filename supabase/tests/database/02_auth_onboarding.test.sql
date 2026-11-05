-- Sign-up creates a profile; the token hook issues the right claims;
-- onboarding creates an org or joins one through an invite.
begin;
\ir _helpers.psql
select plan(19);

select tests.create_user('leo@kigen.example') as leo \gset
select tests.create_user('ratna@kigen.example') as ratna \gset
select tests.create_user('mallory@evil.example') as mallory \gset
select tests.create_user('unconfirmed@kigen.example', false) as unconfirmed \gset
select tests.create_user('staff@proc-robot.example') as staff \gset
update public.profiles set app_role = 'super_admin' where id = :'staff';

select results_eq(
  format('select email || ''|'' || full_name from public.profiles where id = %L', :'leo'),
  array['leo@kigen.example|Leo'],
  'sign-up creates a profile with the email and name'
);

select is(tests.claims_for(:'leo') ->> 'app_role', 'user', 'a new user is a plain user');
select ok(not tests.claims_for(:'leo') ? 'org_id', 'a user without an org has no org_id claim');
select is(tests.claims_for(:'staff') ->> 'app_role', 'super_admin', 'staff get the super_admin claim');

-- Leo creates his organization. His current token predates it, so the new
-- org is checked as the system; his next token carries it.
select tests.authenticate_as(:'leo');
select public.create_organization('Kigen Pte. Ltd.', 'sg', 'sgd') as kigen \gset
select throws_ok(
  $$select public.create_organization('Second Org', 'SG', 'SGD')$$,
  'P0001', 'already_in_organization',
  'a user cannot create a second organization'
);

select tests.clear_authentication();
select results_eq(
  format('select slug || ''|'' || country || ''|'' || default_currency || ''|'' || plan_id
          from public.organizations where id = %L', :'kigen'),
  array['kigen-pte-ltd|SG|SGD|starter'],
  'create_organization stores the org on the Starter plan'
);
select results_eq(
  format('select org_role::text from public.profiles where id = %L', :'leo'),
  array['owner'],
  'the creator becomes the Owner'
);

select tests.authenticate_as(:'leo');
select is(tests.claims_for(:'leo') ->> 'org_id', :'kigen', 'the refreshed token carries org_id');
select is(tests.claims_for(:'leo') ->> 'org_role', 'owner', '... and org_role');
select is(tests.claims_for(:'leo') ->> 'plan', 'starter', '... and the plan');

-- Leo invites Ratna.
select public.invite_member('  Ratna@Kigen.example ', 'member') as invite \gset

select tests.authenticate_as(:'ratna');
select results_eq(
  'select organization_name || ''|'' || org_role::text from public.my_pending_invites()',
  array['Kigen Pte. Ltd.|member'],
  'the invitee sees the invite on the onboarding screen'
);

select tests.authenticate_as(:'mallory');
select is_empty('select * from public.my_pending_invites()', 'another user sees no invite');
select throws_ok(
  format('select public.accept_invite(%L)', :'invite'),
  'P0001', 'invite_not_found',
  'another user cannot accept the invite'
);

select tests.authenticate_as(:'ratna');
select is(public.accept_invite(:'invite'), :'kigen'::uuid, 'the invitee joins the organization');
select results_eq(
  format('select org_role::text from public.profiles where id = %L', :'ratna'),
  array['member'],
  'with the invited role'
);
select throws_ok(
  format('select public.accept_invite(%L)', :'invite'),
  'P0001', 'already_in_organization',
  'an accepted invite cannot be used again'
);

-- An unconfirmed email cannot claim an invite addressed to it.
select tests.authenticate_as(:'leo');
select public.invite_member('unconfirmed@kigen.example') as invite2 \gset
select tests.authenticate_as(:'unconfirmed');
select throws_ok(
  format('select public.accept_invite(%L)', :'invite2'),
  'P0001', 'invite_not_found',
  'an unconfirmed email cannot accept an invite'
);

-- A suspended organization loses its claims.
select tests.clear_authentication();
update public.organizations set status = 'suspended' where id = :'kigen';
select ok(not tests.claims_for(:'leo') ? 'org_id', 'members of a suspended org get no org_id');
select is(tests.claims_for(:'leo') ->> 'org_status', 'suspended', '... and see why');

select * from finish();
rollback;
