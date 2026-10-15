// Markdown content: guides and static pages (frontmatter + rendered Content component).
import type { Faq } from './data';
export type GuideFM = { title: string; seo_title: string; description: string; h1: string; products: string[]; related_hub: string; faqs?: Faq[] };
export type PageFM = { title: string; seo_title: string; description: string; h1: string; faqs?: Faq[] };
type Mod<T> = { frontmatter: T; Content: any; file: string };

const g = import.meta.glob<Mod<GuideFM>>('../content/guides/*.md', { eager: true });
const pg = import.meta.glob<Mod<PageFM>>('../content/pages/*.md', { eager: true });
const slugOf = (f: string) => f.replace(/^.*\//, '').replace(/\.md$/, '');

export const guides = Object.entries(g).map(([f, m]) => ({ slug: slugOf(f), fm: m.frontmatter, Content: m.Content }));
export const pages = Object.fromEntries(Object.entries(pg).map(([f, m]) => [slugOf(f), { slug: slugOf(f), fm: m.frontmatter, Content: m.Content }]));
export const guidesForHub = (path: string, productSlugs: string[] = []) =>
  guides.filter((x) => x.fm.related_hub === path || x.fm.products.some((s) => productSlugs.slice(0, 12).includes(s))).slice(0, 3);
