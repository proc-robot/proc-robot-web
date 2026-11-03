-- Platform reference data: plans, platform settings, units, categories and
-- FX rates. TASKS.md T0.2.5, T0.2.6, T0.2.8, T0.2.9.
--
-- Rows the app needs in every environment are inserted here, not in
-- seed.sql (which only runs locally). The Super Admin edits them later.

-- ---------------------------------------------------------------------------
-- Plans (PLAN.md → Plans; CORE_FEATURES.md §14). A null limit = unlimited.
-- ---------------------------------------------------------------------------
create table public.plans (
  id text primary key check (id ~ '^[a-z_]+$'),
  name text not null,
  price_usd numeric(10, 2) not null check (price_usd >= 0),
  -- seats, active_projects, monthly_credits
  limits jsonb not null,
  -- custom_templates, online_discovery, price_network, org_audit_trail,
  -- priority_support, advanced_supplier_intel
  features jsonb not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_updated_at before update on public.plans
  for each row execute function private.set_updated_at();

alter table public.plans enable row level security;
revoke all on table public.plans from anon, authenticated;
grant select on table public.plans to authenticated;

create policy "signed-in users read plans" on public.plans
  for select to authenticated using (true);

insert into public.plans (id, name, price_usd, limits, features, sort_order) values
  ('starter', 'Starter', 12,
   '{"seats": 3, "active_projects": 3, "monthly_credits": 50}',
   '{"custom_templates": false, "online_discovery": false, "price_network": false,
     "org_audit_trail": false, "priority_support": false, "advanced_supplier_intel": false}',
   1),
  ('professional', 'Professional', 29,
   '{"seats": 10, "active_projects": null, "monthly_credits": 250}',
   '{"custom_templates": true, "online_discovery": true, "price_network": true,
     "org_audit_trail": false, "priority_support": false, "advanced_supplier_intel": false}',
   2),
  ('business', 'Business', 89,
   '{"seats": 30, "active_projects": null, "monthly_credits": 1000}',
   '{"custom_templates": true, "online_discovery": true, "price_network": true,
     "org_audit_trail": true, "priority_support": true, "advanced_supplier_intel": true}',
   3);

-- ---------------------------------------------------------------------------
-- Platform settings: one JSON value per key, editable by the Super Admin.
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  description text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function private.set_updated_at();

alter table public.platform_settings enable row level security;
revoke all on table public.platform_settings from anon, authenticated;
grant select on table public.platform_settings to authenticated;
grant update (value, description) on table public.platform_settings to authenticated;

create policy "signed-in users read platform settings" on public.platform_settings
  for select to authenticated using (true);
create policy "super admins update platform settings" on public.platform_settings
  for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create function private.audit_platform_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_by := auth.uid();
  perform private.audit('platform_setting.updated', null, 'platform_setting', new.key,
    jsonb_build_object('old', old.value, 'new', new.value));
  return new;
end;
$$;

create trigger platform_settings_audit before update on public.platform_settings
  for each row execute function private.audit_platform_setting();

-- Starting values. Credit rates and anonymity rules are approved
-- (CORE_FEATURES.md §14, §19); the rest are defaults to tune in the pilot.
insert into public.platform_settings (key, value, description) values
  ('credit_rates',
   '{"extraction_pdf_pages_per_credit": 2, "extraction_rows_per_credit": 25,
     "extraction_scanned_multiplier": 2, "online_search_credits_per_item_country": 1,
     "rfq_reply_pages_per_credit": 5, "minimum_credits_per_action": 1}',
   'Credits charged per action. Partial units round up; every action costs at least the minimum.'),
  ('price_network_anonymity',
   '{"min_orgs": 5, "min_prices": 8, "max_single_org_share": 0.5, "window_days": 90}',
   'When an anonymous benchmark may be shown (P3): enough orgs and prices, no dominant org, rolling window.'),
  ('price_freshness',
   '{"recent_days": 30, "historical_days": 180}',
   'Price status aging: Recent up to recent_days old, Historical up to historical_days, then Expired (or when past valid_until).'),
  ('upload_limits',
   '{"max_file_mb": 30, "max_files_per_upload": 10}',
   'Spec and supplier file uploads. The storage buckets enforce the same size as a hard limit.'),
  ('marketplace_moderation',
   '{"review_first_items": 5}',
   'How many saleable items of a new (unverified) org go to the review queue before publishing directly.'),
  ('fx',
   '{"base": "USD", "source": "frankfurter", "url": "https://api.frankfurter.dev/v1/latest?base=USD"}',
   'Daily exchange rates: ECB reference rates through the Frankfurter API (no key needed).');

-- ---------------------------------------------------------------------------
-- Units. `to_base` converts within a dimension (base units: pcs, m, m2, l,
-- kg, h). Packaging units (roll, box, set, lot) have no fixed size, so their
-- `to_base` is null and they never convert. `aliases` are lower-case
-- spellings seen in BOQs, used to normalize extracted units (T1.3.9).
-- ---------------------------------------------------------------------------
create table public.units (
  code text primary key check (code ~ '^[a-z0-9]+$'),
  name text not null,
  dimension text not null
    check (dimension in ('count', 'length', 'area', 'volume', 'mass', 'time', 'package', 'lump_sum')),
  to_base numeric check (to_base > 0),
  aliases text[] not null default '{}',
  sort_order integer not null default 0,
  constraint package_units_do_not_convert
    check (dimension not in ('package', 'lump_sum') or to_base is null)
);

