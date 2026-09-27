// Every indexable URL on the site (sitemap + checks).
import { products, allHubs } from './data';
import { guides, pages } from './content';
export function allPaths(): string[] {
  return [
    '/', '/shop/', '/guides/',
    ...allHubs.map((h) => h.path),
    ...products.map((p) => `/p/${p.slug}/`),
    ...guides.map((g) => `/guides/${g.slug}/`),
    ...Object.keys(pages).map((s) => `/${s}/`),
  ];
}
