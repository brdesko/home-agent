-- Migration 013: Target budget and parent project relationship on projects
-- Run in Supabase SQL editor.

-- Owner's intended spend ceiling for this project
alter table projects add column target_budget numeric;

-- Links a project to a predecessor whose target_budget becomes this project's inherited estimate
alter table projects add column parent_project_id uuid references projects(id) on delete set null;

create index projects_parent_idx on projects(parent_project_id);
