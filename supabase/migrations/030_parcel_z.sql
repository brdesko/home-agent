-- Migration 030: Parcel Z
-- Zones become a proper table (was JSONB in property_visual_config.site_config).
-- Rooms renamed to Spaces with a real UUID zone_id FK.
-- zone_id + space_id nullable FKs added to projects, tasks, assets, ongoing_tasks.
-- ongoing_task_instances table added for annual cycle tracking.

-- ── Drop rooms (no data to preserve) ────────────────────────────────────────
drop table if exists rooms;

-- ── Zones table ──────────────────────────────────────────────────────────────
create table zones (
  id                   uuid        primary key default gen_random_uuid(),
  property_id          uuid        not null references properties(id) on delete cascade,
  name                 text        not null,
  color                text        not null default '#94a3b8',
  x                    float       not null default 0,
  y                    float       not null default 0,
  width                float       not null default 20,
  height               float       not null default 20,
  description          text,
  floor_plan_photo_url text,
  sort_order           integer     not null default 0,
  created_at           timestamptz not null default now()
);

create index zones_property_idx on zones(property_id);

alter table zones enable row level security;

create policy "members can read zones"
  on zones for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = zones.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert zones"
  on zones for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = zones.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update zones"
  on zones for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = zones.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete zones"
  on zones for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = zones.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ── Spaces table (replaces rooms) ────────────────────────────────────────────
create table spaces (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  zone_id      uuid        not null references zones(id)      on delete cascade,
  name         text        not null,
  status       text        not null default 'not_started'
               check (status in ('not_started', 'in_progress', 'complete')),
  notes        text,
  sort_order   integer     not null default 0,
  pos_x        float,
  pos_y        float,
  pos_w        float,
  pos_h        float,
  created_at   timestamptz not null default now()
);

create index spaces_property_idx on spaces(property_id);
create index spaces_zone_idx     on spaces(property_id, zone_id);

alter table spaces enable row level security;

create policy "members can read spaces"
  on spaces for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = spaces.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert spaces"
  on spaces for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = spaces.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update spaces"
  on spaces for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = spaces.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete spaces"
  on spaces for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = spaces.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ── zone_id + space_id FKs on domain tables ──────────────────────────────────
alter table projects
  add column zone_id  uuid references zones(id)  on delete set null,
  add column space_id uuid references spaces(id) on delete set null;

alter table tasks
  add column zone_id  uuid references zones(id)  on delete set null,
  add column space_id uuid references spaces(id) on delete set null;

alter table assets
  add column zone_id  uuid references zones(id)  on delete set null,
  add column space_id uuid references spaces(id) on delete set null;

alter table ongoing_tasks
  add column zone_id  uuid references zones(id)  on delete set null,
  add column space_id uuid references spaces(id) on delete set null;

-- ── ongoing_task_instances (annual cycle tracking) ───────────────────────────
create table ongoing_task_instances (
  id              uuid        primary key default gen_random_uuid(),
  ongoing_task_id uuid        not null references ongoing_tasks(id) on delete cascade,
  property_id     uuid        not null references properties(id)    on delete cascade,
  year            integer     not null,
  status          text        not null default 'pending'
                  check (status in ('pending', 'complete', 'skipped')),
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (ongoing_task_id, year)
);

create index ongoing_task_instances_property_idx on ongoing_task_instances(property_id);
create index ongoing_task_instances_task_idx     on ongoing_task_instances(ongoing_task_id);

alter table ongoing_task_instances enable row level security;

create policy "members can read ongoing task instances"
  on ongoing_task_instances for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = ongoing_task_instances.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert ongoing task instances"
  on ongoing_task_instances for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = ongoing_task_instances.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update ongoing task instances"
  on ongoing_task_instances for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = ongoing_task_instances.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete ongoing task instances"
  on ongoing_task_instances for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = ongoing_task_instances.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

-- ── Remove zones from site_config JSONB (zones now live in the zones table) ──
update property_visual_config
  set site_config = site_config - 'zones'
  where site_config ? 'zones';
