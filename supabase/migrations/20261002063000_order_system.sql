-- ============================================================================
-- Sri Vartali — Phase 6: Order System (spec §22-§26, §54 Phase 6)
-- ============================================================================
-- Idempotent: safe to re-run (and safe when the Supabase integration
-- re-applies it after a pre-apply through the dispatch workflow).
--
-- What this adds:
--   * public.place_order(jsonb)      — atomic §22 steps 1-16 as one call:
--                                      re-fetch, re-price, reserve stock,
--                                      insert order + item snapshots,
--                                      movement rows. Service-role only.
--   * public.release_expired_reservations() — §26 sweep: cancel CREATED
--                                      orders past reservation_expires_at
--                                      and give their stock back.
--   * public.cancel_order(uuid, text) — client-side cancel: same release
--                                      path, guarded against VERIFIED
--                                      payments. Service-role only.
--   * partial index backing the sweep.
--
-- Schema fix carried here: the v1 CHECK
--     orders_totals_consistent: total = subtotal - discount + shipping
-- contradicted the §22 pricing engine shipped in Phase 5 (and the §15C
-- money model): `discount` is the informational you-save-vs-MRP figure —
-- the payable subtotal is already the SELLING price, so
--     total = subtotal + shipping.
-- Under the old CHECK any order with MRP savings could not be persisted.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Totals constraint fix (see header)
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_totals_consistent;
do $$ begin
  alter table public.orders
    add constraint orders_totals_consistent
    check (total_paise = subtotal_paise + shipping_paise);
exception when duplicate_object then null; end $$;

-- Partial index backing the reservation sweep.
create index if not exists idx_orders_open_reservation
  on public.orders (reservation_expires_at)
  where order_status = 'CREATED';

-- ---------------------------------------------------------------------------
-- §26 — release stock from expired reservations
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_reservations()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_order  record;
  v_item   record;
  v_inv    record;
  v_actual integer;
  v_count  integer := 0;
begin
  for v_order in
    select id from public.orders
    where order_status = 'CREATED'
      and payment_status in ('PENDING', 'CUSTOMER_CLAIMS_PAID')
      and reservation_expires_at is not null
      and reservation_expires_at < now()
    order by reservation_expires_at
    for update
  loop
    for v_item in
      select variant_id, quantity from public.order_items
      where order_id = v_order.id
    loop
      select id, reserved_quantity into v_inv
      from public.inventory where variant_id = v_item.variant_id
      for update;

      if v_inv.id is not null then
        v_actual := least(v_inv.reserved_quantity, v_item.quantity);
        if v_actual > 0 then
          update public.inventory
            set reserved_quantity = reserved_quantity - v_actual
            where id = v_inv.id;
          insert into public.inventory_movements
            (inventory_id, delta, delta_reserved, reason, order_id, note)
          values
            (v_inv.id, 0, -v_actual, 'ORDER_RELEASE', v_order.id,
             'Reservation window expired — stock released');
        end if;
      end if;
    end loop;

    -- Trigger orders_status_history records CREATED → CANCELLED (system actor).
    update public.orders set order_status = 'CANCELLED' where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- §22 — atomic order creation (steps 1-16)
-- ---------------------------------------------------------------------------
-- p_payload shape (TS: lib/orders/create.ts — the ONLY caller):
--   { lines:   [{ variantId: uuid, quantity: int }],
--     contact: { fullName, whatsappPhone, email|null },
--     address: { pinCode, house, street, area, landmark|null, district|null,
--                state|null, locality|null, country } }
-- Prices, stock and totals are re-derived from live rows inside this
-- function; nothing in the payload is price-shaped. Raises exceptions with
-- stable codes (STOCK_CHANGED / ITEM_UNAVAILABLE / INVALID_QUANTITY /
-- ORDER_EMPTY) the caller maps back to the checkout issues panel.
-- Returns { id, orderNumber }.
create or replace function public.place_order(p_payload jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_lines    jsonb := coalesce(p_payload -> 'lines', '[]'::jsonb);
  v_contact  jsonb := coalesce(p_payload -> 'contact', '{}'::jsonb);
  v_address  jsonb := coalesce(p_payload -> 'address', '{}'::jsonb);
  v_line     jsonb;
  v_variant  record;
  v_settings record;
  v_customer uuid;
  v_order    uuid;
  v_number   text;
  v_image    text;
  v_unit     integer;
  v_mrp      integer;
  v_qty      integer;
  v_seen     uuid[] := '{}';
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_shipping integer := 0;
begin
  if v_lines = '[]'::jsonb then
    raise exception 'ORDER_EMPTY';
  end if;
  if jsonb_array_length(v_lines) > 100 then
    raise exception 'ORDER_TOO_MANY_LINES';
  end if;

  -- Stock freed by expired reservations is buyable again (§26).
  perform public.release_expired_reservations();

  select default_shipping_paise, free_shipping_threshold_paise
    into v_settings
    from public.store_settings where id = 1;

  -- Phone-keyed customer book (visible later at /client/customers, §8).
  insert into public.customers (name, phone, email)
  values (
    v_contact ->> 'fullName',
    v_contact ->> 'whatsappPhone',
    nullif(v_contact ->> 'email', '')
  )
  on conflict (phone) do update
    set name = excluded.name,
        email = coalesce(excluded.email, public.customers.email),
        updated_at = now()
  returning id into v_customer;

  insert into public.orders
    (customer_id, customer_name, phone, email,
     shipping_address_snapshot, reservation_expires_at)
  values
    (v_customer,
     v_contact ->> 'fullName',
     v_contact ->> 'whatsappPhone',
     nullif(v_contact ->> 'email', ''),
     v_address,
     now() + interval '30 minutes')
  returning id, order_number into v_order, v_number;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    begin
      v_qty := (v_line ->> 'quantity')::int;
    exception when invalid_text_representation then
      v_qty := null;
    end;
    if v_qty is null or v_qty < 1 or v_qty > 100 then
      raise exception 'INVALID_QUANTITY';
    end if;

    -- Cart + buy-now must not stack on one variant (§18).
    continue when ((v_line ->> 'variantId')::uuid) = any (v_seen);

    select
        pv.id as variant_id, pv.sku, pv.name as variant_name,
        pv.attributes as variant_attributes,
        pv.selling_price_paise as variant_price, pv.mrp_paise as variant_mrp,
        p.id as product_id, p.name as product_name, p.product_code,
        p.status as product_status,
        p.selling_price_paise as product_price, p.mrp_paise as product_mrp,
        inv.id as inventory_id, inv.quantity, inv.reserved_quantity
      into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      join public.inventory inv on inv.variant_id = pv.id
      where pv.id = (v_line ->> 'variantId')::uuid and pv.is_active
      for update of inv;

    if not found then
      raise exception 'ITEM_UNAVAILABLE';
    end if;
    if v_variant.product_status <> 'PUBLISHED' then
      raise exception 'ITEM_UNAVAILABLE';
    end if;
    if v_variant.quantity - v_variant.reserved_quantity < v_qty then
      raise exception 'STOCK_CHANGED';
    end if;

    v_seen := v_seen || v_variant.variant_id;
    v_unit := coalesce(v_variant.variant_price, v_variant.product_price);
    v_mrp  := coalesce(v_variant.variant_mrp,   v_variant.product_mrp);

    select url into v_image
      from public.product_media
      where product_id = v_variant.product_id
      order by is_primary desc, position, created_at
      limit 1;

    insert into public.order_items
      (order_id, product_id, variant_id, product_code_snapshot,
       product_name_snapshot, image_snapshot, sku_snapshot,
       unit_price_paise, quantity, line_total_paise, selected_attributes)
    values
      (v_order, v_variant.product_id, v_variant.variant_id,
       v_variant.product_code, v_variant.product_name, v_image, v_variant.sku,
       v_unit, v_qty, v_unit * v_qty, v_variant.variant_attributes);

    update public.inventory
      set reserved_quantity = reserved_quantity + v_qty
      where id = v_variant.inventory_id;

    insert into public.inventory_movements
      (inventory_id, delta, delta_reserved, reason, order_id, note)
    values
      (v_variant.inventory_id, 0, v_qty, 'ORDER_RESERVE', v_order,
       'Order placed — reserved for pending payment');

    v_subtotal := v_subtotal + v_unit * v_qty;
    if v_mrp is not null and v_mrp > v_unit then
      v_discount := v_discount + (v_mrp - v_unit) * v_qty;
    end if;
  end loop;

  if v_subtotal = 0 then
    raise exception 'ORDER_EMPTY';
  end if;

  if v_settings.free_shipping_threshold_paise is not null
     and v_subtotal >= v_settings.free_shipping_threshold_paise then
    v_shipping := 0;
  else
    v_shipping := coalesce(v_settings.default_shipping_paise, 0);
  end if;

  update public.orders
    set subtotal_paise = v_subtotal,
        discount_paise = v_discount,
        shipping_paise = v_shipping,
        total_paise    = v_subtotal + v_shipping
    where id = v_order;

  return jsonb_build_object('id', v_order, 'orderNumber', v_number);
end;
$$;

-- ---------------------------------------------------------------------------
-- Client-side cancel (guarded release) — called via service role from a
-- role-gated server action. Refuses closed orders and VERIFIED payments
-- (a paid cancel is the Phase 8+ refund path, never silent).
-- ---------------------------------------------------------------------------
create or replace function public.cancel_order(p_order_id uuid, p_note text)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_order record;
  v_item  record;
  v_inv   record;
  v_actual integer;
begin
  select * into v_order from public.orders
    where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.order_status in ('CANCELLED', 'COMPLETED') then
    raise exception 'ORDER_CLOSED';
  end if;
  if v_order.payment_status = 'VERIFIED' then
    raise exception 'CANCEL_VERIFIED_PAYMENT';
  end if;

  for v_item in
    select variant_id, quantity from public.order_items
    where order_id = v_order.id
  loop
    select id, reserved_quantity into v_inv
      from public.inventory where variant_id = v_item.variant_id
      for update;
    if v_inv.id is not null then
      v_actual := least(v_inv.reserved_quantity, v_item.quantity);
      if v_actual > 0 then
        update public.inventory
          set reserved_quantity = reserved_quantity - v_actual
          where id = v_inv.id;
        insert into public.inventory_movements
          (inventory_id, delta, delta_reserved, reason, order_id, note)
        values
          (v_inv.id, 0, -v_actual, 'ORDER_RELEASE', v_order.id,
           coalesce(nullif(p_note, ''), 'Cancelled by client'));
      end if;
    end if;
  end loop;

  update public.orders
    set order_status = 'CANCELLED',
        reservation_expires_at = null
    where id = v_order.id;

  return jsonb_build_object('id', v_order.id, 'orderNumber', v_order.order_number);
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute grants: server (service role) only — the browser never creates,
-- cancels or sweeps orders directly (§46; mirrors the carts model).
-- ---------------------------------------------------------------------------
revoke execute on function public.place_order(jsonb) from public, anon, authenticated;
revoke execute on function public.release_expired_reservations() from public, anon, authenticated;
revoke execute on function public.cancel_order(uuid, text) from public, anon, authenticated;

grant execute on function public.place_order(jsonb) to service_role;
grant execute on function public.release_expired_reservations() to service_role;
grant execute on function public.cancel_order(uuid, text) to service_role;
