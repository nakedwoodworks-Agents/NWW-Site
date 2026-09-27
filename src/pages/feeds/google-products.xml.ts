// Google Merchant Center product feed (free listings). Published products only.
import { SITE_URL } from '../../config';
import { products, ladderFor, imgId, SINGULAR } from '../../lib/data';
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const GCAT: Record<string, string> = {
  'cutting-board': 'Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Kitchen Tools &amp; Utensils &gt; Cutting Boards',
  'charcuterie-board': 'Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Kitchen Tools &amp; Utensils &gt; Cutting Boards',
  'board-coaster-set': 'Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Kitchen Tools &amp; Utensils &gt; Cutting Boards',
  'coaster-set': 'Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Barware &gt; Coasters',
  'wine-glass': 'Home &amp; Garden &gt; Kitchen &amp; Dining &gt; Tableware &gt; Drinkware',
  ornament: 'Home &amp; Garden &gt; Decor &gt; Seasonal &amp; Holiday Decorations &gt; Holiday Ornaments',
};
export function GET() {
  const items = products.map((p) => {
    const L = ladderFor(p);
    return `    <item>
      <g:id>${x(p.slug)}</g:id>
      <g:title>${x(p.name)}</g:title>
      <g:description>${x(p.description.replace(/\n+/g, ' '))}</g:description>
      <g:link>${SITE_URL}/p/${p.slug}/</g:link>
      <g:image_link>${SITE_URL}/img/p/${imgId(p)}-1200.jpg</g:image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${L.base_price.toFixed(2)} USD</g:price>
      <g:brand>Naked Wood Works</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:is_bundle>${p.type === 'board-coaster-set' ? 'yes' : 'no'}</g:is_bundle>
      <g:product_type>${x(SINGULAR[p.type] || p.type)}</g:product_type>${GCAT[p.type] ? `\n      <g:google_product_category>${GCAT[p.type]}</g:google_product_category>` : ''}
    </item>`;
  }).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Naked Wood Works</title>
    <link>${SITE_URL}/</link>
    <description>Personalized, laser-engraved gifts made to order in Pryor, Oklahoma.</description>
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
