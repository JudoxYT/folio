import type {
  Asset,
  CollectionNode,
  Component,
  FrameNode,
  Project,
  SiteSettings,
  VNode,
} from './types.js';

export function uid(prefix = 'n'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}_${s}`;
}

export function walk(node: VNode, fn: (n: VNode, parent: VNode | null, index: number) => void | false, parent: VNode | null = null, index = 0): void {
  if (fn(node, parent, index) === false) return;
  node.children?.forEach((c, i) => walk(c, fn, node, i));
}

export function findNode(root: VNode, id: string): VNode | null {
  let found: VNode | null = null;
  walk(root, (n) => {
    if (found) return false;
    if (n.id === id) {
      found = n;
      return false;
    }
  });
  return found;
}

export function findParent(root: VNode, id: string): { parent: VNode; index: number } | null {
  let res: { parent: VNode; index: number } | null = null;
  walk(root, (n) => {
    if (res) return false;
    const i = n.children?.findIndex((c) => c.id === id) ?? -1;
    if (i >= 0) {
      res = { parent: n, index: i };
      return false;
    }
  });
  return res;
}

/** Pad van de root tot en met de node. */
export function pathTo(root: VNode, id: string): VNode[] {
  const path: VNode[] = [];
  const rec = (n: VNode): boolean => {
    path.push(n);
    if (n.id === id) return true;
    for (const c of n.children ?? []) if (rec(c)) return true;
    path.pop();
    return false;
  };
  return rec(root) ? path : [];
}

export function isContainer(n: VNode): boolean {
  return n.type === 'frame';
}

/** Diepe kopie met nieuwe ids (dupliceren, plakken, component → instance). */
export function cloneWithNewIds<T extends VNode>(node: T): T {
  const copy = structuredClone(node);
  walk(copy, (n) => {
    n.id = uid();
  });
  return copy;
}

/** Diepe kopie waarbij elk id een voorvoegsel krijgt (uitgeklapte instances / kaarten). */
function prefixIds<T extends VNode>(node: T, prefix: string): T {
  const copy = structuredClone(node);
  walk(copy, (n) => {
    n.id = `${prefix}__${n.id}`;
  });
  return copy;
}

/** Id van de originele, bewerkbare node achter een uitgeklapt id. */
export function sourceId(id: string): string {
  const i = id.indexOf('__');
  return i === -1 ? id : id.slice(0, i);
}

// ── Templates: {{project.title}}, {{site.name}}, {{year}} ─────

export interface TemplateVars {
  [key: string]: string | undefined;
}

/** YouTube/Vimeo-link → embed-adres (privacyvriendelijk) en thumbnail. */
export function videoEmbed(url?: string): { embed: string; thumb?: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (yt) return { embed: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`, thumb: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { embed: `https://player.vimeo.com/video/${vm[1]}` };
  return null;
}

/**
 * De echte iframe-URL van een embed, met de afspeelopties erin.
 * Browsers spelen alleen gedempt vanzelf af, dus autoplay = ook gedempt.
 */
export function embedSrc(n: { url: string; autoplay?: boolean; loop?: boolean; controls?: boolean }): string {
  const url = n.url ?? '';
  if (!n.autoplay && !n.loop && n.controls !== false) return url;
  const yt = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const add = (base: string, params: Record<string, string>) => {
    const u = new URL(base);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return u.toString();
  };
  if (yt) {
    const base = url.includes('/embed/') ? url : `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
    return add(base, {
      ...(n.autoplay ? { autoplay: '1', mute: '1', playsinline: '1' } : {}),
      ...(n.loop ? { loop: '1', playlist: yt[1] } : {}),
      ...(n.controls === false ? { controls: '0', modestbranding: '1' } : {}),
    });
  }
  if (vm) {
    const base = url.includes('player.vimeo.com') ? url : `https://player.vimeo.com/video/${vm[1]}`;
    return add(base, {
      ...(n.autoplay ? { autoplay: '1', muted: '1' } : {}),
      ...(n.loop ? { loop: '1' } : {}),
      ...(n.controls === false ? { controls: '0' } : {}),
    });
  }
  return url;
}

/** Het volgende gepubliceerde project (en na het laatste weer het eerste), voor "Volgend project". */
function nextProjectVars(p: Project, all: Project[] | undefined): TemplateVars {
  const list = (all ?? []).filter((x) => x.published !== false).sort((a, b) => a.sort - b.sort);
  if (list.length < 2) return { 'project.next.url': '/work/', 'project.next.title': 'Al het werk', 'project.next.category': '', 'project.prev.url': '/work/', 'project.prev.title': 'Al het werk', 'project.number': '01', 'project.total': String(list.length).padStart(2, '0') };
  const i = Math.max(0, list.findIndex((x) => x.id === p.id));
  const n = list[(i + 1) % list.length];
  const pr = list[(i - 1 + list.length) % list.length];
  return {
    'project.next.url': `/work/${n.slug}/`,
    'project.next.title': n.title,
    'project.next.category': n.category ?? '',
    'project.next.cover': n.cover ?? '',
    'project.next.thumb': n.cover ? '' : videoEmbed(n.video)?.thumb ?? '',
    'project.prev.url': `/work/${pr.slug}/`,
    'project.prev.title': pr.title,
    'project.number': String(i + 1).padStart(2, '0'),
    'project.total': String(list.length).padStart(2, '0'),
  };
}

const slugCat = (c: string) => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Categorie-tekst opsplitsen: "Branding · Animatie, Illustratie" → drie disciplines. */
export const categoryList = (c?: string) => (c ?? '').split(/\s*[·,/|]\s*/).map((x) => x.trim()).filter(Boolean);

export function projectVars(p: Project): TemplateVars {
  const v = videoEmbed(p.video);
  return {
    'project.video': v?.embed ?? '',
    'project.thumb': p.cover ? '' : v?.thumb ?? '',
    'project.title': p.title,
    'project.client': p.client ?? '',
    'project.year': p.year ?? '',
    'project.category': p.category ?? '',
    // Meerdere disciplines ("Branding · Animatie") worden losse filters: "branding animatie".
    'project.categorySlug': categoryList(p.category).map(slugCat).join(' '),
    'project.summary': p.summary ?? '',
    'project.cover': p.cover ?? '',
    'project.url': `/work/${p.slug}/`,
    'project.meta': [p.client, p.year, p.category].filter(Boolean).join(' · '),
  };
}

const sub = (s: string | undefined, vars: TemplateVars) =>
  s === undefined ? s : s.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (k in vars ? vars[k] ?? '' : m));

function substitute(node: VNode, vars: TemplateVars) {
  walk(node, (n) => {
    if ('content' in n) n.content = sub(n.content, vars) ?? '';
    if ('label' in n) n.label = sub(n.label, vars) ?? '';
    if ('asset' in n && n.asset) n.asset = sub(n.asset, vars);
    if ('alt' in n && n.alt) n.alt = sub(n.alt, vars);
    if ('src' in n && n.src) n.src = sub(n.src, vars);
    if ('url' in n && n.url) n.url = sub(n.url, vars) ?? '';
    if (n.href) n.href = sub(n.href, vars);
    if (n.data) n.data = Object.fromEntries(Object.entries(n.data).map(([k, v]) => [k, sub(v, vars) ?? '']));
  });
}

// ── Uitklappen: instances en collecties worden gewone nodes ──

export interface ExpandContext {
  site: SiteSettings;
  components: Record<string, Component>;
  projects: Project[];
  project?: Project | null;
  /** Jaartal voor {{year}}, bij publiceren ingevuld. */
  year?: string;
}

