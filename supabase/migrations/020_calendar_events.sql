create table calendar_events (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references properties(id) on delete cascade,
  title        text not null,
  start_date   date not null,
  end_date     date not null,
  type         text not null default 'other'
                 check (type in ('vacation', 'holiday', 'busy', 'sale_window', 'other')),
  notes        text,
  created_at   timestamptz not null default now()
);

alter table calendar_events enable row level security;

create policy "Members can read calendar_events"
  on calendar_events for select
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = calendar_events.property_id
        and property_members.user_id = auth.uid()
    )
  );

create policy "Owners can manage calendar_events"
  on calendar_events for all
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = calendar_events.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );
