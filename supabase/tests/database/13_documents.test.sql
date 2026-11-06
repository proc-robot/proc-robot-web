-- Documents (TASKS.md T1.3.1–T1.3.3, T1.3.13): registering an upload,
-- the credit estimate, extraction with reserved credits, failure and retry,
-- deleting, and who sees documents, item lists and items.
begin;
\ir _helpers.psql
select plan(31);

create function tests.balance(p_org uuid)
returns text
language sql
as $$
  select plan_credits || '|' || topup_credits from public.credit_balances where organization_id = p_org
$$;

-- Kigen (Starter: 50 credits) with Ratna; Acme next door.
select tests.create_user('leo@kigen.example') as leo \gset
select tests.create_user('ratna@kigen.example') as ratna \gset
select tests.create_org(:'leo', 'Kigen') as kigen \gset
select tests.add_member(:'kigen', :'ratna', 'member');
select tests.create_user('budi@acme.example') as budi \gset
select tests.create_org(:'budi', 'Acme') as acme \gset

insert into public.projects (organization_id, name, delivery_country)
values (:'kigen', 'CCTV', 'SG') returning id as cctv \gset
insert into public.projects (organization_id, name, delivery_country, status)
values (:'kigen', 'Old tender', 'SG', 'archived') returning id as old \gset

-- What the browser uploaded (as Storage records it).
insert into storage.objects (bucket_id, name, metadata) values
  ('spec-files', :'kigen' || '/' || :'cctv' || '/boq.xlsx', '{"size": 2048}'),
  ('spec-files', :'kigen' || '/' || :'cctv' || '/specs.pdf', '{"size": 4096}'),
  ('spec-files', :'kigen' || '/' || :'cctv' || '/big.csv', '{"size": 8192}'),
  ('spec-files', :'kigen' || '/' || :'cctv' || '/notes.docx', '{"size": 100}'),
  ('spec-files', :'kigen' || '/' || :'old' || '/boq.xlsx', '{"size": 100}');

-- ------------------------------------------------------------ registering
select tests.authenticate_as(:'ratna');
select public.register_document(:'cctv', :'kigen' || '/' || :'cctv' || '/boq.xlsx', ' BOQ Tower.xlsx ')
  as boq \gset
select results_eq(
  format($$select file_name || '|' || file_type || '|' || file_size || '|' || status
           from public.documents_in where id = %L$$, :'boq'),
  array['BOQ Tower.xlsx|xlsx|2048|uploaded'],
  'a member registers an upload; the size comes from Storage');
select results_eq(
  format($$select j.queue || '|' || j.credits_reserved from public.documents_in d
           join public.ai_jobs j on j.id = d.job_id where d.id = %L$$, :'boq'),
  array['inspect_document|0'], '... and a free inspection job is queued');

select throws_ok(
  format($$select public.register_document(%L, %L, 'notes.docx')$$, :'cctv',
         :'kigen' || '/' || :'cctv' || '/notes.docx'),
  'P0001', 'unsupported_file', 'only Excel, CSV and PDF files are accepted');
select throws_ok(
  format($$select public.register_document(%L, %L, 'boq.xlsx')$$, :'cctv', :'acme' || '/x/boq.xlsx'),
  'P0001', 'invalid_file', 'the file must sit in the project''s own folder');
select throws_ok(
  format($$select public.register_document(%L, %L, 'gone.xlsx')$$, :'cctv',
         :'kigen' || '/' || :'cctv' || '/gone.xlsx'),
  'P0001', 'file_not_found', 'the file must have been uploaded');
select throws_ok(
  format($$select public.register_document(%L, %L, 'boq.xlsx')$$, :'old',
         :'kigen' || '/' || :'old' || '/boq.xlsx'),
  'P0001', 'project_archived', 'an archived project takes no uploads');
select throws_ok(
  format($$select public.register_document(%L, %L, 'again.xlsx')$$, :'cctv',
         :'kigen' || '/' || :'cctv' || '/boq.xlsx'),
  'P0001', 'invalid_file', 'a file is registered once');
select results_eq(
  $$select metadata ->> 'name' || ' → ' || (metadata ->> 'project') from public.org_activity(5)
    where action = 'document.uploaded'$$,
  array['BOQ Tower.xlsx → CCTV'], 'the upload is in the activity feed');

select tests.authenticate_as(:'budi');
select throws_ok(
  format($$select public.register_document(%L, %L, 'boq.xlsx')$$, :'cctv',
         :'kigen' || '/' || :'cctv' || '/boq.xlsx'),
  'P0001', 'project_not_found', 'another org cannot upload to the project');

-- ---------------------------------------------- inspection and estimates
select tests.authenticate_as(:'ratna');
select public.register_document(:'cctv', :'kigen' || '/' || :'cctv' || '/specs.pdf', 'specs.pdf') as pdf \gset
select public.register_document(:'cctv', :'kigen' || '/' || :'cctv' || '/big.csv', 'big.csv') as big \gset

