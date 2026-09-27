// Gift-finder quiz. Vanilla TS, no framework. Works with every GHL setting still a placeholder:
// the lead step is skipped until a GHL form ID (or webhook URL) is configured.
type QP = { s: string; n: string; p: number; max: number; i: string; o: string[]; r: string[]; t: string };
declare global { interface Window { fbq?: (...a: any[]) => void } }

let dataPromise: Promise<QP[]> | null = null;
const loadData = () => (dataPromise ??= fetch('/quiz-data.json').then((r) => r.json()));

const PATH_TAGS: Record<string, { occ: string[]; rec?: string[]; hub: string; label: string }> = {
  anniversary: { occ: ['anniversary'], hub: '/occasion/anniversary-gifts/', label: 'anniversary gifts' },
  wedding: { occ: ['wedding', 'engagement', 'bridal-shower'], hub: '/occasion/wedding-gifts/', label: 'wedding gifts' },
  housewarming: { occ: ['housewarming'], hub: '/occasion/housewarming-gifts/', label: 'housewarming gifts' },
  realtor: { occ: ['realtor-closing-gift'], hub: '/occasion/realtor-closing-gifts/', label: 'realtor closing gifts' },
  corporate: { occ: ['corporate-gifts', 'employee-appreciation'], hub: '/occasion/corporate-gifts/', label: 'corporate gifts' },
  family: { occ: ['family', 'mothers-day', 'fathers-day'], rec: ['grandparents'], hub: '/occasion/family-keepsakes/', label: 'family gifts' },
  christmas: { occ: ['christmas'], hub: '/occasion/christmas-gifts/', label: 'Christmas gifts' },
};
const BRANCH: Record<string, string> = { anniversary: 'anniversary', wedding: 'wedding', realtor: 'realtor', corporate: 'corporate', housewarming: 'budget', family: 'budget', christmas: 'budget' };

const ordinal = (n: number) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const pad = (n: number | string) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function upcomingAnniversaryNumber(y: number, m: number, d: number): number {
  const now = new Date();
  let yr = now.getFullYear();
  const thisYear = new Date(yr, m - 1, d);
  if (thisYear < new Date(now.getFullYear(), now.getMonth(), now.getDate())) yr += 1;
  return yr - y;
}