alter table public.units enable row level security;
revoke all on table public.units from anon, authenticated;
grant select on table public.units to authenticated;
create policy "signed-in users read units" on public.units
  for select to authenticated using (true);

insert into public.units (code, name, dimension, to_base, aliases, sort_order) values
  ('pcs',   'Pieces',      'count',    1,          '{pc,piece,pieces,ea,each,nos,no,unit,units,buah,bh,biji}', 1),
  ('pair',  'Pair',        'count',    2,          '{pr,pairs,pasang}', 2),
  ('dozen', 'Dozen',       'count',    12,         '{dz,doz,lusin}', 3),
  ('m',     'Metre',       'length',   1,          '{meter,meters,metre,metres,mtr,mtrs}', 10),
  ('cm',    'Centimetre',  'length',   0.01,       '{centimeter,centimetre}', 11),
  ('mm',    'Millimetre',  'length',   0.001,      '{millimeter,millimetre}', 12),
  ('km',    'Kilometre',   'length',   1000,       '{kilometer,kilometre}', 13),
  ('ft',    'Foot',        'length',   0.3048,     '{feet,foot}', 14),
  ('in',    'Inch',        'length',   0.0254,     '{inch,inches}', 15),
  ('m2',    'Square metre','area',     1,          '{m²,sqm,sq m,meter persegi}', 20),
  ('ft2',   'Square foot', 'area',     0.09290304, '{sqft,sq ft,ft²}', 21),
  ('l',     'Litre',       'volume',   1,          '{liter,litre,liters,litres,ltr,lt}', 30),
  ('ml',    'Millilitre',  'volume',   0.001,      '{milliliter,millilitre}', 31),
  ('m3',    'Cubic metre', 'volume',   1000,       '{m³,cbm,kubik}', 32),
  ('kg',    'Kilogram',    'mass',     1,          '{kgs,kilogram,kilo}', 40),
  ('g',     'Gram',        'mass',     0.001,      '{gr,gram,grams}', 41),
  ('t',     'Tonne',       'mass',     1000,       '{ton,tons,tonne,tonnes}', 42),
  ('h',     'Hour',        'time',     1,          '{hr,hrs,hour,hours,jam}', 50),
  ('day',   'Day',         'time',     24,         '{days,hari}', 51),
  ('month', 'Month',       'time',     null,       '{months,mo,bulan,bln}', 52),
  ('year',  'Year',        'time',     null,       '{years,yr,tahun,thn}', 53),
  ('roll',  'Roll',        'package',  null,       '{rol,rolls}', 60),
  ('box',   'Box',         'package',  null,       '{bx,boxes,kotak,dus}', 61),
  ('set',   'Set',         'package',  null,       '{sets,unit set}', 62),
  ('pack',  'Pack',        'package',  null,       '{pk,pkt,packs,pak}', 63),
  ('lot',   'Lot',         'package',  null,       '{lots}', 64),
  ('reel',  'Reel',        'package',  null,       '{reels,haspel}', 65),
  ('drum',  'Drum',        'package',  null,       '{drums}', 66),
  ('carton','Carton',      'package',  null,       '{ctn,ctns,cartons}', 67),
  ('ls',    'Lump sum',    'lump_sum', null,       '{lump sum,lumpsum,l.s.,l/s}', 70),
  ('job',   'Job',         'lump_sum', null,       '{jobs,pekerjaan}', 71);

