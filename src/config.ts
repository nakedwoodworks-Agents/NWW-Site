// ============================================================================
// Naked Wood Works site config. EVERY third-party key and business decision
// lives here. Values starting with PLACEHOLDER_ are unset: the site still
// works (browse, quiz results, add to cart) and hides the feature that needs
// the key. See BUILD-NOTES.md for where to get each value.
// ============================================================================

const env = (typeof process !== 'undefined' && process.env) || ({} as Record<string, string | undefined>);

/** Absolute site URL, no trailing slash. Set SITE_URL in Cloudflare Pages. */
export const SITE_URL: string = (env.SITE_URL || 'https://nww-site.pages.dev').replace(/\/+$/, '');

export const SHOP_NAME = 'Naked Wood Works';

/** Snipcart PUBLIC API key. Default = the key already public on foreverclientgifts.com. Swap in a Test key for test orders. */
export const SNIPCART_PUBLIC_KEY =
  env.SNIPCART_PUBLIC_KEY || 'ZDU4YWIwYTUtODEzZS00Y2M5LTkwY2UtOWE5MjFlYWVhMzg3NjM5MTkxODU2MTc2MDM0NjE2';
export const SNIPCART_VERSION = '3.7.1';

/** Uploadcare public key (logo / recipe uploads). Placeholder = upload field hidden, buyers are told to send the file with their proof. */
export const UPLOADCARE_PUBLIC_KEY = env.UPLOADCARE_PUBLIC_KEY || 'PLACEHOLDER_UPLOADCARE_PUBLIC_KEY';

/** Meta Pixel (same pixel as foreverclientgifts.com). Empty string disables it. */
export const META_PIXEL_ID = env.META_PIXEL_ID ?? '1380340263951755';

/** GoHighLevel. */
export const GHL_QUIZ_FORM_ID = env.GHL_QUIZ_FORM_ID || 'PLACEHOLDER_GHL_QUIZ_FORM_ID'; // "NWW Gift Quiz" form (specs/quiz-and-ghl.md)
export const GHL_QUIZ_WEBHOOK_URL = env.GHL_QUIZ_WEBHOOK_URL || 'PLACEHOLDER_GHL_QUIZ_WEBHOOK_URL'; // Mode B only
export const GHL_BUSINESS_FORM_ID = env.GHL_BUSINESS_FORM_ID || 'PLACEHOLDER_GHL_BUSINESS_FORM_ID'; // /business inquiry form
export const GHL_LEAD_FORM_ID = 'qmRraj2f5xSRqvBFcIMc'; // FCG "Agent list" form (not used on this site; kept for reference)

/** 'ghl_form' (default: GHL form embed with hidden fields) or 'webhook' (site form posts JSON to GHL_QUIZ_WEBHOOK_URL). */
export const QUIZ_MODE: 'ghl_form' | 'webhook' = (env.QUIZ_MODE as any) === 'webhook' ? 'webhook' : 'ghl_form';
/** true = results only after contact info. Default false: results are never held hostage. */
export const QUIZ_GATE_RESULTS = env.QUIZ_GATE_RESULTS === 'true';
/** Seconds before the quiz modal auto-opens once for first-time visitors (not on the homepage). 0 disables. */
export const QUIZ_AUTO_OPEN_SECONDS = 8;

/** Contact email shown on /contact. Placeholder = page falls back to "message us on Etsy". */
export const CONTACT_EMAIL = env.CONTACT_EMAIL || 'PLACEHOLDER_CONTACT_EMAIL';

/**
 * Offer block (homepage + quiz results). Jackson decides. While null, the offer block is hidden everywhere.
 * Example once decided: { headline: '...', detail: '...', code: '...' }
 * Current decision: [OFFER: Jackson decides]
 */
export const OFFER: null | { headline: string; detail: string; code?: string } = null;

/** Social / marketplace profiles (Organization.sameAs). Only real, confirmed URLs. */
export const ETSY_SHOP_URL = 'https://www.etsy.com/shop/nakedwoodenworks';
export const REALTOR_SITE_URL = 'https://foreverclientgifts.com';
export const SAME_AS: string[] = [
  ETSY_SHOP_URL,
  'https://www.pinterest.com/nakedwoodworks/',
  // PLACEHOLDER: add the Amazon brand store URL and Facebook page URL when confirmed.
];

export const isPlaceholder = (v: string | null | undefined) => !v || /^PLACEHOLDER_/.test(v);
