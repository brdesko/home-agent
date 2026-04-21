create table ongoing_tasks (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references properties(id) on delete cascade,
  title          text not null,
  description    text,
  recurrence     text,
  active_months  integer[],
  last_completed_at timestamptz,
  created_at     timestamptz not null default now()
);

alter table ongoing_tasks enable row level security;

create policy "Members can read ongoing_tasks"
  on ongoing_tasks for select
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = ongoing_tasks.property_id
        and property_members.user_id = auth.uid()
    )
  );

create policy "Owners can manage ongoing_tasks"
  on ongoing_tasks for all
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = ongoing_tasks.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );
