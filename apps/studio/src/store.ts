import { create } from 'zustand';
import { applyPatches, enablePatches, produceWithPatches, type Patch } from 'immer';
import {
  cloneWithNewIds,
  findNode,
  findParent,
  frame,
  newNode,
  resolveProps,
  uid,
  type Asset,
  type Breakpoint,
  type Component,
  type FrameNode,
  type Page,
  type Position,
  type Project,
  type ResponsiveProps,
  type SiteSettings,
  type Size,
  type Style,
  type Theme,
  type VNode,
  type SharedStyle,
  siteTheme,
} from '@vystara/core';
import { api, type Bootstrap } from './api';

enablePatches();

export type DocKind = 'page' | 'project' | 'component';
export interface DocRef {
  kind: DocKind;
  id: string;
}

interface HistoryEntry {
  patches: Patch[];
  inverse: Patch[];
  label: string;
  at: number;
}

export type SaveState = 'saved' | 'dirty' | 'saving' | 'error';
export type LeftTab = 'insert' | 'pages' | 'layers' | 'assets' | 'components' | 'projects';

export interface SavedSection {
  id: string;
  name: string;
  category: string;
  tree: FrameNode;
  createdAt: string;
}

interface State {
  ready: boolean;
  site: SiteSettings | null;
  pages: (Page & { sort: number })[];
  projects: Project[];
  components: Component[];
  assets: Asset[];

  doc: DocRef | null;
  tree: FrameNode | null;
  selection: string | null;
  /** Extra geselecteerde lagen (Shift+klik). De eerste selectie bepaalt wat het paneel toont. */
  extra: string[];
  hover: string | null;
  editingText: string | null;
  bp: Breakpoint;
  zoom: number;
  leftTab: LeftTab;
  save: SaveState;
  past: HistoryEntry[];
  future: HistoryEntry[];
  toast: { text: string; kind: 'info' | 'error' } | null;
  modal: 'site' | 'history' | 'inbox' | 'theme' | 'hosting' | 'access' | 'save-section' | 'shortcuts' | null;
  unread: number;
  sections: SavedSection[];
  themes: Theme[];
  rightTab: 'design' | 'effects';
  docTab: 'page' | 'seo';
  /** Taal waarin je teksten bewerkt (null = hoofdtaal). */
  lang: string | null;
  menu: { x: number; y: number; id: string | null } | null;
  palette: boolean;
}

export const useStore = create<State>(() => ({
  ready: false,
  site: null,
  pages: [],
  projects: [],
  components: [],
  assets: [],
  doc: null,
  tree: null,
  selection: null,
  extra: [],
  hover: null,
  editingText: null,
  bp: 'desktop',
  zoom: 1,
  leftTab: 'insert',
  save: 'saved',
  past: [],
  future: [],
  toast: null,
  modal: null,
  unread: 0,
  sections: [],
  themes: [],
  rightTab: 'design',
  docTab: 'page',
  lang: null,
  menu: null,
  palette: false,
}));

const get = useStore.getState;
const set = useStore.setState;

// ── Meldingen ────────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, kind: 'info' | 'error' = 'info') {
  set({ toast: { text, kind } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toast: null }), kind === 'error' ? 6000 : 3000);
}

// ── Laden ────────────────────────────────────────────────────
export async function loadAll() {
  const [b, sections, themes] = await Promise.all([
    api.get<Bootstrap>('/api/bootstrap'),
    api.get<SavedSection[]>('/api/sections').catch(() => []),
    api.get<Theme[]>('/api/themes').catch(() => []),
  ]);
  set({ ...b, sections, themes, ready: true });
  if (!get().doc) {
    const home = b.pages.find((p) => p.slug === '') ?? b.pages[0];
    if (home) openDoc({ kind: 'page', id: home.id });
  }
}

export async function refreshAssets() {
  set({ assets: await api.get<Asset[]>('/api/assets') });
}

function docTree(ref: DocRef): FrameNode | null {
  const s = get();
  if (ref.kind === 'page') return s.pages.find((p) => p.id === ref.id)?.tree ?? null;
  if (ref.kind === 'component') return s.components.find((c) => c.id === ref.id)?.tree ?? null;
  const pr = s.projects.find((p) => p.id === ref.id);
  if (!pr) return null;
  return (
    pr.tree ??
    frame('Projectinhoud', { layout: { mode: 'vertical', gap: 32 }, size: { width: 'fill' } }, [
      { id: uid(), type: 'text', name: 'Tekst', content: 'Vertel hier over het project. Voeg video\'s en afbeeldingen toe.', style: { fontSize: 18, lineHeight: 1.6 } },
    ])
  );
}

export async function openDoc(ref: DocRef) {
  await flushSave();
  const tree = docTree(ref);
  if (!tree) return;
  set({ doc: ref, tree: structuredClone(tree), selection: null, extra: [], hover: null, editingText: null, past: [], future: [], save: 'saved' });
}

export function docTitle(): string {
  const { doc, pages, projects, components } = get();
  if (!doc) return '';
  if (doc.kind === 'page') return pages.find((p) => p.id === doc.id)?.title ?? '';
  if (doc.kind === 'project') return `Project: ${projects.find((p) => p.id === doc.id)?.title ?? ''}`;
  return `Component: ${components.find((c) => c.id === doc.id)?.name ?? ''}`;
}

// ── Bewerken met undo/redo ───────────────────────────────────
const MERGE_MS = 800;

/** Elke wijziging aan de boom gaat hierdoorheen. Zelfde label kort achter elkaar = één undo-stap. */
export function mutate(label: string, recipe: (tree: FrameNode) => void) {
  const { tree, past } = get();
  if (!tree) return;
  const [next, patches, inverse] = produceWithPatches(tree, recipe);
  if (!patches.length) return;
  const last = past[past.length - 1];
  const now = Date.now();
  let newPast: HistoryEntry[];
  if (last && last.label === label && now - last.at < MERGE_MS) {
    newPast = [...past.slice(0, -1), { label, at: now, patches: [...last.patches, ...patches], inverse: [...inverse, ...last.inverse] }];
  } else {
    newPast = [...past, { label, at: now, patches, inverse }].slice(-200);
  }
  set({ tree: next, past: newPast, future: [], save: 'dirty' });
  scheduleSave();
}

export function undo() {
  const { tree, past, future } = get();
  const e = past[past.length - 1];
  if (!tree || !e) return;
  set({ tree: applyPatches(tree, e.inverse), past: past.slice(0, -1), future: [...future, e], save: 'dirty' });
  fixSelection();
  scheduleSave();
}

export function redo() {
  const { tree, past, future } = get();
  const e = future[future.length - 1];
  if (!tree || !e) return;
  set({ tree: applyPatches(tree, e.patches), future: future.slice(0, -1), past: [...past, e], save: 'dirty' });
  fixSelection();
  scheduleSave();
}

function fixSelection() {
  const { tree, selection, extra } = get();
  if (!tree) return;
  if (selection && !findNode(tree, selection)) set({ selection: null });
  set({ extra: extra.filter((id) => findNode(tree, id)) });
}

// ── Opslaan ──────────────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), 1200);
}

export async function flushSave() {
  clearTimeout(saveTimer);
  if (saving) await saving;
  const { doc, tree, save } = get();
  if (!doc || !tree || save !== 'dirty') return;
  set({ save: 'saving' });
  saving = (async () => {
    try {
      if (doc.kind === 'page') {
        const p = await api.put<Page & { sort: number }>(`/api/pages/${doc.id}`, { tree });
        set({ pages: get().pages.map((x) => (x.id === p.id ? p : x)) });
      } else if (doc.kind === 'component') {
        const c = get().components.find((x) => x.id === doc.id)!;
        const saved = await api.put<Component>(`/api/components/${doc.id}`, { name: c.name, tree });
        set({ components: get().components.map((x) => (x.id === saved.id ? saved : x)) });
      } else {
        const pr = get().projects.find((x) => x.id === doc.id)!;
        const saved = await api.put<Project>(`/api/projects/${doc.id}`, { ...pr, tree });
        set({ projects: get().projects.map((x) => (x.id === saved.id ? saved : x)) });
      }
      // Alleen 'saved' als er intussen niets nieuws gewijzigd is.
      if (get().tree === tree) set({ save: 'saved' });
      else set({ save: 'dirty' });
    } catch (e) {
      set({ save: 'error' });
      toast(`Opslaan mislukt: ${(e as Error).message}`, 'error');
    }
  })();
  await saving;
  saving = null;
  if (get().save === 'dirty') scheduleSave();
}

window.addEventListener('beforeunload', (e) => {
  if (get().save === 'dirty' || get().save === 'saving') {
    void flushSave();
    e.preventDefault();
  }
});

// ── Selectie ─────────────────────────────────────────────────
export function select(id: string | null, additive = false) {
  const { selection, extra } = get();
  if (additive && id && selection && id !== selection) {
    // Shift+klik: toevoegen of weer weghalen.
    set({ extra: extra.includes(id) ? extra.filter((x) => x !== id) : [...extra, id], editingText: null });
    return;
  }
  set({ selection: id, extra: [], editingText: null });
}

/** Alle geselecteerde ids (hoofdselectie eerst), zonder de root. */
export function selectedIds(): string[] {
  const { selection, extra, tree } = get();
  return [selection, ...extra].filter((x): x is string => !!x && x !== tree?.id);
}

/** Wijzigingen via het paneel gelden voor de hele selectie. */
function targetsFor(id: string): string[] {
  const { selection, extra } = get();
  return id === selection && extra.length ? [id, ...extra] : [id];
}

export function selected(): VNode | null {
  const { tree, selection } = get();
  return tree && selection ? findNode(tree, selection) : null;
}

// ── Eigenschappen, rekening houdend met het breakpoint ───────
type Section = 'layout' | 'size' | 'position' | 'style';

