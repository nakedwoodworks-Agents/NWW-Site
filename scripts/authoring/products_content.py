# One-off authoring script (kept for the record): applies the photo-review
# naming pass to data/products.json. Run from repo root: python3 scripts/authoring/products_content.py
# Every product photo was viewed before naming. Sample names in photos
# ("Billy & Claudia Barnes") are sample engravings, not product names.
import json, re, sys

P = 'data/products.json'
products = json.load(open(P))

# ---------- merges: same photo (or same scene shot twice) -> one page ----------
MERGE = {  # drop_idx: keep_idx
    32: 1, 12: 3, 22: 3, 26: 4, 67: 38, 71: 38, 93: 70, 113: 108, 137: 114, 134: 121, 138: 128,
}
# ---------- new holds from the photo review ----------
HOLD = {
    39: 'adult humor (sexual innuendo in the saying), same class as the held profanity/adult designs. Jackson decides',
    75: 'photo shows a kraft gift box with tissue (NWW does not sell gift boxes). Needs a new main photo',
    117: 'photo carries unverified badge claims ("Food-Safe Finish", "does not warp or split", "made to last a lifetime") and shows no coasters although the listing is a board + coaster set. Needs a new photo',
}

# ---------- spec paragraphs (facts only from proof.json / price-ladders.json) ----------
BOARD = [
    "Every board is one solid slab of maple or walnut, laser engraved in our shop in Pryor, Oklahoma. Sizes run 8x12 and 10x14 inches (0.75 in thick) and 12x16 inches (1.5 in thick), with a 16x24 inch walnut statement size. We email a free digital proof before we engrave, and each board is made to order in 3-5 business days.",
    "Pick maple, which is light and creamy, or walnut, which is dark brown with more grain movement. It comes in 8x12, 10x14 or 12x16 inches, or 16x24 in walnut; the two larger sizes are 1.5 in thick. It is one solid slab, not glued-up strips. You see a free digital proof before the laser runs, and we make it to order in 3-5 business days.",
    "We cut it from one solid slab of maple or walnut and laser engrave it here in Pryor, Oklahoma. Choose 8x12 or 10x14 inches at 0.75 in thick, 12x16 at 1.5 in thick, or the 16x24 walnut board. A display stand, conditioning oil, a handwritten card and paper gift wrap are optional add-ons. Free digital proof first, then made to order in 3-5 business days.",
]
SERVING = [
    "The design is shown on a serving board; we engrave it on the size and wood you pick below. Each board is one solid slab of maple or walnut: 8x12 or 10x14 inches at 0.75 in thick, 12x16 inches at 1.5 in thick, or 16x24 in walnut. We send a free digital proof before we engrave, and make it to order in 3-5 business days in Pryor, Oklahoma.",
    "It is one solid slab of maple or walnut with a flat face, so the whole surface is usable for cheese, bread and fruit. Sizes run from 8x12 inches up to a 16x24 inch walnut board, and the design is scaled to fit whatever you choose. Free digital proof before the laser runs; made to order in 3-5 business days.",
]
GLASS = [
    "Laser engraved on a 21 oz stemless wine glass in our shop in Pryor, Oklahoma. The saying is fixed, so there is nothing to fill in: choose one glass or a set of 2, 4 or 8 and add it to your cart. Every glass is made to order and ships in 3-5 business days. We suggest hand washing to protect the glass.",
    "It is a 21 oz stemless wine glass, laser engraved so the design is etched into the glass rather than printed on top. There is nothing to personalize: buy a single glass or a set of 2, 4 or 8, and add a note at checkout if you have a question. Made to order in Pryor, Oklahoma in 3-5 business days.",
]
GLASS_PERSONAL = "We engrave it on a 21 oz stemless wine glass, one at a time, in our shop in Pryor, Oklahoma. Buy a single glass or a set of 2, 4 or 8. You get a free digital proof of your wording before we engrave, and it is made to order in 3-5 business days."
COASTER = [
    "The coasters are solid maple or walnut, laser engraved in Pryor, Oklahoma, and sold in sets of 2, 4, 8 or 16. You can add a matching small or medium cutting board to the same order. Free digital proof first, then made to order in 3-5 business days.",
    "Choose maple or walnut in a set of 2, 4 or 8, or a set of 16 for a bigger household or a party. A matching small or medium cutting board can be added in the same order. We send a free digital proof before we engrave, and the set is made to order in 3-5 business days.",
]
ORNAMENT = [
    "It is a laser-engraved wood ornament, made in our shop in Pryor, Oklahoma. Order a single ornament or a set of 2, 5 or 10. We send a free digital proof of your wording, and it is made to order in 3-5 business days.",
    "We laser engrave it on a wood ornament here in Pryor, Oklahoma. Buy one, or a set of 2, 5 or 10 for family, a team or a classroom. You get a free digital proof first, and each order is made in 3-5 business days.",
]
GUESTBOOK = "Sizes run from 20 inches (about 30-45 guests) to 48 inches (about 200-250 guests), in a natural finish or stained, painted black or painted white. We send a free digital proof of your names and date before we cut, and every sign is made to order in 3-5 business days in Pryor, Oklahoma."
CAKE = "It is laser cut in our shop in Pryor, Oklahoma and made to order in 3-5 business days. There is nothing to personalize on the topper itself, so it is a quick addition to a guest book sign order. Tell us your wedding date in the notes so we can plan around it."
SET = "The set is one solid slab of maple or walnut in the size you choose (8x12 up to 16x24 inches), plus solid wood coasters in a set of 2, 4, 8 or 16. Coasters are engraved to match the board. Free digital proof first, then everything is made to order in 3-5 business days in Pryor, Oklahoma."

# idx: (slug, name, occasions, recipients, personalize, short, intro, spec, [type override])
C = {}
def add(i, slug, name, occ, rec, kind, short, intro, spec, typ=None):
    C[i] = dict(slug=slug, name=name, occasions=occ, recipients=rec, personalize=kind, short=short, intro=intro, spec=spec, typ=typ)

# ---- boards: names ----
add(0, 'home-sweet-home-names-cutting-board', 'Home Sweet Home Names Cutting Board',
    ['housewarming', 'realtor-closing-gift', 'wedding'], ['homeowners', 'couples', 'realtors'], 'names-logo',
    'Our best-selling design: a house roofline, fork and knife, and "Home Sweet Home" over your names and year.',
    'This is our best-selling design. A little house roofline, a crossed fork and knife, and "Home Sweet Home" sit above your names and the year you moved in, married or closed. The photo also shows a small business logo in the lower corner, which realtors add to closing gifts. Leave that field empty for a personal housewarming board.',
    BOARD[0])
add(1, 'circle-monogram-family-name-cutting-board', 'Circle Monogram Family Name Cutting Board',
    ['wedding', 'anniversary', 'housewarming'], ['couples'], 'names',
    'A large split initial with your last name through it, first names on top and your date below, inside a dotted double ring.',
    'Your last-name initial is engraved large, with the full last name set across it in capitals. Your first names arch across the top of a dotted double ring and your established date runs along the bottom. It fills the board without crowding it, and it reads well on light maple or dark walnut.',
    BOARD[1])
add(2, 'circle-monogram-anniversary-cutting-board', 'Circle Monogram Anniversary Cutting Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'The circle monogram with your names, last-name initial and wedding date, set as an anniversary gift.',
    'The circle monogram, built around the date that started it: your first names across the top of the ring, your initial and last name in the middle, and your wedding date along the bottom. Wood is the traditional 5th-anniversary material, so it suits that year especially. Put the original wedding date on it, not this year\'s.',
    BOARD[2])
