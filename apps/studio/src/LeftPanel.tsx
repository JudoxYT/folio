import { Icon } from './icons';
import { useRef, useState, type DragEvent } from 'react';
import { LANGUAGES, extraLangs, findNode, newNode, type Asset, type Project, type VNode } from '@vystara/core';
import {
  setHidden,
  insertInstance,
  insertNode,
  moveNode,
  openDoc,
  patchState,
  refreshAssets,
  select,
  setField,
  toast,
  createVariant,
  variantName,
  variantSet,
  useStore,
  type LeftTab,
} from './store';
import { api, uploadFile } from './api';
import { AssetSelect, Row, Text, Toggle } from './ui';
import { InsertPanel } from './InsertPanel';

const TABS: { id: LeftTab; label: string; icon: string }[] = [
  { id: 'insert', label: 'Invoegen', icon: 'plus' },
  { id: 'pages', label: "Pagina's", icon: 'file' },
  { id: 'layers', label: 'Lagen', icon: 'layers' },
  { id: 'assets', label: 'Media', icon: 'image' },
  { id: 'components', label: 'Blokken', icon: 'puzzle' },
  { id: 'projects', label: 'Projecten', icon: 'briefcase' },
];

export function LeftPanel() {
  const tab = useStore((s) => s.leftTab);
  return (
    <aside className="vs-left">
      <div className="vs-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => patchState({ leftTab: t.id })} title={t.id === 'components' ? 'Componenten: herbruikbare blokken zoals header en footer' : t.label}>
            <Icon name={t.icon} size={17} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="vs-left-body">
        {tab === 'insert' && <InsertPanel />}
        {tab === 'pages' && <PagesTab />}
        {tab === 'layers' && <LayersTab />}
        {tab === 'assets' && <AssetsTab />}
        {tab === 'components' && <ComponentsTab />}
        {tab === 'projects' && <ProjectsTab />}
      </div>
    </aside>
  );
}

// ── Pagina's ─────────────────────────────────────────────────
function PagesTab() {
  const { pages, doc } = useStore();
  const add = async () => {
    const title = prompt('Titel van de nieuwe pagina');
    if (!title) return;
    try {
      const p = await api.post<(typeof pages)[number]>('/api/pages', { title });
      patchState({ pages: [...useStore.getState().pages, p] });
      void openDoc({ kind: 'page', id: p.id });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const remove = async (id: string, title: string) => {
    if (!confirm(`Pagina "${title}" verwijderen? Dit kun je niet ongedaan maken.`)) return;
    await api.del(`/api/pages/${id}`);
    patchState({ pages: useStore.getState().pages.filter((p) => p.id !== id) });
    if (doc?.id === id) {
      const home = useStore.getState().pages[0];
      if (home) void openDoc({ kind: 'page', id: home.id });
    }
  };
  return (
    <div className="vs-list">
      {pages.map((p) => (
        <div key={p.id} className={`vs-list-item ${doc?.kind === 'page' && doc.id === p.id ? 'on' : ''}`} onClick={() => openDoc({ kind: 'page', id: p.id })}>
          <span>{p.kind === 'project-template' ? '▤' : '▢'}</span>
          <span className="grow">{p.title}</span>
          <span className="vs-muted">{p.kind === 'project-template' ? 'sjabloon' : p.slug === '' ? '/' : `/${p.slug}`}{p.status === 'draft' ? ' · concept' : ''}</span>
          {p.kind === 'page' && p.slug !== '' && (
            <button className="vs-icon-btn" title="Verwijderen" onClick={(e) => { e.stopPropagation(); void remove(p.id, p.title); }}>✕</button>
          )}
        </div>
      ))}
      <button className="vs-btn" onClick={add}>+ Nieuwe pagina</button>
    </div>
  );
}

// ── Lagen ────────────────────────────────────────────────────
const ICON: Record<VNode['type'], string> = {
  frame: '#', text: 'T', image: '▣', video: '▶', button: '◉', embed: '⧉', instance: '◇', collection: '▦', form: '✉', svg: '★',
};

function LayersTab() {
  const tree = useStore((s) => s.tree);
  const [q, setQ] = useState('');
  const [notes, setNotes] = useState(false);
  if (!tree) return null;
  // Zoeken op laagnaam én op de tekst die erin staat.
  const hits: { node: VNode; path: string }[] = [];
  const needle = q.trim().toLowerCase();
  if (needle || notes) {
    const walk = (n: VNode, path: string[]) => {
      const text = n.type === 'text' ? n.content : n.type === 'button' ? (n as { label?: string }).label ?? '' : '';
      const hay = `${n.name}\n${text}\n${n.note ?? ''}`.toLowerCase();
      if ((!notes || n.note) && (!needle || hay.includes(needle))) hits.push({ node: n, path: path.join(' › ') });
      if (n.type === 'frame') for (const c of n.children) walk(c, [...path, n.name]);
    };
    walk(tree, []);
  }
  const jump = (id: string) => {
    select(id);
    document.querySelector(`.vs-board [data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  return (
    <div className="vs-layers">
      <div className="vs-layer-searchrow">
        <input className="vs-input vs-layer-search" placeholder="Zoek een laag of tekst…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); setNotes(false); } if (e.key === 'Enter' && hits[0]) jump(hits[0].node.id); }} />
        <button type="button" className={`vs-icon-btn ${notes ? 'on' : ''}`} title="Alleen lagen met een notitie" onClick={() => setNotes(!notes)}>💬</button>
      </div>
      {needle || notes ? (
        hits.length ? (
          hits.slice(0, 80).map(({ node: n, path }) => (
            <div key={n.id} className="vs-layer vs-layer-hit" onClick={() => jump(n.id)} onMouseEnter={() => useStore.setState({ hover: n.id })} onMouseLeave={() => useStore.setState({ hover: null })}>
              <span className="vs-layer-icon">{ICON[n.type]}</span>
              <span className="grow">
                {n.name}
                {n.note ? <small className="vs-layer-note">💬 {n.note}</small> : path && <small>{path}</small>}
              </span>
            </div>
          ))
        ) : (
          <p className="vs-help">{notes && !needle ? 'Nog geen notities. Zet er een bij een laag via het rechterpaneel.' : `Niets gevonden voor “${q}”.`}</p>
        )
      ) : (
        <LayerRow node={tree} depth={0} />
      )}
      <p className="vs-help">Sleep lagen om ze te verplaatsen. Laat los op het midden van een frame om erin te zetten.</p>
    </div>
  );
}

let dragId: string | null = null;

function LayerRow({ node, depth }: { node: VNode; depth: number }) {
  const { selection, extra, hover, bp } = useStore();
  const [open, setOpen] = useState(depth < 2);
  const [drop, setDrop] = useState<'before' | 'after' | 'inside' | null>(null);
  const hasKids = node.type === 'frame' && node.children.length > 0;
  const hidden = bp === 'desktop' ? node.hidden : node.responsive?.[bp]?.hidden ?? node.responsive?.tablet?.hidden ?? node.hidden;

  const where = (e: DragEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    if (node.type === 'frame' && y > 0.25 && y < 0.75) return 'inside';
    return y < 0.5 ? 'before' : 'after';
  };

  return (
    <>
      <div
        className={`vs-layer ${selection === node.id || extra.includes(node.id) ? 'on' : ''} ${hover === node.id ? 'hov' : ''} ${hidden ? 'dim' : ''} ${drop ? `drop-${drop}` : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={depth > 0}
        onDragStart={(e) => {
          dragId = node.id;
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          if (!dragId || dragId === node.id) return;
          e.preventDefault();
          setDrop(where(e));
        }}
        onDragLeave={() => setDrop(null)}
        onDrop={(e) => {
          e.preventDefault();
          const w = where(e);
          setDrop(null);
          if (dragId) moveNode(dragId, node.id, depth === 0 ? 'inside' : w);
          dragId = null;
        }}
        onClick={(e) => select(node.id, e.shiftKey)}
        onContextMenu={(e) => { e.preventDefault(); select(node.id); useStore.setState({ menu: { x: e.clientX, y: e.clientY, id: node.id } }); }}
        onMouseEnter={() => useStore.setState({ hover: node.id })}
        onMouseLeave={() => useStore.setState({ hover: null })}
        onDoubleClick={() => {
          const name = prompt('Naam van de laag', node.name);
          if (name) setField(node.id, 'name', name);
        }}
      >
        <span className="vs-caret" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
          {hasKids ? (open ? '▾' : '▸') : ''}
        </span>
        <span className="vs-layer-icon">{node.type === 'frame' && node.layout?.mode === 'horizontal' ? '⇥' : ICON[node.type]}</span>
        <span className="grow">{node.name}</span>
        {node.locked && <span className="vs-muted" title="Vergrendeld">🔒</span>}
        {node.note && <span className="vs-muted" title={node.note}>💬</span>}
        <button
          className="vs-layer-eye"
          title={hidden ? 'Tonen' : 'Verbergen'}
          onClick={(e) => { e.stopPropagation(); setHidden(node.id, !hidden); }}
        >
          {hidden ? '◌' : '●'}
        </button>
        {node.effects && <span className="vs-fx" title="Heeft interacties of effecten">⚡</span>}
        {node.position?.mode === 'fixed' && <span className="vs-muted" title="Vast op het scherm">vast</span>}
        {node.position?.mode === 'sticky' && <span className="vs-muted" title="Plakt bij scrollen">plakt</span>}
        {node.responsive && <span className="vs-dot" title="Heeft aanpassingen per schermformaat" />}
      </div>
      {open && hasKids && node.children!.map((c) => <LayerRow key={c.id} node={c} depth={depth + 1} />)}
    </>
  );
}

// ── Assets ───────────────────────────────────────────────────
function AssetsTab() {
  const assets = useStore((s) => s.assets);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | File[]) => {
    for (const f of Array.from(files)) {
      setProgress((p) => ({ ...p, [f.name]: 0 }));
      try {
        await uploadFile(f, (x) => setProgress((p) => ({ ...p, [f.name]: x })));
        await refreshAssets();
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, 'error');
      } finally {
        setProgress((p) => {
          const { [f.name]: _, ...rest } = p;
          return rest;
        });
      }
    }
    // Video's worden op de achtergrond omgezet; even later opnieuw ophalen.
    setTimeout(() => void refreshAssets(), 5000);
    setTimeout(() => void refreshAssets(), 20000);
  };

  const use = (a: Asset) => {
    const st = useStore.getState();
    const n = st.tree && st.selection ? findNode(st.tree, st.selection) : null;
    if (n && (n.type === 'image' || n.type === 'video') && n.type === a.kind) {
      setField(n.id, 'asset', a.id);
      return;
    }
    if (a.kind === 'image' || a.kind === 'video') {
      const node = newNode(a.kind) as Extract<VNode, { type: 'image' | 'video' }>;
      node.asset = a.id;
      node.name = a.originalName.replace(/\.[^.]+$/, '');
      if (a.width && a.height) node.size = { width: 'fill', aspectRatio: `${a.width} / ${a.height}` };
      insertNode(node);
    }
  };

  return (
    <div
      className={`vs-assets ${over ? 'over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files.length) void upload(e.dataTransfer.files); }}
    >
      <button className="vs-btn" onClick={() => input.current?.click()}>Uploaden</button>
      <input ref={input} type="file" multiple hidden accept="image/*,video/*,.heic,.heif,.mkv,.avi,.wmv,.flv,.mts,.m2ts,.3gp,.ogv,.mxf,.svg,.woff2,.woff,.ttf,.otf,.pdf" onChange={(e) => e.target.files && void upload(e.target.files)} />
      <p className="vs-help">Of sleep bestanden hierheen. Elk foto- en videoformaat werkt (JPG, PNG, HEIC, SVG, GIF, MP4, MOV, WebM, MKV, AVI, ...): de server zet ze om naar snelle webversies. Klik op een asset om hem in te voegen, of om hem aan de geselecteerde afbeelding/video te koppelen.</p>
      {Object.entries(progress).map(([name, p]) => (
        <div key={name} className="vs-progress"><span>{name}</span><i style={{ width: `${Math.round(p * 100)}%` }} /></div>
      ))}
      <div className="vs-asset-grid">
        {assets.map((a) => (
          <AssetTile key={a.id} a={a} onUse={() => use(a)} />
        ))}
      </div>
    </div>
  );
}

function AssetTile({ a, onUse }: { a: Asset; onUse: () => void }) {
  const [open, setOpen] = useState(false);
  const thumb = a.kind === 'image' ? (a.variants[0]?.url ?? a.url) : a.kind === 'video' ? a.poster : null;
  return (
    <div className="vs-asset">
      <div className="vs-asset-thumb" onClick={onUse} title={a.originalName}>
        {thumb ? <img src={thumb} alt="" /> : <span>{a.kind === 'video' ? (a.status === 'processing' ? 'Video wordt omgezet…' : '▶') : a.originalName.split('.').pop()}</span>}
        {a.kind === 'video' && <b className="vs-badge">{a.status === 'processing' ? 'bezig' : 'video'}</b>}
      </div>
      <div className="vs-asset-meta">
        <span className="grow" title={a.originalName}>{a.originalName}</span>
        <button className="vs-icon-btn" onClick={() => setOpen(!open)} title="Details">⋯</button>
      </div>
      {open && (
        <div className="vs-asset-details">
          <div className="vs-muted">{a.width && a.height ? `${a.width}×${a.height} · ` : ''}{(a.size / 1024 / 1024).toFixed(1)} MB</div>
          <Text
            value={a.alt}
            placeholder="Alt-tekst"
            onChange={async (alt) => {
              await api.patch(`/api/assets/${a.id}`, { alt });
              void refreshAssets();
            }}
          />
          <button
            className="vs-btn danger"
            onClick={async () => {
              if (!confirm(`"${a.originalName}" verwijderen? Pagina's die hem gebruiken tonen dan een lege plek.`)) return;
              await api.del(`/api/assets/${a.id}`);
              void refreshAssets();
            }}
          >
            Verwijderen
          </button>
        </div>
      )}
    </div>
  );
}

