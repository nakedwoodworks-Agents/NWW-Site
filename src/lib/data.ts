// Data layer: products, price ladders, taxonomy, hubs. Everything the pages render comes through here.
import productsRaw from '../../data/products.json';
import laddersRaw from '../../data/price-ladders.json';
import taxonomy from '../../data/taxonomy.json';
import hubCopyRaw from '../../data/hub-copy.json';
import proof from '../../data/proof.json';
import { SITE_URL } from '../config';

export type Faq = { q: string; a: string };
export type Product = {
  slug: string; name: string; etsy_title: string; type: string; price_ladder: string;
  occasions: string[]; recipients: string[]; image: string; grid_image: string | null;
  publish: boolean; hold_reason: string | null; short: string; description: string; personalize: string;
  source: { etsy_listing_id: string; etsy_url: string; etsy_sales_all_time: number;
    etsy_rating?: { stars: number; reviews: number; listing: string; pulled: string } };
};
export type LadderOption = { name: string; values: string[] };
export type Ladder = { base_price: number; options: LadderOption[] };

export const allProducts = productsRaw as unknown as Product[];
export const products: Product[] = allProducts
  .filter((p) => p.publish === true)
  .sort((a, b) => b.source.etsy_sales_all_time - a.source.etsy_sales_all_time);
export const bySlug = new Map(products.map((p) => [p.slug, p]));

const ladders = laddersRaw as unknown as Record<string, any>;

/**
 * Price ladder for a product. Straight from data/price-ladders.json.
 * The one derived ladder is the board + coaster gift set: board base + coaster base,
 * with the board options and the coaster "Set & Wood" option verbatim (no new numbers).
 */
export function ladderFor(p: Product): Ladder {
  if (p.type === 'board-coaster-set') {
    const b = ladders.board, c = ladders.coaster;
    const coasterOpt = c.options.find((o: LadderOption) => o.name === 'Set & Wood');
    return {
      base_price: round2(b.base_price + c.base_price),
      options: [...b.options, { name: 'Coaster set', values: coasterOpt.values }],
    };
  }
  const l = ladders[p.price_ladder];
  if (!l || typeof l.base_price !== 'number') throw new Error(`No price ladder "${p.price_ladder}" for ${p.slug}`);
  return { base_price: l.base_price, options: l.options || [] };
}
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const money = (n: number) => '$' + n.toFixed(2);
export const fromPrice = (p: Product) => ladderFor(p).base_price;

/** Parse "Label[+12.50]" -> { label, delta }. */
export function parseOption(v: string) {
  const m = v.match(/^(.*?)(?:\[([+-]\d+(?:\.\d+)?)\])?$/);
  return { label: (m?.[1] ?? v).trim(), delta: m?.[2] ? parseFloat(m[2]) : 0 };
}

