// Eigen sneltoetsen: elke actie hieronder kun je op een andere toets zetten.
import { useEffect, useState } from 'react';
import { BREAKPOINT_CANVAS } from '@vystara/core';
import {
  copyStyle, createComponentFromSelection, duplicateSelection, flipSelection, moveToEdge, pasteStyle, patchState, selectSimilar,
  toggleAutoLayout, toggleHideSelection, toggleLockSelection, toggleSplit, unwrapFrame, useStore, wrapInFrame, zoomToSelection, insertType,
} from './store';
import { toggleGrid } from './Grid';
import { toggleRulers } from './Rulers';

function fitZoom() {
  const { bp } = useStore.getState();
  const avail = (document.querySelector('.vs-center')?.clientWidth ?? 1200) - 120;
  patchState({ zoom: Math.max(0.25, Math.min(1, Math.floor((avail / BREAKPOINT_CANVAS[bp]) * 20) / 20)) });
}
const rename = () => {
  const st = useStore.getState();
  if (st.selection && st.selection !== st.tree?.id) patchState({ leftTab: 'layers', renaming: st.selection });
};

export interface Action { id: string; label: string; keys: string; run: () => void }
export const ACTIONS: Action[] = [
  { id: 'duplicate', label: 'Dupliceren', keys: 'Ctrl+D', run: duplicateSelection },
  { id: 'wrap', label: 'In frame zetten', keys: 'Ctrl+Alt+G', run: wrapInFrame },
  { id: 'unwrap', label: 'Frame opheffen', keys: 'Ctrl+Shift+G', run: unwrapFrame },
  { id: 'component', label: 'Component maken', keys: 'Ctrl+Alt+K', run: () => void createComponentFromSelection() },
  { id: 'copy-style', label: 'Stijl kopiëren', keys: 'Ctrl+Alt+C', run: copyStyle },
  { id: 'paste-style', label: 'Stijl plakken', keys: 'Ctrl+Alt+V', run: pasteStyle },
  { id: 'hide', label: 'Verbergen', keys: 'Ctrl+Shift+H', run: toggleHideSelection },
  { id: 'lock', label: 'Vergrendelen', keys: 'Ctrl+Shift+L', run: toggleLockSelection },
  { id: 'similar', label: 'Alles wat erop lijkt selecteren', keys: 'Ctrl+Shift+A', run: selectSimilar },
  { id: 'rename', label: 'Hernoemen', keys: 'F2', run: rename },
  { id: 'front', label: 'Helemaal naar voren', keys: 'Ctrl+Shift+]', run: () => moveToEdge('front') },
  { id: 'back', label: 'Helemaal naar achteren', keys: 'Ctrl+Shift+[', run: () => moveToEdge('back') },
  { id: 'flip-x', label: 'Horizontaal spiegelen', keys: 'Shift+H', run: () => flipSelection('x') },
  { id: 'flip-y', label: 'Verticaal spiegelen', keys: 'Shift+V', run: () => flipSelection('y') },
  { id: 'auto-layout', label: 'Auto layout aan/uit', keys: 'Shift+A', run: toggleAutoLayout },
  { id: 'frame', label: 'Frame invoegen', keys: 'F', run: () => insertType('frame') },
  { id: 'text', label: 'Tekst invoegen', keys: 'T', run: () => insertType('text') },
  { id: 'zoom-fit', label: 'Alles in beeld', keys: 'Shift+1', run: fitZoom },
  { id: 'zoom-sel', label: 'Inzoomen op selectie', keys: 'Shift+2', run: zoomToSelection },
  { id: 'grid', label: 'Kolommenraster', keys: 'Shift+G', run: toggleGrid },
  { id: 'split', label: 'Mobiel en desktop naast elkaar', keys: 'Shift+M', run: toggleSplit },
  { id: 'rulers', label: 'Linialen', keys: 'Shift+R', run: toggleRulers },
  { id: 'find', label: 'Zoeken en vervangen', keys: 'Ctrl+F', run: () => patchState({ modal: 'find' }) },
  { id: 'palette', label: 'Opdrachtenpalet', keys: 'Ctrl+K', run: () => patchState({ palette: !useStore.getState().palette }) },
  { id: 'section', label: 'Opslaan als sectie', keys: 'Ctrl+Alt+S', run: () => patchState({ modal: 'save-section' }) },
];

