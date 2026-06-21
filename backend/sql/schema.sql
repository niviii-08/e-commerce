-- ============================================================================
-- MULTI-VENDOR ECOMMERCE PLATFORM — SUPABASE BACKEND
-- Simple, clean, normalized schema. Paste into Supabase SQL Editor and run.
-- Run top to bottom in one go (or section by section, in order).
-- ============================================================================


-- ============================================================================
-- STEP 1: EXTENSIONS
-- ============================================================================
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;    -- fast partial-text product search


-- ============================================================================
-- STEP 2: ENUM TYPES
-- ============================================================================
create type user_role          as enum ('customer', 'vendor', 'admin');
create type account_status     as enum ('active', 'inactive', 'blocked');
create type vendor_status      as enum ('pending', 'approved', 'rejected', 'suspended');
create type product_status     as enum ('draft', 'published', 'archived');
create type order_item_status  as enum ('pending', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned');
create type payment_method     as enum ('card', 'upi', 'cod');
create type payment_status     as enum ('pending', 'paid', 'failed', 'refunded');
create type discount_type      as enum ('percent', 'flat');


-- ============================================================================
-- STEP 3: TABLES
-- ============================================================================

-- 3.1 PROFILES — one row per Supabase Auth user (customer / vendor / admin)
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null default 'customer',
  full_name       text not null,
  email           text not null unique,
  phone           text,
  dob             date,
  address         text,
  avatar_url      text,
  account_status  account_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table profiles is 'Extends auth.users with app-specific profile data and role.';

-- 3.2 ADDRESSES — multiple shipping addresses per customer
create table addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  full_name       text not null,
  phone           text not null,
  address_line1   text not null,
  address_line2   text,
  city            text not null,
  state           text not null,
  country         text not null default 'India',
  zip_code        text not null,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);

-- 3.3 VENDORS — extends profiles for users with role = 'vendor'
create table vendors (
  id              uuid primary key references profiles(id) on delete cascade,
  shop_name       text not null unique,
  vendor_code     text not null unique,        -- "Vendor ID" shown on vendor-signup.html
  gstin           text unique,
  status          vendor_status not null default 'pending',
  rating_avg      numeric(2,1) not null default 0 check (rating_avg between 0 and 5),
  rating_count    int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 3.4 CATEGORIES — product category lookup table
create table categories (
  id      uuid primary key default gen_random_uuid(),
  name    text not null unique,
  slug    text not null unique,
  icon    text
);

-- 3.5 PRODUCTS
create table products (
  id              uuid primary key default gen_random_uuid(),
  vendor_id       uuid not null references vendors(id) on delete cascade,
  category_id     uuid references categories(id),
  name            text not null,
  slug            text not null,
  description     text,
  sku             text,
  price           numeric(10,2) not null check (price >= 0),
  stock_quantity  int not null default 0 check (stock_quantity >= 0),
  status          product_status not null default 'draft',
  rating_avg      numeric(2,1) not null default 0 check (rating_avg between 0 and 5),
  rating_count    int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (vendor_id, sku),
  unique (vendor_id, slug)
);

-- 3.6 PRODUCT IMAGES (1 product -> many images)
create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  image_url   text not null,
  sort_order  int not null default 0,
  is_primary  boolean not null default false
);

