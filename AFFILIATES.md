# Affiliate program

Built 2026-10-24. Footer link, a public program page, apply/login, an affiliate dashboard, and an admin page for Jackson.

## Pages
| URL | Who | What |
|---|---|---|
| `/affiliates/` | Public | Program pitch, tier table, terms, FAQ. Linked from every footer. Indexed. |
| `/affiliates/apply/` | Public | Application: name, email, password, link name, PayPal/Venmo, where they'll share. |
| `/affiliates/login/` | Affiliates | Email + password. |
| `/affiliates/dashboard/` | Affiliates | Share link + copy, clicks (30-day and all-time, unique), orders, conversion, this month's sales and tier, progress to the next tier, money (holding / locked / paid / owed), 30-day chart, how-you-get-paid timeline, monthly table, orders, payouts. |
| `/affiliates/admin/` | Jackson | Approve/reject applications, pause, reset passwords, see who is owed, record payouts, credit a phone/bulk order by hand, void orders. |
| `/r/CODE` | Anyone | Share link. Logs the click, sets a 30-day cookie, redirects home (or `?to=/p/some-product/`). |
| `?ref=CODE` | Anyone | Same tracking on any page of the site. |

## Rules (Jackson's choices, 2026-10-24) — all in `server/aff.js` → `PROGRAM`
- Monthly ladder: **20%** under $1,000 in referred sales, **25%** at $1,000-4,999, **30%** at $5,000+. The month's total sets the rate for every order that month (Central time calendar month).
- Commission base: Snipcart order `subtotal` (items after discounts, without shipping/tax). **Check this on the first real test order** (see "Not verified" below).
- Last click wins, 30-day cookie.
- 30-day hold, then locked. Paid on the 1st by PayPal/Venmo when the locked balance is $50+.
- Refunds come off the order; cancellations void it. Orders placed with the affiliate's own email are not credited. Bots and headless browsers are not counted as clicks.

## How an order gets credited
1. Visitor clicks `/r/CODE` or `?ref=CODE` → `nww_ref` cookie (30 days).
2. When Snipcart loads, the site writes the code into the cart's `metadata.affiliate`.
3. Snipcart sends `order.completed` to `/api/snipcart-webhook`. The function checks the request with Snipcart (secret key), then records the order against the affiliate.
4. `order.refund.created` and `order.status.changed → Cancelled` adjust it.

## Turn it on (Jackson, about 10 minutes, after the site is deployed on Cloudflare Pages)
1. **Database:** Cloudflare dashboard → Storage & Databases → D1 → Create → name it `nww-affiliates`.
2. **Bind it:** Workers & Pages → your NWW-Site project → Settings → Bindings → Add → D1 database → variable name **`AFF_DB`** → pick `nww-affiliates`. (Tables create themselves on first use.)
3. **Secrets:** same project → Settings → Variables and Secrets → add as *Secret*:
   - `AFF_ADMIN_PASSWORD` = a long password only you know (logs you into `/affiliates/admin/`).
   - `SNIPCART_SECRET_KEY` = Snipcart dashboard → Account → API keys → **Live secret key**.
   - Optional `AFF_NOTIFY_WEBHOOK` = a GHL inbound-webhook URL to get pinged on new applications.
4. **Snipcart webhook:** Snipcart dashboard → Account → Webhooks → URL `https://<your domain>/api/snipcart-webhook`.
5. **Redeploy** (Deployments → Retry) so the binding and secrets load.
6. **Test:** apply with a second email, approve it in admin, open `/r/<code>`, place one test order, check it shows in the dashboard.

Until step 2 is done the site works normally; only the affiliate API answers "not switched on yet".

## Not verified (assumptions)
1. **Snipcart field names** (`subtotal`, `metadata`, refund `orderToken`/`amount`) come from Snipcart's v3 docs as I know them, not a live order. The local test used simulated webhooks. Confirm with the first test order; if the commission base is off, change the one line in `functions/api/snipcart-webhook.js`.
2. The site's Snipcart key currently returns 402 (see BUILD-NOTES), so no real order can flow until that's fixed.
3. Program terms text on `/affiliates/` (no brand-name ad bidding, no self-referral, right to pause) is my draft. Edit before launch if you want different rules.

## Tested locally (wrangler pages dev + local D1, Playwright)
Apply → pending dashboard → wrong admin password rejected → approve → clicks (bots excluded, open redirect blocked) → `?ref` cookie in a real browser → webhooks (credit, duplicate ignored, self-referral refused, no-code ignored, partial refund) → dashboard math (Oct $1,040 → 25% → $260 holding; Sep $300 → 20% → $60 locked) → admin payout zeroes "owed" → logged-out and affiliate sessions get 401 on admin. Screenshots: `qa/screenshots/affiliates/`.
