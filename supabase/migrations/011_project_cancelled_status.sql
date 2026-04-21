-- Find and drop the existing status check constraint, then recreate with 'cancelled'
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'projects'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute 'alter table projects drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;

alter table projects add constraint projects_status_check
  check (status in ('planned', 'active', 'on_hold', 'complete', 'cancelled'));
