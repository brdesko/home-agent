-- Migration 019: Storage RLS policies for the "Home Agent" bucket
-- Allows authenticated users (property members) to read and manage documents.
-- Tighten to property_members check if multi-property support is added later.

create policy "Authenticated users can view Home Agent documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'Home Agent');

create policy "Authenticated users can upload to Home Agent"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'Home Agent');

create policy "Authenticated users can update in Home Agent"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'Home Agent');

create policy "Authenticated users can delete from Home Agent"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'Home Agent');
