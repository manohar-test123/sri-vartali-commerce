-- Phase 9 — Shipping & tracking (§35-§37).
--
-- mark_shipped: the only path to fulfilment_status = SHIPPED. Mirrors
-- cancel_order (§26 discipline): locks the order row, guards the
-- transition, then in ONE transaction writes the §35 shipments row, flips
-- the order, and fulfils inventory — shipped stock stops being "reserved"
-- and leaves the on-hand count (ORDER_FULFIL movement, the reason Phase 1
-- reserved), so quantity - reserved stays truthful. least() caps keep the
-- §-rules "no negative stock" even if a manual adjustment ever desynced
-- the counters.
--
-- Idempotent-by-construction: no DDL, no data rewrite; re-applying is a
-- no-op (create or replace).

create or replace function public.mark_shipped(
  p_order_id uuid,
  p_courier text,
  p_tracking_id text,
  p_tracking_url text
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_order        record;
  v_item         record;
  v_inv          record;
  v_off_stock    integer;
  v_off_reserved integer;
begin
  select * into v_order from public.orders
    where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.order_status in ('CANCELLED', 'COMPLETED') then
    raise exception 'ORDER_CLOSED';
  end if;
  if v_order.fulfilment_status in ('SHIPPED', 'DELIVERED', 'RETURNED') then
    raise exception 'ALREADY_SHIPPED';
  end if;

  insert into public.shipments
    (order_id, courier, tracking_id, tracking_url, status, shipped_at)
  values
    (v_order.id,
     nullif(btrim(p_courier), ''),
     nullif(btrim(p_tracking_id), ''),
     nullif(btrim(p_tracking_url), ''),
     'SHIPPED', now());

  update public.orders
    set fulfilment_status = 'SHIPPED',
        shipped_at = now()
    where id = v_order.id;

  for v_item in
    select variant_id, quantity from public.order_items
      where order_id = v_order.id
  loop
    select id, quantity, reserved_quantity into v_inv
      from public.inventory where variant_id = v_item.variant_id
      for update;
    if v_inv.id is not null then
      v_off_stock    := least(v_inv.quantity, v_item.quantity);
      v_off_reserved := least(v_inv.reserved_quantity, v_item.quantity);
      update public.inventory
        set quantity        = quantity - v_off_stock,
            reserved_quantity = reserved_quantity - v_off_reserved
        where id = v_inv.id;
      insert into public.inventory_movements
        (inventory_id, delta, delta_reserved, reason, order_id, note)
      values
        (v_inv.id, -v_off_stock, -v_off_reserved, 'ORDER_FULFIL', v_order.id,
         'Shipped via ' || btrim(p_courier));
    end if;
  end loop;

  return jsonb_build_object(
    'id', v_order.id,
    'orderNumber', v_order.order_number,
    'courier', btrim(p_courier),
    'trackingId', btrim(p_tracking_id));
end;
$$;

-- Execute: server (service role) only — shipping is a dashboard action,
-- never a browser-direct call (§46; mirrors place_order / cancel_order).
revoke execute on function public.mark_shipped(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_shipped(uuid, text, text, text)
  to service_role;
