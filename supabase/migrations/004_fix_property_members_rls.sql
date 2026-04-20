-- Migration 004: Fix self-referential RLS policy on property_members
-- The original "members can read property member list" policy checked
-- property_members to grant access to property_members -- always false.

drop policy if exists "members can read property member list" on property_members;

-- A user can read any membership row that belongs to them.
-- Simple, no self-reference.
create policy "users can read own memberships"
  on property_members for select
  using (user_id = auth.uid());
