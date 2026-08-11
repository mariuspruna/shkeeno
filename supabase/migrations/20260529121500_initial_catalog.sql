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
