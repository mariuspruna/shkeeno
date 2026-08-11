create table if not exists public.ping_log (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  path text not null,
  country_code text,
  region text,
  city text,
  visitor_email text,
  pinged_at timestamptz not null default now()
);

create index if not exists ping_log_ip_pinged_at_idx
  on public.ping_log (ip, pinged_at desc);
