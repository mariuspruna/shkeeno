create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  currency text not null default 'gbp',
  email text,
  customer_name text,
  phone text,
  payment_status text not null default 'pending',
  fulfillment_status text not null default 'unfulfilled',
  stock_issue boolean not null default false,
  subtotal_amount integer not null default 0,
  shipping_amount integer not null default 0,
  tax_amount integer not null default 0,
  total_amount integer not null default 0,
  shipping_name text,
  shipping_address jsonb,
  billing_address jsonb,
  stripe_metadata jsonb not null default '{}'::jsonb,
  raw_checkout_session jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.customer_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_amount integer not null default 0,
  line_total_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists customer_orders_created_idx
  on public.customer_orders (created_at desc);

create index if not exists customer_orders_fulfillment_idx
  on public.customer_orders (fulfillment_status, created_at desc);

create index if not exists customer_order_items_order_idx
  on public.customer_order_items (order_id);

create or replace function public.finalize_checkout_order(order_payload jsonb, item_payloads jsonb)
returns table(order_id uuid, already_processed boolean, stock_issue boolean)
language plpgsql
as $$
declare
  existing_order_id uuid;
  inserted_order_id uuid;
  inserted_stock_issue boolean := false;
  item jsonb;
  current_stock integer;
  requested_quantity integer;
  target_product_id uuid;
begin
  select id
  into existing_order_id
  from public.customer_orders
  where stripe_checkout_session_id = order_payload->>'stripe_checkout_session_id'
  limit 1;

  if existing_order_id is not null then
    return query
    select existing_order_id, true, (select customer_orders.stock_issue from public.customer_orders where id = existing_order_id);
    return;
  end if;

  insert into public.customer_orders (
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_customer_id,
    currency,
    email,
    customer_name,
    phone,
    payment_status,
    fulfillment_status,
    stock_issue,
    subtotal_amount,
    shipping_amount,
    tax_amount,
    total_amount,
    shipping_name,
    shipping_address,
    billing_address,
    stripe_metadata,
    raw_checkout_session,
    updated_at
  ) values (
    order_payload->>'stripe_checkout_session_id',
    nullif(order_payload->>'stripe_payment_intent_id', ''),
    nullif(order_payload->>'stripe_customer_id', ''),
    coalesce(nullif(order_payload->>'currency', ''), 'gbp'),
    nullif(order_payload->>'email', ''),
    nullif(order_payload->>'customer_name', ''),
    nullif(order_payload->>'phone', ''),
    coalesce(nullif(order_payload->>'payment_status', ''), 'paid'),
    coalesce(nullif(order_payload->>'fulfillment_status', ''), 'unfulfilled'),
    false,
    coalesce((order_payload->>'subtotal_amount')::integer, 0),
    coalesce((order_payload->>'shipping_amount')::integer, 0),
    coalesce((order_payload->>'tax_amount')::integer, 0),
    coalesce((order_payload->>'total_amount')::integer, 0),
    nullif(order_payload->>'shipping_name', ''),
    coalesce(order_payload->'shipping_address', '{}'::jsonb),
    coalesce(order_payload->'billing_address', '{}'::jsonb),
    coalesce(order_payload->'stripe_metadata', '{}'::jsonb),
    coalesce(order_payload->'raw_checkout_session', '{}'::jsonb),
    now()
  )
  returning id into inserted_order_id;

  for item in
    select value
    from jsonb_array_elements(coalesce(item_payloads, '[]'::jsonb))
  loop
    target_product_id := nullif(item->>'product_id', '')::uuid;
    requested_quantity := greatest(coalesce((item->>'quantity')::integer, 1), 1);

    insert into public.customer_order_items (
      order_id,
      product_id,
      product_slug,
      product_name,
      quantity,
      unit_amount,
      line_total_amount
    ) values (
      inserted_order_id,
      target_product_id,
      nullif(item->>'product_slug', ''),
      coalesce(nullif(item->>'product_name', ''), 'Unknown product'),
      requested_quantity,
      coalesce((item->>'unit_amount')::integer, 0),
      coalesce((item->>'line_total_amount')::integer, 0)
    );

    if target_product_id is not null then
      select stock_quantity
      into current_stock
      from public.products
      where id = target_product_id
      for update;

      if current_stock is null then
        inserted_stock_issue := true;
      elsif current_stock < requested_quantity then
        inserted_stock_issue := true;
        update public.products
        set stock_quantity = 0,
            updated_at = now()
        where id = target_product_id;
      else
        update public.products
        set stock_quantity = stock_quantity - requested_quantity,
            updated_at = now()
        where id = target_product_id;
      end if;
    end if;
  end loop;

  update public.customer_orders
  set stock_issue = inserted_stock_issue,
      fulfillment_status = case when inserted_stock_issue then 'needs_attention' else fulfillment_status end,
      updated_at = now()
  where id = inserted_order_id;

  return query
  select inserted_order_id, false, inserted_stock_issue;
end;
$$;
