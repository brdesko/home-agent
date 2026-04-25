-- Migration 028: Lattice entity — personal container, 1:1 with a user
--
-- A Lattice is the top-level unit in the system. Each user owns exactly one.
-- It is private to its owner — no shared access at the Lattice level.
-- Parcel (properties + property_members) handles collaborative access within a domain.
--
-- Changes:
--   1. New table: lattices (owner_id unique — enforces 1:1 with user)
--   2. New column: properties.lattice_id FK (nullable for backward compatibility)
--   3. Enum rename: member_role.viewer → member_role.member
--      Both owner and member have full edit rights in Parcel;
--      owner additionally controls membership and property admin.

-- ============================================================
-- Tables
-- ============================================================

create table lattices (
  id         uuid        primary key default gen_random_uuid(),
  owner_id   uuid        not null unique references auth.users(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now()
);

alter table properties
  add column lattice_id uuid references lattices(id) on delete set null;

create index properties_lattice_id_idx on properties(lattice_id);

-- ============================================================
-- Enum rename
-- ============================================================

alter type member_role rename value 'viewer' to 'member';

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table lattices enable row level security;

-- A Lattice is visible only to its owner
create policy "owner can read their lattice"
  on lattices for select
  using (owner_id = auth.uid());

-- Owner can create their own lattice (owner_id must match the caller)
create policy "owner can create their lattice"
  on lattices for insert
  with check (owner_id = auth.uid());

create policy "owner can update their lattice"
  on lattices for update
  using (owner_id = auth.uid());

create policy "owner can delete their lattice"
  on lattices for delete
  using (owner_id = auth.uid());
