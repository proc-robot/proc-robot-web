-- Reference data, platform settings, the FX refresh and job enqueueing.
begin;
\ir _helpers.psql
select plan(15);

select tests.create_user('member@a.example') as member \gset
select tests.create_org(:'member', 'Org A') as org_a \gset
select tests.create_user('staff@proc-robot.example') as staff \gset
update public.profiles set app_role = 'super_admin' where id = :'staff';

-- ------------------------------------------------------------------ plans
select results_eq(
  $$select id || ':' || (limits ->> 'seats') || ':' || coalesce(limits ->> 'active_projects', '∞')
           || ':' || (limits ->> 'monthly_credits') || ':' || price_usd::int
    from public.plans order by sort_order$$,
  array['starter:3:3:50:12', 'professional:10:∞:250:29', 'business:30:∞:1000:89'],
  'the approved plans and limits are in place'
);

-- ------------------------------------------------------------------ units
select is(public.convert_quantity(10, 'ft', 'm'), 3.048::numeric, '10 ft = 3.048 m');
select is(public.convert_quantity(2, 'dozen', 'pcs'), 24::numeric, '2 dozen = 24 pcs');
select is(public.convert_quantity(1, 'roll', 'm'), null, 'a roll has no fixed length');
select is(public.convert_quantity(1, 'kg', 'm'), null, 'different dimensions never convert');

select results_eq(
  $$select p.slug || ':' || count(c.*) from public.categories p
    left join public.categories c on c.parent_id = p.id
    where p.parent_id is null group by p.slug order by p.slug$$,
  array['it:10', 'mechanical-electrical:11'],
  'IT and M&E categories are seeded'
);

-- ------------------------------------------------------- platform settings
select tests.authenticate_as(:'member');
select is_empty(
  $$update public.platform_settings set value = '{}' where key = 'credit_rates' returning key$$,
  'a member cannot change platform settings'
);

select tests.authenticate_as(:'staff');
select results_eq(
  $$update public.platform_settings set value = jsonb_set(value, '{minimum_credits_per_action}', '2')
    where key = 'credit_rates' returning (value ->> 'minimum_credits_per_action')$$,
  array['2'], 'a Super Admin changes a setting'
);
select tests.clear_authentication();
select results_eq(
  format($$select (updated_by = %L)::text || ':' || (select count(*) from public.audit_logs
           where action = 'platform_setting.updated' and target_id = 'credit_rates' and actor_id = %L)
           from public.platform_settings where key = 'credit_rates'$$, :'staff', :'staff'),
  array['true:1'], 'the change records who made it and is audited'
);

-- ---------------------------------------------------------------- FX rates
-- Simulate the HTTP response pg_net would store for the morning request.
-- A date long past, so real rates from a live refresh never mix in.
insert into net._http_response (id, status_code, content_type, content, timed_out)
values (-42, 200, 'application/json',
        '{"amount": 1.0, "base": "USD", "date": "2000-01-03",
          "rates": {"SGD": 1.2812, "IDR": 18137, "EUR": 0.89453}}', false);
insert into private.fx_requests (request_id) values (-42);

select is(private.store_fx_rates(), 4, 'store_fx_rates writes each rate plus USD itself');
select results_eq(
  $$select currency || '=' || per_usd::float8 from public.fx_rates
    where as_of = '2000-01-03' order by currency$$,
  array['EUR=0.89453', 'IDR=18137', 'SGD=1.2812', 'USD=1'],
  'rates are stored per USD for the API''s date'
);
select is_empty('select * from private.fx_requests', 'the handled request is cleared');

-- --------------------------------------------------------------------- jobs
select private.enqueue_job(:'org_a', 'extract', '{"document_id": "doc-1"}', 3) as job \gset
select results_eq(
  format($$select status::text || ':' || credits_reserved || ':' || (msg_id is not null)
           from public.ai_jobs where id = %L$$, :'job'),
  array['queued:3:true'], 'enqueue_job records the job with its reservation and message id'
);
select results_eq(
  $$select (message ->> 'job_id') || '|' || (message ->> 'organization_id') || '|'
           || (message -> 'payload' ->> 'document_id')
    from pgmq.read('extract', 30, 1)$$,
  array[:'job' || '|' || :'org_a' || '|doc-1'],
  'the queue message carries the job, the organization and the payload'
);

select tests.authenticate_as(:'member');
select results_eq(
  'select queue from public.ai_jobs', array['extract'],
  'the org member can watch the job'
);

select * from finish();
rollback;