add(5, 'circle-monogram-charcuterie-board', 'Circle Monogram Charcuterie Board',
    ['wedding', 'anniversary', 'housewarming'], ['couples'], 'names',
    'The circle monogram, set toward one corner so a cheese spread fits around it.',
    'This is the circle monogram laid out for serving. The ring holds your first names, your initial with the last name across it, and your established date, and it sits toward one side so there is room for cheese, crackers and fruit. It is the version to pick if the board will spend more time on the table than on the counter.',
    SERVING[0], 'charcuterie-board')
add(6, 'bold-initial-circle-charcuterie-board', 'Bold Initial Circle Charcuterie Board',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'A heavy serif initial and last name inside a dotted ring, with your first names and date in capitals.',
    'A bolder cousin of the circle monogram. Your initial is set in a heavy serif with your last name underlined across it, your first names run around the top of a dotted ring in capitals, and your established date wraps around the bottom. The ring is sized to fill most of the board, so it reads from across a kitchen.',
    SERVING[1])
add(7, 'bold-last-name-established-date-board', 'Bold Last Name Board with Names and Date',
    ['wedding', 'anniversary', 'family'], ['couples', 'her'], 'names',
    'Your last name in large capitals with a tall first letter, your first names in script and your established date.',
    'Your last name runs across the board in large serif capitals, with an oversized first letter that anchors the whole layout. Your first names sit above it in a formal script and your full established date sits below a thin rule. It is a simple, classic layout that suits a wedding, an anniversary or a family kitchen.',
    SERVING[0])
add(23, 'bold-last-name-anniversary-cutting-board', 'Bold Last Name Anniversary Cutting Board',
    ['anniversary'], ['couples'], 'names',
    'Large serif last name, first names in script and your wedding date, as an anniversary board.',
    'Our bold last-name layout, set up as an anniversary gift: your first names in script, your last name in large capitals with a tall first letter, and the date you married written out underneath. The photo shows it on a walnut board propped on a display stand, which is an optional add-on.',
    BOARD[0])
add(102, 'bold-last-name-wedding-cutting-board', 'Bold Last Name Wedding Cutting Board',
    ['wedding', 'bridal-shower'], ['couples'], 'names',
    'A wedding board with the couple\'s new last name in large capitals and their wedding date.',
    'For the couple who just married: their shared last name in large serif capitals, their first names in script above it, and the wedding date written out below a thin rule. It is an easy gift to buy off a registry-free couple, because every kitchen can use a board and this one has their name on it.',
    BOARD[1])
add(136, 'bold-last-name-couples-cutting-board', 'Bold Last Name Couples Cutting Board',
    ['wedding', 'anniversary', 'engagement'], ['couples'], 'names',
    'Your first names, last name and established date in our bold serif layout, in maple or walnut.',
    'The same bold last-name layout, sized for everyday use: first names in a flowing script, the last name in large capitals with an oversized first letter, and an established date below. Engagement, wedding or anniversary, the layout does not change, only the date does.',
    BOARD[2])
add(29, 'classic-last-name-and-date-cutting-board', 'Classic Last Name and Date Cutting Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'First names in script, your last name in wide capitals and your established date, set on a slight angle.',
    'Your first names in a flowing script, your last name in wide serif capitals between two rules, and your established date underneath, all set on a gentle angle across the board. The photo shows a date from the 1980s, which is the point: it works just as well for a 30th anniversary as for a first.',
    BOARD[0])
add(43, 'diagonal-monogram-family-name-board', 'Diagonal Monogram Family Name Board',
    ['anniversary', 'wedding', 'housewarming'], ['couples'], 'names',
    'A large initial, script first names, your last name and date, running corner to corner.',
    'This layout runs corner to corner: a large serif initial at the top, your first names in script, your last name in spaced capitals, and your established date along the bottom. The diagonal lets the name run long, so it handles longer last names better than most of our straight layouts.',
    BOARD[1])
add(85, 'diagonal-monogram-anniversary-board', 'Diagonal Monogram Anniversary Board',
    ['anniversary', 'wedding'], ['couples', 'her'], 'names',
    'Your initial, first names, last name and wedding date on a diagonal, as an anniversary gift.',
    'The diagonal monogram, set up for an anniversary: a large initial, your first names in script, the last name in spaced capitals and your wedding date along the bottom edge. Because it runs corner to corner it leaves open wood at two corners, which is where people rest a knife or a wedge of cheese.',
    BOARD[2])
add(144, 'script-names-last-name-date-board', 'Script Names, Last Name and Date Board',
    ['wedding', 'anniversary', 'engagement'], ['couples'], 'names',
    'Your first names in large script, your last name in capitals and your date, centered.',
    'A centered, balanced layout: your first names large in script across the top, a small flourish, your last name in serif capitals, and your established date in spaced numerals underneath. It is quieter than our bold layouts and works well on a board that will hang on the wall or stand on a display stand.',
    BOARD[0])
add(44, 'script-names-and-year-cutting-board', 'Script Names and Year Cutting Board',
    ['wedding', 'anniversary', 'family'], ['couples'], 'names',
    'Two first names in one long line of script with a small "est." year, for a minimal look.',
    'The most minimal board we make: your two first names in one long line of handwritten-style script across the board, and a small "est." with your year tucked at the end. Most of the wood stays open, so it gets used as a real cutting board, and the engraving still shows on the counter.',
    BOARD[1])
add(58, 'flourish-circle-last-name-board', 'Flourish Circle Last Name Board',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'Your last name across a ring with scroll flourishes, first names above and your date below.',
    'Your last name runs straight across a double ring in serif capitals, framed by two scroll flourishes. Your first names follow the top of the ring and your established date follows the bottom. It is more ornate than our other circle designs, and it shows up especially clearly on maple.',
    BOARD[2])
add(19, 'split-letter-monogram-cutting-board', 'Split Letter Monogram Cutting Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'One tall initial with your last name in script cutting through the middle.',
    'One tall serif initial, with your last name in script running through a band across its middle. It is a single, simple mark, so it looks deliberate on a large board and still fits a small one. Add an established date in the date field if you want one; the photo shows the design without it.',
    BOARD[0])
add(97, 'split-letter-last-name-board', 'Split Letter Last Name Board',
    ['wedding', 'housewarming'], ['couples', 'homeowners'], 'names',
    'A tall initial split by your last name in script, centered on the board.',
    'The split-letter monogram, centered: a tall initial, with a band across the middle that carries your last name in script. It suits a family name more than a couple\'s first names, which makes it an easy housewarming gift when you know the last name and not much else.',
    BOARD[1])
add(36, 'initial-last-name-engagement-board', 'Initial and Last Name Engagement Board',
    ['engagement', 'wedding'], ['couples'], 'names',
    'A large initial, a framed date, your last name in capitals and first names in script.',
    'A large serif initial sits over a small framed date, then your last name in wide capitals and your first names in script along the bottom. For an engagement gift, use the wedding date if it is set, or the engagement date if it is not. The photo shows it on maple.',
    BOARD[2])
add(49, 'framed-date-last-name-charcuterie-board', 'Framed Date Last Name Charcuterie Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'Initial, framed established date, last name and first names, stacked on a serving board.',
    'The same stacked layout as our engagement board, shown here on walnut with a cheese spread: your initial, a small framed established date, your last name in large capitals, and your first names in script. The layout sits in the middle of the board with room around it for serving.',
    SERVING[0])
