import { Icon } from './icons';
import { useEffect, useState } from 'react';
import { BREAKPOINT_CANVAS, findNode, type Breakpoint, type FrameNode, type SiteSettings } from '@vystara/core';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { LeftPanel } from './LeftPanel';
import {
  copySelection,
  copyStyle,
  flipSelection,
  moveToEdge,
  nudgePosition,
  pasteStyle,
  resetTransform,
  rotateSelection,
  nudgeFontSize,
  alignSelection,
  distributeSelection,
  paste,
  createComponentFromSelection,
  deleteSelection,
  docTitle,
  duplicateSelection,
  flushSave,
  insertType,
  mutate,
  nudgeOrder,
  patchState,
  redo,
  select,
  toast,
  toggleAutoLayout,
  undo,
  unwrapFrame,
  useStore,
  wrapInFrame,
} from './store';
import { api } from './api';
import { Modal, Row, Select, Text, Toggle } from './ui';
import { Rulers, toggleRulers } from './Rulers';
import { edition, isFolio } from './edition';
import { LANGUAGES, extraLangs, mainLang, translationProgress } from '@vystara/core';
import { ThemeModal } from './ThemeModal';
import { AccessModal, HostingModal } from './Hosting';
import { Breadcrumbs, CommandPalette, ContextMenu, SaveSectionModal } from './Overlays';
import { findParent } from '@vystara/core';

