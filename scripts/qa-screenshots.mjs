// QA screenshots with Playwright + the preinstalled Chromium (/opt/pw-browsers; never `playwright install`).
// Serves dist/ on a local port, captures key pages at 390px and 1440px, the quiz at each step,
// and the Snipcart cart after add-to-cart. Output: qa/screenshots/. Also records basic perf metrics.
// Usage: node scripts/qa-screenshots.mjs [--only=name,name] [--out=qa/screenshots]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const OUT = path.join(root, args.out || 'qa/screenshots');
const only = args.only ? args.only.split(',') : null;
const dist = path.join(root, args.dist || 'dist');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let f = path.join(dist, p);
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, { 'content-type': 'text/html' }); res.end(fs.readFileSync(path.join(dist, '404.html'))); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'max-age=3600' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((p) => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8')).filter((p) => p.publish);
const firstOfType = (t) => products.filter((p) => p.type === t).sort((a, b) => b.source.etsy_sales_all_time - a.source.etsy_sales_all_time)[0]?.slug;

const pages = [
  ['home', '/'], ['shop', '/shop/'],
  ...['cutting-board', 'charcuterie-board', 'coaster-set', 'wine-glass', 'ornament', 'guest-book-sign', 'board-coaster-set', 'cake-topper']
    .map((t) => [`product-${t}`, `/p/${firstOfType(t)}/`]),
  ['occasion-anniversary', '/occasion/anniversary-gifts/'], ['occasion-5th-anniversary', '/occasion/5th-anniversary-wood-gifts/'],
  ['occasion-wedding', '/occasion/wedding-gifts/'], ['occasion-realtor', '/occasion/realtor-closing-gifts/'],
  ['type-wine-glasses', '/c/wine-glasses/'], ['combo-wedding-guest-books', '/occasion/wedding-gifts/guest-books/'], ['recipient-couples', '/for/couples/'],
  ['guide-5th-anniversary', '/guides/5th-anniversary-gift-guide/'], ['page-about', '/about/'], ['page-business', '/business/'], ['page-faq', '/faq/'], ['404', '/nope/'],
];
const widths = [[390, 844, 'm'], [1440, 900, 'd']];
const consoleErrors = [];

async function newPage(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500 });
  // no third-party noise in QA (pixel, fonts still allowed); keep snipcart
  await ctx.route(/connect\.facebook\.net|facebook\.com\/tr/, (r) => r.abort());
  // Note: Snipcart's API answers this key with HTTP 402 (account issue, see BUILD-NOTES), so the cart
  // cannot finish loading in QA. The add-to-cart wiring is verified through Snipcart's item.adding event instead.
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !/facebook|net::ERR|Failed to load resource/.test(m.text())) consoleErrors.push(`${page.url()}: ${m.text()}`); });
  page.on('pageerror', (e) => consoleErrors.push(`${page.url()}: ${e.message}`));
  await page.addInitScript(() => { try { localStorage.setItem('nwwQuizSeen', '1'); } catch {} });
  return { ctx, page };
}
const shot = async (page, name, full = true) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); console.log('shot', name); };
const noHScroll = async (page, name) => {
  const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (o > 1) consoleErrors.push(`${name}: horizontal overflow ${o}px`);
};

