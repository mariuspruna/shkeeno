create table if not exists public.catalog_tags (
  slug text primary key,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.catalog_tags (slug, name, sort_order)
select distinct
  lower(regexp_replace(tag, '[^a-z0-9]+', '-', 'g')) as slug,
  initcap(tag) as name,
  100
from public.products,
unnest(tags) as tag
where tag is not null
  and trim(tag) <> ''
on conflict (slug) do nothing;

create index if not exists catalog_tags_active_idx
  on public.catalog_tags (is_active, sort_order, name);