const KEY = 'vs-keys';
export function customKeys(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}
function saveKeys(m: Record<string, string>) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* geen opslag */ }
  window.dispatchEvent(new Event('vs-keys'));
}

const CODE: Record<string, string> = { BracketLeft: '[', BracketRight: ']', Comma: ',', Period: '.', Slash: '/', Backslash: '\\', Semicolon: ';', Quote: "'", Minus: '-', Equal: '=', Backquote: '`', Space: 'Spatie' };
/** Een toetsaanslag als tekst, bv. "Ctrl+Shift+L". Gebaseerd op de fysieke toets, zodat het op elk toetsenbord gelijk werkt. */
export function comboOf(e: KeyboardEvent): string | null {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  let k = e.code.startsWith('Key') ? e.code.slice(3) : e.code.startsWith('Digit') ? e.code.slice(5) : CODE[e.code] ?? (/^F\d+$/.test(e.code) ? e.code : e.key.length === 1 ? e.key.toUpperCase() : e.code);
  if (!k) return null;
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  parts.push(k);
  return parts.join('+');
}

/**
 * Eerst kijken of de toets bij een eigen sneltoets hoort. Geeft true als hij is afgehandeld
 * (of bewust geblokkeerd, omdat die actie nu op een andere toets staat).
 */
export function handleCustomKey(e: KeyboardEvent): boolean {
  const map = customKeys();
  if (!Object.keys(map).length) return false;
  const combo = comboOf(e);
  if (!combo) return false;
  const hit = ACTIONS.find((a) => map[a.id] === combo);
  if (hit) {
    e.preventDefault();
    hit.run();
    return true;
  }
  // Oude toets van een verplaatste actie doet niets meer (behalve als een andere actie hem nog standaard gebruikt).
  if (ACTIONS.some((a) => map[a.id] && map[a.id] !== a.keys && a.keys === combo)) {
    e.preventDefault();
    return true;
  }
  return false;
}

export function KeymapEditor() {
  const [map, setMap] = useState(customKeys);
  const [rec, setRec] = useState<string | null>(null);
  useEffect(() => {
    const f = () => setMap(customKeys());
    window.addEventListener('vs-keys', f);
    return () => window.removeEventListener('vs-keys', f);
  }, []);
  useEffect(() => {
    if (!rec) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setRec(null); return; }
      const c = comboOf(e);
      if (!c) return;
      const def = ACTIONS.find((a) => a.id === rec)!.keys;
      const next = { ...map };
      // Dezelfde toets bij een andere actie? Die laten we los.
      for (const a of ACTIONS) if (a.id !== rec && (next[a.id] ?? a.keys) === c) next[a.id] = '';
      if (c === def) delete next[rec];
      else next[rec] = c;
      saveKeys(next);
      setRec(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [rec, map]);
  return (
    <div className="vs-keymap">
      <p className="vs-help" style={{ marginTop: 0 }}>Klik op een toets en druk de nieuwe combinatie in (Esc = annuleren). Deze instellingen gelden voor deze computer.</p>
      {ACTIONS.map((a) => {
        const cur = map[a.id] ?? a.keys;
        const changed = a.id in map;
        return (
          <div key={a.id} className="vs-shortcut-row">
            <span>{a.label}{changed && <small className="vs-muted"> (standaard {a.keys})</small>}</span>
            <span>
              <button className={`vs-btn vs-keybtn ${rec === a.id ? 'rec' : ''}`} onClick={() => setRec(a.id)}>{rec === a.id ? 'Druk een toets…' : cur || 'geen'}</button>
              {changed && <button className="vs-icon-btn" title="Terug naar standaard" onClick={() => { const { [a.id]: _, ...rest } = map; saveKeys(rest); }}>↺</button>}
            </span>
          </div>
        );
      })}
      {!!Object.keys(map).length && <button className="vs-btn" style={{ marginTop: 12 }} onClick={() => saveKeys({})}>Alles terug naar standaard</button>}
    </div>
  );
}