/** Rij in de lijstweergave: grote titel, categorie en opdrachtgever, met een zwevend voorbeeldbeeld bij hover. */
export function indexRowTemplate(): FrameNode {
  return {
    id: 'row',
    type: 'frame',
    name: 'Projectregel',
    href: '{{project.url}}',
    data: { cat: '{{project.categorySlug}}', label: '{{project.category}}', role: 'index-row', cursor: 'Bekijk' },
    layout: { mode: 'horizontal', align: 'center', justify: 'space-between', gap: 24, padding: [26, 4, 26, 4] },
    size: { width: 'fill' },
    effects: { hover: { x: 10, duration: 400 } },
    responsive: { mobile: { layout: { mode: 'vertical', align: 'start', gap: 6, padding: [20, 0, 20, 0] } } },
    children: [
      { id: 'title', type: 'text', name: 'Titel', tag: 'p', textStyle: 'h2', content: '{{project.title}}', size: { width: 'fill' }, effects: { sweep: { color: 'token:roze', duration: 550 } } },
      { id: 'client', type: 'text', name: 'Opdracht', textStyle: 'small', content: '{{project.client}}', size: { width: 'hug' }, responsive: { tablet: { hidden: true } } },
      { id: 'cat', type: 'text', name: 'Categorie', textStyle: 'label', content: '{{project.category}}', size: { width: 'fixed', w: 170 }, style: { textAlign: 'right' }, responsive: { mobile: { size: { width: 'hug' }, style: { textAlign: 'left' } } } },
      {
        id: 'prev',
        type: 'image',
        name: 'Voorbeeld',
        data: { role: 'prev' },
        asset: '{{project.cover}}',
        src: '{{project.thumb}}',
        alt: '',
        position: { mode: 'absolute', anchorX: 'left', anchorY: 'top', x: 0, y: 0 },
        size: { width: 'fixed', w: 320, height: 'fixed', h: 200 },
        style: { radius: 14, objectFit: 'cover', fill: 'token:surface' },
      },
    ],
  } as FrameNode;
}

/** Standaardkaart voor een projecten-grid: beeld dat inzoomt bij hover, titel met pijl, en de categorie. */
export function defaultCardTemplate(): FrameNode {
  return {
    id: 'card',
    type: 'frame',
    name: 'Projectkaart',
    href: '{{project.url}}',
    data: { cat: '{{project.categorySlug}}', label: '{{project.category}}', cursor: 'Bekijk' },
    layout: { mode: 'vertical', gap: 16 },
    size: { width: 'fill' },
    effects: { press: { scale: 0.985 } },
    children: [
      {
        id: 'media',
        type: 'frame',
        name: 'Beeld',
        layout: { mode: 'vertical' },
        size: { width: 'fill' },
        style: { radius: 18, overflow: 'hidden', fill: 'token:surface' },
        children: [
          {
            id: 'cover',
            type: 'image',
            name: 'Cover',
            asset: '{{project.cover}}',
            src: '{{project.thumb}}',
            alt: '{{project.title}}',
            size: { width: 'fill', aspectRatio: '16 / 10' },
            style: { fill: 'token:surface', objectFit: 'cover' },
            // Beeld schuift binnen zijn kader mee met scrollen (parallax) en zoomt in bij hover.
            effects: { scroll: { from: { y: -22, scale: 1.12 }, to: { y: 22, scale: 1.12 } }, groupHover: { scale: 1.07, duration: 800 } },
          },
        ],
      },
      {
        id: 'row',
        type: 'frame',
        name: 'Titelregel',
        layout: { mode: 'horizontal', justify: 'space-between', align: 'center', gap: 16 },
        size: { width: 'fill' },
        children: [
          { id: 'title', type: 'text', name: 'Titel', tag: 'h3', textStyle: 'h3', content: '{{project.title}}', size: { width: 'fill' }, effects: { sweep: { color: 'token:roze', duration: 550 } } },
          { id: 'cat', type: 'text', name: 'Categorie', textStyle: 'label', content: '{{project.category}}', size: { width: 'hug' } },
        ],
      },
      { id: 'meta', type: 'text', name: 'Meta', textStyle: 'small', content: '{{project.client}}' },
    ],
  } as FrameNode;
}

function collectionProjects(n: CollectionNode, all: Project[]): Project[] {
  let list = all.filter((p) => p.published !== false);
  if (n.featuredOnly) list = list.filter((p) => p.featured);
  if (n.category) list = list.filter((p) => categoryList(p.category).some((c) => c.toLowerCase() === n.category!.toLowerCase()));
  list = [...list].sort((a, b) => a.sort - b.sort);
  return n.limit ? list.slice(0, n.limit) : list;
}

