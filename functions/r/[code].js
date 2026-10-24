// /r/CODE  : an affiliate's share link. Logs the click, drops the 30-day referral cookie, sends the
// visitor to the homepage (or to ?to=/some/path/ on this site).
import { normCode, recordClick, refCookie } from '../../server/aff.js';

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url);
  const code = normCode(params.code || '');
  let to = url.searchParams.get('to') || '/';
  if (!to.startsWith('/') || to.startsWith('//')) to = '/';
  const headers = new Headers({ location: to, 'cache-control': 'no-store' });
  try {
    const aff = code ? await recordClick(env, request, code, to, request.headers.get('referer') || '') : null;
    if (aff) headers.append('set-cookie', refCookie(request, aff.code));
  } catch (e) { /* never block the visitor */ }
  return new Response(null, { status: 302, headers });
}
