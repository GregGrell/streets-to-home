import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import { Empty, Icon, Page, Pill, toast } from '../components/ui';
import { useProfiles, useTable } from '../lib/hooks';
import { insert, remove, update, type Row } from '../lib/store';
import { addDays, shortDate, timeOf, today } from '../lib/time';
import { Avatar } from './Records';

export const APPT_STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  scheduled: { label: 'Booked', bg: 'var(--blue-tint)', fg: 'var(--blue)' },
  done: { label: 'Done', bg: 'var(--sage-tint)', fg: 'var(--sage)' },
  missed: { label: 'Missed', bg: 'var(--red-tint)', fg: 'var(--red)' },
  cancelled: { label: 'Cancelled', bg: 'var(--line-2)', fg: 'var(--ink-2)' },
};

const dayOf = (iso: string) => today(new Date(iso));
const toIso = (day: string, hm: string) => new Date(`${day}T${hm}:00+03:00`).toISOString();

type Appt = Row & { animals: Row[] };

function useAppointments(): Appt[] {
  const appts = useTable('vet_appointments');
  const links = useTable('vet_appointment_animals');
  const animals = useTable('animals');
  return useMemo(() => {
    const byId = new Map(animals.map((a) => [a.id, a]));
    return appts.map((ap): Appt => ({
      ...ap,
      animals: links.filter((l) => l.appointment_id === ap.id).map((l) => byId.get(l.animal_id)).filter(Boolean) as Row[],
    }));
  }, [appts, links, animals]);
}

const clinicOf = (ap: Row) => [ap.clinic_name, ap.vet_name].filter(Boolean).join(' · ');

