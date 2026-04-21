-- Migration 017: Property detail fields
alter table properties
  add column if not exists acreage        numeric(8,2),
  add column if not exists year_built     integer,
  add column if not exists sq_footage     integer,
  add column if not exists lot_size       text,
  add column if not exists heat_type      text,
  add column if not exists well_septic    text,
  add column if not exists details_notes  text;
