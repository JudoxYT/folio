import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveProps } from '@vystara/core';
import { SECTION_LIBRARY, findNode, pathTo, type Breakpoint } from '@vystara/core';
import {
  alignAbsolute,
  alignSelection,
  distributeSelection,
  selectedIds,
  copyStyle,
  flipSelection,
  hasStyleClipboard,
  moveToEdge,
  pasteStyle,
  resetTransform,
  rotateSelection,
  setSizeMode,
  copySelection,
  createComponentFromSelection,
  deleteSelection,
  duplicateSelection,
  insertTree,
  insertType,
  nudgeOrder,
  openDoc,
  paste,
  patchState,
  resetBreakpoint,
  saveSelectionAsSection,
  select,
  setHidden,
  setField,
  unwrapFrame,
  useStore,
  wrapInFrame,
} from './store';
import { Modal, Row, Text } from './ui';

// ── Rechtsklikmenu ───────────────────────────────────────────
export function ContextMenu() {
  const menu = useStore((s) => s.menu);
  const tree = useStore((s) => s.tree);
  const bp = useStore((s) => s.bp);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && patchState({ menu: null });
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && patchState({ menu: null });
    setTimeout(() => document.addEventListener('mousedown', close));
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);
  if (!menu || !tree) return null;
  const n = menu.id ? findNode(tree, menu.id) : null;
  const isRoot = n?.id === tree.id;
  const run = (fn: () => void) => () => {
    patchState({ menu: null });
    fn();
  };
  type Item = [string, string, () => void] | { label: string; sub: Item[] } | '-';
  const abs = n ? ['absolute', 'fixed'].includes(resolveProps(n, bp).position?.mode ?? '') : false;
  const st = n ? resolveProps(n, bp).style ?? {} : {};
  const transform: Item[] = [
    ['Horizontaal spiegelen', 'Shift+H', () => flipSelection('x')],
    ['Verticaal spiegelen', 'Shift+V', () => flipSelection('y')],
    '-',
    ['90° rechtsom draaien', ']', () => rotateSelection(90)],
    ['90° linksom draaien', '[', () => rotateSelection(-90)],
    ['180° draaien', '', () => rotateSelection(180)],
    ['15° rechtsom', 'Shift+]', () => rotateSelection(15)],
    ['15° linksom', 'Shift+[', () => rotateSelection(-15)],
    '-',
    [`Transformatie resetten${st.rotate || st.flipX || st.flipY ? '' : ' (niets om te resetten)'}`, 'Alt+R', resetTransform],
  ];
  const size: Item[] = [
    ['Volle breedte', '', () => setSizeMode('fill')],
    ['Passend om de inhoud', '', () => setSizeMode('hug')],
    ['Vierkant maken', '', () => setSizeMode('square')],
  ];
  const many = selectedIds().length > 1;
  const A = many ? alignSelection : alignAbsolute;
  const align: Item[] = [
    ['Links', 'Alt+A', () => A('left')],
    ['Horizontaal centreren', 'Alt+H', () => A('center-x')],
    ['Rechts', 'Alt+D', () => A('right')],
    '-',
    ['Boven', 'Alt+W', () => A('top')],
    ['Verticaal centreren', 'Alt+V', () => A('center-y')],
    ['Onder', 'Alt+S', () => A('bottom')],
    ...(many ? (['-', ['Gelijk verdelen: horizontaal', 'Alt+Shift+H', () => distributeSelection('x')], ['Gelijk verdelen: verticaal', 'Alt+Shift+V', () => distributeSelection('y')]] as Item[]) : []),
  ];
  const items: Item[] = n
    ? [
        ['Kopiëren', 'Ctrl+C', copySelection],
        ['Knippen', 'Ctrl+X', () => copySelection(true)],
        ['Plakken', 'Ctrl+V', paste],
        ['Dupliceren', 'Ctrl+D', duplicateSelection],
        { label: 'Stijl', sub: [['Stijl kopiëren', 'Ctrl+Alt+C', copyStyle], [hasStyleClipboard() ? 'Stijl plakken' : 'Stijl plakken (eerst kopiëren)', 'Ctrl+Alt+V', pasteStyle]] },
        '-',
        ...(!isRoot ? [{ label: 'Transformeren', sub: transform } as Item, { label: 'Formaat', sub: size } as Item] : []),
        ...(!isRoot && abs ? [{ label: many ? 'Uitlijnen en verdelen' : 'Uitlijnen in ouder', sub: align } as Item] : []),
        { label: 'Volgorde', sub: [['Helemaal naar voren', 'Ctrl+Shift+]', () => moveToEdge('front')], ['Eén naar voren', 'Alt+↓', () => nudgeOrder(1)], ['Eén naar achteren', 'Alt+↑', () => nudgeOrder(-1)], ['Helemaal naar achteren', 'Ctrl+Shift+[', () => moveToEdge('back')]] },
        '-',
        ['In frame zetten', 'Ctrl+Alt+G', wrapInFrame],
        ...(n.type === 'frame' && !isRoot ? [['Frame opheffen', 'Ctrl+Shift+G', unwrapFrame] as Item] : []),
        ...(n.type === 'frame' && !isRoot ? [['Component maken', 'Ctrl+Alt+K', () => void createComponentFromSelection()] as Item] : []),
        ...(n.type === 'frame' ? [['Opslaan als sectie…', 'Ctrl+Alt+S', () => patchState({ modal: 'save-section' })] as Item] : []),
        ...(n.type === 'instance' && n.component ? [['Component bewerken', 'dubbelklik', () => void openDoc({ kind: 'component', id: n.component })] as Item] : []),
        '-',
        [n.hidden ? 'Tonen' : 'Verbergen', 'Ctrl+Shift+H', () => setHidden(n.id, !n.hidden)],
        [n.locked ? 'Ontgrendelen' : 'Vergrendelen', '', () => setField(n.id, 'locked', n.locked ? undefined : true)],
        ...(bp !== 'desktop' && n.responsive?.[bp] ? [[`Aanpassingen ${bp === 'tablet' ? 'tablet' : 'mobiel'} terugzetten`, '', () => resetBreakpoint(n.id)] as Item] : []),
        ['Effecten…', '', () => patchState({ rightTab: 'effects' })],
        '-',
        ...(!isRoot ? [['Verwijderen', 'Delete', deleteSelection] as Item] : []),
      ]
    : [['Plakken', 'Ctrl+V', paste], ['Frame invoegen', 'F', () => insertType('frame')], ['Tekst invoegen', 'T', () => insertType('text')]];
  const rows = items.length;
  const x = Math.min(menu.x, window.innerWidth - 480);
  const y = Math.min(menu.y, window.innerHeight - rows * 32 - 20);
  return (
    <div className="vs-menu" ref={ref} style={{ left: Math.max(8, x), top: Math.max(8, y) }}>
      <MenuItems items={items} run={run} />
    </div>
  );
}