function ApptRow({ ap }: { ap: Row & { animals: Row[] } }) {
  const st = APPT_STATUS[ap.status] ?? APPT_STATUS.scheduled;
  const late = ap.status === 'scheduled' && new Date(ap.starts_at).getTime() < Date.now();
  return (
    <Link to={`/vets/${ap.id}`} className="row" style={{ textDecoration: 'none', color: 'inherit', alignItems: 'center' }}>
      <div style={{ width: 58, flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
        <span className="t13" style={{ fontWeight: 700 }}>{shortDate(dayOf(ap.starts_at)).split(' ').slice(0, 1)}</span>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue)' }}>{shortDate(dayOf(ap.starts_at)).split(' ')[1]}</span>
        <span className="t13">{shortDate(dayOf(ap.starts_at)).split(' ')[2]}</span>
      </div>
      <div className="grow">
        <span className="t15">{timeOf(ap.starts_at)} · {ap.reason}</span>
        <span className="t13">{ap.animals.map((a) => a.name).join(', ') || 'No animals added'}</span>
        {clinicOf(ap) && <span className="t13">{clinicOf(ap)}</span>}
      </div>
      <span className="chip" style={late ? { background: 'var(--amber-tint)', color: 'var(--amber)' } : { background: st.bg, color: st.fg }}>{late ? 'Needs closing' : st.label}</span>
    </Link>
  );
}

/** All vet appointments: upcoming first, then ones that need closing, then the past. */
export default function Vets() {
  const list = useAppointments();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const now = Date.now();
  const toClose = list.filter((a) => a.status === 'scheduled' && new Date(a.starts_at).getTime() < now).sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  const upcoming = list.filter((a) => a.status === 'scheduled' && new Date(a.starts_at).getTime() >= now).sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  const past = list.filter((a) => a.status !== 'scheduled').sort((x, y) => y.starts_at.localeCompare(x.starts_at));
  const thisWeek = upcoming.filter((a) => dayOf(a.starts_at) <= addDays(today(), 7)).length;

  return (
    <Page title="Vet appointments" sub={`${upcoming.length} booked · ${thisWeek} in the next 7 days`}
      right={<Link className="btn sm" to="/vets/new"><Icon name="plus" size={16} color="#fff" width={2.4} /> Book</Link>}>
      {toClose.length > 0 && (
        <section className="card tight" style={{ borderColor: 'var(--amber-line)' }}>
          <h2 className="h" style={{ paddingBottom: 6, color: 'var(--amber)' }}>Needs closing · {toClose.length}</h2>
          <span className="note" style={{ paddingBottom: 4 }}>The time has passed. Open each one and mark it done, missed or cancelled.</span>
          {toClose.map((ap) => <ApptRow key={ap.id} ap={ap} />)}
        </section>
      )}
      <div className="pills">
        <Pill on={view === 'upcoming'} onClick={() => setView('upcoming')}>Upcoming · {upcoming.length}</Pill>
        <Pill on={view === 'past'} onClick={() => setView('past')}>Past · {past.length}</Pill>
      </div>
      <section className="card tight">
        {view === 'upcoming' && (upcoming.length ? upcoming.map((ap) => <ApptRow key={ap.id} ap={ap} />) : <Empty>Nothing booked. Tap Book to add one.</Empty>)}
        {view === 'past' && (past.length ? past.map((ap) => <ApptRow key={ap.id} ap={ap} />) : <Empty>No past appointments yet.</Empty>)}
      </section>
    </Page>
  );
}

/** Book, change, close out or delete one appointment. /vets/new?animal=<id> pre-selects an animal. */
export function VetEdit() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const nav = useNavigate();
  const { me } = useAuth();
  const { list: people, name } = useProfiles();
  const animals = useTable('animals');
  const clinics = useTable('contacts').filter((c) => c.kind === 'vet');
  const all = useAppointments();
  const isNew = id === 'new';
  const ap = isNew ? null : all.find((x) => x.id === id);

  const startDay = ap ? dayOf(ap.starts_at) : addDays(today(), 1);
  const [day, setDay] = useState(startDay);
  const [time, setTime] = useState(ap ? timeOf(ap.starts_at) : '10:00');
  const [duration, setDuration] = useState(String(ap?.duration_min ?? 30));
  const [reason, setReason] = useState(ap?.reason ?? '');
  const [clinic, setClinic] = useState(ap?.clinic_name ?? clinics[0]?.full_name ?? '');
  const [vet, setVet] = useState(ap?.vet_name ?? '');
  const [notes, setNotes] = useState(ap?.notes ?? '');
  const [assigned, setAssigned] = useState(ap?.assigned_to ?? '');
  const [picked, setPicked] = useState<string[]>(ap ? ap.animals.map((a) => a.id) : qs.get('animal') ? [qs.get('animal')!] : []);
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState(ap?.outcome ?? '');

  if (!isNew && !ap) return <Page title="Appointment" back="Back"><Empty>This appointment isn't on this device. It may have been deleted.</Empty></Page>;

  const term = search.trim().toLowerCase();
  const choices = animals
    .filter((a) => !picked.includes(a.id))
    .filter((a) => (term ? a.name.toLowerCase().includes(term) || (a.microchip ?? '').includes(term) : ['shelter', 'foster', 'trial', 'resident'].includes(a.status)))
    .sort((x, y) => x.name.localeCompare(y.name))
    .slice(0, 8);
  const valid = reason.trim() && day && time && picked.length > 0;
  const clinicRow = clinics.find((c) => c.full_name === clinic.trim());

  const save = () => {
    const fields = {
      starts_at: toIso(day, time), duration_min: Math.max(5, Math.min(600, parseInt(duration) || 30)),
      reason: reason.trim(), clinic_name: clinic.trim(), clinic_id: clinicRow?.id ?? null, vet_name: vet.trim(),
      notes: notes.trim(), assigned_to: assigned || null,
    };
    if (isNew) {
      const row = insert('vet_appointments', { ...fields, status: 'scheduled', outcome: '', created_by: me.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      picked.forEach((aid) => insert('vet_appointment_animals', { appointment_id: row.id, animal_id: aid }));
      toast(`Booked for ${shortDate(day)} at ${time}`);
      nav('/vets', { replace: true });
    } else {
      update('vet_appointments', { id: ap!.id }, { ...fields, updated_by: me.id, updated_at: new Date().toISOString() });
      const before = ap!.animals.map((a) => a.id);
      before.filter((x) => !picked.includes(x)).forEach((aid) => remove('vet_appointment_animals', { appointment_id: ap!.id, animal_id: aid }));
      picked.filter((x) => !before.includes(x)).forEach((aid) => insert('vet_appointment_animals', { appointment_id: ap!.id, animal_id: aid }));
      toast('Appointment updated');
    }
  };

  const close = (status: string) => {
    update('vet_appointments', { id: ap!.id }, { status, outcome: outcome.trim(), updated_by: me.id, updated_at: new Date().toISOString() });
    if (status === 'done' && outcome.trim()) {
      // Put what the vet said on each animal's medical record too.
      ap!.animals.forEach((a) => insert('medical_notes', {
        animal_id: a.id, noted_on: dayOf(ap!.starts_at), title: `Vet: ${ap!.reason}`, body: [clinicOf(ap!), outcome.trim()].filter(Boolean).join('\n'),
        file_path: null, created_by: me.id, created_at: new Date().toISOString(),
      }));
    }
    toast(APPT_STATUS[status].label);
  };

  const del = () => {
    if (!confirm('Delete this appointment? It will still show in each animal\'s History.')) return;
    ap!.animals.forEach((a) => remove('vet_appointment_animals', { appointment_id: ap!.id, animal_id: a.id }));
    remove('vet_appointments', { id: ap!.id });
    toast('Appointment deleted');
    nav('/vets', { replace: true });
  };

  const st = ap ? APPT_STATUS[ap.status] : null;
  return (
    <Page title={isNew ? 'Book a vet appointment' : ap!.reason} sub={ap ? `${shortDate(dayOf(ap.starts_at))} at ${timeOf(ap.starts_at)}${clinicOf(ap) ? ' · ' + clinicOf(ap) : ''}` : undefined} back="Vets"
      right={st ? <span className="chip" style={{ background: st.bg, color: st.fg }}>{st.label}</span> : undefined}>
      <section className="card">
        <h2 className="h">Animals</h2>
        {picked.map((aid) => {
          const a = animals.find((x) => x.id === aid);
          if (!a) return null;
          return (
            <div key={aid} className="row" style={{ alignItems: 'center' }}>
              <Avatar a={a} size={36} />
              <Link to={`/records/${a.id}`} className="grow t15" style={{ color: 'inherit' }}>{a.name}</Link>
              <button className="btn link sm" onClick={() => setPicked(picked.filter((x) => x !== aid))}>Remove</button>
            </div>
          );
        })}
        <input className="input" type="search" placeholder="Add an animal: search by name" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search animals to add" />
        {choices.length > 0 && (
          <div className="pills">
            {choices.map((a) => <button key={a.id} type="button" className="pill" onClick={() => { setPicked([...picked, a.id]); setSearch(''); }}>+ {a.name}</button>)}
          </div>
        )}
      </section>

      <section className="card">
        <label className="field"><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Annual vaccines, neuter, check-up" list="reasons" /></label>
        <datalist id="reasons">
          {['Vaccinations', 'Neuter / spay', 'Check-up', 'Microchip', 'Blood test', 'RATT blood draw', 'Dental', 'Follow-up', 'Fit-to-fly check'].map((r) => <option key={r} value={r} />)}
        </datalist>
        <div className="grid2">
          <label className="field"><span>Date</span><input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label>
          <label className="field"><span>Time</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        </div>
        <div className="grid2">
          <label className="field"><span>Clinic</span><input value={clinic} onChange={(e) => setClinic(e.target.value)} list="clinics" placeholder="Clinic name" /></label>
          <label className="field"><span>Vet · optional</span><input value={vet} onChange={(e) => setVet(e.target.value)} placeholder="Dr …" /></label>
        </div>
        <datalist id="clinics">{clinics.map((c) => <option key={c.id} value={c.full_name} />)}</datalist>
        {clinicRow && (clinicRow.phone || clinicRow.address) && <span className="t13">{[clinicRow.phone, clinicRow.address].filter(Boolean).join(' · ')}</span>}
        <div className="grid2">
          <label className="field"><span>Length (minutes)</span><input type="number" inputMode="numeric" min={5} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
          <label className="field">
            <span>Who's taking them</span>
            <select value={assigned} onChange={(e) => setAssigned(e.target.value)}>
              <option value="">Not decided</option>
              {people.filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </label>
        </div>
        <label className="field"><span>Notes · optional</span><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fasting from midnight, bring vaccine card…" /></label>
        {!picked.length && <span className="note">Add at least one animal.</span>}
        <button className="btn" disabled={!valid} onClick={save}>{isNew ? 'Book appointment' : 'Save changes'}</button>
        {!isNew && <span className="note">Booked by {name(ap!.created_by) || 'someone'}{ap!.updated_by ? ` · last changed by ${name(ap!.updated_by)}` : ''}</span>}
      </section>

      {!isNew && (
        <section className="card">
          <h2 className="h">After the appointment</h2>
          <label className="field"><span>What the vet said · optional</span><textarea rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Findings, treatment given, follow-up needed" /></label>
          <span className="note">Marking it done adds this to each animal's Medical notes. Record any vaccines given on the Care tab so the next due date is set.</span>
          <div className="btns" style={{ flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => close('done')}>Mark done</button>
            <button className="btn ghost sm" onClick={() => close('missed')}>Missed</button>
            <button className="btn ghost sm" onClick={() => close('cancelled')}>Cancelled</button>
            {ap!.status !== 'scheduled' && <button className="btn link sm" onClick={() => close('scheduled')}>Reopen</button>}
          </div>
          <button className="btn danger" onClick={del}><Icon name="trash" size={18} /> Delete appointment</button>
        </section>
      )}
    </Page>
  );
}

/** The Vets tab on an animal's record. */
export function AnimalVets({ a }: { a: Row }) {
  const list = useAppointments().filter((ap) => ap.animals.some((x) => x.id === a.id));
  const upcoming = list.filter((ap) => ap.status === 'scheduled').sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  const past = list.filter((ap) => ap.status !== 'scheduled').sort((x, y) => y.starts_at.localeCompare(x.starts_at));
  return (
    <>
      <Link className="btn" to={`/vets/new?animal=${a.id}`}><Icon name="plus" size={16} color="#fff" width={2.4} /> Book vet for {a.name}</Link>
      <section className="card tight">
        <h2 className="h" style={{ paddingBottom: 6 }}>Booked · {upcoming.length}</h2>
        {upcoming.length ? upcoming.map((ap) => <ApptRow key={ap.id} ap={ap} />) : <Empty>Nothing booked.</Empty>}
      </section>
      {past.length > 0 && (
        <section className="card tight">
          <h2 className="h" style={{ paddingBottom: 6 }}>Past · {past.length}</h2>
          {past.map((ap) => <ApptRow key={ap.id} ap={ap} />)}
        </section>
      )}
    </>
  );
}
