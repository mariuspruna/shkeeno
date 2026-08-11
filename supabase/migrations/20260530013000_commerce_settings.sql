create table if not exists public.commerce_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'Shkeeno',
  support_email text,
  allow_promotion_codes boolean not null default true,
  require_phone boolean not null default true,
  collect_billing_address boolean not null default true,
  allowed_countries text[] not null default array['GB', 'US', 'DE', 'FR', 'NL', 'SE', 'JP'],
  standard_rate_name text not null default 'Tracked shipping',
  standard_rate_amount integer not null default 495 check (standard_rate_amount >= 0),
  standard_min_business_days integer not null default 2 check (standard_min_business_days >= 0),
  standard_max_business_days integer not null default 10 check (standard_max_business_days >= 0),
  express_enabled boolean not null default false,
  express_rate_name text not null default 'Express shipping',
  express_rate_amount integer not null default 995 check (express_rate_amount >= 0),
  express_min_business_days integer not null default 1 check (express_min_business_days >= 0),
  express_max_business_days integer not null default 3 check (express_max_business_days >= 0),
  shipping_rate_standard_id text,
  shipping_rate_express_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.commerce_settings (id)
values (1)
on conflict (id) do nothing;
