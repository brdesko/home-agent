-- Migration 001: Properties and PropertyMembers with RLS
-- Run this in the Supabase SQL editor.

-- ============================================================
-- Types
-- ============================================================

create type member_role as enum ('owner', 'viewer');

-- ============================================================
-- Tables
-- ============================================================

create table properties (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  address     text,
  created_at  timestamptz not null default now()
);

create table property_members (
  id          uuid        primary key default gen_random_uuid(),
  property_id uuid        not null references properties(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  role        member_role not null default 'viewer',
  created_at  timestamptz not null default now(),
  unique (property_id, user_id)
);

-- ============================================================
-- Indexes
-- ============================================================

create index property_members_user_id_idx  on property_members(user_id);
create index property_members_property_idx on property_members(property_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table properties       enable row level security;
alter table property_members enable row level security;

-- ------------------------------------------------------------
-- properties policies
-- ------------------------------------------------------------

-- Any member of a property can read it.
create policy "members can read their properties"
  on properties for select
  using (
    exists (
      select 1 from property_members
       where property_members.property_id = properties.id
         and property_members.user_id     = auth.uid()
    )
  );

-- Only owners can update a property's name / address.
create policy "owners can update their properties"
  on properties for update
  using (
    exists (
      select 1 from property_members
       where property_members.property_id = properties.id
         and property_members.user_id     = auth.uid()
         and property_members.role        = 'owner'
    )
  );

-- ------------------------------------------------------------
-- property_members policies
-- ------------------------------------------------------------

-- Any member of a property can see the full member list.
-- (So both owners see each other. Viewers can see who else has access.)
create policy "members can read property member list"
  on property_members for select
  using (
    exists (
      select 1 from property_members self
       where self.property_id = property_members.property_id
         and self.user_id     = auth.uid()
    )
  );

-- Only owners can add or remove members.
-- The `using` clause covers DELETE; `with check` covers INSERT/UPDATE.
create policy "owners can manage members"
  on property_members for all
  using (
    exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
         and existing.user_id     = auth.uid()
         and existing.role        = 'owner'
    )
  )
  with check (
    exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
         and existing.user_id     = auth.uid()
         and existing.role        = 'owner'
    )
  );
