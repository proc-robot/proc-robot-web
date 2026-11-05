-- Storage: files live under {org_id}/ and stay inside their org; who may
-- write depends on the bucket (CORE_FEATURES.md §17).
begin;
\ir _helpers.psql
select plan(10);

select tests.create_user('a-owner@a.example') as a_owner \gset
select tests.create_user('a-member@a.example') as a_member \gset
select tests.create_org(:'a_owner', 'Org A', 'professional') as org_a \gset
select tests.add_member(:'org_a', :'a_member');
select tests.create_user('b-owner@b.example') as b_owner \gset
select tests.create_org(:'b_owner', 'Org B', 'professional') as org_b \gset

insert into storage.objects (bucket_id, name) values ('spec-files', :'org_b' || '/boq.pdf');

select tests.authenticate_as(:'a_member');
select results_eq(
  format($$insert into storage.objects (bucket_id, name) values ('spec-files', %L) returning name$$,
         :'org_a' || '/boq.xlsx'),
  array[:'org_a' || '/boq.xlsx'], 'a member uploads a spec file into their org''s folder');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('spec-files', %L)$$, :'org_b' || '/planted.pdf'),
  '42501', null, 'a member cannot upload into another org''s folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('spec-files', 'shared/loose.pdf')$$,
  '42501', null, 'a path without an org folder is rejected');
select is_empty(
  format($$select name from storage.objects where name like %L$$, :'org_b' || '/%'),
  'a member cannot see another org''s files');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('templates', %L)$$, :'org_a' || '/quote.docx'),
  '42501', null, 'a member cannot upload templates (Owner/Admin only)');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('generated-docs', %L)$$, :'org_a' || '/q.pdf'),
  '42501', null, 'generated documents are written by the worker, not users');

select tests.authenticate_as(:'a_owner');
select results_eq(
  format($$insert into storage.objects (bucket_id, name) values ('templates', %L) returning name$$,
         :'org_a' || '/quote.docx'),
  array[:'org_a' || '/quote.docx'], 'the owner uploads a template');
select throws_ok(
  format($$insert into storage.objects (bucket_id, name) values ('generated-docs', %L)$$, :'org_a' || '/q.pdf'),
  '42501', null, 'not even the owner writes generated documents');
-- Storage refuses SQL deletes unless the Storage API sets this flag; set it
-- to test the delete policy the API relies on.
select set_config('storage.allow_delete_query', 'true', true);
select is_empty(
  format($$delete from storage.objects where name = %L returning name$$, :'org_b' || '/boq.pdf'),
  'the owner cannot delete another org''s file');

select tests.clear_authentication();
select results_eq(
  format($$select count(*)::int from storage.objects where name = %L$$, :'org_b' || '/boq.pdf'),
  array[1], 'the other org''s file is intact');

select * from finish();
rollback;
