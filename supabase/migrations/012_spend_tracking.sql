-- Migration 012: Spend tracking on goals and projects
-- Run in Supabase SQL editor.

-- Target budget on a goal (optional; owner sets this via Agent)
alter table goals add column target_budget numeric;

-- Actual spend on a project (manual entry; distinct from estimated budget_lines)
alter table projects add column actual_spend numeric;
