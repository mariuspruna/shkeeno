do $$
declare
  badge_check_name text;
begin
  select conname
  into badge_check_name
  from pg_constraint
  where conrelid = 'public.products'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%badge%';

  if badge_check_name is not null then
    execute format('alter table public.products drop constraint %I', badge_check_name);
  end if;
end $$;

alter table public.products
  add constraint products_badge_check
  check (badge is null or badge in ('new', 'limited', 'staff_pick', 'sale', 'low_stock', 'pre_order'));

insert into public.catalog_categories (slug, name, description, sort_order, is_active)
values
  ('collections', 'Collections', 'Designer-led Shkeeno collections and pieces.', 10, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

update public.catalog_categories
set is_active = false,
    updated_at = now()
where slug in ('pocket', 'travel', 'edc', 'wearable', 'accessory');
