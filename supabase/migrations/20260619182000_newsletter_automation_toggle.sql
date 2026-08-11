alter table public.commerce_settings
  add column if not exists newsletter_auto_send_enabled boolean not null default true;