add(33, 'large-initial-framed-date-charcuterie-board', 'Large Initial Framed Date Charcuterie Board',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'An oversized initial with a framed date across it, your first names and your last name in script.',
    'An oversized initial fills most of the board, with your established date set in a frame across it. Under that, your first names in serif capitals and your last name in script. It is a big, graphic design, so it looks best on 10x14 inches and up.',
    SERVING[1])
add(64, 'filigree-last-name-charcuterie-board', 'Filigree Last Name Charcuterie Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'Your last name in large capitals between two filigree borders, with first names and date.',
    'Your last name in large capitals, framed above and below by filigree borders, with your first names in script above it and your established date below. The borders make it feel finished even on a big board, and the date line suits a long marriage as well as a new one.',
    SERVING[0])
add(116, 'filigree-last-name-newlywed-board', 'Filigree Last Name Newlywed Board',
    ['wedding', 'engagement', 'bridal-shower'], ['couples', 'her'], 'names',
    'The filigree last-name layout as a newlywed gift, with your wedding date underneath.',
    'The filigree layout, set up for newlyweds: their new last name in large capitals between two ornamental borders, their first names in script and the wedding date underneath. It is a good bridal shower gift because it needs only the names and the date, which everyone at the shower already knows.',
    BOARD[1])
add(69, 'established-family-name-charcuterie-board', 'Established Family Name Charcuterie Board',
    ['family', 'housewarming'], ['couples', 'homeowners'], 'names',
    '"The [Last Name]s" with a small diamond rule and "Established" year, set low on the board.',
    '"The" plus your family name in serif capitals, a thin rule with a small diamond, and "Established" with your year. It sits in the lower corner, so most of the board stays open for serving. It is a good fit for a family name rather than a couple\'s first names.',
    SERVING[1])
add(87, 'established-family-name-anniversary-board', 'Established Family Name Anniversary Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'Your family name and "Established" year in a corner, as an anniversary serving board.',
    'The same understated "The [Last Name]s, Established [year]" layout, shown here as an anniversary board set for two. Because the engraving stays in one corner, the board can hold a full dinner spread and still show the names. Use the year you married.',
    SERVING[0])
add(120, 'established-family-name-wedding-board', 'Established Family Name Wedding Board',
    ['wedding', 'anniversary'], ['couples'], 'names',
    '"The [Last Name]s, Established [year]" as a wedding gift, shown on maple.',
    'The family-name layout as a wedding gift: "The" with the couple\'s last name, a small diamond rule and "Established" with the wedding year. On maple, shown here, the engraving is dark against light wood; on walnut it is a quieter tone-on-tone.',
    BOARD[2])
add(139, 'established-family-name-couples-board', 'Established Family Name Couples Board',
    ['anniversary', 'christmas'], ['couples'], 'names',
    'A thick board with your family name and established year in the corner, for a couple.',
    'Your family name and "Established" year, engraved in the corner of a board that will spend most of its life on a table. The photo shows the 12x16 inch size, 1.5 inches thick, set with wine and cheese for an anniversary or a holiday dinner.',
    SERVING[1])
add(122, 'script-family-name-and-year-board', 'Script Family Name and Year Board',
    ['wedding', 'bridal-shower', 'anniversary'], ['couples'], 'names',
    '"The [Last Name]s" in large script with "Est." and the year, set on a slight angle.',
    '"The" and your family name in one large sweep of script, set on a slight angle, with "Est." and the year beneath. It is a softer, handwritten look than our serif designs. The photo shows it on walnut with a holiday cheese spread.',
    BOARD[0])
add(96, 'mr-and-mrs-last-name-board', 'Mr and Mrs Last Name Board',
    ['wedding', 'bridal-shower', 'engagement'], ['couples', 'her'], 'names',
    '"mr & mrs" in script over your last name and your wedding date.',
    '"mr & mrs" in a relaxed script, your last name large underneath, and your wedding date written out below. It photographs well at a shower and goes straight into the kitchen afterward. The photo shows it on maple.',
    BOARD[1])
add(28, 'circle-monogram-bridal-shower-board', 'Circle Monogram Bridal Shower Board',
    ['bridal-shower', 'wedding', 'anniversary'], ['couples', 'her'], 'names',
    'The circle monogram with the couple\'s names and wedding date, as a shower or wedding gift.',
    'Our circle monogram, as a shower gift: the couple\'s first names around the top of the ring, their initial and last name in the middle, and their wedding date around the bottom. If the date is not set yet, leave it off, or tell us in the notes and we will leave room for the year.',
    BOARD[2])
add(65, 'circle-monogram-couples-cutting-board', 'Circle Monogram Couples Cutting Board',
    ['anniversary', 'wedding', 'housewarming'], ['couples'], 'names',
    'The circle monogram in walnut, sized for everyday chopping.',
    'The circle monogram, shown on a walnut board in daily use. Your first names follow the top of the dotted ring, the initial and last name sit in the center, and your established date follows the bottom. It is one design that works for a couple at almost any stage.',
    BOARD[0])
add(18, 'home-state-names-cutting-board', 'Home State Names Cutting Board',
    ['housewarming', 'realtor-closing-gift', 'wedding'], ['homeowners', 'couples', 'realtors'], 'state',
    '"HOME" with your state in place of the O, over your names and established date.',
    'The word HOME in large serif letters, with the outline of a state standing in for the O. The photo shows Oklahoma, where our shop is. Your first names run underneath in script with your established date below. Tell us the state in the state field.',
    BOARD[1])
add(70, 'welcome-home-address-cutting-board', 'Welcome Home Address Cutting Board',
    ['housewarming', 'realtor-closing-gift'], ['homeowners', 'couples', 'realtors'], 'address',
    '"welcome HOME" with sprigs, your names and your street address.',
    '"welcome" in script over "HOME" in serif capitals, with a leaf sprig at each end. Your names go underneath in script and your street address below that in spaced capitals. It is the most specific housewarming board we make, because it names the house, not only the people.',
    BOARD[2])
add(78, 'home-sweet-home-coordinates-board', 'Home Sweet Home Coordinates Board',
    ['housewarming', 'realtor-closing-gift'], ['homeowners', 'realtors'], 'address',
    '"Home Sweet Home" in script with the GPS coordinates of the house.',
    '"Home Sweet Home" in a formal script, with the latitude and longitude of the house underneath. Put the coordinates in the address field; they will show on your free digital proof. The photo shows it on maple. It is simple, a little mysterious to guests, and specific to one place.',
    BOARD[0])
add(10, 'new-home-new-adventures-key-cutting-board', 'New Home, New Adventures Key Cutting Board',
    ['housewarming', 'realtor-closing-gift'], ['homeowners', 'couples', 'realtors'], 'names',
    '"new home, new adventures, new memories" with a pair of skeleton keys and your names.',
    'Two skeleton keys on a ring, next to three lines: "new home," "new adventures" in script, and "new memories." Your names go on the last line. It is a light, happy housewarming design, and the photo shows it on maple.',
    BOARD[1])
add(128, 'new-home-key-serving-board', 'New Home Key Serving Board',
    ['housewarming', 'realtor-closing-gift'], ['homeowners', 'couples', 'realtors'], 'names',
    'The "new home, new adventures, new memories" keys design, shown on walnut.',
    'The keys design on walnut: a pair of skeleton keys, "new home," "new adventures" in script, "new memories," and your names on the last line. Walnut makes the engraving read darker and more formal than it does on maple. It suits an agent who wants a closing gift that is personal rather than branded.',
    SERVING[0], 'charcuterie-board')