/** Zet een eigenschap op desktop (basis) of als aanpassing voor tablet/mobiel. */
export function setProp(id: string, section: Section, key: string, value: unknown) {
  const bp = get().bp;
  const ids = targetsFor(id);
  mutate(`prop:${id}:${section}.${key}:${bp}`, (t) => {
    for (const nid of ids) {
    const n = findNode(t, nid);
    if (!n) continue;
    let target: ResponsiveProps = n;
    if (bp !== 'desktop') {
      n.responsive ??= {};
      target = n.responsive[bp] ??= {};
    }
    const obj = { ...((target[section] as Record<string, unknown> | undefined) ?? {}) };
    if (value === undefined || value === '') delete obj[key];
    else obj[key] = value;
    (target as Record<string, unknown>)[section] = Object.keys(obj).length ? obj : undefined;
    if (bp !== 'desktop') cleanupResponsive(n);
    }
  });
}

/** Figma "Reset all changes": alle aanpassingen voor dit breakpoint weg. */
export function resetBreakpoint(id: string) {
  const bp = get().bp;
  if (bp === 'desktop') return;
  mutate(`resetbp:${id}`, (t) => {
    for (const nid of targetsFor(id)) {
      const n = findNode(t, nid);
      if (n?.responsive?.[bp]) {
        delete n.responsive[bp];
        cleanupResponsive(n);
      }
    }
  });
}

/** Verwijder de aanpassing voor dit breakpoint, zodat de waarde weer erft. */
export function resetProp(id: string, section: Section, key: string) {
  const bp = get().bp;
  if (bp === 'desktop') return;
  mutate(`reset:${id}`, (t) => {
    const n = findNode(t, id);
    const o = n?.responsive?.[bp]?.[section] as Record<string, unknown> | undefined;
    if (!n || !o) return;
    delete o[key];
    cleanupResponsive(n);
  });
}

export function setHidden(id: string, hidden: boolean) {
  const bp = get().bp;
  mutate(`hidden:${id}`, (t) => {
    const n = findNode(t, id);
    if (!n) return;
    if (bp === 'desktop') n.hidden = hidden || undefined;
    else {
      n.responsive ??= {};
      const r = (n.responsive[bp] ??= {});
      r.hidden = hidden;
      cleanupResponsive(n);
    }
  });
}

function cleanupResponsive(n: VNode) {
  if (!n.responsive) return;
  for (const bp of ['tablet', 'mobile'] as const) {
    const r = n.responsive[bp];
    if (!r) continue;
    for (const k of ['layout', 'size', 'position', 'style'] as const) {
      if (r[k] && !Object.keys(r[k]!).length) delete r[k];
    }
    if (!Object.keys(r).length) delete n.responsive[bp];
  }
  if (!Object.keys(n.responsive).length) delete n.responsive;
}

/** Velden die niet per breakpoint verschillen (tekst, asset, link, ...). */
export function setField(id: string, key: string, value: unknown) {
  // Naam en inhoud gelden alleen voor de hoofdselectie; de rest (effecten, links, ...) voor alles.
  const ids = ['name', 'content', 'label', 'asset', 'anchor', 'fields'].includes(key) ? [id] : targetsFor(id);
  mutate(`field:${id}:${key}`, (t) => {
    for (const nid of ids) {
      const n = findNode(t, nid) as unknown as Record<string, unknown> | null;
      if (!n) continue;
      if (value === undefined) delete n[key];
      else n[key] = structuredClone(value);
    }
  });
}

// ── Structuur: invoegen, verwijderen, verplaatsen ────────────
export function insertNode(node: VNode) {
  const { tree, selection } = get();
  if (!tree) return;
  mutate('insert', (t) => {
    const sel = selection ? findNode(t, selection) : null;
    if (sel && sel.type === 'frame') {
      sel.children.push(node);
    } else if (sel && sel.id !== t.id) {
      const p = findParent(t, sel.id);
      if (p) p.parent.children!.splice(p.index + 1, 0, node);
    } else {
      // Zonder selectie: vóór de footer (als de laatste laag een instance is), anders achteraan.
      const last = t.children[t.children.length - 1];
      const at = last?.type === 'instance' ? t.children.length - 1 : t.children.length;
      t.children.splice(at, 0, node);
    }
  });
  select(node.id);
}

export function insertType(type: VNode['type']) {
  insertNode(newNode(type));
}

export function deleteSelection() {
  const { tree, selection } = get();
  const ids = selectedIds();
  if (!tree || !selection || !ids.length) return;
  const p = findParent(tree, selection);
  mutate('delete', (t) => {
    for (const id of ids) {
      const q = findParent(t, id);
      if (q) q.parent.children!.splice(q.index, 1);
    }
  });
  const next = p ? (p.parent.children![p.index + 1]?.id ?? p.parent.children![p.index - 1]?.id ?? p.parent.id) : null;
  select(next && get().tree && findNode(get().tree!, next) ? next : null);
}