export function Editor({ onLogout }: { onLogout: () => void }) {
  const { bp, zoom, save, toast: t, modal, doc, unread, site } = useStore();
  const lock = site?.access?.mode ?? 'open';
  const [publishing, setPublishing] = useState(false);
  useShortcuts();
  // Nieuwe formulierinzendingen tellen (elke minuut).
  useEffect(() => {
    const check = () => void api.get<{ read: boolean }[]>('/api/submissions').then((l) => patchState({ unread: l.filter((x) => !x.read).length })).catch(() => {});
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  const publish = async () => {
    setPublishing(true);
    try {
      await flushSave();
      const r = await api.post<{ pages: number; projects: number; files: number; durationMs: number; commandOutput?: string; deploy?: { ok: boolean; message: string } | null }>('/api/publish');
      toast(`Gepubliceerd: ${r.pages} pagina's, ${r.projects} projecten, ${r.files} bestanden${r.deploy ? ` · GitHub: ${r.deploy.message}${r.deploy.ok ? ' → Vercel zet hem binnen ±1 minuut live' : ''}` : ''}`, r.deploy && !r.deploy.ok ? 'error' : 'info');
      if (r.commandOutput) console.info(r.commandOutput);
    } catch (e) {
      toast(`Publiceren mislukt: ${(e as Error).message}`, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const preview = async () => {
    await flushSave();
    if (!doc) return;
    window.open(doc.kind === 'project' ? `/api/preview/project/${doc.id}` : doc.kind === 'page' ? `/api/preview/page/${doc.id}` : '/', '_blank');
  };

  return (
    <div className="vs-app">
      <header className="vs-top">
        <div className="vs-top-left">
          {(window as unknown as { folio?: { home: () => void } }).folio && (
            <button className="vs-icon-btn vs-home" title="Mijn websites (Ctrl+Shift+H)" onClick={async () => { await flushSave(); (window as unknown as { folio: { home: () => void } }).folio.home(); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
            </button>
          )}
          <span className="vs-brand" aria-hidden="true">{edition.productName[0]}</span>
          <div className="vs-brand-text">
            <b>{isFolio() ? useStore.getState().site?.name ?? 'Folio' : edition.productName}</b>
            <span className="vs-doc-title">{docTitle()}</span>
          </div>
        </div>
        <div className="vs-top-center">
          <div className="vs-toolgroup" role="toolbar" aria-label="Invoegen">
            <ToolButton icon="frame" label="Frame" keyHint="F" onClick={() => insertType('frame')} />
            <ToolButton icon="text" label="Tekst" keyHint="T" onClick={() => insertType('text')} />
            <ToolButton icon="image" label="Afbeelding" onClick={() => insertType('image')} />
            <ToolButton icon="video" label="Video" onClick={() => insertType('video')} />
            <ToolButton icon="button" label="Knop" onClick={() => insertType('button')} />
            <ToolButton icon="grid" label="Projecten-grid" onClick={() => insertType('collection')} />
            <ToolButton icon="shapes" label="Icoon of vorm" onClick={() => insertType('svg')} />
            <span className="vs-toolsep" />
            <button className="vs-tool vs-tool-accent" onClick={() => patchState({ leftTab: 'insert' })} title="Sectie-bibliotheek"><Icon name="section" /> <span>Sectie</span></button>
            <button className="vs-tool" onClick={() => patchState({ palette: true })} title="Alle acties (Ctrl+K)"><Icon name="command" /></button>
          </div>
          <div className="vs-seg vs-bp" role="group" aria-label="Schermformaat">
            {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map((b) => (
              <button key={b} className={b === bp ? 'on' : ''} onClick={() => patchState({ bp: b })} title={`${b === 'desktop' ? 'Desktop' : b === 'tablet' ? 'Tablet' : 'Mobiel'} · ${BREAKPOINT_CANVAS[b]}px`}>
                <Icon name={b} />
              </button>
            ))}
          </div>
          <LangSwitch />
          <select className="vs-input vs-zoom" value={zoom} onChange={(e) => patchState({ zoom: Number(e.target.value) })} title="Zoom">
            {[...new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5, zoom])].sort((a, b) => a - b).map((z) => (
              <option key={z} value={z}>{Math.round(z * 100)}%</option>
            ))}
          </select>
        </div>
        <div className="vs-top-right">
          <StarterPill />
          <span className={`vs-save vs-save-${save}`} title="Alles wordt vanzelf opgeslagen"><i />{{ saved: 'Opgeslagen', dirty: 'Wijzigingen…', saving: 'Opslaan…', error: 'Niet opgeslagen' }[save]}</span>
          <div className="vs-iconbar">
            <button className="vs-icon-btn" title="Thema: kleuren, tekst, knoppen, lettertypes" onClick={() => patchState({ modal: 'theme' })}><Icon name="palette" /></button>
            <button className={`vs-icon-btn vs-lock ${lock !== 'open' ? 'locked' : ''}`} title={lock === 'open' ? 'Site is open — klik om te vergrendelen of een live voorbeeld te delen' : lock === 'password' ? 'Site is beveiligd met wachtwoord' : 'Onderhoudsmodus staat aan'} onClick={() => patchState({ modal: 'access' })}>
              <Icon name={lock === 'open' ? 'unlock' : 'lock'} />
            </button>
            <button className="vs-icon-btn vs-inbox" title="Formulierinzendingen" onClick={() => patchState({ modal: 'inbox' })}><Icon name="inbox" />{unread > 0 && <b>{unread}</b>}</button>
            <button className="vs-icon-btn" title="Sneltoetsen (?)" onClick={() => patchState({ modal: 'shortcuts' })}><span style={{ fontWeight: 700, fontSize: 14 }}>?</span></button>
            <button className="vs-icon-btn" title="Versiegeschiedenis" onClick={() => patchState({ modal: 'history' })}><Icon name="history" /></button>
            <button className="vs-icon-btn vs-settings" title="Site-instellingen" onClick={() => patchState({ modal: 'site' })}><Icon name="settings" /><span>Instellingen</span></button>
          </div>
          <button className="vs-btn ghost" onClick={preview} title="Deze pagina als voorbeeld"><Icon name="eye" /><span className="vs-label-opt">Voorbeeld</span></button>
          <button className="vs-btn ghost" onClick={async () => { await flushSave(); window.open('/preview/', 'vystara-preview'); }} title="Live voorbeeld van de hele site, ververst vanzelf"><Icon name="globe" /><span className="vs-label-opt">Live</span></button>
          <div className="vs-publish">
            <button className="vs-btn primary" onClick={publish} disabled={publishing}><Icon name="send" /> {publishing ? 'Bezig…' : 'Publiceren'}</button>
            <button className="vs-btn primary vs-publish-more" title="Publiceren & hosting (GitHub + Vercel)" onClick={() => patchState({ modal: 'hosting' })}><Icon name="chevron" size={14} /></button>
          </div>
          <button className="vs-icon-btn" title="Uitloggen" onClick={onLogout}><Icon name="logout" /></button>
        </div>
      </header>
      <LeftPanel />
      <main className="vs-center">
        <Canvas />
        <Rulers />
        <Breadcrumbs />
      </main>
      <Inspector />
      {t && <div className={`vs-toast ${t.kind}`}>{t.text}</div>}
      {modal === 'site' && <SiteModal />}
      {modal === 'shortcuts' && <ShortcutsModal />}
      {modal === 'history' && <HistoryModal />}
      {modal === 'inbox' && <InboxModal />}
      {modal === 'theme' && <ThemeModal />}
      {modal === 'hosting' && <HostingModal />}
      {modal === 'access' && <AccessModal />}
      {modal === 'save-section' && <SaveSectionModal />}
      {lock !== 'open' && <div className="vs-lock-bar">🔒 {lock === 'password' ? 'De site is beveiligd met een wachtwoord' : 'Onderhoudsmodus: bezoekers zien een "zo terug"-pagina'} · <button onClick={() => patchState({ modal: 'access' })}>Wijzigen</button></div>}
      <ContextMenu />
      <CommandPalette />
    </div>
  );
}

function ToolButton({ icon, label, keyHint, onClick }: { icon: string; label: string; keyHint?: string; onClick: () => void }) {
  return (
    <button className="vs-tool" onClick={onClick} title={keyHint ? `${label} (${keyHint})` : label} aria-label={label}>
      <Icon name={icon} />
    </button>
  );
}

// ── Sneltoetsen (zoals Figma waar het kan) ───────────────────
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (mod && k === 'k') {
        e.preventDefault();
        patchState({ palette: !useStore.getState().palette });
        return;
      }
      if (mod && e.altKey && k === 's') {
        e.preventDefault();
        patchState({ modal: 'save-section' });
        return;
      }
      if (mod && k === 's') {
        e.preventDefault();
        void flushSave();
        return;
      }
      if (typing) return;
      const st = useStore.getState();
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        patchState({ modal: st.modal === 'shortcuts' ? null : 'shortcuts' });
        return;
      }

      if (mod && k === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && k === 'y') {
        e.preventDefault();
        redo();
      } else if (mod && e.altKey && k === 'k') {
        e.preventDefault();
        void createComponentFromSelection();
      } else if (mod && e.altKey && k === 'g') {
        e.preventDefault();
        wrapInFrame();
      } else if (mod && e.shiftKey && k === 'g') {
        e.preventDefault();
        unwrapFrame();
      } else if (mod && e.altKey && k === 'c') {
        e.preventDefault();
        copyStyle();
      } else if (mod && e.altKey && k === 'v') {
        e.preventDefault();
        pasteStyle();
      } else if (mod && k === 'c') {
        e.preventDefault();
        copySelection();
      } else if (mod && k === 'x') {
        e.preventDefault();
        copySelection(true);
      } else if (mod && k === 'v') {
        e.preventDefault();
        paste();
      } else if (mod && k === 'a') {
        // Alle lagen naast de huidige selectie (zelfde ouder).
        e.preventDefault();
        if (st.tree && st.selection) {
          const p = findParent(st.tree, st.selection);
          if (p) patchState({ selection: p.parent.children![0].id, extra: p.parent.children!.slice(1).map((c) => c.id) });
        }
      } else if (mod && k === 'd') {
        e.preventDefault();
        duplicateSelection();
      } else if (mod && (k === '=' || k === '+')) {
        e.preventDefault();
        patchState({ zoom: Math.min(3, Math.round((st.zoom + 0.25) * 100) / 100) });
      } else if (mod && k === '-') {
        e.preventDefault();
        patchState({ zoom: Math.max(0.1, Math.round((st.zoom - 0.25) * 100) / 100) });
      } else if (mod && k === '0') {
        e.preventDefault();
        patchState({ zoom: 1 });
      } else if (e.shiftKey && k === '1') {
        e.preventDefault();
        fitZoom();
      } else if (e.shiftKey && k === 'a') {
        e.preventDefault();
        toggleAutoLayout();
      } else if (!mod && !e.altKey && e.shiftKey && k === 'h') {
        e.preventDefault();
        flipSelection('x');
      } else if (!mod && !e.altKey && e.shiftKey && k === 'v') {
        e.preventDefault();
        flipSelection('y');
      } else if (e.shiftKey && !mod && !e.altKey && e.code === 'KeyR') {
        e.preventDefault();
        toggleRulers();
      } else if (e.altKey && !mod && ['KeyA', 'KeyD', 'KeyH', 'KeyW', 'KeyS', 'KeyV'].includes(e.code)) {
        // Uitlijnen zoals in Figma: Alt+A/D/H links/rechts/midden, Alt+W/S/V boven/onder/midden; met Shift = verdelen.
        e.preventDefault();
        if (e.shiftKey && (e.code === 'KeyH' || e.code === 'KeyV')) distributeSelection(e.code === 'KeyH' ? 'x' : 'y');
        else alignSelection(({ KeyA: 'left', KeyD: 'right', KeyH: 'center-x', KeyW: 'top', KeyS: 'bottom', KeyV: 'center-y' } as const)[e.code as 'KeyA']);
      } else if (mod && e.shiftKey && (e.code === 'Period' || e.code === 'Comma')) {
        // Ctrl+Shift+> / < : tekst 2 px groter of kleiner (met Alt erbij 10 px).
        e.preventDefault();
        nudgeFontSize((e.code === 'Period' ? 1 : -1) * (e.altKey ? 10 : 2));
      } else if (mod && e.shiftKey && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {
        e.preventDefault();
        moveToEdge(e.code === 'BracketRight' ? 'front' : 'back');
      } else if (!mod && !e.altKey && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {
        e.preventDefault();
        const dir = e.code === 'BracketRight' ? 1 : -1;
        rotateSelection(dir * (e.shiftKey ? 15 : 90));
      } else if (!mod && e.altKey && k === 'r') {
        e.preventDefault();
        resetTransform();
      } else if (!mod && !e.altKey && e.key.startsWith('Arrow') && st.selection) {
        // Losse (absolute) lagen verschuiven: 1 px, met Shift 10 px.
        const step = e.shiftKey ? 10 : 1;
        const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
        if (d) {
          e.preventDefault();
          nudgePosition(d[0], d[1]);
        }
      } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        nudgeOrder(e.key === 'ArrowUp' ? -1 : 1);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection();
      } else if (e.key === 'Escape') {
        // Naar de ouder, zoals in Figma.
        if (st.tree && st.selection) {
          const p = findParent(st.tree, st.selection);
          select(p ? p.parent.id : null);
        }
      } else if (e.key === 'Enter' && st.tree && st.selection) {
        const n = findNode(st.tree, st.selection);
        if (n?.type === 'text') patchState({ editingText: n.id });
        else if (n?.children?.length) select(n.children[0].id);
      } else if (!mod && !e.altKey && k === 'f') {
        insertType('frame');
      } else if (!mod && !e.altKey && k === 't') {
        insertType('text');
      } else if (mod && e.shiftKey && k === 'h') {
        e.preventDefault();
        const n = st.tree && st.selection ? findNode(st.tree, st.selection) : null;
        if (n) mutate('hide', (t) => void ((findNode(t, n.id)!.hidden = !n.hidden || undefined)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function fitZoom() {
  const { bp } = useStore.getState();
  const avail = (document.querySelector('.vs-center')?.clientWidth ?? 1200) - 120;
  const z = Math.max(0.25, Math.min(1, Math.floor((avail / BREAKPOINT_CANVAS[bp]) * 20) / 20));
  patchState({ zoom: z });
}

// ── Site-instellingen ────────────────────────────────────────
function SiteModal() {
  const site = useStore((s) => s.site)!;
  const [draft, setDraft] = useState<SiteSettings>(structuredClone(site));
  const [tab, setTab] = useState<'general' | 'seo' | 'redirects' | 'starter'>('general');
  const close = () => patchState({ modal: null });
  const save = async () => {
    try {
      const s = await api.put<SiteSettings>('/api/site', { ...draft, theme: useStore.getState().site?.theme ?? draft.theme });
      patchState({ site: s, modal: null });
      toast('Site-instellingen opgeslagen');
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const seo = draft.seo ?? {};
  const setSeo = (p: Partial<NonNullable<SiteSettings['seo']>>) => setDraft({ ...draft, seo: { ...seo, ...p } });
  const entity = seo.entity ?? { type: 'Organization' as const };
  const redirects = draft.redirects ?? [];
  return (
    <Modal title="Site-instellingen" onClose={close} wide>
      <div className="vs-insert-tabs">
        {([['general', 'Algemeen'], ['seo', 'SEO & delen'], ['redirects', `Redirects (${redirects.length})`], ...(isFolio() ? [] : [['starter', '✦ Vystara-startsite']])] as [typeof tab, string][]).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'starter' && <StarterPanel />}
      {tab === 'general' && (
        <div className="vs-modal-cols">
          <div>
            <Row label="Naam"><Text value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} /></Row>
            <Row label="Domein"><Text value={draft.domain} placeholder="vystarastudios.nl" onChange={(v) => setDraft({ ...draft, domain: v.replace(/^https?:\/\//, '').replace(/\/$/, '') || undefined })} /></Row>
            <Row label="Omschrijving"><Text multiline value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} /></Row>
            <Row label="Favicon"><AssetPick value={draft.favicon} onChange={(v) => setDraft({ ...draft, favicon: v })} /></Row>
            <Row label=""><Toggle value={draft.cursor !== 'default'} onChange={(v) => setDraft({ ...draft, cursor: v ? 'star' : 'default' })} label="Label-cursor: roze 'Bekijk'-pil boven projecten" /></Row>
            <Row label="Beelden groot">
              <Select
                value={draft.lightbox ?? 'projects'}
                onChange={(v) => setDraft({ ...draft, lightbox: v })}
                options={[{ value: 'projects', label: 'Op projectpagina’s (aanrader)' }, { value: 'all', label: 'Op alle pagina’s' }, { value: 'off', label: 'Uit' }]}
              />
            </Row>
            <Row label="Pagina-overgang">
              <Select
                value={draft.pageTransition ?? 'fade'}
                onChange={(v) => setDraft({ ...draft, pageTransition: v })}
                options={[{ value: 'fade', label: 'Vervagen (rustig)' }, { value: 'slide', label: 'Omhoog schuiven' }, { value: 'zoom', label: 'Zoomen' }, { value: 'wipe', label: 'Gordijn van onder' }, { value: 'none', label: 'Geen' }]}
              />
            </Row>
            <p className="vs-help">Klik op een beeld en het opent groot, met pijltjes en swipen naar het volgende. Kleine beelden (logo’s, iconen) doen niet mee. De overgang werkt in Chrome, Edge en Safari; andere browsers wisselen gewoon direct.</p>
            <p className="vs-help">Kleuren, lettertypes, tekst- en knopstijlen staan bij 🎨 Thema.</p>
          </div>
          <div>
            <div className="vs-subhead">Als de site ergens anders staat</div>
            <Row label="Media-domein"><Text value={draft.mediaBaseUrl} placeholder="optioneel, bv. https://media.jouwdomein.nl" onChange={(v) => setDraft({ ...draft, mediaBaseUrl: v.replace(/\/$/, '') || undefined })} /></Row>
            <Row label="Formulieren"><Text value={draft.formEndpoint} placeholder="bv. https://studio.imjudox.com" onChange={(v) => setDraft({ ...draft, formEndpoint: v.replace(/\/$/, '') || undefined })} /></Row>
            <p className="vs-help">Nodig bij Vercel of Cloudflare Pages: video’s en formulieren komen dan nog steeds van deze server.</p>
            <Row label="Webfonts-URL"><Text value={draft.fontsHref} placeholder="liever via Thema → Lettertypes" onChange={(v) => setDraft({ ...draft, fontsHref: v || undefined })} /></Row>
          </div>
        </div>
      )}
      {tab === 'seo' && (
        <div className="vs-modal-cols">
          <div>
            <div className="vs-subhead">Zoekmachines</div>
            <Row label="Hoofdtaal"><Select value={seo.lang ?? 'nl'} onChange={(v) => setSeo({ lang: v })} options={Object.entries(LANGUAGES).map(([value, l]) => ({ value, label: l.label }))} /></Row>
            <Row label="Extra talen">
              <div className="vs-seg vs-seg-wrap">
                {Object.entries(LANGUAGES).filter(([k]) => k !== (seo.lang ?? 'nl')).map(([k, l]) => {
                  const on = (draft.languages ?? []).includes(k);
                  return (
                    <button key={k} type="button" className={on ? 'on' : ''} onClick={() => setDraft({ ...draft, languages: on ? (draft.languages ?? []).filter((x) => x !== k) : [...(draft.languages ?? []), k] })}>
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </Row>
            {(draft.languages ?? []).length > 0 && (
              <Row label=""><Toggle value={draft.languageSwitcher !== false} onChange={(v) => setDraft({ ...draft, languageSwitcher: v })} label="Taalknopje rechtsonder op de site" /></Row>
            )}
            <p className="vs-help">Elke extra taal krijgt eigen adressen (bijv. /en/work/judox/). Vertalen doe je in de Studio: kies bovenin de taal en pas teksten aan zoals altijd. Wat nog niet vertaald is, valt terug op de hoofdtaal.</p>
            <Row label="Titelopbouw"><Text value={seo.titleTemplate} placeholder={`%s — ${draft.name}`} onChange={(v) => setSeo({ titleTemplate: v || undefined })} /></Row>
            <p className="vs-help">%s wordt de paginatitel. De homepage gebruikt alleen de sitenaam.</p>
            <Row label="Google-code"><Text value={seo.googleVerification} placeholder="uit Google Search Console (HTML-tag)" onChange={(v) => setSeo({ googleVerification: v.replace(/.*content="([^"]+)".*/, '$1') || undefined })} /></Row>
            <Row label="Bing-code"><Text value={seo.bingVerification} placeholder="optioneel" onChange={(v) => setSeo({ bingVerification: v || undefined })} /></Row>
            <Row label=""><Toggle value={!!seo.noindex} onChange={(v) => setSeo({ noindex: v || undefined })} label="Hele site verbergen voor zoekmachines" /></Row>
            <div className="vs-subhead">Delen op socials</div>
            <Row label="Deelafbeelding"><AssetPick value={draft.socialImage} onChange={(v) => setDraft({ ...draft, socialImage: v })} /></Row>
            <Row label="X / Twitter"><Text value={seo.twitterHandle} placeholder="@gebruikersnaam" onChange={(v) => setSeo({ twitterHandle: v || undefined })} /></Row>
          </div>
          <div>
            <div className="vs-subhead">Wie zit erachter (voor Google)</div>
            <Row label="Soort"><Select value={entity.type} onChange={(v) => setSeo({ entity: { ...entity, type: v } })} options={[{ value: 'Organization', label: 'Bedrijf / studio' }, { value: 'Person', label: 'Persoon' }]} /></Row>
            <Row label="Naam"><Text value={entity.name} placeholder={draft.name} onChange={(v) => setSeo({ entity: { ...entity, name: v || undefined } })} /></Row>
            {entity.type === 'Person' && <Row label="Beroep"><Text value={entity.jobTitle} placeholder="Videograaf & motion designer" onChange={(v) => setSeo({ entity: { ...entity, jobTitle: v || undefined } })} /></Row>}
            <Row label="Logo / foto"><AssetPick value={entity.logo} onChange={(v) => setSeo({ entity: { ...entity, logo: v } })} /></Row>
            <Row label="E-mail"><Text value={entity.email} onChange={(v) => setSeo({ entity: { ...entity, email: v || undefined } })} /></Row>
            <Row label="Profielen"><Text multiline value={(entity.sameAs ?? []).join('\n')} placeholder={'Eén link per regel:\nhttps://www.youtube.com/@…\nhttps://www.twitch.tv/…\nhttps://www.instagram.com/…'} onChange={(v) => setSeo({ entity: { ...entity, sameAs: v.split('\n').map((x) => x.trim()).filter(Boolean) } })} /></Row>
            <p className="vs-help">Hiermee koppelt Google je site aan je YouTube-, Twitch- en andere profielen (structured data).</p>
            <div className="vs-subhead">Eigen code in &lt;head&gt;</div>
            <Text multiline value={seo.headCode} placeholder="Bijvoorbeeld een privacyvriendelijk statistiekenscript" onChange={(v) => setSeo({ headCode: v || undefined })} />
          </div>
        </div>
      )}
      {tab === 'redirects' && (
        <div>
          <p className="vs-help">
            Stuur oude adressen door naar nieuwe (301 = permanent, Google neemt de waardering mee). Belangrijk bij de overstap van Squarespace: zet hier de oude adressen van je pagina’s en projecten. Als je in de Studio een adres wijzigt, komt hier automatisch een redirect bij.
          </p>
          {redirects.map((r, i) => (
            <Row key={i} label={`${i + 1}`}>
              <Text value={r.from} placeholder="/oud-adres" onChange={(v) => setDraft({ ...draft, redirects: redirects.map((x, j) => (j === i ? { ...x, from: v.startsWith('/') ? v : `/${v}` } : x)) })} />
              <span className="vs-muted">→</span>
              <Text value={r.to} placeholder="/nieuw-adres/" onChange={(v) => setDraft({ ...draft, redirects: redirects.map((x, j) => (j === i ? { ...x, to: v } : x)) })} />
              <Select value={String(r.status ?? 301)} onChange={(v) => setDraft({ ...draft, redirects: redirects.map((x, j) => (j === i ? { ...x, status: Number(v) as 301 | 302 } : x)) })} options={[{ value: '301', label: '301' }, { value: '302', label: '302' }]} />
              <button className="vs-icon-btn" onClick={() => setDraft({ ...draft, redirects: redirects.filter((_, j) => j !== i) })}>✕</button>
            </Row>
          ))}
          <button className="vs-btn" onClick={() => setDraft({ ...draft, redirects: [...redirects, { from: '', to: '/', status: 301 }] })}>+ Redirect</button>
        </div>
      )}
      <div className="vs-row-buttons">
        <button className="vs-btn" onClick={close}>Annuleren</button>
        <button className="vs-btn primary" onClick={save}>Opslaan</button>
      </div>
    </Modal>
  );
}

function AssetPick({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const assets = useStore((s) => s.assets).filter((a) => a.kind === 'image');
  return (
    <select className="vs-input" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">Geen</option>
      {assets.map((a) => <option key={a.id} value={a.id}>{a.originalName}</option>)}
    </select>
  );
}

// ── Versiegeschiedenis ───────────────────────────────────────
function HistoryModal() {
  const doc = useStore((s) => s.doc);
  const [list, setList] = useState<{ id: string; note: string | null; createdAt: string }[] | null>(null);
  useEffect(() => {
    if (doc) void api.get<typeof list>(`/api/revisions/${doc.kind}/${doc.id}`).then(setList);
  }, [doc]);
  const restore = async (id: string) => {
    const r = await api.get<{ tree: FrameNode }>(`/api/revision/${id}`);
    mutate('restore', (t) => {
      Object.keys(t).forEach((k) => delete (t as unknown as Record<string, unknown>)[k]);
      Object.assign(t, r.tree);
    });
    patchState({ modal: null, selection: null });
    toast('Versie teruggezet. Ctrl+Z maakt dit ongedaan.');
  };
  return (
    <Modal title="Versiegeschiedenis" onClose={() => patchState({ modal: null })}>
      {!list && <p className="vs-help">Laden…</p>}
      {list && !list.length && <p className="vs-help">Nog geen eerdere versies. Er wordt automatisch een versie bewaard bij publiceren en tijdens het werken (hooguit eens per 2 minuten).</p>}
      <div className="vs-list">
        {list?.map((r) => (
          <div key={r.id} className="vs-list-item">
            <span className="grow">{new Date(r.createdAt).toLocaleString('nl-NL')}</span>
            <span className="vs-muted">{r.note ? 'gepubliceerd' : ''}</span>
            <button className="vs-btn" onClick={() => restore(r.id)}>Terugzetten</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Formulierinzendingen ─────────────────────────────────────
function InboxModal() {
  const [list, setList] = useState<{ id: string; formName: string; data: Record<string, string>; read: boolean; createdAt: string }[] | null>(null);
  const load = () => void api.get<NonNullable<typeof list>>('/api/submissions').then((l) => {
    setList(l);
    patchState({ unread: l.filter((x) => !x.read).length });
  });
  useEffect(load, []);
  return (
    <Modal title="Formulierinzendingen" onClose={() => patchState({ modal: null })} wide>
      {!list && <p className="vs-help">Laden…</p>}
      {list && !list.length && <p className="vs-help">Nog geen berichten. Zet een formulier op een pagina (Formulier in de bovenbalk) en publiceer.</p>}
      {list?.map((m) => (
        <div key={m.id} className={`vs-inbox-item ${m.read ? '' : 'unread'}`}>
          <div className="vs-inbox-head">
            <b>{m.formName}</b>
            <span className="vs-muted">{new Date(m.createdAt).toLocaleString('nl-NL')}</span>
            <span className="grow" />
            {!m.read && <button className="vs-btn" onClick={async () => { await api.post(`/api/submissions/${m.id}/read`); load(); }}>Gelezen</button>}
            <button className="vs-btn danger" onClick={async () => { if (confirm('Dit bericht verwijderen?')) { await api.del(`/api/submissions/${m.id}`); load(); } }}>Verwijderen</button>
          </div>
          {Object.entries(m.data).map(([k, v]) => (
            <div key={k} className="vs-inbox-row"><span className="vs-muted">{k}</span><span>{v}</span></div>
          ))}
        </div>
      ))}
    </Modal>
  );
}

// ── Vystara-startsite ────────────────────────────────────────
interface StarterStatus { state: 'idle' | 'running' | 'done' | 'error'; step: string; done: number; total: number; failed: string[]; error?: string }

function StarterPanel() {
  const [st, setSt] = useState<StarterStatus | null>(null);
  const [images, setImages] = useState(true);
  const [sure, setSure] = useState(false);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await api.get<StarterStatus>('/api/starter');
        if (alive) setSt(s);
      } catch { /* negeren */ }
    };
    tick();
    const t = setInterval(tick, 1500);
    return () => { alive = false; clearInterval(t); };
  }, []);
  const start = async () => {
    try {
      setSt(await api.post<StarterStatus>('/api/starter', { importImages: images }));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const running = st?.state === 'running';
  const pct = st && st.total ? Math.round((st.done / st.total) * 100) : 0;
  return (
    <div className="vs-modal-cols">
      <div>
        <div className="vs-subhead">Je oude site, opnieuw opgebouwd</div>
        <p className="vs-help" style={{ fontSize: 13 }}>
          Zet in één keer de complete Vystara-site neer: het merkthema (nachtblauw, mint, roze, blauw en pruim), het logo, de ster en het patroon als
          bewerkbare SVG's, de lettertypes, de pagina's Home, Werk, Over, Contact en Project starten, en alle 13 projecten met hun teksten. Oude Squarespace-adressen
          worden automatisch doorgestuurd.
        </p>
        <Row label=""><Toggle value={images} onChange={setImages} label="Ook alle beelden van de oude site downloaden (± 150 stuks)" /></Row>
        <Row label=""><Toggle value={sure} onChange={setSure} label="Ik snap dat dit de huidige pagina's, projecten, header en footer vervangt" /></Row>
        <p className="vs-help">Er wordt eerst een back-up gemaakt in de map <code>data/backups</code>. Geüploade media blijven staan.</p>
        <button className="vs-btn primary" disabled={!sure || running} onClick={start}>{running ? 'Bezig…' : 'Vystara-startsite installeren'}</button>
      </div>
      <div>
        <div className="vs-subhead">Voortgang</div>
        {!st || st.state === 'idle' ? <p className="vs-help">Nog niet gestart.</p> : (
          <>
            <p style={{ margin: '0 0 8px' }}><b>{st.step}</b>{st.total ? ` — ${st.done} / ${st.total}` : ''}</p>
            {st.total > 0 && <div style={{ height: 8, borderRadius: 8, background: 'var(--ui-line, #333)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: 'var(--ui-accent, #DB5375)', transition: 'width .3s' }} /></div>}
            {st.state === 'error' && <p className="vs-help" style={{ color: '#ff6b6b' }}>{st.error}</p>}
            {st.failed.length > 0 && (
              <details style={{ marginTop: 10 }}>
                <summary className="vs-help">{st.failed.length} onderdeel/onderdelen niet gelukt</summary>
                <ul className="vs-help">{st.failed.slice(0, 30).map((f, i) => <li key={i}>{f}</li>)}</ul>
              </details>
            )}
            {st.state === 'done' && (
              <>
                <p className="vs-help">Klaar! Herlaad de Studio om alles te zien.</p>
                <button className="vs-btn" onClick={() => location.reload()}>Studio herladen</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Klein bolletje in de bovenbalk zolang de startsite (of het importeren van beelden) bezig is. */
function StarterPill() {
  const [st, setSt] = useState<StarterStatus | null>(null);
  const [justDone, setJustDone] = useState(false);
  useEffect(() => {
    let alive = true;
    let last = '';
    const tick = async () => {
      try {
        const s = await api.get<StarterStatus>('/api/starter');
        if (!alive) return;
        if (last === 'running' && s.state === 'done') setJustDone(true);
        if (last === 'running' && s.state === 'done') toast('Startsite klaar: beelden en lettertypes staan erin. Herlaad de Studio om alles te zien.');
        last = s.state;
        setSt(s);
      } catch { /* negeren */ }
    };
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  if (!st || (st.state !== 'running' && !justDone)) return null;
  if (justDone) return <button className="vs-btn" title="Startsite is geïnstalleerd" onClick={() => location.reload()}>✦ Klaar — herladen</button>;
  return (
    <span className="vs-save" title={st.step} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 8, background: '#DB5375', animation: 'vs-pulse 1s infinite alternate' }} />
      {st.total ? `Beelden ${st.done}/${st.total}` : 'Startsite installeren…'}
    </span>
  );
}

const SHORTCUTS: [string, [string, string][]][] = [
  ['Algemeen', [
    ['Ctrl K', 'Opdrachtenpalet'], ['Ctrl S', 'Opslaan'], ['Ctrl Z / Ctrl Shift Z', 'Ongedaan maken / opnieuw'],
    ['Ctrl D', 'Dupliceren'], ['Delete', 'Verwijderen'], ['Ctrl C / Ctrl V', 'Kopiëren / plakken'],
    ['Ctrl Alt C / V', 'Stijl kopiëren / plakken'], ['Ctrl Alt G', 'In frame zetten'], ['Ctrl Alt K', 'Component maken'], ['?', 'Dit overzicht'],
  ]],
  ['Canvas', [
    ['Ctrl + scrollwiel', 'Zoomen rond de muis'], ['Spatie + slepen', 'Canvas verschuiven'], ['Middelste\u00a0muisknop', 'Canvas verschuiven'],
    ['Ctrl + / Ctrl − / Ctrl 0', 'In- en uitzoomen / 100%'], ['Shift R', 'Linialen aan/uit'], ['Liniaal slepen', 'Hulplijn maken (terugslepen = weg)'], ['Pijltjes (Shift)', 'Verplaatsen 1 px (10 px)'], ['Ctrl tijdens slepen', 'Slim uitlijnen uit'],
  ]],
  ['Transformeren', [
    ['Shift + hoek', 'Verhouding vasthouden'], ['Alt + hoek', 'Vanuit het midden'], ['Ctrl + hoek', 'Schalen (ook tekst en effecten)'],
    ['Shift tijdens draaien', 'Per 15°'], [']  /  [', 'Draaien ±90°'], ['Shift ]  /  [', 'Draaien ±15°'],
    ['Shift H / Shift V', 'Spiegelen'], ['Alt A / H / D', 'Uitlijnen links / midden / rechts'], ['Alt W / V / S', 'Uitlijnen boven / midden / onder'], ['Alt Shift H / V', 'Gelijk verdelen'], ['Ctrl Shift ]  /  [', 'Naar voren / achteren'], ['Alt R', 'Transformatie wissen'],
  ]],
  ['Tekst bewerken', [
    ['Dubbelklik', 'Tekst bewerken'], ['Ctrl B / I / U', 'Vet / cursief / onderstreept'], ['Ctrl Shift X', 'Doorhalen'],
    ['Ctrl Shift H', 'Markeren'], ['Ctrl Shift C', 'Code'], ['Ctrl Shift > / <', 'Tekst groter / kleiner (Alt: 10 px)'], ['Ctrl K', 'Link'], ['Ctrl \\', 'Opmaak wissen'], ['Esc / Ctrl Enter', 'Klaar'],
  ]],
];

function ShortcutsModal() {
  return (
    <Modal title="Sneltoetsen" wide onClose={() => patchState({ modal: null })}>
      <div className="vs-shortcuts">
        {SHORTCUTS.map(([group, rows]) => (
          <div key={group}>
            <div className="vs-subhead">{group}</div>
            {rows.map(([k, label]) => (
              <div key={k} className="vs-shortcut-row">
                <span>{label}</span>
                <span>{k.split(' ').filter(Boolean).map((p, i) => (p === '/' || p === '+' || /^[a-z()]{3,}$/.test(p) ? <span key={i} className="vs-kbd-sep">{p}</span> : <kbd key={i}>{p}</kbd>))}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="vs-help" style={{ marginTop: 16 }}>Op een Mac is Ctrl overal ⌘.</p>
    </Modal>
  );
}

/** Taal kiezen om in te bewerken, met hoeveel er al vertaald is op deze pagina. */
function LangSwitch() {
  const site = useStore((s) => s.site);
  const lang = useStore((s) => s.lang);
  const tree = useStore((s) => s.tree);
  if (!site) return null;
  const extra = extraLangs(site);
  if (!extra.length) return null;
  const main = mainLang(site);
  return (
    <div className="vs-seg vs-langswitch" title="Taal waarin je teksten bewerkt">
      <button className={!lang ? 'on' : ''} onClick={() => patchState({ lang: null })}>{main.toUpperCase()}</button>
      {extra.map((l) => {
        const p = tree ? translationProgress(tree, l) : { done: 0, total: 0 };
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 100;
        return (
          <button key={l} className={lang === l ? 'on' : ''} onClick={() => patchState({ lang: l })} title={`${LANGUAGES[l]?.label ?? l}: ${p.done} van ${p.total} teksten op deze pagina vertaald`}>
            {l.toUpperCase()} <small className={pct === 100 ? 'ok' : ''}>{pct}%</small>
          </button>
        );
      })}
    </div>
  );
}
