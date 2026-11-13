-- Last rejection reason; nullable for records reviewed before this migration.
alter table public.agencies
  add column if not exists rejection_reason text null;

alter table public.publications
  add column if not exists rejection_reason text null;
