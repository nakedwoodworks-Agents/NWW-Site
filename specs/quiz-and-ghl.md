# Landing quiz + GoHighLevel anniversary trigger

Goal (Jackson): a very short quiz when people land. It collects the **anniversary date** and fires SMS + email before that date every year. It also captures **realtor** info without Jackson having to think about it.

## Where the quiz appears
- **Homepage:** the hero *is* the quiz (step 1 buttons shown right away, no click needed to open).
- **Every other page:** a small floating "Find the right gift in 20 seconds" button opens the quiz in a modal. It auto-opens once per visitor after 8 seconds, only on the first visit; remember the dismissal in localStorage inside try/catch. No repeat popups.
- The quiz is a self-contained component: vanilla JS, no framework runtime needed, works without cookies.

## Flow (4 taps max before results)
**Step 1: "Who's the gift for?"** (big tap targets, icons optional)
1. My husband / wife / partner → `anniversary`
2. A couple getting married → `wedding`
3. Someone with a new home → `housewarming`
4. My real-estate clients (I'm a realtor) → `realtor`
5. Clients or employees (business) → `corporate`
6. Mom, Dad or family → `family`
7. Christmas list → `christmas`

**Step 2: branch**
- `anniversary`: **"When's your anniversary?"** Month / Day / Year pickers (year optional). If a year is given, show "That's your **Nth** anniversary". If N = 5: "the wood anniversary, which is literally what we make." Save as `anniversary_date` (YYYY-MM-DD; if no year, use 1900 as the year and set `anniversary_year_unknown=true`).
- `wedding`: "When's the wedding?" (date) → `event_date`. Then "Want us to remind you before *your own* anniversary too?" (optional date) → `anniversary_date`.
- `realtor`: "Brokerage name" (text) + "Closings per month" (1-2 / 3-5 / 6-10 / 10+). Results link out to **foreverclientgifts.com** (the dedicated realtor site) as the first card.
- `corporate`: "How many gifts?" (1-10 / 11-50 / 51-200 / 200+) + "Need them by" (date, optional).
- `housewarming` / `family` / `christmas`: "Budget?" ($25-50 / $50-100 / $100+). Skippable.

**Step 3: "Where should we send your picks?"** (the lead step)
- The GHL form (see below): first name, email, mobile, and an **SMS consent checkbox, unchecked by default**.
- A **"Skip, just show me"** link under it. The results are never held hostage. (This is a default, not a hard rule. Gating raises capture but costs goodwill; Jackson can flip `QUIZ_GATE_RESULTS=true` in config.)

**Step 4: Results.** 3-6 products filtered from `data/products.json` by the step-1 tag (plus budget), sorted by `etsy_sales_all_time` descending (real proof of what sells). Each card has a "Personalize it" button to the product page. Include a link to the matching occasion hub.

## Sending answers into GHL (same system as FCG)
**Mode A (default): GHL form embed with hidden fields**, the same widget FCG uses.
- Jackson (or Claude via Chrome, with his OK) creates one GHL form, **"NWW Gift Quiz"**, with: First name, Email, Phone, SMS consent checkbox, and **hidden fields** with query keys `quiz_path`, `anniversary_date`, `event_date`, `brokerage`, `closings_per_month`, `gift_quantity`, `budget`, `landing_page`.
- The site embeds `https://api.leadconnectorhq.com/widget/form/<GHL_QUIZ_FORM_ID>?quiz_path=...&anniversary_date=...` (prefill by query string) plus `link.msgsndr.com/js/form_embed.js`, exactly like FCG.
- Assumption to verify: GHL forms accept hidden-field prefill by query key. Jackson's team uses GHL daily; if prefill fails, use Mode B.

**Mode B (fallback): the quiz posts JSON to a GHL Inbound Webhook** (`GHL_QUIZ_WEBHOOK_URL`) using `fetch(url,{method:'POST',mode:'no-cors',body:JSON.stringify(payload)})`, and the contact fields are collected in the site's own form. Assumption to verify: in GHL, the Inbound Webhook trigger is a premium trigger and may bill per execution.

The config switch is `QUIZ_MODE = 'ghl_form' | 'webhook'`. Build both paths; default to `ghl_form`. While `GHL_QUIZ_FORM_ID` is still the placeholder, the quiz must still work and show results.

Also fire the Meta Pixel `Lead` event on submit (FCG does the same).

## GHL setup (Jackson or Claude-in-Chrome does this in GHL, not the cloud agent)
**Custom fields (contact):** `anniversary_date` (Date), `event_date` (Date), `quiz_path` (Text), `brokerage` (Text), `closings_per_month` (Dropdown), `gift_quantity` (Dropdown), `budget` (Dropdown).

**Workflow 1: "Quiz → tag + welcome"**
- Trigger: Form Submitted = NWW Gift Quiz.
- Add tag `quiz-<quiz_path>` (if/else on `quiz_path`).
- Email now: "Your picks" (links to the results/collection page for their path).
- SMS now, **only if the consent box is checked**: one short line + link. Sign-off "- The NWW Team". No emoji (brand voice file).
- `realtor` branch: tag `realtor`, add to the realtor pipeline, and send the FCG link (the FCG 50%-off-first-order offer lives there).
- `corporate` branch: tag `corporate`, and create an opportunity if quantity ≥ 11.

**Workflow 2: "Anniversary reminder (every year)"**
- Trigger: GHL's date-based trigger on the custom field `anniversary_date` (I believe GHL calls this "Custom Date Reminder"; the Birthday Reminder trigger only reads DOB). **Verify that it recurs yearly and ignores the year.** If it doesn't, the fallback is a yearly re-arm step at the end of the workflow.
- 30 days before: email + SMS: "[First name], your anniversary is [date]. Everything we make is made to order in 3-5 business days, so now is the easy time."
- 14 days before: email + SMS: a reminder with 3 anniversary picks.
- 7 days before: SMS only, the last realistic order window (made-to-order + shipping).
- Exit: when tag `ordered-this-cycle` is added. Phase 2: a Snipcart `order.completed` webhook tags the buyer in GHL. For now, Jackson's team tags manually or skips this.
- **Offer:** `[OFFER: Jackson decides]`. The site and emails must not invent a discount.

**Workflow 3: "Wedding date → their first anniversary"**
- If `event_date` is set and the quiz path is `wedding`, remind the **buyer** 11 months later: "their first anniversary is coming up."

## Compliance (not legal advice; standard practice)
- SMS only with the explicit checkbox. Unchecked by default. Consent text next to it: "Text me reminders and offers from Naked Wood Works. Msg & data rates may apply. Reply STOP to opt out." (Jackson's GHL number is A2P-approved per his notes.)
- Never text purchased lists (his own Marketing Plan v2 rule).
- A Privacy Policy page and a Terms page must exist and be linked from the form.
