import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Stripe } from '../components/ui';
import { supabase } from '../lib/supabase';

type Q = { key: string; label: string; type: 'section' | 'text' | 'long' | 'choice' | 'multi' | 'yesno'; options?: string[]; required?: boolean; hint?: string };

/** The adoption questionnaire. Answers are stored on the enquiry exactly as keyed here. */
export const QUESTIONS: Q[] = [
  { key: 's_you', label: 'About you', type: 'section' },
  { key: 'phone', label: 'Best phone / WhatsApp number', type: 'text', required: true },
  { key: 'address', label: 'Home address', type: 'long', required: true },
  { key: 'city', label: 'City', type: 'text', required: true },
  { key: 'country', label: 'Country you live in', type: 'text', required: true },
  { key: 'household', label: 'Who lives in your home? Include children and their ages', type: 'long', required: true },
  { key: 'all_agree', label: 'Does everyone in the home agree to adopting?', type: 'yesno', required: true },
  { key: 'allergies', label: 'Does anyone in the home have pet allergies?', type: 'yesno' },

  { key: 's_home', label: 'Your home', type: 'section' },
  { key: 'home_type', label: 'Type of home', type: 'choice', options: ['Villa / house', 'Compound villa', 'Apartment', 'Other'], required: true },
  { key: 'own_rent', label: 'Do you own or rent?', type: 'choice', options: ['Own', 'Rent'], required: true },
  { key: 'landlord_ok', label: 'If renting, does your landlord or compound allow pets?', type: 'choice', options: ['Yes, in writing', 'Yes, verbally', 'Not checked yet', 'Not renting'] },
  { key: 'garden', label: 'Outdoor space', type: 'choice', options: ['Private garden, fenced', 'Private garden, not fenced', 'Shared compound space', 'Balcony only', 'None'], required: true },
  { key: 'alone_hours', label: 'How many hours a day would the animal be alone?', type: 'text', required: true },
  { key: 'sleep', label: 'Where would the animal sleep?', type: 'text', required: true },
  { key: 'heat', label: 'How will you keep them cool in the summer heat?', type: 'long', hint: 'Indoor, air-conditioned living is expected for our animals.' },

  { key: 's_exp', label: 'Pets and experience', type: 'section' },
  { key: 'current_pets', label: 'Pets you have now: species, age, neutered, vaccinated?', type: 'long' },
  { key: 'past_pets', label: 'Pets you have had before, and what happened to them', type: 'long' },
  { key: 'vet', label: 'Your current or intended vet clinic', type: 'text' },
  { key: 'experience', label: 'Your experience with this kind of animal', type: 'long', required: true },

  { key: 's_future', label: 'Looking ahead', type: 'section' },
  { key: 'why', label: 'Why do you want to adopt, and why this animal?', type: 'long', required: true },
  { key: 'leave_qatar', label: 'If you leave Qatar, what is your plan for the animal?', type: 'long', required: true, hint: 'Relocation costs and paperwork (pet passport, RATT, flights) are significant. We want to know you have thought about it.' },
  { key: 'travel', label: 'Who cares for the animal when you travel?', type: 'long', required: true },
  { key: 'costs', label: 'Are you prepared for vet, food, grooming and boarding costs?', type: 'yesno', required: true },
  { key: 'behaviour', label: 'What would you do if behaviour problems came up?', type: 'long', required: true },
  { key: 'home_visit', label: 'Are you happy for us to do a home visit (in person or video)?', type: 'yesno', required: true },
  { key: 'return_to_us', label: 'If you ever can’t keep the animal, will you return them to Streets to Home rather than rehome them yourself?', type: 'yesno', required: true },
  { key: 'anything_else', label: 'Anything else you would like us to know?', type: 'long' },
  { key: 'confirm', label: 'I confirm the information above is true', type: 'yesno', required: true },
];

