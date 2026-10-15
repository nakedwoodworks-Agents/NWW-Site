import { SITE_URL } from '../config';
import { allPaths } from '../lib/pages-list';
export function GET() {
  const lastmod = (process.env.BUILD_DATE || new Date().toISOString()).slice(0, 10);
  const pri = (p: string) => (p === '/' ? '1.0' : p.startsWith('/p/') ? '0.8' : p.startsWith('/c/') || p.startsWith('/occasion/') || p === '/shop/' ? '0.7' : '0.5');
  const urls = allPaths().map((p) => `  <url><loc>${SITE_URL}${p}</loc><lastmod>${lastmod}</lastmod><priority>${pri(p)}</priority></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml' } });
}
