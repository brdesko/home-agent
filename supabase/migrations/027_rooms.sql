-- Migration 027: Rooms (interior sub-zones)
-- Rooms belong to a zone_id (string) within a property.
-- pos_* columns are null when using schematic tile layout;
-- populated by Claude when a floor plan image is analysed.

create table rooms (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  zone_id      text        not null,
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

create index rooms_property_idx on rooms(property_id);
create index rooms_zone_idx     on rooms(property_id, zone_id);

alter table rooms enable row level security;

create policy "members can read rooms"
  on rooms for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = rooms.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert rooms"
  on rooms for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = rooms.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update rooms"
  on rooms for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = rooms.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete rooms"
  on rooms for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = rooms.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );
