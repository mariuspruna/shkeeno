alter table public.commerce_settings
  add column if not exists brand_name text not null default 'Shkeeno',
  add column if not exists brand_wordmark text not null default 'SHKEENO',
  add column if not exists brand_domain text not null default 'shkeeno.com',
  add column if not exists brand_svg text;
