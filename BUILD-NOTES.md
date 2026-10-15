# NWW site v1: build notes for Jackson

Branch `build/v1`. This is a static Astro site for Cloudflare Pages. It has 180 pages and 757 files, well under the 20,000-file limit.

## Read these first

1. **Your Snipcart account is blocking carts, and that includes foreverclientgifts.com.** Snipcart's API answers the FCG public key with **HTTP 402**: *"Please log into Snipcart's dashboard to have more details on why the cart isn't working."*
   - When I clicked add-to-cart on the live FCG page, the cart sat on "We're getting your cart ready..." and the count stayed at 0.
   - Snipcart also shows a **TEST MODE** banner for this key, so even a working cart would not charge real money.
   - **Fix:** log into Snipcart, clear whatever the dashboard flags (usually billing or account activation), then put the **Live** public key in `src/config.ts` (`SNIPCART_PUBLIC_KEY`) or in the `SNIPCART_PUBLIC_KEY` environment variable in Cloudflare.
   - The new site's buttons are wired correctly. Snipcart itself parsed a test add-to-cart with the right price, options and engraving text (`qa/screenshots/cart-item-adding-*.json`). The cart just can't open until the account is fixed.
2. **113 product pages, not 127.** Photo review found 11 listings whose photo repeats another listing's, either the same photo or the same scene shot twice. I merged each into one page, so there are no two pages with the same picture. I also held 3 more listings for photo problems. Everything is listed below, and nothing was deleted from `data/products.json`.

## What was built

- **Product pages** (`/p/<slug>/`, 113), each with:
  - a real design name and slug, written after looking at the photo
  - an 80-150 word description in the shop voice
  - a fact box
  - a personalizer (options from `price-ladders.json`, engraving fields, live price)
  - a server-rendered Snipcart button, built the same way as the FCG button
- **Hub pages:** each has a unique intro, FAQs, JSON-LD, and "keep browsing" links by occasion, recipient and product.
  - **6 product types** (`/c/…`)
  - **16 occasions** (`/occasion/…`, including the 5th-anniversary wood hub)
  - **7 recipients** (`/for/…`)
  - **17 occasion × type combos** (`/occasion/<o>/<type>/`). A combo only exists if it has at least 3 products and is a real subset, meaning under 75% of its occasion's products.
  - **Not built** (fewer than 3 products): gift sets, cake toppers, memorial, teacher, military, nurse, for-teachers and for-pet-lovers. Those products still appear in `/shop/` and on related hubs.
- **`/shop/`:** every product, with client-side filters (product, occasion, recipient, starting price) and sorting. Filter state is kept in the URL.
- **Gift quiz:** the homepage hero is the quiz, and a floating "Find the right gift in 20 seconds" button opens it everywhere else. It auto-opens once after 8 seconds on a first visit; the dismissal is stored in localStorage inside try/catch.
  - **Flow:** who it's for, then a branch (anniversary date with the "That's your 5th: the wood anniversary" line, wedding date, realtor brokerage and closings, corporate quantity and date, or budget), then the lead step, then results.
  - **Results:** best sellers by real Etsy sales, varied by design, with a link to the matching hub. Realtor results lead with a foreverclientgifts.com card.
  - **Lead step:** only appears once a GHL form ID (or webhook URL) is set. Until then the quiz goes straight to results, so nobody types their details into a form that goes nowhere. Both modes from the spec are built: `ghl_form` (the default, with prefilled hidden fields) and `webhook`. Submitting fires the Meta Pixel `Lead` event.
- **8 buying guides** (`/guides/…`, 750-900 words each) plus a guide index.
- **Static pages:** `/about`, `/realtors`, `/business` (inquiry section), `/faq`, `/shipping`, `/care`, `/privacy`, `/terms`, `/contact`, plus a 404 page.
- **SEO layer:**
  - JSON-LD: Organization, WebSite, Product/Offer, BreadcrumbList, CollectionPage/ItemList, FAQPage, Article, AboutPage and ContactPage. There is **no AggregateRating or Review** markup.
  - Canonical URLs, unique titles (60 characters or less) and meta descriptions (155 or less).
  - `/sitemap.xml`, `/robots.txt` (allows all crawlers and names the AI crawlers), `/llms.txt`, and `/feeds/google-products.xml` for Merchant Center.
