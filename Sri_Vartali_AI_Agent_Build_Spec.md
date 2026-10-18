# Sri Vartali Fashion Commerce Platform
## AI-Agent Build Specification

**Version:** 3.1
**Launch brand:** Sri Vartali Sarees
**Architecture goal:** Launch as a premium saree store, but keep the platform generic enough to expand into dresses, kurtis, lehengas, blouses, dupattas, accessories, and other fashion categories without rebuilding the core system.

---

# Revision History

**v3.1 — 2026-10-11 (Phases 16–17, owner-directed product changes).** This
revision records what the platform actually ships today and the places where
the owner overrode the original plan:

- **Buy Now removed everywhere** (§19 rewritten): the product page's instant
  path is now a **Buy via WhatsApp** deep link — no server state, no
  temporary cart. Checkout remains the cart's tracked-order path.
- **Track Order removed everywhere** (§7, §37, §60 updated): the page, route,
  sitemap entry and lookup were deleted. Order status lives on the public
  `/order/[orderNumber]` page, in the client dashboard, and in WhatsApp
  tracking messages.
- **WhatsApp-first commerce added** (§2, §13, §18, §48): the cart's primary
  CTA is **Buy via WhatsApp** (server-quoted cart prefilled into the
  supplier chat); product pages prefill product + variant + live quantity;
  a persistent WhatsApp/phone contact dock rides every storefront page.
- **Chrome:** brand logo in header/footer (`public/brand/logo.svg`,
  placeholder until owner artwork), active-route highlighting in the header
  rail, containers widened to 1440px.
- **Infra:** fresh Supabase project `sri-vartali-commerce`
  (Mumbai, ref `ifhllndlljxppgjukcgu`, owner: Pushpak) fully migrated,
  seeded and SUPER_ADMIN-bootstrapped; a Vercel production deploy verified
  end-to-end and was then **taken down at the owner's request** — the site
  currently runs local-only. Outbound Postgres (5432/6543) is blocked on
  the owner's network; one-off SQL rides the dashboard or a temporary Edge
  Function.

**v3.0 — 2026-10-02.** Original 63-section plan; Phases 1–15 built per this
version (see §54 for the phase log, which v3.1 extends through Phase 17).

---

# 1. Project Goal

Build three clearly separated areas:

1. **Customer Storefront** — browse, search, filter, cart, multi-product orders, checkout, address validation, WhatsApp payment coordination, order tracking.
2. **Client/Seller Dashboard** — product creation, image upload, pricing, stock, order handling, payment verification, shipping/tracking.
3. **Super Admin Dashboard** — technical configuration, users/roles, integrations, webhook logs, failed WhatsApp messages, audit logs, system diagnostics.

The system must follow this rule:

```text
DATABASE = source of truth
WHATSAPP = communication/payment coordination
CLIENT DASHBOARD = business operations
SUPER ADMIN = technical operations
```

WhatsApp must never become the database.

---

# 2. Complete Customer Order Flow

```text
CUSTOMER
   ↓
STORE
   ↓
PRODUCT OR MULTIPLE PRODUCTS
   ↓
CART
   ↓
CHECKOUT
   ↓
CUSTOMER FILLS ADDRESS
   ↓
PIN CODE VALIDATION
   ↓
SERVER VALIDATES:
- products
- prices
- stock
- variants
- address
- totals
   ↓
CREATE ORDER IN SUPABASE
   ↓
GENERATE ORDER ID
   ↓
SAVE ORDER ITEMS + ADDRESS SNAPSHOT
   ↓
PAYMENT STATUS = PENDING
   ↓
ORDER APPEARS IN CLIENT DASHBOARD
   ↓
OPEN CUSTOMER'S WHATSAPP
   ↓
PREFILLED ORDER MESSAGE
   ↓
CUSTOMER TAPS SEND
   ↓
CLIENT WHATSAPP RECEIVES ORDER
   ↓
AUTOMATION REPLIES:
- order acknowledgement
- payment instructions
- QR image
- total amount
   ↓
CUSTOMER PAYS
   ↓
CUSTOMER MAY REPLY "PAID"
   ↓
PAYMENT STATUS = CUSTOMER_CLAIMS_PAID
   ↓
CLIENT MANUALLY CHECKS PAYMENT
   ↓
CLIENT CLICKS VERIFY PAYMENT
   ↓
PAYMENT STATUS = VERIFIED
   ↓
AUTOMATIC WHATSAPP PAYMENT CONFIRMATION
   ↓
CLIENT PACKS ORDER
   ↓
CLIENT ENTERS:
- Courier
- Tracking ID
- Tracking URL
   ↓
CLIENT CLICKS MARK AS SHIPPED
   ↓
AUTOMATIC WHATSAPP:
- Order ID
- Courier
- Tracking ID
- Tracking URL
- Shipping confirmation
```

Important: WhatsApp deep links can prefill text, but the customer must tap **Send**.

**v3.1 addition — WhatsApp-first entry points.** Alongside the tracked flow
above (which is unchanged and remains the only path that creates an order),
customers now have two direct supplier-chat handoffs that create **no** order
row — they are inquiries the supplier converts in chat:

```text
CART   → "Buy via WhatsApp"  → prefilled server-quoted cart (items, IDs,
                                variants, qty, totals)
PRODUCT→ "Buy via WhatsApp"  → prefilled product + variant + live quantity
```

Rule 9 ("create the order before opening WhatsApp") applies to order
placement; these handoffs deliberately happen **before** any order exists,
so they never violate it. If the chat converts, the supplier directs the
customer through checkout, or places the order from the dashboard.

---

# 3. Product ID and Order ID

Both are mandatory.

Use UUIDs internally and readable codes externally.

## Product IDs

```text
SVS-P-000001
SVS-P-000002
SVS-P-000003
```

Do not encode the category into the ID. Avoid IDs like `SVS-SAREE-...`, because the platform must support future fashion categories.

## Order IDs

```text
SVS-ORD-20261002-00001
SVS-ORD-20261002-00002
```

## Variant SKUs

```text
SVS-P-000042-RED-S
SVS-P-000042-RED-M
SVS-P-000042-RED-L
```

For a non-variant product:

```text
SVS-P-000042-DEFAULT
```

---

# 4. Fashion-First Catalog Model

Do not hard-code the database around sarees.

Recommended hierarchy:

```text
Fashion
│
├── Sarees
│   ├── Silk Sarees
│   ├── Cotton Sarees
│   ├── Organza Sarees
│   ├── Handloom Sarees
│   └── Wedding Sarees
│
├── Dresses
│   ├── Ethnic Dresses
│   ├── Party Dresses
│   └── Casual Dresses
│
├── Kurtis
├── Lehengas
├── Blouses
├── Dupattas
└── Accessories
```

Category-specific attributes should be dynamic.

### Saree fields

```text
Fabric
Color
Weave
Origin
Zari
Occasion
Saree Length
Blouse Included
Blouse Length
Care Instructions
```

### Dress fields

```text
Material
Color
Size
Fit
Sleeve Type
Neckline
Dress Length
Occasion
Care Instructions
```

The client product editor must change fields automatically when the category changes.

---

# 5. Recommended Stack

```text
Frontend        Next.js + React + TypeScript
Styling         Tailwind CSS
UI primitives   Radix UI + custom Sri Vartali components
Database        Supabase PostgreSQL
Auth            Supabase Auth
Security        Supabase RLS + server authorization
Realtime        Supabase Realtime only for client dashboard
Product Media   Cloudinary
WhatsApp        Official WhatsApp Business Platform / Cloud API
Address/PIN     Verified India PIN reference data
Source Control  GitHub
```

**v3.1 implementation note:** shipped stack matches the above except
Radix UI — the custom Sri Vartali components (dialogs, radios, sticky bars,
contact dock) cover the patterns without a primitives dependency; the
`lib/` layer grew `cart/`, `orders/`, `checkout/`, `catalog/`, `reviews/`,
`settings/`, `store/`, `security/`, `rate-limit` alongside the §50 sketch.
WhatsApp ordering runs on wa.me deep links today; the Cloud API wiring
(automation + webhooks) is built but unconfigured pending Meta credentials.
Cloudinary likewise (placeholder SVGs ship in `public/brand/`).

Avoid unnecessary complexity such as Kubernetes, microservices, Redis, Kafka, Elasticsearch, a separate Express backend, or GraphQL for this scale.

---

# 6. Roles

```text
CUSTOMER
CLIENT_OWNER
CLIENT_STAFF
SUPER_ADMIN
```

Future optional roles:

```text
PRODUCT_EDITOR
FULFILMENT_STAFF
SUPPORT_AGENT
```

### CLIENT_OWNER can

- create/edit products
- upload product images
- manage categories/collections
- manage stock
- view orders
- verify payments
- mark packed/shipped
- enter courier + tracking information
- manage business-facing settings

### SUPER_ADMIN can additionally

- manage users/roles
- manage WhatsApp integration
- manage Cloudinary integration
- inspect webhooks/logs
- inspect failed messages
- access audit/system diagnostics

Client users must never see API secrets or developer-level credentials.

---

# 7. Public Routes

Live today (v3.1):

```text
/
/shop
/category/[slug]
/collections/[slug]
/new-arrivals
/best-sellers
/search
/product/[slug]
/wishlist
/cart
/checkout
/order/[orderNumber]
/account/login
/account
/account/orders
/account/orders/[id]
/account/addresses
/account/profile
```

Removed (v3.1, owner direction — see §37):

```text
/track-order            # page deleted Phase 17; 404s, sitemap entry gone
```

Future info pages (not yet built; footer defers to them):

```text
/about
/contact
/faq
/shipping
/returns
/privacy
/terms
```

Optional later:

```text
/journal
/journal/[slug]
```

---

# 8. Client Dashboard Routes

```text
/client
/client/orders
/client/orders/[id]
/client/products
/client/products/new
/client/products/[id]
/client/categories
/client/collections
/client/inventory
/client/customers
/client/shipping
/client/reviews
/client/settings
```

---

# 9. Super Admin Routes

```text
/admin
/admin/client
/admin/users
/admin/roles
/admin/integrations/whatsapp
/admin/integrations/cloudinary
/admin/logs
/admin/webhooks
/admin/audit
/admin/system
```

---

# 10. Public Design Direction

Use the supplied Sri Vartali logo as the visual foundation.

Recommended look:

- deep wine
- antique gold
- warm ivory
- premium serif headings
- clean sans-serif UI
- editorial photography
- generous spacing
- restrained animation

Avoid marketplace clutter, too many badges, excessive gold borders, or over-animation.

---

# 11. Homepage

Recommended order:

```text
Announcement Bar
Header
Hero
Shop by Collection
New Arrivals
Brand Story
Best Sellers
Shop by Fabric
Shop by Occasion
Featured Collection
Reviews
WhatsApp Concierge
Instagram/Social
Newsletter
Footer
```

---

# 12. Product Card

Public ProductCard should support:

```text
Primary image
Secondary hover image
Product name
Category/material cue
Color
Price
MRP
Discount
Rating
Wishlist
New badge
Bestseller badge
Low-stock state
Sold-out state
```

---

# 13. Product Page

Required sections:

```text
Product Gallery
Product Name
Product ID
Rating
Price
MRP
Discount
Color
Material/Fabric
Variants
Stock
Add to Cart
Buy via WhatsApp      (v3.1: replaced "Buy Now" — §19)
Delivery PIN Checker
Description
Attributes
Measurements
Care
Shipping
Returns
Reviews
Related Products
Recently Viewed
```

Recommended gallery:

1. primary/model image
2. alternate angle
3. full product image
4. detail/border image
5. texture close-up
6. alternate/back image
7. blouse/variant detail where relevant
8. optional short video

---

# 14. Client Product CMS — Primary Requirement

The client must never need code changes to add products.

Product list:

```text
PRODUCTS

[ + ADD PRODUCT ]

Search products...

Product                ID              Price      Stock      Status
-------------------------------------------------------------------
[img] Wine Saree       SVS-P-000121   ₹5,999     3          Live
[img] Pink Dress       SVS-P-000122   ₹4,999     0          Sold Out
```

Actions:

```text
Edit
Duplicate
Unpublish
Archive
Delete
```

Prefer Archive over permanent Delete when a product is referenced by past orders.

---

# 15. Add Product Wizard

## A. Basic Information

```text
Product Name *
[________________________]

Product ID
SVS-P-000054
Automatically generated
Not editable

Category *
[ Saree ▼ ]

Subcategory
[ Kanchipuram Silk ▼ ]

Short Description
[________________________]

Full Description
[ rich text editor ]
```

## B. Product Images

```text
PRODUCT PHOTOS

┌──────────┐ ┌──────────┐ ┌──────────┐
│ Image 1  │ │ Image 2  │ │ Image 3  │
│ PRIMARY  │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘

[ + UPLOAD IMAGES ]

Drag images to reorder.
```

Required features:

- multi-file upload
- drag/drop
- mobile upload
- desktop upload
- previews
- reorder
- primary image
- delete image
- retry failed upload
- upload progress
- optional crop
- alt text

Primary image is used for product card, search, OpenGraph, WhatsApp preview, and default thumbnail.

## C. Pricing

```text
Selling Price *
₹ [________]

MRP
₹ [________]

Discount
Automatically calculated
```

Store money as integer paise, not floating-point values.

## D. Inventory

```text
Track Stock [✓]
Available Quantity [ 8 ]
Low Stock Warning [ 2 ]
```

Variants can have independent stock.

## E. Category-Specific Attributes

Fields change based on selected category.

## F. Shipping

```text
Weight
Length
Width
Height
Dispatch Time
Return Eligible
Shipping Notes
```

## G. SEO

Auto-generate defaults, with optional advanced override.

## H. Preview/Publish

```text
[ SAVE DRAFT ]
[ PREVIEW ]
[ PUBLISH ]
```

---

# 16. Product Draft/Publish States

```text
DRAFT
PUBLISHED
ARCHIVED
```

Stock zero should result in `PUBLISHED + SOLD_OUT`, not automatic page deletion.

Autosave drafts and show status such as:

```text
Saved 10:42 AM ✓
```

---

# 17. Duplicate Product

Duplicate should copy useful metadata but create a new Product ID.

Copy by default:

- descriptions
- category
- attributes
- care instructions
- shipping information
- optional pricing

Do not copy by default:

- Product ID
- SKU
- slug
- stock
- images unless explicitly selected

