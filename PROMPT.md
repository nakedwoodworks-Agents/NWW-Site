# Kickoff prompt (paste this into a Claude Code cloud session on this repo)

Build the Naked Wood Works storefront in this repo, end to end, unattended. The owner is not available, so make reasonable decisions, record them in BUILD-NOTES.md, and keep going. Don't stop to ask.

Follow CLAUDE.md exactly: read every file it lists first, then build in its order, then run its self-check loop (build, check-snipcart, check-content, Playwright screenshots at 390px and 1440px that you actually look at and fix). Repeat until every Definition of Done box is checked.

Work on branch `build/v1`. Commit after each build-order step, with clear messages, so progress is saved if the session stops. Push after each commit. When done, open a PR to `main` titled "NWW site v1" whose body is BUILD-NOTES.md.

If you run low on time or context, prioritize in this order: (1) product pages with working Snipcart buttons, (2) homepage + quiz, (3) type and occasion hubs, (4) SEO layer (schema, sitemap, robots, llms.txt), (5) guides, (6) recipient/combo hubs. Push whatever is done, and list what's left in BUILD-NOTES.md.
