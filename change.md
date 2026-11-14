# Changelog & Change Tracker – The Accessory Dock

This document tracks all changes, architectural improvements, bug fixes, and feature additions applied to **The Accessory Dock** static deployment repository.

---

## [v1.4.0] – Complete Mobile-First Architecture Overhaul & Thumb Ergonomics
**Date:** 2026-11-14 (19:05 NPT)  
**Deploy URL:** `https://the-accessory-dock.vercel.app`

### Summary of Changes
1. **True Mobile-First Screen Hierarchy**
   - **Unified Sticky Header**: Integrated the brand row, dark mode toggle, cart bag pill, search bar, and horizontal category pills into a single sticky container with 0 scroll overlap or collision on any mobile viewport.
   - **Moved Trust Pillars to Bottom**: Relocated the 4 seal trust items from pushing products down the fold to right above the footer, immediately highlighting accessories upon first load.
   - **Mobile 2-Column Grid Ergonomics**: Streamlined product cards with a 1:1 recessed image container, discrete stock badge, 2-line title, and a compact bottom row (left: price stack; right: thumb-friendly `+ Add` button).
   - **Mobile Quick-View Bottom Sheet**: Tapping any product card opens an authentic bottom sheet modal with smooth slide-up animation, drag handle, image thumbnails, full specs, and primary WhatsApp direct order CTA.
2. **Floating Bottom Cart Bar (`#mobile-cart-bar`)**
   - Implemented a floating bottom cart bar that automatically appears when items are added to the shopper's cart.
   - Positioned cleanly within thumb reach using `calc(12px + env(safe-area-inset-bottom))` to respect iOS home indicators and Android navigation bars.
   - One-tap "View Cart • Order ➔" button allows rapid WhatsApp checkout from anywhere on the page.
3. **Strict Zero-Emoji & Warm Botanical Polish**
   - Verified zero emoji characters across HTML, CSS, and JavaScript.
   - Replaced all icons with crisp Material Symbols Outlined.
   - Clean color palette adhering to the Stitch design specifications.
4. **Order Rate-Limiting & Duplicate Prevention**
   - Strict 2.5s cooldown guard (`ORDER_COOLDOWN_MS = 2500ms`) and mutex lock preventing repeated taps from dispatching duplicate WhatsApp order messages.
   - 450ms debounce on `addToCart()` to avoid accidental multi-taps.

---

## [v1.3.0] – Warm Botanical Modernism Design Match & Order Rate Limiting
**Date:** 2026-11-14 (18:52 NPT)  
**Deploy URL:** `https://the-accessory-dock.vercel.app`

### Summary of Changes
1. **Visual Design Match with "Warm Botanical Modernism"**
   - Adopted the full color and elevation architecture from the Stitch design package:
     - Warm oat cream canvas (`#FAF7F2` / `#FCF9F4`), elevated pristine white cards (`#FFFFFF`), recessed product display matting (`#F5EFEB`), and deep forest pine (`#1E3A2F`).
     - Eucalyptus sage accents (`#376847`), warm honey amber for deals (`#D68E2C`), and botanical slate text (`#15241D`).
   - Integrated **Plus Jakarta Sans** typography across all displays, headings, and body copy.
   - Replaced all emojis with Google Material Symbols Outlined (`shopping_bag`, `search`, `close`, `verified_user`, `local_shipping`, `sell`, `support_agent`, `delete_outline`, etc.).
   - Removed all unnecessary marketing fluff and filler text, focusing purely on mobile tech accessories, accurate NPR prices, and instant WhatsApp ordering.
   - Added the 4 Seal Trust Pillars directly adapted from the brandmark:
     1. *Genuine Products* (100% Tested Authentic)
     2. *Fast Delivery* (Express Delivery in Nepal)
     3. *Affordable Prices* (Direct Consumer Value)
     4. *Dedicated Support* (Direct WhatsApp Assistance)
2. **Order Rate Limiting & Duplicate Click Prevention**
   - Implemented an active order mutex and throttle guard (`ORDER_COOLDOWN_MS = 2500ms`) on both `buyNow()` and `checkoutWhatsApp()`.
   - Repeatedly tapping the order button locks subsequent calls, displays a "Please wait a moment before sending another order request" toast, and prevents duplicate WhatsApp tabs or multiple order message spam.
   - Buttons enter an active `.btn-loading` state while the request is being dispatched.
   - Added a $450\text{ms}$ debounce throttle on `addToCart()` to prevent accidental rapid double-taps from incrementing quantity unintentionally, with temporary "Added ✓" visual feedback.
3. **Modal & Cart Drawer Polish**
   - Modal matches the Stitch quick-view layout: clean image display, multi-angle thumbnail selector, bold discount pill, and direct WhatsApp order CTA.
   - Slide-over cart drawer features itemized summaries, smooth quantity steppers (`+` and `−`), trash icon, live subtotal, and single-click checkout.

---

## [v1.2.0] – Mobile-First Redesign, Circular Logo & Clean Order Flow
**Date:** 2026-11-14 (18:37 NPT)  
**Commit:** `5464000`  
**Deploy URL:** `https://the-accessory-dock.vercel.app`

### Summary of Changes
1. **New Circular Logo Integration**
   - Replaced logo with the newly provided graphic emblem.
   - Cropped to a centered $575 \times 575$ square (`images/logo.png`) and styled with `border-radius: 50%` with an emerald border accent.
   - Optimized file weight down to ~70 KB for instant mobile transmission.