type MenuItem = [string, string, () => void] | { label: string; sub: MenuItem[] } | '-';
function MenuItems({ items, run }: { items: MenuItem[]; run: (fn: () => void) => () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      {items.map((it, i) =>
        it === '-' ? (
          <div key={i} className="vs-menu-sep" />
        ) : Array.isArray(it) ? (
          <button key={i} onClick={run(it[2])} onMouseEnter={() => setOpen(null)} className={it[0] === 'Verwijderen' ? 'danger' : ''}>
            <span>{it[0]}</span>
            <kbd>{it[1]}</kbd>
          </button>
        ) : (
          <div key={i} className="vs-menu-subwrap" onMouseEnter={() => setOpen(i)}>
            <button className={open === i ? 'on' : ''} onClick={() => setOpen(open === i ? null : i)}>
              <span>{it.label}</span>
              <kbd>›</kbd>
            </button>
            {open === i && (
              <div className="vs-menu vs-submenu">
                <MenuItems items={it.sub} run={run} />
              </div>
            )}
          </div>
        ),
      )}
    </>
  );
}

// ── Kruimelpad onder het canvas ──────────────────────────────
export function Breadcrumbs() {
  const { tree, selection } = useStore();
  if (!tree || !selection) return <div className="vs-crumbs"><span className="vs-muted">Klik op iets om het te selecteren · Shift+klik voor meer · rechtsklik voor opties · Ctrl+K voor alle acties</span></div>;
  const path = pathTo(tree, selection);
  return (
    <div className="vs-crumbs">
      {path.map((n, i) => (
        <span key={n.id}>
          {i > 0 && <i>›</i>}
          <button className={n.id === selection ? 'on' : ''} onClick={() => select(n.id)}>{n.name}</button>
        </span>
      ))}
    </div>
  );
}

