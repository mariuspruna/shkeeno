alter table public.word_games
  add column if not exists history jsonb not null default '[]'::jsonb;