---

# 18. Cart and Multi-Product Orders

The cart must support multiple products and multiple quantities.

Example:

```text
Wine Silk Saree
SVS-P-00121
Qty 1
₹5,999

Pink Kurti
SVS-P-00183
Size M
Qty 2
₹1,799 × 2

Gold Blouse
SVS-P-00204
Size 36
Qty 1
₹1,499
```

One checkout generates one Order ID containing multiple order items.

**v3.1:** the cart's primary CTA is **Buy via WhatsApp** — the full
server-quoted cart (names, IDs, variants, quantities, totals) is prefilled
into the supplier's chat with no order created. "Proceed to checkout"
remains as the secondary, tracked-order path (§2). Prices in the prefilled
message come from the server quote, never the browser.

---

# 19. Buy Now — REMOVED (v3.1), replaced by Buy via WhatsApp

**Original v3.0 plan** (Buy Now → temporary cart → checkout) shipped in
Phase 5 and was **removed in Phase 17 at the owner's direction** — the
button, the `svs_buy_now` cookie, the checkout buy-now mode and its
abandon action are all gone from the codebase.

What lives there now:

```text
Product
→ Buy via WhatsApp (green, with WhatsApp glyph)
→ wa.me deep link to the single supplier number
→ prefilled: product name, Product ID, variant, live quantity,
   unit price, estimated total
→ customer taps Send
→ supplier confirms availability / payment in chat
```

Properties of the replacement:

- **No server state.** Unlike Buy Now it creates no cart, cookie or order —
  it is a pure informational deep link (§2 v3.1 addition).
- **Quantity- and variant-aware.** The message rebuilds live as the
  customer changes either; prices are the server-rendered product prices.
- **Single supplier number**, resolved once: `store_settings.whatsapp_store_number`
  → `NEXT_PUBLIC_WHATSAPP_STORE_NUMBER` fallback; the button hides when
  neither is configured.
- Customers who want a tracked order use **Add to Cart → checkout** — the
  §2 flow is unchanged and remains the only order-creating path.

---

# 20. Checkout

Contact:

```text
Full Name *
WhatsApp Number *
Email optional
```

Address:

```text
PIN Code *
House / Flat *
Street *
Area *
Landmark
District
State
Locality/Post Office
Country
```

---

# 21. PIN Validation

```text
Customer enters PIN
        ↓
Validate 6 digits
        ↓
Lookup PIN
        ↓
Autofill State + District
        ↓
Show matching Locality/Post Office options
```

Do not assume one PIN uniquely determines a full address.

---

# 22. Order Creation

When customer clicks **Continue to WhatsApp**, server must:

```text
1. Re-fetch products
2. Re-fetch variants
3. Verify current prices
4. Verify stock
5. Recalculate subtotal
6. Recalculate discount
7. Recalculate shipping
8. Recalculate total
9. Validate address
10. Generate Order ID
11. Create order
12. Create order_items
13. Save address snapshot
14. Set payment_status = PENDING
15. Set fulfilment_status = UNFULFILLED
16. Return WhatsApp URL
```

Never trust browser-supplied prices or totals.

---

# 23. Order Schema

```text
orders
------
id uuid primary key
order_number text unique
customer_id uuid nullable
customer_name
phone
email
shipping_address_snapshot jsonb
subtotal_paise
discount_paise
shipping_paise
total_paise
order_status
payment_status
fulfilment_status
created_at
updated_at
paid_at
shipped_at
delivered_at
```

---

# 24. Order Items

```text
order_items
-----------
id
order_id
product_id
variant_id nullable
product_code_snapshot
product_name_snapshot
image_snapshot
sku_snapshot
unit_price_paise
quantity
line_total_paise
selected_attributes jsonb
```

Snapshots are mandatory so historical orders remain correct after product edits.

---

# 25. Status Model

## Order Status

```text
CREATED
CONFIRMED
CANCELLED
COMPLETED
```

## Payment Status

```text
PENDING
CUSTOMER_CLAIMS_PAID
VERIFIED
REJECTED
REFUNDED
```

## Fulfilment Status

```text
UNFULFILLED
PROCESSING
PACKED
SHIPPED
DELIVERED
RETURNED
```

---

# 26. Inventory Reservation

For rare/one-piece products, reserve stock while payment is pending.

Recommended initial reservation window:

```text
30 minutes
```

If payment is not verified within the reservation window, release stock unless client manually extends the reservation.

---

# 27. Prefilled WhatsApp Order Message

Example:

```text
Hello Sri Vartali Sarees 👋

I would like to place an order.

Order ID:
SVS-ORD-20261002-00129

Products:

1. Wine Kanchipuram Silk Saree
Product ID: SVS-P-00121
Qty: 1
Price: ₹5,999

2. Pink Kurti
Product ID: SVS-P-00183
Size: M
Qty: 2
Price: ₹3,598

3. Gold Blouse
Product ID: SVS-P-00204
Size: 36
Qty: 1
Price: ₹1,499

TOTAL:
₹11,096

CUSTOMER:
Anjali Reddy
9876543210

DELIVERY ADDRESS:
Flat 302,
Street...
Area...
Chennai,
Tamil Nadu - 600042

Order Link:
https://domain.com/order/SVS-ORD-20261002-00129
```

