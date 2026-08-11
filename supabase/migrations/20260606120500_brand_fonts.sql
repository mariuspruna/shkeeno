alter table public.commerce_settings
  add column if not exists brand_display_font text not null default 'Peace Sans, Arial Black, sans-serif',
  add column if not exists brand_body_font text not null default '"Space Grotesk", Helvetica, Arial, sans-serif';
