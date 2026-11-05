-- Storage buckets and their policies. TASKS.md T0.4.3.
--
-- Every object path starts with the owning organization's id:
-- `{org_id}/…`. The policies compare that first folder with the JWT's
-- org_id. Private buckets are read through signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('spec-files', 'spec-files', false, 30 * 1024 * 1024, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]),
  ('supplier-files', 'supplier-files', false, 30 * 1024 * 1024, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ]),
  -- Macro-enabled formats (.docm, .xlsm) are rejected by type (Q5).
  ('templates', 'templates', false, 10 * 1024 * 1024, array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('generated-docs', 'generated-docs', false, 50 * 1024 * 1024, array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  ('item-images', 'item-images', true, 5 * 1024 * 1024, array[
    'image/jpeg', 'image/png', 'image/webp'
  ])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The organization an object belongs to: its first folder, when that is a
-- UUID; null otherwise (so a malformed path matches no org).
create function private.object_org_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end
$$;

grant execute on function private.object_org_id(text) to authenticated;

-- Read: members read their org's files in every bucket; Super Admins read
-- all (support, downloads). item-images is also public through its CDN URL.
create policy "members read their org's files" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('spec-files', 'supplier-files', 'templates', 'generated-docs', 'item-images')
    and (
      private.object_org_id(name) = (select public.auth_org_id())
      or (select public.is_super_admin())
    )
  );

-- Write, by bucket (CORE_FEATURES.md §17):
-- * spec-files, supplier-files: every member (uploads)
-- * templates, item-images: Owner/Admin
-- * generated-docs: nobody here; the worker writes rendered documents
create policy "members write spec and supplier files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('spec-files', 'supplier-files')
    and private.object_org_id(name) = (select public.auth_org_id())
  );
create policy "members replace spec and supplier files" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('spec-files', 'supplier-files')
    and private.object_org_id(name) = (select public.auth_org_id())
  )
  with check (
    bucket_id in ('spec-files', 'supplier-files')
    and private.object_org_id(name) = (select public.auth_org_id())
  );
create policy "members delete spec and supplier files" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('spec-files', 'supplier-files')
    and private.object_org_id(name) = (select public.auth_org_id())
  );

create policy "owners and admins write templates and item images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('templates', 'item-images')
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  );
create policy "owners and admins replace templates and item images" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('templates', 'item-images')
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  )
  with check (
    bucket_id in ('templates', 'item-images')
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  );
create policy "owners and admins delete templates and item images" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('templates', 'item-images')
    and private.object_org_id(name) = (select public.auth_org_id())
    and (select public.auth_is_org_admin())
  );

-- Nothing in `private` is callable by users unless granted above (see the
-- foundation migration).
revoke execute on all functions in schema private from public;
