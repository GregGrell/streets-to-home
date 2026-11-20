// Builds branded Instagram post slides (1080×1350, Instagram's 4:5 portrait size) and a caption
// for an animal that is on the website. Everything is drawn in the browser; nothing is uploaded.
import { ageYears } from './animals';
import type { Row } from './store';

export const W = 1080;
export const H = 1350;
const C = {
  cream: '#FBF7F2', sand: '#F3E9DD', espresso: '#3B2918', ink: '#2B1E13', muted: '#6B5B4D',
  caramel: '#CEA37E', rose: '#D28D7E', clay: '#A65A4C', sage: '#5F7050', sageTint: '#E9EEE3',
};
const SANS = "'Figtree', system-ui, sans-serif";
const SCRIPT = "'Dancing Script', cursive";
export const SITE = 'streetstohome.com';

export function ageWords(a: Row) {
  const y = ageYears(a.dob);
  if (y == null) return '';
  if (y < 1) { const m = Math.max(1, Math.floor(y * 12)); return `${m} month${m === 1 ? '' : 's'}`; }
  const yy = Math.floor(y);
  return `${a.dob_estimated ? 'About ' : ''}${yy} year${yy === 1 ? '' : 's'}`;
}

export function facts(a: Row) {
  const sex = a.sex === 'male' ? 'Boy' : a.sex === 'female' ? 'Girl' : '';
  return [a.species === 'cat' ? 'Cat' : 'Dog', sex, ageWords(a), a.breed, a.neutered ? (a.sex === 'female' ? 'Spayed' : 'Neutered') : '']
    .filter(Boolean).join(' · ');
}

export function goodWith(a: Row) {
  return ([['good_with_kids', 'children'], ['good_with_dogs', 'dogs'], ['good_with_cats', 'cats']] as const)
    .filter(([k]) => a[k] === 'yes').map(([, l]) => l);
}

export function caption(a: Row) {
  const pet = a.species === 'cat' ? 'cat' : 'dog';
  const good = goodWith(a);
  const tags = pet === 'cat'
    ? '#StreetsToHome #AdoptDontShop #RescueCat #AdoptACat #CatsOfQatar #CatsOfInstagram #QatarPets #DohaPets #Doha #Qatar'
    : '#StreetsToHome #AdoptDontShop #RescueDog #AdoptADog #DogsOfQatar #DogsOfInstagram #QatarPets #DohaPets #Doha #Qatar';
  return [
    `Meet ${a.name} 🐾`,
    '',
    (a.public_bio || '').trim(),
    a.intake_story?.trim() ? `\n${a.intake_story.trim()}` : '',
    '',
    facts(a),
    good.length ? `💛 Good with ${good.join(', ').replace(/, ([^,]*)$/, ' and $1')}` : '',
    '',
    `${a.name} is looking for a forever home. If you'd like to find out more, fill in our ${pet} adoption interest form at ${SITE} (link in bio) and we'll be in touch 🏡`,
    '',
    tags,
  ].filter((l, i, all) => !(l === '' && all[i - 1] === '')).join('\n').trim();
}

// ---------- drawing ----------
async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load(`800 100px ${SANS}`), document.fonts.load(`600 40px ${SANS}`),
      document.fonts.load(`400 40px ${SANS}`), document.fonts.load(`700 60px ${SCRIPT}`),
    ]);
  } catch { /* fall back to system fonts */ }
}

export async function loadImage(url: string): Promise<ImageBitmap | HTMLImageElement> {
  const blob = await fetch(url).then((r) => { if (!r.ok) throw new Error('photo'); return r.blob(); });
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(blob, { imageOrientation: 'from-image' } as ImageBitmapOptions); } catch { /* fall through */ }
  }
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });
}

type Img = ImageBitmap | HTMLImageElement;
const dims = (i: Img) => ('naturalWidth' in i ? [i.naturalWidth, i.naturalHeight] : [i.width, i.height]);

