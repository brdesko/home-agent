-- Migration 003: Seed Brady and Erin as Owners of 5090 Durham Rd
-- Run in Supabase SQL editor.

insert into property_members (property_id, user_id, role)
values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'e92c19e9-9b8d-4ef7-85f1-c5452810b2b8', 'owner'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'd3ead3ef-3af4-46c9-8c48-0b5dab3ed21e', 'owner');