export function initQuiz(root: HTMLElement) {
  if (root.dataset.ready) return;
  root.dataset.ready = '1';
  const st: Record<string, string> = {};
  const steps = [...root.querySelectorAll<HTMLElement>('.q-step')];
  const bars = [...root.querySelectorAll<HTMLElement>('.q-progress i')];
  const history: HTMLElement[] = [];
  let current = steps[0];

  function show(el: HTMLElement, push = true) {
    if (push && current && current !== el) history.push(current);
    steps.forEach((s) => (s.hidden = s !== el));
    current = el;
    const n = Number(el.dataset.step);
    bars.forEach((b, i) => b.classList.toggle('on', i < n));
    const h = el.querySelector<HTMLElement>('[tabindex="-1"]');
    if (root.dataset.started) h?.focus({ preventScroll: false });
    root.dataset.started = '1';
  }
  const step = (n: number, branch?: string) => steps.find((s) => s.dataset.step === String(n) && (!branch || s.dataset.branch === branch))!;

  // step 1
  root.querySelectorAll<HTMLButtonElement>('[data-path]').forEach((b) => b.addEventListener('click', () => {
    Object.keys(st).forEach((k) => delete st[k]);
    st.quiz_path = b.dataset.path!;
    st.landing_page = location.pathname;
    loadData();
    show(step(2, BRANCH[st.quiz_path]));
  }));

  // anniversary note
  const annStep = step(2, 'anniversary');
  const note = annStep.querySelector<HTMLElement>('[data-note]')!;
  const val = (sel: string) => (annStep.querySelector<HTMLInputElement>(`[data-k="${sel}"]`)?.value || '').trim();
  const updateNote = () => {
    const y = parseInt(val('year'), 10), m = parseInt(val('month'), 10), d = parseInt(val('day'), 10);
    if (y > 1900 && y <= new Date().getFullYear() && m && d) {
      const n = upcomingAnniversaryNumber(y, m, d);
      if (n > 0) {
        note.innerHTML = n === 5
          ? `That's your <strong>5th</strong> anniversary: the wood anniversary, which is literally what we make.`
          : `That's your <strong>${ordinal(n)}</strong> anniversary.`;
        return;
      }
    }
    note.textContent = '';
  };
  annStep.querySelectorAll('select,input').forEach((e) => { e.addEventListener('input', updateNote); e.addEventListener('change', updateNote); });

  // step 2 continue buttons
  root.querySelectorAll<HTMLButtonElement>('[data-step="2"] [data-next]').forEach((b) => b.addEventListener('click', () => {
    const sec = b.closest<HTMLElement>('.q-step')!;
    sec.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach((f) => { if (f.value) st[f.dataset.k!] = f.value.trim(); });
    if (st.quiz_path === 'anniversary') {
      const m = parseInt(st.month || '', 10), d = parseInt(st.day || '', 10), y = parseInt(st.year || '', 10);
      if (m && d) {
        const yearKnown = y > 1900 && y <= new Date().getFullYear();
        st.anniversary_date = `${yearKnown ? y : 1900}-${pad(m)}-${pad(d)}`;
        if (!yearKnown) st.anniversary_year_unknown = 'true';
        if (yearKnown && upcomingAnniversaryNumber(y, m, d) === 5) st.fifth = '1';
      }
      delete st.month; delete st.day; delete st.year;
    }
    if (st.quiz_path === 'wedding' && st.own_anniversary) { st.anniversary_date = st.own_anniversary; delete st.own_anniversary; }
    toLead();
  }));
  // budget
  root.querySelectorAll<HTMLButtonElement>('[data-budget]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.budget) st.budget = b.dataset.budget; else delete st.budget;
    toLead();
  }));

  // step 3 (lead)
  const leadStep = step(3);
  const ownForm = leadStep.querySelector<HTMLFormElement>('[data-own-form]')!;
  const ghlBox = leadStep.querySelector<HTMLElement>('[data-ghl-box]')!;
  function toLead() {
    if (!root.dataset.lead) { showResults(); return; }
    if (root.dataset.mode === 'ghl_form' && root.dataset.formId) {
      ownForm.hidden = true; ghlBox.hidden = false;
      ghlBox.querySelector('iframe')?.remove();
      const q = new URLSearchParams();
      ['quiz_path', 'anniversary_date', 'event_date', 'brokerage', 'closings_per_month', 'gift_quantity', 'budget', 'landing_page'].forEach((k) => { if (st[k]) q.set(k, st[k]); });
      const fid = root.dataset.formId!;
      const fr = document.createElement('iframe');
      fr.src = `https://api.leadconnectorhq.com/widget/form/${encodeURIComponent(fid)}?${q.toString()}`;
      fr.className = 'ghl-frame'; fr.title = 'Where should we send your picks?';
      fr.id = `inline-${fid}`; fr.setAttribute('data-form-id', fid); fr.setAttribute('data-layout', "{'id':'INLINE'}");
      fr.setAttribute('data-layout-iframe-id', `inline-${fid}`); fr.setAttribute('data-form-name', 'NWW Gift Quiz'); fr.setAttribute('data-height', '520');
      ghlBox.prepend(fr);
      if (!document.querySelector('script[src*="form_embed.js"]')) {
        const s = document.createElement('script'); s.src = 'https://link.msgsndr.com/js/form_embed.js'; s.async = true; document.body.appendChild(s);
      }
    } else {
      ownForm.hidden = false; ghlBox.hidden = true;
    }
    show(leadStep);
  }
  let leadFired = false;
  const fireLead = () => { if (!leadFired) { leadFired = true; try { window.fbq?.('track', 'Lead'); } catch { /* */ } } };
  window.addEventListener('message', (e) => {
    try {
      if (current !== leadStep || !/leadconnector|msgsndr/i.test(e.origin || '')) return;
      const s = typeof e.data === 'string' ? e.data : JSON.stringify(e.data || '');
      if (/submit|success|thank|complete/i.test(s)) { fireLead(); setTimeout(showResults, 900); }
    } catch { /* */ }
  });
  ownForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    ownForm.querySelectorAll<HTMLInputElement>('input[required]').forEach((i) => {
      const bad = !i.value.trim() || (i.type === 'email' && !/^\S+@\S+\.\S+$/.test(i.value));
      i.closest('.fld')?.classList.toggle('invalid', bad);
      if (bad && ok) { i.focus(); ok = false; }
    });
    if (!ok) return;
    const fd = new FormData(ownForm);
    const payload: Record<string, any> = { ...st, first_name: fd.get('first_name'), email: fd.get('email'), phone: fd.get('phone') || '', sms_consent: !!fd.get('sms_consent'), source: 'nww-site-quiz' };
    delete payload.fifth;
    const hook = root.dataset.hook;
    if (hook) { try { fetch(hook, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) }); } catch { /* */ } }
    fireLead();
    showResults();
  });
  leadStep.querySelector('[data-skip]')?.addEventListener('click', showResults);

  // step 4 (results)
  const resStep = step(4);
  const box = resStep.querySelector<HTMLElement>('[data-results]')!;
  async function showResults() {
    const cfg = PATH_TAGS[st.quiz_path] || PATH_TAGS.anniversary;
    const hub = st.quiz_path === 'anniversary' && st.fifth ? '/occasion/5th-anniversary-wood-gifts/' : cfg.hub;
    const hubA = resStep.querySelector<HTMLAnchorElement>('[data-hub]')!;
    hubA.href = hub; hubA.textContent = `See all ${cfg.label}`;
    box.innerHTML = '<p class="muted">Loading your picks...</p>';
    show(resStep);
    let all: QP[] = [];
    try { all = await loadData(); } catch { box.innerHTML = `<p>We could not load picks just now. <a href="${hub}">Browse ${esc(cfg.label)}</a>.</p>`; return; }
    let list = all.filter((p) => p.o.some((t) => cfg.occ.includes(t)) || (cfg.rec || []).some((t) => p.r.includes(t)));
    const b = st.budget;
    if (b) {
      const inB = (p: QP) => (b === '25-50' ? p.p <= 50 : b === '50-100' ? p.p <= 100 && p.max >= 50 : p.max >= 100);
      const f = list.filter(inB);
      if (f.length >= 3) list = f;
    }
    // already sorted by Etsy sales (real proof of what sells); keep variety: at most 3 per product type
    const perType: Record<string, number> = {};
    const picks: QP[] = [];
    for (const p of list) { if ((perType[p.t] = (perType[p.t] || 0) + 1) <= 3) picks.push(p); if (picks.length === 6) break; }
    const noteEl = resStep.querySelector<HTMLElement>('[data-results-note]')!;
    noteEl.textContent = st.budget ? `Best sellers for ${cfg.label}, in your budget.` : `Our best sellers for ${cfg.label}.`;
    let html = '';
    if (st.quiz_path === 'realtor') {
      html += `<a class="fcg" href="${root.dataset.fcg}" rel="noopener"><span class="eyebrow">For agents</span><strong style="font-family:var(--serif);font-size:1.15rem;display:block">Forever Client Gifts, our realtor closing-gift site</strong><span class="muted">Closing boards with your logo in the corner, set up for agents who close every month.</span></a>`;
    }
    html += '<ul class="grid">' + picks.map((p) => `<li><a class="card" href="/p/${p.s}/"><div class="ph"><picture><source type="image/webp" srcset="/img/p/${p.i}-400.webp 400w, /img/p/${p.i}-800.webp 800w" sizes="(min-width:700px) 25vw, 46vw"><img src="/img/p/${p.i}-400.jpg" alt="${esc(p.n)}" width="800" height="600" loading="lazy"></picture></div><span class="nm">${esc(p.n)}</span><span class="pr">from $${p.p.toFixed(2)}</span><span class="proof" style="text-decoration:underline">Personalize it</span></a></li>`).join('') + '</ul>';
    box.innerHTML = html;
  }
  resStep.querySelector('[data-restart]')?.addEventListener('click', () => { history.length = 0; show(steps[0], false); });
  root.querySelectorAll<HTMLButtonElement>('[data-back]').forEach((b) => b.addEventListener('click', () => { const prev = history.pop(); if (prev) show(prev, false); }));
}

export function initAllQuizzes() { document.querySelectorAll<HTMLElement>('[data-quiz]').forEach(initQuiz); }