-- The worker's inspection records what it measured.
select tests.clear_authentication();
update public.documents_in set row_count = 60, status = 'ready' where id = :'boq';
update public.documents_in set page_count = 12, scanned = true, status = 'ready' where id = :'pdf';
update public.documents_in set row_count = 2000, status = 'ready' where id = :'big';
select results_eq(
  format($$select file_type || ':' || estimated_credits from public.documents_in
           where id in (%L, %L, %L) order by file_type$$, :'boq', :'pdf', :'big'),
  array['csv:80', 'pdf:12', 'xlsx:3'],
  'the estimate follows the pages or rows (a scanned PDF costs double)');

-- -------------------------------------------------------------- extracting
select tests.authenticate_as(:'ratna');
select public.extract_document(:'boq') as job \gset
select results_eq(
  format($$select d.status || '|' || j.queue || '|' || j.credits_reserved from public.documents_in d
           join public.ai_jobs j on j.id = d.job_id where d.id = %L$$, :'boq'),
  array['extracting|extract|3'], 'extracting reserves the estimate and queues the job');
select is(tests.balance(:'kigen'), '47|0', '... the credits are held');
select throws_ok(format('select public.extract_document(%L)', :'boq'),
  'P0001', 'document_not_ready', 'a document is extracted once at a time');
select throws_ok(format('select public.delete_document(%L)', :'boq'),
  'P0001', 'document_busy', 'a document cannot be deleted while it is being read');

select throws_ok(format('select public.extract_document(%L)', :'big'),
  'P0001', 'insufficient_credits', 'an extraction needs enough credits');
select is_empty(
  format($$select id from public.ai_jobs where queue = 'extract' and payload ->> 'document_id' = %L$$, :'big'),
  '... and then nothing is queued');

-- The worker fails it for a reason the member can act on.
select tests.clear_authentication();
update public.ai_jobs set status = 'failed', error = 'No items were found in this file.' where id = :'job';
select results_eq(
  format($$select status || '|' || error from public.documents_in where id = %L$$, :'boq'),
  array['failed|No items were found in this file.'], 'a failed job marks the document failed, with the reason');
select is(tests.balance(:'kigen'), '50|0', '... and refunds the credits');

select tests.authenticate_as(:'ratna');
select is(public.retry_document(:'boq'), null, 'retrying a measured document needs no new inspection');
select results_eq(format('select status::text from public.documents_in where id = %L', :'boq'),
  array['ready'], '... it is ready again, showing its estimate');
select public.extract_document(:'boq') as job2 \gset

-- The worker succeeds: it writes the item list and marks the document.
select tests.clear_authentication();
insert into public.item_lists (organization_id, project_id, document_id, title)
values (:'kigen', :'cctv', :'boq', 'CCTV for the office tower') returning id as list \gset
insert into public.list_items (organization_id, item_list_id, position, name, quantity, unit, unit_code)
values (:'kigen', :'list', 0, 'Dome camera 4 MP', 24, 'unit', 'pcs');
update public.documents_in set status = 'extracted' where id = :'boq';
update public.ai_jobs set status = 'succeeded', credits_consumed = 3 where id = :'job2';
select is(tests.balance(:'kigen'), '47|0', 'a successful extraction keeps the credits it used');

-- A failed inspection is inspected again.
update public.ai_jobs set status = 'failed', error = 'This file could not be opened.'
where id = (select job_id from public.documents_in where id = :'pdf');
update public.documents_in set status = 'uploaded', page_count = null, scanned = null,
  estimated_credits = null where id = :'pdf';
update public.documents_in set status = 'failed' where id = :'pdf';
select tests.authenticate_as(:'ratna');
select ok(public.retry_document(:'pdf') is not null, 'retrying an unmeasured document inspects it again');
select results_eq(format('select status::text from public.documents_in where id = %L', :'pdf'),
  array['uploaded'], '... and it waits for the inspection');

-- ------------------------------------------------------------------- access
select results_eq(
  format($$select l.title || '|' || i.name || '|' || i.quantity::int || ' ' || i.unit_code
           from public.item_lists l join public.list_items i on i.item_list_id = l.id
           where l.document_id = %L$$, :'boq'),
  array['CCTV for the office tower|Dome camera 4 MP|24 pcs'], 'members read the extracted items');
select throws_ok(format($$update public.documents_in set status = 'extracted' where id = %L$$, :'pdf'),
  '42501', null, 'members cannot change a document directly');
select throws_ok(
  format($$insert into public.item_lists (project_id, title) values (%L, 'Planted')$$, :'cctv'),
  '42501', null, '... nor write item lists yet (the review screen, T1.3.10)');

select tests.authenticate_as(:'budi');
select is_empty('select id from public.documents_in', 'another org sees no documents');
select is_empty('select id from public.item_lists', '... no item lists');
select is_empty('select id from public.list_items', '... and no items');

-- ----------------------------------------------------------------- deleting
select tests.authenticate_as(:'ratna');
select is(public.delete_document(:'big'), :'kigen' || '/' || :'cctv' || '/big.csv',
  'deleting returns the file''s path, for the app to remove it from Storage');
select tests.clear_authentication();
update public.item_lists set status = 'confirmed' where id = :'list';
select tests.authenticate_as(:'ratna');
select public.delete_document(:'boq');
select results_eq(format('select coalesce(document_id::text, ''none'') from public.item_lists where id = %L', :'list'),
  array['none'], 'a confirmed item list outlives its document');

select * from finish();
rollback;
