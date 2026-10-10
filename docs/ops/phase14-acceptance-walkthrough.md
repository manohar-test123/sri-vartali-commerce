# Phase 14 acceptance walkthrough (§58 / §59) — owner runbook

The code audit for every checklist item is in PR #29's description. Two
items were fixed in code there (order-ID search, touch reorder); the rest
already passed. What code review **cannot** prove is that the flows feel
right on a real phone with real data — that's this runbook, ~15 minutes,
run by the owner (ManoharPaturi) on production after the PR merges.

Nothing here creates permanent data except where noted; the one test
order lands on the Phase 15 purge list.

## §58 — Client (do this signed in at /client on your phone)

1. **Create a product** — /client/products/new → pick a category → fill
   the wizard → Save draft. ✅ it appears in /client/products.
2. **Upload images from phone** — open the product → Photos → **+ Upload**
   → your gallery/camera opens → pick 2–3 images → progress bars complete
   → cards appear. (If Cloudinary is not configured, use "Add by URL"
   instead — that also passes.)
3. **Reorder images** — on the phone, tap **◀ / ▶** on an image card and
   confirm the order changes and sticks after reload. On desktop, also
   drag a card. ✅ both paths persist.
4. **Choose primary image** — "make primary" on a non-first image → the
   gold PRIMARY badge moves. ✅
5. **Change description / price** — edit both in the product editor →
   autosave fires → reload shows the new values. ✅
6. **Change stock** — /client/inventory → adjust a quantity → the
   movements ledger records it. ✅
7. **Duplicate product** — Duplicate on a product row → a new draft with
   "(copy)" appears. ✅
8. **Publish / unpublish** — Publish the draft → it shows on /shop;
   Unpublish → it disappears. ✅
9. **Find order by Order ID** — /client/orders → paste an order number
   (or part of it, or a customer name/phone) into **Find** → the row
   appears; filter chips keep the search. ✅ *(new in this PR)*
10. **Verify payment** — open the test order → "Verify payment" (+ UTR
    optional) → payment chip flips to Verified. ✅
11. **Courier / tracking ID / URL / mark shipped** — fill the three
    fields → MARK SHIPPED → stock drops (reserved released + fulfilled)
    and the shipped message builder appears. ✅

## §59 — Customer (phone, incognito window)

1. **What is this product? / cost? / in stock?** — open any product:
    name, description, attributes, price + MRP strike, In stock badge. ✅
2. **What variant am I buying?** — a product with multiple variants
    shows the variant chips; the picked one is highlighted. ✅
3. **What is my total?** — cart + checkout: estimated total, then the
    **verified** total after the server re-check. ✅
4. **Where is it being delivered?** — checkout address form; the
    confirmation page shows "Delivering to" with the snapshot. ✅
5. **What happens after I continue to WhatsApp?** — the button says
    what happens; after placing, WhatsApp opens prefilled (or the page
    explains the reservation when the number isn't configured). ✅
6. **Order ID / payment verified?** — the confirmation page headline is
    the Order ID; the payment chip answers the verify question. ✅
7. **Shipped? Tracking ID? Where to track?** — /track-order with order
    ID + phone: the ladder shows Shipped, the courier block shows the
    Tracking ID, and "Track with courier ↗" (or the fallback line). ✅

## Cleanup

- Delete the duplicate-draft products and any throwaway edits from
  steps 1–8 (or mark the test product for the Phase 15 purge list).
- Record ✅/❌ per step on PR #29 — any ❌ becomes a fix-branch, not a
  launch blocker unless it repeats on retry.