// ── Kopiëren en plakken (ook tussen pagina's, via localStorage) ──
const CLIP_KEY = 'vystara-clipboard';

export function copySelection(cut = false) {
  const { tree } = get();
  const ids = selectedIds();
  if (!tree || !ids.length) return;
  const nodes = ids.map((id) => findNode(tree, id)).filter(Boolean);
  try {
    localStorage.setItem(CLIP_KEY, JSON.stringify(nodes));
  } catch {
    /* privémodus: dan alleen binnen deze sessie */
  }
  memClip = nodes as VNode[];
  if (cut) deleteSelection();
  toast(`${nodes.length} ${nodes.length === 1 ? 'laag' : 'lagen'} ${cut ? 'geknipt' : 'gekopieerd'}`);
}
let memClip: VNode[] = [];

export function paste() {
  let nodes: VNode[] = memClip;
  try {
    const raw = localStorage.getItem(CLIP_KEY);
    if (raw) nodes = JSON.parse(raw);
  } catch {
    /* gebruik memClip */
  }
  if (!nodes.length) return;
  const copies = nodes.map((n) => cloneWithNewIds(n));
  const { tree, selection } = get();
  if (!tree) return;
  mutate('paste', (t) => {
    const sel = selection ? findNode(t, selection) : null;
    if (sel?.type === 'frame') sel.children.push(...copies);
    else if (sel && sel.id !== t.id) {
      const p = findParent(t, sel.id);
      if (p) p.parent.children!.splice(p.index + 1, 0, ...copies);
    } else t.children.push(...copies);
  });
  set({ selection: copies[0].id, extra: copies.slice(1).map((c) => c.id) });
}

export function duplicateSelection() {
  const { tree } = get();
  const ids = selectedIds();
  if (!tree || !ids.length) return;
  const made: string[] = [];
  mutate('duplicate', (t) => {
    for (const id of ids) {
      const n = findNode(t, id);
      const p = findParent(t, id);
      if (!n || !p) continue;
      const copy = cloneWithNewIds(JSON.parse(JSON.stringify(n)) as VNode);
      copy.name = `${n.name} kopie`;
      p.parent.children!.splice(p.index + 1, 0, copy);
      made.push(copy.id);
    }
  });
  set({ selection: made[0] ?? null, extra: made.slice(1) });
}

/** Verplaats een node naar vóór/na/in een andere node (lagenpaneel slepen). */
export function moveNode(id: string, targetId: string, where: 'before' | 'after' | 'inside') {
  const { tree } = get();
  if (!tree || id === targetId || id === tree.id) return;
  // Niet in jezelf of je eigen kinderen.
  const moving = findNode(tree, id);
  if (!moving || findNode(moving, targetId)) return;
  mutate('move', (t) => {
    const from = findParent(t, id);
    if (!from) return;
    const [n] = from.parent.children!.splice(from.index, 1);
    if (where === 'inside') {
      const target = findNode(t, targetId);
      if (target?.type === 'frame') target.children.push(n);
      else from.parent.children!.splice(from.index, 0, n);
      return;
    }
    const to = findParent(t, targetId);
    if (!to) {
      from.parent.children!.splice(from.index, 0, n);
      return;
    }
    to.parent.children!.splice(where === 'before' ? to.index : to.index + 1, 0, n);
  });
}

export function nudgeOrder(dir: -1 | 1) {
  const { tree, selection } = get();
  if (!tree || !selection) return;
  mutate('order', (t) => {
    const p = findParent(t, selection);
    if (!p) return;
    const arr = p.parent.children!;
    const j = p.index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[p.index], arr[j]] = [arr[j], arr[p.index]];
  });
}

/** Ctrl+Alt+G / Shift+A: selectie in een auto layout frame zetten. */
export function wrapInFrame() {
  const { tree, selection } = get();
  if (!tree || !selection || selection === tree.id) return;
  const n = findNode(tree, selection);
  if (!n) return;
  // Meerdere lagen met dezelfde ouder: samen in één frame, in de volgorde van de pagina.
  const parent = findParent(tree, selection)?.parent;
  const ids = selectedIds().filter((id) => findParent(tree, id)?.parent.id === parent?.id);
  const ordered = parent?.children?.filter((c) => ids.includes(c.id)).map((c) => c.id) ?? [selection];
  const wrapper = frame('Frame', { layout: { mode: ordered.length > 1 ? 'horizontal' : 'vertical', gap: 16 }, size: { width: n.size?.width ?? 'fill' } }, []);
  mutate('wrap', (t) => {
    const p = findParent(t, ordered[0]);
    if (!p) return;
    const moved: VNode[] = [];
    for (const id of ordered) {
      const q = findParent(t, id)!;
      moved.push(q.parent.children!.splice(q.index, 1)[0]);
    }
    p.parent.children!.splice(p.index, 0, wrapper);
    (findNode(t, wrapper.id) as FrameNode).children.push(...moved);
  });
  select(wrapper.id);
}

