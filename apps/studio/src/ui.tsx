import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SCHEME_ROLES, SCHEME_ROLE_LABEL, siteTheme } from '@vystara/core';
import { useStore } from './store';

/** Inklapbaar blok in de inspector; of een blok open of dicht staat, onthoudt de Studio per titel. */
const COLLAPSED_KEY = 'vs-collapsed';
function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '{}');
  } catch {
    return {};
  }
}
export function Section({ title, children, right, defaultClosed }: { title: string; children: ReactNode; right?: ReactNode; defaultClosed?: boolean }) {
  const [closed, setClosed] = useState(() => {
    const v = readCollapsed()[title];
    return v === undefined ? !!defaultClosed : !!v;
  });
  const toggle = () => {
    const next = !closed;
    setClosed(next);
    try {
      const all = readCollapsed();
      all[title] = next;
      localStorage.setItem(COLLAPSED_KEY, JSON.stringify(all));
    } catch { /* geen opslag beschikbaar */ }
  };
  return (
    <div className={`vs-section${closed ? ' closed' : ''}`}>
      <div className="vs-section-head">
        <button type="button" className="vs-section-toggle" onClick={toggle} aria-expanded={!closed}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          <span>{title}</span>
        </button>
        {right}
      </div>
      {!closed && <div className="vs-section-body">{children}</div>}
    </div>
  );
}

export function Row({ label, children, overridden, onReset }: { label?: string; children: ReactNode; overridden?: boolean; onReset?: () => void }) {
  return (
    <div className="vs-row">
      {label !== undefined && (
        <label className={overridden ? 'vs-label vs-overridden' : 'vs-label'} title={overridden ? 'Aangepast voor dit schermformaat — klik om terug te zetten' : undefined} onClick={overridden ? onReset : undefined}>
          {overridden && <span className="vs-dot" />}
          {label}
        </label>
      )}
      <div className="vs-row-fields">{children}</div>
    </div>
  );
}

/** Getalveld dat pas doorgeeft bij Enter/blur of pijltjes, zodat typen soepel blijft. */
export function Num({ value, onChange, placeholder, min, step = 1, suffix, title }: { value: number | undefined; onChange: (v: number | undefined) => void; placeholder?: string; min?: number; step?: number; suffix?: string; title?: string }) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value]);
  const commit = (s: string) => {
    if (s.trim() === '') return onChange(undefined);
    const n = Number(s.replace(',', '.'));
    if (!Number.isNaN(n)) onChange(min !== undefined ? Math.max(min, n) : n);
  };
  return (
    <span className="vs-num" title={title}>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft);
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const d = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? step * 10 : step);
            const n = Math.round(((Number(draft) || 0) + d) * 100) / 100;
            setDraft(String(n));
            commit(String(n));
          }
        }}
      />
      {suffix && <i>{suffix}</i>}
    </span>
  );
}

export function Text({ value, onChange, placeholder, multiline }: { value: string | undefined; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);
  if (multiline)
    return <textarea className="vs-input" rows={4} value={draft} placeholder={placeholder} onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }} />;
  return <input className="vs-input" value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft !== (value ?? '') && onChange(draft)} onKeyDown={(e) => e.key === 'Enter' && onChange(draft)} />;
}

