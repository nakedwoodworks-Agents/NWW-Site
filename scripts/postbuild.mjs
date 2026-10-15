// Postbuild: remove source photos of held/unpublished products from dist (held items show nowhere),
// and drop the 1600px originals of published products too (pages use /img/p/ derivatives).
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dir = path.join(root, 'dist/images/products');
if (fs.existsSync(dir)) fs.rmSync(path.join(root, 'dist/images'), { recursive: true, force: true });
let n = 0; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : n++; } })(path.join(root, 'dist'));
console.log(`postbuild: dist has ${n} files (Cloudflare Pages limit 20,000)`);
if (n > 20000) { console.error('Too many files for Cloudflare Pages'); process.exit(1); }