---

# 28. WhatsApp Product Images

The deep link should send text plus product URLs.

Every product page should provide:

```text
og:title
og:image
og:description
```

so WhatsApp can generate a rich preview.

The client dashboard must always show exact product thumbnails.

---

# 29. Automatic Payment Instructions

After inbound customer message, automation replies:

```text
Thank you for your order, Anjali ✨

Order ID:
SVS-ORD-20261002-00129

Total:
₹11,096

Please complete your payment using the QR code below.

After completing payment, reply:
PAID

Our team will verify your payment and confirm your order.
```

Then send the configured UPI QR image.

---

# 30. Payment Settings

Client-owner settings:

```text
Business Name
UPI ID
QR Image
Payment Instructions
```

Only CLIENT_OWNER and SUPER_ADMIN may change these.

---

# 31. Customer Says PAID

A `PAID` message must only set:

```text
payment_status = CUSTOMER_CLAIMS_PAID
```

It must never verify payment automatically.

---

# 32. Client Payment Verification

Client order page:

```text
PAYMENT
Status: Customer claims paid

Optional UTR / Reference
[______________]

[ VERIFY PAYMENT ]
```

On verification:

```text
payment_status = VERIFIED
verified_by = client_user_id
verified_at = timestamp
```

Then automatically send customer confirmation.

---

# 33. Payment Confirmation WhatsApp

```text
Payment confirmed ✅

Thank you, Anjali!

Order ID:
SVS-ORD-20261002-00129

Amount received:
₹11,096

Your order is now being prepared.

We will message you again with tracking details once it is dispatched.
```

---

# 34. Client Order Detail Page

Show:

```text
ORDER ID
CUSTOMER
PHONE
ADDRESS
PRODUCT THUMBNAILS
PRODUCT IDs
VARIANTS
QUANTITIES
TOTAL
PAYMENT STATUS
FULFILMENT STATUS
```

Action panel:

```text
[ VERIFY PAYMENT ]
[ MARK PROCESSING ]
[ MARK PACKED ]

Courier
[________]

Tracking ID
[________]

Tracking URL
[________]

[ MARK SHIPPED ]
```

---

# 35. Shipment Schema

```text
shipments
---------
id
order_id
courier
tracking_id
tracking_url
status
shipped_at
delivered_at
created_at
updated_at
```

---

# 36. Shipping WhatsApp Message

When client clicks **MARK AS SHIPPED**, automatically send:

```text
Your Sri Vartali order has been shipped 📦✨

Order ID:
SVS-ORD-20261002-00129

Courier:
Delhivery

Tracking ID:
178921791712

Track your order:
https://tracking-url.example

Items:
3 products / 4 pieces

Your order is on its way.

Thank you for shopping with Sri Vartali Sarees ❤️
```

If using a WhatsApp template, add a **TRACK ORDER** CTA button.

---

# 37. Track Order Page — REMOVED (v3.1)

**Original v3.0 plan** (route `/track-order`, Order ID + phone as the
credential pair, status ladder, courier block) shipped in Phase 9 and was
**removed in Phase 17 at the owner's direction** — the page, header link,
sitemap entry and `getTrackOrderView` lookup are gone; the route 404s.

Where each capability lives now:

```text
Status ladder + statuses  → public /order/[orderNumber] page (coarser view)
Courier + tracking info   → client dashboard order detail (§34)
Tracking push message     → WhatsApp shipping message (§36), unchanged
Phone-paired lookup       → withdrawn (no public order-status query remains;
                            the §37 rate-limit bucket is dormant)
```

The order-number + phone credential discipline is preserved on the public
order page exactly as before: sequential order IDs are guessable, so the
page intentionally exposes only items, totals and coarse statuses — full
name, masked phone, city-level address.

---

# 38. Client Dashboard Home

Focus on actions:

```text
TODAY
Orders               12
Pending Payment       4
Paid / Ready to Pack  5
Shipped               3
Low Stock             7
```

Then:

```text
ACTION REQUIRED
SVS-ORD...   Payment claimed
SVS-ORD...   Ready to pack
SVS-ORD...   Tracking missing
```

---

# 39. Realtime

Use Supabase Realtime only where useful:

```text
Client Dashboard
- new order
- payment status change
- order status change
```

Do not open Realtime subscriptions for every storefront visitor.

---

# 40. Search and Filters

Search:

```text
Product name
Product ID
SKU
Category
Fabric/Material
Color
Collection
Occasion
```

Generic filters:

```text
Price
Category
Color
Availability
Collection
Occasion
```

