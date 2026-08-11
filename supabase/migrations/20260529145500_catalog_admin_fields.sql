alter table public.products
  add column if not exists compare_at_price_gbp integer check (compare_at_price_gbp is null or compare_at_price_gbp >= 0),
  add column if not exists badge text check (badge is null or badge in ('new', 'limited', 'staff_pick', 'sale', 'low_stock'));

create or replace function public.enforce_product_image_limit()
returns trigger
language plpgsql
as $$
declare
  image_count integer;
begin
  select count(*)
  into image_count
  from public.product_images
  where product_id = new.product_id;

  if image_count >= 6 then
    raise exception 'A product can have at most 6 images.';
  end if;

  return new;
end;
$$;

drop trigger if exists product_images_limit on public.product_images;

create trigger product_images_limit
  before insert on public.product_images
  for each row
  execute function public.enforce_product_image_limit();
