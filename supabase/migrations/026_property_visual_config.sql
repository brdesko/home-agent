-- Migration 026: Property visual configuration
-- Stores per-property 2D site plan config as JSONB.
-- Agent writes this; visual component reads it.
-- site_config shape: { bounds, zones[], buildings[] }

create table property_visual_config (
  id           uuid        primary key default gen_random_uuid(),
  property_id  uuid        not null references properties(id) on delete cascade,
  site_config  jsonb,
  config_notes text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (property_id)
);

create index property_visual_config_property_idx on property_visual_config(property_id);

alter table property_visual_config enable row level security;

create policy "members can read visual config"
  on property_visual_config for select
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = property_visual_config.property_id
         and pm.user_id     = auth.uid()
    )
  );

create policy "owners can insert visual config"
  on property_visual_config for insert
  with check (
    exists (
      select 1 from property_members pm
       where pm.property_id = property_visual_config.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can update visual config"
  on property_visual_config for update
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = property_visual_config.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );

create policy "owners can delete visual config"
  on property_visual_config for delete
  using (
    exists (
      select 1 from property_members pm
       where pm.property_id = property_visual_config.property_id
         and pm.user_id     = auth.uid()
         and pm.role        = 'owner'
    )
  );
