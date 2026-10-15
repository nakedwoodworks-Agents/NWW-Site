// Builds the server-rendered Snipcart add-to-cart button attributes for a product.
// Snipcart's price-validation crawler fetches data-item-url and compares this exact
// button, so this is the single source used both for the page and scripts/check-snipcart.mjs.
import { type Product, ladderFor, fieldsFor, absUrl, imgId } from './data';
import { UPLOADCARE_PUBLIC_KEY, isPlaceholder } from '../config';

export type CustomField = { n: number; key: string; name: string; options?: string; type?: string; required?: boolean; value?: string };

export function productPath(p: Product) { return `/p/${p.slug}/`; }

export function customFields(p: Product): CustomField[] {
  const L = ladderFor(p);
  const out: CustomField[] = [];
  let n = 1;
  L.options.forEach((o, i) => {
    out.push({ n: n++, key: `opt${i}`, name: o.name, options: o.values.join('|'), value: o.values[0].replace(/\[.*\]$/, '') });
  });
  for (const f of fieldsFor(p)) {
    if (f.type === 'file' && isPlaceholder(UPLOADCARE_PUBLIC_KEY)) continue; // no uploader configured
    out.push({ n: n++, key: f.key, name: f.label.replace(/ \(optional\)$/, ''),
      type: f.type === 'textarea' ? 'textarea' : undefined, required: !!f.required });
  }
  return out;
}

export function buttonAttrs(p: Product): Record<string, string> {
  const L = ladderFor(p);
  const a: Record<string, string> = {
    'data-item-id': p.slug,
    'data-item-name': p.name,
    'data-item-price': L.base_price.toFixed(2),
    'data-item-url': absUrl(productPath(p)),
    'data-item-description': p.short,
    'data-item-image': absUrl(`/img/p/${imgId(p)}-400.jpg`),
  };
  for (const c of customFields(p)) {
    a[`data-item-custom${c.n}-name`] = c.name;
    if (c.options) a[`data-item-custom${c.n}-options`] = c.options;
    if (c.type) a[`data-item-custom${c.n}-type`] = c.type;
    if (c.required) a[`data-item-custom${c.n}-required`] = 'true';
    if (c.value) a[`data-item-custom${c.n}-value`] = c.value;
  }
  return a;
}
