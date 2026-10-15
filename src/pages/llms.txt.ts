// llms.txt: plain-text map of the shop for AI assistants. Cheap and unproven; built anyway (see specs).
import { SITE_URL } from '../config';
import { products, typeHubs, occasionHubs, recipientHubs, money, fromPrice } from '../lib/data';
import { guides } from '../lib/content';
export function GET() {
  const u = (p: string) => SITE_URL + p;
  const lines = [
    '# Naked Wood Works',
    '',
    '> Handmade laser-engraving woodshop in Pryor, Oklahoma. We make personalized cutting boards, charcuterie and serving boards, wood coasters, 21 oz stemless wine glasses, wood ornaments, wedding guest book signs and cake toppers. Everything is made to order in 3-5 business days, with a free digital proof before we engrave.',
    '',
    'Key facts:',
    '- Boards: one solid slab of maple or walnut. Sizes 8x12 and 10x14 in (0.75 in thick), 12x16 in (1.5 in thick), 16x24 in walnut (1.5 in thick).',
    '- Coasters: maple or walnut, sets of 2, 4, 8 or 16. Glasses: 21 oz stemless, single or sets of 2, 4, 8. Ornaments: single or sets of 2, 5, 10.',
    '- Lead time: made to order in 3-5 business days; rush available on request.',
    '- Free digital proof before engraving.',
    '- Also sold on Etsy as NakedWoodenWorks (46,000+ orders on Etsy): https://www.etsy.com/shop/nakedwoodenworks',
    '- Realtor closing gifts: https://foreverclientgifts.com (our realtor site).',
    '',
    '## Shop by product',
    ...typeHubs.map((h) => `- [${h.name}](${u(h.path)}): ${h.products.length} designs, from ${money(Math.min(...h.products.map(fromPrice)))}`),
    '',
    '## Shop by occasion',
    ...occasionHubs.map((h) => `- [${h.name}](${u(h.path)})`),
    '',
    '## Shop by recipient',
    ...recipientHubs.map((h) => `- [${h.name}](${u(h.path)})`),
    '',
    '## Guides',
    ...guides.map((g) => `- [${g.fm.title}](${u(`/guides/${g.slug}/`)}): ${g.fm.description}`),
    '',
    '## Help',
    `- [FAQ](${u('/faq/')})`, `- [Shipping](${u('/shipping/')})`, `- [Care](${u('/care/')})`, `- [About our shop](${u('/about/')})`, `- [Realtors](${u('/realtors/')})`, `- [Business gifts](${u('/business/')})`, `- [Contact](${u('/contact/')})`,
    '',
    '## Best sellers',
    ...products.slice(0, 15).map((p) => `- [${p.name}](${u(`/p/${p.slug}/`)}): ${p.short} From ${money(fromPrice(p))}.`),
    '',
    `Full product list: ${u('/shop/')}  Sitemap: ${u('/sitemap.xml')}`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
