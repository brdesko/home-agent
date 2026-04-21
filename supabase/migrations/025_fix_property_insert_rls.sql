-- Drop the policy from 024 that used `to authenticated` (may not match the PostgREST role)
drop policy if exists "authenticated users can create properties" on properties;

-- Recreate using auth.uid() check — works for all Supabase client setups
create policy "authenticated users can create properties"
  on properties for insert
  with check (auth.uid() is not null);

-- Same fix for property_members self-join policy
drop policy if exists "users can self-join a property with no existing members" on property_members;

create policy "users can self-join a property with no existing members"
  on property_members for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and not exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
    )
  );
