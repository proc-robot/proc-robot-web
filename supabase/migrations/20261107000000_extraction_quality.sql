-- Extraction quality (TASKS.md T1.3.6, T1.3.8, T1.3.9), from reading real BOQs:
--   * BOQs group their lines under headings ("B. Peralatan dan Instalasi CCTV",
--     "I. Lantai-1 & Site"). An item keeps the headings it sits under, so the
--     same camera on three floors is three lines of one list, not duplicates,
--     and the quotation can follow the customer's layout.
--   * Installation lines are counted in points ("ttk", "titik").
--
-- The column is nullable and the existing grants are table-wide, so the worker
-- already running (which doesn't write it) keeps working.

-- The headings an item sits under, outermost first, joined with " › ":
-- "B. Peralatan dan Instalasi CCTV › I. Lantai-1 & Site". Null when the
-- document has none.
alter table public.list_items
  add column section text check (length(btrim(section)) between 1 and 300);

comment on column public.list_items.section is
  'The document headings the item sits under, outermost first, joined with " › "; null when none.';

-- A point (titik) is an installation point: it counts, but never converts to pieces.
insert into public.units (code, name, dimension, to_base, aliases, sort_order) values
  ('point', 'Point', 'count', null, '{points,titik,ttk}', 4);
