-- Migration 015: Explicit sort order for goal priority hierarchy
-- Run in Supabase SQL editor.

alter table goals add column sort_order integer not null default 0;

-- Seed sort_order from current priority + name ordering so existing goals start ranked
with ranked as (
  select id,
    row_number() over (
      partition by property_id
      order by case priority when 'high' then 1 when 'medium' then 2 else 3 end, name
    ) as rn
  from goals
)
update goals set sort_order = ranked.rn from ranked where goals.id = ranked.id;
