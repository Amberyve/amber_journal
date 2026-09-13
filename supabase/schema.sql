-- =============================================================
-- Sip. Smile. Shine. — database schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- =============================================================

-- ---------- profiles -----------------------------------------
-- One row per signed-up person. id matches the Supabase auth user.

create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null default '',
  why           text not null default '',
  start_date    date not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- entries ------------------------------------------
-- One row per person per day (1..84).

create table if not exists public.entries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  day         smallint not null check (day between 1 and 84),
  g1          text not null default '',
  g2          text not null default '',
  g3          text not null default '',
  intention   text not null default '',
  response    text not null default '',
  evening     text not null default '',
  mood        smallint check (mood between 0 and 4),
  stress      smallint not null default 5 check (stress between 1 and 10),
  entry_date  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day)
);

create index if not exists entries_user_day_idx on public.entries (user_id, day);

-- ---------- weekly intentions --------------------------------

create table if not exists public.weekly_intentions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  week        smallint not null check (week between 0 and 11),
  intention   text not null default '',
  small_thing text not null default '',
  updated_at  timestamptz not null default now(),
  unique (user_id, week)
);

-- =============================================================
-- Row Level Security
-- This is what actually protects the data. Without it, the public
-- anon key would let anyone read everything. Do not skip this.
-- =============================================================

alter table public.profiles          enable row level security;
alter table public.entries           enable row level security;
alter table public.weekly_intentions enable row level security;

-- profiles: you can only see and change your own row
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- entries: full control over your own rows only
drop policy if exists "read own entries" on public.entries;
create policy "read own entries" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "insert own entries" on public.entries;
create policy "insert own entries" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own entries" on public.entries;
create policy "update own entries" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own entries" on public.entries;
create policy "delete own entries" on public.entries
  for delete using (auth.uid() = user_id);

-- weekly intentions: same
drop policy if exists "read own weekly" on public.weekly_intentions;
create policy "read own weekly" on public.weekly_intentions
  for select using (auth.uid() = user_id);

drop policy if exists "insert own weekly" on public.weekly_intentions;
create policy "insert own weekly" on public.weekly_intentions
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own weekly" on public.weekly_intentions;
create policy "update own weekly" on public.weekly_intentions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own weekly" on public.weekly_intentions;
create policy "delete own weekly" on public.weekly_intentions
  for delete using (auth.uid() = user_id);

-- =============================================================
-- Keep updated_at honest
-- =============================================================

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists entries_touch on public.entries;
create trigger entries_touch before update on public.entries
  for each row execute function public.touch_updated_at();

drop trigger if exists weekly_touch on public.weekly_intentions;
create trigger weekly_touch before update on public.weekly_intentions
  for each row execute function public.touch_updated_at();

-- =============================================================
-- Create a profile row automatically when someone signs up
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