-- 3.7 CARTS — one active cart per customer
create table carts (
  id            uuid primary key default gen_random_uuid(),
  customer_id   uuid not null unique references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3.8 CART ITEMS
create table cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references carts(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  quantity    int not null check (quantity > 0),
  added_at    timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- 3.9 COUPONS
create table coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  discount_type     discount_type not null,
  discount_value    numeric(10,2) not null check (discount_value > 0),
  min_order_value   numeric(10,2) not null default 0,
  max_discount      numeric(10,2),
  expires_at        timestamptz,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

-- 3.10 ORDERS — the checkout-level record (one per checkout, many vendors inside)
create table orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique
                          default ('ORD-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8)),
  customer_id           uuid not null references profiles(id),
  shipping_address_id   uuid not null references addresses(id),
  coupon_id             uuid references coupons(id),
  subtotal              numeric(10,2) not null check (subtotal >= 0),
  discount_amount       numeric(10,2) not null default 0,
  shipping_fee          numeric(10,2) not null default 0,
  total_amount          numeric(10,2) not null check (total_amount >= 0),
  payment_method        payment_method not null,
  payment_status        payment_status not null default 'pending',
  placed_at             timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 3.11 ORDER ITEMS — one row per product per vendor inside an order.
-- Overall order status is intentionally NOT stored here: it is derived from
-- these per-vendor item statuses, since each vendor ships independently
-- (this is the normalized, multi-vendor-correct design).
create table order_items (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null references orders(id) on delete cascade,
  product_id              uuid not null references products(id),
  vendor_id               uuid not null references vendors(id),
  product_name_snapshot   text not null,   -- preserves name even if product is edited/deleted later
  quantity                int not null check (quantity > 0),
  unit_price              numeric(10,2) not null check (unit_price >= 0),
  line_total              numeric(10,2) generated always as (quantity * unit_price) stored,
  status                  order_item_status not null default 'pending',
  updated_at              timestamptz not null default now()
);

-- 3.12 PAYMENTS
create table payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references orders(id) on delete cascade,
  method            payment_method not null,
  status            payment_status not null default 'pending',
  amount            numeric(10,2) not null check (amount >= 0),
  transaction_ref   text,
  paid_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- 3.13 REVIEWS — one review per customer per product
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  customer_id     uuid not null references profiles(id) on delete cascade,
  order_item_id   uuid references order_items(id),   -- optional "verified purchase" link
  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now(),
  unique (customer_id, product_id)
);


-- ============================================================================
-- STEP 4: INDEXES
-- ============================================================================
create index idx_addresses_user        on addresses(user_id);
create index idx_products_vendor       on products(vendor_id);
create index idx_products_category     on products(category_id);
create index idx_products_status       on products(status);
create index idx_products_name_trgm    on products using gin (name gin_trgm_ops);   -- product search
create index idx_product_images_prod   on product_images(product_id);
create index idx_cart_items_cart       on cart_items(cart_id);
create index idx_orders_customer       on orders(customer_id);
create index idx_orders_payment_status on orders(payment_status);
create index idx_order_items_order     on order_items(order_id);
create index idx_order_items_vendor    on order_items(vendor_id);   -- vendor-orders.html lookups
create index idx_order_items_status    on order_items(status);
create index idx_reviews_product       on reviews(product_id);
create index idx_payments_order        on payments(order_id);


-- ============================================================================
-- STEP 5: HELPER FUNCTIONS
-- ============================================================================
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;


-- ============================================================================
-- STEP 6: TRIGGERS — auto-maintain updated_at
-- ============================================================================
create trigger trg_profiles_updated     before update on profiles     for each row execute function set_updated_at();
create trigger trg_vendors_updated      before update on vendors      for each row execute function set_updated_at();
create trigger trg_products_updated     before update on products     for each row execute function set_updated_at();
create trigger trg_carts_updated        before update on carts        for each row execute function set_updated_at();
create trigger trg_orders_updated       before update on orders       for each row execute function set_updated_at();
create trigger trg_order_items_updated  before update on order_items  for each row execute function set_updated_at();


-- ============================================================================
-- STEP 7: TRIGGER — auto-create profile (+ vendor row + cart) on signup
-- Reads role/full_name/phone/shop_name/vendor_code/gstin from the
-- `options.data` you pass to supabase.auth.signUp() on the frontend.
-- ============================================================================
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role user_role;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer');

  insert into profiles (id, role, full_name, email, phone, dob, address)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    (new.raw_user_meta_data->>'dob')::date,
    new.raw_user_meta_data->>'address'
  );

  if v_role = 'vendor' then
    insert into vendors (id, shop_name, vendor_code, gstin)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'shop_name', 'My Store'),
      coalesce(new.raw_user_meta_data->>'vendor_code', 'VEND-' || substr(new.id::text, 1, 8)),
      new.raw_user_meta_data->>'gstin'
    );
  elsif v_role = 'customer' then
    insert into carts (customer_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();


-- ============================================================================
-- STEP 8: TRIGGERS — stock management
-- ============================================================================

-- Decrement stock the moment an order_item is created (inside place_order()).
-- Locks the product row first so concurrent checkouts can't oversell.
create or replace function decrement_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_available int;
begin
  select stock_quantity into v_available from products where id = new.product_id for update;

  if v_available is null then
    raise exception 'Product % not found', new.product_id;
  end if;
  if v_available < new.quantity then
    raise exception 'Insufficient stock for product %: available %, requested %',
      new.product_id, v_available, new.quantity;
  end if;

  update products set stock_quantity = stock_quantity - new.quantity where id = new.product_id;
  return new;
end;
$$;

create trigger trg_decrement_stock
after insert on order_items
for each row execute function decrement_stock();

-- Restock automatically when a vendor cancels an order item.
create or replace function restock_on_cancel() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update products set stock_quantity = stock_quantity + new.quantity where id = new.product_id;
  end if;
  return new;
end;
$$;

create trigger trg_restock_on_cancel
after update on order_items
for each row execute function restock_on_cancel();


-- ============================================================================
-- STEP 9: TRIGGER — keep product rating_avg / rating_count in sync with reviews
-- ============================================================================
create or replace function refresh_product_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_product_id uuid;
begin
  v_product_id := coalesce(new.product_id, old.product_id);

  update products p
  set rating_count = sub.cnt,
      rating_avg   = sub.avg_rating
  from (
    select count(*) as cnt, round(avg(rating)::numeric, 1) as avg_rating
    from reviews where product_id = v_product_id
  ) sub
  where p.id = v_product_id;

  return null;
end;
$$;

create trigger trg_reviews_aiud
after insert or update or delete on reviews
for each row execute function refresh_product_rating();


-- ============================================================================
-- STEP 10: VIEWS — power the dashboards directly with simple SELECTs
-- ============================================================================

-- vendor-dashboard.html stats
create or replace view vendor_sales_summary as
select
  v.id as vendor_id,
  v.shop_name,
  count(distinct oi.order_id)                                               as total_orders,
  coalesce(sum(oi.line_total) filter (where oi.status <> 'cancelled'), 0)    as total_revenue,
  coalesce(sum(oi.quantity)   filter (where oi.status <> 'cancelled'), 0)    as total_units_sold
from vendors v
left join order_items oi on oi.vendor_id = v.id
group by v.id, v.shop_name;

-- product-listing.html / product-details.html catalog feed
create or replace view product_catalog as
select
  p.id, p.name, p.slug, p.description, p.price, p.stock_quantity, p.status,
  p.rating_avg, p.rating_count,
  c.name as category_name,
  v.id as vendor_id, v.shop_name as vendor_name, v.rating_avg as vendor_rating,
  (select image_url from product_images pi
     where pi.product_id = p.id order by is_primary desc, sort_order asc limit 1) as cover_image
from products p
join categories c on c.id = p.category_id
join vendors v on v.id = p.vendor_id;

-- admin-users.html overview
create or replace view admin_user_overview as
select
  pr.id, pr.full_name, pr.email, pr.phone, pr.role, pr.account_status, pr.created_at,
  count(distinct o.id)            as total_orders,
  coalesce(sum(o.total_amount), 0) as total_spending
from profiles pr
left join orders o on o.customer_id = pr.id
group by pr.id;

-- customer-dashboard.html order history
create or replace view order_summary as
select
  o.id, o.order_number, o.customer_id, pr.full_name as customer_name,
  o.total_amount, o.payment_method, o.payment_status, o.placed_at,
  count(oi.id) as item_count
from orders o
join profiles pr on pr.id = o.customer_id
left join order_items oi on oi.order_id = o.id
group by o.id, pr.full_name;


-- ============================================================================
-- STEP 11: STORED PROCEDURE — place_order()
-- Wraps the entire checkout (cart -> order -> order_items -> payment ->
-- empty cart) in a single transaction. Call this from the frontend via
-- supabase.rpc('place_order', {...}) on checkout.html.
-- ============================================================================
create or replace function place_order(
  p_customer_id     uuid,
  p_address_id      uuid,
  p_payment_method  payment_method,
  p_coupon_code     text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_cart_id     uuid;
  v_order_id    uuid;
  v_subtotal    numeric(10,2) := 0;
  v_discount    numeric(10,2) := 0;
  v_coupon      coupons%rowtype;
  v_item        record;
begin
  -- Safety: callers may only place orders for themselves (admins exempted).
  if p_customer_id <> auth.uid() and not is_admin() then
    raise exception 'Not authorized to place an order for another customer';
  end if;

  select id into v_cart_id from carts where customer_id = p_customer_id;
  if v_cart_id is null then
    raise exception 'Cart not found for customer %', p_customer_id;
  end if;

  select coalesce(sum(ci.quantity * pr.price), 0) into v_subtotal
  from cart_items ci join products pr on pr.id = ci.product_id
  where ci.cart_id = v_cart_id;

  if v_subtotal = 0 then
    raise exception 'Cannot place an order with an empty cart';
  end if;

  if p_coupon_code is not null then
    select * into v_coupon from coupons
    where code = p_coupon_code and active = true
      and (expires_at is null or expires_at > now())
      and v_subtotal >= min_order_value;

    if found then
      v_discount := case when v_coupon.discount_type = 'percent'
        then least(v_subtotal * v_coupon.discount_value / 100, coalesce(v_coupon.max_discount, v_subtotal))
        else least(v_coupon.discount_value, v_subtotal)
      end;
    end if;
  end if;

  insert into orders (
    customer_id, shipping_address_id, coupon_id,
    subtotal, discount_amount, shipping_fee, total_amount, payment_method
  )
  values (
    p_customer_id, p_address_id, v_coupon.id,
    v_subtotal, v_discount, 0, v_subtotal - v_discount, p_payment_method
  )
  returning id into v_order_id;

  for v_item in
    select ci.product_id, ci.quantity, pr.price, pr.name, pr.vendor_id
    from cart_items ci join products pr on pr.id = ci.product_id
    where ci.cart_id = v_cart_id
  loop
    insert into order_items (order_id, product_id, vendor_id, product_name_snapshot, quantity, unit_price)
    values (v_order_id, v_item.product_id, v_item.vendor_id, v_item.name, v_item.quantity, v_item.price);
    -- trg_decrement_stock fires automatically on each insert above
  end loop;

  insert into payments (order_id, method, status, amount)
  values (
    v_order_id, p_payment_method,
    case when p_payment_method = 'cod' then 'pending' else 'paid' end,
    v_subtotal - v_discount
  );

  delete from cart_items where cart_id = v_cart_id;

  return v_order_id;
end;
$$;


-- ============================================================================
-- STEP 12: ROW LEVEL SECURITY
-- ============================================================================
alter table profiles        enable row level security;
alter table addresses       enable row level security;
alter table vendors         enable row level security;
alter table categories      enable row level security;
alter table products        enable row level security;
alter table product_images  enable row level security;
alter table carts           enable row level security;
alter table cart_items      enable row level security;
alter table coupons         enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table payments        enable row level security;
alter table reviews         enable row level security;

-- profiles: see/edit your own row; admins see/edit everyone
create policy profiles_select on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update on profiles for update using (id = auth.uid() or is_admin());

-- addresses: owner only (+admin)
create policy addresses_all on addresses for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid());

-- vendors: public can see approved vendors; vendor sees/edits own row; admin sees all
create policy vendors_select on vendors for select using (status = 'approved' or id = auth.uid() or is_admin());
create policy vendors_update on vendors for update using (id = auth.uid() or is_admin());

-- categories: public read, admin write
create policy categories_select on categories for select using (true);
create policy categories_insert on categories for insert with check (is_admin());
create policy categories_update on categories for update using (is_admin());
create policy categories_delete on categories for delete using (is_admin());

-- products: public sees published products; vendor manages own (any status); admin sees all
create policy products_select on products for select
  using (status = 'published' or vendor_id = auth.uid() or is_admin());
create policy products_insert on products for insert with check (vendor_id = auth.uid());
create policy products_update on products for update using (vendor_id = auth.uid() or is_admin());
create policy products_delete on products for delete using (vendor_id = auth.uid() or is_admin());

-- product_images: follow the parent product's visibility/ownership
create policy product_images_select on product_images for select using (
  exists (select 1 from products p where p.id = product_images.product_id
          and (p.status = 'published' or p.vendor_id = auth.uid() or is_admin()))
);
create policy product_images_write on product_images for all using (
  exists (select 1 from products p where p.id = product_images.product_id
          and (p.vendor_id = auth.uid() or is_admin()))
);

-- carts / cart_items: owner only
create policy carts_all on carts for all using (customer_id = auth.uid());
create policy cart_items_all on cart_items for all using (
  exists (select 1 from carts c where c.id = cart_items.cart_id and c.customer_id = auth.uid())
);

-- coupons: public sees active coupons; admin manages all
create policy coupons_select on coupons for select using (active = true or is_admin());
create policy coupons_insert on coupons for insert with check (is_admin());
create policy coupons_update on coupons for update using (is_admin());

-- orders: customer sees own; vendor sees orders containing their items; admin sees all.
-- Inserts/updates normally flow through place_order(), which is SECURITY DEFINER.
create policy orders_select on orders for select using (
  customer_id = auth.uid() or is_admin()
  or exists (select 1 from order_items oi where oi.order_id = orders.id and oi.vendor_id = auth.uid())
);
create policy orders_insert on orders for insert with check (customer_id = auth.uid());
create policy orders_update on orders for update using (is_admin());

-- order_items: customer sees their own order's items; vendor sees/updates their own items
create policy order_items_select on order_items for select using (
  vendor_id = auth.uid() or is_admin()
  or exists (select 1 from orders o where o.id = order_items.order_id and o.customer_id = auth.uid())
);
create policy order_items_update on order_items for update using (vendor_id = auth.uid() or is_admin());
create policy order_items_insert on order_items for insert with check (
  exists (select 1 from orders o where o.id = order_items.order_id and o.customer_id = auth.uid())
);

-- payments: customer sees own order's payment; admin manages all
create policy payments_select on payments for select using (
  exists (select 1 from orders o where o.id = payments.order_id and (o.customer_id = auth.uid() or is_admin()))
);
create policy payments_admin_write on payments for all using (is_admin());

-- reviews: public read; customer manages their own review
create policy reviews_select on reviews for select using (true);
create policy reviews_insert on reviews for insert with check (customer_id = auth.uid());
create policy reviews_update on reviews for update using (customer_id = auth.uid());
create policy reviews_delete on reviews for delete using (customer_id = auth.uid() or is_admin());


-- ============================================================================
-- STEP 13: STORAGE BUCKETS (Supabase Storage)
-- ============================================================================
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "Public read product images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Authenticated upload product images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "Owner manage own product images" on storage.objects
  for update using (bucket_id = 'product-images' and owner = auth.uid());
create policy "Owner delete own product images" on storage.objects
  for delete using (bucket_id = 'product-images' and owner = auth.uid());

create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Authenticated upload own avatar" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Owner manage own avatar" on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid());


-- ============================================================================
-- STEP 14: SEED DATA
-- ============================================================================
insert into categories (name, slug, icon) values
  ('Electronics',    'electronics',    'bi-laptop'),
  ('Fashion',        'fashion',        'bi-bag'),
  ('Books',          'books',          'bi-book'),
  ('Home & Kitchen', 'home-kitchen',   'bi-house'),
  ('Sports',         'sports',         'bi-dribbble'),
  ('Accessories',    'accessories',    'bi-watch');

insert into coupons (code, discount_type, discount_value, min_order_value, max_discount, expires_at) values
  ('WELCOME500', 'flat',    500, 2000, 500, now() + interval '90 days'),
  ('SAVE10',     'percent', 10,  1000, 300, now() + interval '60 days');

-- ============================================================================
-- DONE. Next: see backend/README.md for setup steps and frontend wiring.
-- ============================================================================