add(15, 'welcome-home-key-monogram-board', 'Welcome Home Key Monogram Board',
    ['housewarming', 'realtor-closing-gift'], ['homeowners', 'realtors'], 'names',
    'A skeleton key with your initial as the bow, your names and year along the shaft, and "Welcome Home."',
    'A long skeleton key runs across the board with your initial framed in its bow. Your names and the year sit along the top of the shaft, and "Welcome Home" runs underneath in a single line of script. The photo shows it on maple.',
    BOARD[2])

# ---- realtor boards ----
add(30, 'home-sweet-home-realtor-closing-board', 'Home Sweet Home Realtor Closing Board',
    ['realtor-closing-gift', 'housewarming'], ['realtors', 'homeowners'], 'names-logo',
    'Home Sweet Home with the buyers\' names and year, plus your logo small in the corner.',
    'Our best-selling Home Sweet Home layout, set up for agents: the buyers\' names and move-in year in the center, and your logo engraved small in the lower corner, where it reminds them who helped without turning the gift into an ad. Upload your logo in the logo field. For recurring closings, see our realtor page.',
    BOARD[1])
add(95, 'home-sweet-home-agent-signature-board', 'Home Sweet Home Board with Agent Signature',
    ['realtor-closing-gift', 'housewarming'], ['realtors', 'homeowners'], 'names-logo',
    'Home Sweet Home with the buyers\' names, plus a small "Compliments of" line with your name.',
    'Home Sweet Home over the buyers\' names and year, with a small two-line signature in the corner: "Compliments of" and your name and title. Put your wording in the business line field, or upload a logo instead. The photo shows it on walnut.',
    BOARD[2])
add(115, 'realtor-signature-corner-board', 'Realtor Signature Corner Board',
    ['realtor-closing-gift', 'housewarming'], ['realtors', 'homeowners'], 'names-logo',
    'A plain walnut board with the buyers\' family name and your name and number small in the corner.',
    'The quietest closing gift we make: the buyers\' family name in the lower corner, with your name, title and phone number in small type below it. Most of the board stays clean, so it gets used every day, and your details stay on the counter for the next time they need an agent.',
    BOARD[0])
add(142, 'realtor-logo-corner-closing-board', 'Realtor Logo Corner Closing Board',
    ['realtor-closing-gift', 'corporate-gifts'], ['realtors', 'businesses'], 'logo',
    'Your brokerage logo and a "Compliments of" line with your contact details, in the corner.',
    'Your brokerage logo engraved in the lower corner, with "Compliments of," your name, email and phone underneath. The photo shows a real customer\'s brokerage logo on walnut. Upload your logo file and put the text lines in the business line field.',
    BOARD[1])

# ---- logo / corporate ----
add(4, 'custom-logo-cutting-board', 'Custom Logo Cutting Board',
    ['corporate-gifts', 'employee-appreciation'], ['businesses'], 'logo',
    'Your company logo and tagline, engraved large across the board.',
    'Your logo, engraved large and centered, with your tagline if you have one. The photo shows a customer\'s restaurant logo on walnut. Send us a clean file (vector is best, a high-resolution image works) and we will show you exactly how it will engrave on the free digital proof.',
    BOARD[2])
add(11, 'full-logo-cutting-board', 'Full Logo Cutting Board',
    ['corporate-gifts', 'employee-appreciation'], ['businesses'], 'logo',
    'Your logo engraved edge to edge across the face of the board.',
    'Your logo, scaled to fill the face of the board. The photo shows our own shop logo on walnut, on the optional display stand, which suits a front desk or a lobby. If a logo needs simplifying for the laser, we will flag it on your free digital proof.',
    BOARD[0])
add(143, 'employee-appreciation-logo-board', 'Employee Appreciation Logo Board',
    ['employee-appreciation', 'corporate-gifts'], ['businesses'], 'logo',
    'Your company logo on a solid wood board, as a gift employees take home.',
    'A logo board for your team rather than your clients: your company logo engraved large, a board they will use at home, and one order for everyone. The photo shows our own logo on walnut. Order the quantity you need in one cart; for large quantities, see our business page.',
    BOARD[1])
add(13, 'corner-logo-cutting-board', 'Corner Logo Cutting Board',
    ['corporate-gifts', 'realtor-closing-gift'], ['businesses', 'realtors'], 'logo',
    'Your logo and company name, small and neat in the corner of the board, shown on walnut.',
    'Your logo mark and company name engraved small in the corner, so the board is a kitchen tool first and a business card second. It is meant to be used, which is the point of a client gift. The photo shows a customer logo on walnut.',
    BOARD[2])
add(53, 'corner-logo-client-gift-board', 'Corner Logo Client Gift Board',
    ['corporate-gifts'], ['businesses'], 'logo',
    'A board with your logo small in one corner, as a client thank-you, shown on walnut.',
    'The corner-logo layout as a client thank-you: a solid board with your logo and name small along one edge, and the rest left open for cooking. It is a good gift for clients who would not display a plaque but will chop onions on a board for years.',
    BOARD[0])
add(50, 'logo-cutting-board-corporate-gifts', 'Logo Cutting Board for Corporate Gifts',
    ['corporate-gifts', 'employee-appreciation'], ['businesses'], 'logo',
    'Your logo, centered at a moderate size, on a solid wood board.',
    'Your logo centered on the board at a moderate size, with room around it. The photo shows sample text where your logo goes. It is a straightforward choice for holiday client gifts, event gifts and thank-yous, and every board in an order gets the same free proof before we engrave.',
    BOARD[1])
add(111, 'years-of-service-appreciation-board', 'Years of Service Appreciation Board',
    ['employee-appreciation', 'corporate-gifts'], ['businesses'], 'employee',
    'An appreciation board with your company name, the employee\'s name, a line of thanks and their years.',
    'A recognition gift that gets used: your company name or logo at the top, "In Appreciation of" and the employee\'s name, a line like "For Ten Years of Dedication to Our Team," and the years of service. The sample names in the photo are placeholders. Write your exact wording in the fields and we will set it.',
    BOARD[2])

# ---- themed boards ----
add(8, 'grillfather-cutting-board', 'The Grillfather Cutting Board',
    ['fathers-day', 'birthday'], ['him'], 'saying',
    '"The Grillfather" in heavy lettering with a steaming sausage, for the one who runs the grill.',
    '"The Grillfather" in big, heavy lettering, with a steaming sausage over the top. It is for the one person at every cookout who will not let anyone else touch the grill. The photo shows it on walnut. Add anything you want us to know in the notes.',
    BOARD[0])
add(47, 'veteran-flag-cutting-board', 'Veteran Flag Cutting Board',
    ['military-veteran', 'fathers-day'], ['him'], 'saying',
    'A distressed vertical flag with "VETERAN" down one side and a branch emblem at the top.',
    'A distressed flag running vertically across the board, "VETERAN" in stencil capitals down one side, and a branch emblem at the top. The photo shows the Navy version on walnut. It is a gift for a retirement, a homecoming or Veterans Day.',
    BOARD[1])
add(80, 'handwritten-recipe-cutting-board', 'Family Recipe Cutting Board',
    ['family', 'mothers-day', 'christmas'], ['her', 'grandparents'], 'recipe',
    'A family recipe, laid out in script with a title and sign-off, engraved on the board.',
    'The recipe that someone in your family has made a hundred times, engraved on a board: a script title, the ingredients in two columns, the steps, and a sign-off like "Love, Grammy." Type the recipe in, or upload a photo of the original card. The free digital proof shows exactly how it will read before we engrave.',
    BOARD[2])
