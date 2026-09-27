# SEO + AI-recommendation spec

Jackson's goal: "I want my personalized products to come up as much as possible. Not to game the system, unless it for sure can be gamed."

## The straight answer on gaming (read this, Jackson)
- **No known trick reliably games Google or the AI assistants in a way that lasts.** The tricks that look like gaming (fake reviews, hidden keyword text, thousands of near-identical "doorway" pages, paid mentions without disclosure) are the ones that get sites de-ranked. Google's spam policies name "scaled content abuse" and "doorway pages" explicitly. Fake reviews also carry legal risk: the FTC's rule banning fake reviews and testimonials took effect in late 2024 and carries civil penalties. That's from memory; have a lawyer confirm specifics.
- What works is closer to "make it easy for machines to be sure about you." That is mechanical, and the site can do all of it.
- **My read (not established science)** of what AI assistants lean on when they recommend a shop: (1) pages that answer the exact question in plain text, (2) clear structured facts (what, price, materials, lead time), (3) **third-party mentions**: Reddit threads, gift guides, news and blogs saying "Naked Wood Works makes X." (3) is the biggest lever, and it lives off-site. See the off-site list at the bottom.

## On-site requirements (the cloud agent builds all of this)
1. **Static, server-rendered HTML.** Every word of product and guide copy is in the HTML response, not injected by JS. (AI crawlers mostly don't run JS.)
2. **robots.txt** allows everything, and explicitly allows `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `Claude-SearchBot`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bingbot`. Points to the sitemap.
3. **sitemap.xml** with lastmod, and **`/llms.txt`**: a plain-text map of the shop (who we are, product types, occasions, key URLs, lead time, shipping). llms.txt is cheap and unproven. Build it anyway.
4. **Schema.org JSON-LD:**
   - Sitewide: `Organization` (name "Naked Wood Works", url, logo, `sameAs` → Etsy shop, Amazon brand store, Facebook, Pinterest `pinterest.com/nakedwoodworks`), `WebSite`.
   - Product pages: `Product` + `Offer` (price = base price, `priceCurrency` USD, availability InStock, `itemCondition` New, `shippingDetails` only if Jackson confirms), `brand`, `material`, `image`, and `BreadcrumbList`.
   - **Do NOT emit `AggregateRating` or `Review` schema from Etsy/Amazon ratings.** Show those numbers as visible text with a link ("4.7 stars from 486 Etsy reviews ↗"). Marking up third-party reviews as your own is against Google's review-snippet guidelines. Add real on-site reviews later.
   - Hub pages: `CollectionPage` + `ItemList`. Guides: `Article` + `FAQPage` where there's a real Q&A block.
5. **Every page answers its question in the first 2 sentences**, in plain words. Example for `/occasion/5th-anniversary-wood-gifts`: "Wood is the traditional 5th-anniversary gift. We engrave solid maple and walnut boards, coasters and ornaments with your names and wedding date, made to order in Pryor, Oklahoma in 3-5 business days."
6. **A fact box on every product page** (a visible `<dl>`): Material · Sizes · Engraving method (laser) · Made in · Lead time · Personalization fields · Care. Machines and people both read this.
7. **Unique content per page. No doorways.** A hub page is generated only if it has ≥ 3 published products or a written guide. Each hub gets a unique 120-250 word intro written for that occasion/recipient, plus 3-5 FAQs specific to it. Never ship templated filler that just swaps the keyword.
8. **Internal links:** product → its occasions/recipients/type hubs; hub → products + related guide; guide → 3-6 products. Breadcrumbs everywhere.
9. **Titles/meta:** `<Primary keyword> | Naked Wood Works`, ≤ 60 chars; unique meta descriptions ≤ 155 chars; one H1 per page; descriptive image alt text naming the design and material.
10. **Speed:** images in WebP/AVIF with width/height set, lazy-loaded below the fold; no layout shift; Lighthouse performance ≥ 90 on mobile for the homepage and a product page (put the scores in BUILD-NOTES.md).
11. **Canonical URLs** on everything; no duplicate product pages. products.json has already merged listings that shared the same photo.
12. **Google Merchant Center feed:** generate `/feeds/google-products.xml` (free listings). It's cheap and puts products in Google Shopping for free.

## Page map (the "massive like PMall" part, done without doorway pages)
```
/                          quiz hero + occasions + best sellers + proof strip
/shop                      all products, filterable (type, occasion, recipient, price)
/c/<type>                  product-type hubs          (taxonomy.product_types)
/occasion/<slug>           occasion hubs              (taxonomy.occasions)
/for/<slug>                recipient hubs             (taxonomy.recipients)
/occasion/<o>/<type>       combo hubs ONLY where >= 3 products (e.g. /occasion/anniversary-gifts/cutting-boards)
/p/<product-slug>          product pages (127 published at launch)
/guides/<slug>             buying guides              (taxonomy.guides)
/realtors                  realtor landing → links to foreverclientgifts.com
/business                  corporate/bulk landing + inquiry form (GHL)
/about                     real shop, real people, Pryor OK (no twee)
/faq, /shipping, /care, /privacy, /terms, /contact
/llms.txt, /sitemap.xml, /robots.txt, /feeds/google-products.xml
```
Growth path: the site gets bigger by adding **products** (the PMall launch list: 150 laser-produceable products, in `PMall_Launch_List.xlsx` in Jackson's Drive) and **guides**, not by multiplying thin pages.

## Off-site (Jackson / later agents, not the cloud build)
Ranked by my estimate of impact, not measured:
1. Get NWW named in real gift guides and on Reddit threads that ask "5th anniversary gift ideas" or "closing gift ideas". Answer honestly, disclose that it's your shop, and follow each subreddit's rules.
2. Keep the Etsy shop, Amazon brand and site saying the same name and facts (consistent entity).
3. Pinterest: pins link to the site's product pages (Pinterest is search-driven, and he has about 15k followers there per his notes).
4. Collect on-site reviews after delivery (GHL review request). Real ones only.