export function Select<T extends string>({ value, options, onChange }: { value: T | undefined; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <select className="vs-input" value={value ?? ''} onChange={(e) => onChange(e.target.value as T)}>
      {value === undefined && <option value="">—</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T | undefined; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="vs-seg">
      {options.map((o) => (
        <button key={o.value} type="button" title={o.title ?? (typeof o.label === 'string' ? o.label : undefined)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="vs-toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

/** Kleur: een rol uit het kleurschema (past zich aan per sectie), een paletkleur, of een eigen kleur. */
const RECENT_KEY = 'vs-recent-colors';
export function recentColors(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
export function pushRecentColor(c: string | undefined) {
  if (!c || c.startsWith('token:')) return;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([c, ...recentColors().filter((x) => x.toLowerCase() !== c.toLowerCase())].slice(0, 12))); } catch { /* geen opslag */ }
}
/** Pipet (Chrome/Edge): kies een kleur van overal op je scherm. */
export async function pickScreenColor(): Promise<string | undefined> {
  const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
  if (!ED) return undefined;
  try { return (await new ED().open()).sRGBHex; } catch { return undefined; }
}
export const hasEyeDropper = () => 'EyeDropper' in window;

export function ColorField({ value, onChange, allowNone = true }: { value: string | undefined; onChange: (v: string | undefined) => void; allowNone?: boolean }) {
  const site = useStore((s) => s.site);
  const theme = site ? siteTheme(site) : null;
  const scheme = theme ? theme.schemes[theme.defaultScheme] ?? Object.values(theme.schemes)[0] : undefined;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const roles = SCHEME_ROLES.map((r) => ({ token: `token:${r}`, label: SCHEME_ROLE_LABEL[r], hex: scheme?.[r] }));
  const pal = Object.entries(theme?.palette ?? {}).map(([k, v]) => ({ token: `token:${k}`, label: k, hex: v }));
  const all = [...roles, ...pal];
  const cur = all.find((x) => x.token === value);
  const shown = cur?.hex ?? (value?.startsWith('#') || value?.startsWith('rgb') ? value : undefined);
  const label = cur ? cur.label : value ? value : 'Geen';
  const pick = (v: string | undefined, close = true) => { pushRecentColor(v); onChange(v); if (close) setOpen(false); };
  const recent = open ? recentColors() : [];
  return (
    <div className="vs-color" ref={ref}>
      <button type="button" className="vs-color-btn" onClick={() => setOpen(!open)} title="Kleur kiezen">
        <span className="vs-swatch" style={{ background: shown ?? 'transparent' }} data-empty={!shown || undefined} />
        <span className="grow">{label}</span>
      </button>
      {open && (
        <div className="vs-color-pop">
          <div className="vs-subhead">Kleurschema (past zich aan per sectie)</div>
          <div className="vs-swatches">
            {roles.map((x) => (
              <button key={x.token} type="button" title={x.label} className={x.token === value ? 'on' : ''} onClick={() => { onChange(x.token); setOpen(false); }}>
                <span className="vs-swatch" style={{ background: x.hex }} />
              </button>
            ))}
          </div>
          {pal.length > 0 && (
            <>
              <div className="vs-subhead">Palet</div>
              <div className="vs-swatches">
                {pal.map((x) => (
                  <button key={x.token} type="button" title={x.label} className={x.token === value ? 'on' : ''} onClick={() => { onChange(x.token); setOpen(false); }}>
                    <span className="vs-swatch" style={{ background: x.hex }} />
                  </button>
                ))}
              </div>
            </>
          )}
          {recent.length > 0 && (
            <>
              <div className="vs-subhead">Recent gebruikt</div>
              <div className="vs-swatches">
                {recent.map((c) => (
                  <button key={c} type="button" title={c} className={c === value ? 'on' : ''} onClick={() => pick(c)}>
                    <span className="vs-swatch" style={{ background: c }} />
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="vs-subhead">Eigen kleur</div>
          <div className="vs-row-fields">
            <input type="color" value={/^#[0-9a-f]{6}$/i.test(shown ?? '') ? shown : '#000000'} onChange={(e) => onChange(e.target.value)} onBlur={(e) => pushRecentColor(e.target.value)} />
            <Text value={value?.startsWith('token:') ? '' : value} placeholder="#hex of rgba()" onChange={(v) => pick(v || undefined, false)} />
            {hasEyeDropper() && (
              <button type="button" className="vs-icon-btn" title="Pipet: kies een kleur van je scherm" onClick={async () => { const c = await pickScreenColor(); if (c) pick(c); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" /></svg>
              </button>
            )}
          </div>
          {allowNone && <button type="button" className="vs-btn" onClick={() => { onChange(undefined); setOpen(false); }}>Geen kleur</button>}
        </div>
      )}
    </div>
  );
}

export function AssetSelect({ value, kind, onChange }: { value: string | undefined; kind: 'image' | 'video'; onChange: (v: string | undefined) => void }) {
  const assets = useStore((s) => s.assets).filter((a) => a.kind === kind);
  const isTemplate = value?.includes('{{');
  return (
    <select className="vs-input" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">Geen</option>
      {isTemplate && <option value={value}>{value}</option>}
      {assets.map((a) => (
        <option key={a.id} value={a.id}>{a.originalName}{a.status === 'processing' ? ' (bezig…)' : ''}</option>
      ))}
    </select>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="vs-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={wide ? 'vs-modal wide' : 'vs-modal'}>
        <div className="vs-modal-head">
          <b>{title}</b>
          <button className="vs-icon-btn" onClick={onClose} title="Sluiten">✕</button>
        </div>
        <div className="vs-modal-body">{children}</div>
      </div>
    </div>
  );
}
