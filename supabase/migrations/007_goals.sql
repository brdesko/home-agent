-- Migration 007: Goals table and goal_id on projects
-- Run in Supabase SQL editor.

create table goals (
  id          uuid        primary key default gen_random_uuid(),
  property_id uuid        not null references properties(id) on delete cascade,
  name        text        not null,
  description text,
  status      text        not null default 'active'
                          check (status in ('active', 'complete', 'paused')),
  priority    text        not null default 'medium'
                          check (priority in ('low', 'medium', 'high')),
  created_at  timestamptz not null default now()
);

create index goals_property_idx on goals(property_id);

-- Projects can optionally belong to a goal
alter table projects add column goal_id uuid references goals(id) on delete set null;

create index projects_goal_idx on projects(goal_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table goals enable row level security;

create policy "members can read goals"
  on goals for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = goals.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert goals"
  on goals for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = goals.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update goals"
  on goals for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = goals.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete goals"
  on goals for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = goals.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );
