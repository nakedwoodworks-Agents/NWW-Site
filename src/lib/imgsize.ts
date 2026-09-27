// Tiny synchronous JPEG size reader (SOF marker), used for width/height on product hero images.
import fs from 'node:fs';
import path from 'node:path';
const cache = new Map<string, { w: number; h: number }>();
export default function sizeOf(publicPath: string): { w: number; h: number } {
  if (cache.has(publicPath)) return cache.get(publicPath)!;
  let out = { w: 1600, h: 1200 };
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'public', publicPath));
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { out = { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; break; }
      i += 2 + len;
    }
  } catch { /* default */ }
  cache.set(publicPath, out);
  return out;
}
