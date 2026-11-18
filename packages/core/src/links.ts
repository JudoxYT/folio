// Kapotte interne links vinden vóór het publiceren.
import type { FrameNode, VNode } from './types.js';

export interface LinkIssue {
  /** Waar de link staat, bv. "Pagina: Home" of "Component: Header". */
  where: string;
  /** Naam van de laag. */
  layer: string;
  href: string;
  reason: string;
}

interface Doc { where: string; tree: FrameNode | null | undefined; kind: 'page' | 'project' | 'component'; path?: string }

const MD_LINK = /\[[^\]]*\]\(([^)\s]+)\)/g;

/** Alle links in een boom: [laagnaam, href]. */
function linksIn(tree: VNode): [string, string][] {
  const out: [string, string][] = [];
  const walk = (n: VNode) => {
    const r = n as unknown as { href?: unknown; content?: unknown; overrides?: Record<string, { href?: string }> };
    if (typeof r.href === 'string' && r.href.trim()) out.push([n.name, r.href.trim()]);
    if (n.type === 'text' && typeof r.content === 'string') for (const m of r.content.matchAll(MD_LINK)) out.push([n.name, m[1]]);
    if (r.overrides) for (const o of Object.values(r.overrides)) if (o?.href) out.push([n.name, o.href]);
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
  return out;
}

function anchorsIn(tree: VNode | null | undefined): Set<string> {
  const s = new Set<string>();
  const walk = (n: VNode) => {
    if (n.anchor) s.add(n.anchor);
    for (const c of n.children ?? []) walk(c);
  };
  if (tree) walk(tree);
  return s;
}

const norm = (p: string) => {
  let x = p.split('?')[0];
  if (!x.startsWith('/')) x = '/' + x;
  if (!/\.[a-z0-9]{2,5}$/i.test(x) && !x.endsWith('/')) x += '/';
  return x;
};

export function checkLinks(input: {
  pages: { title: string; slug: string; tree: FrameNode }[];
  projects: { title: string; slug: string; tree?: FrameNode | null; published?: boolean }[];
  components: { name: string; tree: FrameNode }[];
  languages?: string[];
  hasProjectTemplate?: boolean;
}): LinkIssue[] {
  const paths = new Set<string>();
  const anchorsByPath = new Map<string, Set<string>>();
  const allAnchors = new Set<string>();
  for (const p of input.pages) {
    const path = p.slug ? `/${p.slug.replace(/^\/|\/$/g, '')}/` : '/';
    paths.add(path);
    const a = anchorsIn(p.tree);
    anchorsByPath.set(path, a);
    a.forEach((x) => allAnchors.add(x));
  }
  if (input.projects.length) paths.add('/work/');
  for (const p of input.projects) {
    if (p.published === false) continue;
    paths.add(`/work/${p.slug}/`);
  }
  for (const c of input.components) anchorsIn(c.tree).forEach((x) => allAnchors.add(x));
  const langs = input.languages ?? [];

  const issues: LinkIssue[] = [];
  const docs: Doc[] = [
    ...input.pages.map((p) => ({ where: `Pagina: ${p.title}`, tree: p.tree, kind: 'page' as const, path: p.slug ? `/${p.slug}/` : '/' })),
    ...input.projects.map((p) => ({ where: `Project: ${p.title}`, tree: p.tree, kind: 'project' as const })),
    ...input.components.map((c) => ({ where: `Component: ${c.name}`, tree: c.tree, kind: 'component' as const })),
  ];
  for (const d of docs) {
    if (!d.tree) continue;
    const own = anchorsIn(d.tree);
    for (const [layer, href] of linksIn(d.tree)) {
      if (/^(https?:|mailto:|tel:|sms:|\/\/|javascript:|data:)/i.test(href)) {
        if (/^https?:\/\/[^/.]+$/i.test(href)) issues.push({ where: d.where, layer, href, reason: 'Dit webadres lijkt niet compleet (geen .nl, .com, …).' });
        continue;
      }
      if (href.includes('{{')) continue; // ingevuld bij publiceren (bv. volgend project)
      if (href.startsWith('#')) {
        const id = href.slice(1);
        if (!id) continue;
        const ok = d.kind === 'component' ? allAnchors.has(id) : own.has(id);
        if (!ok) issues.push({ where: d.where, layer, href, reason: 'Er is geen blok met dit anker op deze pagina.' });
        continue;
      }
      if (href.startsWith('/media/') || /\.(pdf|xml|txt|jpg|png|webp|svg|mp4|zip)$/i.test(href.split('?')[0])) continue;
      const [rawPath, hash] = href.split('#');
      let path = norm(rawPath || '/');
      const lang = langs.find((l) => path.startsWith(`/${l}/`));
      if (lang) path = path.slice(lang.length + 1) || '/';
      if (!paths.has(path)) {
        issues.push({ where: d.where, layer, href, reason: 'Deze pagina bestaat niet (meer).' });
        continue;
      }
      if (hash && anchorsByPath.has(path) && !anchorsByPath.get(path)!.has(hash)) {
        issues.push({ where: d.where, layer, href, reason: 'De pagina bestaat, maar het anker niet.' });
      }
    }
  }
  return issues;
}