// ── Componenten ──────────────────────────────────────────────
function ComponentsTab() {
  const { components, doc } = useStore();
  // Groeperen per set ("Knop / Groot" en "Knop / Klein" horen bij elkaar).
  const sets = new Map<string, typeof components>();
  for (const c of components) {
    const k = variantSet(c.name);
    sets.set(k, [...(sets.get(k) ?? []), c]);
  }
  const del = async (c: (typeof components)[number]) => {
    if (!confirm(`Component "${c.name}" verwijderen? Instances ervan worden leeg.`)) return;
    await api.del(`/api/components/${c.id}`);
    patchState({ components: useStore.getState().components.filter((x) => x.id !== c.id) });
  };
  return (
    <div className="vs-list">
      {[...sets.entries()].map(([set, list]) => (
        <div key={set} className="vs-compset">
          {list.length > 1 && <div className="vs-compset-head">◈ {set} <span className="vs-muted">· {list.length} varianten</span></div>}
          {list.map((c) => (
            <div key={c.id} className={`vs-list-item ${list.length > 1 ? 'vs-variant' : ''} ${doc?.kind === 'component' && doc.id === c.id ? 'on' : ''}`}>
              <span>{list.length > 1 ? '◇' : '◇'}</span>
              <span className="grow">{list.length > 1 ? variantName(c.name) : c.name}</span>
              <button className="vs-icon-btn" title="Invoegen op de huidige pagina" onClick={() => insertInstance(c.id)} disabled={doc?.kind === 'component'}>＋</button>
              <button className="vs-icon-btn" title="Variant maken (kopie die je kunt aanpassen, zoals in Figma)" onClick={() => void createVariant(c.id)}>⧉</button>
              <button className="vs-icon-btn" title="Bewerken" onClick={() => openDoc({ kind: 'component', id: c.id })}>✎</button>
              <button className="vs-icon-btn" title="Verwijderen" onClick={() => void del(c)}>✕</button>
            </div>
          ))}
        </div>
      ))}
      <p className="vs-help">Maak een component van een geselecteerd frame met Ctrl+Alt+K. Met ⧉ maak je een variant (bijv. een donkere of compacte versie); wissel per instance van variant in het rechterpaneel.</p>
    </div>
  );
}

