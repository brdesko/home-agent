-- Allow any authenticated user to create a new property
create policy "authenticated users can create properties"
  on properties for insert
  to authenticated
  with check (true);

-- Allow owners to delete their properties
create policy "owners can delete their properties"
  on properties for delete
  using (
    exists (
      select 1 from property_members
       where property_members.property_id = properties.id
         and property_members.user_id     = auth.uid()
         and property_members.role        = 'owner'
    )
  );

-- Allow a user to add themselves as the first member of a newly created property.
-- The "no existing members" check prevents self-adding to properties you weren't invited to.
create policy "users can self-join a property with no existing members"
  on property_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and not exists (
      select 1 from property_members existing
       where existing.property_id = property_members.property_id
    )
  );