add(132, 'moms-kitchen-birth-flower-board', "Mom's Kitchen Birth Flower Board",
    ['mothers-day', 'family', 'birthday'], ['her', 'grandparents'], 'names',
    '"Everything is better in Mom\'s Kitchen" with a birth flower, name and year for each child.',
    '"Everything is better in" over "Mom\'s Kitchen" in script, then a row of birth flowers, one per child, each with a name and birth year underneath. Swap "Mom" for "Grandma," "Nana" or whatever she is called. Tell us each name and birth month in the names field.',
    BOARD[0])
add(83, 'circle-monogram-board-and-coaster-gift-set', 'Circle Monogram Board and Coaster Gift Set',
    ['wedding', 'anniversary', 'housewarming'], ['couples', 'homeowners'], 'names',
    'The circle monogram board with coasters engraved to match, as one set.',
    'Our circle monogram, on a board and a set of coasters that match: your first names around the top of the dotted ring, your initial and last name in the middle, and your established date along the bottom. The photo shows the walnut board. Pick the board size and the coaster set separately below.',
    SET, 'board-coaster-set')

# ---- serving boards ----
add(16, 'split-letter-monogram-serving-board', 'Split Letter Monogram Serving Board',
    ['wedding', 'anniversary', 'housewarming'], ['couples', 'homeowners'], 'names',
    'A tall initial with your last name in script across it, set low on a serving board.',
    'A tall serif initial with your last name in script running across its middle, engraved low and to one side so the board can hold fruit, cheese and a knife. The photo shows it on maple. It is one of the simplest designs we make, and one of the easiest to give without knowing much about the couple.',
    SERVING[0])
add(34, 'last-name-cheese-board', 'Last Name Cheese Board',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'Your first names in script, last name in capitals and your date, at one end of a cheese board.',
    'Your first names in script, your last name in serif capitals with a tall first letter, and your established date, engraved at one end so the rest of the board is free for serving. The photo shows it on walnut, and it works as a wedding gift that gets used at the first dinner party.',
    SERVING[1])
add(126, 'names-and-date-serving-tray', 'Names and Date Serving Tray',
    ['wedding', 'anniversary', 'housewarming'], ['couples'], 'names',
    'First names, last name and established date engraved at one end of a walnut serving board.',
    'The last-name layout at the end of a serving board: first names in script, the last name in capitals under a tall first letter, and the established date on the line below. It sits low so a full spread fits above it. The photo shows it on walnut.',
    SERVING[0])
add(35, 'circle-monogram-cheese-board', 'Circle Monogram Cheese Board',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'The circle monogram engraved toward one end of a walnut serving board.',
    'The circle monogram at one end of a serving board: your first names around the top of the dotted ring, your initial and last name in the center, and your established date around the bottom. It leaves most of the board open for cheese and bread.',
    SERVING[1])
add(63, 'initial-last-name-serving-board', 'Initial and Last Name Serving Board',
    ['wedding', 'housewarming'], ['couples', 'homeowners'], 'names',
    'Initial, framed date, last name and first names, engraved at the end of a maple serving board.',
    'Our stacked layout, placed at one end of a serving board: your initial, a small framed date, your last name in capitals and your first names in script. The photo shows it on maple with cheese and fruit. It suits a couple who entertain.',
    SERVING[0])
add(46, 'circle-stamp-monogram-serving-board', 'Circle Stamp Monogram Serving Board',
    ['wedding', 'anniversary', 'housewarming'], ['couples', 'her', 'homeowners'], 'names',
    'A small round stamp-style monogram with names, initial, last name and date, near the end of the board.',
    'A compact round monogram, like a maker\'s stamp: your first names around the top, your initial with the last name across it, and your date around the bottom, engraved near one end. The photo shows it on maple. It is subtle enough for a board that will be used every day.',
    SERVING[1])

# ---- coasters ----
add(9, 'circle-monogram-wood-coasters', 'Circle Monogram Wood Coasters',
    ['wedding', 'anniversary', 'housewarming'], ['couples', 'homeowners'], 'names',
    'Our circle monogram on solid wood coasters: names, initial, last name and date on each one.',
    'The circle monogram on solid wood coasters: your first names around the top of the dotted ring, your initial with the last name across it, and your established date around the bottom, on every coaster in the set. They pair with the circle monogram board.',
    COASTER[0])
add(114, 'circle-monogram-anniversary-coasters', 'Circle Monogram Anniversary Coasters',
    ['anniversary', 'wedding'], ['couples'], 'names',
    'Circle monogram coasters with your names and wedding date, stacked as an anniversary gift.',
    'The circle monogram coasters as an anniversary gift: your names, initial, last name and wedding date on each coaster. A set of 4 suits most couples' tables. Wood is the traditional 5th-anniversary material, and coasters are an easy way to give it.',
    COASTER[1])
add(48, 'split-letter-monogram-coasters', 'Split Letter Monogram Coasters',
    ['wedding', 'housewarming'], ['couples', 'homeowners'], 'names',
    'A tall initial with your last name in script across it, on square wood coasters.',
    'The split-letter monogram on square coasters: a tall initial with your last name in script through the middle. It is a clean mark that reads at a glance on a coffee table. The photo shows it on walnut.',
    COASTER[0])
add(68, 'circle-stamp-monogram-coasters', 'Circle Stamp Monogram Coasters',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'A round stamp monogram with first names, initial, last name and date on each coaster.',
    'A round, stamp-style monogram on each coaster: your first names around the top, a bold initial with the last name across it, and the date around the bottom. The photo shows it on maple under a whiskey glass.',
    COASTER[1])
add(86, 'initial-last-name-coasters', 'Initial and Last Name Coasters',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'Initial, framed date, last name and first names, stacked on each square coaster.',
    'Our stacked layout at coaster size: a serif initial, a small framed date, your last name in capitals and your first names in script. The photo shows it on maple. It matches our initial and last name boards if you want a board and coasters together.',
    COASTER[0])
add(72, 'laurel-wreath-family-name-coasters', 'Laurel Wreath Family Name Coasters',
    ['wedding', 'anniversary', 'housewarming'], ['couples', 'homeowners'], 'names',
    '"The [Last Name]s" in script inside a laurel wreath, with your year.',
    '"The" and your family name in script inside a laurel wreath, with your year underneath. It is a soft, simple design that suits a family name, which makes it an easy housewarming or anniversary gift. The photo shows it on walnut.',
    COASTER[1])
add(106, 'split-initial-names-date-coasters', 'Split Initial Names and Date Coasters',
    ['wedding', 'anniversary'], ['couples'], 'names',
    'First names on top, a tall initial with your last name, and your full date along the bottom.',
    'Your first names across the top, a tall initial with your last name set across it, and your full date written out along the bottom. It is a little more formal than our round monograms. The photo shows it on walnut.',
    COASTER[0])
add(110, 'home-state-names-coasters', 'Home State Names Coasters',
    ['housewarming', 'realtor-closing-gift'], ['homeowners', 'realtors'], 'state',
    '"HOME" with your state as the O, your names and your date, on each coaster.',
    'The home state design on coasters: HOME with the outline of a state in place of the O, your names in script and your date. The photo shows Oklahoma on walnut. Tell us the state in the state field.',
    COASTER[1])

# ---- glasses: personalized ----
add(17, 'monogram-last-name-wedding-wine-glass', 'Monogram Last Name Wedding Wine Glass',
    ['wedding', 'anniversary'], ['couples'], 'name-glass',
    'A large initial, a framed date, your last name and first names, etched on a stemless glass.',
    'A large serif initial, a small framed established date, your last name in capitals and your first names in script, etched on a stemless glass. It matches our last-name boards, so it is easy to give as a pair with one.',
    GLASS_PERSONAL)
