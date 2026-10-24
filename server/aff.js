// Affiliate program: shared server code for the Cloudflare Pages Functions in /functions.
// Storage: Cloudflare D1, bound to the Pages project as AFF_DB. Tables are created on first use.
// Program rules (Jackson, 2026-10-24) live in PROGRAM below. Change them here only.

export const PROGRAM = {
  // Monthly ladder: the affiliate's total referred sales in a calendar month (Central time)
  // set the rate for EVERY order in that month.
  tiers: [
    { name: 'Tier 1', min: 0, rate: 0.20 },
    { name: 'Tier 2', min: 1000, rate: 0.25 },
    { name: 'Tier 3', min: 5000, rate: 0.30 },
  ],
  cookieDays: 30,          // a click counts for 30 days (last click wins)
  holdDays: 30,            // commission locks 30 days after the order (refund window)
  minPayout: 50,           // paid on the 1st of each month once the locked balance is $50+
  payoutDay: 1,
  timeZone: 'America/Chicago',
};

const DAY = 86400000;
const REF_COOKIE = 'nww_ref';
const SESSION_COOKIE = 'nww_aff_session';

// ---------------------------------------------------------------- responses
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
export const err = (message, status = 400) => json({ ok: false, error: message }, status);

// ---------------------------------------------------------------- schema
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS affiliates (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     code TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     pass_hash TEXT NOT NULL,
     pass_salt TEXT NOT NULL,
     payout_method TEXT NOT NULL,
     payout_handle TEXT NOT NULL,
     website TEXT, audience TEXT,
     status TEXT NOT NULL DEFAULT 'pending',
     created_at INTEGER NOT NULL, approved_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY, affiliate_id INTEGER, is_admin INTEGER NOT NULL DEFAULT 0, expires_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS clicks (
     id INTEGER PRIMARY KEY AUTOINCREMENT, affiliate_id INTEGER NOT NULL, ts INTEGER NOT NULL,
     day TEXT NOT NULL, visitor TEXT NOT NULL, path TEXT, referrer TEXT)`,
  `CREATE INDEX IF NOT EXISTS clicks_aff_ts ON clicks(affiliate_id, ts)`,
  `CREATE TABLE IF NOT EXISTS orders (
     token TEXT PRIMARY KEY, invoice TEXT, affiliate_id INTEGER NOT NULL, created_at INTEGER NOT NULL,
     month TEXT NOT NULL, amount REAL NOT NULL, refunded REAL NOT NULL DEFAULT 0,
     status TEXT NOT NULL DEFAULT 'active', source TEXT NOT NULL DEFAULT 'snipcart', note TEXT)`,
  `CREATE INDEX IF NOT EXISTS orders_aff ON orders(affiliate_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS payouts (
     id INTEGER PRIMARY KEY AUTOINCREMENT, affiliate_id INTEGER NOT NULL, amount REAL NOT NULL,
     paid_at INTEGER NOT NULL, method TEXT, note TEXT)`,
  `CREATE TABLE IF NOT EXISTS login_fails (key TEXT NOT NULL, ts INTEGER NOT NULL)`,
];
let ready = false;
export async function db(env) {
  if (!env.AFF_DB) throw new Response(JSON.stringify({ ok: false, error: 'Affiliate program is not switched on yet (no AFF_DB database bound).' }), { status: 503, headers: { 'content-type': 'application/json' } });
  if (!ready) { await env.AFF_DB.batch(SCHEMA.map((s) => env.AFF_DB.prepare(s))); ready = true; }
  return env.AFF_DB;
}

// ---------------------------------------------------------------- crypto helpers
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export const randomHex = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
export async function hashPassword(password, saltHex) {
  const salt = saltHex || randomHex(16);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return { hash: hex(bits), salt };
}
const safeEqual = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
export const passwordMatches = async (pw, row) => safeEqual((await hashPassword(pw, row.pass_salt)).hash, row.pass_hash);
export const adminPasswordMatches = (pw, env) => !!env.AFF_ADMIN_PASSWORD && typeof pw === 'string' && safeEqual(pw, env.AFF_ADMIN_PASSWORD);

// ---------------------------------------------------------------- cookies + sessions
export function getCookie(request, name) {
  const m = (request.headers.get('cookie') || '').match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
const secureFlag = (request) => (new URL(request.url).protocol === 'https:' ? '; Secure' : '');
export const refCookie = (request, code) => `${REF_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=${PROGRAM.cookieDays * 86400}; SameSite=Lax${secureFlag(request)}`;

export async function createSession(env, request, { affiliateId = null, isAdmin = false }) {
  const token = randomHex(32);
  const days = isAdmin ? 1 : 14;
  await env.AFF_DB.prepare('INSERT INTO sessions (token_hash, affiliate_id, is_admin, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), affiliateId, isAdmin ? 1 : 0, Date.now() + days * DAY).run();
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${days * 86400}; HttpOnly; SameSite=Strict${secureFlag(request)}`;
}
export const clearSessionCookie = (request) => `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secureFlag(request)}`;
export async function getSession(env, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const s = await env.AFF_DB.prepare('SELECT * FROM sessions WHERE token_hash = ?').bind(await sha256(token)).first();
  if (!s || s.expires_at < Date.now()) return null;
  return s;
}
export async function destroySession(env, request) {
  const token = getCookie(request, SESSION_COOKIE);
  if (token) await env.AFF_DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

// Basic brute-force brake: 8 failed logins per key in 15 minutes.
export async function tooManyFails(env, key) {
  const since = Date.now() - 15 * 60000;
  await env.AFF_DB.prepare('DELETE FROM login_fails WHERE ts < ?').bind(since).run();
  const r = await env.AFF_DB.prepare('SELECT COUNT(*) AS n FROM login_fails WHERE key = ?').bind(key).first();
  return (r?.n || 0) >= 8;
}
export const recordFail = (env, key) => env.AFF_DB.prepare('INSERT INTO login_fails (key, ts) VALUES (?, ?)').bind(key, Date.now()).run();

// ---------------------------------------------------------------- time
export function monthKey(ts) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: PROGRAM.timeZone, year: 'numeric', month: '2-digit' }).formatToParts(new Date(ts));
  return `${p.find((x) => x.type === 'year').value}-${p.find((x) => x.type === 'month').value}`;
}
export function dayKey(ts) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: PROGRAM.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts));
}
export function nextPayoutDate(now = Date.now()) {
  const [y, m] = monthKey(now).split('-').map(Number);
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-0${PROGRAM.payoutDay}`;
}

// ---------------------------------------------------------------- commission math
export const tierFor = (monthSales) => [...PROGRAM.tiers].reverse().find((t) => monthSales >= t.min) || PROGRAM.tiers[0];
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Turns an affiliate's orders + payouts into the numbers the dashboard and admin show.
 * Each order's commission = net sale x the rate of the tier its MONTH reached.
 * pending = still inside the 30-day hold; locked = past the hold; owed = locked - paid.
 */
export function ledger(orders, payouts, now = Date.now()) {
  const byMonth = {};
  for (const o of orders) {
    const net = o.status === 'void' ? 0 : Math.max(0, o.amount - (o.refunded || 0));
    (byMonth[o.month] ||= { month: o.month, sales: 0, orders: 0 });
    byMonth[o.month].sales += net;
    if (net > 0) byMonth[o.month].orders += 1;
  }
  for (const m of Object.values(byMonth)) { m.sales = round2(m.sales); const t = tierFor(m.sales); m.tier = t.name; m.rate = t.rate; m.commission = 0; }
  let pending = 0, locked = 0;
  const rows = orders.map((o) => {
    const net = o.status === 'void' ? 0 : Math.max(0, o.amount - (o.refunded || 0));
    const rate = byMonth[o.month].rate;
    const commission = round2(net * rate);
    const locksAt = o.created_at + PROGRAM.holdDays * DAY;
    const isLocked = now >= locksAt;
    if (isLocked) locked += commission; else pending += commission;
    byMonth[o.month].commission += commission;
    return { token: o.token, invoice: o.invoice, created_at: o.created_at, month: o.month, amount: o.amount, refunded: o.refunded || 0, net: round2(net), rate, commission, status: o.status === 'void' ? 'void' : isLocked ? 'locked' : 'pending', locks_at: locksAt, source: o.source };
  });
  const paid = round2(payouts.reduce((s, p) => s + p.amount, 0));
  const owed = round2(locked - paid);
  return {
    rows,
    months: Object.values(byMonth).map((m) => ({ ...m, commission: round2(m.commission) })).sort((a, b) => (a.month < b.month ? 1 : -1)),
    pending: round2(pending), locked: round2(locked), paid, owed,
    payable_next: owed >= PROGRAM.minPayout ? owed : 0,
  };
}

// ---------------------------------------------------------------- misc
export async function readJson(request) { try { return await request.json(); } catch { return {}; } }
export const cleanStr = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const normCode = (c) => cleanStr(c, 40).toUpperCase().replace(/[^A-Z0-9-]/g, '');
export function makeCode(name) {
  const base = (name.split(/\s+/)[0] || 'NWW').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) || 'NWW';
  return `${base}${Math.floor(100 + Math.random() * 900)}`;
}
export const publicAffiliate = (a) => ({ id: a.id, code: a.code, name: a.name, email: a.email, payout_method: a.payout_method, payout_handle: a.payout_handle, website: a.website, audience: a.audience, status: a.status, created_at: a.created_at, approved_at: a.approved_at });
export async function visitorId(request, code) {
  const ip = request.headers.get('cf-connecting-ip') || '0';
  const ua = request.headers.get('user-agent') || '';
  return (await sha256(`${ip}|${ua}|${code}|${dayKey(Date.now())}`)).slice(0, 24);
}
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|snipcart/i;

/** Records one click for an approved affiliate code. Returns the affiliate row or null. */
export async function recordClick(env, request, code, path, referrer) {
  const d = await db(env);
  const aff = await d.prepare("SELECT id, code FROM affiliates WHERE code = ? AND status = 'approved'").bind(code).first();
  if (!aff) return null;
  if (BOT.test(request.headers.get('user-agent') || '')) return aff;
  const now = Date.now();
  await d.prepare('INSERT INTO clicks (affiliate_id, ts, day, visitor, path, referrer) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(aff.id, now, dayKey(now), await visitorId(request, code), cleanStr(path, 300), cleanStr(referrer, 300)).run();
  return aff;
}

/** Optional: tell Jackson about a new application (any webhook URL, e.g. a GHL inbound webhook). */
export async function notify(env, payload) {
  if (!env.AFF_NOTIFY_WEBHOOK) return;
  try { await fetch(env.AFF_NOTIFY_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch {}
}
