import { useEffect, useState } from 'react';
import { STATUS } from '../lib/animals';
import { useTable } from '../lib/hooks';
import { update, type Row } from '../lib/store';
import { toast } from '../components/ui';
import { InstaPost } from '../components/InstaPost';

const GOOD: [string, string][] = [['good_with_kids', 'Children'], ['good_with_dogs', 'Dogs'], ['good_with_cats', 'Cats']];

/** What the public website shows for this animal. Nothing here touches the medical record. */
export function Website({ a }: { a: Row }) {
  const media = useTable('animal_files').filter((f) => f.animal_id === a.id && (f.kind === 'photo' || f.kind === 'video'));
  const files = media.filter((f) => f.kind === 'photo');
  const publicVideos = media.filter((f) => f.kind === 'video' && f.is_public);
  const blank = () => ({
    public_bio: a.public_bio ?? '', intake_story: a.intake_story ?? '',
    good_with_kids: a.good_with_kids ?? 'unknown', good_with_dogs: a.good_with_dogs ?? 'unknown', good_with_cats: a.good_with_cats ?? 'unknown',
    show_in_happy_tails: a.show_in_happy_tails ?? true,
  });
  const [f, setF] = useState(blank);
  useEffect(() => setF(blank()), [a.id, a.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = JSON.stringify(f) !== JSON.stringify(blank());
  const listable = STATUS[a.status]?.listable;
  const onSite = a.published && listable;
  const publicPhotos = files.filter((x) => x.is_public).length;

  const publish = (on: boolean) => {
    if (on && !a.photo_path) return toast('Add a main photo first (Photos & files)');
    if (on && !a.public_bio?.trim() && !f.public_bio.trim()) return toast('Write a short bio first');
    update('animals', { id: a.id }, { ...(dirty ? f : {}), published: on, updated_at: new Date().toISOString() });
    toast(on ? (listable ? `${a.name} is now on the website. Instagram post below` : 'Ticked. Shows on the website when status is With us or Foster') : `${a.name} taken off the website`);
    if (on && listable) setTimeout(() => document.getElementById('insta')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 600);
  };

  return (
    <>
      <section className="card" style={{ borderColor: onSite ? 'var(--sage)' : undefined }}>
        <div className="head">
          <h2 className="h">Available for adoption</h2>
          <span className="chip" style={onSite ? { background: 'var(--sage-tint)', color: 'var(--sage)' } : { background: 'var(--line-2)', color: 'var(--ink-2)' }}>{onSite ? 'Live on website' : 'Not on website'}</span>
        </div>
        <label style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 16, fontWeight: 700, minHeight: 48 }}>
          <input type="checkbox" checked={!!a.published} onChange={(e) => publish(e.target.checked)} style={{ width: 26, height: 26, accentColor: 'var(--sage)' }} />
          Show {a.name} on the website
        </label>
        {a.published && !listable && (
          <span className="warn">Hidden while status is "{STATUS[a.status]?.label}". Only animals that are With us or at a Foster are listed.{a.status === 'adopted' && a.show_in_happy_tails ? ' Shown in Happy Tails instead.' : ''}</span>
        )}
        <span className="note">The website only ever sees the name, breed, sex, age, neutered, the bio below and photos and videos you tick "On website". Medical records, microchip, contacts and notes are never shown.</span>
      </section>

      {onSite && <InstaPost a={a} photos={files} videos={publicVideos} />}

      <section className="card">
        <label className="field">
          <span>Bio for the website</span>
          <textarea rows={5} maxLength={1500} value={f.public_bio} onChange={(e) => setF({ ...f, public_bio: e.target.value })} placeholder="Personality, energy level, what kind of home would suit…" />
        </label>
        <label className="field">
          <span>Rescue story · optional</span>
          <textarea rows={3} maxLength={1500} value={f.intake_story} onChange={(e) => setF({ ...f, intake_story: e.target.value })} placeholder="Where they were found and how far they've come" />
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="t15">Good with</span>
          {GOOD.map(([k, l]) => (
            <div key={k} className="grid2" style={{ gridTemplateColumns: '90px 1fr', alignItems: 'center' }}>
              <span className="t14">{l}</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
                {(['yes', 'no', 'unknown'] as const).map((v) => (
                  <button key={v} type="button" className="seg" style={{ minHeight: 40, fontSize: 14 }} aria-pressed={(f as any)[k] === v} onClick={() => setF({ ...f, [k]: v })}>
                    {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Not sure'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={f.show_in_happy_tails} onChange={(e) => setF({ ...f, show_in_happy_tails: e.target.checked })} style={{ width: 20, height: 20 }} />
          Show in Happy Tails once adopted
        </label>
        <span className="note">{publicPhotos} photo{publicPhotos === 1 ? '' : 's'}{publicVideos.length ? ` and ${publicVideos.length} video${publicVideos.length === 1 ? '' : 's'}` : ''} ticked "On website" plus the main photo. Tick more under Photos &amp; files, and mark rescue-day photos as "Before" for the before-and-after.</span>
        <button className="btn" disabled={!dirty} onClick={() => { update('animals', { id: a.id }, { ...f, public_bio: f.public_bio.trim(), intake_story: f.intake_story.trim(), updated_at: new Date().toISOString() }); toast('Saved'); }}>
          {dirty ? 'Save website details' : 'No changes'}
        </button>
      </section>
    </>
  );
}
