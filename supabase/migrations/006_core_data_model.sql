-- Migration 006: Core domain-agnostic data model
-- Tables: projects, tasks, assets, budget_lines, timeline_events
-- Run in Supabase SQL editor.

-- ============================================================
-- Tables
-- ============================================================

create table projects (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  name         text        not null,
  domain       text        not null,
  status       text        not null default 'planned'
                           check (status in ('planned','active','on_hold','complete')),
  priority     text        not null default 'medium'
                           check (priority in ('low','medium','high')),
  description  text,
  created_at   timestamptz not null default now()
);

create table assets (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  name         text        not null,
  asset_type   text        not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table tasks (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  project_id   uuid        not null references projects(id) on delete cascade,
  title        text        not null,
  description  text,
  status       text        not null default 'todo'
                           check (status in ('todo','in_progress','done','blocked')),
  due_date     date,
  assigned_to  uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- RLS-sensitive: owners only.
create table budget_lines (
  id           uuid          primary key default gen_random_uuid(),
  property_id  uuid          not null references properties(id) on delete cascade,
  project_id   uuid          references projects(id) on delete cascade,
  description  text          not null,
  amount       numeric(10,2) not null,
  line_type    text          not null default 'estimated'
                             check (line_type in ('estimated','actual')),
  category     text,
  created_at   timestamptz   not null default now()
);

create table timeline_events (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  project_id   uuid        references projects(id) on delete cascade,
  title        text        not null,
  description  text,
  event_date   date        not null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index projects_property_idx        on projects(property_id);
create index tasks_project_idx            on tasks(project_id);
create index tasks_property_idx           on tasks(property_id);
create index assets_property_idx          on assets(property_id);
create index budget_lines_property_idx    on budget_lines(property_id);
create index budget_lines_project_idx     on budget_lines(project_id);
create index timeline_events_property_idx on timeline_events(property_id);
create index timeline_events_date_idx     on timeline_events(event_date);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table projects        enable row level security;
alter table assets          enable row level security;
alter table tasks           enable row level security;
alter table budget_lines    enable row level security;
alter table timeline_events enable row level security;

-- ------------------------------------------------------------
-- projects — members read, owners write
-- ------------------------------------------------------------

create policy "members can read projects"
  on projects for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = projects.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert projects"
  on projects for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = projects.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update projects"
  on projects for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = projects.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete projects"
  on projects for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = projects.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ------------------------------------------------------------
-- assets — members read, owners write
-- ------------------------------------------------------------

create policy "members can read assets"
  on assets for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = assets.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert assets"
  on assets for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = assets.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update assets"
  on assets for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = assets.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete assets"
  on assets for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = assets.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ------------------------------------------------------------
-- tasks — members read, owners write
-- ------------------------------------------------------------

create policy "members can read tasks"
  on tasks for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = tasks.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert tasks"
  on tasks for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = tasks.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update tasks"
  on tasks for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = tasks.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete tasks"
  on tasks for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = tasks.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ------------------------------------------------------------
-- budget_lines — owners only (read and write)
-- ------------------------------------------------------------

create policy "owners can read budget lines"
  on budget_lines for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = budget_lines.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can insert budget lines"
  on budget_lines for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = budget_lines.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update budget lines"
  on budget_lines for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = budget_lines.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete budget lines"
  on budget_lines for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = budget_lines.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ------------------------------------------------------------
-- timeline_events — members read, owners write
-- ------------------------------------------------------------

create policy "members can read timeline events"
  on timeline_events for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = timeline_events.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert timeline events"
  on timeline_events for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = timeline_events.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update timeline events"
  on timeline_events for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = timeline_events.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete timeline events"
  on timeline_events for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = timeline_events.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );
