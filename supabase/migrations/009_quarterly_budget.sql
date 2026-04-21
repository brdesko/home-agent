create table quarterly_budget (
  id                       uuid primary key default gen_random_uuid(),
  property_id              uuid not null references properties(id) on delete cascade,
  year                     int  not null,
  quarter                  int  not null check (quarter between 1 and 4),
  core_income              numeric(12,2) not null default 0,
  additional_income        numeric(12,2) not null default 0,
  core_expenses            numeric(12,2) not null default 0,
  additional_expenses      numeric(12,2) not null default 0,
  additional_expense_items jsonb         not null default '[]',
  allocation_pct           numeric(5,2)  not null default 0 check (allocation_pct between 0 and 100),
  created_at               timestamptz   not null default now(),
  unique (property_id, year, quarter)
);

alter table quarterly_budget enable row level security;

create policy "members read quarterly_budget"
  on quarterly_budget for select
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = quarterly_budget.property_id
        and property_members.user_id = auth.uid()
    )
  );

create policy "owners insert quarterly_budget"
  on quarterly_budget for insert
  with check (
    exists (
      select 1 from property_members
      where property_members.property_id = quarterly_budget.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );

create policy "owners update quarterly_budget"
  on quarterly_budget for update
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = quarterly_budget.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );

create policy "owners delete quarterly_budget"
  on quarterly_budget for delete
  using (
    exists (
      select 1 from property_members
      where property_members.property_id = quarterly_budget.property_id
        and property_members.user_id = auth.uid()
        and property_members.role = 'owner'
    )
  );
