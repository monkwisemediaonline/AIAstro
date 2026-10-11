-- Jyotish Desk — catch-up setup.
-- Creates every table the portal needs beyond the first setup: remedies tracking, research library,
-- and current location. Safe to run more than once: nothing existing is dropped or changed.
-- Requires the initial schema (public.is_owner and public.touch_updated_at) to be in place.

-- ============================================================ Remedies & rituals
create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id uuid references public.people (id) on delete cascade,
  remedy_key text,
  planet text,
  kind text not null check (kind in ('mantra','seva','daan','puja','vrat','gemstone','other')),
  title text not null check (length(title) between 1 and 200),
  target_count integer check (target_count > 0),
  started_on date not null default current_date,
  status text not null default 'active' check (status in ('active','paused','done','dropped')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practices_owner_idx on public.practices (owner_id, status);
drop trigger if exists practices_touch on public.practices;
create trigger practices_touch before update on public.practices for each row execute function public.touch_updated_at();

create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  log_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  note text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index if not exists practice_logs_practice_idx on public.practice_logs (practice_id, log_date desc);

create table if not exists public.daan_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date date not null default current_date,
  item text not null check (length(item) between 1 and 200),
  recipient text,
  amount_inr numeric(12,2) not null default 0 check (amount_inr >= 0),
  planet text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists daan_logs_owner_idx on public.daan_logs (owner_id, log_date desc);

create table if not exists public.owner_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  daan_monthly_cap_inr numeric(12,2) check (daan_monthly_cap_inr >= 0),
  updated_at timestamptz not null default now()
);

-- ============================================================ Research library
create table if not exists public.lib_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  author text check (length(author) <= 200),
  edition text check (length(edition) <= 300),
  language text check (length(language) <= 60),
  owned boolean not null default true,
  notes text check (length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.lib_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_kind text not null check (item_kind in ('yoga_rule','remedy')),
  item_key text not null check (length(item_key) between 1 and 80),
  status text not null check (status in ('verified','disputed','disabled')),
  source_id uuid references public.lib_sources (id) on delete set null,
  locator text check (length(locator) <= 200),
  note text check (length(note) <= 2000),
  reviewed_at timestamptz not null default now(),
  unique (owner_id, item_kind, item_key)
);

-- ============================================================ Current location (for Rahu Kaal etc.)
create table if not exists public.owner_location (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  tz text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================ Owner-only access on all of the above
alter table public.practices      enable row level security;
alter table public.practice_logs  enable row level security;
alter table public.daan_logs      enable row level security;
alter table public.owner_settings enable row level security;
alter table public.lib_sources    enable row level security;
alter table public.lib_reviews    enable row level security;
alter table public.owner_location enable row level security;

drop policy if exists "owner all" on public.practices;
create policy "owner all" on public.practices for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));
drop policy if exists "owner all" on public.practice_logs;
create policy "owner all" on public.practice_logs for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));
drop policy if exists "owner all" on public.daan_logs;
create policy "owner all" on public.daan_logs for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));
drop policy if exists "owner all" on public.owner_settings;
create policy "owner all" on public.owner_settings for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));
drop policy if exists "owner all" on public.lib_sources;
create policy "owner all" on public.lib_sources for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));
drop policy if exists "owner all" on public.lib_reviews;
create policy "owner all" on public.lib_reviews for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));
drop policy if exists "owner all" on public.owner_location;
create policy "owner all" on public.owner_location for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid())) with check (public.is_owner() and owner_id = (select auth.uid()));

revoke all on public.practices, public.practice_logs, public.daan_logs, public.owner_settings,
              public.lib_sources, public.lib_reviews, public.owner_location from anon;
grant select, insert, update, delete on public.practices, public.practice_logs, public.daan_logs, public.owner_settings,
              public.lib_sources, public.lib_reviews, public.owner_location to authenticated;

-- Ask the API layer to notice the new tables straight away.
notify pgrst, 'reload schema';

-- Result: lists the seven tables. You should see all seven names.
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('practices','practice_logs','daan_logs','owner_settings','lib_sources','lib_reviews','owner_location')
order by table_name;
