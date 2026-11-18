import { useMemo, useState } from 'react';
import {
  SECTION_LIBRARY,
  SVG_LIBRARY,
  cloneWithNewIds,
  expandTree,
  newNode,
  svgColorVars,
  color as cssColor,
  uid,
  type FrameNode,
  type SvgNode,
  type VNode,
} from '@vystara/core';
import { RenderNode } from './Canvas';
import { deleteSavedSection, insertNode, insertTree, insertType, useStore } from './store';

type Tab = 'elements' | 'sections' | 'saved' | 'svg';

const ELEMENTS: { type: VNode['type']; label: string; icon: string; hint: string }[] = [
  { type: 'frame', label: 'Frame', icon: '<rect x="4" y="4" width="16" height="16" rx="2"/>', hint: 'F' },
  { type: 'text', label: 'Tekst', icon: '<path d="M5 6h14M12 6v13"/>', hint: 'T' },
  { type: 'image', label: 'Afbeelding', icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>', hint: '' },
  { type: 'video', label: 'Video', icon: '<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2"/>', hint: '' },
  { type: 'button', label: 'Knop', icon: '<rect x="3" y="8" width="18" height="8" rx="4"/>', hint: '' },
  { type: 'svg', label: 'Icoon / vorm', icon: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', hint: '' },
  { type: 'collection', label: 'Projecten-grid', icon: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>', hint: '' },
  { type: 'form', label: 'Formulier', icon: '<rect x="4" y="4" width="16" height="4" rx="1"/><rect x="4" y="11" width="16" height="4" rx="1"/><path d="M4 19h8"/>', hint: '' },
  { type: 'embed', label: 'Embed', icon: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>', hint: '' },
];

export function InsertPanel() {
  const [tab, setTab] = useState<Tab>('sections');
  const sections = useStore((s) => s.sections);
  return (
    <div>
      <div className="vs-insert-tabs">
        {([['sections', 'Secties'], ['elements', 'Elementen'], ['svg', 'Iconen & vormen'], ['saved', `Opgeslagen${sections.length ? ` (${sections.length})` : ''}`]] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'elements' && <Elements />}
      {tab === 'sections' && <Library />}
      {tab === 'saved' && <Saved />}
      {tab === 'svg' && <Svgs />}
    </div>
  );
}

function Elements() {
  return (
    <>
      <div className="vs-el-grid">
        {ELEMENTS.map((e) => (
          <button key={e.type} className="vs-el" onClick={() => insertType(e.type)} title={e.hint ? `${e.label} (${e.hint})` : e.label}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: e.icon }} />
            {e.label}
          </button>
        ))}
      </div>
      <p className="vs-help">Wordt ingevoegd in het geselecteerde frame, of na de geselecteerde laag.</p>
    </>
  );
}

/** Mini-voorbeeld van een sectie, getekend met de echte renderer en het huidige thema. */
function MiniPreview({ tree }: { tree: FrameNode }) {
  const { site, components, projects, assets } = useStore();
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);
  const expanded = useMemo(
    () => (site ? (expandTree(tree, { site, components: Object.fromEntries(components.map((c) => [c.id, c])), projects, project: projects[0] ?? null, year: '' }) as FrameNode) : null),
    [tree, site, components, projects],
  );
  if (!expanded) return null;
  // De echte breedte is 1440; verkleind naar het paneel. Effecten staan stil.
  return (
    <div className="vs-sec-thumb">
      <div className="vs-board" style={{ width: 1440, zoom: 0.158 }}>
        <RenderNode node={expanded} parentMode="vertical" ctx={{ bp: 'desktop', assets: assetMap, editingText: null }} />
      </div>
    </div>
  );
}

function Library() {
  const cats = [...new Set(SECTION_LIBRARY.map((s) => s.category))];
  const built = useMemo(() => Object.fromEntries(SECTION_LIBRARY.map((s) => [s.id, s.build()])), []);
  return (
    <>
      <p className="vs-help">Alle secties gebruiken je thema: wissel van thema en ze passen mee. Klik om in te voegen na de geselecteerde sectie.</p>
      {cats.map((c) => (
        <div key={c}>
          <div className="vs-cat">{c}</div>
          {SECTION_LIBRARY.filter((s) => s.category === c).map((s) => (
            <div key={s.id} className="vs-sec-card" onClick={() => insertTree(s.build())} title={s.description}>
              <MiniPreview tree={built[s.id]} />
              <div className="vs-sec-meta">
                <b>{s.name}</b>
                <span className="vs-muted">{s.description}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Saved() {
  const sections = useStore((s) => s.sections);
  if (!sections.length)
    return <p className="vs-help">Nog niets opgeslagen. Selecteer een sectie of frame en kies "Opslaan als sectie" (rechtsklik of Ctrl+Alt+S). Opgeslagen secties zijn op elke pagina te gebruiken.</p>;
  const cats = [...new Set(sections.map((s) => s.category))];
  return (
    <>
      {cats.map((c) => (
        <div key={c}>
          <div className="vs-cat">{c}</div>
          {sections.filter((s) => s.category === c).map((s) => (
            <div key={s.id} className="vs-sec-card" onClick={() => insertTree(s.tree)}>
              <MiniPreview tree={s.tree} />
              <div className="vs-sec-meta" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <b className="grow">{s.name}</b>
                <button
                  className="vs-icon-btn"
                  title="Verwijderen"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Opgeslagen sectie "${s.name}" verwijderen?`)) void deleteSavedSection(s.id);
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function Svgs() {
  const cats = [...new Set(SVG_LIBRARY.map((x) => x.category))];
  const insert = (id: string) => {
    const it = SVG_LIBRARY.find((x) => x.id === id)!;
    const node: SvgNode = {
      id: uid(),
      type: 'svg',
      name: it.name,
      svg: it.svg,
      colors: [...it.colors],
      stretch: it.stretch,
      size: it.stretch
        ? { width: 'fill', height: 'fixed', h: 100 }
        : it.id === 'vx-logo'
          ? { width: 'fixed', w: 320, height: 'fixed', h: 80 }
          : it.id === 'vx-pattern'
            ? { width: 'fill', height: 'fixed', h: 320 }
            : { width: 'fixed', w: it.category === 'Vormen' || it.category === 'Decoratie' || it.category === 'Merk' ? 160 : 40, height: 'fixed', h: it.category === 'Vormen' || it.category === 'Decoratie' || it.category === 'Merk' ? 160 : 40 },
    };
    insertNode(cloneWithNewIds(node));
  };
  return (
    <div className="vs-board" style={{ background: 'none', boxShadow: 'none', color: 'var(--ui-text)' }}>
      <p className="vs-help">Alle kleuren zijn per laag aan te passen. Upload je eigen SVG bij Assets en kies hem in het paneel rechts: elke kleur wordt dan een los instelbaar veld.</p>
      {cats.map((c) => (
        <div key={c}>
          <div className="vs-cat">{c}</div>
          <div className="vs-svg-grid">
            {SVG_LIBRARY.filter((x) => x.category === c).map((x) => {
              const vars: Record<string, string> = {};
              for (const part of svgColorVars(x.colors, cssColor).split(';').filter(Boolean)) {
                const i = part.indexOf(':');
                vars[part.slice(0, i)] = part.slice(i + 1);
              }
              return (
                <button key={x.id} className={`vs-svg-item ${x.stretch ? 'wide' : ''}`} title={x.name} onClick={() => insert(x.id)}>
                  <div style={vars} dangerouslySetInnerHTML={{ __html: x.svg }} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

void newNode;