export default function Apply() {
  const { token } = useParams();
  const [info, setInfo] = useState<{ full_name: string; animal_name: string | null; already_submitted: boolean } | null | undefined>(undefined);
  const [ans, setAns] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.rpc('get_adoption_form', { p_token: token }).then(({ data }) => setInfo((data as any[])?.[0] ?? null));
  }, [token]);

  const missing = QUESTIONS.filter((q) => q.required && q.type !== 'section' && (ans[q.key] === undefined || ans[q.key] === '' || (q.key === 'confirm' && ans[q.key] !== true)));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (missing.length) return setErr(`Please answer: ${missing.map((q) => q.label).slice(0, 3).join(' · ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}`);
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc('submit_adoption_form', { p_token: token, p_answers: ans });
    setBusy(false);
    if (error || !data) return setErr(error?.message ?? 'This form has already been sent or the link has expired.');
    setDone(true);
    window.scrollTo(0, 0);
  };

  if (info === undefined) return <Shell><p className="sub" style={{ textAlign: 'center' }}>Loading…</p></Shell>;
  if (info === null) return <Shell><section className="card"><h1 className="title" style={{ fontSize: 22 }}>This link has expired</h1><p className="t14">Adoption form links work for 30 days. Please get in touch with us and we'll send you a new one.</p></section></Shell>;
  if (done || info.already_submitted)
    return <Shell><section className="card"><h1 className="title" style={{ fontSize: 22 }}>Thank you{info.full_name ? `, ${info.full_name.split(' ')[0]}` : ''}!</h1><p className="t14">We've received your adoption form{info.animal_name ? ` for ${info.animal_name}` : ''}. Someone from Streets to Home will be in touch soon.</p></section></Shell>;

  return (
    <Shell>
      <section className="card">
        <h1 className="title" style={{ fontSize: 24 }}>Adoption form{info.animal_name ? `: ${info.animal_name}` : ''}</h1>
        <p className="t14">Hi {info.full_name.split(' ')[0]}, thank you for wanting to give one of our animals a home. This takes about 10 minutes. Questions marked * are required.</p>
      </section>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {chunk(QUESTIONS).map((group) => (
          <section className="card" key={group[0].key}>
            <h2 className="h">{group[0].label}</h2>
            {group.slice(1).map((q) => <Field key={q.key} q={q} value={ans[q.key]} onChange={(v) => setAns((x) => ({ ...x, [q.key]: v }))} />)}
          </section>
        ))}
        {err && <p className="bad" role="alert" style={{ fontSize: 14 }}>{err}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Sending…' : 'Send my adoption form'}</button>
        <p className="note" style={{ textAlign: 'center' }}>Your answers go only to the Streets to Home team and are used to find the right match.</p>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Stripe />
      <div style={{ padding: '24px 16px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <img src="./logo.png" alt="Streets to Home" width={120} style={{ alignSelf: 'center' }} />
        {children}
      </div>
    </div>
  );
}

function chunk(qs: Q[]) {
  const out: Q[][] = [];
  for (const q of qs) (q.type === 'section' ? out.push([q]) : out[out.length - 1].push(q));
  return out;
}

function Field({ q, value, onChange }: { q: Q; value: any; onChange: (v: any) => void }) {
  const label = <span>{q.label}{q.required ? ' *' : ''}</span>;
  if (q.type === 'yesno' || q.type === 'choice') {
    const opts = q.type === 'yesno' ? ['Yes', 'No'] : q.options!;
    const cur = q.type === 'yesno' ? (value === true ? 'Yes' : value === false ? 'No' : '') : value;
    return (
      <div className="field" role="group" aria-label={q.label}>
        {label}
        {q.hint && <span className="note">{q.hint}</span>}
        <div className="pills">
          {opts.map((o) => (
            <button type="button" key={o} className="pill" aria-pressed={cur === o} onClick={() => onChange(q.type === 'yesno' ? o === 'Yes' : o)}>{o}</button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <label className="field">
      {label}
      {q.hint && <span className="note">{q.hint}</span>}
      {q.type === 'long'
        ? <textarea rows={3} maxLength={2000} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        : <input maxLength={300} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}
