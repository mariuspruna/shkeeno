create table if not exists public.word_games (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  max_players integer not null default 2 check (max_players between 2 and 4),
  board jsonb not null default '{}'::jsonb,
  tile_bag jsonb not null default '[]'::jsonb,
  current_player_index integer not null default 0,
  pass_streak integer not null default 0,
  last_action text,
  winner_player_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists word_games_code_idx
  on public.word_games (code);

create table if not exists public.word_game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.word_games(id) on delete cascade,
  player_index integer not null,
  name text not null,
  token text not null unique,
  rack jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  status text not null default 'active' check (status in ('active', 'resigned')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, player_index)
);

create index if not exists word_game_players_game_idx
  on public.word_game_players (game_id, player_index);

alter table public.word_games enable row level security;
alter table public.word_game_players enable row level security;