// ── Opslaan als sectie ───────────────────────────────────────
export function SaveSectionModal() {
  const tree = useStore((s) => s.tree);
  const sel = useStore((s) => s.selection);
  const n = tree && sel ? findNode(tree, sel) : null;
  const [name, setName] = useState(n?.name ?? 'Mijn sectie');
  const [cat, setCat] = useState('Eigen');
  return (
    <Modal title="Opslaan als sectie" onClose={() => patchState({ modal: null })}>
      <p className="vs-help">Bewaar "{n?.name}" in je sectiebibliotheek (Invoegen → Opgeslagen). Daarna kun je hem op elke pagina invoegen, als losse kopie.</p>
      <Row label="Naam"><Text value={name} onChange={setName} /></Row>
      <Row label="Categorie"><Text value={cat} placeholder="bv. Hero, Werk, Eigen" onChange={setCat} /></Row>
      <div className="vs-row-buttons">
        <button className="vs-btn" onClick={() => patchState({ modal: null })}>Annuleren</button>
        <button className="vs-btn primary" onClick={async () => { await saveSelectionAsSection(name, cat); patchState({ modal: null }); }}>Opslaan</button>
      </div>
    </Modal>
  );
}

// ── Opdrachtenmenu (Ctrl+K) ──────────────────────────────────
interface Cmd {
  label: string;
  group: string;
  run: () => void;
  keys?: string;
}

export function CommandPalette() {
  const open = useStore((s) => s.palette);
  const { pages, projects, components } = useStore();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQ('');
      setI(0);
      setTimeout(() => input.current?.focus());
    }
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const go = (bp: Breakpoint) => () => patchState({ bp });
    return [
      ...(['frame', 'text', 'image', 'video', 'button', 'svg', 'collection', 'form', 'embed'] as const).map((t) => ({
        group: 'Invoegen',
        label: { frame: 'Frame', text: 'Tekst', image: 'Afbeelding', video: 'Video', button: 'Knop', svg: 'Icoon / vorm', collection: 'Projecten-grid', form: 'Formulier', embed: 'Embed' }[t],
        run: () => insertType(t),
      })),
      ...SECTION_LIBRARY.map((s) => ({ group: 'Sectie', label: s.name, run: () => insertTree(s.build()) })),
      ...pages.map((p) => ({ group: 'Pagina openen', label: p.title, run: () => void openDoc({ kind: 'page', id: p.id }) })),
      ...projects.map((p) => ({ group: 'Project openen', label: p.title, run: () => void openDoc({ kind: 'project', id: p.id }) })),
      ...components.map((c) => ({ group: 'Component bewerken', label: c.name, run: () => void openDoc({ kind: 'component', id: c.id }) })),
      { group: 'Venster', label: 'Thema', run: () => patchState({ modal: 'theme' }) },
      { group: 'Venster', label: 'Site-instellingen', run: () => patchState({ modal: 'site' }) },
      { group: 'Venster', label: 'Publiceren & hosting (GitHub + Vercel)', run: () => patchState({ modal: 'hosting' }) },
      { group: 'Venster', label: 'Toegang & live voorbeeld (vergrendelen)', run: () => patchState({ modal: 'access' }) },
      { group: 'Venster', label: 'Formulierinzendingen', run: () => patchState({ modal: 'inbox' }) },
      { group: 'Venster', label: 'Versiegeschiedenis', run: () => patchState({ modal: 'history' }) },
      { group: 'Weergave', label: 'Desktop', run: go('desktop') },
      { group: 'Weergave', label: 'Tablet', run: go('tablet') },
      { group: 'Weergave', label: 'Mobiel', run: go('mobile') },
      { group: 'Weergave', label: 'Live voorbeeld openen', run: () => window.open('/preview/', 'vystara-preview') },
    ];
  }, [pages, projects, components]);

  if (!open) return null;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const list = cmds.filter((c) => words.every((w) => `${c.group} ${c.label}`.toLowerCase().includes(w))).slice(0, 40);
  const choose = (c?: Cmd) => {
    if (!c) return;
    patchState({ palette: false });
    c.run();
  };
  return (
    <div className="vs-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && patchState({ palette: false })}>
      <div className="vs-palette">
        <input
          ref={input}
          className="vs-input"
          placeholder="Typ om te zoeken: sectie, pagina, thema, mobiel…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') patchState({ palette: false });
            if (e.key === 'ArrowDown') { e.preventDefault(); setI(Math.min(list.length - 1, i + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI(Math.max(0, i - 1)); }
            if (e.key === 'Enter') choose(list[i]);
          }}
        />
        <div className="vs-palette-list">
          {list.map((c, j) => (
            <button key={`${c.group}-${c.label}-${j}`} className={j === i ? 'on' : ''} onMouseEnter={() => setI(j)} onClick={() => choose(c)}>
              <span className="vs-muted">{c.group}</span>
              <span className="grow">{c.label}</span>
            </button>
          ))}
          {!list.length && <p className="vs-help">Niets gevonden.</p>}
        </div>
      </div>
    </div>
  );
}