- **Proof shown on the site:**
  - "46,000+ orders on Etsy" and "11,700+ ratings on our top Amazon listings", worded exactly as in proof.json.
  - "X,X00+ sold on Etsy" on a card only when that listing sold 500 or more, rounded down.
  - Etsy star ratings, as a link, on only the 7 listings named in proof.json.
- **Design:** ivory, black and gold. Playfair Display and Poppins. Mobile first, with 2/3/4-up product grids, a mega-menu with a mobile drawer, and a utility bar with Realtors and Corporate always visible.

### Checks, all passing

- `npm run build`: the build runs `scripts/check-snipcart.mjs` automatically. That script checks every product page's button against `price-ladders.json`: id, price, every option string, and that the URL matches the canonical. It also confirms that no held or merged product has a page or a link anywhere.
- `node scripts/check-content.mjs`: 180 pages, 0 errors. It checks for:
  - banned phrases and the never-claim list
  - PLACEHOLDER in visible text, and emoji
  - broken internal links and srcsets
  - alt text on every image
  - duplicate or overlong titles and meta descriptions, and one H1 per page
  - hub intros under 120 words, product descriptions outside 80-150 words, and guides outside 600-1,200 words
  - valid JSON-LD with no AggregateRating
  - sitemap URLs that don't exist
- `node scripts/qa-screenshots.mjs`: Playwright screenshots at 390px and 1440px in `qa/screenshots/`. They cover home, shop, one product of each of the 8 types, 4 occasion hubs, one type hub, a combo, a recipient hub, a guide, about, business, FAQ, 404, every quiz step (the lead step came from a webhook-mode test build), the quiz modal, the menus, and add-to-cart validation. I looked at every set and fixed what I saw (mobile gutters, header overflow at 360-390px, footer logo, hero contrast, quiz result variety, and a floating button hiding the cart). No page scrolls sideways at 360, 390 or 1440px.
- An independent copy audit against proof.json found no never-claim violations. I rewrote every sales-rank claim that wasn't in proof.json, every unverified service claim, and the "set of 2" wording on the couples glasses.

### Lighthouse (mobile, simulated throttling, local static server)

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| Home | 100 | 100 | 100 | 100 | 1.2 s | 1.2 s | 0 ms | 0.002 |
| Product (Home Sweet Home board) | 100 | 100 | 100 | 100 | 1.2 s | 1.7 s | 0 ms | 0.001 |

The Meta Pixel was the only thing dragging performance down: 400 ms of blocking time, and a score of 88-90. Its script now loads on the visitor's first scroll, tap or keypress, or after 10 seconds. PageView still fires, from the queue. Snipcart loads the same way, on first interaction, and a click that comes before it loads is replayed.

## Placeholders you must fill

All of these live in `src/config.ts`. Each one can also be set as a Cloudflare Pages environment variable with the same name. The site works with every placeholder still in place.