add(31, 'circle-monogram-wine-glass', 'Circle Monogram Wine Glass',
    ['wedding', 'anniversary'], ['couples'], 'name-glass',
    'The circle monogram, etched on a stemless wine glass.',
    'Our circle monogram etched on glass: your first names around the top of the dotted ring, your initial with the last name across it, and your date around the bottom. It matches the circle monogram board and coasters.',
    GLASS_PERSONAL)
add(79, 'couples-circle-monogram-wine-glasses', 'Couples Circle Monogram Wine Glasses',
    ['anniversary', 'wedding', 'christmas'], ['couples'], 'name-glass',
    'The circle monogram on a stemless glass; order the set of 2 for one each.',
    'The circle monogram on a pair of stemless glasses, one for each of you: first names, initial, last name and date on both. Choose the set of 2 below. It is a good small anniversary gift, and a good add to a board.',
    GLASS_PERSONAL)
add(38, 'last-name-wedding-wine-glass', 'Last Name Wedding Wine Glass',
    ['wedding', 'anniversary', 'bachelorette'], ['couples', 'her'], 'name-glass',
    'Your last name in large capitals, first names in script and your date, etched on the glass.',
    'Your last name in large serif capitals with a tall first letter, your first names in script and your date written out, etched on a stemless glass. Order a pair for the two of you, or a set of 4 or 8 for the head table.',
    GLASS_PERSONAL)
add(55, 'initial-and-name-wine-glass', 'Initial and Name Wine Glass',
    ['birthday', 'fathers-day', 'wedding'], ['him', 'her'], 'name-glass',
    'One tall initial with a first or last name in script across it, etched on a stemless glass.',
    'One tall serif initial, with a name in script across the bottom of it. It works for one person\'s first name, a family last name, or a groomsman\'s name at the wedding. The photo shows it with white wine.',
    GLASS_PERSONAL)
add(84, 'bridesmaid-name-wine-glass', 'Bridesmaid Name Wine Glass',
    ['wedding', 'bachelorette'], ['her'], 'name-glass',
    '"Bridesmaid" (or any role), her name in large script and the wedding date.',
    'Her role in small capitals, her first name large in script, and the wedding date underneath. Change "Bridesmaid" to "Maid of Honor" or "Bride" in the text field. Order one per person, or a set of 4 or 8 if every glass gets the same name.',
    GLASS_PERSONAL)

# ---- glasses: fixed sayings ----
def glass(i, slug, name, occ, rec, short, intro, v=0):
    add(i, slug, name, occ, rec, 'saying', short, intro, GLASS[v])
glass(14, 'my-favorite-child-gave-me-this-glass', 'My Favorite Child Gave Me This Glass',
    ['mothers-day', 'fathers-day', 'birthday'], ['her', 'him'],
    '"My favorite child gave me this glass," in tall hand-lettered capitals.',
    '"My favorite child gave me this glass," in tall, narrow hand-lettered capitals. It settles an old argument between siblings in one line. Mom or Dad gets the glass; whoever bought it gets the title.', 0)
glass(125, 'favorite-child-mothers-day-wine-glass', "Favorite Child Mother's Day Wine Glass",
    ['mothers-day', 'birthday'], ['her'],
    'The "My favorite child gave me this glass" saying, as a Mother\'s Day gift.',
    'The same "My favorite child gave me this glass" saying, in tall hand-lettered capitals, for Mother\'s Day. If there is more than one of you, it is only fair that whoever orders first gets to be the favorite. There is nothing to personalize.', 1)
glass(82, 'sorry-you-had-to-raise-my-sibling-wine-glass', 'Sorry You Had to Raise My Sibling Wine Glass',
    ['mothers-day', 'fathers-day', 'birthday'], ['her', 'him'],
    '"Sorry you had to raise my sibling," signed "your favorite."',
    '"Sorry you had to raise my sibling" in big serif letters, signed with a heart and "your favorite." It works for either parent, and it is funnier if the sibling is at the table when it gets opened.', 0)
glass(98, 'mom-sorry-you-had-to-raise-my-sibling-wine-glass', 'Mom, Sorry You Had to Raise My Sibling Wine Glass',
    ['mothers-day', 'birthday'], ['her'],
    '"Mom" in script, then the full "spoiled, bratty, messy and ungrateful" apology, signed "your favorite."',
    '"Mom" in script, then the long version: sorry you had to raise such a spoiled, bratty, messy and ungrateful child, like my sibling. Signed "your favorite." It is a mouthful, which is the joke.', 1)
glass(45, 'mom-ugly-children-wine-glass', "Mom, At Least You Don't Have Ugly Children Wine Glass",
    ['mothers-day', 'birthday'], ['her'],
    '"Mom, no matter what life throws at you, at least you don\'t have ugly children."',
    '"Mom" in script, then "No matter what life throws at you, at least you don\'t have ugly children." Nothing to personalize.', 0)
glass(108, 'youre-an-amazing-mother-wine-glass', "You're an Amazing Mother Wine Glass",
    ['mothers-day', 'birthday'], ['her'],
    '"you\'re an Amazing mother" with a small heart, in mixed serif and script.',
    '"you\'re an" in serif, "Amazing" in a large flowing script, and "mother" with a small heart. It is the sincere one in our Mother\'s Day glasses, for when the joke glasses are not the right fit.', 1)
glass(41, 'dad-the-man-the-myth-the-legend-wine-glass', 'Dad, The Man, The Myth, The Legend Wine Glass',
    ['fathers-day', 'birthday'], ['him', 'grandparents'],
    '"Dad. The Man. The Myth. The Legend." in four stacked lines of block capitals.',
    '"Dad. The Man. The Myth. The Legend." in four lines of clean block capitals. It works for a dad or a grandfather. Nothing to personalize.', 0)
glass(73, 'trust-me-im-an-engineer-wine-glass', "Trust Me, I'm an Engineer Wine Glass",
    ['graduation', 'birthday', 'fathers-day'], ['him'],
    '"Trust me, I\'m an Engineer" wrapped in rows of binary.',
    '"Trust me, I\'m an Engineer" in bold capitals, wrapped in rows of ones and zeros. It is a graduation gift for a new engineer, or a birthday gift for one who has been saying it for thirty years.', 1)
glass(76, 'im-an-engineer-im-good-with-math-wine-glass', "I'm an Engineer, I'm Good With Math Wine Glass",
    ['graduation', 'fathers-day', 'birthday'], ['him'],
    '"I\'m an engineer" misspelled three times, then "I\'m good with math."',
    '"I\'m an" and then "engineer" spelled wrong, crossed out and tried again, and finally "I\'m good with math." It is a gentle joke for the engineer in the family, graduating or long since graduated.', 0)
glass(42, 'i-teach-little-humans-teacher-wine-glass', "I Teach Little Humans Teacher Wine Glass",
    ['teacher-appreciation', 'christmas'], ['teachers'],
    '"I teach little humans. What\'s your excuse?"',
    '"I teach" in script, "little humans" in tall capitals, and "What\'s your excuse?" underneath. It is a teacher gift for the end of the year or the holidays, from a parent who knows what a room of seven-year-olds is like.', 1)
glass(92, 'nurse-life-wine-glass', 'Nurse Life Wine Glass',
    ['nurse-appreciation', 'graduation'], ['her'],
    '"Nurse life" in script with a stethoscope drawn around it.',
    '"Nurse life" in script, with a stethoscope curling around the words. It is a gift for nursing school graduation, Nurses Week, or a nurse who just finished a run of night shifts.', 0)
