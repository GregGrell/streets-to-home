import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AuthGate } from './auth';
import { Icon, Stripe, Toaster } from './components/ui';
import { useStore } from './lib/hooks';
import More from './pages/More';
import Staff from './pages/Staff';
import Records from './pages/Records';
import AnimalRecord from './pages/AnimalRecord';
import TreatmentTypes from './pages/TreatmentTypes';
import { ContactEdit, Contacts } from './pages/Contacts';
import Vets, { VetEdit } from './pages/Vets';
import Enquiries, { EnquiryView } from './pages/Enquiries';
import Apply from './pages/Apply';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/apply/:token" element={<Apply />} />
        <Route path="*" element={<AuthGate><Shell /></AuthGate>} />
      </Routes>
    </HashRouter>
  );
}

function Shell() {
  const loc = useLocation();
  return (
    <div className={`app${/^\/(records|contacts|enquiries)/.test(loc.pathname) ? ' wide' : ''}`}>
      <Stripe />
      <Routes>
        <Route path="/" element={<Records />} />
        <Route path="/records" element={<Records />} />
        <Route path="/records/:id" element={<AnimalRecord />} />
        <Route path="/vets" element={<Vets />} />
        <Route path="/vets/:id" element={<VetEdit />} />
        <Route path="/enquiries" element={<Enquiries />} />
        <Route path="/enquiries/:id" element={<EnquiryView />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactEdit />} />
        <Route path="/treatment-types" element={<TreatmentTypes />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/more" element={<More />} />
        <Route path="*" element={<Records />} />
      </Routes>
      <Nav path={loc.pathname} />
      <Toaster />
    </div>
  );
}

const TABS = [
  { to: '/', icon: 'heart', label: 'Animals', match: ['/', '/records'] },
  { to: '/vets', icon: 'calendar', label: 'Vets', match: ['/vets'] },
  { to: '/enquiries', icon: 'mail', label: 'Enquiries', match: ['/enquiries'] },
  { to: '/contacts', icon: 'people', label: 'People', match: ['/contacts'] },
  { to: '/more', icon: 'more', label: 'More', match: ['/more', '/staff', '/treatment-types'] },
];

function Nav({ path }: { path: string }) {
  const s = useStore();
  const newEnq = (s.tables.enquiries ?? []).filter((e) => e.status === 'new' || e.status === 'form_received').length;
  return (
    <nav className="nav" aria-label="Main" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
      {TABS.map((t) => {
        const active = t.match.some((m) => (m === '/' ? path === '/' : path === m || path.startsWith(m + '/')));
        return (
          <NavLink key={t.to} to={t.to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} style={{ position: 'relative' }}>
            <Icon name={t.icon} size={22} width={active ? 2.2 : 1.8} />
            {t.label}
            {t.to === '/enquiries' && newEnq > 0 && <span className="navbadge" aria-label={`${newEnq} need attention`}>{newEnq}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function SyncBadge() {
  const s = useStore();
  const waiting = s.outbox.length;
  if (!s.online) return <span className="sync off">Offline{waiting ? ` · ${waiting} waiting` : ''}</span>;
  if (waiting) return <span className="sync off">{waiting} waiting to send</span>;
  if (s.error) return <span className="sync err" title={s.error}>Not synced</span>;
  if (s.syncing && !s.loaded) return <span className="sync">Loading…</span>;
  return <span className="sync">Up to date</span>;
}
