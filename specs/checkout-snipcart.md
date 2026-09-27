# Checkout spec: same system as foreverclientgifts.com

Source of truth: `reference/fcg_page_source.html`, which is the working FCG page, decoded 2026-09-27. Copy its wiring. Don't invent a new checkout.

## Stack (all from the FCG source)
| Piece | What | Where in FCG source |
|---|---|---|
| Cart + checkout | **Snipcart v3.7.1** (`cdn.snipcart.com/themes/v3.7.1/default/snipcart.js` + `.css`), side-modal style | `<div hidden id="snipcart" data-api-key=... data-config-modal-style="side">` |
| Payments | Connected inside Jackson's Snipcart dashboard (the FCG page says "Stripe / PayPal"). Nothing to code. | trust line near the add-to-cart button |
| Logo / file upload | **Uploadcare** widget 3.x; the upload's `cdnUrl` is written into a Snipcart custom field | `UPLOADCARE_PUBLIC_KEY`, `#logoUploader` |
| Lead capture | GoHighLevel form embed `https://api.leadconnectorhq.com/widget/form/qmRraj2f5xSRqvBFcIMc` + `link.msgsndr.com/js/form_embed.js` | 50%-off block |
| Tracking | Meta Pixel `1380340263951755`: PageView, AddToCart (Snipcart `item.added`), Purchase (Snipcart `order.completed`), Lead | bottom `<script>` |

## Put every key in ONE config file
`src/config.ts` (or equivalent):
```
SITE_URL            // absolute; from env var SITE_URL, default the pages.dev URL
SNIPCART_PUBLIC_KEY // default: the key from the FCG source (Jackson may swap in a test key)
UPLOADCARE_PUBLIC_KEY // "PASTE_YOUR_UPLOADCARE_PUBLIC_KEY", still a placeholder on FCG too (see BUILD-NOTES)
META_PIXEL_ID       // 1380340263951755
GHL_LEAD_FORM_ID    // qmRraj2f5xSRqvBFcIMc
GHL_QUIZ_WEBHOOK_URL // placeholder, see specs/quiz-and-ghl.md
```
Nothing secret goes in the repo. The Snipcart key is a *public* key and is already on FCG's public page.

## Snipcart rules that break checkout if ignored
1. **Price validation crawl.** At checkout, Snipcart fetches `data-item-url` and checks that a button with the same `data-item-id`, price and option prices exists there. Therefore:
   - `data-item-url` = the **absolute production URL of that product's own page** (built from `SITE_URL`).
   - The product page HTML must contain the full `snipcart-add-item` button **server-rendered**, with every `data-item-custom*-options` string exactly as the cart will send it.
   - Option strings come from `data/price-ladders.json` verbatim. One source, used both for the button and the page.
2. **Unique `data-item-id`** per product: use the product slug.
3. **Allowed domains.** Jackson must add the pages.dev domain, and later the real domain, in Snipcart dashboard → Domains. Put this in the README deploy checklist.
4. Options whose price depends on two things (size × wood) are **one combined select**, already done that way in `price-ladders.json`.
5. Personalization text fields are `data-item-customN-type="textarea"`, set from the page's inputs via JS before add-to-cart (the FCG `update()` pattern). Required fields use `data-item-customN-required="true"`.
6. `data-item-image`: use the site's own `/images/products/...` absolute URL. Don't hotlink Etsy (FCG does, and it's fragile).

## Per-type custom fields (minimum)
- Boards / charcuterie / sets: Names to engrave (textarea, required), Established date/year, Logo file (Uploadcare, optional), Notes to seller.
- Glasses: Name/text to engrave (required unless the design is a fixed saying), Notes.
- Ornaments: Names / year (required), Notes.
- Guest books: Names, Wedding date, Finish color, Notes.
- Logo products (corporate/realtor): Logo file (Uploadcare), Company name, Notes. Mobile number optional (FCG makes it required; keep it optional on the main site).

## Test before handing off
- Build, then serve locally and confirm that every product page contains a valid Snipcart button (write a small script that parses every built product page and checks the id, price and options against price-ladders.json).
- Put the checker in `scripts/check-snipcart.mjs` and run it in the build.