// ---------------------------------------------------------------- images
export const imgId = (p: Product) => p.image.replace(/^.*\//, '').replace(/\.jpg$/, '');
export const gridImgId = (p: Product) => (p.grid_image ? p.grid_image.replace(/^.*\//, '').replace(/\.\w+$/, '') : imgId(p));
export const IMG_WIDTHS = [400, 800, 1200];
export const absUrl = (path: string) => SITE_URL + path;

// ---------------------------------------------------------------- taxonomy + hubs
export type HubCopy = { h1: string; seo_title: string; meta: string; intro: string[]; faqs: Faq[] };
const hubCopy = hubCopyRaw as unknown as Record<string, HubCopy>;
export const copyFor = (id: string): HubCopy | undefined => hubCopy[id];

export const TYPES = taxonomy.product_types as { slug: string; type: string; name: string; keywords: string[] }[];
export const OCCASIONS = taxonomy.occasions as { slug: string; tag: string; name: string; keywords: string[] }[];
export const RECIPIENTS = (taxonomy.recipients as { slug: string; tag: string; name: string }[]).map((r) => ({
  ...r, path: r.slug.replace(/^for-/, ''),
}));
export const GUIDE_META = taxonomy.guides as { slug: string; title: string; targets: string }[];

export const typeName = (type: string) => TYPES.find((t) => t.type === type)?.name ?? type;
export const typeSlug = (type: string) => TYPES.find((t) => t.type === type)?.slug;
export const SINGULAR: Record<string, string> = {
  'cutting-board': 'Cutting board', 'charcuterie-board': 'Serving board', 'coaster-set': 'Coaster set',
  'wine-glass': 'Wine glass', ornament: 'Ornament', 'guest-book-sign': 'Guest book sign',
  'board-coaster-set': 'Board and coaster set', 'cake-topper': 'Cake topper',
};

const MIN = 3;
export type Hub = { id: string; kind: 'type' | 'occasion' | 'recipient' | 'combo'; path: string; name: string;
  products: Product[]; copy: HubCopy; parent?: string; typeSlug?: string };

export const typeHubs: Hub[] = TYPES.map((t) => ({
  id: `type:${t.slug}`, kind: 'type' as const, path: `/c/${t.slug}/`, name: t.name,
  products: products.filter((p) => p.type === t.type), copy: copyFor(`type:${t.slug}`)!,
})).filter((h) => h.products.length >= MIN && h.copy);

export const occasionHubs: Hub[] = OCCASIONS.map((o) => ({
  id: `occasion:${o.slug}`, kind: 'occasion' as const, path: `/occasion/${o.slug}/`, name: o.name,
  products: products.filter((p) => p.occasions.includes(o.tag)), copy: copyFor(`occasion:${o.slug}`)!,
})).filter((h) => h.products.length >= MIN && h.copy);

export const recipientHubs: Hub[] = RECIPIENTS.map((r) => ({
  id: `recipient:${r.path}`, kind: 'recipient' as const, path: `/for/${r.path}/`, name: r.name,
  products: products.filter((p) => p.recipients.includes(r.tag)), copy: copyFor(`recipient:${r.path}`)!,
})).filter((h) => h.products.length >= MIN && h.copy);

/** Combo hubs: occasion x type with >= 3 products, only where the combo is a real subset (< 75% of the occasion). */
export const comboHubs: Hub[] = (() => {
  const out: Hub[] = [];
  for (const o of OCCASIONS) {
    if (o.slug === '5th-anniversary-wood-gifts') continue; // same tag as anniversary; avoid duplicate combos
    const occ = products.filter((p) => p.occasions.includes(o.tag));
    for (const t of TYPES) {
      const ps = occ.filter((p) => p.type === t.type);
      const copy = copyFor(`combo:${o.slug}/${t.slug}`);
      if (ps.length >= MIN && ps.length < occ.length * 0.75 && copy) {
        out.push({ id: `combo:${o.slug}/${t.slug}`, kind: 'combo', path: `/occasion/${o.slug}/${t.slug}/`,
          name: copy.h1, products: ps, copy, parent: `/occasion/${o.slug}/`, typeSlug: t.slug });
      }
    }
  }
  return out;
})();

export const allHubs = [...typeHubs, ...occasionHubs, ...recipientHubs, ...comboHubs];
export const hubByPath = new Map(allHubs.map((h) => [h.path, h]));

export const occasionByTag = (tag: string) => {
  const o = OCCASIONS.find((x) => x.tag === tag && x.slug !== '5th-anniversary-wood-gifts');
  return o && hubByPath.get(`/occasion/${o.slug}/`) ? o : undefined;
};
export const recipientByTag = (tag: string) => {
  const r = RECIPIENTS.find((x) => x.tag === tag);
  return r && hubByPath.get(`/for/${r.path}/`) ? r : undefined;
};

// ---------------------------------------------------------------- proof lines (real data only)
/** "5,500+ sold on Etsy" style line, rounded DOWN to the hundred; only for listings with >= 500 sales. */
export function soldLine(p: Product): string | null {
  const n = p.source.etsy_sales_all_time;
  if (!n || n < 500) return null;
  const r = Math.floor(n / 100) * 100;
  return `${r.toLocaleString('en-US')}+ sold on Etsy`;
}
// Only ratings listed in data/proof.json (fact etsy_listing_ratings) may be shown.
const PROOF_RATINGS: Record<string, { stars: number; reviews: number }> = (() => {
  const src = (proof as any).facts.find((f: any) => f.id === 'etsy_listing_ratings')?.source || '';
  const out: Record<string, { stars: number; reviews: number }> = {};
  for (const m of src.matchAll(/(\d{6,})\s+([\d.]+)\s+\((\d[\d,]*)(?: reviews)?\)/g)) out[m[1]] = { stars: +m[2], reviews: +m[3].replace(/,/g, '') };
  return out;
})();
export function ratingLine(p: Product) {
  const r = p.source.etsy_rating;
  if (!r) return null;
  const ok = PROOF_RATINGS[r.listing];
  if (!ok || ok.stars !== r.stars || ok.reviews !== r.reviews) return null;
  return { text: `${r.stars} stars from ${r.reviews.toLocaleString('en-US')} Etsy reviews`, url: `https://www.etsy.com/listing/${r.listing}` };
}

// ---------------------------------------------------------------- personalization fields
export type Field = { key: string; label: string; type: 'text' | 'textarea' | 'file' | 'date';
  required?: boolean; placeholder?: string; help?: string; maxlength?: number };

const NOTES: Field = { key: 'notes', label: 'Notes for our shop', type: 'textarea', placeholder: 'Anything we should know: spelling, a date you need it by, wood or layout questions.', maxlength: 500 };
const NAMES: Field = { key: 'names', label: 'Names to engrave', type: 'textarea', required: true, placeholder: 'First names and last name exactly as you want them, e.g. Your first names & your last name', maxlength: 200 };
const DATE: Field = { key: 'date', label: 'Established date or year', type: 'text', placeholder: 'e.g. Est. 06.15.2021 or 2021', maxlength: 60 };
const LOGO: Field = { key: 'logo', label: 'Logo file (optional)', type: 'file', help: 'Vector (AI, EPS, SVG, PDF) is best; a high-resolution PNG or JPG works.' };
const BIZ: Field = { key: 'business', label: 'Business line (optional)', type: 'text', placeholder: 'e.g. Compliments of your name, your title, phone', maxlength: 160 };

export function fieldsFor(p: Product): Field[] {
  switch (p.personalize) {
    case 'names': return [NAMES, DATE, NOTES];
    case 'names-logo': return [NAMES, DATE, LOGO, BIZ, NOTES];
    case 'logo': return [{ ...LOGO, label: 'Logo file', help: LOGO.help + ' No file handy? Order now and send it when we email your proof.' },
      { key: 'company', label: 'Company name and any text lines', type: 'textarea', required: true, placeholder: 'Company name, tagline, or the contact lines you want under the logo', maxlength: 240 }, NOTES];
    case 'saying': return [NOTES];
    case 'name-glass': return [{ key: 'text', label: 'Names or text to engrave', type: 'textarea', required: true, placeholder: 'Names, last name and date, exactly as you want them', maxlength: 160 }, NOTES];
    case 'ornament': return [{ key: 'names', label: 'Names and year to engrave', type: 'textarea', required: true, placeholder: 'Names and year exactly as you want them', maxlength: 200 }, NOTES];
    case 'memorial': return [{ key: 'names', label: 'Name and years', type: 'text', required: true, placeholder: 'e.g. Their full name, 1950 - 2024', maxlength: 80 }, NOTES];
    case 'title': return [{ key: 'title', label: 'Title (e.g. Mommy, Grandma, Aunt)', type: 'text', required: true, maxlength: 40 }, { key: 'year', label: 'Year', type: 'text', maxlength: 10 }, NOTES];
    case 'pet': return [{ key: 'pet', label: "Pet's name", type: 'text', required: true, maxlength: 30 }, NOTES];
    case 'teacher': return [{ key: 'teacher', label: "Teacher's name", type: 'text', required: true, placeholder: 'e.g. Mrs. Smith', maxlength: 40 },
      { key: 'from', label: 'From', type: 'text', placeholder: "Student's name", maxlength: 40 }, { key: 'year', label: 'School year', type: 'text', placeholder: 'e.g. 2026-27', maxlength: 12 }, NOTES];
    case 'guestbook': return [{ key: 'names', label: 'Names to engrave', type: 'textarea', required: true, placeholder: 'Last name, and first names if the design shows them', maxlength: 160 },
      { key: 'wedding_date', label: 'Wedding date', type: 'text', placeholder: 'e.g. 09.12.2026', maxlength: 40 }, NOTES];
    case 'recipe': return [{ key: 'recipe', label: 'Recipe to engrave', type: 'textarea', required: true, placeholder: 'Title, ingredients, steps and a sign-off (e.g. Love, Grandma). Or upload a photo of the card and write "see photo".', maxlength: 1500 },
      { ...LOGO, key: 'recipe_photo', label: 'Photo of the recipe card (optional)', help: 'A clear, well-lit photo of the original card.' }, NOTES];
    case 'state': return [NAMES, { key: 'state', label: 'State', type: 'text', required: true, placeholder: 'e.g. Oklahoma', maxlength: 30 }, DATE, NOTES];
    case 'address': return [NAMES, { key: 'address', label: 'Street address or coordinates', type: 'text', required: true, placeholder: 'e.g. 1420 Willow Creek Drive', maxlength: 120 }, NOTES];
    case 'employee': return [{ key: 'recipient', label: "Employee's name", type: 'text', required: true, maxlength: 60 },
      { key: 'message', label: 'Company name, message and years', type: 'textarea', required: true, placeholder: 'e.g. Your company, "For Ten Years of Dedication to Our Team", 2016 - 2026', maxlength: 240 }, LOGO, NOTES];
    case 'cake': return [NOTES];
    default: return [NOTES];
  }
}

/** Human list of what gets engraved, for the fact box. */
export function personalizationSummary(p: Product) {
  const f = fieldsFor(p).filter((x) => x.key !== 'notes');
  if (!f.length) return 'Fixed design, nothing to fill in';
  return f.map((x) => x.label.replace(/ \(optional\)/, '') + (x.required ? '' : ' (optional)')).join(', ');
}

// ---------------------------------------------------------------- facts (proof.json only)
export function factsFor(p: Product): [string, string][] {
  const L = ladderFor(p);
  const f: [string, string][] = [];
  const t = p.type;
  if (['cutting-board', 'charcuterie-board', 'board-coaster-set'].includes(t)) {
    f.push(['Material', 'Solid maple or walnut, one solid slab']);
    f.push(['Sizes', '8x12 in and 10x14 in (0.75 in thick), 12x16 in (1.5 in thick), 16x24 in walnut (1.5 in thick)']);
    if (t === 'board-coaster-set') f.push(['Coasters', 'Maple or walnut, set of 2, 4, 8 or 16']);
  } else if (t === 'coaster-set') {
    f.push(['Material', 'Maple or walnut']); f.push(['Sets', '2, 4, 8 or 16 coasters']);
  } else if (t === 'wine-glass') {
    f.push(['Glass', '21 oz stemless wine glass']); f.push(['Quantity', 'Single, or a set of 2, 4 or 8']);
  } else if (t === 'ornament') {
    f.push(['Material', 'Wood ornament']); f.push(['Quantity', 'Single, or a set of 2, 5 or 10']);
  } else if (t === 'guest-book-sign') {
    f.push(['Sizes', '20 in to 48 in wide, sized for about 30 to 250 guests']);
    f.push(['Finish', 'Natural, stained, painted black or painted white']);
  }
  f.push(['Engraving', t === 'cake-topper' ? 'Laser cut' : 'Laser engraved']);
  f.push(['Personalization', personalizationSummary(p)]);
  f.push(['Proof', 'Free digital proof before we engrave']);
  f.push(['Made in', 'Pryor, Oklahoma']);
  f.push(['Lead time', 'Made to order in 3-5 business days (rush available, ask us)']);
  if (['cutting-board', 'charcuterie-board', 'board-coaster-set'].includes(t)) f.push(['Care', 'Hand wash, dry right away, oil when it looks dry']);
  else if (t === 'wine-glass') f.push(['Care', 'Hand washing suggested']);
  else if (t === 'coaster-set') f.push(['Care', 'Wipe clean and let dry']);
  else f.push(['Care', 'Keep dry and out of direct sun']);
  f.push(['Price', `From ${money(L.base_price)}`]);
  return f;
}

export const isBoardType = (t: string) => ['cutting-board', 'charcuterie-board', 'board-coaster-set'].includes(t);