function cover(ctx: CanvasRenderingContext2D, img: Img, x: number, y: number, w: number, h: number, focusY = 0.4) {
  const [iw, ih] = dims(img);
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  const sx = (iw - sw) / 2;
  const sy = Math.min(Math.max((ih - sh) * focusY, 0), ih - sh);
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function badge(ctx: CanvasRenderingContext2D, logo: Img | null, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.shadowColor = 'rgba(59,41,24,.25)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  if (logo) { ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(logo, cx - r + 4, cy - r + 4, (r - 4) * 2, (r - 4) * 2); ctx.restore(); }
}

function pill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, bg: string, fg: string, size = 30) {
  ctx.font = `800 ${size}px ${SANS}`;
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.9;
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill();
  ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.fillText(text, x + size * 0.7, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return w;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${word}` : word;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = word; } else line = t;
    }
    if (line) lines.push(line);
    lines.push('');
  }
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, start: number, maxW: number) {
  let s = start;
  do { ctx.font = `${weight} ${s}px ${family}`; s -= 4; } while (ctx.measureText(text).width > maxW && s > 40);
}

const canvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };

/** Slide 1: main photo with name and key facts. */
function coverSlide(a: Row, photo: Img, logo: Img | null) {
  const c = canvas(); const ctx = c.getContext('2d')!;
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  const ph = 960;
  cover(ctx, photo, 0, 0, W, ph);
  pill(ctx, a.species === 'cat' ? 'CAT FOR ADOPTION' : 'DOG FOR ADOPTION', 48, 48, 'rgba(255,255,255,.94)', C.espresso, 28);
  ctx.fillStyle = C.caramel; ctx.fillRect(0, ph, W, 8);
  ctx.fillStyle = C.clay; ctx.font = `700 54px ${SCRIPT}`;
  ctx.fillText('looking for their forever home', 64, ph + 92);
  ctx.fillStyle = C.espresso; fitText(ctx, a.name, 800, SANS, 124, W - 64 - 230);
  ctx.fillText(a.name, 60, ph + 214);
  ctx.fillStyle = C.muted; ctx.font = `600 34px ${SANS}`;
  const f = facts(a); let fl = f;
  while (ctx.measureText(fl).width > W - 64 - 230 && fl.includes(' · ')) fl = fl.slice(0, fl.lastIndexOf(' · '));
  ctx.fillText(fl, 64, ph + 274);
  ctx.fillStyle = C.clay; ctx.font = `700 30px ${SANS}`;
  ctx.fillText(`Apply at ${SITE}`, 64, ph + 336);
  badge(ctx, logo, W - 150, ph + 200, 104);
  return c;
}

/** Slide 2: the bio. */
function aboutSlide(a: Row, logo: Img | null) {
  const c = canvas(); const ctx = c.getContext('2d')!;
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.sand; rr(ctx, 48, 48, W - 96, H - 96, 48); ctx.fill();
  ctx.fillStyle = C.clay; ctx.font = `700 76px ${SCRIPT}`; ctx.fillText('Meet', 110, 200);
  ctx.fillStyle = C.espresso; fitText(ctx, a.name, 800, SANS, 118, W - 220); ctx.fillText(a.name, 104, 318);
  ctx.fillStyle = C.caramel; ctx.fillRect(110, 356, 140, 8);

  let y = 440;
  const good = goodWith(a);
  if (good.length) {
    let x = 110;
    for (const g of good) x += pill(ctx, `Good with ${g}`, x, y - 44, C.sageTint, C.sage, 26) + 12;
    y += 50;
  }
  const bio = (a.public_bio || '').trim();
  let size = 42;
  let lines: string[] = [];
  const maxLines = () => Math.floor((H - 300 - y) / (size * 1.45));
  for (; size >= 30; size -= 2) {
    ctx.font = `400 ${size}px ${SANS}`;
    lines = wrap(ctx, bio, W - 220);
    if (lines.length <= maxLines()) break;
  }
  if (lines.length > maxLines()) { lines = lines.slice(0, maxLines()); lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*\S*$/, '…'); }
  ctx.fillStyle = C.ink;
  for (const l of lines) { ctx.fillText(l, 110, y); y += size * 1.45; }

  ctx.fillStyle = C.espresso; rr(ctx, 110, H - 230, W - 220 - 170, 104, 52); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = `800 34px ${SANS}`; ctx.textBaseline = 'middle';
  ctx.fillText(`Apply at ${SITE}`, 150, H - 178); ctx.textBaseline = 'alphabetic';
  badge(ctx, logo, W - 190, H - 178, 78);
  return c;
}

/** Rescue day vs now. */
function beforeAfterSlide(a: Row, before: Img, now: Img, logo: Img | null) {
  const c = canvas(); const ctx = c.getContext('2d')!;
  ctx.fillStyle = C.cream; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.clay; ctx.font = `700 72px ${SCRIPT}`; ctx.textAlign = 'center';
  ctx.fillText('From the streets…', W / 2, 120);
  const h = 520, gap = 24, top = 170;
  cover(ctx, before, 48, top, W - 96, h); cover(ctx, now, 48, top + h + gap, W - 96, h);
  ctx.textAlign = 'left';
  pill(ctx, 'RESCUE DAY', 72, top + 24, 'rgba(255,255,255,.94)', C.espresso, 26);
  pill(ctx, `${a.name.toUpperCase()} NOW`, 72, top + h + gap + 24, 'rgba(255,255,255,.94)', C.espresso, 26);
  ctx.fillStyle = C.espresso; ctx.font = `800 40px ${SANS}`; ctx.textAlign = 'center';
  ctx.fillText('…to a home of their own', W / 2, H - 60); ctx.textAlign = 'left';
  badge(ctx, logo, W - 120, top + h + gap + h - 72, 60);
  return c;
}

/** Extra photos with a small logo badge. */
function photoSlide(photo: Img, logo: Img | null) {
  const c = canvas(); const ctx = c.getContext('2d')!;
  cover(ctx, photo, 0, 0, W, H, 0.45);
  badge(ctx, logo, W - 110, H - 110, 70);
  return c;
}

export type Slide = { name: string; canvas: HTMLCanvasElement };

export async function buildSlides(a: Row, urls: { main: string; extra: string[]; before?: string | null; logo: string }): Promise<Slide[]> {
  await ensureFonts();
  const [main, logo] = await Promise.all([loadImage(urls.main), loadImage(urls.logo).catch(() => null)]);
  const extra = (await Promise.all(urls.extra.map((u) => loadImage(u).catch(() => null)))).filter(Boolean) as Img[];
  const before = urls.before ? await loadImage(urls.before).catch(() => null) : null;
  const slug = (a.name || 'animal').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const slides: Slide[] = [{ name: `${slug}-1-cover.jpg`, canvas: coverSlide(a, main, logo) }];
  if ((a.public_bio || '').trim()) slides.push({ name: `${slug}-2-about.jpg`, canvas: aboutSlide(a, logo) });
  if (before) slides.push({ name: `${slug}-${slides.length + 1}-before-after.jpg`, canvas: beforeAfterSlide(a, before, main, logo) });
  for (const p of extra) slides.push({ name: `${slug}-${slides.length + 1}.jpg`, canvas: photoSlide(p, logo) });
  return slides;
}

export const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('image'))), 'image/jpeg', 0.92));
