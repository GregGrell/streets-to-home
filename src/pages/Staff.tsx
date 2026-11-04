import { useAuth } from '../auth';
import { Empty, Page, toast } from '../components/ui';
import { useTable } from '../lib/hooks';
import { update } from '../lib/store';

export default function Staff() {
  const { me, isMgmt } = useAuth();
  const people = useTable('profiles');
  if (!isMgmt) return <Page title="Team" back="More"><Empty>Only admins can manage the team.</Empty></Page>;
  const waiting = people.filter((p) => !p.active);
  const active = people.filter((p) => p.active);
  const link = location.origin + location.pathname;
  return (
    <Page title="Team & permissions" back="More">
      <section className="card">
        <h2 className="h">Adding someone</h2>
        <span className="t14">Send them this link. They create an account with their email, then appear below for you to approve.</span>
        <div className="copybox">
          <input className="input" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="App link" />
          <button className="btn sm" onClick={() => navigator.clipboard?.writeText(link).then(() => toast('Link copied'))}>Copy</button>
        </div>
      </section>

      <section className="card tight">
        <h2 className="h" style={{ paddingBottom: 6 }}>Waiting for approval</h2>
        {!waiting.length && <Empty>Nobody waiting.</Empty>}
        {waiting.map((p) => (
          <div key={p.id} className="row" style={{ flexDirection: 'column', gap: 8 }}>
            <div className="grow"><span className="t15">{p.full_name}</span><span className="t13">{p.email}</span></div>
            <div className="btns" style={{ width: '100%', flexWrap: 'wrap' }}>
              <button className="btn sm" onClick={() => { update('profiles', { id: p.id }, { active: true, role: 'member' }); toast(`${p.full_name} approved`); }}>Approve</button>
              <button className="btn ghost sm" onClick={() => { update('profiles', { id: p.id }, { active: true, role: 'admin' }); toast(`${p.full_name} approved as admin`); }}>Approve as admin</button>
            </div>
          </div>
        ))}
      </section>

      <section className="card tight">
        <h2 className="h" style={{ paddingBottom: 6 }}>Team</h2>
        {active.map((p) => (
          <div key={p.id} className="row" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="grow"><span className="t15">{p.full_name}{p.id === me.id ? ' (you)' : ''}</span><span className="t13">{p.email}</span></div>
            <select className="input" style={{ width: 150 }} value={p.role} disabled={p.id === me.id} aria-label={`${p.full_name}'s role`}
              onChange={(e) => { update('profiles', { id: p.id }, { role: e.target.value }); toast('Role updated'); }}>
              <option value="member">Team member</option>
              <option value="admin">Admin</option>
            </select>
            {p.id !== me.id && (
              <button className="btn link sm" style={{ color: 'var(--red)' }} onClick={() => confirm(`Remove ${p.full_name}'s access? Their records stay.`) && update('profiles', { id: p.id }, { active: false })}>Remove</button>
            )}
          </div>
        ))}
      </section>
      <p className="note">Team members can see and update every animal record, book vets and answer enquiries. Admins can also delete record entries, edit the treatment schedule and approve people.</p>
    </Page>
  );
}