Category-specific filters can be generated from category attributes.

---

# 41. Categories vs Collections

### Category
Structural product type:

```text
Sarees
Dresses
Kurtis
Lehengas
```

### Collection
Marketing/editorial grouping:

```text
Festive Edit
Wedding Edit
New Season
Diwali Collection
Summer Edit
```

A product has one main category and can belong to many collections.

---

# 42. Core Database Tables

```text
users
profiles
roles
customers
addresses
categories
collections
collection_products
products
product_variants
product_media
inventory
inventory_movements
wishlists
wishlist_items
carts
cart_items
orders
order_items
payments
shipments
order_status_history
whatsapp_messages
whatsapp_consents
webhook_events
reviews
store_settings
audit_logs
```

---

# 43. WhatsApp Message Logging

```text
whatsapp_messages
-----------------
id
order_id nullable
recipient_phone
message_type
template_name nullable
provider_message_id
status
error_code nullable
sent_at
delivered_at nullable
read_at nullable
failed_at nullable
```

---

# 44. Webhook Events

```text
webhook_events
--------------
id
provider
external_event_id unique
event_type
payload jsonb
processed_at
status
error nullable
```

All webhook handlers must be idempotent.

---

# 45. Audit Logs

Log critical actions:

```text
PAYMENT_VERIFIED
ORDER_SHIPPED
PRODUCT_PRICE_CHANGED
INVENTORY_ADJUSTED
PAYMENT_QR_CHANGED
USER_ROLE_CHANGED
```

Audit record should contain:

```text
actor
role
action
entity
old value
new value
timestamp
```

---

# 46. Security Requirements

Mandatory:

```text
HTTPS
secure cookies
server-side validation
RLS
role authorization
rate limiting
bot protection
webhook verification
secure secret storage
input sanitization
safe file upload
audit logs
backups
```

Never:

```text
trust browser prices
trust "PAID" as proof
put service-role keys in client code
let client users into super-admin routes
```

---

# 47. Performance

Fashion sites are image-heavy.

Use:

```text
Cloudinary CDN
AVIF/WebP
responsive image sizes
lazy loading
preload only LCP image
Server Components where useful
minimal client JavaScript
```

---

# 48. Mobile Requirements

```text
2-column product grid
swipe product gallery
pinch zoom
sticky Add to Cart / Buy via WhatsApp   (v3.1: was "Buy Now")
persistent bottom contact bar — WhatsApp + Call us on every
  storefront page; on product pages it yields to the sticky
  purchase bar (which carries its own WhatsApp button)
large inputs
bottom-sheet filters
short checkout
large tap targets
```

---

# 49. Accessibility

Minimum:

```text
semantic headings
proper labels
keyboard navigation
visible focus states
44px-ish touch targets
alt text
adequate contrast
screen-reader-friendly forms
accessible dialogs
reduced motion support
```

---

# 50. Repository Structure

```text
sri-vartali/
│
├── app/
│   ├── (storefront)/
│   ├── client/
│   ├── admin/
│   ├── api/
│   └── layout.tsx
│
├── components/
│   ├── ui/
│   ├── commerce/
│   ├── product/
│   ├── checkout/
│   ├── client/
│   └── admin/
│
├── lib/
│   ├── db/
│   ├── auth/
│   ├── whatsapp/
│   ├── media/
│   ├── inventory/
│   ├── address/
│   ├── validation/
│   └── analytics/
│
├── public/
│   ├── brand/
│   └── icons/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
├── .env.example
├── package.json
└── README.md
```

---

# 51. Environment Variables

```bash
NEXT_PUBLIC_SITE_URL=
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
NEXT_PUBLIC_WHATSAPP_STORE_NUMBER=
SUPER_ADMIN_EMAIL=
SENTRY_DSN=
NEXT_PUBLIC_GA_ID=
```

**v3.1:** names above now match `.env.example` exactly (the v3.0 sketch
omitted the `NEXT_PUBLIC_` prefixes the browser-side code requires, and the
store number that powers every WhatsApp deep link).

Never commit real secrets.

---

# 52. Git Workflow

For a small team:

```text
main
feature/*
fix/*
```

Workflow:

```text
branch
→ pull request
→ review
→ CI
→ merge
```

Protect `main`.

---

# 53. CI Pipeline

```text
Install
→ Typecheck
→ Lint
→ Unit Tests
→ Integration Tests
→ Build
→ Optional E2E
→ Preview Deployment
```

---

# 54. AI Agent Implementation Phases

## Phase 1 — Foundation

Build:

```text
Next.js
TypeScript
Tailwind
Design tokens
Supabase
Database schema
Auth
Roles
RLS
```

## Phase 2 — Generic Product System

Build:

```text
Categories
Subcategories
Products
Product IDs
Attributes
Variants
Inventory
Product media
Cloudinary
Draft/Publish
```

Acceptance: create a Saree, Dress, and Kurti without code changes.

