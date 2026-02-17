-- Enable pgcrypto for UUIDs
create extension if not exists "pgcrypto";

-- Games table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  state jsonb not null,
  created_by text,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

create trigger set_timestamp before update on public.games
  for each row execute procedure trigger_set_timestamp();

-- Players table
create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_code text references public.games(code) on delete cascade,
  player_id text not null,
  name text not null,
  joined_at timestamp with time zone default timezone('utc', now())
);

create index if not exists idx_game_players_code on public.game_players (game_code);

-- RLS policies (prototype: allow all)
alter table public.games enable row level security;
alter table public.game_players enable row level security;

create policy "games_insert" on public.games for insert with check (true);
create policy "games_select" on public.games for select using (true);
create policy "games_update" on public.games for update using (true) with check (true);
create policy "players_all" on public.game_players for all using (true) with check (true);

-- realtime
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;
