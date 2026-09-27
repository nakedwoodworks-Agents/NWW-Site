// Snipcart price-validation check. Parses every built product page and verifies the
// server-rendered add-to-cart button against data/price-ladders.json, exactly the way
// Snipcart's crawler will: same id, same price, same option strings, url = this page.
// Exit code 1 on any error. Runs as part of `npm run build`.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const ladders = JSON.parse(fs.readFileSync(path.join(root, 'data/price-ladders.json'), 'utf8'));
const SITE_URL = (process.env.SITE_URL || 'https://nww-site.pages.dev').replace(/\/+$/, '');

const errors = [];
const err = (slug, msg) => errors.push(`${slug}: ${msg}`);
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function expectedLadder(p) {
  if (p.type === 'board-coaster-set') {
    const b = ladders.board, c = ladders.coaster;
    return { base: Math.round((b.base_price + c.base_price) * 100) / 100,
      options: [...b.options, { name: 'Coaster set', values: c.options.find((o) => o.name === 'Set & Wood').values }] };
  }
  const l = ladders[p.price_ladder];
  if (!l) throw new Error(`no ladder ${p.price_ladder} for ${p.slug}`);
  return { base: l.base_price, options: l.options || [] };
}

function parseButton(html) {
  const m = html.match(/<button[^>]*class="[^"]*snipcart-add-item[^"]*"[^>]*>/g);
  if (!m) return null;
  if (m.length > 1) return { multiple: m.length };
  const attrs = {};
  for (const a of m[0].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = decode(a[2]);
  return attrs;
}

const pub = products.filter((p) => p.publish === true);
const held = products.filter((p) => p.publish !== true);
const ids = new Set();
let checked = 0;

for (const p of pub) {
  const file = path.join(dist, 'p', p.slug, 'index.html');
  if (!fs.existsSync(file)) { err(p.slug, 'product page missing'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const a = parseButton(html);
  if (!a) { err(p.slug, 'no server-rendered .snipcart-add-item button'); continue; }
  if (a.multiple) { err(p.slug, `${a.multiple} add-item buttons on one page`); continue; }
  checked++;
  const L = expectedLadder(p);
  const url = `${SITE_URL}/p/${p.slug}/`;
  if (a['data-item-id'] !== p.slug) err(p.slug, `data-item-id "${a['data-item-id']}" != slug`);
  if (ids.has(a['data-item-id'])) err(p.slug, 'duplicate data-item-id'); ids.add(a['data-item-id']);
  if (a['data-item-price'] !== L.base.toFixed(2)) err(p.slug, `price ${a['data-item-price']} != ladder base ${L.base.toFixed(2)}`);
  if (a['data-item-url'] !== url) err(p.slug, `data-item-url ${a['data-item-url']} != ${url}`);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canon !== url) err(p.slug, `canonical ${canon} != data-item-url`);
  if (!a['data-item-name']) err(p.slug, 'missing data-item-name');
  const img = a['data-item-image'] || '';
  if (!img.startsWith(SITE_URL + '/img/p/')) err(p.slug, `data-item-image not a site image: ${img}`);
  else if (!fs.existsSync(path.join(dist, img.slice(SITE_URL.length)))) err(p.slug, `data-item-image file missing: ${img}`);
  if (/etsystatic|amazon/i.test(img)) err(p.slug, 'hotlinked image');

  // custom fields: ladder options first, verbatim, in order
  const customs = Object.keys(a).filter((k) => /^data-item-custom\d+-name$/.test(k)).map((k) => +k.match(/\d+/)[0]).sort((x, y) => x - y);
  customs.forEach((n, i) => { if (n !== i + 1) err(p.slug, `custom fields not contiguous at ${n}`); });
  L.options.forEach((o, i) => {
    const n = i + 1;
    if (a[`data-item-custom${n}-name`] !== o.name) err(p.slug, `custom${n} name "${a[`data-item-custom${n}-name`]}" != "${o.name}"`);
    const want = o.values.join('|');
    if (a[`data-item-custom${n}-options`] !== want) err(p.slug, `custom${n} options differ from price-ladders.json`);
    for (const v of o.values) if (!/^[^|[\]]+(\[[+-]\d+(\.\d{1,2})?\])?$/.test(v)) err(p.slug, `bad option syntax: ${v}`);
  });
  // no priced options outside the ladder
  customs.slice(L.options.length).forEach((n) => { if (a[`data-item-custom${n}-options`] && /\[/.test(a[`data-item-custom${n}-options`])) err(p.slug, `custom${n} has prices not from the ladder`); });
  // personalization: every non-fixed design has a required text field
  const fixed = ['saying', 'cake'].includes(p.personalize);
  const req = customs.filter((n) => a[`data-item-custom${n}-required`] === 'true');
  if (!fixed && req.length === 0) err(p.slug, `personalize=${p.personalize} but no required personalization field`);
  // the page's selects must mirror the button options (same labels, same deltas)
  const selects = [...html.matchAll(/<select id="opt(\d+)" data-custom="(\d+)">([\s\S]*?)<\/select>/g)];
  if (selects.length !== L.options.length) err(p.slug, `${selects.length} option selects on page, ladder has ${L.options.length}`);
  for (const s of selects) {
    const o = L.options[+s[1]];
    const opts = [...s[3].matchAll(/<option value="([^"]*)" data-delta="([^"]*)"/g)].map((x) => [decode(x[1]), +x[2]]);
    const want = o.values.map((v) => { const m = v.match(/^(.*?)(?:\[([+-][\d.]+)\])?$/); return [m[1].trim(), m[2] ? +m[2] : 0]; });
    if (JSON.stringify(opts) !== JSON.stringify(want)) err(p.slug, `select opt${s[1]} does not match ladder`);
  }
}

// held / merged products must not have pages, and must not appear anywhere in dist
const distFiles = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const q = path.join(d, f); fs.statSync(q).isDirectory() ? walk(q) : distFiles.push(q); } })(dist);
const texts = distFiles.filter((f) => /\.(html|xml|txt|json)$/.test(f)).map((f) => [f, fs.readFileSync(f, 'utf8')]);
for (const p of held) {
  if (fs.existsSync(path.join(dist, 'p', p.slug))) err(p.slug, 'HELD product has a page');
  const pubSameSlug = pub.some((x) => x.slug === p.slug);
  if (pubSameSlug) err(p.slug, 'held slug collides with a published slug');
  for (const [f, t] of texts) if (t.includes(`/p/${p.slug}/`)) { err(p.slug, `HELD product linked from ${path.relative(dist, f)}`); break; }
}
const pages = fs.readdirSync(path.join(dist, 'p'));
if (pages.length !== pub.length) err('*', `${pages.length} product dirs in dist, ${pub.length} published products`);

if (errors.length) {
  console.error(`check-snipcart: ${errors.length} error(s)`);
  errors.slice(0, 200).forEach((e) => console.error('  ' + e));
  process.exit(1);
}
console.log(`check-snipcart: OK. ${checked} product pages, every button matches data/price-ladders.json; ${held.length} held/merged products have no page.`);
