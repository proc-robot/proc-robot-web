-- Credits (TASKS.md T1.10.1–T1.10.4): the monthly plan grant, estimates,
-- reserving plan credits before top-up credits, settling a finished job
-- once, refunds, and who may see the ledger.
begin;
\ir _helpers.psql
select plan(25);

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

create function tests.balance(p_org uuid)
returns text
language sql
as $$
  select plan_credits || '|' || topup_credits from public.credit_balances where organization_id = p_org
$$;

select tests.create_user('leo@kigen.example') as leo \gset
select tests.create_user('ratna@kigen.example') as ratna \gset
select tests.create_org(:'leo', 'Kigen') as kigen \gset
select tests.add_member(:'kigen', :'ratna', 'member');
select tests.create_user('budi@acme.example') as budi \gset
select tests.create_org(:'budi', 'Acme', 'professional') as acme \gset

-- ------------------------------------------------------------- the grant
select is(tests.balance(:'kigen'), '50|0', 'a new Starter org starts with 50 plan credits');
select is(tests.balance(:'acme'), '250|0', '... and a Professional org with 250');
select results_eq(
  format($$select entry || ':' || amount from public.credit_ledger where organization_id = %L$$, :'kigen'),
  array['grant:50'], 'the grant is in the ledger');

-- ------------------------------------------------------------- estimates
select is(public.estimate_credits('extraction_pdf', 12), 6, 'a digital PDF costs 1 credit per 2 pages');
select is(public.estimate_credits('extraction_pdf', 13), 7, '... rounded up');
select is(public.estimate_credits('extraction_pdf', 12, true), 12, 'a scanned PDF costs double');
select is(public.estimate_credits('extraction_sheet', 60), 3, 'a spreadsheet costs 1 credit per 25 rows');
select is(public.estimate_credits('extraction_sheet', 0), 1, 'every action costs at least 1 credit');
select throws_ok($$select public.estimate_credits('teleport', 1)$$, 'P0001', 'unknown_action',
  'an unknown action has no price');

-- ---------------------------------------------------- reserve and settle
select private.post_credits(:'kigen', 'topup', 'topup', 30, null, 'Top-up pack');
select private.enqueue_job(:'kigen', 'ping', '{}', 60) as job1 \gset
select private.reserve_credits(:'kigen', 60, :'job1', 'Test');
select is(tests.balance(:'kigen'), '0|20', 'plan credits are spent before top-up credits');
select is(tests.error_detail(format($$select private.reserve_credits(%L, 21, null, 'Too much')$$, :'kigen')),
  '20', 'reserving more than the balance raises insufficient_credits with what is left');

update public.ai_jobs set status = 'running' where id = :'job1';
update public.ai_jobs set status = 'succeeded', credits_consumed = 45 where id = :'job1';
select is(tests.balance(:'kigen'), '5|30',
  'a finished job keeps what it used and refunds the rest, top-up credits first');
select results_eq(
  format('select credits_consumed || ''|'' || (credits_settled_at is not null) from public.ai_jobs where id = %L', :'job1'),
  array['45|true'], '... and the job records what it used');
select is(private.settle_job_credits(:'job1', 0), null, 'a job is settled only once');

select private.enqueue_job(:'kigen', 'ping', '{}', 10) as job2 \gset
select private.reserve_credits(:'kigen', 10, :'job2', 'Test');
update public.ai_jobs set status = 'failed', error = 'Nothing to read.' where id = :'job2';
select is(tests.balance(:'kigen'), '5|30', 'a failed job refunds everything');

select private.enqueue_job(:'kigen', 'ping', '{}', 4) as job3 \gset
select private.reserve_credits(:'kigen', 4, :'job3', 'Test');
update public.ai_jobs set status = 'succeeded', credits_consumed = 99 where id = :'job3';
select results_eq(format('select credits_consumed from public.ai_jobs where id = %L', :'job3'),
  array[4], 'a job never uses more than it reserved');

-- ------------------------------------------------------ the monthly grant
select is(private.grant_plan_credits(:'kigen'), 50, 'the monthly grant gives the plan''s credits');
select is(tests.balance(:'kigen'), '50|30', '... the old plan credits expire, top-up credits stay');
select results_eq(
  format($$select entry || ':' || amount from public.credit_ledger
           where organization_id = %L and entry in ('expire', 'grant') order by id desc limit 2$$, :'kigen'),
  array['grant:50', 'expire:-1'], 'both steps are in the ledger');

update public.credit_balances set plan_period_start = now() - interval '32 days' where organization_id = :'acme';
select ok(private.grant_due_plan_credits() >= 1, 'the daily job grants every org whose month has ended');
select results_eq(
  format($$select count(*)::int from public.credit_ledger where organization_id = %L and entry = 'grant'$$, :'acme'),
  array[2], '... once');

-- ------------------------------------------------------------------ access
select tests.authenticate_as(:'ratna');
select results_eq('select plan_credits from public.credit_balances', array[50],
  'a member sees their org''s balance only');
select is_empty(format('select id from public.credit_ledger where organization_id = %L', :'acme'),
  '... and not another org''s ledger');
select throws_ok(
  format($$insert into public.credit_ledger (organization_id, bucket, entry, amount, balance_after)
           values (%L, 'topup', 'topup', 1000, 1000)$$, :'kigen'),
  '42501', null, 'members cannot write the ledger');
select throws_ok(format($$select private.reserve_credits(%L, -100, null, 'Free money')$$, :'kigen'),
  '42501', null, 'members cannot call the credit functions');

select * from finish();
rollback;
