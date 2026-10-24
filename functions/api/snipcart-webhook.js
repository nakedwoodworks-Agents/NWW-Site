// Snipcart webhook: credits an order to the affiliate whose code rode along in the cart's metadata.
// Snipcart dashboard -> Account -> Webhooks -> URL = https://<your domain>/api/snipcart-webhook
// Every call is checked with Snipcart's request-validation endpoint using SNIPCART_SECRET_KEY.
import { db, json, err, monthKey, normCode, sha256 } from '../../server/aff.js';

async function validSnipcartRequest(request, env) {
  if (env.AFF_DEV_SKIP_VALIDATION === 'true') return true; // local testing only; never set in production
  const token = request.headers.get('x-snipcart-requesttoken');
  if (!token || !env.SNIPCART_SECRET_KEY) return false;
  const r = await fetch(`https://app.snipcart.com/api/requestvalidation/${encodeURIComponent(token)}`, {
    headers: { Accept: 'application/json', Authorization: 'Basic ' + btoa(env.SNIPCART_SECRET_KEY + ':') },
  });
  return r.ok;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!(await validSnipcartRequest(request, env))) return err('Invalid Snipcart request', 401);
    const d = await db(env);
    const body = await request.json();
    const ev = body.eventName;
    const c = body.content || {};

    if (ev === 'order.completed') {
      const code = normCode(c.metadata?.affiliate || '');
      if (!code) return json({ ok: true, credited: false, reason: 'no affiliate on order' });
      const aff = await d.prepare("SELECT id, email FROM affiliates WHERE code = ? AND status = 'approved'").bind(code).first();
      if (!aff) return json({ ok: true, credited: false, reason: 'affiliate not active' });
      const buyer = String(c.email || c.user?.email || '').toLowerCase();
      if (buyer && buyer === aff.email) return json({ ok: true, credited: false, reason: 'self-referral' });
      // Commission base = items after discounts, before shipping and tax (Snipcart "subtotal").
      const amount = Number(c.subtotal ?? c.itemsTotal ?? 0);
      if (!(amount > 0)) return json({ ok: true, credited: false, reason: 'zero amount' });
      const ts = Date.parse(c.completionDate || c.creationDate || '') || Date.now();
      const token = String(c.token || (await sha256(JSON.stringify(c))).slice(0, 32));
      await d.prepare('INSERT OR IGNORE INTO orders (token, invoice, affiliate_id, created_at, month, amount, source) VALUES (?,?,?,?,?,?,?)')
        .bind(token, String(c.invoiceNumber || ''), aff.id, ts, monthKey(ts), Math.round(amount * 100) / 100, 'snipcart').run();
      return json({ ok: true, credited: true });
    }
    if (ev === 'order.refund.created') {
      const token = String(c.orderToken || c.order?.token || '');
      const amt = Number(c.amount || 0);
      if (token && amt > 0) await d.prepare('UPDATE orders SET refunded = MIN(amount, refunded + ?) WHERE token = ?').bind(amt, token).run();
      return json({ ok: true });
    }
    if (ev === 'order.status.changed') {
      const token = String(c.token || '');
      if (token && body.to === 'Cancelled') await d.prepare("UPDATE orders SET status = 'void' WHERE token = ?").bind(token).run();
      return json({ ok: true });
    }
    return json({ ok: true, ignored: ev });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return err('webhook error', 500);
  }
}
