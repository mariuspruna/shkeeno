create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text,
  origin_country text,
  short_description text not null,
  editorial_description text,
  price_gbp integer not null check (price_gbp >= 0),
  weight_grams numeric(5, 2) not null check (weight_grams > 0 and weight_grams <= 49),
  category text not null check (category in ('travel', 'edc', 'wearable', 'pocket', 'accessory')),
  tags text[] not null default '{}',
  materials text[] not null default '{}',
  supplier_url text,
  stripe_price_id text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  include_in_newsletter boolean not null default false,
  newsletter_promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_published_idx on public.products (is_published, created_at desc);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_weight_idx on public.products (weight_grams);
create index if not exists products_newsletter_queue_idx on public.products (include_in_newsletter, newsletter_promoted_at, created_at desc);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

alter table public.products enable row level security;
alter table public.product_images enable row level security;

create policy "Published products are readable"
  on public.products
  for select
  using (is_published = true);

create policy "Published product images are readable"
  on public.product_images
  for select
  using (
    exists (
      select 1
      from public.products
      where products.id = product_images.product_id
        and products.is_published = true
    )
  );

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

alter table public.commerce_settings
  add column if not exists newsletter_enabled boolean not null default true,
  add column if not exists newsletter_sender_name text not null default 'Shkeeno',
  add column if not exists newsletter_reply_to_email text,
  add column if not exists newsletter_confirm_subject text not null default 'Confirm your Shkeeno subscription',
  add column if not exists newsletter_digest_subject text not null default 'New products designed with intention',
  add column if not exists newsletter_digest_intro text not null default 'A few new additions designed with intention.',
  add column if not exists newsletter_auto_send_enabled boolean not null default true,
  add column if not exists newsletter_schedule_weekday integer not null default 1 check (newsletter_schedule_weekday between 0 and 6),
  add column if not exists newsletter_schedule_hour_utc integer not null default 9 check (newsletter_schedule_hour_utc between 0 and 23),
  add column if not exists newsletter_last_campaign_sent_at timestamptz;

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text not null,
  status text not null default 'pending' check (status in ('pending', 'subscribed', 'unsubscribed')),
  source text not null default 'footer',
  confirm_token text not null,
  unsubscribe_token text not null,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists newsletter_subscribers_normalized_email_idx
  on public.newsletter_subscribers (normalized_email);

create unique index if not exists newsletter_subscribers_confirm_token_idx
  on public.newsletter_subscribers (confirm_token);

create unique index if not exists newsletter_subscribers_unsubscribe_token_idx
  on public.newsletter_subscribers (unsubscribe_token);

create index if not exists newsletter_subscribers_status_idx
  on public.newsletter_subscribers (status, created_at desc);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'weekly_digest' check (kind in ('weekly_digest')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial', 'failed', 'skipped')),
  subject text not null,
  intro text,
  sender_name text,
  subscriber_count integer not null default 0 check (subscriber_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  product_count integer not null default 0 check (product_count >= 0),
  scheduled_for timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_campaigns_sent_at_idx
  on public.newsletter_campaigns (sent_at desc nulls last, created_at desc);

create table if not exists public.newsletter_campaign_products (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  product_name text not null,
  short_description text,
  price_gbp integer,
  weight_grams numeric(5, 2),
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_campaign_products_campaign_idx
  on public.newsletter_campaign_products (campaign_id, sort_order);
