// Receives an online adoption application from streetstohome.com/apply.html,
// saves it as an enquiry (status "Form back"), emails the team and sends the applicant a thank-you.
//
// Secrets: RESEND_API_KEY, NOTIFY_TO (optional, comma-separated team addresses; defaults to caroline@grzk.com),
//          MAIL_FROM (e.g. "Streets to Home <hello@streetstohome.com>"), REPLY_TO (optional; defaults to the first NOTIFY_TO)
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = ['https://streetstohome.com', 'https://www.streetstohome.com', 'https://greggrell.github.io'];
const SITE = 'https://streetstohome.com';

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  Vary: 'Origin',
});

type Item = { s: string; q: string; a: string };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function answersHtml(items: Item[]) {
  let last = '';
  let out = '';
  for (const it of items) {
    if (it.s !== last) {
      out += `<tr><td colspan="2" style="padding:18px 0 6px;font-size:15px;font-weight:700;color:#3B2918;border-bottom:2px solid #CEA37E">${esc(it.s)}</td></tr>`;
      last = it.s;
    }
    out += `<tr><td style="padding:8px 12px 8px 0;vertical-align:top;width:45%;font-size:13px;color:#6B5B4D">${esc(it.q)}</td><td style="padding:8px 0;vertical-align:top;font-size:14px;color:#2B1E13;white-space:pre-wrap">${esc(it.a)}</td></tr>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">${out}</table>`;
}

const shell = (inner: string) => `<!doctype html><html><body style="margin:0;background:#FBF7F2;font-family:Arial,Helvetica,sans-serif;color:#2B1E13">
<div style="max-width:640px;margin:0 auto;padding:24px 16px">
  <div style="text-align:center;padding-bottom:16px"><img src="${SITE}/logo.png" width="88" height="88" alt="Streets to Home" style="border-radius:50%;background:#fff"></div>
  <div style="background:#fff;border-radius:16px;padding:28px 24px">${inner}</div>
  <p style="text-align:center;font-size:12px;color:#6B5B4D;margin-top:16px">Streets to Home · Animal rescue · Doha, Qatar · <a href="${SITE}" style="color:#A65A4C">streetstohome.com</a></p>
</div></body></html>`;

async function send(key: string, msg: Record<string, unknown>) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(msg),
  });
  if (!r.ok) console.error('resend', r.status, await r.text());
  return r.ok;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = { ...cors(origin), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  let body: any;
  try {
    const raw = await req.text();
    if (raw.length > 80_000) return reply(413, { error: 'That application is too long. Please shorten some answers.' });
    body = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'Bad request' });
  }

  const form = body?.form === 'cat' || body?.form === 'dog' ? body.form : null;
  const a = body?.answers && typeof body.answers === 'object' ? body.answers : null;
  if (!form || !a) return reply(400, { error: 'Bad request' });
  const items: Item[] = Array.isArray(body.items)
    ? body.items.slice(0, 200).map((x: any) => ({ s: str(x?.s, 120), q: str(x?.q, 400), a: str(x?.a, 3000) })).filter((x: Item) => x.q && x.a)
    : [];

  const fullName = str(a.full_name, 120);
  const email = str(a.email, 200);
  const phone = str(a.phone, 40);
  if (!fullName) return reply(400, { error: 'Please tell us your full name.' });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply(400, { error: 'Please check your email address.' });
  if (a.declaration !== 'Yes') return reply(400, { error: 'Please tick the declaration at the end of the form.' });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  // Flood guards: 3 per email per hour, 40 applications per hour in total
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    db.from('enquiries').select('id', { count: 'exact', head: true }).ilike('email', email).gte('created_at', hourAgo),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('kind', 'adoption').not('form_submitted_at', 'is', null).gte('created_at', hourAgo),
  ]);
  if ((mine ?? 0) >= 3 || (all ?? 0) >= 40) return reply(429, { error: 'We have had a lot of applications just now. Please try again in an hour.' });

  let animal: { id: string; name: string } | null = null;
  const slug = str(body.animal_slug, 120);
  if (slug) {
    const { data } = await db.from('animals').select('id, name').eq('slug', slug).eq('published', true).maybeSingle();
    animal = data;
  }
  const wanted = animal?.name || str(a.animal_name, 120);
  const pet = form === 'cat' ? 'cat' : 'dog';
  const now = new Date().toISOString();

  const { data: row, error } = await db.from('enquiries').insert({
    kind: 'adoption',
    animal_id: animal?.id ?? null,
    full_name: fullName,
    email,
    phone,
    message: `Online ${pet} adoption application${wanted ? ` for ${wanted}` : ''}.`,
    status: 'form_received',
    form_answers: { form, version: 1, items, answers: a },
    form_submitted_at: now,
  }).select('id').single();
  if (error) {
    console.error('insert', error);
    return reply(500, { error: 'Sorry, we could not save your application. Please try again, or message us on Instagram.' });
  }

  const key = Deno.env.get('RESEND_API_KEY');
  const to = (Deno.env.get('NOTIFY_TO') || 'caroline@grzk.com').split(',').map((s) => s.trim()).filter(Boolean);
  const from = Deno.env.get('MAIL_FROM') || 'Streets to Home <hello@streetstohome.com>';
  const replyTo = Deno.env.get('REPLY_TO') || to[0];
  let emailed = false;
  if (key && to.length) {
    const first = fullName.split(' ')[0];
    const appLink = `${SITE}/app/#/enquiries/${row.id}`;
    const wa = phone.replace(/[^\d]/g, '');
    const team = send(key, {
      from, to, reply_to: email,
      subject: `New ${pet} adoption application: ${fullName}${wanted ? ` for ${wanted}` : ''}`,
      html: shell(`
        <h1 style="margin:0 0 6px;font-size:22px;color:#3B2918">New ${pet} adoption application</h1>
        <p style="margin:0 0 16px;color:#6B5B4D">${esc(fullName)}${wanted ? ` · for <b>${esc(wanted)}</b>` : ''}</p>
        <p style="margin:0 0 6px"><b>Email:</b> <a href="mailto:${esc(email)}" style="color:#A65A4C">${esc(email)}</a></p>
        ${phone ? `<p style="margin:0 0 6px"><b>Phone:</b> ${esc(phone)}${wa ? ` · <a href="https://wa.me/${wa}" style="color:#A65A4C">WhatsApp</a>` : ''}</p>` : ''}
        <p style="margin:18px 0"><a href="${appLink}" style="display:inline-block;background:#3B2918;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">Open in the Streets to Home app</a></p>
        <p style="margin:0;font-size:13px;color:#6B5B4D">Reply to this email to answer ${esc(first)} directly.</p>
        ${answersHtml(items)}`),
    });
    const thanks = send(key, {
      from, to: [email], reply_to: replyTo,
      subject: `Thank you for your adoption application${wanted ? ` for ${wanted}` : ''}`,
      html: shell(`
        <h1 style="margin:0 0 12px;font-size:24px;color:#3B2918">Thank you, ${esc(first)}!</h1>
        <p style="margin:0 0 12px;line-height:1.55">Thank you for applying to adopt ${wanted ? `<b>${esc(wanted)}</b>` : `a rescue ${pet}`} from Streets to Home. We've received your application, and we're so grateful you're thinking of giving one of our animals a home.</p>
        <h2 style="margin:20px 0 8px;font-size:17px;color:#3B2918">What happens next</h2>
        <ol style="margin:0 0 12px;padding-left:20px;line-height:1.6">
          <li>One of our team will read your application carefully, usually within a few days.</li>
          <li>We'll get in touch to talk it through and answer any questions you have.</li>
          <li>If it looks like a good match, we'll arrange for you to meet ${wanted ? esc(wanted) : `the ${pet}`} and do a home visit.</li>
        </ol>
        <p style="margin:0 0 12px;line-height:1.55">We look for the best match for each animal, so it can take a little time, and applying doesn't guarantee adoption. If anything changes, or you'd like to add something, just reply to this email.</p>
        <p style="margin:0 0 4px;line-height:1.55">With thanks,<br><b>The Streets to Home team</b></p>
        <h2 style="margin:28px 0 0;font-size:15px;color:#6B5B4D">A copy of your answers</h2>
        ${answersHtml(items)}`),
    });
    const [t, u] = await Promise.all([team, thanks]);
    emailed = u;
    if (!t) console.error('team notification failed for enquiry', row.id);
  } else {
    console.warn('email not configured; application saved without emails', row.id);
  }

  return reply(200, { ok: true, emailed });
});
