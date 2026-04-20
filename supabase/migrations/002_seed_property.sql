-- Migration 002: Seed the 5090 Durham Rd property
-- Run in Supabase SQL editor.
-- This insert bypasses RLS (running as postgres superuser).

insert into properties (id, name, address)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  '5090 Durham Rd',
  '5090 Durham Rd, Pipersville, PA'
);