/**
 * Geeft een boom terug zonder instances en met gevulde collecties.
 * Uitgeklapte nodes krijgen ids als "instanceId__childId", zodat de Studio
 * een klik terug kan leiden naar de bewerkbare node (zie sourceId).
 */
export function expandTree<T extends VNode>(root: T, ctx: ExpandContext, depth = 0): T {
  const baseVars: TemplateVars = {
    'site.name': ctx.site.name,
    year: ctx.year ?? '',
    ...(ctx.project ? projectVars(ctx.project) : {}),
    ...(ctx.project ? nextProjectVars(ctx.project, ctx.projects) : {}),
  };

  // "when": alleen tonen als de variabele (niet) leeg is.
  const shown = (n: VNode) => {
    if (!n.when) return true;
    const neg = n.when.startsWith('!');
    const v = baseVars[n.when.replace(/^!/, '')];
    return neg ? !v : !!v;
  };

  const rec = (n: VNode): VNode => {
    if (n.type === 'instance') {
      const comp = ctx.components[n.component];
      if (!comp || depth > 8) {
        return { id: n.id, type: 'frame', name: n.name, children: [], hidden: n.hidden } as FrameNode;
      }
      const tree = prefixIds(comp.tree, n.id);
      // Overrides per node-id van de component.
      for (const [cid, ov] of Object.entries(n.overrides ?? {})) {
        walk(tree, (c) => {
          if (c.id !== `${n.id}__${cid}`) return;
          if (ov.content !== undefined && 'content' in c) c.content = ov.content;
          if (ov.label !== undefined && 'label' in c) c.label = ov.label;
          if (ov.asset !== undefined && 'asset' in c) c.asset = ov.asset;
          if (ov.href !== undefined) c.href = ov.href;
          if (ov.hidden !== undefined) c.hidden = ov.hidden;
        });
      }
      // Eigen grootte/positie van de instance gaan voor.
      const merged: FrameNode = {
        ...tree,
        id: n.id,
        name: n.name,
        size: { ...tree.size, ...n.size },
        position: { ...tree.position, ...n.position },
        hidden: n.hidden ?? tree.hidden,
        href: n.href ?? tree.href,
        responsive: {
          tablet: { ...tree.responsive?.tablet, ...n.responsive?.tablet },
          mobile: { ...tree.responsive?.mobile, ...n.responsive?.mobile },
        },
      };
      substitute(merged, baseVars);
      return expandTree(merged, ctx, depth + 1);
    }
    if (n.type === 'collection') {
      const card = n.view === 'index' ? indexRowTemplate() : defaultCardTemplate();
      const projects = collectionProjects(n, ctx.projects);
      const children = projects.map((p, i) => {
        const c = prefixIds(card, `${n.id}__p${i}`);
        substitute(c, { ...baseVars, ...projectVars(p) });
        return c;
      });
      return { ...n, children };
    }
    const copy = { ...n } as VNode;
    if (n.children) copy.children = n.children.filter((c) => shown(c)).map(rec);
    return copy;
  };

  const out = rec(root) as T;
  substitute(out, baseVars);
  return out;
}

/** Alle asset-ids die in een boom gebruikt worden. */
export function usedAssets(root: VNode): string[] {
  const ids = new Set<string>();
  walk(root, (n) => {
    if ('asset' in n && n.asset) ids.add(n.asset);
    if (n.style?.fillImage) ids.add(n.style.fillImage);
  });
  return [...ids];
}

export function assetUrl(a: Asset | undefined, preferWidth?: number): string | undefined {
  if (!a) return undefined;
  // Een GIF zonder video-versie: het origineel, anders valt de animatie weg.
  if (a.mime === 'image/gif') return a.url;
  if (a.kind === 'image' && a.variants.length && preferWidth) {
    const sorted = a.variants.filter((v) => !v.type?.startsWith('video/')).sort((x, y) => x.width - y.width);
    if (!sorted.length) return a.url;
    return (sorted.find((v) => v.width >= preferWidth) ?? sorted[sorted.length - 1]).url;
  }
  if (a.kind === 'video' && a.variants.length) return a.variants[0].url;
  return a.url;
}
