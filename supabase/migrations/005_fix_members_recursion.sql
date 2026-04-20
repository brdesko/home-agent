-- Migration 005: Fix infinite recursion in property_members policies.
-- The "owners can manage members" FOR ALL policy included SELECT,
-- causing its subquery against property_members to recurse infinitely.
-- Replace it with explicit INSERT/UPDATE/DELETE policies only.

drop policy if exists "owners can manage members" on property_members;

create policy "owners can insert members"
  on property_members for insert
  with check (
    exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
         and existing.user_id     = auth.uid()
         and existing.role        = 'owner'
    )
  );

create policy "owners can update members"
  on property_members for update
  using (
    exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
         and existing.user_id     = auth.uid()
         and existing.role        = 'owner'
    )
  );

create policy "owners can delete members"
  on property_members for delete
  using (
    exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
         and existing.user_id     = auth.uid()
         and existing.role        = 'owner'
    )
  );
