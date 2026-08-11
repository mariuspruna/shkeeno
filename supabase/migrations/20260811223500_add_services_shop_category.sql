insert into public.catalog_categories (slug, name, description, sort_order, is_active)
values
  ('services', 'Services', 'Repairs, modifications, and designer-led garment services.', 20, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();