for (const [w, h, tag] of widths) {
  const { ctx, page } = await newPage(w, h);
  for (const [name, url] of pages) {
    if (only && !only.includes(name)) continue;
    await page.goto(BASE + url, { waitUntil: 'networkidle' });
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(250);
    await noHScroll(page, `${name}-${tag}`);
    await shot(page, `${name}-${tag}`);
  }
  // quiz steps (homepage inline quiz)
  if (!only || only.includes('quiz')) {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    const q = page.locator('.hero [data-quiz]');
    await q.screenshot({ path: path.join(OUT, `quiz-1-who-${tag}.png`) });
    await q.locator('[data-path="anniversary"]').click();
    await q.locator('[data-k="month"]').selectOption('6');
    await q.locator('[data-k="day"]').selectOption('14');
    const yr = new Date().getFullYear() - 5 + (new Date() > new Date(new Date().getFullYear(), 5, 14) ? 1 : 0);
    await q.locator('[data-k="year"]').fill(String(yr));
    await page.waitForTimeout(200);
    await q.screenshot({ path: path.join(OUT, `quiz-2-anniversary-${tag}.png`) });
    await q.locator('[data-branch="anniversary"] [data-next]').click();
    await page.waitForTimeout(300);
    if (await q.locator('[data-step="3"]').isVisible()) {
      await q.screenshot({ path: path.join(OUT, `quiz-3-lead-${tag}.png`) });
      await q.locator('[data-skip]').click();
    }
    await page.waitForSelector('.hero [data-results] .card', { timeout: 5000 });
    await page.waitForTimeout(600);
    await q.screenshot({ path: path.join(OUT, `quiz-4-results-${tag}.png`) });
    // realtor path
    await q.locator('[data-restart]').click();
    await q.locator('[data-path="realtor"]').click();
    await q.locator('[data-k="brokerage"]').fill('Sample Realty');
    await q.locator('[data-k="closings_per_month"]').selectOption('3-5');
    await q.screenshot({ path: path.join(OUT, `quiz-2-realtor-${tag}.png`) });
    await q.locator('[data-branch="realtor"] [data-next]').click();
    if (await q.locator('[data-step="3"]').isVisible()) await q.locator('[data-skip]').click();
    await page.waitForSelector('.hero [data-results] .card');
    await page.waitForTimeout(500);
    await q.screenshot({ path: path.join(OUT, `quiz-4-realtor-results-${tag}.png`) });
    // modal on another page
    await page.goto(BASE + '/shop/', { waitUntil: 'networkidle' });
    await page.locator('.q-float').click();
    await page.waitForTimeout(300);
    await shot(page, `quiz-modal-${tag}`, false);
    console.log('shot quiz', tag);
  }
  // menu (mobile drawer / desktop mega menu)
  if (!only || only.includes('menu')) {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    if (tag === 'm') { await page.locator('[data-open-drawer]').click(); await page.locator('#drawer details').first().locator('summary').click(); }
    else { await page.locator('.mainnav .top').first().hover(); }
    await page.waitForTimeout(300);
    await shot(page, `menu-${tag}`, false);
  }
  // add to cart -> cart open
  if (!only || only.includes('cart')) {
    const slug = firstOfType('cutting-board');
    await page.goto(BASE + `/p/${slug}/`, { waitUntil: 'networkidle' });
    await page.locator('#opt0').selectOption({ index: 3 });
    // required field empty -> validation message
    await page.locator('#add-btn').click();
    await page.waitForTimeout(3000);
    await page.locator('.personalizer').screenshot({ path: path.join(OUT, `cart-0-validation-${tag}.png`) });
    await page.locator('#f-names').fill('Your first names & your last name');
    await page.locator('#f-date').fill('Est. 06.14.2021');
    await page.evaluate(() => { window.__adding = null; try { Snipcart.events.on('item.adding', (ev, item) => { window.__adding = JSON.parse(JSON.stringify(item || ev || {})); }); } catch (e) { window.__adding = 'no-snipcart:' + e.message; } });
    await page.locator('#add-btn').click();
    await page.waitForTimeout(2500);
    const adding = await page.evaluate(() => window.__adding);
    fs.writeFileSync(path.join(OUT, `cart-item-adding-${tag}.json`), JSON.stringify(adding, null, 2));
    console.log('item.adding', JSON.stringify(adding).slice(0, 400));
    try {
      await page.waitForSelector('.snipcart-item-line, .snipcart-cart__content, .snipcart-layout', { timeout: 20000 });
      await page.waitForTimeout(2500);
      await shot(page, `cart-1-open-${tag}`, false);
    } catch (e) { consoleErrors.push(`cart did not open (${tag}): ${e.message}`); await shot(page, `cart-1-FAILED-${tag}`, false); }
  }
  await ctx.close();
}

// basic perf (mobile emulation, local server; not a Lighthouse score)
const perf = {};
if (!only || only.includes('perf')) {
  for (const [name, url] of [['home', '/'], ['product', `/p/${firstOfType('cutting-board')}/`]]) {
    const { ctx, page } = await newPage(390, 844);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 1024 / 1000 * 1000, uploadThroughput: 750e3 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(BASE + url, { waitUntil: 'load' });
    await page.waitForTimeout(3000);
    perf[name] = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const bytes = performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) + (nav.transferSize || 0);
      return { fcp_ms: Math.round(fcp?.startTime || 0), lcp_ms: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), load_ms: Math.round(nav.loadEventEnd), kb: Math.round(bytes / 1024) };
    });
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'perf.json'), JSON.stringify(perf, null, 2));
  console.log('perf', JSON.stringify(perf));
}

await browser.close();
server.close();
if (consoleErrors.length) { console.log('ISSUES:'); consoleErrors.forEach((e) => console.log('  ' + e)); }
