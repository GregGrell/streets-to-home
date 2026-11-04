import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { Icon, Page } from '../components/ui';
import { useTable } from '../lib/hooks';
import { SyncBadge } from '../App';

function Item({ to, icon, tint, color, label, sub, badge }: { to: string; icon: string; tint: string; color: string; label: string; sub?: string; badge?: number }) {
  return (
    <Link to={to}>
      <span className="ic" style={{ background: tint }}><Icon name={icon} size={20} color={color} /></span>
      <span className="lab">{label}{sub && <small>{sub}</small>}</span>
      {badge ? <span className="chip" style={{ background: 'var(--pink)', color: '#fff' }}>{badge}</span> : null}
      <Icon name="chevron" size={18} color="var(--muted)" width={2} />
    </Link>
  );
}

export default function More() {
  const { me, isMgmt, signOut } = useAuth();
  const pending = useTable('profiles').filter((p) => !p.active).length;
  return (
    <Page title="More" right={<SyncBadge />}>
      <section className="card menu">
        <Item to="/records" icon="heart" tint="#FBE3DE" color="#8A4537" label="Animals" sub="Records, care, vets, website" />
        <Item to="/vets" icon="calendar" tint="var(--blue-tint)" color="var(--blue)" label="Vet appointments" sub="Book, change, close out" />
        <Item to="/enquiries" icon="mail" tint="var(--sage-tint)" color="var(--sage)" label="Enquiries" sub="Website messages and adoption forms" />
        <Item to="/contacts" icon="people" tint="var(--line-2)" color="var(--ink-2)" label="People" sub="Adopters, fosters, vets" />
      </section>

      {isMgmt && (
        <section className="card menu">
          <span className="sect h">Admin</span>
          <Item to="/treatment-types" icon="settings" tint="var(--line-2)" color="var(--ink-2)" label="Treatment schedule" sub="Vaccines, worming, flea & tick intervals" />
          <Item to="/staff" icon="people" tint="var(--line-2)" color="var(--ink-2)" label="Team & permissions" sub="Approve new accounts" badge={pending} />
        </section>
      )}

      <section className="card menu">
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="t15">{me.full_name}</span>
          <span className="t13">{me.email} · {isMgmt ? 'Admin' : 'Team member'}</span>
        </div>
        <button className="mi" style={{ color: 'var(--red)' }} onClick={signOut}>Sign out</button>
      </section>

      <footer className="foot">
        <img src="./logo.png" alt="Streets to Home" />
        <span className="t13">Streets to Home · v1</span>
      </footer>
    </Page>
  );
}
