import { useEffect, useRef, useState } from 'react';
import {
  BUTTON_KEYS,
  BUTTON_LABEL,
  GOOGLE_FONTS,
  SCHEME_ROLES,
  SCHEME_ROLE_LABEL,
  SYSTEM_FONTS,
  TEXT_STYLE_KEYS,
  TEXT_STYLE_LABEL,
  THEME_PRESETS,
  siteTheme,
  type ButtonKey,
  type ButtonStyle,
  type FontDef,
  type SiteSettings,
  type TextStyle,
  type TextStyleKey,
  type Theme,
} from '@vystara/core';
import { api } from './api';
import { patchState, saveSite, toast, useStore } from './store';
import { ColorField, Num, Row, Select, Text, Toggle } from './ui';

type Tab = 'gallery' | 'colors' | 'type' | 'buttons' | 'fonts';

export function ThemeModal() {
  const site = useStore((s) => s.site)!;
  const themes = useStore((s) => s.themes);
  const orig = useRef<SiteSettings>(site);
  const [draft, setDraftState] = useState<Theme>(() => structuredClone(siteTheme(site)));
  const [tab, setTab] = useState<Tab>('gallery');
  const [busy, setBusy] = useState(false);

  // Live: het canvas en de voorbeelden gebruiken meteen het concept-thema.
  const setDraft = (t: Theme) => {
    setDraftState(t);
    patchState({ site: { ...useStore.getState().site!, theme: t } });
  };
  const cancel = () => {
    patchState({ site: orig.current, modal: null });
  };
  const apply = async () => {
    setBusy(true);
    try {
      await saveSite({ ...orig.current, theme: draft });
      patchState({ modal: null });
      toast(`Thema "${draft.name}" toegepast. Publiceer om het live te zetten.`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const saveAs = async () => {
    const name = prompt('Naam van je thema', draft.name.endsWith('(eigen)') ? draft.name : `${draft.name} (eigen)`);
    if (!name) return;
    const saved = await api.post<Theme>('/api/themes', { ...draft, name, id: draft.id.startsWith('t_') ? draft.id : undefined });
    patchState({ themes: [saved, ...useStore.getState().themes.filter((t) => t.id !== saved.id)] });
    setDraft(saved);
    toast(`Thema "${name}" opgeslagen`);
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="vs-modal-bg">
      <div className="vs-modal theme">
        <div className="vs-modal-head">
          <b>Thema — {draft.name}</b>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="vs-btn" onClick={saveAs}>Opslaan als eigen thema</button>
            <button className="vs-btn" onClick={cancel}>Annuleren</button>
            <button className="vs-btn primary" onClick={apply} disabled={busy}>Toepassen</button>
          </div>
        </div>
        <div className="vs-theme-body">
          <nav className="vs-theme-nav">
            {([['gallery', 'Galerij'], ['colors', 'Kleuren & schema’s'], ['type', 'Typografie'], ['buttons', 'Knoppen'], ['fonts', 'Lettertypes']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
            <p className="vs-help">Wijzigingen zie je meteen op het canvas. "Toepassen" bewaart ze; publiceren zet ze live.</p>
          </nav>
          <div className="vs-theme-main">
            {tab === 'gallery' && <Gallery current={draft} saved={themes} onPick={(t) => setDraft(structuredClone(t))} onDelete={async (id) => {
              await api.del(`/api/themes/${id}`);
              patchState({ themes: useStore.getState().themes.filter((t) => t.id !== id) });
            }} />}
            {tab === 'colors' && <Colors t={draft} set={setDraft} />}
            {tab === 'type' && <Typography t={draft} set={setDraft} />}
            {tab === 'buttons' && <Buttons t={draft} set={setDraft} />}
            {tab === 'fonts' && <Fonts t={draft} set={setDraft} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Galerij ──────────────────────────────────────────────────
function Swatch({ t }: { t: Theme }) {
  const s = t.schemes[t.defaultScheme] ?? Object.values(t.schemes)[0];
  const h = t.text.h2;
  return (
    <div className="vs-theme-card-art" style={{ background: s.bg, color: s.text }}>
      <div style={{ fontFamily: t.fonts[h.font]?.stack, fontWeight: h.weight, fontSize: 26, letterSpacing: `${h.letterSpacing}em`, color: s.heading, textTransform: h.transform === 'uppercase' ? 'uppercase' : 'none', lineHeight: 1 }}>Aa</div>
      <div style={{ fontFamily: t.fonts.body?.stack, fontSize: 11, opacity: 0.8 }}>Platte tekst</div>
      <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
        {Object.values(t.schemes).map((x, i) => <span key={i} style={{ width: 14, height: 14, borderRadius: 4, background: x.bg, border: `1px solid ${x.line}` }} />)}
        <span style={{ marginLeft: 'auto', background: s.accent, color: s.accentText, borderRadius: t.buttons.primary.radius, padding: '3px 8px', fontSize: 10, fontWeight: 600 }}>Knop</span>
      </div>
    </div>
  );
}

function Gallery({ current, saved, onPick, onDelete }: { current: Theme; saved: Theme[]; onPick: (t: Theme) => void; onDelete: (id: string) => void }) {
  return (
    <>
      <div className="vs-subhead">Kant-en-klare thema’s</div>
      <div className="vs-theme-grid">
        {THEME_PRESETS.map((t) => (
          <button key={t.id} className={`vs-theme-card ${current.id === t.id ? 'on' : ''}`} onClick={() => onPick(t)}>
            <Swatch t={t} />
            <b>{t.name}</b>
          </button>
        ))}
      </div>
      <div className="vs-subhead">Eigen thema’s</div>
      {!saved.length && <p className="vs-help">Pas een thema aan en kies "Opslaan als eigen thema" om het hier te bewaren.</p>}
      <div className="vs-theme-grid">
        {saved.map((t) => (
          <div key={t.id} className={`vs-theme-card ${current.id === t.id ? 'on' : ''}`} onClick={() => onPick(t)}>
            <Swatch t={t} />
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <b className="grow">{t.name}</b>
              <button className="vs-icon-btn" title="Verwijderen" onClick={(e) => { e.stopPropagation(); if (confirm(`Thema "${t.name}" verwijderen?`)) onDelete(t.id); }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Kleuren ──────────────────────────────────────────────────
function Colors({ t, set }: { t: Theme; set: (t: Theme) => void }) {
  const [newName, setNewName] = useState('');
  const setScheme = (k: string, role: string, v: string) => set({ ...t, schemes: { ...t.schemes, [k]: { ...t.schemes[k], [role]: v } } });
  return (
    <>
      <div className="vs-subhead">Kleurschema’s per sectie</div>
      <p className="vs-help">
        Elke sectie kiest een schema (rechts bij "Kleurschema"). Alles erin gebruikt dan deze kleuren: tekst, koppen, knoppen en iconen. Zo maak je in één klik een donkere sectie op een lichte site.
      </p>
      <div className="vs-scheme-table">
        <div className="vs-scheme-row head">
          <span>Schema</span>
          {SCHEME_ROLES.map((r) => <span key={r} title={SCHEME_ROLE_LABEL[r]}>{SCHEME_ROLE_LABEL[r]}</span>)}
          <span>Voorbeeld</span>
        </div>
        {Object.entries(t.schemes).map(([k, sc]) => (
          <div key={k} className="vs-scheme-row">
            <span>
              <input className="vs-input" value={sc.name} onChange={(e) => setScheme(k, 'name', e.target.value)} />
              <label className="vs-toggle" style={{ fontSize: 10.5 }}>
                <input type="radio" checked={t.defaultScheme === k} onChange={() => set({ ...t, defaultScheme: k })} /> standaard
              </label>
            </span>
            {SCHEME_ROLES.map((r) => (
              <span key={r}>
                <input type="color" value={/^#[0-9a-f]{6}/i.test(sc[r]) ? sc[r].slice(0, 7) : '#000000'} onChange={(e) => setScheme(k, r, e.target.value)} title={`${SCHEME_ROLE_LABEL[r]}: ${sc[r]}`} />
              </span>
            ))}
            <span>
              <div className="vs-scheme-sample" style={{ background: sc.bg, color: sc.text, borderColor: sc.line }}>
                <b style={{ color: sc.heading }}>Kop</b> tekst <i style={{ color: sc.muted }}>gedempt</i>
                <span style={{ background: sc.accent, color: sc.accentText }}>Knop</span>
              </div>
            </span>
          </div>
        ))}
      </div>
      <button
        className="vs-btn"
        onClick={() => {
          const key = `schema-${Object.keys(t.schemes).length + 1}`;
          set({ ...t, schemes: { ...t.schemes, [key]: { ...structuredClone(t.schemes[t.defaultScheme]), name: 'Nieuw schema' } } });
        }}
      >
        + Schema toevoegen
      </button>

      <div className="vs-subhead">Palet (extra kleuren)</div>
      <p className="vs-help">Vaste merkkleuren die overal hetzelfde blijven, ongeacht het schema.</p>
      {Object.entries(t.palette).map(([k, v]) => (
        <Row key={k} label={k}>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#000000'} onChange={(e) => set({ ...t, palette: { ...t.palette, [k]: e.target.value } })} />
          <Text value={v} onChange={(x) => set({ ...t, palette: { ...t.palette, [k]: x } })} />
          <button className="vs-icon-btn" title="Verwijderen" onClick={() => { const { [k]: _, ...rest } = t.palette; set({ ...t, palette: rest }); }}>✕</button>
        </Row>
      ))}
      <Row label="">
        <input className="vs-input" placeholder="naam, bv. merk" value={newName} onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
        <button
          className="vs-btn"
          disabled={!newName || (SCHEME_ROLES as string[]).includes(newName) || newName in t.palette}
          onClick={() => { set({ ...t, palette: { ...t.palette, [newName]: '#888888' } }); setNewName(''); }}
        >
          Toevoegen
        </button>
      </Row>
      <Row label="Hoeken">
        <Num value={t.radius} min={0} suffix="px" onChange={(v) => set({ ...t, radius: v ?? 0 })} />
      </Row>
    </>
  );
}

// ── Typografie ───────────────────────────────────────────────
function Typography({ t, set }: { t: Theme; set: (t: Theme) => void }) {
  const upd = (k: TextStyleKey, p: Partial<TextStyle>) => set({ ...t, text: { ...t.text, [k]: { ...t.text[k], ...p } } });
  const fontOpts = Object.entries(t.fonts).map(([k, f]) => ({ value: k, label: `${k} — ${f.family}` }));
  return (
    <>
      <Row label="">
        <Toggle value={t.fluid !== false} onChange={(v) => set({ ...t, fluid: v })} label="Vloeiend meeschalen met de schermbreedte (aanbevolen)" />
      </Row>
      <p className="vs-help">Met vloeiend schalen groeit tekst geleidelijk van de mobiele naar de desktopgrootte, en op hele grote schermen nog iets verder. Zonder vloeiend schalen springt het per schermformaat.</p>
      <div className="vs-type-list">
        {TEXT_STYLE_KEYS.map((k) => {
          const s = t.text[k];
          return (
            <div key={k} className="vs-type-row">
              <div className="vs-board vs-type-sample">
                <span className={`ts-${k}`} style={{ fontSize: Math.min(s.size, 56) }}>{TEXT_STYLE_LABEL[k]}</span>
              </div>
              <div className="vs-type-fields">
                <Row label="Lettertype"><Select value={s.font} onChange={(v) => upd(k, { font: v })} options={fontOpts} /></Row>
                <Row label="Grootte">
                  <Num value={s.size} min={6} suffix="desktop" onChange={(v) => upd(k, { size: v ?? s.size })} />
                  <Num value={s.sizeTablet} min={6} placeholder="—" suffix="tablet" onChange={(v) => upd(k, { sizeTablet: v })} />
                  <Num value={s.sizeMobile} min={6} placeholder="—" suffix="mobiel" onChange={(v) => upd(k, { sizeMobile: v })} />
                </Row>
                <Row label="Gewicht / regel">
                  <Select value={String(s.weight)} onChange={(v) => upd(k, { weight: Number(v) })} options={['300', '400', '500', '600', '700', '800', '900'].map((w) => ({ value: w, label: w }))} />
                  <Num value={s.lineHeight} step={0.05} min={0.7} onChange={(v) => upd(k, { lineHeight: v ?? s.lineHeight })} title="Regelhoogte" />
                  <Num value={s.letterSpacing} step={0.005} suffix="em" onChange={(v) => upd(k, { letterSpacing: v ?? 0 })} title="Letterafstand" />
                </Row>
                <Row label="Kleur / vorm">
                  <Select value={s.color ?? 'text'} onChange={(v) => upd(k, { color: v })} options={[{ value: 'heading', label: 'Kopkleur' }, { value: 'text', label: 'Tekstkleur' }, { value: 'muted', label: 'Gedempt' }, { value: 'accent', label: 'Accent' }]} />
                  <Select value={s.transform ?? 'none'} onChange={(v) => upd(k, { transform: v })} options={[{ value: 'none', label: 'Aa' }, { value: 'uppercase', label: 'AA' }, { value: 'lowercase', label: 'aa' }]} />
                  <Toggle value={!!s.italic} onChange={(v) => upd(k, { italic: v || undefined })} label="Cursief" />
                </Row>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Knoppen ──────────────────────────────────────────────────
function Buttons({ t, set }: { t: Theme; set: (t: Theme) => void }) {
  const upd = (k: ButtonKey, p: Partial<ButtonStyle>) => set({ ...t, buttons: { ...t.buttons, [k]: { ...t.buttons[k], ...p } } });
  return (
    <>
      <div className="vs-board vs-btn-preview">
        {BUTTON_KEYS.map((k) => <a key={k} className={`btn-${k}`}>{BUTTON_LABEL[k]}</a>)}
      </div>
      <p className="vs-help">Zo zien knoppen eruit in het standaardschema. Gebruik kleuren uit het schema (bijv. Accent), dan passen knoppen zich per sectie aan.</p>
      {BUTTON_KEYS.map((k) => {
        const b = t.buttons[k];
        return (
          <div key={k} className="vs-fx-block" style={{ marginBottom: 10 }}>
            <div className="vs-fx-head"><span>{BUTTON_LABEL[k]}</span></div>
            <div className="vs-modal-cols">
              <div>
                <Row label="Vulling"><ColorField value={b.bg} onChange={(v) => upd(k, { bg: v ?? 'transparent' })} /></Row>
                <Row label="Tekst"><ColorField value={b.text} onChange={(v) => upd(k, { text: v ?? 'token:text' })} allowNone={false} /></Row>
                <Row label="Rand"><ColorField value={b.border} onChange={(v) => upd(k, { border: v ?? 'transparent' })} /><Num value={b.borderWidth} min={0} suffix="px" onChange={(v) => upd(k, { borderWidth: v ?? 0 })} /></Row>
                <Row label="Hover vulling"><ColorField value={b.hoverBg} onChange={(v) => upd(k, { hoverBg: v })} /></Row>
                <Row label="Hover tekst"><ColorField value={b.hoverText} onChange={(v) => upd(k, { hoverText: v })} /></Row>
              </div>
              <div>
                <Row label="Hoeken"><Num value={b.radius} min={0} suffix="px" onChange={(v) => upd(k, { radius: v ?? 0 })} /></Row>
                <Row label="Ruimte"><Num value={b.padX} min={0} suffix="↔" onChange={(v) => upd(k, { padX: v ?? 0 })} /><Num value={b.padY} min={0} suffix="↕" onChange={(v) => upd(k, { padY: v ?? 0 })} /></Row>
                <Row label="Tekst"><Num value={b.fontSize} min={8} suffix="px" onChange={(v) => upd(k, { fontSize: v ?? 15 })} /><Select value={String(b.weight)} onChange={(v) => upd(k, { weight: Number(v) })} options={['400', '500', '600', '700', '800'].map((w) => ({ value: w, label: w }))} /></Row>
                <Row label="Lettertype"><Select value={b.font} onChange={(v) => upd(k, { font: v })} options={Object.keys(t.fonts).map((f) => ({ value: f, label: f }))} /></Row>
                <Row label=""><Toggle value={b.transform === 'uppercase'} onChange={(v) => upd(k, { transform: v ? 'uppercase' : 'none', letterSpacing: v ? 0.08 : 0 })} label="Hoofdletters" /></Row>
                <Row label=""><Toggle value={!!b.hoverLift} onChange={(v) => upd(k, { hoverLift: v || undefined })} label="Optillen bij hover" /></Row>
                <Row label=""><Toggle value={!!b.underline} onChange={(v) => upd(k, { underline: v || undefined })} label="Onderstreept" /></Row>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── Lettertypes ──────────────────────────────────────────────
function Fonts({ t, set }: { t: Theme; set: (t: Theme) => void }) {
  const assets = useStore((s) => s.assets).filter((a) => a.kind === 'font');
  const [busy, setBusy] = useState<string | null>(null);
  const put = (k: string, f: FontDef) => set({ ...t, fonts: { ...t.fonts, [k]: f } });
  const google = async (k: string, family: string) => {
    setBusy(k);
    try {
      const f = await api.post<FontDef>('/api/fonts/google', { family });
      put(k, f);
      toast(`${family} gedownload en wordt nu vanaf je eigen server geladen`);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };
  const LABEL: Record<string, string> = { display: 'Koppen (display)', body: 'Platte tekst (body)', mono: 'Mono (labels/code)' };
  return (
    <>
      <p className="vs-help">
        Google Fonts worden door je server gedownload en zelf gehost: bezoekers maken geen verbinding met Google (beter voor privacy en de AVG). Eigen fonts (WOFF2, WOFF, TTF, OTF) upload je bij Assets.
      </p>
      {Object.entries(t.fonts).map(([k, f]) => (
        <div key={k} className="vs-fx-block" style={{ marginBottom: 10 }}>
          <div className="vs-fx-head">
            <span>{LABEL[k] ?? k}</span>
            <span className="vs-muted">{f.source === 'google' ? 'Google (zelf gehost)' : f.source === 'upload' ? 'Geüpload' : 'Systeem'}</span>
          </div>
          <div style={{ fontFamily: f.stack, fontSize: 28, lineHeight: 1.2 }}>{f.family} — Aa Bb 123</div>
          <Row label="Systeem">
            <select className="vs-input" value={f.source === 'system' ? f.stack : ''} onChange={(e) => { const s = SYSTEM_FONTS.find((x) => x.stack === e.target.value); if (s) put(k, { family: s.family, stack: s.stack, source: 'system' }); }}>
              <option value="">Kies…</option>
              {SYSTEM_FONTS.map((s) => <option key={s.stack} value={s.stack}>{s.family}</option>)}
            </select>
          </Row>
          <Row label="Google Fonts">
            <select className="vs-input" value="" disabled={busy === k} onChange={(e) => e.target.value && google(k, e.target.value)}>
              <option value="">{busy === k ? 'Downloaden…' : 'Kies om te downloaden…'}</option>
              {(['sans', 'display', 'serif', 'mono'] as const).map((kind) => (
                <optgroup key={kind} label={{ sans: 'Sans-serif', display: 'Display', serif: 'Serif', mono: 'Mono' }[kind]}>
                  {GOOGLE_FONTS.filter((g) => g.kind === kind).map((g) => <option key={g.family} value={g.family}>{g.family}</option>)}
                </optgroup>
              ))}
            </select>
          </Row>
          <Row label="Andere naam">
            <Text value="" placeholder="Google-fontnaam, bv. Rubik" onChange={(v) => v && google(k, v)} />
          </Row>
          <Row label="Geüpload">
            <select
              className="vs-input"
              value=""
              onChange={(e) => {
                const a = assets.find((x) => x.id === e.target.value);
                if (!a) return;
                const family = a.originalName.replace(/\.[^.]+$/, '').replace(/[-_](regular|bold|medium|light|black|italic|\d+)$/i, '');
                const italic = /italic/i.test(a.originalName);
                const weight = /black|900/i.test(a.originalName) ? '900' : /bold|700/i.test(a.originalName) ? '700' : /semi|600/i.test(a.originalName) ? '600' : /medium|500/i.test(a.originalName) ? '500' : /light|300/i.test(a.originalName) ? '300' : /variable|\[/i.test(a.originalName) ? '100 900' : '400';
                const files = f.source === 'upload' && f.family === family ? [...(f.files ?? [])] : [];
                files.push({ url: a.url, weight, style: italic ? 'italic' : 'normal' });
                put(k, { family, stack: `"${family}", ${SYSTEM_FONTS[0].stack}`, source: 'upload', files });
              }}
            >
              <option value="">{assets.length ? 'Kies een fontbestand…' : 'Nog geen fonts geüpload'}</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.originalName}</option>)}
            </select>
          </Row>
          {f.source === 'upload' && (f.files ?? []).map((file, i) => (
            <Row key={i} label={i === 0 ? 'Bestanden' : ''}>
              <span className="grow vs-muted">{file.url.split('/').slice(-2).join('/')}</span>
              <Text value={file.weight} onChange={(v) => put(k, { ...f, files: f.files!.map((x, j) => (j === i ? { ...x, weight: v } : x)) })} />
              <Select value={file.style} onChange={(v) => put(k, { ...f, files: f.files!.map((x, j) => (j === i ? { ...x, style: v } : x)) })} options={[{ value: 'normal', label: 'Normaal' }, { value: 'italic', label: 'Cursief' }]} />
            </Row>
          ))}
        </div>
      ))}
    </>
  );
}
