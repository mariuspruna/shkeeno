alter table public.commerce_settings
  add column if not exists brand_display_letter_spacing integer not null default 0;
