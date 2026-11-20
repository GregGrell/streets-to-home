import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { Empty, Icon, Page, Pill, toast } from '../components/ui';
import { useProfiles, useTable } from '../lib/hooks';
import { insert, refresh, update } from '../lib/store';
import { supabase } from '../lib/supabase';
import { shortDate, timeOf, today } from '../lib/time';
import { QUESTIONS } from './Apply';
import { Avatar } from './Records';

export const ENQ_STATUS: Record<string, { label: string; bg: string; fg: string; open: boolean }> = {
  new: { label: 'New', bg: '#FBE3DE', fg: '#8A4537', open: true },
  contacted: { label: 'Contacted', bg: 'var(--blue-tint)', fg: 'var(--blue)', open: true },
  form_sent: { label: 'Form sent', bg: 'var(--amber-tint)', fg: 'var(--amber)', open: true },
  form_received: { label: 'Form back', bg: '#FBE3DE', fg: '#8A4537', open: true },
  approved: { label: 'Approved', bg: 'var(--sage-tint)', fg: 'var(--sage)', open: false },
  declined: { label: 'Declined', bg: 'var(--line-2)', fg: 'var(--ink-2)', open: false },
  closed: { label: 'Closed', bg: 'var(--line-2)', fg: 'var(--ink-2)', open: false },
};

/** Online applications from the website carry form_answers.form = 'cat' | 'dog'. */
export const kindLabel = (e: any) =>
  e.form_answers?.form === 'cat' ? 'Cat adoption application'
    : e.form_answers?.form === 'dog' ? 'Dog adoption application'
      : e.kind === 'adoption' ? 'Adoption enquiry' : 'General enquiry';

/** Link the applicant opens. The form lives in this app at #/apply/<token>, no login needed. */
export const formLink = (token: string) => `${location.origin}${location.pathname}#/apply/${token}`;

