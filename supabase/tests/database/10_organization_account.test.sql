-- Organization profile and settings (T1.1.4, T1.1.6), deleting and restoring
-- an organization (T1.1.8), the profile (T1.1.1), exporting and deleting an
-- account (T1.1.3), avatars and logos.
begin;
\ir _helpers.psql
select plan(45);

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

select tests.create_user('leo@kigen.example') as leo \gset
select tests.create_user('ratna@kigen.example') as ratna \gset
select tests.create_org(:'leo', 'Kigen Pte. Ltd.', 'professional') as kigen \gset
select tests.add_member(:'kigen', :'ratna', 'member');
select tests.create_user('budi@acme.example') as budi \gset
select tests.create_org(:'budi', 'Acme') as acme \gset

insert into public.projects (organization_id, name, delivery_country, created_by)
values (:'kigen', 'CCTV', 'SG', :'ratna');

-- ---------------------------------------------------- settings (O5)
select tests.authenticate_as(:'leo');
select lives_ok(
  format($$update public.organizations set settings = %L where id = %L$$,
    '{"tax_rate": 9, "tax_label": "GST", "default_markup_pct": 25, "minimum_margin_pct": 10,
      "numbering": {"sales_quote": "KIGEN-QUO-{YYYY}-{NNNN}", "rfq": "KIGEN-RFQ-{YY}{MM}-{NNN}"},
      "rounding": {"mode": "up", "increment": 100}, "email_signature": "Leo Tan\nKigen"}',
    :'kigen'),
  'the Owner saves valid settings');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"tax_rate": 150}' where id = %L$$, :'kigen')),
  'settings.tax_rate', 'a tax rate above 100% is refused');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"tax_rate": "9"}' where id = %L$$, :'kigen')),
  'settings.tax_rate', 'a tax rate must be a number');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"minimum_margin_pct": 100}' where id = %L$$, :'kigen')),
  'settings.minimum_margin_pct', 'a 100% margin is refused');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"numbering": {"rfq": "RFQ-{YYYY}"}}' where id = %L$$, :'kigen')),
  'settings.numbering.rfq', 'a number format needs a counter ({NNNN})');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"numbering": {"rfq": "RFQ {NNNN}"}}' where id = %L$$, :'kigen')),
  'settings.numbering.rfq', '... and only safe characters');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"rounding": {"mode": "nearest"}}' where id = %L$$, :'kigen')),
  'settings.rounding.increment', 'rounding needs an increment');
select is(tests.error_detail(format(
    $$update public.organizations set settings = '{"markup": 25}' where id = %L$$, :'kigen')),
  'settings.markup', 'unknown settings are refused');
select is(
  (select settings ->> 'default_markup_pct' from public.organizations where id = :'kigen'),
  '25', 'refused updates leave the settings as they were');

select tests.authenticate_as(:'ratna');
select is_empty(
  format($$update public.organizations set settings = '{}' where id = %L returning id$$, :'kigen'),
  'a member cannot change the settings');

-- ---------------------------------------------- public profile (O2)
select tests.authenticate_as(:'leo');
select results_eq(
  format($$update public.organizations
           set whatsapp_number = '+65 9123-4567', email = ' Sales@Kigen.example ',
               website = 'https://kigen.example', category_slugs = '{servers,it,it}', address = '  '
           where id = %L
           returning whatsapp_number || '|' || email || '|' || category_slugs::text || '|' || coalesce(address, 'null')$$,
         :'kigen'),
  array['+6591234567|sales@kigen.example|{it,servers}|null'],
  'contact fields are normalized (E.164, lower-case email, unique categories, blanks to null)');
select is(tests.error_detail(format(
    $$update public.organizations set whatsapp_number = '6591234567' where id = %L$$, :'kigen')),
  'whatsapp_number', 'a WhatsApp number must be in E.164 (+country code)');
select is(tests.error_detail(format(
    $$update public.organizations set website = 'kigen.example' where id = %L$$, :'kigen')),
  'website', 'a website needs http(s)://');
select is(tests.error_detail(format(
    $$update public.organizations set category_slugs = '{it,not-a-category}' where id = %L$$, :'kigen')),
  'category_slugs', 'categories must exist');

select tests.clear_authentication();
select results_eq(
  format($$select metadata -> 'fields' from public.audit_logs
           where organization_id = %L and action = 'organization.updated' order by id$$, :'kigen'),
  array['["settings"]'::jsonb, '["category_slugs", "email", "website", "whatsapp_number"]'::jsonb],
  'edits are logged with the fields that changed, not their values');

-- ------------------------------------------------------ profile (A4)
select tests.authenticate_as(:'ratna');
select results_eq(
  format($$update public.profiles set timezone = 'Asia/Jakarta', full_name = ' Ratna Sari '
           where id = %L returning full_name || '|' || timezone$$, :'ratna'),
  array['Ratna Sari|Asia/Jakarta'], 'a user updates their name and time zone');
select is(tests.error_detail(format(
    $$update public.profiles set timezone = 'Mars/Olympus' where id = %L$$, :'ratna')),
  'timezone', 'an unknown time zone is refused');

-- -------------------------------------------- avatars and logos (storage)
select results_eq(
  format($$insert into storage.objects (bucket_id, name) values ('avatars', %L) returning name$$,
         :'ratna' || '/me.png'),
  array[:'ratna' || '/me.png'], 'a user uploads their own avatar');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('avatars', %L)$$, :'leo' || '/me.png'),
  '42501', null, '... but not into someone else''s folder');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('org-logos', %L)$$, :'kigen' || '/logo.png'),
  '42501', null, 'a member cannot change the org logo');
select tests.authenticate_as(:'leo');
select results_eq(
  format($$insert into storage.objects (bucket_id, name) values ('org-logos', %L) returning name$$,
         :'kigen' || '/logo.png'),
  array[:'kigen' || '/logo.png'], 'the Owner uploads the org logo');

-- ------------------------------------------- deleting the org (O7)
select public.invite_member('pending@kigen.example') as pending_invite \gset

select tests.authenticate_as(:'ratna');
select throws_ok($$select public.delete_organization('Kigen Pte. Ltd.')$$,
  '42501', 'not_allowed', 'a member cannot delete the organization');

select tests.authenticate_as(:'leo');
select throws_ok($$select public.delete_organization('Kigen')$$,
  'P0001', 'confirmation_mismatch', 'the name must be typed exactly');
select lives_ok($$select public.delete_organization(' kigen pte. ltd. ')$$,
  'the Owner deletes the organization (case and spaces ignored)');
select throws_ok($$select public.invite_member('late@kigen.example')$$,
  '42501', 'no_organization', 'a deleted organization cannot invite');

select tests.authenticate_as(:'ratna');
select is_empty('select id from public.projects', 'members lose access at once');
select results_eq(
  $$select name || '|' || status || '|' || (purge_after - deleted_at)::text from public.my_organization_state()$$,
  array['Kigen Pte. Ltd.|deleted|30 days'], 'members see the org is deleted and when it is purged');
select ok(not tests.claims_for(:'ratna') ? 'org_id', 'new tokens carry no organization');

select tests.clear_authentication();
select is_empty(
  format('select id from public.invites where id = %L and revoked_at is null', :'pending_invite'),
  'open invites are revoked');

select tests.authenticate_as(:'ratna');
select throws_ok('select public.restore_organization()',
  '42501', 'not_allowed', 'only the Owner restores');
select tests.authenticate_as(:'leo');
select lives_ok('select public.restore_organization()', 'the Owner restores it within 30 days');
select tests.authenticate_as(:'ratna');
select results_eq('select name from public.projects', array['CCTV'], 'members have their data back');

-- ------------------------------------------------- account (A6)
select tests.authenticate_as(:'ratna');
select results_eq(
  $$select (d -> 'account' ->> 'email') || '|' || (d -> 'organization' ->> 'role') || '|'
           || jsonb_array_length(d -> 'projects_created')
    from public.export_my_data() d$$,
  array['ratna@kigen.example|member|1'], 'a user exports their own data');

select tests.authenticate_as(:'leo');
select throws_ok('select public.delete_my_account()',
  'P0001', 'owner_must_transfer', 'an Owner cannot delete their account while the org is active');

select tests.authenticate_as(:'ratna');
select lives_ok('select public.delete_my_account()', 'a member deletes their account');
select tests.clear_authentication();
select is_empty(format('select id from auth.users where id = %L', :'ratna'), 'the auth user is gone');
select is_empty(format('select id from public.profiles where id = %L', :'ratna'), '... with the profile');
select results_eq(
  format($$select coalesce(created_by::text, 'none') from public.projects where organization_id = %L$$, :'kigen'),
  array['none'], 'the org keeps the project, no longer linked to them');

-- -------------------------------------------- purge after 30 days
select tests.authenticate_as(:'leo');
select public.delete_organization('Kigen Pte. Ltd.');
select tests.clear_authentication();
update public.organizations set deleted_at = now() - interval '31 days' where id = :'kigen';

select tests.authenticate_as(:'leo');
select throws_ok('select public.restore_organization()',
  'P0001', 'organization_not_restorable', 'after 30 days it can no longer be restored');

select tests.clear_authentication();
select ok(private.purge_deleted_organizations() >= 1, 'the daily purge removes it');
select is_empty(format('select id from public.organizations where id = %L', :'kigen'),
  'the organization is gone');
select is_empty(format('select id from public.projects where organization_id = %L', :'kigen'),
  '... with its data');
select results_eq(
  format($$select coalesce(organization_id::text, 'none') from public.profiles where id = %L$$, :'leo'),
  array['none'], 'its members are detached and can start again');
select results_eq(
  format($$select action from public.audit_logs where organization_id = %L
           and action like 'organization.%%' and action <> 'organization.updated' order by id$$, :'kigen'),
  array['organization.deleted', 'organization.restored', 'organization.deleted', 'organization.purged'],
  'the whole lifecycle is in the audit log');
select results_eq(
  format('select count(*)::int from public.organizations where id = %L', :'acme'),
  array[1], 'other organizations are untouched');

select * from finish();
rollback;
