-- 20261009 — Purge of test data from production (04-OPEN-ITEMS.md item 2).
--
-- Owner-approved this session. Targets exactly the handoff list:
--   SVS-ORD-20261002-00002 … SVS-ORD-20261002-00005
--   SVS-ORD-20261003-00006  ("Phase9 Ship Test", SHIPPED — shipment cascades)
--   SVS-P-000003            (empty draft product, owner said deletable)
--
-- Applied via the "Apply DB migration" dispatch workflow (postgres role).
-- NOT in supabase/migrations/ on purpose: the Supabase GitHub integration
-- auto-applies that folder on merge to main — ops one-offs stay out of it.
--
-- Idempotent: every statement matches by key, so a re-run is a no-op.
-- Order matters: release reservations (mirroring cancel_order) BEFORE the
-- deletes, orders BEFORE the product (order_items → products is RESTRICT).

\echo '=== BEFORE: snapshot of target orders ==='
select o.order_number, o.order_status, o.payment_status, o.fulfilment_status,
       o.total_paise, o.created_at,
       (select count(*) from public.order_items i where i.order_id = o.id) as items
from public.orders o
where o.order_number in (
  'SVS-ORD-20261002-00002', 'SVS-ORD-20261002-00003', 'SVS-ORD-20261002-00004',
  'SVS-ORD-20261002-00005', 'SVS-ORD-20261003-00006'
)
order by o.order_number;

\echo '=== BEFORE: snapshot of target product ==='
select p.product_code, p.name, p.status,
       (select count(*) from public.order_items i where i.product_id = p.id) as order_refs,
       (select coalesce(sum(inv.quantity), 0) from public.inventory inv where inv.product_id = p.id) as stock
from public.products p
where p.product_code = 'SVS-P-000003';

\echo '=== STEP 1: release reservations still held by target orders (mirrors cancel_order) ==='
do $purge$
declare
  v_order record;
  v_item  record;
  v_inv   record;
  v_actual integer;
  v_released integer := 0;
begin
  for v_order in
    select id from public.orders
    where order_number in (
      'SVS-ORD-20261002-00002', 'SVS-ORD-20261002-00003', 'SVS-ORD-20261002-00004',
      'SVS-ORD-20261002-00005', 'SVS-ORD-20261003-00006'
    )
    and order_status not in ('CANCELLED', 'COMPLETED')
    for update
  loop
    for v_item in
      select variant_id, quantity from public.order_items where order_id = v_order.id
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
             'Test-order purge 2026-10-09 (owner approved)');
          v_released := v_released + v_actual;
        end if;
      end if;
    end loop;
  end loop;
  raise notice 'STEP 1 done: released % reserved unit(s)', v_released;
end
$purge$;

\echo '=== STEP 2: delete test orders (cascades items, payments, shipments, status history) ==='
delete from public.orders
where order_number in (
  'SVS-ORD-20261002-00002', 'SVS-ORD-20261002-00003', 'SVS-ORD-20261002-00004',
  'SVS-ORD-20261002-00005', 'SVS-ORD-20261003-00006'
);

\echo '=== STEP 3: delete the empty draft product (guarded: draft + zero order references) ==='
delete from public.products p
where p.product_code = 'SVS-P-000003'
  and p.status = 'DRAFT'
  and not exists (
    select 1 from public.order_items i where i.product_id = p.id
  );

\echo '=== AFTER: read-back — expect 0 / 0 ==='
select count(*) as target_orders_remaining
from public.orders
where order_number in (
  'SVS-ORD-20261002-00002', 'SVS-ORD-20261002-00003', 'SVS-ORD-20261002-00004',
  'SVS-ORD-20261002-00005', 'SVS-ORD-20261003-00006'
);

select count(*) as target_product_remaining
from public.products
where product_code = 'SVS-P-000003';

\echo '=== AFTER: ledger rows written by this purge ==='
select count(*) as release_movements
from public.inventory_movements
where note = 'Test-order purge 2026-10-09 (owner approved)';

\echo '=== AFTER: every order still in production (context — no PII columns) ==='
select order_number, order_status, payment_status, fulfilment_status, created_at
from public.orders
order by created_at;

\echo '=== §30 store_settings current state (owner-owed fields — no secrets by design) ==='
select business_name,
       upi_id,
       (upi_qr_url is not null) as has_qr_url,
       (payment_instructions is not null) as has_payment_instructions,
       whatsapp_store_number,
       updated_at
from public.store_settings;
