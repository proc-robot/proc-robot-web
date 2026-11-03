-- Local development data (runs on `supabase db reset`, never in hosted
-- projects). The PLAN.md reference scenario: Kigen (Leo = Owner, Ratna =
-- Member), Acme in Indonesia, and one Super Admin.
--
-- Sign in locally with email + password (enabled for local development
-- only; hosted projects use Google and magic links):
--   leo@kigen.test, ratna@kigen.test, budi@acme.test, admin@proc-robot.test
--   password: proc-robot-local
-- Magic-link emails land in Mailpit: http://127.0.0.1:54324

-- ---------------------------------------------------------------------------
-- Users (the on_auth_user_created trigger creates their profiles)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('proc-robot-local', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}', jsonb_build_object('full_name', u.full_name),
  now(), now(), '', '', '', ''
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 'leo@kigen.test', 'Leo Tan'),
  ('a0000000-0000-4000-8000-000000000002'::uuid, 'ratna@kigen.test', 'Ratna Sari'),
  ('a0000000-0000-4000-8000-000000000003'::uuid, 'budi@acme.test', 'Budi Santoso'),
  ('a0000000-0000-4000-8000-000000000099'::uuid, 'admin@proc-robot.test', 'Proc-Robot Admin')
) as u (id, email, full_name);

insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id::text, u.id,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%.test';

-- ---------------------------------------------------------------------------
-- Organizations and membership
-- ---------------------------------------------------------------------------
insert into public.organizations (id, name, slug, country, default_currency, plan_id, email, whatsapp_number, settings)
values
  ('b0000000-0000-4000-8000-000000000001', 'Kigen Pte. Ltd.', 'kigen', 'SG', 'SGD', 'professional',
   'sales@kigen.test', '+6591234567',
   '{"tax_rate": 9, "default_markup_pct": 25, "minimum_margin_pct": 10,
     "numbering": {"sales_quote": "KIGEN-QUO-{YYYY}-{NNNN}", "rfq": "KIGEN-RFQ-{YYYY}-{NNNN}"}}'),
  ('b0000000-0000-4000-8000-000000000002', 'PT Acme Teknik', 'acme', 'ID', 'IDR', 'starter',
   'sales@acme.test', '+6281234567890',
   '{"tax_rate": 11, "default_markup_pct": 20}');

update public.profiles set organization_id = 'b0000000-0000-4000-8000-000000000001', org_role = 'owner'
  where email = 'leo@kigen.test';
update public.profiles set organization_id = 'b0000000-0000-4000-8000-000000000001', org_role = 'member',
       format_locale = 'en-ID', timezone = 'Asia/Jakarta', home_view = 'quotations'
  where email = 'ratna@kigen.test';
update public.profiles set organization_id = 'b0000000-0000-4000-8000-000000000002', org_role = 'owner',
       format_locale = 'en-ID', timezone = 'Asia/Jakarta'
  where email = 'budi@acme.test';
update public.profiles set app_role = 'super_admin'
  where email = 'admin@proc-robot.test';

-- ---------------------------------------------------------------------------
-- Kigen's first project
-- ---------------------------------------------------------------------------
insert into public.customers (id, organization_id, name, contact_name, email)
values ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001',
        'Raffles Tower Management', 'Mei Lin', 'procurement@raffles-tower.test');

insert into public.projects (organization_id, name, customer_id, reference_no, deadline, delivery_country, delivery_city, created_by)
values ('b0000000-0000-4000-8000-000000000001', 'CCTV – Office Tower',
        'c0000000-0000-4000-8000-000000000001', 'RT-2026-114', current_date + 21, 'SG', 'Singapore',
        'a0000000-0000-4000-8000-000000000002');