## Phase 3 — Client Product CMS

Build:

```text
Product list
Add/Edit
Duplicate
Archive
Image upload/reorder
Primary image
Pricing
Stock
Attributes
SEO
Preview
Autosave
```

## Phase 4 — Public Store

Build:

```text
Home
Shop
Category
Collection
Product
Search
Filters
Wishlist
Responsive design
```

## Phase 5 — Cart and Checkout

Build:

```text
Cart
Multi-product orders
Variants
Buy Now
Checkout
PIN validation
Address validation
Server-side totals
```

## Phase 6 — Order System

Build:

```text
Order ID
Order creation
Order item snapshots
Address snapshot
Statuses
Inventory reservation
Client order dashboard
```

Acceptance: the order exists before WhatsApp opens.

## Phase 7 — WhatsApp

Build:

```text
Prefilled WhatsApp deep link
Inbound webhook
Order lookup
QR/payment instructions
Message logging
Error handling
```

## Phase 8 — Manual Payment Verification

Build:

```text
Customer claims paid
Client verifies manually
Audit trail
Automatic confirmation message
```

## Phase 9 — Shipping and Tracking

Build:

```text
Processing
Packed
Courier
Tracking ID
Tracking URL
Shipped
Tracking WhatsApp message
Tracking page
```

## Phase 10 — Super Admin

Build:

```text
Users
Roles
WhatsApp integration status
Webhook logs
Failed messages
Audit logs
System diagnostics
```

## Phase 11 — Production Hardening

```text
Security
Rate limits
Accessibility
SEO
Performance
Backups
Monitoring
Production deployment
```

## Phase 12 — Super Admin + Realtime (2026-10-09, PR #26)

```text
§9 super admin panel (10 pages: users, roles, integrations,
  webhooks, logs, audit, system diagnostics)
§39 client-dashboard realtime (new order toasts, live list)
```

## Phase 13 — Search/Filters completion (PR #28)

```text
§40: schema-driven category facets, collection filter,
  collection-name search
```

## Phase 14 — §58/§59 acceptance audit (PR #29)

```text
Order-ID search on the client orders list
Touch-friendly image reorder in the product wizard
```

## Phase 15 — Production smoke runbook (PR #30)

```text
End-to-end smoke runbook; gate was BLOCKED on the missing
SUPABASE_SERVICE_ROLE_KEY on the (old) Vercel project
```

## Phase 16 — WhatsApp-First Commerce (2026-10-10, local-only)

Owner-directed pivot: the supplier chat becomes the primary buying path.

```text
Cart "Buy via WhatsApp" — server-quoted cart prefilled into wa.me
  (lib/cart/whatsapp.ts, §18 v3.1 note)
Persistent supplier contact dock — mobile bottom bar (WhatsApp + Call us)
  + desktop floating buttons + footer contact pills
  (components/storefront/contact-dock.tsx, lib/store/contact.ts)
Fresh Supabase project sri-vartali-commerce (Mumbai, owner: Pushpak):
  all six migrations, sample catalog seed, admin1@svs.local SUPER_ADMIN
Vercel production deploy verified end-to-end (incl. the Phase 15 gate),
  then deleted at the owner's request — local-only from here
```

## Phase 17 — Owner UX Pass (2026-10-11, local-only)

```text
Header rail active-route highlighting + brand logo (header + footer)
Track Order removed end to end (§7, §37)
Buy Now removed end to end; product pages carry Buy via
  WhatsApp (§19 v3.1), quantity/variant-aware deep link
Layout widened 1152px → 1440px across storefront/client/admin
Hydration hardening: suppressHydrationWarning on <html>/<body>
  for browser-extension attribute injection
```

---

# 55. AI Agent Non-Negotiable Rules

```text
1. Never hard-code the catalog around sarees.
2. Product ID is mandatory.
3. Order ID is mandatory.
4. Use UUID internally and readable IDs externally.
5. Every order supports multiple items.
6. Every order_item stores purchase-time snapshots.
7. All money calculations are authoritative on the server.
8. WhatsApp is never the source of truth.
9. Create the order before opening WhatsApp.
10. Client product management must require zero code editing.
11. Product image upload must be easy for non-technical users.
12. Category-specific fields must be configurable.
13. Never expose Supabase service-role keys in browser code.
14. Never trust prices sent from the browser.
15. Never verify payment because the customer typed PAID.
16. Only client-authorized users verify manual payment.
17. Shipping requires courier and tracking ID.
18. Marking shipped triggers a customer tracking message.
19. Historical orders must survive product edits/archives.
20. Client and super-admin permissions must remain separate.
21. Use RLS and server authorization.
22. Keep mobile UX first-class.
23. Avoid unnecessary infrastructure complexity.
24. Preserve future expansion to other fashion categories.
```

---

# 56. Testing Requirements

## Unit Tests

