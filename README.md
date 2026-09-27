# NWW-Site

Naked Wood Works' own storefront. Static site (Astro) → Cloudflare Pages. Checkout = Snipcart, same as foreverclientgifts.com.

- **Instructions the build agent follows:** `CLAUDE.md`
- **The prompt that kicks off a build:** `PROMPT.md`
- **After a build:** read `BUILD-NOTES.md` (the agent writes it) for placeholders and decisions.

## Deploy checklist (Jackson, about 20 minutes, once)
1. **Cloudflare Pages:** sign up at dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → pick `nakedwoodworks-Agents/NWW-Site`.
   - Framework preset: Astro · Build command `npm run build` · Output `dist`
   - Environment variable `SITE_URL` = the `https://<project>.pages.dev` URL Cloudflare gives you (change it to your real domain later).
   - Free tier: commercial use allowed, 500 builds/month, 20,000 files per site.
2. **Snipcart:** dashboard → Domains & URLs → add the pages.dev domain (and the real domain later). **Checkout fails without this.** Place one order in Test mode first.
3. **Uploadcare:** copy your public key into `src/config.ts` (`UPLOADCARE_PUBLIC_KEY`). It's still a placeholder on foreverclientgifts.com too, so the FCG logo upload probably doesn't work today either.
4. **GHL:** create the "NWW Gift Quiz" form + custom fields + the 3 workflows in `specs/quiz-and-ghl.md` (Claude can do this in Chrome with your OK). Paste the form ID into `src/config.ts`.
5. **Domain:** when you buy it, add it in Cloudflare Pages → Custom domains, update `SITE_URL`, and add it in Snipcart.
6. **Google:** add the site in Google Search Console, submit `/sitemap.xml`, and add `/feeds/google-products.xml` in Merchant Center (free listings).

## Change prices
Edit `data/price-ladders.json` → push → Cloudflare rebuilds automatically.

## Add products
Add an entry to `data/products.json` + a photo in `public/images/products/` → push.
