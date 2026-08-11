create table if not exists public.catalog_categories (
  slug text primary key,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.catalog_categories (slug, name, description, sort_order)
values
  ('pocket', 'Pocket', 'Compact objects for everyday carry.', 10),
  ('travel', 'Travel', 'Lightweight pieces for moving well.', 20),
  ('edc', 'EDC', 'Useful daily tools with a small footprint.', 30),
  ('wearable', 'Wearable', 'Small accessories and wearable carry.', 40),
  ('accessory', 'Accessory', 'Support pieces that earn the space.', 50)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.catalog_categories (slug, name, sort_order)
select distinct
  lower(regexp_replace(category, '[^a-z0-9]+', '-', 'g')) as slug,
  initcap(category) as name,
  100
from public.products
where category is not null
  and trim(category) <> ''
on conflict (slug) do nothing;

do $$
declare
  category_check_name text;
begin
  select conname
  into category_check_name
  from pg_constraint
  where conrelid = 'public.products'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%category%';

  if category_check_name is not null then
    execute format('alter table public.products drop constraint %I', category_check_name);
  end if;
end $$;

create index if not exists catalog_categories_active_idx
  on public.catalog_categories (is_active, sort_order, name);
