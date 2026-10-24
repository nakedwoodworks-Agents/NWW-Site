// /api/aff/* : affiliate apply, login, dashboard data, click logging, and Jackson's admin actions.
import {
  PROGRAM, json, err, db, readJson, cleanStr, validEmail, normCode, makeCode, hashPassword, passwordMatches,
  adminPasswordMatches, createSession, getSession, destroySession, clearSessionCookie, tooManyFails, recordFail,
  ledger, tierFor, monthKey, dayKey, nextPayoutDate, publicAffiliate, recordClick, refCookie, notify, randomHex, sha256,
} from '../../../server/aff.js';

const DAY = 86400000;
const METHODS = ['PayPal', 'Venmo'];

export async function onRequest(context) {
  const { request, env, params } = context;
  const route = (params.path || []).join('/');
  const method = request.method;
  try {
    if (method === 'POST' && route === 'apply') return await apply(env, request);
    if (method === 'POST' && route === 'login') return await login(env, request);
    if (method === 'POST' && route === 'logout') { await db(env); await destroySession(env, request); return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) }); }
    if (method === 'GET' && route === 'me') return await me(env, request);
    if (method === 'POST' && route === 'click') return await click(env, request);
    if (method === 'GET' && route === 'program') return json({ ok: true, program: PROGRAM });
    if (method === 'POST' && route === 'admin/login') return await adminLogin(env, request);
    if (route.startsWith('admin/')) return await admin(env, request, route.slice(6), method);
    return err('Not found', 404);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return err('Something went wrong on our side. Try again in a minute.', 500);
  }
}

