// Kolommenraster over het canvas (zoals layout grids in Figma). Shift+G zet het aan en uit.
import { useEffect, useState } from 'react';
import type { Breakpoint } from '@vystara/core';

export interface GridDef { cols: number; gutter: number; margin: number; max: number }
interface GridState { on: boolean; color: string; bp: Record<Breakpoint, GridDef> }

const KEY = 'vs-grid';
const DEFAULT: GridState = {
  on: false,
  color: '#ff4d6d',
  bp: {
    desktop: { cols: 12, gutter: 24, margin: 40, max: 1280 },
    tablet: { cols: 8, gutter: 20, margin: 32, max: 1280 },
    mobile: { cols: 4, gutter: 16, margin: 20, max: 1280 },
  },
};

function read(): GridState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    return s?.bp ? { ...DEFAULT, ...s, bp: { ...DEFAULT.bp, ...s.bp } } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}
function write(s: GridState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* geen opslag */ }
  window.dispatchEvent(new Event('vs-grid'));
}
export function toggleGrid() {
  const s = read();
  write({ ...s, on: !s.on });
}
function useGrid(): GridState {
  const [s, set] = useState(read);
  useEffect(() => {
    const f = () => set(read());
    window.addEventListener('vs-grid', f);
    return () => window.removeEventListener('vs-grid', f);
  }, []);
  return s;
}

/** Het raster zelf, binnen het bord (in echte CSS-pixels van de pagina). */
export function GridOverlay({ bp }: { bp: Breakpoint }) {
  const s = useGrid();
  if (!s.on) return null;
  const g = s.bp[bp];
  return (
    <div className="vs-grid" aria-hidden="true" style={{ paddingInline: g.margin }}>
      <div style={{ maxWidth: g.max, margin: '0 auto', height: '100%', display: 'grid', gridTemplateColumns: `repeat(${g.cols}, 1fr)`, columnGap: g.gutter }}>
        {Array.from({ length: g.cols }, (_, i) => <i key={i} style={{ background: `${s.color}12`, borderInline: `1px solid ${s.color}30` }} />)}
      </div>
    </div>
  );
}

/** Knop in de werkbalk met de instellingen per schermformaat. */
export function GridButton({ bp }: { bp: Breakpoint }) {
  const s = useGrid();
  const [open, setOpen] = useState(false);
  const g = s.bp[bp];
  const set = (k: keyof GridDef, v: number) => write({ ...s, bp: { ...s.bp, [bp]: { ...g, [k]: Math.max(k === 'cols' ? 1 : 0, Math.min(k === 'cols' ? 24 : 4000, v || 0)) } } });
  return (
    <div className="vs-gridbtn">
      <button className={`vs-icon-btn ${s.on ? 'on' : ''}`} title="Kolommenraster (Shift+G)" onClick={toggleGrid} onContextMenu={(e) => { e.preventDefault(); setOpen(!open); }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M15 3v18" /></svg>
      </button>
      <button className="vs-icon-btn vs-gridbtn-more" title="Raster instellen" onClick={() => setOpen(!open)}>▾</button>
      {open && (
        <div className="vs-gridpop" onMouseLeave={() => setOpen(false)}>
          <b>Raster · {bp === 'desktop' ? 'desktop' : bp === 'tablet' ? 'tablet' : 'mobiel'}</b>
          {([['cols', 'Kolommen'], ['gutter', 'Tussenruimte'], ['margin', 'Marge'], ['max', 'Max. breedte']] as [keyof GridDef, string][]).map(([k, label]) => (
            <label key={k}>
              <span>{label}</span>
              <input className="vs-input" type="number" value={g[k]} onChange={(e) => set(k, Number(e.target.value))} onKeyDown={(e) => e.stopPropagation()} />
            </label>
          ))}
          <label><span>Kleur</span><input type="color" value={s.color} onChange={(e) => write({ ...s, color: e.target.value })} /></label>
          <label className="vs-check"><input type="checkbox" checked={s.on} onChange={toggleGrid} /> Tonen</label>
        </div>
      )}
    </div>
  );
}
