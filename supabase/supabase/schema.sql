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

-- A day may only be written on or after the date it falls on. Past days stay
-- editable so a missed morning can be caught up; future days are closed.
--
-- The database clock is UTC while readers are in UTC+8, so someone writing at
-- 7am in Iloilo is still "yesterday" to Postgres. The extra day of slack absorbs
-- any timezone offset while still making it impossible to write weeks ahead.
create or replace function public.day_is_open(p_user uuid, p_day smallint)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    p_day <= (current_date - (select start_date from public.profiles where id = p_user)) + 2,
    false);
$$;

drop policy if exists "insert own entries" on public.entries;
create policy "insert own entries" on public.entries
  for insert with check (auth.uid() = user_id and public.day_is_open(auth.uid(), day));

drop policy if exists "update own entries" on public.entries;
create policy "update own entries" on public.entries
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.day_is_open(auth.uid(), day));

drop policy if exists "delete own entries" on public.entries;
create policy "delete own entries" on public.entries
  for delete using (auth.uid() = user_id);

-- weekly intentions: same
drop policy if exists "read own weekly" on public.weekly_intentions;
create policy "read own weekly" on public.weekly_intentions
  for select using (auth.uid() = user_id);

-- Same rule for a week's intention: it opens with that week's first day.
drop policy if exists "insert own weekly" on public.weekly_intentions;
create policy "insert own weekly" on public.weekly_intentions
  for insert with check (
    auth.uid() = user_id and public.day_is_open(auth.uid(), (week * 7 + 1)::smallint));

drop policy if exists "update own weekly" on public.weekly_intentions;
create policy "update own weekly" on public.weekly_intentions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id and public.day_is_open(auth.uid(), (week * 7 + 1)::smallint));

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


-- =============================================================
-- PART 2 — Roles, subscriptions, and the admin console
--
-- Three levels:
--   user         the default. Their own journal, nothing else.
--   admin        can move through locked days for testing. No management.
--   super_admin  everything above, plus people, subscriptions and billing.
--
-- ONE THING TO BE CLEAR ABOUT: no role can read anyone else's journal
-- entries. There is deliberately no admin policy on public.entries. Managing
-- subscribers does not require reading what people wrote about their stress,
-- and the console works from counts and dates only. Do not "fix" this by
-- adding a select policy for admins.
-- =============================================================

alter table public.profiles
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin', 'super_admin'));

-- ---------- who am I -----------------------------------------
-- SECURITY DEFINER so these can read profiles without tripping the very
-- policies that call them.

create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'user');
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.app_role() = 'super_admin';
$$;

-- "staff" = admin or super_admin. Used for the day-lock bypass.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select public.app_role() in ('admin', 'super_admin');
$$;

-- ---------- nobody promotes themselves -----------------------
-- Without this, the "update own profile" policy would let any user set their
-- own role to super_admin.

create or replace function public.guard_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'user' and not public.is_super_admin() then
      new.role := 'user';
    end if;
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can change a role';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before insert or update on public.profiles
  for each row execute function public.guard_role_change();

-- ---------- staff skip the day lock --------------------------
create or replace function public.day_is_open(p_user uuid, p_day smallint)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or coalesce(
    p_day <= (current_date - (select start_date from public.profiles where id = p_user)) + 2,
    false);
$$;

-- ---------- super admin can see and manage people ------------
drop policy if exists "super admin reads all profiles" on public.profiles;
create policy "super admin reads all profiles" on public.profiles
  for select using (public.is_super_admin());

drop policy if exists "super admin updates profiles" on public.profiles;
create policy "super admin updates profiles" on public.profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------- subscriptions ------------------------------------

create table if not exists public.subscriptions (
  user_id             uuid primary key references auth.users on delete cascade,
  plan                text not null default 'free'
                        check (plan in ('free', 'monthly', 'yearly', 'lifetime')),
  status              text not null default 'active'
                        check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  amount_cents        integer not null default 0,     -- in centavos
  currency            text not null default 'PHP',
  started_at          timestamptz not null default now(),
  current_period_end  date,
  provider            text,                            -- 'paymongo', 'manual', ...
  provider_ref        text,                            -- id from the payment provider
  note                text not null default '',
  updated_at          timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id or public.is_super_admin());

drop policy if exists "super admin writes subscriptions" on public.subscriptions;
create policy "super admin writes subscriptions" on public.subscriptions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- every new signup starts on the free plan
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end $$;

-- ---------- what the console reads ---------------------------
-- Counts and dates only. No entry text is ever returned.