2. **True Mobile-First Architectural Overhaul**
   - Rewrote [`styles.css`](file:///c:/Users/khuku/Desktop/the-accessory-dock/styles.css) with mobile-first CSS architecture (screens 320px–639px base, progressively enhanced for tablets and desktops).
   - **Header**: Sticky gradient bar featuring circular logo, store title, cart pill with dynamic badge count (`🛒 Cart (3)`), and full-width search input.
   - **Hero Banner**: Compact mobile banner with value statement and trust chips (`🛡️ Genuine Products`, `⚡ Fast Delivery`, `💬 WhatsApp Orders`).
   - **Category Pills**: Sticky, horizontal-scrollable pills with hidden scrollbars and smooth touch momentum.
   - **Product Grid**: Mobile 2-column cards (`repeat(2, minmax(0, 1fr))`) with 10px spacing, $1:1$ square image ratio, discount tags, price stack, and dual action buttons.
   - **Detail Modal**: Mobile bottom-sheet slide-up with rounded top corners (`border-radius: 20px 20px 0 0`), safe-area padding, and full-width WhatsApp order button.
   - **Cart Drawer**: Mobile full-width slide-in drawer with explicit `✕` close button, touch-friendly `+`/`−` quantity adjusters, and a sticky WhatsApp checkout button.
3. **Removed Refer Code & Coupon Logic**
   - Removed `#cart-refer-input` and `#modal-refer-input` from [`index.html`](file:///c:/Users/khuku/Desktop/the-accessory-dock/index.html).
   - Removed `#coupon-section` (input, apply button, feedback) from [`index.html`](file:///c:/Users/khuku/Desktop/the-accessory-dock/index.html).
   - Removed `COUPONS`, `appliedCoupon`, and `applyCoupon()` from [`script.js`](file:///c:/Users/khuku/Desktop/the-accessory-dock/script.js).
   - Simplified WhatsApp message builders in `buyNow()` and `checkoutWhatsApp()` to clean itemized lists without refer or coupon references.

---

## [v1.1.0] – Local-Only Admin Portal, Review Bug Fix & Security Hardening
**Date:** 2026-11-14 (18:07 NPT)  
**Commit:** `9bc8284`

### Summary of Changes
1. **Local-Only Admin Engine ([`admin.html`](file:///c:/Users/khuku/Desktop/the-accessory-dock/admin.html))**
   - Created standalone local administration dashboard for the store owner.
   - Supports adding/editing products, code uniqueness validation, one-click stock toggling, and live search.
   - Includes **"Download products.json"** and **"Copy JSON"** buttons to update catalog data effortlessly.
   - **Edge Protection**: Configured [`vercel.json`](file:///c:/Users/khuku/Desktop/the-accessory-dock/vercel.json) and [`_redirects`](file:///c:/Users/khuku/Desktop/the-accessory-dock/_redirects) so any remote access to `/admin*` returns **HTTP 404 Not Found**.
   - **Client Protection**: Client-side script checks `window.location.hostname` and blocks any domain other than `localhost`, `127.0.0.1`, or `file://`.
2. **Removed Dead Google Sheets Review Integration**
   - Removed `REVIEW_CSV` and `loadReviewsFor` from [`script.js`](file:///c:/Users/khuku/Desktop/the-accessory-dock/script.js) (the published sheet was deleted and returning HTTP 410 Gone).
   - Removed external 70KB `papaparse.min.js` script tag from [`index.html`](file:///c:/Users/khuku/Desktop/the-accessory-dock/index.html).
   - Eliminated `<p>Could not load reviews.</p>` error message in product modals.
3. **Modal Thumbnail Trapping UX Fix**
   - Updated `openModal()` in [`script.js`](file:///c:/Users/khuku/Desktop/the-accessory-dock/script.js) to prepend `p.mainImage` to the thumbnail gallery and deduplicate entries.
   - Added `.selected` green border indicator on active thumbnails.
4. **WhatsApp Phone Number Update**
   - Updated `WA_NUMBER` in [`script.js`](file:///c:/Users/khuku/Desktop/the-accessory-dock/script.js) from `9779808467134` to official store phone **`9779761806448`**.
5. **Content Security Policy (CSP) Tightening**
   - Removed external origins `cdnjs.cloudflare.com` and `docs.google.com` from [`_headers`](file:///c:/Users/khuku/Desktop/the-accessory-dock/_headers).
   - Added `X-Robots-Tag: noindex, nofollow, noarchive` for `/admin*`.

---

## [v1.0.1] – Vercel Static Hosting Configuration
**Date:** 2026-11-14 (17:47 NPT)  
**Commit:** `9d423ff`

### Summary of Changes
1. **Added [`vercel.json`](file:///c:/Users/khuku/Desktop/the-accessory-dock/vercel.json)**
   - Configured `framework: null`, `buildCommand: null`, and `outputDirectory: "."` to disable unnecessary build steps and host purely as static files.
2. **Repository Alignment**
   - Switched deployment target to `git@github.com:rajnayabhari/accessory-dock_stataic_deploy.git`.
   - Linked to Vercel production project `the-accessory-dock`.

---

## [v1.0.0] – Initial Static Deployment
**Date:** Earlier
- Baseline vanilla static e-commerce storefront (`index.html`, `styles.css`, `script.js`, `products.json`, `images/`).