glass(57, 'girl-boss-building-her-empire-wine-glass', 'Girl Boss Building Her Empire Wine Glass',
    ['birthday', 'graduation'], ['her'],
    '"Just a Girl Boss Building Her Empire" with a small diamond.',
    '"Just a" and "Building" in spaced capitals, "Girl Boss" and "Her Empire" in script, with a small diamond at the top. It is a gift for a promotion, a new business or a birthday.', 1)
glass(104, 'girl-boss-wine-glass', 'Girl Boss Wine Glass',
    ['birthday', 'graduation'], ['her'],
    '"girl" in script over "BOSS" in tall capitals.',
    '"girl" in a looping script over "BOSS" in tall narrow capitals. Short and to the point. It is a good gift for a new job, a promotion or the friend who runs everything.', 0)
glass(81, 'i-make-money-moves-wine-glass', 'I Make Money Moves Wine Glass',
    ['birthday', 'graduation'], ['her'],
    '"I make MONEY moves" in mixed script and tall capitals.',
    '"I make" and "moves" in brush script with "MONEY" in tall capitals between them. It is for a promotion, a first real paycheck or a side business that just took off.', 1)
glass(77, 'sip-happens-wine-glass', "Sip Happens, It's OK to Wine Glass",
    ['mothers-day', 'birthday'], ['her'],
    '"sip happens" in script, "It\'s OK to wine" underneath.',
    '"sip happens" in a big flowing script with "It\'s OK to wine" in small capitals below. It is an easy birthday or Mother\'s Day gift for someone who has had a week.', 0)
glass(100, 'wine-because-adulting-is-hard-glass', 'Wine, Because Adulting Is Hard Glass',
    ['birthday', 'mothers-day', 'graduation'], ['her'],
    '"Wine" with a glass for the i, then "because adulting is hard."',
    '"Wine" in script with a small wine glass standing in for the i, and "because adulting is hard" in spaced capitals. It is a good graduation gift, and an honest one.', 1)
glass(88, 'youre-my-favorite-cardio-wine-glass', "You're My Favorite Cardio Wine Glass",
    ['birthday'], ['her'],
    '"You\'re my favorite cardio" in tall hand-lettered capitals.',
    '"You\'re my favorite cardio" in tall hand-lettered capitals, from someone who has been meaning to get back to the gym. A birthday gift that needs no explaining.', 0)
glass(89, 'i-do-yoga-to-relax-wine-glass', 'I Do Yoga to Relax Wine Glass',
    ['birthday', 'mothers-day'], ['her'],
    '"I do yoga to relax (just kidding, I drink wine in yoga pants)."',
    '"I do YOGA to relax," and then in small type underneath, "just kidding, I drink wine in yoga pants." It is a birthday or Mother\'s Day glass for someone who owns the pants, at least.', 1)
glass(99, 'started-from-the-bottle-wine-glass', "Started From the Bottle, Now I'm Here Wine Glass",
    ['birthday', 'graduation'], [],
    '"Started from the bottle, now I\'m here" in tall stacked capitals.',
    '"Started from the bottle, now I\'m here" in five lines of tall capitals. It is a birthday glass, a graduation glass, or a new-job glass, for anyone who likes a pun.', 0)
glass(119, 'give-me-wine-tell-me-im-pretty-glass', "Give Me Wine and Tell Me I'm Pretty Glass",
    ['birthday', 'bachelorette', 'mothers-day'], ['her'],
    '"Give me wine" in script, "and tell me I\'m pretty" underneath.',
    '"Give me wine" in a large script, and "and tell me I\'m pretty" in spaced capitals below. It is a birthday glass, a bachelorette favor, or a Mother\'s Day glass for a mom who would like both.', 1)
glass(127, 'will-wrap-for-wine-glass', 'Will Wrap for Wine Glass',
    ['christmas', 'mothers-day'], ['her'],
    '"Will wrap for wine" with little presents and stars.',
    '"Will wrap for wine," with a few little drawn presents and stars around the words. It is for whoever does all the holiday wrapping in the family, and would like something in return.', 0)
glass(129, 'im-on-cloud-wine-glass', "I'm On Cloud Wine Glass",
    ['birthday', 'mothers-day'], ['her'],
    '"I\'m on cloud wine" in soft script.',
    '"I\'m on" in small capitals over "cloud wine" in a soft, looping script. It is a light, pretty glass for a birthday or Mother\'s Day.', 1)
glass(105, 'festive-af-holiday-wine-glass', 'Festive AF Holiday Wine Glass',
    ['christmas'], ['her'],
    '"festive AF" in script and capitals with a sprig and sparkles.',
    '"festive" in a tall script and "AF" in capitals, with a small sprig and a few sparkles. It is a holiday glass for a friend, a sister or a white-elephant exchange.', 0)
glass(123, 'festive-af-christmas-wine-glass', 'Festive AF Christmas Wine Glass',
    ['christmas', 'birthday'], ['her'],
    'The "festive AF" design with a sprig and sparkles, for the Christmas party.',
    'The same "festive AF" design, script and capitals with a sprig and sparkles, for the holiday party crowd. It is a good stocking stuffer or gift-exchange glass, and a set of 4 covers a whole friend group.', 1)

# ---- ornaments ----
add(37, 'custom-logo-ornament', 'Custom Logo Ornament',
    ['corporate-gifts', 'christmas', 'employee-appreciation'], ['businesses', 'realtors'], 'logo',
    'Your company logo engraved on a round wood ornament, for client and team holiday gifts.',
    'Your logo, engraved on a round wood ornament with a ribbon loop. The photo shows our own shop logo. It is a small, low-cost holiday gift for every client on the list, and it comes out of the box every December after that.',
    ORNAMENT[0])
add(56, 'heaven-in-our-home-memorial-ornament', 'Heaven in Our Home Memorial Ornament',
    ['memorial-sympathy', 'christmas'], [], 'memorial',
    'A heart ornament with an angel wing and "Because someone we love is in heaven," with a name and years.',
    'A heart-shaped ornament with an angel wing on one side and the words "Because someone we love is in heaven, there\'s a little bit of heaven in our home." Their name and years run along the edge. Take your time with the wording; we send a proof before anything is engraved.',
    ORNAMENT[1])
add(90, 'always-christmas-at-grandmas-house-ornament', "It's Always Christmas at Grandma and Grandpa's House Ornament",
    ['christmas', 'family'], ['grandparents', 'her'], 'ornament',
    '"It\'s always Christmas at Grandma & Grandpa\'s House" with two small hearts.',
    '"It\'s always Christmas at Grandma & Grandpa\'s House" in mixed capitals and script, with two small hearts. Change the names to Nana and Papa, Mimi and Pop or whatever they go by. It is a gift from the grandkids that goes on the tree every year.',
    ORNAMENT[0])
add(103, 'our-first-christmas-together-ornament', 'Our First Christmas Together Ornament',
    ['christmas', 'anniversary', 'wedding'], ['couples'], 'ornament',
    'String lights across the top, "Our first Christmas together," your names and the year.',
    'A strand of string lights across the top of a round ornament, then "Our first Christmas together," your first names in script and the year. It is for a first Christmas married, engaged or just together.',
    ORNAMENT[1])
add(112, 'deer-family-first-christmas-ornament', 'Deer Family First Christmas Ornament',
    ['christmas', 'family'], ['her', 'grandparents'], 'title',
    'A doe and fawn with a heart, and "My first Christmas as" your title, with the year.',
    'A doe and fawn with a small heart between them, then "My first Christmas as" and a title you choose, "Mommy," "Grandma," "Aunt," with the year. It is for the first Christmas after a new baby arrives. Put the title and year in the fields.',
    ORNAMENT[0])
