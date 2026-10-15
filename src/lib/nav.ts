// Mega-menu model (PMall-style: occasion-led, each panel split by category / recipient / guides).
import { hubByPath, typeHubs, recipientHubs } from './data';
import { REALTOR_SITE_URL } from '../config';

export type Link = { href: string; label: string; ext?: boolean };
export type Col = { title: string; links: Link[] };
export type Menu = { label: string; href: string; cols: Col[]; feature?: { title: string; text: string; href: string; cta: string } };

const has = (href: string) => hubByPath.has(href);
const L = (href: string, label: string): Link | null => (href.startsWith('/occasion/') || href.startsWith('/c/') || href.startsWith('/for/') ? (has(href) ? { href, label } : null) : { href, label });
const clean = (xs: (Link | null)[]) => xs.filter(Boolean) as Link[];

export const MENUS: Menu[] = [
  {
    label: 'Anniversary', href: '/occasion/anniversary-gifts/',
    cols: [
      { title: 'Anniversary', links: clean([L('/occasion/anniversary-gifts/', 'All anniversary gifts'), L('/occasion/5th-anniversary-wood-gifts/', '5th anniversary (wood)'), L('/guides/anniversary-gifts-by-year/', 'Gifts by year')]) },
      { title: 'By category', links: clean([L('/occasion/anniversary-gifts/cutting-boards/', 'Cutting boards'), L('/occasion/anniversary-gifts/charcuterie-boards/', 'Serving boards'), L('/occasion/anniversary-gifts/coasters/', 'Coasters'), L('/occasion/anniversary-gifts/wine-glasses/', 'Wine glasses')]) },
      { title: 'By recipient', links: clean([L('/for/couples/', 'For couples'), L('/for/her/', 'For her'), L('/for/him/', 'For him')]) },
    ],
    feature: { title: 'Year five is wood', text: 'The traditional 5th-anniversary gift is wood, which is what we make.', href: '/guides/5th-anniversary-gift-guide/', cta: 'Read the guide' },
  },
  {
    label: 'Wedding', href: '/occasion/wedding-gifts/',
    cols: [
      { title: 'Wedding', links: clean([L('/occasion/wedding-gifts/', 'All wedding gifts'), L('/occasion/engagement-gifts/', 'Engagement'), L('/occasion/bridal-shower-gifts/', 'Bridal shower'), L('/occasion/bachelorette-bridesmaid-gifts/', 'Bridesmaids & bachelorette')]) },
      { title: 'By category', links: clean([L('/occasion/wedding-gifts/cutting-boards/', 'Cutting boards'), L('/occasion/wedding-gifts/guest-books/', 'Guest book signs'), L('/occasion/wedding-gifts/charcuterie-boards/', 'Serving boards'), L('/occasion/wedding-gifts/coasters/', 'Coasters'), L('/occasion/wedding-gifts/wine-glasses/', 'Wine glasses')]) },
      { title: 'Guides', links: clean([L('/guides/wedding-guest-book-alternatives/', 'Guest book alternatives'), L('/guides/what-to-engrave-on-a-cutting-board/', 'What to engrave'), L('/for/couples/', 'Gifts for couples')]) },
    ],
    feature: { title: 'Guest book signs', text: 'Guests sign it at the reception; it hangs on your wall after.', href: '/c/guest-books/', cta: 'Shop guest books' },
  },
  {
    label: 'Housewarming', href: '/occasion/housewarming-gifts/',
    cols: [
      { title: 'New home', links: clean([L('/occasion/housewarming-gifts/', 'All housewarming gifts'), L('/occasion/family-keepsakes/', 'Family name boards'), L('/for/new-homeowners/', 'For new homeowners')]) },
      { title: 'By category', links: clean([L('/occasion/housewarming-gifts/cutting-boards/', 'Cutting boards'), L('/occasion/housewarming-gifts/charcuterie-boards/', 'Serving boards'), L('/occasion/housewarming-gifts/coasters/', 'Coasters')]) },
      { title: 'Guides', links: clean([L('/guides/maple-vs-walnut-cutting-board/', 'Maple vs. walnut'), L('/guides/how-to-care-for-an-engraved-cutting-board/', 'Caring for a board')]) },
    ],
  },
  {
    label: 'Realtor & Corporate', href: '/business/',
    cols: [
      { title: 'Realtors', links: clean([L('/occasion/realtor-closing-gifts/', 'Realtor closing gifts'), L('/for/realtors/', 'For realtors'), L('/realtors/', 'How it works for agents'), L('/guides/realtor-closing-gift-guide/', 'Closing gift guide')]) },
      { title: 'Business', links: clean([L('/occasion/corporate-gifts/', 'Corporate & client gifts'), L('/occasion/employee-appreciation-gifts/', 'Employee appreciation'), L('/for/businesses/', 'For businesses'), L('/guides/corporate-gift-guide/', 'Logo gift guide')]) },
      { title: 'Order', links: [{ href: '/business/', label: 'Business inquiry' }, { href: REALTOR_SITE_URL, label: 'foreverclientgifts.com', ext: true }] },
    ],
    feature: { title: 'Your logo, small in the corner', text: 'Closing and client gifts people keep using, not a plaque in a drawer.', href: '/occasion/realtor-closing-gifts/', cta: 'Shop closing gifts' },
  },
  {
    label: 'Holidays & More', href: '/occasion/christmas-gifts/',
    cols: [
      { title: 'Holidays', links: clean([L('/occasion/christmas-gifts/', 'Christmas & ornaments'), L('/occasion/mothers-day-gifts/', "Mother's Day"), L('/occasion/fathers-day-gifts/', "Father's Day")]) },
      { title: 'Milestones', links: clean([L('/occasion/birthday-gifts/', 'Birthday'), L('/occasion/graduation-gifts/', 'Graduation'), L('/occasion/family-keepsakes/', 'Family keepsakes')]) },
      { title: 'By recipient', links: clean([L('/for/grandparents/', 'For grandparents'), L('/for/her/', 'For her'), L('/for/him/', 'For him')]) },
    ],
  },
  {
    label: 'Shop All', href: '/shop/',
    cols: [
      { title: 'By product', links: typeHubs.map((h) => ({ href: h.path, label: h.name })) },
      { title: 'By recipient', links: recipientHubs.map((h) => ({ href: h.path, label: h.name })) },
      { title: 'Everything', links: [{ href: '/shop/', label: 'All products' }, { href: '/guides/', label: 'Buying guides' }, { href: '/faq/', label: 'FAQ' }] },
    ],
  },
];