| Setting | Now | What it does | Where to get it |
|---|---|---|---|
| `SITE_URL` (env) | `https://nww-site.pages.dev` | Canonicals, sitemap, feed, and the Snipcart item URLs | Your pages.dev URL, later the real domain |
| `SNIPCART_PUBLIC_KEY` | The FCG key, which is **TEST mode and currently returns 402** | Cart and checkout | Snipcart dashboard → Account → API keys → **Live** public key (see "Read these first") |
| `UPLOADCARE_PUBLIC_KEY` | `PLACEHOLDER_UPLOADCARE_PUBLIC_KEY` | Logo and recipe-photo upload fields. Until it's set, the field is hidden and buyers are told to send the file when you email the proof. | uploadcare.com → your project → API keys → Public key (it's a placeholder on FCG too) |
| `GHL_QUIZ_FORM_ID` | `PLACEHOLDER_GHL_QUIZ_FORM_ID` | Quiz lead step (the GHL form embed with hidden fields) | Create the "NWW Gift Quiz" form described in `specs/quiz-and-ghl.md`, then copy its ID from the embed code |
| `GHL_QUIZ_WEBHOOK_URL` + `QUIZ_MODE=webhook` | Placeholder | Fallback if GHL won't prefill hidden fields | GHL → Automation → Inbound Webhook trigger URL |
| `GHL_BUSINESS_FORM_ID` | Placeholder | The `/business` inquiry form. Until it's set, that page shows the contact block. | A GHL form with name, company, email, phone, quantity, date and notes |
| `CONTACT_EMAIL` | Placeholder | Shown on `/contact` and `/business`. Until it's set, those pages say "message us on Etsy". | Your shop email |
| `META_PIXEL_ID` | `1380340263951755` (FCG's pixel) | PageView, AddToCart, Purchase and Lead | Already set. Blank it to turn the pixel off. |
| `OFFER` | `null`, meaning **[OFFER: Jackson decides]** | Offer block on the homepage and in quiz results, hidden while null | Your call. No discount is invented anywhere. |
| `SAME_AS` | Etsy and Pinterest | Organization schema | Add your Amazon brand store URL and Facebook page URL |
| `QUIZ_GATE_RESULTS` | `false` | `true` hides "Skip, just show me" | Your call |

## Products not shown (32 in total, all still in `data/products.json` with `publish:false` and a `hold_reason`)

**Held from the brief (18). These are your decisions.**

- **Licensed characters or brands (11):**
  - Game of Thrones: 763105512, 580988964, 1124287889, 1331573160, 601266256 (coasters), 1716161491 (Hodor doorstop)
  - Witcher: 837383394, 776717769
  - Yoda: 761970066
  - Beauty and the Beast: 663073702, 1331625466
  - Grinch: 898472367
- **Profanity or adult humor (5):** 533861099, 661442284, 1331616248, 766768313, 662064830.
- **Gift box in the photo (1):** 4384947329.

**Held after the photo review (3). These need new photos, or your OK.**

- **733027326, "I love to wrap both my hands around it & swallow" glass:** sexual innuendo, the same class as the held adult designs.
- **1592010674, circle monogram coasters:** the photo shows a kraft gift box with tissue.
- **4385660895, board + coaster set:** the photo has badges claiming "Food-Safe Finish", "does not warp or split" and "made to last a lifetime". None of those are in proof.json, and the photo shows no coasters.

**Merged: same photo as another listing (11).** Each listing ID is recorded under the kept product's `source.duplicate_etsy_listings`.

| Listing(s) folded in | Kept listing |
|---|---|
| 995461328 | 769991218 |
| 1009225907, 783884741 | 619024514 |
| 879526138 | 522810718 |
| 661805878, 674525111 | 673801603 |
| 4549701434 | 4539468387 |
| 789273316 | 789264736 |
| 4510078135 | 4484492156 |
| 1804392972 | 620759142 |
| 4510079166 | 4510103856 |

To bring a listing back, set `publish: true`, give it a unique `slug` and write its content. The checkers will catch anything missing.

## Assumptions and open decisions

1. **Prices are the Etsy buyer prices from `price-ladders.json`, unchanged.**
   - The **board + coaster gift set** starts at **$46.20**: the board base ($29.70) plus the coaster base ($16.50), with both ladders' option strings used exactly as written. It's built in `src/lib/data.ts` → `ladderFor()`. Etsy's list price for this set starts at $60.36, so set the price you want.
   - The **cake topper** is a single $42.55 price with no options, as the ladder notes say.
   - The **memorial ornament** uses the logo-ornament ladder. Its Etsy price is lower ($12.45); give it its own ladder if you want that price.
   - A **glass set of 4 ($47.44)** costs more per glass than the set of 8, because that is the live Etsy price.
2. **"Festive AF" glasses (901257225, 1331628794) are published**, as the data had them. "AF" stands for a swear word, so move them to held if you want profanity kept off entirely.
3. **The Navy Veteran board uses the US Navy emblem.** Military insignia can be licensed trademarks, so check this the same way as the licensed-character holds.
4. **Customer logos appear in sample photos**: a steakhouse, "Tech Brothers" and a United Country Real Estate agent. They're your real listing photos; swap them if you'd rather not show other brands.
5. **Policies written as plain-language defaults. Please confirm them:**
   - damaged items: "message us with a photo and we will make it right"
   - personalized items can't be returned for a change of mind; mistakes on our end get fixed
   - SMS wording ("Reply HELP for help", "Message frequency varies")
   - logo formats (AI, EPS, SVG, PDF, high-res PNG or JPG)

   Privacy and Terms carry a "not legal advice, have it reviewed" note at the top.
6. **Shipping:** no free-shipping claim and no delivery dates, only "made to order in 3-5 business days" and "shipping is shown at checkout". A rush option is mentioned as "ask us", because no rush price is set. Conditioning oil, rush and extra engraving have no buyer prices in the ladders, so they aren't sold as separate items.
7. **Not claimed anywhere:** food-safe finish, or any wood species beyond maple and walnut for boards and coasters. Ornaments and guest books are described only as "wood" or "laser-cut wood", because the birch/plywood question is still open.
8. **URLs:**
   - Recipient hubs are `/for/couples/`, not `/for/for-couples/`.
   - Every URL ends in a slash, and Snipcart's `data-item-url` matches it exactly.
   - Combo hubs for "5th anniversary" were skipped because they would duplicate the anniversary combos.
9. **Images:** `npm run build` builds WebP (400, 800 and 1200 px) and JPEG (400 and 1200 px) versions of published product photos, in `public/img/p/` (not committed). The 1600px originals are removed from `dist/` after the build, so held photos are never deployed. Nothing is hotlinked from Etsy or Amazon. `grid_image` is supported: if you add a white-background photo, grids use it and the product page still leads with the hero.
10. **Copy:** product copy is in `data/products.json`. `scripts/authoring/products_content.py` is kept as a record of that first naming pass; don't re-run it, because `products.json` has been edited since. Hub copy is in `data/hub-copy.json`, and guides and pages are in `src/content/`.

## Deploy checklist (from README.md, about 20 minutes, once)

1. **Cloudflare Pages:**
   - Go to dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git, and pick `nakedwoodworks-Agents/NWW-Site`.
   - Framework preset: Astro. Build command: `npm run build`. Output: `dist`.
   - Environment variables: `SITE_URL` = your `https://<project>.pages.dev` URL, and **`NODE_VERSION` = `22`** (the current Astro needs Node 22.12 or newer; `.nvmrc` says 22 too).
   - Free tier: commercial use is allowed, with 500 builds a month and 20,000 files per site.
2. **Snipcart:** first fix the 402 account issue above and switch to the Live key. Then go to Domains & URLs and add the pages.dev domain, and the real domain later. **Checkout fails without this.** Place one test order before going live.
3. **Uploadcare:** copy your public key into `src/config.ts` (`UPLOADCARE_PUBLIC_KEY`).
4. **GHL:**
   - Create the "NWW Gift Quiz" form, the custom fields and the 3 workflows described in `specs/quiz-and-ghl.md`, then paste the form ID into `GHL_QUIZ_FORM_ID`.
   - Optionally make a business inquiry form and set `GHL_BUSINESS_FORM_ID`.
5. **Domain:** add it under Cloudflare Pages → Custom domains, update `SITE_URL`, and add it in Snipcart.
6. **Google:** add the site in Search Console and submit `/sitemap.xml`. Then add `/feeds/google-products.xml` in Merchant Center for free listings; you'll need to set up shipping and returns there, because the feed doesn't include them.

**Change prices:** edit `data/price-ladders.json`, then push; Cloudflare rebuilds on its own, and the checker confirms every button still matches.

## What's left or deferred

- A real cart screenshot. It needs the Snipcart account fixed; the cart wiring itself was verified through Snipcart's `item.adding` event.
- A screenshot of the GHL form inside the quiz. It needs a real form ID. The site's own lead form (webhook mode) is in the screenshots.
- On-site reviews. Collect real ones after delivery, as `specs/seo-and-ai-visibility.md` describes.
- Recipient hubs for teachers and pet lovers, plus memorial and teacher occasion hubs. Each needs 3 or more products first.

A PR is open from `build/v1` to `main`, titled "NWW site v1".
