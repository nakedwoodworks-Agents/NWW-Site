import { products, ladderFor, parseOption, gridImgId, round2 } from '../lib/data';
export function GET() {
  const data = products.map((p) => {
    const L = ladderFor(p);
    const max = L.base_price + L.options.reduce((s, o) => s + Math.max(0, ...o.values.map((v) => parseOption(v).delta)), 0);
    return { s: p.slug, n: p.name, p: L.base_price, max: round2(max), i: gridImgId(p), o: p.occasions, r: p.recipients, t: p.type };
  });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
