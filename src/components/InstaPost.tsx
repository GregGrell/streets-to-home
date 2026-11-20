import { useEffect, useMemo, useState } from 'react';
import { buildSlides, caption as makeCaption, toBlob, type Slide } from '../lib/instagram';
import { signedUrl, type Row } from '../lib/store';
import { toast } from './ui';

const logoUrl = () => `${location.origin}${location.pathname.replace(/[^/]*$/, '')}logo.png`;

/** Ready-to-post Instagram carousel + caption for an animal that is live on the website. */
export function InstaPost({ a, photos }: { a: Row; photos: Row[] }) {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const auto = useMemo(() => makeCaption(a), [a]);
  const [text, setText] = useState(auto);
  useEffect(() => setText(auto), [auto]);

  const pub = photos.filter((p) => p.is_public);
  const extraPaths = pub.filter((p) => (p.phase ?? 'now') !== 'before' && p.path !== a.photo_path).slice(0, 4).map((p) => p.path);
  const beforePath = pub.find((p) => p.phase === 'before')?.path ?? null;
  const key = [a.id, a.updated_at, a.photo_path, ...extraPaths, beforePath].join('|');

  const build = async () => {
    if (!a.photo_path) return setErr('Add a main photo first.');
    setBusy(true); setErr(null);
    try {
      const [main, before, ...extra] = await Promise.all([signedUrl('photos', a.photo_path), beforePath ? signedUrl('photos', beforePath) : null, ...extraPaths.map((p) => signedUrl('photos', p))]);
      if (!main) throw new Error('photo');
      const s = await buildSlides(a, { main, before, extra: extra.filter(Boolean) as string[], logo: logoUrl() });
      setSlides(s);
      setThumbs(s.map((x) => x.canvas.toDataURL('image/jpeg', 0.6)));
    } catch {
      setErr("Couldn't load the photos. Check you have signal and try again.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { if (navigator.onLine) build(); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const files = async () => Promise.all((slides ?? []).map(async (s) => new File([await toBlob(s.canvas)], s.name, { type: 'image/jpeg' })));
  const copy = () => navigator.clipboard?.writeText(text).then(() => toast('Caption copied'), () => toast('Select the caption and copy it'));

  const share = async () => {
    const fs = await files();
    await navigator.clipboard?.writeText(text).catch(() => {});
    try {
      await navigator.share({ files: fs, text });
      toast('Caption copied too. Paste it into Instagram');
    } catch (e: any) {
      if (e?.name !== 'AbortError') toast("Sharing isn't available here. Use Download instead");
    }
  };

  const download = async () => {
    for (const f of await files()) {
      const url = URL.createObjectURL(f);
      const link = document.createElement('a');
      link.href = url; link.download = f.name; document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      await new Promise((r) => setTimeout(r, 350));
    }
    toast(`${slides?.length} image${slides?.length === 1 ? '' : 's'} downloaded`);
  };

  const canShare = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'x.jpg', { type: 'image/jpeg' })] });

  return (
    <section className="card" id="insta">
      <div className="head">
        <h2 className="h">Instagram post</h2>
        <button className="btn link sm" onClick={build} disabled={busy}>{busy ? 'Making…' : 'Remake'}</button>
      </div>
      <span className="note">Made from the main photo, the bio and the photos ticked "On website". {beforePath ? 'Includes the rescue-day before-and-after. ' : ''}Change those and the post updates.</span>
      {err && <span className="bad">{err}</span>}
      {busy && !slides && <span className="t14">Making the post…</span>}
      {slides && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {thumbs.map((t, i) => <img key={i} src={t} alt={`Slide ${i + 1}`} style={{ width: 150, height: 188, objectFit: 'cover', borderRadius: 10, flexShrink: 0, border: '1px solid var(--line)' }} />)}
        </div>
      )}
      <label className="field">
        <span>Caption</span>
        <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      {text !== auto && <button className="btn link sm" style={{ alignSelf: 'flex-start' }} onClick={() => setText(auto)}>Reset caption</button>}
      <div className="btns" style={{ flexWrap: 'wrap' }}>
        {canShare && <button className="btn" disabled={!slides} onClick={share}>Share to Instagram</button>}
        <button className={canShare ? 'btn ghost' : 'btn'} disabled={!slides} onClick={download}>Download {slides ? `${slides.length} image${slides.length === 1 ? '' : 's'}` : 'images'}</button>
        <button className="btn ghost" onClick={copy}>Copy caption</button>
      </div>
      <span className="note">{canShare ? 'On your phone, "Share to Instagram" opens the share sheet. Pick Instagram, choose Feed, and paste the caption (it is already copied).' : 'Post from your phone to share straight to Instagram, or download the images and caption here.'}</span>
    </section>
  );
}
