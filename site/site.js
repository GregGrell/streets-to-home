// Streets to Home public website.
// Reads only the public website functions in the database; it can never see medical records, contacts or enquiries.
const API = 'https://uvlqolygfubmnbwlfwee.supabase.co';
const KEY = 'sb_publishable_3gZDiyipaMRnfqfr0cgv5A_EJd0CsM4';

async function rpc(fn, body = {}) {
  const r = await fetch(`${API}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    let m = 'Something went wrong';
    try { m = (await r.json()).message || m; } catch { /* keep default */ }
    throw new Error(m);
  }
  return r.json();
}

const photo = (path) => (path ? `${API}/storage/v1/object/public/photos/${path.split('/').map(encodeURIComponent).join('/')}` : '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const $ = (sel, el = document) => el.querySelector(sel);

function age(m) {
  if (m == null) return '';
  if (m < 12) return `${Math.max(1, m)} month${m === 1 ? '' : 's'}`;
  const y = Math.floor(m / 12);
  return `${y} year${y === 1 ? '' : 's'}`;
}
const ageBand = (m) => (m == null ? 'unknown' : m < 12 ? 'young' : m < 84 ? 'adult' : 'senior');
const sexLabel = (s) => (s === 'male' ? 'Boy' : s === 'female' ? 'Girl' : '');
const species = (s) => (s === 'cat' ? 'Cat' : 'Dog');

function goods(a) {
  const out = [];
  for (const [k, l] of [['good_with_kids', 'children'], ['good_with_dogs', 'dogs'], ['good_with_cats', 'cats']]) {
    if (a[k] === 'yes') out.push(`<span class="good">Good with ${l}</span>`);
    if (a[k] === 'no') out.push(`<span class="good no">No ${l}</span>`);
  }
  return out.join('');
}

function card(a) {
  const meta = [species(a.species), sexLabel(a.sex), age(a.age_months), a.breed].filter(Boolean).join(' · ');
  const img = a.photo_path ? `<img src="${photo(a.photo_path)}" alt="${esc(a.name)}" loading="lazy">` : `<div class="noimg">${esc(a.name[0] || '?')}</div>`;
  return `<a class="card" href="animal.html?a=${encodeURIComponent(a.slug)}">
    <div class="ph">${img}<span class="tag">${species(a.species)}</span></div>
    <div class="body">
      <h3>${esc(a.name)}</h3>
      <span class="meta">${esc(meta)}</span>
      ${a.public_bio ? `<span class="bio">${esc(a.public_bio)}</span>` : ''}
      <div class="goods">${goods(a)}</div>
      <span class="go">Meet ${esc(a.name)} →</span>
    </div>
  </a>`;
}

// ---------- enquiry forms (contact + adoption) ----------
function wireForm(form, kind, slug) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = $('.out', form);
    const btn = $('button[type=submit]', form);
    const f = new FormData(form);
    if (f.get('website')) return; // bot trap
    btn.disabled = true;
    out.innerHTML = '';
    try {
      await rpc('submit_enquiry', {
        p_kind: kind,
        p_full_name: String(f.get('name') || '').trim(),
        p_email: String(f.get('email') || '').trim(),
        p_phone: String(f.get('phone') || '').trim(),
        p_message: String(f.get('message') || '').trim(),
        p_animal_slug: slug || null,
      });
      form.reset();
      out.innerHTML = `<p class="msg ok">Thank you! We've got your message and will be in touch soon.</p>`;
    } catch (err) {
      out.innerHTML = `<p class="msg err">${esc(/email/i.test(err.message) ? 'Please check your email address.' : err.message)}</p>`;
    } finally {
      btn.disabled = false;
    }
  });
}

