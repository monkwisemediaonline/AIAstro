-- Research Library: the owner's source books, and a review record for each rule or remedy entry.

create table public.lib_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(title) between 1 and 300),
  author text check (length(author) <= 200),
  edition text check (length(edition) <= 300),      -- translator, publisher, year
  language text check (length(language) <= 60),
  owned boolean not null default true,
  notes text check (length(notes) <= 2000),
  created_at timestamptz not null default now()
);

create table public.lib_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_kind text not null check (item_kind in ('yoga_rule','remedy')),
  item_key text not null check (length(item_key) between 1 and 80),
  status text not null check (status in ('verified','disputed','disabled')),
  source_id uuid references public.lib_sources (id) on delete set null,
  locator text check (length(locator) <= 200),      -- chapter, verse, page
  note text check (length(note) <= 2000),
  reviewed_at timestamptz not null default now(),
  unique (owner_id, item_kind, item_key)
);

do $$
declare t text;
begin
  foreach t in array array['lib_sources','lib_reviews'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "owner all" on public.%I for all to authenticated
                     using (public.is_owner() and owner_id = (select auth.uid()))
                     with check (public.is_owner() and owner_id = (select auth.uid()))$p$, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
