# Brief: Naked Wood Works storefront

## The business
- **Naked Wood Works (NWW)** is a handmade laser-engraving woodshop in **Pryor, Oklahoma**, run by Jackson with a small team (designer, production staff).
- It sells personalized, engraved **cutting boards, charcuterie/serving boards, wood coasters, 21 oz stemless wine glasses, wood ornaments, wedding guest-book signs, and cake toppers**. Everything is made to order.
- Channels today: Amazon Handmade (the larger channel), Etsy (shop "NakedWoodenWorks", 157 active listings, **46,152 all-time orders / $2.34M on those listings**, pulled 2026-09-27), and **foreverclientgifts.com**, a one-product realtor closing-gift page built as HTML in GoHighLevel with Snipcart checkout.
- Audiences (Jackson's own read): **Amazon = wedding + anniversary**. **Etsy = realtor + housewarming**. Corporate/logo gifts are the third leg.

## Why this site exists
1. **Own the customer.** Marketplaces take fees, own the buyer, and put a competitor's listing next to every NWW listing. On its own site NWW keeps the email/phone and has no adjacent competitor.
2. **Anniversaries repeat every year.** The landing quiz captures the anniversary date, and GHL texts/emails before it, every year. That's the recurring-revenue engine.
3. **Get found by Google and AI assistants** for personalized-gift searches, honestly (see specs/seo-and-ai-visibility.md).
4. **Model PersonalizationMall's structure** (huge, browsable by occasion/recipient/product) with only NWW's own products.

## What the owner cares about (use this to make judgment calls)
- Real numbers only. He is irritated by invented stats. If it isn't in data/proof.json, don't say it.
- Voice is the shop's ("we"), plainspoken, warm, unhurried. No hype, no twee-artisan phrasing, no emoji.
- Elegant wedding look: white / black / metallic gold. The product photos are his real listing heroes and they sell. Keep them.
- He'll deploy it himself, so leave a clean BUILD-NOTES.md with every placeholder and decision he must make.

## Top-selling designs (Etsy all-time, 2026-09-27): lead the homepage "best sellers" with these
| Etsy listing | Design (from photo) | Orders | Revenue |
|---|---|---|---|
| 597958265 | "Home Sweet Home" names board (walnut) | 5,544 | $303,053 |
| 769991218 | Circle monogram family-name board (walnut) | 4,739 | $294,836 |
| 558935788 | Circle monogram names board | 3,937 | $247,668 |
| 619024514 | 3D laser-cut last-name wedding guest-book sign | 2,650 | $184,899 |
| 522810718 | Custom logo board (corporate) | 3,156 | $169,023 |
| 728671481 | Circle monogram names board (styled with cheese) | 2,112 | $132,018 |
| 851270359 | Initial + names charcuterie board | 1,747 | $119,623 |
| 530967556 | Large last-name board with names + est. date | 1,434 | $79,170 |
| 615821307 | "The Grillfather" board | 1,161 | $65,040 |
| 902869141 | Circle monogram wood coasters | 1,608 | $59,808 |
(The design names are my read of the photos; confirm against the image when naming.)

## Held products (publish:false). Jackson decides
- **Licensed characters/brands** (Game of Thrones, Witcher, Star Wars/Yoda, Grinch, Beauty & the Beast, Hodor doorstop): IP risk on an owned site.
- **Profanity/adult-humor designs** (5): kept off by default.
- **Listing 4384947329**: its photo shows a gift box, which NWW doesn't sell. Needs a new photo.
- Add-on listings (oil, stand, rush, extra engraving, note, gift wrap) aren't products; they're cart options.

## Pricing
Defaults come from the live Etsy buyer prices (data/price-ladders.json). Jackson sets the final site prices. The site is priced from that one file so he can change it in one place.

## Related assets in Jackson's Google Drive (not in this repo)
- `PMall_Launch_List.xlsx`: 150 laser-produceable products ranked by PMall review volume, the growth list for new products.
- `__Images/`: 19 curated product photo sets + persona folders. **Warning:** every `02_WHY_CHOOSE_US_*` and `03_ADDON_*` image there is branded "EngraveCraftGifts" or shows gift boxes. Never use those. Phase 2 only.