add(107, 'pet-paw-name-ornament', 'Pet Paw Name Ornament',
    ['christmas', 'memorial-sympathy'], ['pet-lovers'], 'pet',
    'A paw-shaped ornament with your pet\'s name in the pad.',
    'A paw-shaped ornament with your pet\'s name engraved in the pad. It is for the dog or cat who gets their own stocking, and it also works as a memorial for one who is gone.',
    ORNAMENT[1])
add(121, 'teacher-pencil-ornament', 'Teacher Pencil Ornament',
    ['teacher-appreciation', 'christmas'], ['teachers'], 'teacher',
    'A pencil-shaped ornament with the teacher\'s name, who it is from and the school year.',
    'A pencil-shaped ornament with three lines: who it is from, the teacher\'s name in bold script, and "Teach. Inspire. Grow." The school year runs down the eraser end. It is a small, personal gift for the holidays or the end of the year.',
    ORNAMENT[0])
add(131, 'this-is-us-family-names-ornament', 'This Is Us Family Names Ornament',
    ['christmas', 'family'], ['her'], 'ornament',
    '"this is us" in script, with the year and every family member\'s name.',
    '"this is us" in a large script, with the year at the top and every name in the family underneath, separated by small hearts. It is a gift for a mom, or a family\'s own tree.',
    ORNAMENT[1])
add(135, 'this-is-us-family-year-ornament', 'This Is Us Family Year Ornament',
    ['christmas', 'family'], ['grandparents'], 'ornament',
    'The "this is us" ornament with the year and your family\'s names.',
    'The "this is us" ornament: the year at the top, "this is us" in script, and your family\'s first names below. Order one each year with the new year on it, so the tree ends up with a small history of the family on it.',
    ORNAMENT[0])

# ---- guest books ----
add(3, '3d-last-name-guest-book-sign', '3D Last Name Guest Book Sign',
    ['wedding'], ['couples'], 'guestbook',
    'A signature frame with your last name laser cut and raised in the center, and your wedding date.',
    'A wedding guest book that goes on the wall afterward. Your last name is laser cut in script and mounted raised inside an open frame, with your wedding date underneath. Guests sign the frame around it. The one in the photo hangs above a mantel, fully signed.',
    GUESTBOOK)
add(20, 'mr-and-mrs-3d-guest-book-sign', 'Mr and Mrs 3D Guest Book Sign',
    ['wedding'], ['couples'], 'guestbook',
    'The 3D last-name frame with a small "Mr & Mrs" cut above your name and your date.',
    'The 3D guest book with "Mr & Mrs" cut in script above your last name, and your wedding date along the lower edge. Your last name is raised in the open center, and guests sign the frame around it at the reception.',
    GUESTBOOK)
add(109, 'last-name-signature-frame-guest-book', 'Last Name Signature Frame Guest Book',
    ['wedding', 'family'], ['couples'], 'guestbook',
    'The 3D last-name signature frame, shown hanging over a bed after the wedding.',
    'The 3D last-name signature frame, shown hanging over a bed after the wedding. Your last name is cut in script and raised in the open center with the date below, and the frame around it holds your guests\' signatures and notes.',
    GUESTBOOK)
add(91, 'round-guest-book-sign', 'Round Guest Book Sign',
    ['wedding', 'family'], ['couples'], 'guestbook',
    'A round sign with your last name in script, your first names and year, for guests to sign.',
    'A round wood sign with your last name in large script, your first names in capitals above it and "Est." with the year below. Guests sign the open space around the names. The photo shows it on an easel at an outdoor ceremony.',
    GUESTBOOK)
add(124, 'round-family-name-guest-book', 'Round Family Name Guest Book',
    ['wedding', 'family'], ['couples'], 'guestbook',
    'The round last-name guest book, shown on a mantel after the wedding.',
    'The round guest book after the wedding: your last name in script, your first names and year, and every signature around it, displayed on a mantel. It is round, so it reads as art rather than a sign.',
    GUESTBOOK)
add(140, 'round-guest-book-wall-art', 'Round Guest Book Wall Art',
    ['wedding'], ['couples'], 'guestbook',
    'A round guest book sign that hangs as wall art after the wedding.',
    'A round guest book designed to hang afterward: your last name in script in the center, your first names and year around it, and room for dozens of signatures. The photo shows the design on linen, before guests sign.',
    GUESTBOOK)
add(141, 'round-wedding-signature-sign', 'Round Wedding Signature Sign',
    ['wedding'], ['couples'], 'guestbook',
    'A round signature sign for the reception, with your names and year in the center.',
    'The round signature sign at the reception, next to the champagne: your last name in script, your first names above and the year below, with guests\' notes filling the space around it.',
    GUESTBOOK)

# ---- cake topper ----
add(51, 'mr-and-mrs-script-cake-topper', 'Mr and Mrs Script Cake Topper',
    ['wedding'], ['couples'], 'cake',
    'A laser-cut "Mr & Mrs" script cake topper.',
    'A laser-cut "Mr & Mrs" in a flowing script, on stakes that go into the top tier. The photo shows it on a dark, moody cake; it works just as well on a white one.',
    CAKE)

# ---------------------------------------------------------------------------
pub_before = [i for i, x in enumerate(products) if x['publish']]
for i in pub_before:
    if i in MERGE or i in HOLD:
        continue
    if i not in C:
        sys.exit(f'missing content for idx {i}: {products[i]["etsy_title"]}')

# apply merges
for d, k in MERGE.items():
    drop, keep = products[d], products[k]
    ks = keep['source']
    ks.setdefault('duplicate_etsy_listings', [])
    lid = drop['source']['etsy_listing_id']
    if lid not in ks['duplicate_etsy_listings']:
        ks['duplicate_etsy_listings'].append(lid)
    ks.setdefault('merged_sales_all_time', {})[lid] = drop['source']['etsy_sales_all_time']
    drop['publish'] = False
    drop['hold_reason'] = f'merged: same photo (or the same scene shot twice) as listing {ks["etsy_listing_id"]}; merged into that page'

for i, r in HOLD.items():
    products[i]['publish'] = False
    products[i]['hold_reason'] = r

slugs = set()
for i, c in C.items():
    x = products[i]
    assert x['publish'], i
    s = c['slug']
    assert re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', s), s
    assert s not in slugs, s
    slugs.add(s)
    desc = c['intro'].strip() + '\n\n' + c['spec'].strip()
    n = len(desc.split())
    if not 80 <= n <= 150:
        print('WORDS', i, s, n)
    x.pop('slug_draft', None)
    x['slug'] = s
    x['name'] = c['name']
    x['short'] = c['short']
    x['description'] = desc
    x['occasions'] = c['occasions']
    x['recipients'] = c['recipients']
    x['personalize'] = c['personalize']
    if c['typ']:
        x['type'] = c['typ']

# held/merged keep slug_draft -> slug so the file is uniform
for x in products:
    if 'slug' not in x:
        x['slug'] = x.pop('slug_draft')

tax = json.load(open('data/taxonomy.json'))
OT = {o['tag'] for o in tax['occasions']}
RT = {r['tag'] for r in tax['recipients']}
for x in products:
    if x['publish']:
        for t in x['occasions']:
            assert t in OT, (x['slug'], t)
        for t in x['recipients']:
            assert t in RT, (x['slug'], t)

# key order: slug first
out = []
for x in products:
    y = {'slug': x['slug']}
    y.update({k: v for k, v in x.items() if k != 'slug'})
    out.append(y)
json.dump(out, open(P, 'w'), indent=1, ensure_ascii=False)
open(P, 'a').write('\n')
print('published', sum(1 for x in out if x['publish']))
