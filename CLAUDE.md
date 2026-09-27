# NWW-Site: build contract for the coding agent

You are building **nakedwoodworks' own storefront**: a large, PersonalizationMall-style personalized-gift store that sells **only Naked Wood Works' own products**. It uses the **same checkout system as foreverclientgifts.com** (Snipcart + Uploadcare + GoHighLevel forms + Meta Pixel). You are expected to one-shot it: build everything, check your own work in a real browser, fix what you see, and repeat until the Definition of Done passes.

Read these before writing code, in this order:
1. `BRIEF.md`: the business, the owner, what matters
2. `data/proof.json`: the ONLY allowed facts and numbers, plus the never-claim list
3. `reference/NWW-brand-voice.md`: voice and banned phrases (customer-facing = "we", the shop, never Jackson's builder voice)
4. `specs/checkout-snipcart.md`: checkout wiring (breaks if done wrong)
5. `specs/quiz-and-ghl.md`: landing quiz + GHL
6. `specs/seo-and-ai-visibility.md`: page map, schema, crawlability
7. `specs/pmall-structure.md`: navigation model to copy
8. `data/products.json`, `data/price-ladders.json`, `data/taxonomy.json`
9. `reference/fcg_page_source.html`: the working FCG page (copy its Snipcart/Uploadcare/Pixel wiring)

## Stack (decided; don't re-litigate)
- **Astro (latest stable), static output** (`output: 'static'`), no SSR adapter. `npm run build` → `dist/`.
- Hosting: **Cloudflare Pages** (free tier allows commercial use; 20,000-file limit per site). Build command `npm run build`, output `dist`. Env var `SITE_URL`.
- No client framework runtime. Vanilla JS islands only (quiz, product personalizer, filters). Keep JS small.
- Images: `public/images/products/<etsy_id>.jpg` (1600px JPEGs, already there). Generate responsive WebP/AVIF via Astro's image pipeline or a prebuild `sharp` script. Keep total output under 20,000 files.
- Fonts: Playfair Display (display, italic accents) + Poppins (UI/body) from Google Fonts.

## Design system (NWW customer-facing = wedding palette)
- **White / black / metallic gold.** Ivory ground `#faf8f3`, ink `#141414`, gold accent `#b3892b`, flat gold rule `#b9943c`, headline champagne gradient `#f4e4a8 → #d4af37 → #967117` (use sparingly, headlines only).
- Warm wood tones come from the photography. Lots of white space, thin gold hairlines, centered hero layouts, elegant, not busy.
- Mobile first. 16px side gutters, no horizontal scroll, tap targets ≥ 44px.
- Product grid 2-up mobile / 3-up tablet / 4-up desktop. Cards: image (4:3), name, "from $X", optional proof line.
- **Photos:** use each product's `image` (Jackson's real listing hero photo). Support an optional `grid_image` field: if present, the grid uses it (future white-background set) and the product page still leads with the hero. Don't auto-remove backgrounds.

## Products
`data/products.json` has 145 entries, built from NWW's 157 active Etsy listings with same-photo duplicates merged. **Only render `publish: true` (127).** Held items show nowhere (not in sitemap or feeds).

Your content job per product, done at build-authoring time and saved back into `data/products.json` (keep all existing fields):
1. **Look at each product photo** (you can view images) and give it a real design name + URL slug, e.g. "Circle Monogram Family Name Board" → `circle-monogram-family-name-cutting-board`. Replace `slug_draft` with a final `slug`. Slugs must be unique and descriptive. No "-2", "-3".
2. Write `short` (1 sentence) and `description` (80-150 words) in the NWW voice: what it is, what gets engraved, material/sizes from the price ladder, lead time from proof.json. **Only claims from proof.json.** Describe what is visible in the photo; don't invent features.
3. Fix `occasions` / `recipients` tags using the photo + title (a "Home Sweet Home" board is housewarming; a names + date board is wedding + anniversary + couples). Tags must come from taxonomy.json.
4. If a photo shows anything on the never-claim list (gift box, competitor branding, bamboo, juice groove), set `publish:false` with a `hold_reason`, and list it in BUILD-NOTES.md.
Customer-name examples in photos ("Billy & Claudia Barnes") are sample engravings. Describe them as "your names," never as the product name.

