-- Where the owner lives now, for sunrise-based timings (Rahu Kaal, Choghadiya, hora).

create table if not exists public.owner_location (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  tz text not null,
  updated_at timestamptz not null default now()
);

alter table public.owner_location enable row level security;
drop policy if exists "owner all" on public.owner_location;
create policy "owner all" on public.owner_location for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid()))
  with check (public.is_owner() and owner_id = (select auth.uid()));
revoke all on public.owner_location from anon;
grant select, insert, update, delete on public.owner_location to authenticated;
