-- Migration 029: Global Context — cross-domain shared layer
--
-- Two tables scoped to a Lattice, owner-only access:
--
--   global_context      — one row per Lattice (upserted), structured JSONB fields:
--                           goals               life-level strategic goals (not Parcel property goals)
--                           planning_assumptions key/value pairs, e.g. "stay in house 10+ years"
--                           risk_preferences     key/value pairs, e.g. "low debt tolerance"
--                           thresholds           named spending/budget limits
--
--   global_commitments  — one row per major cross-domain financial commitment
--                         Structured columns (not JSONB) so C3 can query and aggregate.
--                         recurrence_type distinguishes one-time projects from recurring costs.
--                         domain is nullable for cross-domain commitments.

-- ============================================================
-- global_context
-- ============================================================

create table global_context (
  id                   uuid        primary key default gen_random_uuid(),
  lattice_id           uuid        not null unique references lattices(id) on delete cascade,
  goals                jsonb       not null default '[]'::jsonb,
  planning_assumptions jsonb       not null default '{}'::jsonb,
  risk_preferences     jsonb       not null default '{}'::jsonb,
  thresholds           jsonb       not null default '{}'::jsonb,
  updated_at           timestamptz not null default now()
);

create index global_context_lattice_idx on global_context(lattice_id);

-- ============================================================
-- global_commitments
-- ============================================================

create table global_commitments (
  id              uuid        primary key default gen_random_uuid(),
  lattice_id      uuid        not null references lattices(id) on delete cascade,
  name            text        not null,
  domain          text        check (domain in ('parcel', 'personal')),
  amount          numeric     not null,
  recurrence_type text        not null check (recurrence_type in ('one_time', 'annual', 'monthly', 'quarterly')),
  target_year     integer,
  target_quarter  integer     check (target_quarter between 1 and 4),
  notes           text,
  created_at      timestamptz not null default now()
);

create index global_commitments_lattice_idx on global_commitments(lattice_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table global_context enable row level security;
alter table global_commitments enable row level security;

-- global_context: owner-only via lattice ownership

create policy "owner can read their global context"
  on global_context for select
  using (
    exists (
      select 1 from lattices
      where lattices.id = global_context.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );

create policy "owner can insert their global context"
  on global_context for insert
  with check (
    exists (
      select 1 from lattices
      where lattices.id = global_context.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );

create policy "owner can update their global context"
  on global_context for update
  using (
    exists (
      select 1 from lattices
      where lattices.id = global_context.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );

-- global_commitments: owner-only via lattice ownership

create policy "owner can read their global commitments"
  on global_commitments for select
  using (
    exists (
      select 1 from lattices
      where lattices.id = global_commitments.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );

create policy "owner can insert their global commitments"
  on global_commitments for insert
  with check (
    exists (
      select 1 from lattices
      where lattices.id = global_commitments.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );

create policy "owner can update their global commitments"
  on global_commitments for update
  using (
    exists (
      select 1 from lattices
      where lattices.id = global_commitments.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );

create policy "owner can delete their global commitments"
  on global_commitments for delete
  using (
    exists (
      select 1 from lattices
      where lattices.id = global_commitments.lattice_id
        and lattices.owner_id = auth.uid()
    )
  );
