alter table projects
  add column effort         text check (effort in ('low', 'medium', 'high', 'very_high')),
  add column target_year    int,
  add column target_quarter int check (target_quarter between 1 and 4);