## Hard rules
- Every number/claim comes from `data/proof.json`. Nothing invented: no fake reviews, no "only 3 left", no invented discounts. Where an offer is needed, render `[OFFER: Jackson decides]` in a clearly marked config value, not on the live page. If it's unset, hide the offer block.
- Never: gift-box claims, "ships in 1-3 days", "free design/mockup", bamboo, juice groove, the banned phrases in the voice file, emoji in copy.
- Snipcart price validation must pass (see checkout spec). Prices come ONLY from `data/price-ladders.json`.
- All third-party keys live in `src/config.ts`; placeholders are clearly named `PLACEHOLDER_*`. The site must fully work (browse, quiz results, add to cart) with placeholders in place.
- `robots.txt` must NOT block crawlers.
- Accessibility: alt text on every image, labelled form fields, visible focus states, color contrast AA.

## Build order
1. Scaffold Astro, config, layout, header mega-menu, footer.
2. Product data loader + product page with the personalizer + Snipcart button (+ `scripts/check-snipcart.mjs`).
3. Hubs: type / occasion / recipient / combo (combo only if ≥3 products) + `/shop` with client-side filters.
4. Quiz component (homepage hero + floating modal).
5. Guides (write them; real, useful, 600-1,200 words each, linking products). Facts only from proof.json + general knowledge that is safe (e.g. the traditional anniversary-by-year list; wood = 5th).
6. Static pages: /about, /realtors, /business, /faq, /shipping, /care, /privacy, /terms, /contact.
7. SEO layer: JSON-LD, sitemap, robots, llms.txt, Google products feed, canonical, meta.
8. **Self-check loop** (below). Fix, re-run, repeat.

## Self-check loop (must actually run it)
- `npm run build` must pass with zero errors.
- `node scripts/check-snipcart.mjs`: every product page's button matches price-ladders.json.
- `node scripts/check-content.mjs` (write it): scans dist HTML for banned phrases, "gift box", "1-3 day", "free design", "bamboo", "juice groove", `PLACEHOLDER` showing in visible text, broken internal links, missing alt text, duplicate titles/meta descriptions, and pages with < 120 words of unique body copy on hubs.
- **Playwright** (Chromium is preinstalled at `/opt/pw-browsers`; do NOT run `playwright install`): serve `dist/`, screenshot at 390px and 1440px: home, /shop, one product per type, 3 occasion hubs, 1 guide, the quiz at each step, cart open after add-to-cart. **Look at the screenshots** and fix layout/visual problems. Save the final set to `qa/screenshots/`.
- Lighthouse (or Playwright perf metrics) mobile on home + one product page. Record the numbers in BUILD-NOTES.md.

## Definition of Done
- [ ] Build passes; all three checkers pass with 0 errors
- [ ] 127 published product pages, each with a real name, unique slug, description, fact box, working personalizer and Snipcart button
- [ ] All hubs from taxonomy.json that qualify, each with a unique intro + FAQs
- [ ] 8 guides written
- [ ] Quiz works end to end with placeholders (shows results; GHL embed renders when an ID is set)
- [ ] JSON-LD valid (Organization, WebSite, Product/Offer, BreadcrumbList, ItemList, FAQPage, Article); no AggregateRating from Etsy/Amazon
- [ ] sitemap.xml, robots.txt, llms.txt, /feeds/google-products.xml
- [ ] Screenshots in qa/screenshots/ reviewed and clean at both widths
- [ ] `BUILD-NOTES.md` written for Jackson: what was built, every placeholder he must fill (with where to get it), every held product + why, every assumption, and the deploy checklist from README.md
- [ ] Committed on branch `build/v1` and pushed; open a PR to `main` titled "NWW site v1"

## Don't
- Don't use localStorage for anything that matters (quiz dismissal only, wrapped in try/catch).
- Don't hotlink Etsy/Amazon images.
- Don't add analytics beyond the Meta Pixel from FCG.
- Don't create pages for held products or for taxonomy entries with no content.