export default function Enquiries() {
  const list = useTable('enquiries');
  const animals = useTable('animals');
  const [view, setView] = useState<'open' | 'done' | 'all'>('open');
  const shown = useMemo(
    () => list.filter((e) => (view === 'all' ? true : view === 'open' ? ENQ_STATUS[e.status]?.open : !ENQ_STATUS[e.status]?.open)).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [list, view],
  );
  const attention = list.filter((e) => e.status === 'new' || e.status === 'form_received').length;
  return (
    <Page title="Enquiries" sub={attention ? `${attention} need${attention === 1 ? 's' : ''} a reply` : 'All caught up'}>
      <div className="pills">
        <Pill on={view === 'open'} onClick={() => setView('open')}>Open · {list.filter((e) => ENQ_STATUS[e.status]?.open).length}</Pill>
        <Pill on={view === 'done'} onClick={() => setView('done')}>Finished</Pill>
        <Pill on={view === 'all'} onClick={() => setView('all')}>All</Pill>
      </div>
      <section className="card tight">
        {!shown.length && <Empty>{list.length ? 'None here.' : 'No enquiries yet. They arrive here from the website contact form, animal pages and online adoption applications.'}</Empty>}
        {shown.map((e) => {
          const a = animals.find((x) => x.id === e.animal_id);
          const st = ENQ_STATUS[e.status] ?? ENQ_STATUS.new;
          return (
            <Link key={e.id} to={`/enquiries/${e.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
              {a ? <Avatar a={a} size={44} /> : <span className="ic" aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 22, background: 'var(--blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="mail" size={20} color="var(--blue)" /></span>}
              <div className="grow">
                <span className="t15">{e.full_name}</span>
                <span className="t13">{kindLabel(e)}{a ? ` · ${a.name}` : ''} · {shortDate(today(new Date(e.created_at)))}</span>
                {e.message && <span className="t13" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 420 }}>{e.message}</span>}
              </div>
              <span className="chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
            </Link>
          );
        })}
      </section>
    </Page>
  );
}

export function EnquiryView() {
  const { id } = useParams();
  const { me } = useAuth();
  const { name } = useProfiles();
  const e = useTable('enquiries').find((x) => x.id === id);
  const animals = useTable('animals');
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!e) return <Page title="Enquiry" back="Enquiries"><Empty>This enquiry isn't on this device yet.</Empty></Page>;
  const a = animals.find((x) => x.id === e.animal_id);
  const st = ENQ_STATUS[e.status] ?? ENQ_STATUS.new;
  const link = e.form_token ? formLink(e.form_token) : null;
  const setStatus = (status: string) => { update('enquiries', { id: e.id }, { status, handled_by: me.id, updated_at: new Date().toISOString() }); toast(ENQ_STATUS[status].label); };

  const sendForm = async () => {
    if (!navigator.onLine) return toast('Needs signal to create the form link');
    setBusy(true);
    const { data, error } = await supabase.rpc('issue_adoption_form', { p_enquiry: e.id });
    setBusy(false);
    if (error || !data) return toast(`Couldn't create the link: ${error?.message ?? 'unknown error'}`);
    await refresh(['enquiries']);
    const url = formLink(data as string);
    navigator.clipboard?.writeText(url).catch(() => {});
    toast('Form link created and copied');
  };

  const first = e.full_name.split(' ')[0];
  const msg = link ? `Hi ${first}, thank you for your interest${a ? ` in ${a.name}` : ''}! Please fill in our adoption form here: ${link}\n\nStreets to Home` : '';
  const phone = (e.phone || '').replace(/[^\d]/g, '');

  const saveContact = () => {
    const c = insert('contacts', { kind: 'adopter', full_name: e.full_name, email: e.email, phone: e.phone, address: e.form_answers?.address ?? '', city: e.form_answers?.city ?? '', country: e.form_answers?.country ?? '', notes: `From website enquiry ${shortDate(today(new Date(e.created_at)))}`, created_by: me.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    update('enquiries', { id: e.id }, { contact_id: c.id });
    toast(`${e.full_name} saved to People`);
  };

  return (
    <Page title={e.full_name} sub={`${kindLabel(e)} · ${shortDate(today(new Date(e.created_at)))} ${timeOf(e.created_at)}`} back="Enquiries"
      right={<span className="chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span>}>
      <section className="card">
        {a && (
          <Link to={`/records/${a.id}`} className="row" style={{ borderTop: 0, padding: 0, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
            <Avatar a={a} size={48} />
            <div className="grow"><span className="t15">About {a.name}</span><span className="t13">Open record</span></div>
            <Icon name="chevron" size={18} color="var(--muted)" />
          </Link>
        )}
        <div className="qa"><b>Email</b><span><a href={`mailto:${e.email}`}>{e.email}</a></span></div>
        {e.phone && <div className="qa"><b>Phone</b><span><a href={`tel:${e.phone}`}>{e.phone}</a>{phone && <> · <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">WhatsApp</a></>}</span></div>}
        {e.message && <div className="qa"><b>Message</b><span>{e.message}</span></div>}
        {e.contact_id ? <Link to={`/contacts/${e.contact_id}`} className="ok">Saved in People</Link> : <button className="btn ghost sm" onClick={saveContact}>Save to People</button>}
      </section>

      <section className="card">
        <h2 className="h">Adoption form</h2>
        {!link && <span className="t14">Send {first} a private link to the full adoption questionnaire. Their answers come back to this enquiry.</span>}
        {link && !e.form_submitted_at && <span className="t14">Sent {e.form_sent_at ? shortDate(today(new Date(e.form_sent_at))) : ''}. Waiting for {first} to fill it in. The link works for 30 days.</span>}
        {link && !e.form_submitted_at && (
          <>
            <div className="copybox">
              <input className="input" readOnly value={link} onFocus={(ev) => ev.target.select()} aria-label="Form link" />
              <button className="btn sm" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('Link copied'))}>Copy</button>
            </div>
            <div className="btns" style={{ flexWrap: 'wrap' }}>
              <a className="btn ghost sm" href={`mailto:${e.email}?subject=${encodeURIComponent('Your adoption form · Streets to Home')}&body=${encodeURIComponent(msg)}`}>Email it</a>
              {phone && <a className="btn ghost sm" href={`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">WhatsApp it</a>}
            </div>
          </>
        )}
        {!e.form_submitted_at && <button className={link ? 'btn link sm' : 'btn'} disabled={busy} onClick={sendForm}>{busy ? 'Creating…' : link ? 'Make a new link' : 'Create adoption form link'}</button>}
        {e.form_submitted_at && e.form_answers && (
          <>
            <span className="ok">Received {shortDate(today(new Date(e.form_submitted_at)))} at {timeOf(e.form_submitted_at)}</span>
            {Array.isArray(e.form_answers.items)
              ? (e.form_answers.items as { s: string; q: string; a: string }[]).map((it, i, all) => (
                <div key={i} style={{ display: 'contents' }}>
                  {(i === 0 || all[i - 1].s !== it.s) && <h3 className="h" style={{ paddingTop: 10 }}>{it.s}</h3>}
                  <div className="qa"><b>{it.q}</b><span style={{ whiteSpace: 'pre-wrap' }}>{it.a}</span></div>
                </div>
              ))
              : QUESTIONS.map((q) => {
                const v = e.form_answers[q.key];
                if (v === undefined || v === '' || q.type === 'section') return q.type === 'section' ? <h3 key={q.key} className="h" style={{ paddingTop: 10 }}>{q.label}</h3> : null;
                return <div key={q.key} className="qa"><b>{q.label}</b><span>{Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}</span></div>;
              })}
          </>
        )}
      </section>

      <section className="card">
        <h2 className="h">Status</h2>
        <div className="pills">
          {Object.entries(ENQ_STATUS).map(([k, s]) => <Pill key={k} on={e.status === k} onClick={() => setStatus(k)}>{s.label}</Pill>)}
        </div>
        <label className="field"><span>Team notes · not shown to the applicant</span>
          <textarea rows={3} value={notes ?? e.internal_notes ?? ''} onChange={(ev) => setNotes(ev.target.value)} placeholder="Home check booked, spoke on the phone…" />
        </label>
        {notes !== null && notes !== (e.internal_notes ?? '') && <button className="btn outline" onClick={() => { update('enquiries', { id: e.id }, { internal_notes: notes.trim(), handled_by: me.id }); setNotes(null); toast('Notes saved'); }}>Save notes</button>}
        {e.handled_by && <span className="note">Last handled by {name(e.handled_by)}</span>}
      </section>
    </Page>
  );
}