export function toggleAutoLayout() {
  const n = selected();
  if (!n) return;
  if (n.type === 'frame' && (n.layout?.mode ?? 'vertical') === 'none') setProp(n.id, 'layout', 'mode', 'vertical');
  else wrapInFrame();
}

/** Ctrl+Shift+G: frame opheffen, kinderen blijven op dezelfde plek. */
export function unwrapFrame() {
  const { tree, selection } = get();
  const n = selected();
  if (!tree || !n || n.type !== 'frame' || n.id === tree.id) return;
  mutate('unwrap', (t) => {
    const p = findParent(t, n.id);
    if (!p) return;
    const f = p.parent.children![p.index] as FrameNode;
    p.parent.children!.splice(p.index, 1, ...f.children);
  });
  select(n.children[0]?.id ?? null);
  void selection;
}

// ── Componenten ──────────────────────────────────────────────
export async function createComponentFromSelection() {
  const { tree, selection } = get();
  const n = selected();
  if (!tree || !n || n.type !== 'frame' || n.id === tree.id) {
    toast('Selecteer een frame om er een component van te maken', 'error');
    return;
  }
  const comp = await api.post<Component>('/api/components', { name: n.name, tree: cloneWithNewIds(n) });
  set({ components: [...get().components, comp] });
  const inst: VNode = { id: uid(), type: 'instance', name: comp.name, component: comp.id, size: { width: n.size?.width ?? 'fill' } };
  mutate('component', (t) => {
    const p = findParent(t, n.id);
    if (p) p.parent.children!.splice(p.index, 1, inst);
  });
  select(inst.id);
  toast(`Component "${comp.name}" gemaakt`);
  void selection;
}

export function insertInstance(componentId: string) {
  const c = get().components.find((x) => x.id === componentId);
  if (!c) return;
  insertNode({ id: uid(), type: 'instance', name: c.name, component: c.id, size: { width: 'fill' } });
}

// ── Data-bewerkingen buiten de boom ──────────────────────────
export function patchState(p: Partial<State>) {
  set(p);
}

// ── Secties, thema en site ───────────────────────────────────

