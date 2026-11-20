// Online adoption application (apply.html?f=cat|dog&a=<animal slug>).
// Questions come from forms.js. Uses API, KEY, rpc, photo, esc and $ from site.js.
const SUBMIT_URL = `${API}/functions/v1/adoption-application`;

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const flat = (form) => form.sections.flatMap((s) => s.items.flatMap((it) => (it.t === 'pair' ? [it.a, it.b] : [it])));
const isQ = (it) => !['sub', 'sign'].includes(it.t);

function fieldHtml(it) {
  const id = `q_${it.k}`;
  const req = it.req ? ' <span class="req" aria-hidden="true">*</span>' : '';
  const hint = it.hint ? `<span class="hint" id="${id}_h">${esc(it.hint)}</span>` : '';
  const desc = it.hint ? ` aria-describedby="${id}_h"` : '';
  if (it.t === 'sub') return `<h3 class="q-sub">${esc(it.q)}</h3>`;
  if (it.t === 'sign') return '';
  if (it.t === 'consent') {
    return `<label class="consent" data-k="${it.k}"><input type="checkbox" name="${it.k}" value="Yes"${it.req ? ' required' : ''}><span>${esc(it.q)}</span></label>`;
  }
  if (it.t === 'radio' || it.t === 'check') {
    const type = it.t === 'radio' ? 'radio' : 'checkbox';
    const opts = it.o.map((o) => `<label class="opt"><input type="${type}" name="${it.k}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('');
    const det = it.d
      ? `<div class="field det"><label for="${id}_d">Details${it.d > 1 ? '' : ' (if needed)'}</label>${it.d > 1 ? `<textarea id="${id}_d" name="${it.k}_details" maxlength="2000" rows="3"></textarea>` : `<input id="${id}_d" name="${it.k}_details" maxlength="500">`}</div>`
      : '';
    return `<fieldset class="q" data-k="${it.k}"${it.req ? ' data-req="1"' : ''}><legend>${esc(it.q)}${req}</legend>${it.t === 'check' ? '<span class="hint">Tick all that apply</span>' : ''}<div class="opts">${opts}</div>${det}</fieldset>`;
  }
  const ac = it.ac ? ` autocomplete="${it.ac}"` : '';
  const input = it.t === 'long'
    ? `<textarea id="${id}" name="${it.k}" maxlength="3000" rows="${Math.max(3, it.n + 1)}"${it.req ? ' required' : ''}${desc}${ac}></textarea>`
    : `<input id="${id}" name="${it.k}" type="${it.t === 'text' ? 'text' : it.t}" maxlength="${it.t === 'email' ? 200 : 300}"${it.req ? ' required' : ''}${desc}${ac}>`;
  return `<div class="field q" data-k="${it.k}"${it.req ? ' data-req="1"' : ''}><label for="${id}">${esc(it.q.replace(/:$/, ''))}${req}</label>${hint}${input}</div>`;
}

function itemHtml(it) {
  if (it.t === 'pair') return `<div class="row2">${fieldHtml(it.a)}${fieldHtml(it.b)}</div>`;
  return fieldHtml(it);
}

function chooser(root) {
  root.innerHTML = `
    <div class="apply-head">
      <h1>Adoption <span class="script">application</span></h1>
      <p>Which kind of animal would you like to adopt? The form takes about 15 minutes and saves as you go.</p>
    </div>
    <div class="choose">
      <a class="choice" href="apply.html?f=cat"><span class="em" aria-hidden="true">🐈</span><b>Adopt a cat</b><span>Cat adoption application</span></a>
      <a class="choice" href="apply.html?f=dog"><span class="em" aria-hidden="true">🐕</span><b>Adopt a dog</b><span>Dog adoption application</span></a>
    </div>
    <p class="small" style="margin:18px 0 64px">Prefer paper? Download the <a href="forms/streets-to-home-cat-adoption-form.docx">cat form</a> or the <a href="forms/streets-to-home-dog-adoption-form.docx">dog form</a> (Word).</p>`;
}

async function applyPage() {
  const root = $('#apply');
  const qs = new URLSearchParams(location.search);
  const slug = qs.get('a');
  let f = qs.get('f');
  let animal = null;
  if (slug) {
    try { animal = (await rpc('website_animals')).find((x) => x.slug === slug) || null; } catch { /* still let them apply */ }
    if (animal && !['cat', 'dog'].includes(f)) f = animal.species === 'cat' ? 'cat' : 'dog';
  }
  const form = window.STH_FORMS[f];
  if (!form) return chooser(root);

  document.title = `${form.title} · Streets to Home`;
  const items = flat(form).filter(isQ);
  const draftKey = `sth-apply-${form.id}${animal ? '-' + animal.slug : ''}`;

  root.innerHTML = `
    <div class="apply-head">
      <h1>${form.pet === 'cat' ? 'Cat' : 'Dog'} adoption <span class="script">application</span></h1>
      ${animal ? `<div class="for-animal">${animal.photo_path ? `<img src="${photo(animal.photo_path)}" alt="">` : ''}<div><b>Applying for ${esc(animal.name)}</b><a href="animal.html?a=${encodeURIComponent(animal.slug)}">See ${esc(animal.name)}'s page</a></div></div>` : ''}
      <div class="intro">${form.intro.map((p) => `<p>${esc(p)}</p>`).join('')}<p class="small">Questions marked <span class="req">*</span> are required. Your answers save on this device as you go, so you can come back to finish. Applying doesn't guarantee adoption; we may call you to talk it through or arrange a home visit.</p></div>
      <p class="small">Applying for a ${form.pet === 'cat' ? 'dog' : 'cat'} instead? <a href="apply.html?f=${form.pet === 'cat' ? 'dog' : 'cat'}">Switch form</a> · Prefer paper? <a href="forms/streets-to-home-${form.id}-adoption-form.docx">Download the Word form</a></p>
    </div>
    <div class="progress" aria-hidden="true"><div class="bar"><i></i></div><span></span></div>
    <form id="app-form" class="app-form" novalidate>
      ${form.sections.map((s, i) => `<section class="panel q-sec"><h2><span class="num">${i + 1}</span>${esc(s.title)}</h2>${s.items.map(itemHtml).join('')}</section>`).join('')}
      <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div class="submit-row">
        <div class="out" aria-live="polite"></div>
        <button class="btn big" type="submit">Send my application</button>
        <p class="small">Your answers go only to the Streets to Home team. We'll email you a copy.</p>
      </div>
    </form>`;

  const el = $('#app-form');
  if (animal) { const n = el.elements.namedItem('animal_name'); if (n) n.value = animal.name; }

  // restore draft
  const draft = store.get(draftKey);
  if (draft) {
    for (const [k, v] of Object.entries(draft)) {
      const nodes = el.querySelectorAll(`[name="${CSS.escape(k)}"]`);
      nodes.forEach((n) => {
        if (n.type === 'radio' || n.type === 'checkbox') n.checked = Array.isArray(v) ? v.includes(n.value) : v === n.value;
        else n.value = v;
      });
    }
  }

  const values = () => {
    const out = {};
    const fd = new FormData(el);
    for (const [k, v] of fd.entries()) {
      if (k === 'website') continue;
      const s = String(v).trim();
      if (!s) continue;
      const isCheck = el.querySelector(`input[type=checkbox][name="${CSS.escape(k)}"]`) && k !== 'declaration';
      if (isCheck) (out[k] = out[k] || []).push(s);
      else out[k] = s;
    }
    return out;
  };

  const required = items.filter((it) => it.req);
  const progress = () => {
    const v = values();
    const done = required.filter((it) => v[it.k]).length;
    $('.progress i').style.width = `${Math.round((done / required.length) * 100)}%`;
    $('.progress span').textContent = done === required.length ? 'All required questions answered' : `${done} of ${required.length} required answered`;
  };
  let t;
  el.addEventListener('input', () => {
    progress();
    clearTimeout(t);
    t = setTimeout(() => store.set(draftKey, values()), 400);
    el.querySelectorAll('[aria-invalid=true]').forEach((n) => { if (values()[n.dataset.k]) { n.removeAttribute('aria-invalid'); } });
  });
  progress();

  el.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('.out', el);
    const btn = $('button[type=submit]', el);
    if (el.elements.namedItem('website').value) return; // bot trap
    const v = values();
    el.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
    const missing = required.filter((it) => !v[it.k]);
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) missing.unshift({ k: 'email', q: 'A valid email address' });
    if (missing.length) {
      missing.forEach((it) => el.querySelector(`[data-k="${it.k}"]`)?.setAttribute('aria-invalid', 'true'));
      out.innerHTML = `<p class="msg err">Please answer ${missing.length === 1 ? 'the highlighted question' : `the ${missing.length} highlighted questions`} before sending.</p>`;
      el.querySelector('[aria-invalid=true]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // A readable copy of every answer, in form order, for emails and the staff app
    const list = [];
    form.sections.forEach((s, i) => {
      for (const it of s.items.flatMap((x) => (x.t === 'pair' ? [x.a, x.b] : [x])).filter(isQ)) {
        let a = v[it.k];
        if (Array.isArray(a)) a = a.join(', ');
        const det = v[`${it.k}_details`];
        if (det) a = a ? `${a} — ${det}` : det;
        if (it.t === 'consent') a = a ? 'Agreed' : '';
        if (a) list.push({ s: `${i + 1}. ${s.title}`, q: it.q.replace(/:$/, ''), a });
      }
    });
    btn.disabled = true;
    btn.textContent = 'Sending…';
    out.innerHTML = '';
    try {
      const r = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: KEY },
        body: JSON.stringify({ form: form.id, animal_slug: animal?.slug ?? null, answers: v, items: list }),
      });
      const res = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(res.error || 'Something went wrong. Please try again.');
      store.del(draftKey);
      const first = (v.full_name || '').split(' ')[0];
      root.innerHTML = `
        <div class="panel thanks">
          <img src="logo.png" alt="" width="96" height="96">
          <h1>Thank you${first ? `, ${esc(first)}` : ''}!</h1>
          <p>We've received your ${form.pet} adoption application${animal ? ` for <b>${esc(animal.name)}</b>` : ''}. ${res.emailed ? `We've sent a copy to <b>${esc(v.email)}</b>.` : ''}</p>
          <h2>What happens next</h2>
          <ol>
            <li>One of our team reads your application, usually within a few days.</li>
            <li>We'll contact you by ${esc((v.contact_by || 'WhatsApp or email').toLowerCase())} to talk it through.</li>
            <li>If it looks like a good match, we'll arrange for you to meet ${animal ? esc(animal.name) : `the ${form.pet}`} and do a home visit.</li>
          </ol>
          <a class="btn ghost" href="./#adopt">Back to our animals</a>
        </div>`;
      window.scrollTo({ top: 0 });
    } catch (err) {
      out.innerHTML = `<p class="msg err">${esc(err.message)}</p>`;
      btn.disabled = false;
      btn.textContent = 'Send my application';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'apply') applyPage();
});
