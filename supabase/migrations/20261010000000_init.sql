-- Personal Jyotish AI — initial schema
-- Single owner. Every table is protected by RLS: only the user listed in app_owner can read/write.

create extension if not exists pgcrypto;

-- ---------- owner ----------
create table public.app_owner (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_owner enable row level security;
-- Owner may read their own row (used by the app to confirm ownership). No insert/update/delete via API.
create policy "owner reads self" on public.app_owner for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_owner where user_id = (select auth.uid())) $$;
revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- people ----------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 120),
  relationship text not null check (relationship in ('self','spouse','daughter','son','parent','sibling','business_partner','other')),
  birth_date date,
  time_kind text not null default 'unknown' check (time_kind in ('exact','range','unknown')),
  birth_time time,
  range_from time,
  range_to time,
  confidence text not null default 'unknown' check (confidence in ('certificate','exact','family_reported','approximate','unknown')),
  place_name text,
  lat double precision check (lat between -90 and 90),
  lon double precision check (lon between -180 and 180),
  iana_tz text,
  place_source text,
  data_source text,
  notes text,
  is_minor boolean not null default false,
  ai_allowed boolean not null default false,
  status text not null default 'draft' check (status in ('draft','confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exact_needs_time check (time_kind <> 'exact' or birth_time is not null),
  constraint range_needs_bounds check (time_kind <> 'range' or (range_from is not null and range_to is not null and range_to > range_from))
);
create index people_owner_idx on public.people (owner_id);
create trigger people_touch before update on public.people for each row execute function public.touch_updated_at();

-- ---------- chart results (reproducible snapshots) ----------
create table public.chart_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  input_hash text not null,
  schema_version text not null,
  engine text not null,
  engine_version text not null,
  settings jsonb not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (person_id, input_hash)
);
create index chart_results_person_idx on public.chart_results (person_id, created_at desc);

-- ---------- partner checks ----------
create table public.partner_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_a uuid not null references public.people (id) on delete cascade,
  person_b uuid not null references public.people (id) on delete cascade,
  ruleset text not null,
  payload jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  check (person_a <> person_b)
);

-- ---------- RLS: owner only ----------
do $$
declare t text;
begin
  foreach t in array array['people','chart_results','partner_checks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner all" on public.%I for all to authenticated
                     using (public.is_owner() and owner_id = (select auth.uid()))
                     with check (public.is_owner() and owner_id = (select auth.uid()))$p$, t);
  end loop;
end $$;

-- anon role gets nothing
revoke all on public.app_owner, public.people, public.chart_results, public.partner_checks from anon;

-- signed-in users get table access; RLS above still limits rows to the owner
grant select, insert, update, delete on public.people, public.chart_results, public.partner_checks to authenticated;
grant select on public.app_owner to authenticated;
