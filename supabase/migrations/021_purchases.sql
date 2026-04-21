create table purchases (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references properties(id) on delete cascade,
  item_name     text not null,
  vendor        text,
  price         numeric(10,2),
  purchased_at  date not null default current_date,
  project_id    uuid references projects(id) on delete set null,
  category      text,
  notes         text,
  created_at    timestamptz not null default now()
);

alter table purchases enable row level security;

create policy "Members can read purchases"
  on purchases for select
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = purchases.property_id
        and property_members.user_id = auth.uid()
    )
  );

create policy "Owners can manage purchases"
  on purchases for all
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = purchases.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );
