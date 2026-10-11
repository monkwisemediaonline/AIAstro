-- Remedies & ritual planner: practices, japa/practice logs, daan log, owner settings.
-- Owner-only, same RLS pattern as the initial schema.

create table public.practices (
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
create index practices_owner_idx on public.practices (owner_id, status);
create trigger practices_touch before update on public.practices for each row execute function public.touch_updated_at();

create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  practice_id uuid not null references public.practices (id) on delete cascade,
  log_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  note text,
  rating integer check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
create index practice_logs_practice_idx on public.practice_logs (practice_id, log_date desc);

create table public.daan_logs (
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
create index daan_logs_owner_idx on public.daan_logs (owner_id, log_date desc);

create table public.owner_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  daan_monthly_cap_inr numeric(12,2) check (daan_monthly_cap_inr >= 0),
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['practices','practice_logs','daan_logs','owner_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner all" on public.%I for all to authenticated
                     using (public.is_owner() and owner_id = (select auth.uid()))
                     with check (public.is_owner() and owner_id = (select auth.uid()))$p$, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
