-- ============================================================================
-- Sri Vartali Fashion Commerce — schema v1 (Phase 1 foundation)
-- ============================================================================
-- Apply to a fresh Supabase project (SQL editor or supabase db push).
-- Idempotent: safe to re-run.
--
-- Invariants encoded here (spec §55 non-negotiables):
--   * Money is stored as INTEGER PAISE everywhere — never floating point (§15C).
--   * UUIDs are primary keys; readable codes (SVS-P-000001, SVS-ORD-YYYYMMDD-
--     NNNNN) are unique external identifiers, category-neutral (§3).
--   * Every product has >= 1 variant; a non-variant product carries exactly one
--     DEFAULT variant with SKU `<product_code>-DEFAULT` (§3) — so inventory and
--     order items always reference a variant.
--   * order_items store purchase-time snapshots; historical orders survive
--     product edits and archives (§24, rule 19).
--   * orders.total_paise = subtotal - discount + shipping, enforced by CHECK.
--   * A customer saying PAID can only ever reach CUSTOMER_CLAIMS_PAID;
--     VERIFIED requires an authorized client user (§31-32) — enforced in app
--     logic layered on RLS (canVerifyPayments).
--   * RLS is enabled on every table; carts are server-only (no client
--     policies), orders are created by the server, role changes require
--     SUPER_ADMIN.
--
-- Status models (§25): order_status, payment_status, fulfilment_status.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type app_role as enum ('CUSTOMER', 'CLIENT_OWNER', 'CLIENT_STAFF', 'SUPER_ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('CREATED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
    'PENDING', 'CUSTOMER_CLAIMS_PAID', 'VERIFIED', 'REJECTED', 'REFUNDED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfilment_status as enum (
    'UNFULFILLED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURNED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipment_status as enum ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inventory_reason as enum (
    'RESTOCK', 'ORDER_RESERVE', 'ORDER_RELEASE', 'ORDER_FULFIL', 'MANUAL_ADJUST'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type whatsapp_direction as enum ('OUTBOUND', 'INBOUND');
exception when duplicate_object then null; end $$;

do $$ begin
  create type whatsapp_message_status as enum ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type webhook_event_status as enum ('RECEIVED', 'PROCESSED', 'FAILED', 'DUPLICATE');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Readable ID generation (§3) — UUIDs internally, codes externally
-- ---------------------------------------------------------------------------
create sequence if not exists product_code_seq start 1;
create sequence if not exists order_number_seq start 1;

create or replace function public.next_product_code()
returns text
language sql
security definer set search_path = public
as $$
  select 'SVS-P-' || lpad(nextval('product_code_seq')::text, 6, '0');
$$;

-- Date-prefixed order number. The counter is global (never resets), which
-- keeps uniqueness provable with a single sequence; padding grows past 99999.
create or replace function public.next_order_number()
returns text
language sql
security definer set search_path = public
as $$
  select 'SVS-ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
         lpad(nextval('order_number_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------------
-- Identity: profiles (bridge from Supabase Auth to app roles)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  role        app_role not null default 'CUSTOMER',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Role integrity: inserts/updates through the API (auth.uid() present) may
-- only set a role if the actor is SUPER_ADMIN. Server-side writes (auth.uid()
-- is null: postgres, service_role, triggers) are unrestricted.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_role app_role;
begin
  if auth.uid() is not null and new.role is distinct from 'CUSTOMER' then
    select p.role into actor_role from public.profiles p where p.id = auth.uid();
    if actor_role is distinct from 'SUPER_ADMIN' then
      raise exception 'profile role can only be granted by SUPER_ADMIN';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before insert or update of role on public.profiles
  for each row execute function public.guard_profile_role();

-- Auto-create a CUSTOMER profile on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Customers and addresses
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,
  name        text not null,
  phone       text not null unique,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers (id) on delete cascade,
  label        text,
  house        text not null,
  street       text not null,
  area         text not null,
  landmark     text,
  district     text,
  state        text,
  locality     text,
  pincode      text not null check (pincode ~ '^[0-9]{6}$'),
  country      text not null default 'India',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_addresses_customer on public.addresses (customer_id);

-- ---------------------------------------------------------------------------
-- Catalog: categories (tree) and collections (marketing groupings) (§41)
-- ---------------------------------------------------------------------------
-- attribute_schema defines the dynamic, category-specific fields (§4), e.g.:
--   [{"key":"fabric","label":"Fabric","type":"text","filterable":true},
--    {"key":"color","label":"Color","type":"option",
--     "options":["Wine","Ivory","Gold"], "filterable":true}]
-- products.attributes stores the values keyed by `key`. Nothing here is
-- saree-specific: adding a category never requires a schema change.
create table if not exists public.categories (
  id                uuid primary key default gen_random_uuid(),
  parent_id         uuid references public.categories (id) on delete set null,
  name              text not null,
  slug              text not null unique,
  description       text,
  attribute_schema  jsonb not null default '[]'::jsonb,
  position          integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_categories_parent on public.categories (parent_id);

create table if not exists public.collections (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  description  text,
  is_active    boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products, media, variants, inventory (§3, §12-§17)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  product_code        text not null unique default public.next_product_code(),
  name                text not null,
  slug                text not null unique,
  category_id         uuid not null references public.categories (id),
  short_description   text,
  description         text,
  status              product_status not null default 'DRAFT',
  -- prices in paise (integer — spec §15C)
  selling_price_paise integer not null check (selling_price_paise > 0),
  mrp_paise           integer check (mrp_paise is null or mrp_paise >= selling_price_paise),
  -- values for the category's attribute_schema (§4)
  attributes          jsonb not null default '{}'::jsonb,
  measurements        jsonb not null default '{}'::jsonb,
  care_instructions   text,
  seo_title           text,
  seo_description     text,
  -- shipping (§15F)
  weight_g            integer check (weight_g is null or weight_g > 0),
  length_cm           integer,
  width_cm            integer,
  height_cm           integer,
  dispatch_time_days  integer not null default 3 check (dispatch_time_days >= 0),
  return_eligible     boolean not null default true,
  shipping_notes      text,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_products_category on public.products (category_id);
create index if not exists idx_products_status on public.products (status);
-- search by name/code is app-level (Phase 4); trigram/pglightswt deferred.

-- Join table lives AFTER products: its FK target must exist at CREATE time.
create table if not exists public.collection_products (
  collection_id  uuid not null references public.collections (id) on delete cascade,
  product_id     uuid not null references public.products (id) on delete cascade,
  added_at       timestamptz not null default now(),
  primary key (collection_id, product_id)
);

create table if not exists public.product_media (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products (id) on delete cascade,
  cloudinary_public_id  text,
  url                   text not null,
  alt                   text,
  position              integer not null default 0,
  is_primary            boolean not null default false,
  created_at            timestamptz not null default now()
);
create index if not exists idx_product_media_product on public.product_media (product_id, position);
-- at most one primary image per product
create unique index if not exists uq_product_media_primary
  on public.product_media (product_id) where is_primary;

-- Every product has >= 1 variant; non-variant products have exactly one row
-- with attributes '{}' and sku '<product_code>-DEFAULT' (§3).
create table if not exists public.product_variants (
  id                  uuid primary key default gen_random_uuid(),
  product_id          uuid not null references public.products (id) on delete cascade,
  sku                 text not null unique check (sku ~ '^SVS-P-[0-9]{6}-.+$'),
  name                text,
  attributes          jsonb not null default '{}'::jsonb,
  -- per-variant price override in paise; null falls back to the product price
  selling_price_paise integer check (selling_price_paise is null or selling_price_paise > 0),
  mrp_paise           integer,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_product_variants_product on public.product_variants (product_id);

create table if not exists public.inventory (
  id                   uuid primary key default gen_random_uuid(),
  product_id           uuid not null references public.products (id) on delete cascade,
  variant_id           uuid not null unique references public.product_variants (id) on delete cascade,
  quantity             integer not null default 0 check (quantity >= 0),
  reserved_quantity    integer not null default 0 check (reserved_quantity >= 0),
  low_stock_threshold  integer not null default 2 check (low_stock_threshold >= 0),
  updated_at           timestamptz not null default now(),
  unique (product_id, variant_id)
);
create index if not exists idx_inventory_product on public.inventory (product_id);

-- ---------------------------------------------------------------------------
-- Wishlists (§7) and carts (server-only, §18)
-- ---------------------------------------------------------------------------
create table if not exists public.wishlists (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null unique references public.customers (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  wishlist_id  uuid not null references public.wishlists (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  added_at     timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

-- Carts are read/written exclusively by server routes with the admin client:
-- RLS is enabled with NO policies, so anon/authenticated sessions can never
-- touch them directly. Prices are never stored on cart rows — they are always
-- re-fetched and re-validated server-side at checkout (§22).
create table if not exists public.carts (
  id            uuid primary key default gen_random_uuid(),
  cart_token    text not null unique,
  customer_id   uuid references public.customers (id) on delete set null,
  converted_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid not null references public.product_variants (id) on delete cascade,
  quantity    integer not null check (quantity > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, variant_id)
);

-- ---------------------------------------------------------------------------
-- Orders (§23, §24, §25, §26)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  order_number              text not null unique default public.next_order_number(),
  customer_id               uuid references public.customers (id) on delete set null,
  customer_name             text not null,
  phone                     text not null,
  email                     text,
  shipping_address_snapshot jsonb not null,
  subtotal_paise            integer not null check (subtotal_paise >= 0),
  discount_paise            integer not null default 0 check (discount_paise >= 0),
  shipping_paise            integer not null default 0 check (shipping_paise >= 0),
  total_paise               integer not null check (total_paise >= 0),
  order_status              order_status not null default 'CREATED',
  payment_status            payment_status not null default 'PENDING',
  fulfilment_status         fulfilment_status not null default 'UNFULFILLED',
  -- manual verification trail (§32)
  utr_reference             text,
  payment_verified_by       uuid references public.profiles (id) on delete set null,
  payment_verified_at       timestamptz,
  -- stock reservation window (§26): released by app job unless extended
  reservation_expires_at    timestamptz,
  paid_at                   timestamptz,
  shipped_at                timestamptz,
  delivered_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint orders_totals_consistent
    check (total_paise = subtotal_paise - discount_paise + shipping_paise)
);
create index if not exists idx_orders_customer on public.orders (customer_id);
create index if not exists idx_orders_payment_status on public.orders (payment_status);
create index if not exists idx_orders_order_status on public.orders (order_status);
create index if not exists idx_orders_created on public.orders (created_at);
create index if not exists idx_orders_phone on public.orders (phone);

-- Snapshots keep historical orders correct after product edits (§24).
create table if not exists public.order_items (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete cascade,
  product_id             uuid not null references public.products (id) on delete restrict,
  variant_id             uuid not null references public.product_variants (id) on delete restrict,
  product_code_snapshot  text not null,
  product_name_snapshot  text not null,
  image_snapshot         text,
  sku_snapshot           text not null,
  unit_price_paise       integer not null check (unit_price_paise >= 0),
  quantity               integer not null check (quantity > 0),
  line_total_paise       integer not null check (line_total_paise >= 0),
  selected_attributes    jsonb not null default '{}'::jsonb,
  constraint order_items_line_consistent
    check (line_total_paise = unit_price_paise * quantity)
);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

-- Stock movements live AFTER orders: the order_id FK target must exist at
-- CREATE time (movements are order-driven: ORDER_RESERVE / ORDER_RELEASE /
-- ORDER_FULFIL, §16-§17).
create table if not exists public.inventory_movements (
  id                 uuid primary key default gen_random_uuid(),
  inventory_id       uuid not null references public.inventory (id) on delete cascade,
  delta              integer not null,
  delta_reserved     integer not null default 0,
  reason             inventory_reason not null,
  order_id           uuid references public.orders (id) on delete set null,
  note               text,
  actor_profile_id   uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index if not exists idx_inventory_movements_inventory on public.inventory_movements (inventory_id);
create index if not exists idx_inventory_movements_created on public.inventory_movements (created_at);

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  method         text not null default 'UPI',
  amount_paise   integer not null check (amount_paise >= 0),
  status         payment_status not null default 'PENDING',
  utr_reference  text,
  claimed_at     timestamptz,
  verified_by    uuid references public.profiles (id) on delete set null,
  verified_at    timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_payments_order on public.payments (order_id);

create table if not exists public.shipments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  courier      text not null,              -- rule 17: shipping requires these
  tracking_id  text not null,
  tracking_url text,
  status       shipment_status not null default 'SHIPPED',
  shipped_at   timestamptz not null default now(),
  delivered_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_shipments_order on public.shipments (order_id);

create table if not exists public.order_status_history (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  field             text not null check (field in ('order_status', 'payment_status', 'fulfilment_status')),
  old_value         text,
  new_value         text,
  note              text,
  actor_profile_id  uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_order_status_history_order on public.order_status_history (order_id);

create or replace function public.record_order_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.order_status is distinct from old.order_status then
    insert into public.order_status_history (order_id, field, old_value, new_value, actor_profile_id)
    values (new.id, 'order_status', old.order_status::text, new.order_status::text, auth.uid());
  end if;
  if new.payment_status is distinct from old.payment_status then
    insert into public.order_status_history (order_id, field, old_value, new_value, actor_profile_id)
    values (new.id, 'payment_status', old.payment_status::text, new.payment_status::text, auth.uid());
  end if;
  if new.fulfilment_status is distinct from old.fulfilment_status then
    insert into public.order_status_history (order_id, field, old_value, new_value, actor_profile_id)
    values (new.id, 'fulfilment_status', old.fulfilment_status::text, new.fulfilment_status::text, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_history on public.orders;
create trigger orders_status_history
  after update on public.orders
  for each row execute function public.record_order_status_change();

-- ---------------------------------------------------------------------------
-- WhatsApp layer (§43), webhooks (§44), reviews, settings, audit (§45)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_messages (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid references public.orders (id) on delete set null,
  recipient_phone      text not null,
  direction            whatsapp_direction not null default 'OUTBOUND',
  message_type         text not null,
  template_name        text,
  provider_message_id  text,
  status               whatsapp_message_status not null default 'QUEUED',
  error_code           text,
  sent_at              timestamptz,
  delivered_at         timestamptz,
  read_at              timestamptz,
  failed_at            timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists idx_whatsapp_messages_order on public.whatsapp_messages (order_id);
create index if not exists idx_whatsapp_messages_status on public.whatsapp_messages (status);

create table if not exists public.whatsapp_consents (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null unique,
  source       text,
  consented_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id                 uuid primary key default gen_random_uuid(),
  provider           text not null,
  external_event_id  text not null,
  event_type         text,
  payload            jsonb not null default '{}'::jsonb,
  status             webhook_event_status not null default 'RECEIVED',
  error              text,
  received_at        timestamptz not null default now(),
  processed_at       timestamptz,
  -- handlers must be idempotent (§44): dedupe on (provider, external_event_id)
  unique (provider, external_event_id)
);
create index if not exists idx_webhook_events_status on public.webhook_events (status);

create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  customer_id    uuid references public.customers (id) on delete set null,
  order_item_id  uuid references public.order_items (id) on delete set null,
  customer_name  text,
  rating         integer not null check (rating between 1 and 5),
  title          text,
  body           text,
  is_approved    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_reviews_product on public.reviews (product_id);

-- Singleton row: business/payment settings (§30). Public read is safe: it
-- holds no secrets — UPI ID/QR are shown to customers by design.
create table if not exists public.store_settings (
  id                          integer primary key default 1 check (id = 1),
  business_name               text not null default 'Sri Vartali Sarees',
  upi_id                      text,
  upi_qr_url                  text,
  payment_instructions        text,
  whatsapp_store_number       text,
  default_shipping_paise      integer not null default 0 check (default_shipping_paise >= 0),
  free_shipping_threshold_paise integer check (free_shipping_threshold_paise is null or free_shipping_threshold_paise >= 0),
  extra                       jsonb not null default '{}'::jsonb,
  updated_by                  uuid references public.profiles (id) on delete set null,
  updated_at                  timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id                uuid primary key default gen_random_uuid(),
  actor_profile_id  uuid references public.profiles (id) on delete set null,
  actor_role        app_role,
  action            text not null,
  entity_type       text,
  entity_id         text,
  old_value         jsonb,
  new_value         jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- RLS helper functions (security definer: avoid recursion on profiles)
--
-- Defined AFTER all tables: LANGUAGE sql functions validate table references
-- at CREATE time, so these must not precede public.profiles (the integration
-- deploy of 2026-10-02 failed exactly there — SQLSTATE 42P01).
-- ---------------------------------------------------------------------------
create or replace function public.current_app_role()
returns app_role
language sql
stable
security definer set search_path = public
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_client_role()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.current_app_role() in ('CLIENT_OWNER', 'CLIENT_STAFF');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.current_app_role() = 'SUPER_ADMIN';
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at triggers for every table that has the column
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'customers', 'addresses', 'categories', 'collections',
    'products', 'product_variants', 'inventory', 'carts', 'cart_items',
    'orders', 'payments', 'shipments', 'reviews', 'store_settings'
  ]
  loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I', t, t);
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at()', t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed: singleton settings + launch categories (§4) — data, not schema
-- ---------------------------------------------------------------------------
insert into public.store_settings (id) values (1) on conflict (id) do nothing;

insert into public.categories (name, slug, position, attribute_schema) values
  ('Sarees', 'sarees', 1, '[
    {"key":"fabric","label":"Fabric","type":"text","filterable":true},
    {"key":"color","label":"Color","type":"option","filterable":true,
     "options":["Wine","Red","Pink","Blue","Green","Ivory","Gold","Black","Purple"]},
    {"key":"weave","label":"Weave","type":"text","filterable":true},
    {"key":"origin","label":"Origin","type":"text","filterable":true},
    {"key":"zari","label":"Zari","type":"text","filterable":false},
    {"key":"occasion","label":"Occasion","type":"option","filterable":true,
     "options":["Wedding","Festive","Party","Casual","Formal"]},
    {"key":"saree_length","label":"Saree Length","type":"text","filterable":false},
    {"key":"blouse_included","label":"Blouse Included","type":"boolean","filterable":false},
    {"key":"blouse_length","label":"Blouse Length","type":"text","filterable":false},
    {"key":"care_instructions","label":"Care","type":"text","filterable":false}
  ]'::jsonb),
  ('Dresses', 'dresses', 2, '[
    {"key":"material","label":"Material","type":"text","filterable":true},
    {"key":"color","label":"Color","type":"option","filterable":true,
     "options":["Wine","Red","Pink","Blue","Green","Ivory","Gold","Black"]},
    {"key":"size","label":"Size","type":"option","filterable":true,
     "options":["XS","S","M","L","XL","XXL"]},
    {"key":"fit","label":"Fit","type":"text","filterable":true},
    {"key":"sleeve_type","label":"Sleeve Type","type":"text","filterable":false},
    {"key":"neckline","label":"Neckline","type":"text","filterable":false},
    {"key":"dress_length","label":"Dress Length","type":"text","filterable":false},
    {"key":"occasion","label":"Occasion","type":"option","filterable":true,
     "options":["Wedding","Festive","Party","Casual","Formal"]},
    {"key":"care_instructions","label":"Care","type":"text","filterable":false}
  ]'::jsonb),
  ('Kurtis', 'kurtis', 3, '[
    {"key":"material","label":"Material","type":"text","filterable":true},
    {"key":"color","label":"Color","type":"option","filterable":true,
     "options":["Wine","Red","Pink","Blue","Green","Ivory","Gold","Black"]},
    {"key":"size","label":"Size","type":"option","filterable":true,
     "options":["XS","S","M","L","XL","XXL"]},
    {"key":"occasion","label":"Occasion","type":"option","filterable":true,
     "options":["Wedding","Festive","Party","Casual","Formal"]}
  ]'::jsonb),
  ('Lehengas', 'lehengas', 4, '[]'::jsonb),
  ('Blouses', 'blouses', 5, '[]'::jsonb),
  ('Dupattas', 'dupattas', 6, '[]'::jsonb),
  ('Accessories', 'accessories', 7, '[]'::jsonb)
on conflict (slug) do nothing;

-- Subcategories for the launch category (§4) — positions under 'sarees'
insert into public.categories (parent_id, name, slug, position)
select p.id, v.name, v.slug, v.pos
from public.categories p,
     (values
       ('Silk Sarees', 'sarees-silk', 1),
       ('Cotton Sarees', 'sarees-cotton', 2),
       ('Organza Sarees', 'sarees-organza', 3),
       ('Handloom Sarees', 'sarees-handloom', 4),
       ('Wedding Sarees', 'sarees-wedding', 5)
     ) as v(name, slug, pos)
where p.slug = 'sarees'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security — enabled on EVERY table (spec rule 21)
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.profiles              force row level security;
alter table public.customers             enable row level security;
alter table public.customers             force row level security;
alter table public.addresses             enable row level security;
alter table public.addresses             force row level security;
alter table public.categories            enable row level security;
alter table public.categories            force row level security;
alter table public.collections           enable row level security;
alter table public.collections           force row level security;
alter table public.collection_products   enable row level security;
alter table public.collection_products   force row level security;
alter table public.products              enable row level security;
alter table public.products              force row level security;
alter table public.product_media         enable row level security;
alter table public.product_media         force row level security;
alter table public.product_variants      enable row level security;
alter table public.product_variants      force row level security;
alter table public.inventory             enable row level security;
alter table public.inventory             force row level security;
alter table public.inventory_movements   enable row level security;
alter table public.inventory_movements   force row level security;
alter table public.wishlists             enable row level security;
alter table public.wishlists             force row level security;
alter table public.wishlist_items        enable row level security;
alter table public.wishlist_items        force row level security;
alter table public.carts                 enable row level security;
alter table public.carts                 force row level security;
alter table public.cart_items            enable row level security;
alter table public.cart_items            force row level security;
alter table public.orders                enable row level security;
alter table public.orders                force row level security;
alter table public.order_items           enable row level security;
alter table public.order_items           force row level security;
alter table public.payments              enable row level security;
alter table public.payments              force row level security;
alter table public.shipments             enable row level security;
alter table public.shipments             force row level security;
alter table public.order_status_history  enable row level security;
alter table public.order_status_history  force row level security;
alter table public.whatsapp_messages     enable row level security;
alter table public.whatsapp_messages     force row level security;
alter table public.whatsapp_consents     enable row level security;
alter table public.whatsapp_consents     force row level security;
alter table public.webhook_events        enable row level security;
alter table public.webhook_events        force row level security;
alter table public.reviews               enable row level security;
alter table public.reviews               force row level security;
alter table public.store_settings        enable row level security;
alter table public.store_settings        force row level security;
alter table public.audit_logs            enable row level security;
alter table public.audit_logs            force row level security;

-- ---- profiles -------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_super_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert
  with check (id = auth.uid());  -- role is normalized by guard_profile_role

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());
-- deletes ride the auth.users cascade; no delete policy.

-- ---- customers / addresses --------------------------------------------------
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select
  using (user_id = auth.uid() or public.is_client_role());

drop policy if exists customers_insert_own on public.customers;
create policy customers_insert_own on public.customers for insert
  with check (user_id = auth.uid());

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update
  using (user_id = auth.uid() or public.is_client_role())
  with check (user_id = auth.uid() or public.is_client_role());

drop policy if exists customers_delete_client on public.customers;
create policy customers_delete_client on public.customers for delete
  using (public.is_client_role());

drop policy if exists addresses_select on public.addresses;
create policy addresses_select on public.addresses for select
  using (
    exists (select 1 from public.customers c
            where c.id = addresses.customer_id and c.user_id = auth.uid())
    or public.is_client_role()
  );

drop policy if exists addresses_write_owner on public.addresses;
create policy addresses_write_owner on public.addresses for insert
  with check (
    exists (select 1 from public.customers c
            where c.id = addresses.customer_id and c.user_id = auth.uid())
  );

drop policy if exists addresses_update_owner on public.addresses;
create policy addresses_update_owner on public.addresses for update
  using (
    exists (select 1 from public.customers c
            where c.id = addresses.customer_id and c.user_id = auth.uid())
  );

drop policy if exists addresses_delete_owner on public.addresses;
create policy addresses_delete_owner on public.addresses for delete
  using (
    exists (select 1 from public.customers c
            where c.id = addresses.customer_id and c.user_id = auth.uid())
  );

-- ---- catalog --------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select
  using (is_active or public.is_client_role() or public.is_super_admin());

drop policy if exists categories_write_client on public.categories;
create policy categories_write_client on public.categories for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists categories_update_client on public.categories;
create policy categories_update_client on public.categories for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists categories_delete_client on public.categories;
create policy categories_delete_client on public.categories for delete
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists collections_select on public.collections;
create policy collections_select on public.collections for select
  using (is_active or public.is_client_role() or public.is_super_admin());

drop policy if exists collections_write_client on public.collections;
create policy collections_write_client on public.collections for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists collections_update_client on public.collections;
create policy collections_update_client on public.collections for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists collections_delete_client on public.collections;
create policy collections_delete_client on public.collections for delete
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists collection_products_select on public.collection_products;
create policy collection_products_select on public.collection_products for select
  using (
    exists (select 1 from public.collections c
            where c.id = collection_products.collection_id and c.is_active)
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists collection_products_write_client on public.collection_products;
create policy collection_products_write_client on public.collection_products for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists collection_products_delete_client on public.collection_products;
create policy collection_products_delete_client on public.collection_products for delete
  using (public.is_client_role() or public.is_super_admin());

-- ---- products ---------------------------------------------------------------
-- Public sees PUBLISHED products only; zero-stock stays PUBLISHED+SOLD_OUT
-- (sold-out is an inventory state, not unpublishing — §16).
drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (status = 'PUBLISHED' or public.is_client_role() or public.is_super_admin());

drop policy if exists products_insert_client on public.products;
create policy products_insert_client on public.products for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists products_update_client on public.products;
create policy products_update_client on public.products for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists products_delete_client on public.products;
create policy products_delete_client on public.products for delete
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists product_media_select on public.product_media;
create policy product_media_select on public.product_media for select
  using (
    exists (select 1 from public.products p
            where p.id = product_media.product_id and p.status = 'PUBLISHED')
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists product_media_write_client on public.product_media;
create policy product_media_write_client on public.product_media for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists product_media_update_client on public.product_media;
create policy product_media_update_client on public.product_media for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists product_media_delete_client on public.product_media;
create policy product_media_delete_client on public.product_media for delete
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists product_variants_select on public.product_variants;
create policy product_variants_select on public.product_variants for select
  using (
    exists (select 1 from public.products p
            where p.id = product_variants.product_id and p.status = 'PUBLISHED')
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists product_variants_write_client on public.product_variants;
create policy product_variants_write_client on public.product_variants for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists product_variants_update_client on public.product_variants;
create policy product_variants_update_client on public.product_variants for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists product_variants_delete_client on public.product_variants;
create policy product_variants_delete_client on public.product_variants for delete
  using (public.is_client_role() or public.is_super_admin());

-- Public may read stock of published products (product card low-stock/sold-out
-- states, §12); exact quantities are not sensitive at this scale.
drop policy if exists inventory_select on public.inventory;
create policy inventory_select on public.inventory for select
  using (
    exists (select 1 from public.products p
            where p.id = inventory.product_id and p.status = 'PUBLISHED')
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists inventory_write_client on public.inventory;
create policy inventory_write_client on public.inventory for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists inventory_update_client on public.inventory;
create policy inventory_update_client on public.inventory for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists inventory_delete_client on public.inventory;
create policy inventory_delete_client on public.inventory for delete
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists inventory_movements_select_client on public.inventory_movements;
create policy inventory_movements_select_client on public.inventory_movements for select
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists inventory_movements_insert_client on public.inventory_movements;
create policy inventory_movements_insert_client on public.inventory_movements for insert
  with check (public.is_client_role() or public.is_super_admin());
-- movements are append-only: no update/delete policies.

-- ---- wishlists ---------------------------------------------------------------
drop policy if exists wishlists_select_owner on public.wishlists;
create policy wishlists_select_owner on public.wishlists for select
  using (exists (select 1 from public.customers c
                 where c.id = wishlists.customer_id and c.user_id = auth.uid()));

drop policy if exists wishlists_insert_owner on public.wishlists;
create policy wishlists_insert_owner on public.wishlists for insert
  with check (exists (select 1 from public.customers c
                      where c.id = wishlists.customer_id and c.user_id = auth.uid()));

drop policy if exists wishlists_delete_owner on public.wishlists;
create policy wishlists_delete_owner on public.wishlists for delete
  using (exists (select 1 from public.customers c
                 where c.id = wishlists.customer_id and c.user_id = auth.uid()));

drop policy if exists wishlist_items_select_owner on public.wishlist_items;
create policy wishlist_items_select_owner on public.wishlist_items for select
  using (exists (select 1 from public.wishlists w
                 join public.customers c on c.id = w.customer_id
                 where w.id = wishlist_items.wishlist_id and c.user_id = auth.uid()));

drop policy if exists wishlist_items_insert_owner on public.wishlist_items;
create policy wishlist_items_insert_owner on public.wishlist_items for insert
  with check (exists (select 1 from public.wishlists w
                      join public.customers c on c.id = w.customer_id
                      where w.id = wishlist_items.wishlist_id and c.user_id = auth.uid()));

drop policy if exists wishlist_items_delete_owner on public.wishlist_items;
create policy wishlist_items_delete_owner on public.wishlist_items for delete
  using (exists (select 1 from public.wishlists w
                 join public.customers c on c.id = w.customer_id
                 where w.id = wishlist_items.wishlist_id and c.user_id = auth.uid()));

-- ---- carts: NO policies on purpose (server-only via admin client) -----------

-- ---- orders and friends ------------------------------------------------------
-- Orders are created by the checkout route (service role); customers read
-- their own; client roles run the business (updates: statuses, verification,
-- shipping). No insert policy — the browser never creates orders directly.
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (
    exists (select 1 from public.customers c
            where c.id = orders.customer_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists orders_update_client on public.orders;
create policy orders_update_client on public.orders for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = order_items.order_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select
  using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = payments.order_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists payments_write_client on public.payments;
create policy payments_write_client on public.payments for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists payments_update_client on public.payments;
create policy payments_update_client on public.payments for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments for select
  using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = shipments.order_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists shipments_write_client on public.shipments;
create policy shipments_write_client on public.shipments for insert
  with check (public.is_client_role() or public.is_super_admin());

drop policy if exists shipments_update_client on public.shipments;
create policy shipments_update_client on public.shipments for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists order_status_history_select on public.order_status_history;
create policy order_status_history_select on public.order_status_history for select
  using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = order_status_history.order_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );
-- written only by the status-history trigger.

-- ---- whatsapp / webhooks -------------------------------------------------------
drop policy if exists whatsapp_messages_select on public.whatsapp_messages;
create policy whatsapp_messages_select on public.whatsapp_messages for select
  using (
    exists (select 1 from public.orders o
            join public.customers c on c.id = o.customer_id
            where o.id = whatsapp_messages.order_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );
-- outbound sends + inbound captures are written server-side only.

drop policy if exists whatsapp_consents_select_admin on public.whatsapp_consents;
create policy whatsapp_consents_select_admin on public.whatsapp_consents for select
  using (public.is_super_admin());

drop policy if exists webhook_events_select_admin on public.webhook_events;
create policy webhook_events_select_admin on public.webhook_events for select
  using (public.is_super_admin());
-- webhook intake is a server route with signature verification (§46).

-- ---- reviews --------------------------------------------------------------------
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select
  using (
    is_approved
    or exists (select 1 from public.customers c
               where c.id = reviews.customer_id and c.user_id = auth.uid())
    or public.is_client_role() or public.is_super_admin()
  );

drop policy if exists reviews_insert_customer on public.reviews;
create policy reviews_insert_customer on public.reviews for insert
  with check (auth.uid() is not null);  -- moderation keeps them invisible until approved

drop policy if exists reviews_update_client on public.reviews;
create policy reviews_update_client on public.reviews for update
  using (public.is_client_role() or public.is_super_admin());

drop policy if exists reviews_delete_client on public.reviews;
create policy reviews_delete_client on public.reviews for delete
  using (public.is_client_role() or public.is_super_admin());

-- ---- settings & audit -------------------------------------------------------------
drop policy if exists store_settings_select_public on public.store_settings;
create policy store_settings_select_public on public.store_settings for select
  using (true);  -- no secrets: business name, UPI, QR, instructions

drop policy if exists store_settings_update_owner_admin on public.store_settings;
create policy store_settings_update_owner_admin on public.store_settings for update
  using (public.current_app_role() in ('CLIENT_OWNER', 'SUPER_ADMIN'));  -- §30

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs for select
  using (public.is_super_admin());
-- written server-side by audited actions (§45).

-- ---------------------------------------------------------------------------
-- Grants — Supabase default privileges normally cover these; explicit so the
-- schema also works when applied outside the SQL editor.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant execute on function public.next_product_code() to anon, authenticated, service_role;
grant execute on function public.next_order_number() to anon, authenticated, service_role;
grant execute on function public.current_app_role() to anon, authenticated, service_role;
grant execute on function public.is_client_role() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;
grant usage, select on sequence public.product_code_seq to anon, authenticated, service_role;
grant usage, select on sequence public.order_number_seq to anon, authenticated, service_role;

-- ============================================================================
-- Verification checklist after applying (docs/db/README.md):
--   1. every table has rowsecurity = true (pg_tables)
--   2. anon select on products returns only PUBLISHED rows
--   3. profile role changes rejected for non-super-admin actors
--   4. orders.total CHECK rejects inconsistent totals
-- ============================================================================
