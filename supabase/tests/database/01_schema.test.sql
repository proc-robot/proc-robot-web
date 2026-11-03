-- Schema-wide guarantees: extensions, RLS everywhere, nothing for anon,
-- queues, buckets, scheduled jobs, Realtime.
begin;
\ir _helpers.psql
select plan(14);

select has_extension('vector', 'pgvector is installed');
select has_extension('pg_trgm', 'pg_trgm is installed');
select has_extension('pgmq', 'pgmq is installed');
select has_extension('pg_cron', 'pg_cron is installed');
select has_extension('pg_net', 'pg_net is installed');
select has_extension('supabase_vault', 'Vault is installed');

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$$,
  'every table in public has RLS enabled'
);

select is_empty(
  $$select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
      and has_table_privilege('anon', c.oid, 'select, insert, update, delete')$$,
  'anon holds no privilege on any public table'
);

select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public' and d.objid is null
      and has_function_privilege('anon', p.oid, 'execute')$$,
  'anon cannot execute any of our public functions'
);

select is_empty(
  $$select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')
      and p.proname not in ('plan_feature', 'object_org_id')$$,
  'authenticated can execute only the private helpers that policies need'
);

select results_eq(
  $$select queue_name::text from pgmq.list_queues() order by 1$$,
  array['analyze_template', 'extract', 'import_price_list', 'ping', 'price_discovery', 'render_document'],
  'the MVP queues exist'
);

select results_eq(
  $$select id || ':' || public::text from storage.buckets order by id$$,
  array['generated-docs:false', 'item-images:true', 'spec-files:false', 'supplier-files:false',
        'templates:false'],
  'the buckets exist; only item-images is public'
);

select results_eq(
  $$select jobname::text from cron.job order by jobname$$,
  array['fx-rates-request', 'fx-rates-store'],
  'the daily FX refresh is scheduled'
);

select ok(
  exists (select 1 from pg_publication_tables
          where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_jobs'),
  'ai_jobs changes are published to Realtime'
);

select * from finish();
rollback;