create or replace function public.admin_list_users()
returns table (
  id uuid, email text, display_name text, role text,
  start_date date, joined_at timestamptz,
  days_written bigint, last_active timestamptz,
  plan text, status text, amount_cents integer,
  current_period_end date
)
language sql stable security definer set search_path = public as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.start_date,
    p.created_at,
    (select count(*) from public.entries e
       where e.user_id = p.id
         and btrim(concat(e.g1, e.g2, e.g3, e.intention, e.response, e.evening)) <> ''),
    (select max(e.updated_at) from public.entries e where e.user_id = p.id),
    coalesce(s.plan, 'free'),
    coalesce(s.status, 'active'),
    coalesce(s.amount_cents, 0),
    s.current_period_end
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.subscriptions s on s.user_id = p.id
  where public.is_super_admin()
  order by p.created_at desc;
$$;

create or replace function public.admin_stats()
returns table (
  total_users bigint, paying bigint, trialing bigint, past_due bigint,
  new_this_week bigint, active_this_week bigint,
  mrr_cents bigint, entries_total bigint
)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from public.profiles),
    (select count(*) from public.subscriptions where status = 'active' and plan <> 'free'),
    (select count(*) from public.subscriptions where status = 'trialing'),
    (select count(*) from public.subscriptions where status = 'past_due'),
    (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    (select count(distinct user_id) from public.entries where updated_at > now() - interval '7 days'),
    (select coalesce(sum(case when plan = 'yearly' then amount_cents / 12
                              when plan = 'monthly' then amount_cents
                              else 0 end), 0)
       from public.subscriptions where status in ('active', 'trialing')),
    (select count(*) from public.entries
       where btrim(concat(g1, g2, g3, intention, response, evening)) <> '')
  where public.is_super_admin();
$$;

-- ---------- what the console can change ----------------------

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'Not allowed';
  end if;
  if p_role not in ('user', 'admin', 'super_admin') then
    raise exception 'Unknown role: %', p_role;
  end if;
  if p_user = auth.uid() and p_role <> 'super_admin' then
    raise exception 'You cannot remove your own super admin access';
  end if;
  update public.profiles set role = p_role where id = p_user;
end $$;

create or replace function public.admin_set_subscription(
  p_user uuid, p_plan text, p_status text,
  p_amount_cents integer, p_period_end date, p_note text default ''
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then
    raise exception 'Not allowed';
  end if;
  insert into public.subscriptions (user_id, plan, status, amount_cents,
                                    current_period_end, provider, note)
  values (p_user, p_plan, p_status, coalesce(p_amount_cents, 0), p_period_end, 'manual', coalesce(p_note, ''))
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        amount_cents = excluded.amount_cents,
        current_period_end = excluded.current_period_end,
        note = excluded.note;
end $$;

-- =============================================================
-- Make yourself the first super admin. Run this once, with your
-- own email, after you have signed up through the app:
--
--   update public.profiles set role = 'super_admin'
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- The trigger above blocks role changes from the app, but this runs in the
-- SQL editor as the database owner, which bypasses it.
-- =============================================================


-- =============================================================
-- PART 3 — Free month, then ₱250 a year, paid by GCash via PayMongo
--
--   sign up            → status 'trialing', free for 30 days
--   trial ends         → writing stops until a payment lands
--   payment lands      → status 'active', period end = paid date + 1 year
--   renewal            → extends from whichever is later, today or the
--                        existing period end, so nobody loses paid days
--
-- Money is in centavos everywhere: ₱250.00 is 25000.
-- =============================================================

alter table public.subscriptions
  add column if not exists trial_ends_at date;

-- everyone who already exists gets the free month from today
update public.subscriptions
   set trial_ends_at = current_date + 30,
       status = 'trialing'
 where trial_ends_at is null
   and plan = 'free'
   and status = 'active';

-- new signups start the free month immediately
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'free', 'trialing', current_date + 30)
  on conflict (user_id) do nothing;

  return new;
end $$;

-- ---------- who may write today -------------------------------
create or replace function public.has_access(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff() or exists (
    select 1 from public.subscriptions s
     where s.user_id = p_user
       and (
         s.plan = 'lifetime'
         or (s.status = 'trialing' and coalesce(s.trial_ends_at, current_date) >= current_date)
         or (s.status = 'active'
             and (s.current_period_end is null or s.current_period_end >= current_date))
       )
  );
$$;

-- A day must have arrived AND the account must be in good standing.
-- Reading stays open forever — only writing stops.
drop policy if exists "insert own entries" on public.entries;
create policy "insert own entries" on public.entries
  for insert with check (
    auth.uid() = user_id
    and public.day_is_open(auth.uid(), day)
    and public.has_access(auth.uid())
  );

drop policy if exists "update own entries" on public.entries;
create policy "update own entries" on public.entries
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.day_is_open(auth.uid(), day)
    and public.has_access(auth.uid())
  );

drop policy if exists "insert own weekly" on public.weekly_intentions;
create policy "insert own weekly" on public.weekly_intentions
  for insert with check (
    auth.uid() = user_id
    and public.day_is_open(auth.uid(), (week * 7 + 1)::smallint)
    and public.has_access(auth.uid())
  );

drop policy if exists "update own weekly" on public.weekly_intentions;
create policy "update own weekly" on public.weekly_intentions
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and public.day_is_open(auth.uid(), (week * 7 + 1)::smallint)
    and public.has_access(auth.uid())
  );

