alter table public.products
  add column if not exists include_in_newsletter boolean not null default false,
  add column if not exists newsletter_promoted_at timestamptz;

create index if not exists products_newsletter_queue_idx
  on public.products (include_in_newsletter, newsletter_promoted_at, created_at desc);

alter table public.commerce_settings
  add column if not exists newsletter_enabled boolean not null default true,
  add column if not exists newsletter_sender_name text not null default 'Shkeeno',
  add column if not exists newsletter_reply_to_email text,
  add column if not exists newsletter_confirm_subject text not null default 'Confirm your Shkeeno subscription',
  add column if not exists newsletter_digest_subject text not null default 'New products designed with intention',
  add column if not exists newsletter_digest_intro text not null default 'A few new additions designed with intention.',
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
