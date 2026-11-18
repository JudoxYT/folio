// Meertaligheid: een extra taal krijgt eigen adressen (/en/…). Teksten, knoppen en alt-teksten
// hebben per laag een vertaling (node.i18n); wat niet vertaald is valt terug op de hoofdtaal.
import type { FrameNode, Project, SiteSettings, VNode } from './types.js';

export const LANGUAGES: Record<string, { label: string; short: string; locale: string }> = {
  nl: { label: 'Nederlands', short: 'NL', locale: 'nl_NL' },
  en: { label: 'Engels', short: 'EN', locale: 'en_GB' },
  de: { label: 'Duits', short: 'DE', locale: 'de_DE' },
  fr: { label: 'Frans', short: 'FR', locale: 'fr_FR' },
  es: { label: 'Spaans', short: 'ES', locale: 'es_ES' },
  it: { label: 'Italiaans', short: 'IT', locale: 'it_IT' },
};
export const mainLang = (site: SiteSettings) => site.seo?.lang ?? 'nl';
export const extraLangs = (site: SiteSettings) => (site.languages ?? []).filter((l) => l && l !== mainLang(site));

/** De tekst die een laag in deze taal laat zien (zonder vertaling: de hoofdtaal). */
export function localText(n: VNode, lang: string | null | undefined): string | undefined {
  const base = n.type === 'text' ? n.content : n.type === 'button' ? n.label : n.type === 'image' ? n.alt : undefined;
  if (!lang) return base;
  const t = n.i18n?.[lang];
  return t !== undefined && t !== '' ? t : base;
}

/** Inhoud van alle lagen vervangen door de vertaling. Laat de boom zelf ongemoeid (kopie). */
export function localizeTree<T extends VNode>(tree: T, lang: string): T {
  const rec = (n: VNode): VNode => {
    const t = n.i18n?.[lang];
    let out = n;
    if (t !== undefined && t !== '') {
      if (n.type === 'text') out = { ...n, content: t };
      else if (n.type === 'button') out = { ...n, label: t };
      else if (n.type === 'image') out = { ...n, alt: t };
    }
    if (out.type === 'frame') out = { ...out, children: out.children.map(rec) };
    return out;
  };
  return rec(tree) as T;
}

export function localizeProject(p: Project, lang: string): Project {
  const t = p.i18n?.[lang];
  const tree = p.tree ? localizeTree(p.tree, lang) : p.tree;
  return t ? { ...p, ...Object.fromEntries(Object.entries(t).filter(([, v]) => v)), tree } : { ...p, tree };
}

/** Interne links laten verwijzen naar dezelfde taal: /work/x/ → /en/work/x/. */
export function localizeLinks<T extends VNode>(tree: T, lang: string): T {
  const fix = (href: string) => (href.startsWith('/') && !href.startsWith('/media/') && !href.startsWith(`/${lang}/`) && href !== `/${lang}` ? `/${lang}${href}` : href);
  const rec = (n: VNode): VNode => {
    let out = n;
    if (n.href) out = { ...out, href: fix(n.href) };
    if (out.type === 'text' && /\]\(\//.test(out.content)) out = { ...out, content: out.content.replace(/\]\((\/[^)\s]*)\)/g, (_m, h: string) => `](${fix(h)})`) };
    if (out.type === 'frame') out = { ...out, children: out.children.map(rec) };
    return out;
  };
  return rec(tree) as T;
}

/** Adres van dezelfde pagina in een andere taal. */
export function langPath(site: SiteSettings, path: string, lang: string): string {
  const main = mainLang(site);
  const bare = path.replace(new RegExp(`^/(${extraLangs(site).join('|') || '_'})(?=/)`), '') || '/';
  return lang === main ? bare : `/${lang}${bare}`;
}

/** Hoeveel teksten in een boom al vertaald zijn. */
export function translationProgress(tree: FrameNode, lang: string): { done: number; total: number } {
  let done = 0;
  let total = 0;
  const rec = (n: VNode) => {
    const base = n.type === 'text' ? n.content : n.type === 'button' ? n.label : n.type === 'image' ? n.alt : undefined;
    if (base && base.trim() && !/^\{[^}]+\}$/.test(base.trim())) {
      total++;
      if (n.i18n?.[lang]) done++;
    }
    if (n.type === 'frame') n.children.forEach(rec);
  };
  rec(tree);
  return { done, total };
}