// ── Projecten ────────────────────────────────────────────────
function ProjectsTab() {
  const { projects } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const add = async () => {
    const title = prompt('Titel van het project');
    if (!title) return;
    const p = await api.post<Project>('/api/projects', { title });
    patchState({ projects: [...useStore.getState().projects, p] });
    setOpenId(p.id);
  };
  const move = async (p: Project, dir: -1 | 1) => {
    const list = [...useStore.getState().projects];
    const i = list.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const updated = await Promise.all(list.map((x, k) => (x.sort === k ? x : api.put<Project>(`/api/projects/${x.id}`, { ...x, sort: k }))));
    patchState({ projects: updated });
  };
  return (
    <div className="vs-list">
      {projects.map((p) => (
        <div key={p.id}>
          <div className={`vs-list-item ${openId === p.id ? 'on' : ''}`} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
            <span>{p.featured ? '★' : '·'}</span>
            <span className="grow">{p.title}</span>
            {p.published === false && <span className="vs-muted">verborgen</span>}
            <button className="vs-icon-btn" title="Omhoog" onClick={(e) => { e.stopPropagation(); void move(p, -1); }}>↑</button>
            <button className="vs-icon-btn" title="Omlaag" onClick={(e) => { e.stopPropagation(); void move(p, 1); }}>↓</button>
          </div>
          {openId === p.id && <ProjectForm p={p} />}
        </div>
      ))}
      <button className="vs-btn" onClick={add}>+ Nieuw project</button>
    </div>
  );
}

