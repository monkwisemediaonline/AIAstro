-- Business & Wealth: monthly metrics, goals, and an honest retrospective log.

create table public.business_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  month date not null,                                  -- first day of the month
  revenue_inr numeric(14,2) check (revenue_inr >= 0),
  gross_margin_pct numeric(5,2) check (gross_margin_pct between -100 and 100),
  cash_inr numeric(14,2),
  pipeline_inr numeric(14,2) check (pipeline_inr >= 0),
  deals_won integer check (deals_won >= 0),
  team_size integer check (team_size >= 0),
  note text check (length(note) <= 1000),
  updated_at timestamptz not null default now(),
  unique (owner_id, month)
);

create table public.business_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  house integer check (house between 1 and 12),
  target text check (length(target) <= 300),
  deadline date,
  status text not null default 'open' check (status in ('open','done','dropped')),
  created_at timestamptz not null default now()
);

create table public.retrospectives (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_label text not null check (length(period_label) between 1 and 120),
  indication text not null check (length(indication) between 1 and 1000),
  outcome text not null check (length(outcome) between 1 and 2000),
  match_rating integer not null check (match_rating between 1 and 5),
  created_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['business_metrics','business_goals','retrospectives'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner all" on public.%I for all to authenticated
                     using (public.is_owner() and owner_id = (select auth.uid()))
                     with check (public.is_owner() and owner_id = (select auth.uid()))$p$, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
