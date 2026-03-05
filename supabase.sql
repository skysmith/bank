create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  state jsonb not null,
  version integer not null default 0,
  updated_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.games enable row level security;

drop policy if exists "games_read" on public.games;
drop policy if exists "games_insert" on public.games;
drop policy if exists "games_update" on public.games;

create policy "games_read" on public.games for select using (true);
create policy "games_insert" on public.games for insert with check (true);
create policy "games_update" on public.games for update using (true) with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;
end
$$;

create or replace function public.bank_roll_turn(
  p_code text,
  p_player_id text,
  p_expected_version integer
)
returns table (
  code text,
  state jsonb,
  version integer,
  updated_at timestamp with time zone
)
language plpgsql
security definer
as $$
declare
  game_row public.games%rowtype;
  next_state jsonb;
  players jsonb;
  round_status jsonb;
  log_entries jsonb;
  active_idx integer;
  turn_count integer;
  tally integer;
  round_num integer;
  next_round integer;
  player_count integer;
  idx integer;
  d1 integer;
  d2 integer;
  roll_sum integer;
  is_seven boolean;
  is_double boolean;
  current_player jsonb;
  status_entry jsonb;
  all_done boolean;
  winner_name text;
  winner_total integer := -2147483648;
begin
  select *
  into game_row
  from public.games
  where games.code = p_code
    and games.version = p_expected_version
  for update;

  if not found then
    raise exception 'stale game version';
  end if;

  next_state := game_row.state;
  if coalesce(next_state->>'status', 'active') <> 'active' then
    raise exception 'game is not active';
  end if;

  players := coalesce(next_state->'players', '[]'::jsonb);
  round_status := coalesce(next_state->'roundStatus', '[]'::jsonb);
  log_entries := coalesce(next_state->'log', '[]'::jsonb);
  player_count := coalesce(jsonb_array_length(players), 0);

  if player_count < 1 then
    raise exception 'game has no players';
  end if;

  active_idx := coalesce((next_state->>'activeIdx')::integer, 0);
  current_player := players->active_idx;
  if coalesce(current_player->>'id', '') <> p_player_id then
    raise exception 'not your turn';
  end if;

  turn_count := coalesce((next_state->>'turnCount')::integer, 0) + 1;
  tally := coalesce((next_state->>'tally')::integer, 0);
  round_num := coalesce((next_state->>'round')::integer, 1);

  d1 := floor(random() * 6 + 1)::integer;
  d2 := floor(random() * 6 + 1)::integer;
  roll_sum := d1 + d2;
  is_seven := roll_sum = 7;
  is_double := d1 = d2;

  next_state := jsonb_set(next_state, '{turnCount}', to_jsonb(turn_count), true);
  next_state := jsonb_set(next_state, '{hasRolledThisTurn}', 'true'::jsonb, true);
  next_state := jsonb_set(
    next_state,
    '{lastRoll}',
    jsonb_build_object(
      'd1', d1,
      'd2', d2,
      'sum', roll_sum,
      'isSeven', is_seven,
      'isDouble', is_double
    ),
    true
  );

  if turn_count <= 3 and is_seven then
    tally := tally + 70;
    next_state := jsonb_set(next_state, '{tally}', to_jsonb(tally), true);
    log_entries := log_entries || jsonb_build_array(format('🎲 %s rolled 7 → +70. tally = %s.', current_player->>'name', tally));
  elsif turn_count > 3 and is_seven then
    round_status := jsonb_set(round_status, array[active_idx::text, 'done'], 'true'::jsonb, true);
    round_status := jsonb_set(round_status, array[active_idx::text, 'busted'], 'true'::jsonb, true);
    players := jsonb_set(
      players,
      array[active_idx::text, 'rounds'],
      coalesce(players->active_idx->'rounds', '[]'::jsonb) || jsonb_build_array(0),
      true
    );
    for idx in 0..player_count - 1 loop
      if idx = active_idx then
        continue;
      end if;
      status_entry := round_status->idx;
      if coalesce((status_entry->>'done')::boolean, false) then
        continue;
      end if;
      round_status := jsonb_set(round_status, array[idx::text, 'done'], 'true'::jsonb, true);
      round_status := jsonb_set(round_status, array[idx::text, 'busted'], 'true'::jsonb, true);
      players := jsonb_set(
        players,
        array[idx::text, 'rounds'],
        coalesce(players->idx->'rounds', '[]'::jsonb) || jsonb_build_array(0),
        true
      );
    end loop;
    next_state := jsonb_set(next_state, '{roundStatus}', round_status, true);
    next_state := jsonb_set(next_state, '{players}', players, true);
    log_entries := log_entries || jsonb_build_array(format('🎲 %s rolled 7 → 💥 bust.', current_player->>'name'));
    log_entries := log_entries || jsonb_build_array('⛔ round ended due to bust. remaining active players scored 0.');
  else
    tally := tally + roll_sum;
    if turn_count > 3 and is_double then
      tally := tally * 2;
      log_entries := log_entries || jsonb_build_array(format('🎲 %s rolled %s-%s (+%s) → doubles! tally doubled → %s.', current_player->>'name', d1, d2, roll_sum, tally));
    else
      log_entries := log_entries || jsonb_build_array(format('🎲 %s rolled %s-%s (+%s). tally = %s.', current_player->>'name', d1, d2, roll_sum, tally));
    end if;
    next_state := jsonb_set(next_state, '{tally}', to_jsonb(tally), true);

    for idx in 1..player_count loop
      if not coalesce(((round_status->((active_idx + idx) % player_count))->>'done')::boolean, false) then
        active_idx := (active_idx + idx) % player_count;
        exit;
      end if;
    end loop;
    next_state := jsonb_set(next_state, '{activeIdx}', to_jsonb(active_idx), true);
  end if;

  round_status := coalesce(next_state->'roundStatus', round_status);
  all_done := true;
  for idx in 0..player_count - 1 loop
    if not coalesce(((round_status->idx)->>'done')::boolean, false) then
      all_done := false;
      exit;
    end if;
  end loop;

  if all_done then
    if round_num >= 10 then
      next_state := jsonb_set(next_state, '{round}', to_jsonb(11), true);
      next_state := jsonb_set(next_state, '{status}', to_jsonb('finished'::text), true);
      for idx in 0..player_count - 1 loop
        if coalesce((players->idx->>'total')::integer, 0) > winner_total then
          winner_total := coalesce((players->idx->>'total')::integer, 0);
          winner_name := players->idx->>'name';
        end if;
      end loop;
      log_entries := log_entries || jsonb_build_array(format('🏁 game over. winner: %s (%s).', coalesce(winner_name, '—'), winner_total));
    else
      next_round := round_num + 1;
      next_state := jsonb_set(next_state, '{round}', to_jsonb(next_round), true);
      next_state := jsonb_set(next_state, '{tally}', '0'::jsonb, true);
      next_state := jsonb_set(next_state, '{turnCount}', '0'::jsonb, true);
      next_state := jsonb_set(next_state, '{lastRoll}', 'null'::jsonb, true);
      next_state := jsonb_set(next_state, '{hasRolledThisTurn}', 'false'::jsonb, true);
      next_state := jsonb_set(next_state, '{activeIdx}', to_jsonb((active_idx + 1) % player_count), true);
      next_state := jsonb_set(
        next_state,
        '{roundStatus}',
        (
          select jsonb_agg(jsonb_build_object('done', false, 'banked', false, 'busted', false))
          from generate_series(1, player_count)
        ),
        true
      );
      log_entries := log_entries || jsonb_build_array(format('🟨 new round: %s/10. tally reset.', next_round));
    end if;
  end if;

  players := coalesce(next_state->'players', players);
  round_status := coalesce(next_state->'roundStatus', round_status);
  next_state := jsonb_set(next_state, '{log}', log_entries, true);
  next_state := jsonb_set(next_state, '{players}', players, true);
  next_state := jsonb_set(next_state, '{roundStatus}', round_status, true);

  update public.games
  set state = next_state,
      version = game_row.version + 1,
      updated_at = timezone('utc', now())
  where id = game_row.id
  returning games.code, games.state, games.version, games.updated_at
  into code, state, version, updated_at;

  return next;
end;
$$;

grant execute on function public.bank_roll_turn(text, text, integer) to anon, authenticated;