/** Een kant-en-klare of opgeslagen sectie invoegen (met nieuwe ids). */
export function insertTree(tree: FrameNode) {
  const { tree: page, selection, doc } = get();
  if (!page) return;
  // Een sectie hoort op een pagina, niet in een blok als de header of footer: daar worden de
  // kolommen smal en breekt de tekst per letter af.
  if (doc?.kind === 'component' || (page.layout?.mode && page.layout.mode !== 'vertical')) {
    toast(doc?.kind === 'component' ? `Je bewerkt nu het blok "${page.name}". Open een pagina (links bij Pagina's) om een sectie toe te voegen.` : 'Secties kun je alleen aan een pagina toevoegen.', 'error');
    return;
  }
  const copy = cloneWithNewIds(structuredClone(tree));
  // Secties horen direct in de pagina: na de sectie waar de selectie in zit.
  mutate('section', (t) => {
    let at = -1;
    if (selection) {
      const top = t.children.findIndex((c) => c.id === selection || !!findNode(c, selection));
      if (top >= 0) at = top + 1;
    }
    if (at < 0) {
      const last = t.children[t.children.length - 1];
      at = last?.type === 'instance' && /footer/i.test(last.name) ? t.children.length - 1 : t.children.length;
    }
    t.children.splice(at, 0, copy);
  });
  set({ selection: copy.id, extra: [] });
  setTimeout(() => document.querySelector(`.vs-viewport [data-id="${copy.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
}

export async function saveSelectionAsSection(name: string, category: string) {
  const n = selected();
  if (!n || n.type !== 'frame') {
    toast('Selecteer een sectie of frame om op te slaan', 'error');
    return;
  }
  const saved = await api.post<SavedSection>('/api/sections', { name, category, tree: n });
  set({ sections: [saved, ...get().sections] });
  toast(`Sectie "${name}" opgeslagen onder Invoegen → Secties`);
}

export async function deleteSavedSection(id: string) {
  await api.del(`/api/sections/${id}`);
  set({ sections: get().sections.filter((s) => s.id !== id) });
}

/** Site-instellingen opslaan (thema, SEO, redirects, ...). */
export async function saveSite(site: SiteSettings) {
  const s = await api.put<SiteSettings>('/api/site', site);
  set({ site: s });
  return s;
}

// ── Transformeren (draaien, spiegelen, formaat, volgorde) ────
/** Stijl/maat/positie van alle geselecteerde lagen aanpassen, voor het huidige schermformaat. */
function editTargets(label: string, fn: (target: { style?: Style; size?: Size; position?: Position }, n: VNode) => void) {
  const { bp } = get();
  const ids = selectedIds();
  if (!ids.length) return;
  mutate(label, (t) => {
    for (const id of ids) {
      const n = findNode(t, id);
      if (!n) continue;
      const target = bp === 'desktop' ? n : ((n.responsive ??= {})[bp] ??= {});
      fn(target as { style?: Style; size?: Size; position?: Position }, n);
    }
  });
}
/** Tekst groter/kleiner maken (zoals Ctrl+Shift+> in Adobe-apps). */
export function nudgeFontSize(delta: number) {
  editTargets('font-size', (t, n) => {
    if (n.type !== 'text' && n.type !== 'button') return;
    const cur = resolveProps(n, get().bp).style?.fontSize ?? t.style?.fontSize;
    let base = cur;
    if (base === undefined) {
      const el = document.querySelector(`.vs-board [data-id="${CSS.escape(n.id)}"]`);
      base = el ? Math.round(parseFloat(getComputedStyle(el).fontSize)) : 16;
    }
    t.style = { ...(t.style ?? {}), fontSize: Math.max(6, Math.min(400, Math.round(base + delta))) };
  });
}
const norm = (deg: number) => {
  let d = Math.round(deg * 100) / 100 % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
};
function current(n: VNode): Style {
  return resolveProps(n, get().bp).style ?? {};
}
export function rotateSelection(by: number) {
  editTargets('rotate', (t, n) => {
    const r = norm((current(n).rotate ?? 0) + by);
    t.style = { ...(t.style ?? {}), rotate: r || undefined };
    if (!t.style.rotate) delete t.style.rotate;
  });
}
export function setRotation(id: string, deg: number) {
  const { bp } = get();
  mutate(`rotate:${id}`, (t) => {
    const n = findNode(t, id);
    if (!n) return;
    const target = bp === 'desktop' ? n : ((n.responsive ??= {})[bp] ??= {});
    const r = norm(deg);
    target.style = { ...(target.style ?? {}), rotate: r };
    if (!r && bp === 'desktop') delete target.style.rotate;
  });
}
export function flipSelection(axis: 'x' | 'y') {
  editTargets(`flip-${axis}`, (t, n) => {
    const k = axis === 'x' ? 'flipX' : 'flipY';
    const on = !current(n)[k];
    t.style = { ...(t.style ?? {}), [k]: on || undefined };
    if (!on && get().bp === 'desktop') delete t.style[k];
  });
}
export function resetTransform() {
  editTargets('reset-transform', (t) => {
    if (!t.style) return;
    const st = { ...t.style };
    delete st.rotate;
    delete st.flipX;
    delete st.flipY;
    delete st.origin;
    delete st.scale;
    t.style = st;
  });
}
export function setSizeMode(mode: 'fill' | 'hug' | 'square') {
  editTargets(`size-${mode}`, (t, n) => {
    const s = { ...(resolveProps(n, get().bp).size ?? {}), ...(t.size ?? {}) };
    if (mode === 'fill') Object.assign(s, { width: 'fill' });
    if (mode === 'hug') Object.assign(s, { width: 'hug', height: 'hug' });
    if (mode === 'square') {
      const el = document.querySelector(`.vs-viewport [data-id="${CSS.escape(n.id)}"]`) as HTMLElement | null;
      const side = Math.round(s.w ?? el?.offsetWidth ?? 200);
      Object.assign(s, { width: 'fixed', w: side, height: 'fixed', h: side });
    }
    t.size = s;
  });
}
/** Lagen helemaal naar voren of naar achteren (in de volgorde van de ouder). */
export function moveToEdge(edge: 'front' | 'back') {
  const { tree, selection } = get();
  if (!tree || !selection) return;
  mutate('order-edge', (t) => {
    const p = findParent(t, selection);
    if (!p) return;
    const kids = p.parent.children!;
    const [n] = kids.splice(p.index, 1);
    // In HTML ligt de laatste laag bovenop.
    if (edge === 'front') kids.push(n);
    else kids.unshift(n);
  });
}
/** Losse lagen (absoluut) uitlijnen binnen hun ouder. */
export function alignAbsolute(where: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') {
  editTargets(`align-${where}`, (t, n) => {
    const pos = { ...(resolveProps(n, get().bp).position ?? {}), ...(t.position ?? {}) };
    if (pos.mode !== 'absolute' && pos.mode !== 'fixed') return;
    if (where === 'left' || where === 'center-x' || where === 'right') Object.assign(pos, { anchorX: where === 'center-x' ? 'center' : where, x: 0 });
    else Object.assign(pos, { anchorY: where === 'center-y' ? 'center' : where, y: 0 });
    t.position = pos;
  });
}
/** Vertaling van een laag zetten voor de taal die je nu bewerkt. */
export function setTranslation(id: string, lang: string, value: string | undefined) {
  mutate(`i18n:${id}:${lang}`, (t) => {
    const n = findNode(t, id);
    if (!n) return;
    const next = { ...(n.i18n ?? {}) };
    if (value === undefined || value === '') delete next[lang];
    else next[lang] = value;
    if (Object.keys(next).length) n.i18n = next;
    else delete n.i18n;
  });
}

// ── Varianten van componenten (Figma-conventie: "Set / Variant") ──
export const variantSet = (name: string) => (name.includes(' / ') ? name.slice(0, name.lastIndexOf(' / ')).trim() : name.trim());
export const variantName = (name: string) => (name.includes(' / ') ? name.slice(name.lastIndexOf(' / ') + 3).trim() : 'Standaard');
/** Kopie van een component als nieuwe variant. Laag-id's blijven gelijk, zodat overschrijvingen in instances blijven werken. */
export async function createVariant(compId: string) {
  const comps = get().components;
  const c = comps.find((x) => x.id === compId);
  if (!c) return;
  const set = variantSet(c.name);
  const label = prompt(`Naam van de nieuwe variant van "${set}"`, 'Variant ' + (comps.filter((x) => variantSet(x.name) === set).length + 1));
  if (!label?.trim()) return;
  if (!c.name.includes(' / ')) {
    const renamed = await api.put<Component>(`/api/components/${c.id}`, { ...c, name: `${set} / Standaard` });
    set_components(get().components.map((x) => (x.id === c.id ? renamed : x)));
  }
  const copy = await api.post<Component>('/api/components', { name: `${set} / ${label.trim()}`, tree: structuredClone(c.tree) });
  set_components([...get().components, copy]);
  openDoc({ kind: 'component', id: copy.id });
  toast(`Variant "${label.trim()}" gemaakt. Pas hem aan; instances kun je wisselen in het rechterpaneel.`);
}
const set_components = (components: Component[]) => set({ components });

// ── Gedeelde stijlen (zoals Figma-stijlen) ──────────────────
/** Deze dingen horen bij één laag, niet bij een herbruikbare stijl. */
const PER_LAYER: (keyof Style)[] = ['rotate', 'flipX', 'flipY', 'scale', 'origin'];
const splitStyle = (st: Style = {}) => {
  const shared: Style = {};
  const own: Style = {};
  for (const [k, v] of Object.entries(st) as [keyof Style, unknown][]) (PER_LAYER.includes(k) ? own : shared)[k] = v as never;
  return { shared, own };
};
async function putStyles(styles: Record<string, SharedStyle>) {
  const site = get().site!;
  await saveSite({ ...site, theme: { ...siteTheme(site), styles } });
}
export async function createSharedStyle(name: string) {
  const n = selected();
  const site = get().site;
  if (!n || !site || !name.trim()) return;
  const { shared, own } = splitStyle(n.style);
  if (!Object.keys(shared).length) return toast('Deze laag heeft nog geen eigen opmaak om op te slaan.', 'error');
  const styles = { ...(siteTheme(site).styles ?? {}) };
  let id = name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stijl';
  while (styles[id]) id += '-2';
  styles[id] = { name: name.trim(), style: shared };
  await putStyles(styles);
  mutate(`style-ref:${n.id}`, (t) => {
    const x = findNode(t, n.id);
    if (!x) return;
    x.styleRef = id;
    if (Object.keys(own).length) x.style = own;
    else delete x.style;
  });
  toast(`Stijl "${name.trim()}" opgeslagen. Kies hem bij andere lagen onder Gedeelde stijl.`);
}
export async function updateSharedStyle() {
  const n = selected();
  const site = get().site;
  if (!n?.styleRef || !site) return;
  const styles = { ...(siteTheme(site).styles ?? {}) };
  const cur = styles[n.styleRef];
  if (!cur) return;
  const { shared, own } = splitStyle(n.style);
  styles[n.styleRef] = { ...cur, style: { ...cur.style, ...shared } };
  await putStyles(styles);
  mutate(`style-ref:${n.id}`, (t) => {
    const x = findNode(t, n.id);
    if (!x) return;
    if (Object.keys(own).length) x.style = own;
    else delete x.style;
  });
  toast(`Stijl "${cur.name}" bijgewerkt: alle lagen met deze stijl veranderen mee.`);
}
export function detachSharedStyle() {
  const n = selected();
  const site = get().site;
  if (!n?.styleRef || !site) return;
  const sh = siteTheme(site).styles?.[n.styleRef]?.style ?? {};
  mutate(`style-ref:${n.id}`, (t) => {
    const x = findNode(t, n.id);
    if (!x) return;
    x.style = { ...structuredClone(sh), ...(x.style ?? {}) };
    delete x.styleRef;
  });
}
export async function renameSharedStyle(id: string, name: string) {
  const site = get().site;
  const styles = { ...(siteTheme(site!).styles ?? {}) };
  if (!styles[id] || !name.trim()) return;
  styles[id] = { ...styles[id], name: name.trim() };
  await putStyles(styles);
}
export async function deleteSharedStyle(id: string) {
  const site = get().site;
  const styles = { ...(siteTheme(site!).styles ?? {}) };
  delete styles[id];
  await putStyles(styles);
  toast('Stijl verwijderd. Lagen die hem gebruikten vallen terug op hun eigen opmaak.');
}

/** Meerdere losse lagen op elkaar uitlijnen of gelijk verdelen (zoals in Figma). */
function boxesOf(ids: string[]) {
  const out: { id: string; l: number; t: number; w: number; h: number; parent: Element | null }[] = [];
  for (const id of ids) {
    const n = findNode(get().tree!, id);
    if (!n) continue;
    const pos = resolveProps(n, get().bp).position;
    if (pos?.mode !== 'absolute') continue;
    const el = document.querySelector(`.vs-board [data-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    if (!el) continue;
    out.push({ id, l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, parent: el.offsetParent });
  }
  return out;
}
function shiftBy(label: string, moves: Record<string, { dx: number; dy: number }>) {
  editTargets(label, (t, n) => {
    const m = moves[n.id];
    if (!m) return;
    const pos = { ...(resolveProps(n, get().bp).position ?? {}), ...(t.position ?? {}) };
    if (pos.anchorX === 'center' || pos.anchorY === 'center') {
      // Gecentreerde ankers eerst omzetten naar links/boven, anders klopt de som niet.
      const el = document.querySelector(`.vs-board [data-id="${CSS.escape(n.id)}"]`) as HTMLElement | null;
      if (el && pos.anchorX === 'center') Object.assign(pos, { anchorX: 'left', x: el.offsetLeft });
      if (el && pos.anchorY === 'center') Object.assign(pos, { anchorY: 'top', y: el.offsetTop });
    }
    pos.x = Math.round((pos.x ?? 0) + (pos.anchorX === 'right' ? -m.dx : m.dx));
    pos.y = Math.round((pos.y ?? 0) + (pos.anchorY === 'bottom' ? -m.dy : m.dy));
    t.position = pos;
  });
}
export function alignSelection(where: 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom') {
  const ids = selectedIds();
  if (ids.length < 2) return alignAbsolute(where);
  const b = boxesOf(ids);
  if (b.length < 2) return toast('Uitlijnen werkt op los geplaatste lagen (Positie: los). Lagen in een rij of kolom lijn je uit via hun ouder.', 'error');
  const L = Math.min(...b.map((x) => x.l)), T = Math.min(...b.map((x) => x.t));
  const R = Math.max(...b.map((x) => x.l + x.w)), B = Math.max(...b.map((x) => x.t + x.h));
  const moves: Record<string, { dx: number; dy: number }> = {};
  for (const x of b) {
    const dx = where === 'left' ? L - x.l : where === 'right' ? R - (x.l + x.w) : where === 'center-x' ? (L + R) / 2 - (x.l + x.w / 2) : 0;
    const dy = where === 'top' ? T - x.t : where === 'bottom' ? B - (x.t + x.h) : where === 'center-y' ? (T + B) / 2 - (x.t + x.h / 2) : 0;
    moves[x.id] = { dx, dy };
  }
  shiftBy(`align-sel-${where}`, moves);
}
export function distributeSelection(axis: 'x' | 'y') {
  const b = boxesOf(selectedIds());
  if (b.length < 3) return toast('Selecteer minstens drie los geplaatste lagen om te verdelen (Shift+klik).', 'error');
  const k = axis === 'x' ? ('l' as const) : ('t' as const);
  const size = axis === 'x' ? ('w' as const) : ('h' as const);
  b.sort((p, q) => p[k] + p[size] / 2 - (q[k] + q[size] / 2));
  const start = b[0][k];
  const end = Math.max(...b.map((x) => x[k] + x[size]));
  const gap = (end - start - b.reduce((a, x) => a + x[size], 0)) / (b.length - 1);
  let cur = start;
  const moves: Record<string, { dx: number; dy: number }> = {};
  for (const x of b) {
    const d = cur - x[k];
    moves[x.id] = axis === 'x' ? { dx: d, dy: 0 } : { dx: 0, dy: d };
    cur += x[size] + gap;
  }
  shiftBy(`distribute-${axis}`, moves);
}
/** Stijl kopiëren en op andere lagen plakken (zoals in Adobe-apps). */
let styleClipboard: Style | null = null;
export function copyStyle() {
  const n = selected();
  if (!n) return;
  styleClipboard = structuredClone(current(n));
  toast('Stijl gekopieerd. Selecteer een andere laag en kies "Stijl plakken".');
}
export function pasteStyle() {
  if (!styleClipboard) return toast('Kopieer eerst een stijl (rechtsklik → Stijl kopiëren)', 'error');
  const st = styleClipboard;
  editTargets('paste-style', (t) => void (t.style = { ...(t.style ?? {}), ...structuredClone(st) }));
}
export const hasStyleClipboard = () => !!styleClipboard;
/** Absolute lagen met de pijltjes verschuiven. */
export function nudgePosition(dx: number, dy: number) {
  editTargets('nudge', (t, n) => {
    const pos = { ...(resolveProps(n, get().bp).position ?? {}), ...(t.position ?? {}) };
    if (pos.mode !== 'absolute' && pos.mode !== 'fixed') return;
    pos.x = (pos.x ?? 0) + (pos.anchorX === 'right' ? -dx : dx);
    pos.y = (pos.y ?? 0) + (pos.anchorY === 'bottom' ? -dy : dy);
    t.position = pos;
  });
}