function ProjectForm({ p }: { p: Project }) {
  const site = useStore((s) => s.site);
  const save = async (patch: Partial<Project>) => {
    try {
      const saved = await api.put<Project>(`/api/projects/${p.id}`, { ...p, ...patch });
      patchState({ projects: useStore.getState().projects.map((x) => (x.id === saved.id ? saved : x)) });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  return (
    <div className="vs-project-form">
      <Row label="Titel"><Text value={p.title} onChange={(v) => save({ title: v })} /></Row>
      <Row label="Adres"><Text value={p.slug} onChange={(v) => save({ slug: v })} /></Row>
      <Row label="Klant"><Text value={p.client} onChange={(v) => save({ client: v })} /></Row>
      <Row label="Jaar"><Text value={p.year} onChange={(v) => save({ year: v })} /></Row>
      <Row label="Categorie"><Text value={p.category} placeholder="bv. Branding · Animatie" onChange={(v) => save({ category: v })} /></Row>
      <p className="vs-help">Meerdere disciplines? Scheid ze met · of een komma. Het project verschijnt dan bij elk filter.</p>
      <Row label="Samenvatting"><Text multiline value={p.summary} onChange={(v) => save({ summary: v })} /></Row>
      <Row label="Cover"><AssetSelect kind="image" value={p.cover} onChange={(v) => save({ cover: v })} /></Row>
      <Row label="Video-link"><Text value={p.video} placeholder="YouTube- of Vimeo-link" onChange={(v) => save({ video: v || undefined })} /></Row>
      {p.video && !p.cover && <p className="vs-help">Zonder cover wordt de YouTube-thumbnail gebruikt.</p>}
      <Row label=""><Toggle value={!!p.featured} onChange={(v) => save({ featured: v })} label="Uitgelicht (homepage)" /></Row>
      {site && extraLangs(site).map((l) => {
        const t = p.i18n?.[l] ?? {};
        const put = (k: 'title' | 'summary' | 'category' | 'client', v: string) => save({ i18n: { ...(p.i18n ?? {}), [l]: { ...t, [k]: v || undefined } } });
        return (
          <div key={l} className="vs-project-i18n">
            <div className="vs-subhead">{LANGUAGES[l]?.label ?? l}</div>
            <Row label="Titel"><Text value={t.title} placeholder={p.title} onChange={(v) => put('title', v)} /></Row>
            <Row label="Categorie"><Text value={t.category} placeholder={p.category} onChange={(v) => put('category', v)} /></Row>
            <Row label="Samenvatting"><Text multiline value={t.summary} placeholder={p.summary} onChange={(v) => put('summary', v)} /></Row>
          </div>
        );
      })}
      <Row label=""><Toggle value={p.published !== false} onChange={(v) => save({ published: v })} label="Zichtbaar op de site" /></Row>
      <div className="vs-row-buttons">
        <button className="vs-btn primary" onClick={() => openDoc({ kind: 'project', id: p.id })}>Inhoud bewerken</button>
        <button className="vs-btn" onClick={() => window.open(`/api/preview/project/${p.id}`, '_blank')}>Voorbeeld</button>
        <button
          className="vs-btn danger"
          onClick={async () => {
            if (!confirm(`Project "${p.title}" verwijderen?`)) return;
            await api.del(`/api/projects/${p.id}`);
            patchState({ projects: useStore.getState().projects.filter((x) => x.id !== p.id) });
          }}
        >
          Verwijderen
        </button>
      </div>
    </div>
  );
}
