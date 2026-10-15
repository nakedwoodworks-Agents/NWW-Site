// Prebuild: responsive images for PUBLISHED products only (held products get none).
// public/images/products/<id>.jpg (1600px source) -> public/img/p/<id>-{400,800,1200}.webp + <id>-{400,1200}.jpg
// Skips files that are already up to date, so rebuilds are fast.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const outDir = path.join(root, 'public/img/p');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [];
const want = new Set();
for (const p of products.filter((x) => x.publish === true)) {
  for (const src of [p.image, p.grid_image].filter(Boolean)) {
    const id = path.basename(src).replace(/\.\w+$/, '');
    const input = path.join(root, 'public', src);
    if (!fs.existsSync(input)) { console.error('missing image', input); process.exitCode = 1; continue; }
    const mtime = fs.statSync(input).mtimeMs;
    for (const [w, fmt] of [[400, 'webp'], [800, 'webp'], [1200, 'webp'], [400, 'jpg'], [1200, 'jpg']]) {
      const out = path.join(outDir, `${id}-${w}.${fmt}`);
      want.add(out);
      if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= mtime) continue;
      jobs.push(async () => {
        let img = sharp(input).rotate().resize({ width: w, withoutEnlargement: false });
        img = fmt === 'webp' ? img.webp({ quality: w <= 400 ? 72 : 76 }) : img.jpeg({ quality: 80, mozjpeg: true });
        await img.toFile(out);
      });
    }
  }
}
// remove stale outputs (e.g. a product that was un-published)
for (const f of fs.readdirSync(outDir)) {
  const full = path.join(outDir, f);
  if (!want.has(full)) fs.unlinkSync(full);
}
let i = 0;
async function worker() { while (i < jobs.length) { const j = jobs[i++]; await j(); } }
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`images: ${jobs.length} generated, ${want.size} total`);

// brand assets (logo PNG for schema/OG, favicon PNG)
const brand = path.join(root, 'public/brand');
const logoSvg = path.join(brand, 'logo.svg');
if (fs.existsSync(logoSvg)) {
  const png = path.join(brand, 'logo.png');
  if (!fs.existsSync(png) || fs.statSync(png).mtimeMs < fs.statSync(logoSvg).mtimeMs) {
    await sharp(logoSvg, { density: 300 }).resize({ width: 1200 }).png().toFile(png);
  }
  const og = path.join(brand, 'og-default.jpg');
  const ogSrc = path.join(root, 'public/images/products/597958265.jpg');
  if (!fs.existsSync(og) && fs.existsSync(ogSrc)) {
    await sharp(ogSrc).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(og);
  }
}
const fav = path.join(brand, 'favicon.svg');
if (fs.existsSync(fav) && !fs.existsSync(path.join(brand, 'apple-touch-icon.png'))) {
  await sharp(fav, { density: 300 }).resize(180, 180).png().toFile(path.join(brand, 'apple-touch-icon.png'));
}