-- Converts a quantity between two units of the same dimension; null when
-- they cannot convert (different dimensions, or a packaging unit).
create function public.convert_quantity(p_quantity numeric, p_from text, p_to text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select p_quantity * f.to_base / t.to_base
  from public.units f
  join public.units t on t.dimension = f.dimension
  where f.code = p_from and t.code = p_to
    and f.to_base is not null and t.to_base is not null
$$;

revoke execute on function public.convert_quantity(numeric, text, text) from public, anon;
grant execute on function public.convert_quantity(numeric, text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Categories (two levels to start; the Super Admin manages them, T1.12.6).
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  parent_id uuid references public.categories (id) on delete restrict,
  sort_order integer not null default 0
);

create index categories_parent_idx on public.categories (parent_id);

alter table public.categories enable row level security;
revoke all on table public.categories from anon, authenticated;
grant select on table public.categories to authenticated;
create policy "signed-in users read categories" on public.categories
  for select to authenticated using (true);

insert into public.categories (slug, name, sort_order) values
  ('it', 'IT & systems integration', 1),
  ('mechanical-electrical', 'Mechanical & electrical (M&E)', 2);

insert into public.categories (slug, name, parent_id, sort_order)
select c.slug, c.name, p.id, c.sort_order
from (values
  ('it', 'computers', 'Computers & laptops', 1),
  ('it', 'servers', 'Servers', 2),
  ('it', 'storage-backup', 'Storage & backup', 3),
  ('it', 'networking', 'Networking (switches, routers, Wi-Fi)', 4),
  ('it', 'cctv-access-control', 'CCTV & access control', 5),
  ('it', 'structured-cabling', 'Structured cabling', 6),
  ('it', 'ups-power', 'UPS & power', 7),
  ('it', 'peripherals-displays', 'Peripherals & displays', 8),
  ('it', 'software-licences', 'Software & licences', 9),
  ('it', 'it-services', 'IT installation & services', 10),
  ('mechanical-electrical', 'cables-wires', 'Cables & wires', 1),
  ('mechanical-electrical', 'cable-management', 'Cable trays, conduits & trunking', 2),
  ('mechanical-electrical', 'switchgear', 'Switchgear & distribution boards', 3),
  ('mechanical-electrical', 'lighting', 'Lighting', 4),
  ('mechanical-electrical', 'hvac', 'HVAC', 5),
  ('mechanical-electrical', 'plumbing-sanitary', 'Plumbing & sanitary', 6),
  ('mechanical-electrical', 'fire-protection', 'Fire protection & sprinklers', 7),
  ('mechanical-electrical', 'fire-alarm', 'Fire alarm', 8),
  ('mechanical-electrical', 'generators', 'Generators', 9),
  ('mechanical-electrical', 'elv-bms', 'ELV & building management', 10),
  ('mechanical-electrical', 'me-services', 'M&E installation & services', 11)
) as c (parent_slug, slug, name, sort_order)
join public.categories p on p.slug = c.parent_slug;

-- ---------------------------------------------------------------------------
-- FX rates: units of `currency` per 1 USD, one row per day and currency.
-- Convert A → B with per_usd(B) / per_usd(A). The original price is always
-- kept; conversion is for display and comparison only (P6).
-- ---------------------------------------------------------------------------
create table public.fx_rates (
  as_of date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  per_usd numeric(20, 8) not null check (per_usd > 0),
  source text not null,
  fetched_at timestamptz not null default now(),
  primary key (as_of, currency)
);

alter table public.fx_rates enable row level security;
revoke all on table public.fx_rates from anon, authenticated;
grant select on table public.fx_rates to authenticated;
create policy "signed-in users read fx rates" on public.fx_rates
  for select to authenticated using (true);

-- Daily refresh in two steps, because pg_net is asynchronous: the request
-- goes out first, and the response is read a few minutes later.
create table private.fx_requests (
  request_id bigint primary key,
  requested_at timestamptz not null default now()
);

create function private.request_fx_rates()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := (select value ->> 'url' from public.platform_settings where key = 'fx');
  v_request_id bigint;
begin
  select net.http_get(url := v_url, timeout_milliseconds := 15000) into v_request_id;
  insert into private.fx_requests (request_id) values (v_request_id);
  return v_request_id;
end;
$$;

-- Stores every successful pending response; returns how many rates were
-- written. Responses that failed are dropped with a warning (the next day's
-- run tries again; the previous day's rates stay usable meanwhile).
create function private.store_fx_rates()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pending record;
  v_body jsonb;
  v_as_of date;
  v_source text := coalesce((select value ->> 'source' from public.platform_settings where key = 'fx'), 'unknown');
  v_count integer := 0;
  v_rows integer;
begin
  for v_pending in
    select r.request_id, resp.status_code, resp.content, resp.error_msg
    from private.fx_requests r
    left join net._http_response resp on resp.id = r.request_id
    order by r.request_id
  loop
    if v_pending.status_code is null and v_pending.error_msg is null then
      continue;  -- still in flight
    end if;

    if v_pending.status_code = 200 then
      v_body := v_pending.content::jsonb;
      v_as_of := (v_body ->> 'date')::date;

      insert into public.fx_rates (as_of, currency, per_usd, source)
      select v_as_of, r.key, r.value::numeric, v_source
      from jsonb_each_text(v_body -> 'rates') as r
      where r.key ~ '^[A-Z]{3}$'
      union all
      select v_as_of, 'USD', 1, v_source
      on conflict (as_of, currency) do update
        set per_usd = excluded.per_usd, source = excluded.source, fetched_at = now();

      get diagnostics v_rows = row_count;
      v_count := v_count + v_rows;
    else
      raise warning 'FX refresh failed (request %): status %, %',
        v_pending.request_id, v_pending.status_code, v_pending.error_msg;
    end if;

    delete from private.fx_requests where request_id = v_pending.request_id;
  end loop;

  -- A request whose response pg_net already purged will never resolve.
  delete from private.fx_requests where requested_at < now() - interval '1 day';
  return v_count;
end;
$$;

-- ECB publishes around 16:00 CET on working days.
select cron.schedule('fx-rates-request', '0 17 * * *', 'select private.request_fx_rates()');
select cron.schedule('fx-rates-store', '10 17 * * *', 'select private.store_fx_rates()');

-- Nothing in `private` is callable by users unless granted above (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