// ---------- home page ----------
async function home() {
  const grid = $('#animals');
  const tails = $('#tails');
  const filters = $('#filters');
  let all = [];
  let sp = 'all';
  let band = 'all';
  const draw = () => {
    const list = all.filter((a) => (sp === 'all' || a.species === sp) && (band === 'all' || ageBand(a.age_months) === band));
    grid.innerHTML = list.length
      ? list.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1"><b>${all.length ? 'No one matches those filters' : 'Everyone has found a home, for now'}</b>${all.length ? 'Try another filter.' : 'New rescues arrive all the time. Get in touch and tell us what you are looking for.'}</div>`;
  };
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.sp) { sp = b.dataset.sp; filters.querySelectorAll('[data-sp]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
    if (b.dataset.band) { band = b.dataset.band; filters.querySelectorAll('[data-band]').forEach((x) => x.setAttribute('aria-pressed', x === b)); }
    draw();
  });
  try {
    const [animals, happy] = await Promise.all([rpc('website_animals'), rpc('website_happy_tails')]);
    all = animals;
    draw();
    $('#n-available').textContent = animals.length;
    $('#n-dogs').textContent = animals.filter((a) => a.species === 'dog').length;
    $('#n-cats').textContent = animals.filter((a) => a.species === 'cat').length;
    if (happy.length) {
      $('#happy').hidden = false;
      tails.innerHTML = happy.map((a) => `<div class="tail">${a.photo_path ? `<img src="${photo(a.photo_path)}" alt="${esc(a.name)}" loading="lazy">` : `<div class="noimg">${esc(a.name[0])}</div>`}<b>${esc(a.name)}</b><span>${a.adopted_on ? 'Home since ' + new Date(a.adopted_on).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Home at last'}</span></div>`).join('');
    }
  } catch {
    grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>We couldn\'t load our animals just now</b>Please refresh the page in a moment.</div>';
  }
  wireForm($('#contact-form'), 'general');
}

