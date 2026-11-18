// Kleuren uit een afbeelding halen (logo, panel, foto) en in het thema gebruiken.
import { useRef, useState } from 'react';
import type { Theme } from '@vystara/core';
import { uploadFile } from './api';
import { refreshAssets, toast, useStore } from './store';

const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const sat = (c: number[]) => { const mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };

/** Eenvoudige k-means op een verkleinde versie van de afbeelding: de belangrijkste kleuren, meest voorkomend eerst. */
async function extract(url: string, k = 6): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const S = 72;
  const c = document.createElement('canvas');
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  c.width = ratio >= 1 ? S : Math.round(S * ratio);
  c.height = ratio >= 1 ? Math.round(S / ratio) : S;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const px: number[][] = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return [];
  // Startpunten verspreid over licht → donker.
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  let cent = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) / k) * sorted.length)]]);
  let groups: number[][][] = [];
  for (let it = 0; it < 12; it++) {
    groups = cent.map(() => []);
    for (const p of px) {
      let best = 0, bd = Infinity;
      cent.forEach((c0, j) => { const dd = (p[0] - c0[0]) ** 2 + (p[1] - c0[1]) ** 2 + (p[2] - c0[2]) ** 2; if (dd < bd) { bd = dd; best = j; } });
      groups[best].push(p);
    }
    cent = groups.map((g, j) => (g.length ? [0, 1, 2].map((ch) => g.reduce((s, p) => s + p[ch], 0) / g.length) : cent[j]));
  }
  // Bijna dezelfde kleuren samenvoegen.
  const out: { c: number[]; n: number }[] = [];
  cent.forEach((c0, j) => {
    const near = out.find((o) => Math.hypot(o.c[0] - c0[0], o.c[1] - c0[1], o.c[2] - c0[2]) < 28);
    if (near) near.n += groups[j].length;
    else if (groups[j].length) out.push({ c: c0, n: groups[j].length });
  });
  return out.sort((a, b) => b.n - a.n).map((o) => hex(o.c[0], o.c[1], o.c[2]));
}

const contrastText = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return lum([(n >> 16) & 255, (n >> 8) & 255, n & 255]) > 150 ? '#111111' : '#ffffff';
};

export function ImagePalette({ t, set }: { t: Theme; set: (t: Theme) => void }) {
  const assets = useStore((s) => s.assets).filter((a) => a.kind === 'image');
  const [colors, setColors] = useState<string[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (url: string) => {
    setBusy(true);
    try {
      const c = await extract(url);
      setColors(c);
      // Voorstel voor de accentkleur: de meest verzadigde, niet te donker of te licht.
      const rgb = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
      const acc = [...c].filter((h) => { const l = lum(rgb(h)); return l > 40 && l < 225; }).sort((a, b) => sat(rgb(b)) - sat(rgb(a)))[0];
      setPick(acc ?? c[0] ?? null);
      if (!c.length) toast('Geen kleuren gevonden in deze afbeelding', 'error');
    } catch {
      toast('Deze afbeelding kon niet gelezen worden', 'error');
    } finally {
      setBusy(false);
    }
  };

  const addPalette = () => {
    const pal = { ...t.palette };
    colors.forEach((c, i) => { pal[`beeld-${i + 1}`] = c; });
    set({ ...t, palette: pal });
    toast(`${colors.length} kleuren toegevoegd aan het palet`);
  };
  const useAccent = () => {
    if (!pick) return;
    const schemes = Object.fromEntries(Object.entries(t.schemes).map(([k, s]) => [k, k === 'accent' ? { ...s, bg: pick, surface: pick, heading: contrastText(pick), text: contrastText(pick) } : { ...s, accent: pick, accentText: contrastText(pick) }]));
    set({ ...t, schemes });
    toast('Accentkleur toegepast op alle schema’s');
  };

  return (
    <>
      <div className="vs-subhead">Kleuren uit een afbeelding</div>
      <p className="vs-help">Kies je logo, een panel of een foto. Folio haalt de belangrijkste kleuren eruit.</p>
      <div className="vs-imgpal-pick">
        {assets.slice(0, 18).map((a) => (
          <button key={a.id} title={a.originalName} onClick={() => void run(a.variants[0]?.url ?? a.url)}>
            <img src={a.variants[0]?.url ?? a.url} alt="" />
          </button>
        ))}
        <button className="vs-imgpal-up" title="Afbeelding uploaden" onClick={() => input.current?.click()}>+</button>
        <input ref={input} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { const a = await uploadFile(f); await refreshAssets(); await run(a.variants[0]?.url ?? a.url); } catch (err) { toast((err as Error).message, 'error'); setBusy(false); }
        }} />
      </div>
      {busy && <p className="vs-help">Kleuren zoeken…</p>}
      {!!colors.length && (
        <>
          <div className="vs-imgpal-colors">
            {colors.map((c) => (
              <button key={c} className={pick === c ? 'on' : ''} style={{ background: c, color: contrastText(c) }} onClick={() => setPick(c)} title={c}>{c}</button>
            ))}
          </div>
          <div className="vs-btnrow">
            <button className="vs-btn" onClick={addPalette}>Alles aan palet toevoegen</button>
            <button className="vs-btn primary" disabled={!pick} onClick={useAccent}>Gekozen kleur als accent</button>
          </div>
        </>
      )}
    </>
  );
}
