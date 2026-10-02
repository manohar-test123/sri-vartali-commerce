-- Seed the first launch collection (Phase 4, §41) so the storefront's
-- "Shop by collection" section and /collections/[slug] page have live data.
-- This is content, not schema: it is idempotent, and the owner can rename
-- or empty it from the CMS (collections UI lands with a later phase) or by
-- a follow-up ops run.
--
-- Apply via the "Apply DB migration" dispatch workflow (repo convention:
-- one-off SQL lives in supabase/ops/, NOT supabase/migrations/).

insert into public.collections (name, slug, description, is_active, position)
values (
  'Festive Edit',
  'festive-edit',
  'Occasion-ready picks for the season — rich weaves and deep hues, chosen to celebrate in.',
  true,
  1
)
on conflict (slug) do update
  set description = excluded.description,
      is_active = excluded.is_active,
      updated_at = now();

-- Every currently published product joins the edit.
insert into public.collection_products (collection_id, product_id)
select c.id, p.id
from public.collections c
cross join public.products p
where c.slug = 'festive-edit'
  and p.status = 'PUBLISHED'
on conflict (collection_id, product_id) do nothing;