// ---------- animal page ----------
async function animalPage() {
  const slug = new URLSearchParams(location.search).get('a');
  const root = $('#animal');
  let a;
  try {
    a = (await rpc('website_animals')).find((x) => x.slug === slug);
  } catch { /* handled below */ }
  if (!a) {
    root.innerHTML = '<div class="empty" style="margin:40px 0"><b>This animal isn\'t listed any more</b>They may have found their home. <a href="./#adopt">See who\'s available</a>.</div>';
    return;
  }
  document.title = `${a.name} · Streets to Home`;
  const isVid = (p) => p.kind === 'video';
  const now = a.photos.filter((p) => p.phase !== 'before' || isVid(p));
  const before = a.photos.filter((p) => p.phase === 'before' && !isVid(p));
  const media = [];
  for (const m of [{ path: a.photo_path, kind: 'photo' }, ...now]) if (m.path && !media.some((x) => x.path === m.path)) media.push(m);
  const pics = media.filter((m) => !isVid(m)).map((m) => m.path);
  const big = (m) => (isVid(m)
    ? `<video id="mainimg" src="${photo(m.path)}" controls playsinline preload="metadata"></video>`
    : `<img id="mainimg" src="${photo(m.path)}" alt="${esc(a.name)}">`);
  const facts = [
    ['Species', species(a.species)], ['Sex', sexLabel(a.sex) || 'Unknown'], ['Age', age(a.age_months) || 'Unknown'],
    ['Breed', a.breed || 'Mixed'], ['Neutered', a.neutered == null ? 'Ask us' : a.neutered ? 'Yes' : 'Not yet'],
  ];
  root.innerHTML = `
    <div class="animal">
      <div class="gallery">
        <div class="main" id="mainbox">${media[0] ? big(media[0]) : ''}</div>
        ${media.length > 1 ? `<div class="thumbs">${media.map((m, i) => `<button type="button" aria-pressed="${i === 0}" data-i="${i}" aria-label="${isVid(m) ? 'Video' : 'Photo'} ${i + 1}">${isVid(m) ? `<video src="${photo(m.path)}#t=0.5" muted playsinline preload="metadata"></video><span class="play" aria-hidden="true">▶</span>` : `<img src="${photo(m.path)}" alt="" loading="lazy">`}</button>`).join('')}</div>` : ''}
        ${before.length && pics.length ? `
          <div class="bn">
            <h2><span class="script">From the streets…</span> to home</h2>
            <div class="bn-frame" id="bn">
              <img src="${photo(pics[0])}" alt="${esc(a.name)} now">
              <img class="before" src="${photo(before[0].path)}" alt="${esc(a.name)} on rescue day">
              <div class="handle"></div><span class="lab l">Rescue day</span><span class="lab r">Now</span>
            </div>
            <input type="range" min="0" max="100" value="50" aria-label="Compare rescue day and now" id="bnr">
          </div>` : ''}
      </div>
      <div class="info">
        <h1>${esc(a.name)}</h1>
        <div class="goods" style="margin-top:12px">${goods(a)}</div>
        <div class="facts">${facts.map(([k, v]) => `<div class="fact"><b>${k}</b><span>${esc(v)}</span></div>`).join('')}</div>
        ${a.public_bio ? `<div class="story"><h2>About ${esc(a.name)}</h2><p>${esc(a.public_bio)}</p></div>` : ''}
        ${a.intake_story ? `<div class="story"><h2>${esc(a.name)}'s story</h2><p>${esc(a.intake_story)}</p></div>` : ''}
        <div class="panel apply-cta" style="margin-top:24px">
          <h3>Would you like to adopt ${esc(a.name)}?</h3>
          <p style="margin-bottom:14px">Fill in our ${a.species === 'cat' ? 'cat' : 'dog'} adoption form online. It takes about 15 minutes, and we'll be in touch to talk it through.</p>
          <a class="btn" style="width:100%" href="apply.html?a=${encodeURIComponent(a.slug)}">Apply to adopt ${esc(a.name)}</a>
        </div>
        <div class="panel" style="margin-top:16px" id="enquire">
          <h3>Just have a question?</h3>
          <p class="small" style="margin-bottom:12px">Ask us anything about ${esc(a.name)} and one of the team will get back to you.</p>
          <form class="form" id="adopt-form" novalidate>
            <div class="field"><label for="n">Your name</label><input id="n" name="name" required maxlength="120" autocomplete="name"></div>
            <div class="row2">
              <div class="field"><label for="e">Email</label><input id="e" name="email" type="email" required maxlength="200" autocomplete="email"></div>
              <div class="field"><label for="p">Phone / WhatsApp</label><input id="p" name="phone" type="tel" maxlength="40" autocomplete="tel"></div>
            </div>
            <div class="field"><label for="m">Your question</label><textarea id="m" name="message" maxlength="4000"></textarea></div>
            <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button class="btn ghost" type="submit">Send question</button>
            <div class="out" aria-live="polite"></div>
          </form>
        </div>
      </div>
    </div>`;
  root.querySelectorAll('.thumbs button').forEach((b) => b.addEventListener('click', () => {
    $('#mainbox').innerHTML = big(media[+b.dataset.i]);
    root.querySelectorAll('.thumbs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));
  const bn = $('#bn');
  if (bn) {
    const set = (pct) => { pct = Math.max(0, Math.min(100, pct)); $('.before', bn).style.clipPath = `inset(0 ${100 - pct}% 0 0)`; $('.handle', bn).style.left = pct + '%'; $('#bnr').value = pct; };
    $('#bnr').addEventListener('input', (e) => set(+e.target.value));
    const drag = (e) => { const r = bn.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    bn.addEventListener('pointerdown', (e) => { bn.setPointerCapture(e.pointerId); drag(e); bn.onpointermove = drag; });
    bn.addEventListener('pointerup', () => { bn.onpointermove = null; });
  }
  wireForm($('#adopt-form'), 'adoption', a.slug);
}

document.addEventListener('DOMContentLoaded', () => {
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();
  if (document.body.dataset.page === 'home') home();
  if (document.body.dataset.page === 'animal') animalPage();
});
