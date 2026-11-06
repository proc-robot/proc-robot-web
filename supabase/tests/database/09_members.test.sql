-- Members (TASKS.md T1.1.5): invites, revoking, roles, removal, leaving,
-- transferring ownership, and access that ends at once (not when the token
-- expires). Also the activity feed (T1.1.7).
begin;
\ir _helpers.psql
select plan(34);

select tests.create_user('leo@kigen.example') as leo \gset
select tests.create_user('anna@kigen.example') as anna \gset
select tests.create_user('ratna@kigen.example') as ratna \gset
select tests.create_org(:'leo', 'Kigen') as kigen \gset
select tests.add_member(:'kigen', :'anna', 'admin');
select tests.add_member(:'kigen', :'ratna', 'member');

select tests.create_user('budi@acme.example') as budi \gset
select tests.create_org(:'budi', 'Acme') as acme \gset

insert into public.projects (organization_id, name, delivery_country)
values (:'kigen', 'CCTV', 'SG');

-- ------------------------------------------------------------------ invites
-- Kigen is on Starter (3 seats) and already has 3 members.
select tests.authenticate_as(:'anna');
select throws_ok($$select public.invite_member('new@kigen.example')$$,
  'P0001', 'plan_limit_reached', 'a full Starter org cannot invite (the seat limit)');

select tests.clear_authentication();
update public.organizations set plan_id = 'professional' where id = :'kigen';
select tests.authenticate_as(:'anna');
select public.invite_member('new@kigen.example') as invite \gset
select ok(:'invite' is not null, 'an Admin invites once there is a seat');

select tests.authenticate_as(:'budi');
select public.invite_member('someone@acme.example') as acme_invite \gset
select throws_ok(format('select public.revoke_invite(%L)', :'invite'),
  'P0001', 'invite_not_found', 'another org cannot revoke the invite');

select tests.authenticate_as(:'ratna');
select throws_ok(format('select public.revoke_invite(%L)', :'invite'),
  '42501', 'not_allowed', 'a member cannot revoke an invite');

select tests.authenticate_as(:'anna');
select lives_ok(format('select public.revoke_invite(%L)', :'invite'), 'an Admin revokes the invite');
select throws_ok(format('select public.revoke_invite(%L)', :'invite'),
  'P0001', 'invite_not_found', 'a revoked invite cannot be revoked again');
select throws_ok(format('select public.revoke_invite(%L)', :'acme_invite'),
  'P0001', 'invite_not_found', '... nor can another org''s invite');

select tests.authenticate_as(:'leo');
select is_empty(
  format('select id from public.invites where id = %L and revoked_at is null', :'invite'),
  'the invite is revoked');

-- -------------------------------------------------------------------- roles
select tests.authenticate_as(:'ratna');
select throws_ok(format($$select public.change_member_role(%L, 'admin')$$, :'ratna'),
  '42501', 'not_allowed', 'a member cannot change roles');

select tests.authenticate_as(:'anna');
select throws_ok(format($$select public.change_member_role(%L, 'member')$$, :'anna'),
  '42501', 'not_allowed', 'nobody changes their own role');
select throws_ok(format($$select public.change_member_role(%L, 'member')$$, :'leo'),
  '42501', 'not_allowed', 'the Owner''s role cannot be changed');
select throws_ok(format($$select public.change_member_role(%L, 'owner')$$, :'ratna'),
  'P0001', 'invalid_role', 'nobody is made Owner except by a transfer');
select throws_ok(format($$select public.change_member_role(%L, 'admin')$$, :'budi'),
  'P0001', 'member_not_found', 'only members of the same org can be changed');
select lives_ok(format($$select public.change_member_role(%L, 'admin')$$, :'ratna'),
  'an Admin makes a member an Admin');
select results_eq(format('select org_role::text from public.profiles where id = %L', :'ratna'),
  array['admin'], 'the role is changed');

-- A demoted Admin loses Admin rights at once, even with the old token.
select tests.claims_for(:'ratna') as ratna_admin_claims \gset
select lives_ok(format($$select public.change_member_role(%L, 'member')$$, :'ratna'),
  '... and back to member');
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', :'ratna_admin_claims', true);
select set_config('role', 'authenticated', true);
select is(public.auth_is_org_admin(), false, 'the old token''s admin role is no longer honored');

-- ------------------------------------------------------------------ removal
select tests.clear_authentication();
insert into auth.sessions (id, user_id) values (gen_random_uuid(), :'ratna');
select tests.claims_for(:'ratna') as ratna_claims \gset

select tests.authenticate_as(:'anna');
select throws_ok(format('select public.remove_member(%L)', :'leo'),
  '42501', 'not_allowed', 'the Owner cannot be removed');
select throws_ok(format('select public.remove_member(%L)', :'anna'),
  '42501', 'not_allowed', 'nobody removes themselves (they leave)');
select lives_ok(format('select public.remove_member(%L)', :'ratna'), 'an Admin removes a member');

select tests.clear_authentication();
select results_eq(
  format('select coalesce(organization_id::text, ''none'') from public.profiles where id = %L', :'ratna'),
  array['none'], 'the removed member has no organization');
select is_empty(format('select id from auth.sessions where user_id = %L', :'ratna'),
  '... and is signed out everywhere');

-- Their access ends at once, although their token still names the org.
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', :'ratna_claims', true);
select set_config('role', 'authenticated', true);
select is(public.auth_org_id(), null, 'the old token no longer grants the organization');
select is_empty('select id from public.projects', '... so the removed member sees no projects');

-- ------------------------------------------------------- leaving and owners
select tests.authenticate_as(:'leo');
select throws_ok('select public.leave_organization()',
  'P0001', 'owner_must_transfer', 'the Owner cannot leave without transferring');

select tests.authenticate_as(:'anna');
select throws_ok(format('select public.transfer_ownership(%L)', :'anna'),
  '42501', 'not_allowed', 'an Admin cannot transfer ownership');

select tests.authenticate_as(:'leo');
select lives_ok(format('select public.transfer_ownership(%L)', :'anna'),
  'the Owner transfers ownership to an Admin');
select results_eq(
  format($$select email || ':' || org_role from public.profiles where organization_id = %L order by email$$,
         :'kigen'),
  array['anna@kigen.example:owner', 'leo@kigen.example:admin'],
  'the new Owner is set and the old one becomes an Admin');

select lives_ok('select public.leave_organization()', 'the former Owner can now leave');
select tests.clear_authentication();
select results_eq(
  format($$select count(*)::int from public.profiles where organization_id = %L$$, :'kigen'),
  array[1], 'only the new Owner is left');

-- ----------------------------------------------------------- activity feed
select tests.authenticate_as(:'anna');
select results_eq(
  $$select action from public.org_activity(50) order by id$$,
  array['member.invited', 'member.invite_revoked', 'member.role_changed', 'member.role_changed',
        'member.removed', 'organization.ownership_transferred', 'member.left'],
  'the activity feed lists the org''s membership changes in order');
select results_eq(
  $$select actor_name from public.org_activity(1)$$,
  array['Leo'], '... with who did them');

select tests.authenticate_as(:'budi');
select results_eq(
  $$select action from public.org_activity(50)$$,
  array['member.invited'], 'another org sees only its own activity');

select tests.authenticate_as(:'ratna');
select is_empty('select * from public.org_activity()', 'a user without an organization sees none');

select * from finish();
rollback;
