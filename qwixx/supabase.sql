create table if not exists public.qwixx_games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  state jsonb not null,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists public.qwixx_players (
  id uuid primary key default gen_random_uuid(),
  game_code text references public.qwixx_games(code) on delete cascade,
  player_id text not null,
  name text not null,
  sheet jsonb not null default '{}'::jsonb,
  penalties integer not null default 0,
  created_at timestamp with time zone default timezone('utc', now())
);

alter table public.qwixx_games enable row level security;
alter table public.qwixx_players enable row level security;

create policy "qwixx_games_read" on public.qwixx_games for select using (true);
create policy "qwixx_games_write" on public.qwixx_games for insert with check (true);
create policy "qwixx_games_update" on public.qwixx_games for update using (true) with check (true);

create policy "qwixx_players_all" on public.qwixx_players for all using (true) with check (true);

alter publication supabase_realtime add table public.qwixx_games;
alter publication supabase_realtime add table public.qwixx_players;
