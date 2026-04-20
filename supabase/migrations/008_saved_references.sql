create table saved_references (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  type        text not null default 'vendor'
                check (type in ('vendor', 'brand', 'resource')),
  name        text not null,
  notes       text,
  url         text,
  created_at  timestamptz not null default now()
);

alter table saved_references enable row level security;

create policy "members read saved_references"
  on saved_references for select
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = saved_references.property_id
        and property_members.user_id = auth.uid()
    )
  );

create policy "owners insert saved_references"
  on saved_references for insert
  with check (
    exists (
      select 1 from property_members
      where property_members.property_id = saved_references.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );

create policy "owners update saved_references"
  on saved_references for update
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = saved_references.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );

create policy "owners delete saved_references"
  on saved_references for delete
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = saved_references.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );
