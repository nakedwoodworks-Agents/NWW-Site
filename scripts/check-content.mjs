// Content checker for the built site (dist/). Exit 1 on any error.
// Checks: banned phrases + never-claim list, PLACEHOLDER in visible text, emoji, broken internal
// links, missing alt text, duplicate titles/meta, title/meta length, one H1, hub pages with < 120
// words of unique intro copy, product description length, JSON-LD validity and no AggregateRating/Review.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const SITE_URL = (process.env.SITE_URL || 'https://nww-site.pages.dev').replace(/\/+$/, '');
const errors = [], warnings = [];
const E = (f, m) => errors.push(`${f}: ${m}`);
const W = (f, m) => warnings.push(`${f}: ${m}`);

const BANNED = [
  'handcrafted with love', 'made with love', 'one-of-a-kind', 'one of a kind', 'truly unique', 'perfect gift for any occasion',
  'treasured keepsake', 'cherished memento', 'we strive to', 'at your earliest convenience', "don't hesitate", 'don’t hesitate',
  'do not hesitate', 'rest assured', 'elevate', 'level up', 'game-changer', 'game changer', 'apologize for any inconvenience',
  'unfortunately', 'per our policy',
  // never-claim list (data/proof.json)
  'gift box', 'gift-box', 'giftbox', 'gift boxed', 'gift-boxed', 'ready to give', 'no wrapping needed',
  '1-3 day', '1-3 business', '1 to 3 day', 'ships in 1', 'free design', 'free mockup', 'free mock-up', 'bamboo', 'juice groove',
  'food-safe', 'food safe', 'free shipping', 'engravecraftgifts', 'only 3 left', 'limited time', 'hurry',
  'edge-grain', 'edge grain', 'glued-up strips are', 'lovingly', 'handcrafted with care',
];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{2B50}\u{2B06}\u{2194}-\u{21FF}]/u;

const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const exists = (urlPath) => {
  const clean = decodeURI(urlPath.split('#')[0].split('?')[0]);
  const p = path.join(dist, clean);
  return fs.existsSync(p) && fs.statSync(p).isFile() || fs.existsSync(path.join(p, 'index.html'));
};
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&middot;/g, '·').replace(/&times;/g, '×').replace(/&rsquo;/g, '’').replace(/&#x27;/g, "'").replace(/&mdash;/g, '—');
const visibleText = (html) => decode(html
  .replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<noscript[\s\S]*?<\/noscript>/g, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const words = (t) => (t.match(/[A-Za-z0-9$][\w'’.$,-]*/g) || []).length;

const titles = new Map(), metas = new Map();
let pagesChecked = 0;
for (const f of htmlFiles) {
  const rel = '/' + path.relative(dist, f).replace(/index\.html$/, '');
  const html = fs.readFileSync(f, 'utf8');
  const is404 = rel.startsWith('/404');
  pagesChecked++;
  const text = visibleText(html);
  const lower = text.toLowerCase();
  for (const b of BANNED) if (lower.includes(b)) E(rel, `banned phrase "${b}": ...${text.substr(Math.max(0, lower.indexOf(b) - 50), 110)}...`);
  if (/placeholder_|\bplaceholder\b/i.test(text)) E(rel, 'PLACEHOLDER visible in page text');
  if (/\[OFFER/i.test(text)) E(rel, '[OFFER] marker visible');
  if (EMOJI.test(text)) E(rel, `emoji in text: ${text.match(EMOJI)[0]}`);
  if (/!(\s|$)/.test(text.replace(/<!--/g, ''))) W(rel, 'exclamation mark in visible text');

  // alt text
  for (const img of html.matchAll(/<img\b[^>]*>/g)) {
    const alt = img[0].match(/\balt="([^"]*)"/);
    if (!alt) E(rel, `img without alt: ${img[0].slice(0, 90)}`);
    else if (!alt[1].trim()) E(rel, `img with empty alt: ${img[0].slice(0, 90)}`);
  }
  // links
  for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let u = decode(m[1]);
    if (u.startsWith(SITE_URL)) u = u.slice(SITE_URL.length) || '/';
    if (!u.startsWith('/') || u.startsWith('//')) continue;
    if (!exists(u)) E(rel, `broken internal link ${u}`);
    else if (!u.includes('.') && !u.endsWith('/') && !u.includes('#') && !u.includes('?')) W(rel, `link without trailing slash ${u}`);
  }
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) for (const part of m[1].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith('/') && !exists(u)) E(rel, `broken srcset ${u}`); }
  // head
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] || '');
  const meta = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '');
  if (!title) E(rel, 'missing <title>'); else if (title.length > 60) E(rel, `title ${title.length} chars > 60: ${title}`);
  if (!meta) E(rel, 'missing meta description'); else if (meta.length > 155) E(rel, `meta ${meta.length} chars > 155`);
  if (!is404) {
    if (titles.has(title)) E(rel, `duplicate title with ${titles.get(title)}: ${title}`); else titles.set(title, rel);
    if (metas.has(meta)) E(rel, `duplicate meta description with ${metas.get(meta)}`); else metas.set(meta, rel);
    if (!/<link rel="canonical" href="[^"]+"/.test(html)) E(rel, 'missing canonical');
  }
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) E(rel, `${h1s} <h1> elements`);
  // JSON-LD
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let j; try { j = JSON.parse(m[1]); } catch (e) { E(rel, 'invalid JSON-LD: ' + e.message); continue; }
    const s = JSON.stringify(j);
    if (/AggregateRating|"@type":"Review"/.test(s)) E(rel, 'AggregateRating/Review in JSON-LD (not allowed)');
    for (const node of [].concat(j)) if (!node['@context'] || !node['@type']) E(rel, 'JSON-LD node missing @context/@type');
  }
  // hubs: >= 120 words of unique intro copy
  if (/^\/(c|occasion|for)\//.test(rel)) {
    const intro = html.match(/<div class="intro"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
    const n = words(visibleText(intro));
    if (n < 120) E(rel, `hub intro only ${n} words (< 120)`);
    if (!/"@type":"FAQPage"/.test(html)) E(rel, 'hub without FAQPage');
    if (!/"@type":"ItemList"/.test(html)) E(rel, 'hub without ItemList');
  }
  if (rel.startsWith('/p/')) {
    const about = html.match(/About this design<\/h2>([\s\S]*?)<h2/)?.[1] || '';
    const n = words(visibleText(about));
    if (n < 80 || n > 150) E(rel, `product description ${n} words (want 80-150)`);
    if (!/<dl class="facts"/.test(html)) E(rel, 'missing fact box');
    if (!/"@type":"Product"/.test(html) || !/"@type":"Offer"/.test(html)) E(rel, 'missing Product/Offer JSON-LD');
    if (!/"@type":"BreadcrumbList"/.test(html)) E(rel, 'missing BreadcrumbList');
  }
  if (rel.startsWith('/guides/') && rel !== '/guides/') {
    const body = html.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>\s*<\/article>/)?.[1] || '';
    const n = words(visibleText(body));
    if (n < 600 || n > 1200) E(rel, `guide body ${n} words (want 600-1,200)`);
    if (!/"@type":"Article"/.test(html)) E(rel, 'guide without Article JSON-LD');
  }
}

// robots / sitemap / llms / feed sanity
const robots = fs.readFileSync(path.join(dist, 'robots.txt'), 'utf8');
if (/Disallow:\s*\/\s*$/m.test(robots)) E('robots.txt', 'blocks crawlers');
for (const f of ['sitemap.xml', 'llms.txt', 'feeds/google-products.xml', 'robots.txt']) if (!fs.existsSync(path.join(dist, f))) E(f, 'missing');
const sm = fs.readFileSync(path.join(dist, 'sitemap.xml'), 'utf8');
for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) if (!exists(m[1].slice(SITE_URL.length))) E('sitemap.xml', `url without page ${m[1]}`);
const feed = fs.readFileSync(path.join(dist, 'feeds/google-products.xml'), 'utf8');
for (const b of BANNED) if (feed.toLowerCase().includes(b)) E('google-products.xml', `banned phrase ${b}`);

if (warnings.length) { console.log(`check-content: ${warnings.length} warning(s)`); warnings.slice(0, 40).forEach((w) => console.log('  warn ' + w)); }
if (errors.length) { console.error(`check-content: ${errors.length} error(s)`); errors.slice(0, 300).forEach((e) => console.error('  ' + e)); process.exit(1); }
console.log(`check-content: OK. ${pagesChecked} HTML pages, 0 errors.`);