```text
Product ID generation
Order ID generation
Money calculations
Discount calculations
Stock validation
Variant selection
Order status transitions
Payment status transitions
WhatsApp payload generation
Address validation
```

## Integration Tests

```text
Create product
Upload image
Publish product
Create multi-item order
Store order snapshots
Reserve stock
WhatsApp inbound webhook
Customer claims paid
Client verifies payment
Shipment creation
Tracking message
Duplicate webhook
WhatsApp failure
```

---

# 57. E2E Acceptance Tests

## Product Creation

```text
Client uploads 8 images
→ reorders them
→ selects primary image
→ enters description
→ selects Saree
→ fills attributes
→ sets price
→ sets stock
→ publishes
```

Expected: product appears correctly on the public store.

## Fashion Expansion

```text
Client selects Dress
→ dress-specific fields appear
→ creates dress
→ publishes
```

Expected: no database rewrite or code change.

## Multi-Item Cart

```text
1 saree
2 kurtis
1 blouse
```

Expected:

```text
1 Order ID
3 order-item rows
4 total pieces
correct total
```

## WhatsApp

```text
Order created
→ WhatsApp opens
→ customer sends
→ webhook receives
→ QR/payment instructions sent automatically
```

## Payment Safety

```text
Customer sends PAID
```

Expected:

```text
payment_status = CUSTOMER_CLAIMS_PAID
```

Only after client clicks Verify Payment:

```text
payment_status = VERIFIED
WhatsApp confirmation sent
```

## Shipment

Client enters Courier + Tracking ID + Tracking URL and marks shipped.

Expected customer message contains:

```text
Order ID
Courier
Tracking ID
Tracking URL
```

## Sold-Out Race

Two users attempt to buy the last unit.

Expected:

```text
No negative stock
No accidental double sale
```

## WhatsApp Failure

Order is created but WhatsApp fails.

Expected:

```text
Order remains valid
Client sees order
Failure is logged
Retry is available
```

---

# 58. Client UX Acceptance Checklist

Client should be able to do all of the following without developer help:

```text
Create a product
Upload images from phone
Reorder images
Choose primary image
Change description
Change price
Change stock
Duplicate product
Publish/unpublish
Find order by Order ID
Find product by Product ID
Verify payment
Enter courier
Enter tracking ID
Enter tracking URL
Mark shipped
```

---

# 59. Customer UX Acceptance Checklist

Customer should always be able to answer:

```text
What is this product?
How much does it cost?
Is it in stock?
What variant am I buying?
What is my total?
Where is it being delivered?
What happens after I continue to WhatsApp?
Was my payment verified?
What is my Order ID?
Has the order shipped?
What is the Tracking ID?
Where can I track it?
```

---

# 60. Recommended MVP

Launch with:

```text
Home
Shop
Category
Collection
Product
Search
Cart
Checkout
PIN validation
Order creation
WhatsApp
WhatsApp-first handoffs (v3.1: cart + product Buy via WhatsApp)
UPI QR/payment instructions
Manual payment verification
Shipping/tracking
Track Order               # removed v3.1 — see §37
Client Dashboard
Products
Inventory
Orders
Settings
Super Admin technical panel
```

Do not delay launch for:

```text
advanced AI recommendations
complex loyalty
microservices
advanced search engine
marketplace features
```

---

# 61. Future Expansion

The architecture should later support:

```text
Dresses
Kurtis
Lehengas
Blouses
Dupattas
Accessories
Jewellery
Payment gateway
Shipping API
Automatic courier webhooks
Customer accounts
Reviews
Back-in-stock alerts
Marketing campaigns
Coupons
Gift cards
Multi-language
Multiple staff accounts
```

without replacing the core system.

---

# 62. Final Architecture

```text
CUSTOMER
   ↓
NEXT.JS STOREFRONT
   ↓
SUPABASE
├── PostgreSQL
├── Auth
├── RLS
└── Realtime for client dashboard only

PRODUCT MEDIA
   ↓
CLOUDINARY

ORDER CREATED
   ↓
WHATSAPP BUSINESS PLATFORM
   ↓
CLIENT BUSINESS NUMBER
   ↓
QR + PAYMENT INSTRUCTIONS
   ↓
CLIENT VERIFIES PAYMENT
   ↓
SUPABASE UPDATED
   ↓
WHATSAPP PAYMENT CONFIRMATION
   ↓
CLIENT PACKS
   ↓
COURIER + TRACKING ID
   ↓
MARK SHIPPED
   ↓
WHATSAPP TRACKING MESSAGE
```

---

# 63. Final Principle

> Build the visible website as **Sri Vartali Sarees**, but build the underlying software as **Sri Vartali Fashion Commerce**.

The client should get an extremely simple business dashboard.  
The customer should get a premium fashion storefront.  
The developer should get a typed, auditable, maintainable system.  
The database should remain the source of truth.  
WhatsApp should remain a communication and payment-coordination layer.  
The platform should expand to future fashion categories without a rewrite.
