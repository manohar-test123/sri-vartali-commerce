-- 2026-10-10 — Seed a small sample catalog for a fresh project so the
-- storefront, cart and WhatsApp handoff can be exercised end to end
-- before real photography lands. Idempotent; the owner deletes these
-- rows from /client once real products exist (codes SVS-P-000001+).

insert into public.categories (name, slug, description, position)
values ('Silk Sarees', 'silk-sarees',
        'Handwoven silks for weddings, festivals and heirloom occasions.', 1)
on conflict (slug) do nothing;

-- Product 1: wine Kanjivaram
insert into public.products
  (name, slug, category_id, short_description, description, status,
   selling_price_paise, mrp_paise, published_at)
select 'Wine Kanjivaram Silk Saree', 'wine-kanjivaram-silk-saree', c.id,
  'Deep wine pure silk with a gold zari border.',
  'A handwoven Kanjivaram in deep wine with a contrast gold zari border and a matching unstitched blouse piece. Sample listing — replace with your own.',
  'PUBLISHED', 299900, 399900, now()
from public.categories c
where c.slug = 'silk-sarees'
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, name)
select p.id, p.product_code || '-wine', 'Wine'
from public.products p
where p.slug = 'wine-kanjivaram-silk-saree'
on conflict (sku) do nothing;

insert into public.inventory (product_id, variant_id, quantity)
select p.id, v.id, 5
from public.products p
join public.product_variants v on v.product_id = p.id
where p.slug = 'wine-kanjivaram-silk-saree'
on conflict (variant_id) do nothing;

insert into public.product_media (product_id, url, alt, position, is_primary)
select p.id, '/brand/saree-wine.svg',
       'Wine Kanjivaram silk saree with a gold zari border', 0, true
from public.products p
where p.slug = 'wine-kanjivaram-silk-saree';

-- Product 2: teal Banarasi
insert into public.products
  (name, slug, category_id, short_description, description, status,
   selling_price_paise, mrp_paise, published_at)
select 'Teal Banarasi Silk Saree', 'teal-banarasi-silk-saree', c.id,
  'Peacock-teal Banarasi with buti work.',
  'A Banarasi weave in peacock teal with gold buti work across the body and a rich pallu. Sample listing — replace with your own.',
  'PUBLISHED', 349900, 479900, now()
from public.categories c
where c.slug = 'silk-sarees'
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, name)
select p.id, p.product_code || '-teal', 'Teal'
from public.products p
where p.slug = 'teal-banarasi-silk-saree'
on conflict (sku) do nothing;

insert into public.inventory (product_id, variant_id, quantity)
select p.id, v.id, 3
from public.products p
join public.product_variants v on v.product_id = p.id
where p.slug = 'teal-banarasi-silk-saree'
on conflict (variant_id) do nothing;

insert into public.product_media (product_id, url, alt, position, is_primary)
select p.id, '/brand/saree-teal.svg',
       'Teal Banarasi silk saree with gold buti work', 0, true
from public.products p
where p.slug = 'teal-banarasi-silk-saree';

-- Fold every published product into the Festive Edit collection.
insert into public.collection_products (collection_id, product_id)
select c.id, p.id
from public.collections c
cross join public.products p
where c.slug = 'festive-edit' and p.status = 'PUBLISHED'
on conflict (collection_id, product_id) do nothing;
