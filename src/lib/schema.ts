import { SITE_URL } from '../config';
import type { Faq, Product } from './data';
import { absUrl, fromPrice, imgId } from './data';

export const breadcrumbLd = (items: { name: string; href?: string }[], currentPath: string) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: SITE_URL + (it.href ?? currentPath) })),
});
export const faqLd = (faqs: Faq[]) => (faqs.length ? {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
} : null);
export const itemListLd = (ps: Product[]) => ({
  '@context': 'https://schema.org', '@type': 'ItemList', numberOfItems: ps.length,
  itemListElement: ps.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: absUrl(`/p/${p.slug}/`), name: p.name })),
});
export const collectionLd = (name: string, description: string, path: string, ps: Product[]) => ({
  '@context': 'https://schema.org', '@type': 'CollectionPage', name, description, url: SITE_URL + path,
  isPartOf: { '@id': SITE_URL + '/#website' }, mainEntity: itemListLd(ps),
});
export const productImage = (p: Product) => absUrl(`/img/p/${imgId(p)}-1200.jpg`);
