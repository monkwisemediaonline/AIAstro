-- Lal Kitab: owner-entered readings and upay, keyed by planet + house, each with its source.
-- The app ships no built-in Lal Kitab rules; this table is the owner's own transcription.

create table public.lk_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  planet text not null check (planet in ('Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu')),
  house integer not null check (house between 1 and 12),
  reading text not null check (length(reading) between 1 and 4000),
  upay text check (length(upay) <= 4000),
  source text not null check (length(source) between 1 and 300),
  locator text check (length(locator) <= 120),
  confidence text not null default 'medium' check (confidence in ('high','medium','low')),
  safety_checked boolean not null default false,
  created_at timestamptz not null default now()
);
create index lk_notes_lookup_idx on public.lk_notes (owner_id, planet, house);

alter table public.lk_notes enable row level security;
create policy "owner all" on public.lk_notes for all to authenticated
  using (public.is_owner() and owner_id = (select auth.uid()))
  with check (public.is_owner() and owner_id = (select auth.uid()));
revoke all on public.lk_notes from anon;
grant select, insert, update, delete on public.lk_notes to authenticated;