-- ---------- what the app shows on the billing screen ----------
create or replace function public.my_billing()
returns table (
  plan text, status text, amount_cents integer, currency text,
  trial_ends_at date, current_period_end date,
  days_left integer, can_write boolean, provider text
)
language sql stable security definer set search_path = public as $$
  select
    coalesce(s.plan, 'free'),
    coalesce(s.status, 'trialing'),
    coalesce(s.amount_cents, 0),
    coalesce(s.currency, 'PHP'),
    s.trial_ends_at,
    s.current_period_end,
    greatest(0, coalesce(
      case when s.status = 'trialing' then s.trial_ends_at - current_date
           else s.current_period_end - current_date end, 0))::integer,
    public.has_access(auth.uid()),
    s.provider
  from public.subscriptions s
  where s.user_id = auth.uid();
$$;

-- ---------- a payment landed ----------------------------------
-- Called only by the webhook, which runs with the service role.
-- Renewing early extends the existing period instead of truncating it.
create or replace function public.apply_payment(
  p_user uuid, p_amount_cents integer, p_ref text, p_paid_on date default current_date
)
returns date language plpgsql security definer set search_path = public as $$
declare
  new_end date;
begin
  select greatest(coalesce(current_period_end, p_paid_on), p_paid_on) + interval '1 year'
    into new_end
    from public.subscriptions where user_id = p_user;

  if new_end is null then
    new_end := p_paid_on + interval '1 year';
  end if;

  insert into public.subscriptions as s
    (user_id, plan, status, amount_cents, currency,
     current_period_end, provider, provider_ref, started_at)
  values
    (p_user, 'yearly', 'active', p_amount_cents, 'PHP',
     new_end, 'paymongo', p_ref, now())
  on conflict (user_id) do update
    set plan = 'yearly',
        status = 'active',
        amount_cents = excluded.amount_cents,
        currency = 'PHP',
        current_period_end = new_end,
        provider = 'paymongo',
        provider_ref = excluded.provider_ref;

  return new_end;
end $$;

-- a record of every payment, so billing questions can be answered
create table if not exists public.payments (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users on delete cascade,
  amount_cents integer not null,
  currency     text not null default 'PHP',
  provider     text not null default 'paymongo',
  provider_ref text,
  method       text,
  paid_at      timestamptz not null default now(),
  period_end   date,
  raw          jsonb
);

create unique index if not exists payments_ref_idx
  on public.payments (provider, provider_ref) where provider_ref is not null;

alter table public.payments enable row level security;

drop policy if exists "read own payments" on public.payments;
create policy "read own payments" on public.payments
  for select using (auth.uid() = user_id or public.is_super_admin());

-- the console needs the trial date too
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, display_name text, role text,
  start_date date, joined_at timestamptz,
  days_written bigint, last_active timestamptz,
  plan text, status text, amount_cents integer,
  current_period_end date, trial_ends_at date
)
language sql stable security definer set search_path = public as $$
  select
    p.id, u.email::text, p.display_name, p.role, p.start_date, p.created_at,
    (select count(*) from public.entries e
       where e.user_id = p.id
         and btrim(concat(e.g1, e.g2, e.g3, e.intention, e.response, e.evening)) <> ''),
    (select max(e.updated_at) from public.entries e where e.user_id = p.id),
    coalesce(s.plan, 'free'), coalesce(s.status, 'trialing'),
    coalesce(s.amount_cents, 0), s.current_period_end, s.trial_ends_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.subscriptions s on s.user_id = p.id
  where public.is_super_admin()
  order by p.created_at desc;
$$;
