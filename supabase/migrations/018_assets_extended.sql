-- Migration 018: Extended asset fields
alter table assets
  add column if not exists make              text,
  add column if not exists model             text,
  add column if not exists serial_number     text,
  add column if not exists install_date      date,
  add column if not exists last_serviced_at  date,
  add column if not exists location          text,
  add column if not exists notes             text;
