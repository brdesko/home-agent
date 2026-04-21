-- Migration 014: Unify budget line items — each line has both estimated and actual amounts
-- Run in Supabase SQL editor.

alter table budget_lines add column estimated_amount numeric;
alter table budget_lines add column actual_amount    numeric;

-- Migrate existing rows
update budget_lines set estimated_amount = amount where line_type = 'estimated';
update budget_lines set actual_amount    = amount where line_type = 'actual';

-- Drop old columns
alter table budget_lines drop column amount;
alter table budget_lines drop column line_type;
alter table budget_lines drop column category;