// ------------------------------------------------------------------ public
async function apply(env, request) {
  const d = await db(env);
  const b = await readJson(request);
  const name = cleanStr(b.name, 80), email = cleanStr(b.email, 120).toLowerCase(), password = typeof b.password === 'string' ? b.password : '';
  const payout_method = METHODS.includes(b.payout_method) ? b.payout_method : '';
  const payout_handle = cleanStr(b.payout_handle, 120), website = cleanStr(b.website, 200), audience = cleanStr(b.audience, 600);
  if (!name) return err('Add your name.');
  if (!validEmail(email)) return err('That email does not look right.');
  if (password.length < 8) return err('Use a password with at least 8 characters.');
  if (!payout_method || !payout_handle) return err('Tell us where to send your commissions (PayPal email or Venmo handle).');
  if (!b.agree) return err('Please accept the program terms.');
  if (await d.prepare('SELECT 1 FROM affiliates WHERE email = ?').bind(email).first()) return err('That email already has an account. Log in instead.', 409);
  let code = normCode(b.code || '');
  if (code && (code.length < 3 || await d.prepare('SELECT 1 FROM affiliates WHERE code = ?').bind(code).first())) return err('That link name is taken. Try another, or leave it blank.', 409);
  if (!code) { for (let i = 0; i < 10; i++) { code = makeCode(name); if (!(await d.prepare('SELECT 1 FROM affiliates WHERE code = ?').bind(code).first())) break; } }
  const { hash, salt } = await hashPassword(password);
  await d.prepare('INSERT INTO affiliates (code, name, email, pass_hash, pass_salt, payout_method, payout_handle, website, audience, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .bind(code, name, email, hash, salt, payout_method, payout_handle, website, audience, 'pending', Date.now()).run();
  await notify(env, { type: 'affiliate_application', name, email, code, website, audience });
  return json({ ok: true, status: 'pending', code });
}

async function login(env, request) {
  const d = await db(env);
  const b = await readJson(request);
  const email = cleanStr(b.email, 120).toLowerCase();
  const key = 'u:' + email;
  if (await tooManyFails(env, key)) return err('Too many tries. Wait 15 minutes and try again.', 429);
  const a = await d.prepare('SELECT * FROM affiliates WHERE email = ?').bind(email).first();
  if (!a || !(await passwordMatches(String(b.password || ''), a))) { await recordFail(env, key); return err('Email or password is wrong.', 401); }
  if (a.status === 'rejected') return err('This application was not approved.', 403);
  const cookie = await createSession(env, request, { affiliateId: a.id });
  return json({ ok: true, status: a.status }, 200, { 'set-cookie': cookie });
}

async function click(env, request) {
  const b = await readJson(request);
  const code = normCode(b.code || '');
  if (!code) return err('No code');
  const aff = await recordClick(env, request, code, b.path, b.referrer);
  if (!aff) return json({ ok: false }, 404);
  return json({ ok: true, code: aff.code }, 200, { 'set-cookie': refCookie(request, aff.code) });
}

// ------------------------------------------------------------------ affiliate dashboard
async function me(env, request) {
  const d = await db(env);
  const s = await getSession(env, request);
  if (!s || !s.affiliate_id) return err('Log in to see your dashboard.', 401);
  const a = await d.prepare('SELECT * FROM affiliates WHERE id = ?').bind(s.affiliate_id).first();
  if (!a) return err('Account not found.', 401);
  const base = new URL(request.url).origin;
  const out = { ok: true, affiliate: publicAffiliate(a), program: PROGRAM, link: `${base}/r/${a.code}`, link_any_page: `${base}/?ref=${a.code}` };
  if (a.status !== 'approved') return json(out);
  return json({ ...out, ...(await stats(d, a.id)) });
}

async function stats(d, affId) {
  const now = Date.now();
  const since30 = now - 30 * DAY;
  const [clickAll, click30, clickDays, orders, payouts] = await Promise.all([
    d.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM clicks WHERE affiliate_id = ?').bind(affId).first(),
    d.prepare('SELECT COUNT(*) AS n, COUNT(DISTINCT visitor) AS u FROM clicks WHERE affiliate_id = ? AND ts >= ?').bind(affId, since30).first(),
    d.prepare('SELECT day, COUNT(*) AS n FROM clicks WHERE affiliate_id = ? AND ts >= ? GROUP BY day').bind(affId, since30).all(),
    d.prepare('SELECT * FROM orders WHERE affiliate_id = ? ORDER BY created_at DESC').bind(affId).all(),
    d.prepare('SELECT amount, paid_at, method, note FROM payouts WHERE affiliate_id = ? ORDER BY paid_at DESC').bind(affId).all(),
  ]);
  const L = ledger(orders.results, payouts.results, now);
  const thisMonth = monthKey(now);
  const m = L.months.find((x) => x.month === thisMonth) || { month: thisMonth, sales: 0, orders: 0, commission: 0 };
  const tier = tierFor(m.sales);
  const next = PROGRAM.tiers.find((t) => t.min > m.sales) || null;
  // 30-day daily series (Central time days)
  const clicksBy = Object.fromEntries(clickDays.results.map((r) => [r.day, r.n]));
  const ordersBy = {};
  for (const r of L.rows) if (r.created_at >= since30 && r.status !== 'void') { const k = dayKey(r.created_at); ordersBy[k] = (ordersBy[k] || 0) + 1; }
  const series = [];
  for (let i = 29; i >= 0; i--) { const k = dayKey(now - i * DAY); series.push({ day: k, clicks: clicksBy[k] || 0, orders: ordersBy[k] || 0 }); }
  const orders30 = L.rows.filter((r) => r.created_at >= since30 && r.status !== 'void').length;
  return {
    clicks: { all_time: clickAll?.n || 0, unique_all_time: clickAll?.u || 0, last30: click30?.n || 0, unique_last30: click30?.u || 0 },
    orders: { all_time: L.rows.filter((r) => r.status !== 'void').length, last30: orders30 },
    conversion_30: click30?.u ? Math.round((orders30 / click30.u) * 1000) / 10 : 0,
    this_month: { month: thisMonth, sales: m.sales, orders: m.orders, commission: m.commission, tier: tier.name, rate: tier.rate, next_tier: next ? { name: next.name, rate: next.rate, min: next.min, gap: Math.round((next.min - m.sales) * 100) / 100 } : null },
    money: { pending: L.pending, locked: L.locked, paid: L.paid, owed: L.owed, payable_next: L.payable_next, next_payout_date: nextPayoutDate(now) },
    series,
    months: L.months.slice(0, 12),
    recent_orders: L.rows.slice(0, 50).map((r) => ({ ...r, token: undefined, invoice: r.invoice ? '…' + String(r.invoice).slice(-4) : '' })),
    payouts: payouts.results,
  };
}

// ------------------------------------------------------------------ admin (Jackson)
async function adminLogin(env, request) {
  await db(env);
  if (!env.AFF_ADMIN_PASSWORD) return err('Set AFF_ADMIN_PASSWORD in Cloudflare first.', 503);
  if (await tooManyFails(env, 'admin')) return err('Too many tries. Wait 15 minutes.', 429);
  const b = await readJson(request);
  if (!adminPasswordMatches(b.password, env)) { await recordFail(env, 'admin'); return err('Wrong password.', 401); }
  return json({ ok: true }, 200, { 'set-cookie': await createSession(env, request, { isAdmin: true }) });
}

async function admin(env, request, route, method) {
  const d = await db(env);
  const s = await getSession(env, request);
  if (!s || !s.is_admin) return err('Admin login required.', 401);
  const b = method === 'POST' ? await readJson(request) : {};

  if (method === 'GET' && route === 'overview') {
    const affs = (await d.prepare('SELECT * FROM affiliates ORDER BY created_at DESC').all()).results;
    const now = Date.now(), thisMonth = monthKey(now);
    const list = [];
    for (const a of affs) {
      const [orders, payouts, c30] = await Promise.all([
        d.prepare('SELECT * FROM orders WHERE affiliate_id = ?').bind(a.id).all(),
        d.prepare('SELECT amount FROM payouts WHERE affiliate_id = ?').bind(a.id).all(),
        d.prepare('SELECT COUNT(*) AS n FROM clicks WHERE affiliate_id = ? AND ts >= ?').bind(a.id, now - 30 * DAY).first(),
      ]);
      const L = ledger(orders.results, payouts.results, now);
      const m = L.months.find((x) => x.month === thisMonth);
      list.push({ ...publicAffiliate(a), clicks30: c30?.n || 0, month_sales: m?.sales || 0, month_rate: m?.rate || PROGRAM.tiers[0].rate, pending: L.pending, owed: L.owed, paid: L.paid, lifetime_sales: L.rows.reduce((t, r) => t + r.net, 0) });
    }
    const recent = (await d.prepare('SELECT o.*, a.code, a.name FROM orders o JOIN affiliates a ON a.id = o.affiliate_id ORDER BY o.created_at DESC LIMIT 50').all()).results;
    return json({ ok: true, program: PROGRAM, affiliates: list, recent_orders: recent, next_payout_date: nextPayoutDate(now) });
  }
  if (method === 'POST' && route === 'affiliate') {
    const map = { approve: 'approved', reject: 'rejected', pause: 'paused', reactivate: 'approved' };
    const status = map[b.action];
    if (!status) return err('Unknown action');
    await d.prepare('UPDATE affiliates SET status = ?, approved_at = COALESCE(approved_at, CASE WHEN ? = \'approved\' THEN ? END) WHERE id = ?').bind(status, status, Date.now(), Number(b.id)).run();
    return json({ ok: true });
  }
  if (method === 'POST' && route === 'payout') {
    const amount = Math.round(Number(b.amount) * 100) / 100;
    if (!(amount > 0)) return err('Enter the amount you paid.');
    await d.prepare('INSERT INTO payouts (affiliate_id, amount, paid_at, method, note) VALUES (?, ?, ?, ?, ?)').bind(Number(b.id), amount, Date.now(), cleanStr(b.method, 40), cleanStr(b.note, 200)).run();
    return json({ ok: true });
  }
  if (method === 'POST' && route === 'order') {
    // Manual credit, e.g. a phone or bulk order the affiliate sent over.
    const aff = await d.prepare('SELECT id FROM affiliates WHERE code = ?').bind(normCode(b.code || '')).first();
    if (!aff) return err('No affiliate with that code.');
    const amount = Math.round(Number(b.amount) * 100) / 100;
    if (!(amount > 0)) return err('Enter the order subtotal (before shipping and tax).');
    const ts = b.date ? Date.parse(b.date + 'T12:00:00-06:00') : Date.now();
    if (!Number.isFinite(ts)) return err('Bad date');
    const token = 'manual-' + randomHex(8);
    await d.prepare('INSERT INTO orders (token, invoice, affiliate_id, created_at, month, amount, source, note) VALUES (?,?,?,?,?,?,?,?)')
      .bind(token, cleanStr(b.invoice, 60) || token, aff.id, ts, monthKey(ts), amount, 'manual', cleanStr(b.note, 200)).run();
    return json({ ok: true, token });
  }
  if (method === 'POST' && route === 'order-void') {
    await d.prepare("UPDATE orders SET status = 'void' WHERE token = ?").bind(String(b.token || '')).run();
    return json({ ok: true });
  }
  if (method === 'POST' && route === 'reset-password') {
    const pw = randomHex(5);
    const { hash, salt } = await hashPassword(pw);
    await d.prepare('UPDATE affiliates SET pass_hash = ?, pass_salt = ? WHERE id = ?').bind(hash, salt, Number(b.id)).run();
    return json({ ok: true, temp_password: pw });
  }
  return err('Not found', 404);
}
