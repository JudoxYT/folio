// SEO-check per pagina, zoals de "SEO setup checklist" van Wix en de audit van Webflow.
import type { Asset, FrameNode, Seo, SiteSettings, VNode } from './types.js';
import { walk } from './tree.js';
import { pageTitle } from './render.js';
import { type Scheme } from './theme.js';
import { siteTheme } from './defaults.js';

export type SeoLevel = 'ok' | 'warn' | 'error';
export interface SeoCheck {
  id: string;
  level: SeoLevel;
  title: string;
  detail: string;
  /** Node om naartoe te springen bij klikken. */
  nodeId?: string;
}

const plain = (s: string) => s.replace(/\*\*|\*|\[([^\]]+)\]\([^)]+\)/g, '$1').trim();

export function analyzeSeo(input: {
  site: SiteSettings;
  title: string;
  slug: string;
  seo: Seo;
  /** Uitgeklapte boom (met componenten en projecten ingevuld). */
  tree: FrameNode;
  assets: Record<string, Asset>;
}): { score: number; checks: SeoCheck[]; title: string; description: string; words: number } {
  const { site, seo, tree } = input;
  const path = input.slug ? `/${input.slug}/` : '/';
  const title = pageTitle(site, { title: input.title, seo, path });
  const description = seo.description || site.description || '';
  const checks: SeoCheck[] = [];
  const add = (c: SeoCheck) => checks.push(c);

  // Titel
  if (title.length < 25) add({ id: 'title', level: 'warn', title: 'Titel is kort', detail: `${title.length} tekens. 30–60 tekens werkt het best in Google.` });
  else if (title.length > 62) add({ id: 'title', level: 'warn', title: 'Titel is lang', detail: `${title.length} tekens. Google kapt af rond 60 tekens.` });
  else add({ id: 'title', level: 'ok', title: 'Titel heeft een goede lengte', detail: `${title.length} tekens.` });

  // Omschrijving
  if (!seo.description) add({ id: 'desc', level: description ? 'warn' : 'error', title: 'Geen eigen omschrijving', detail: description ? 'De algemene site-omschrijving wordt gebruikt. Een eigen tekst per pagina scoort beter.' : 'Schrijf 70–160 tekens die zeggen wat iemand op deze pagina vindt.' });
  else if (description.length < 70) add({ id: 'desc', level: 'warn', title: 'Omschrijving is kort', detail: `${description.length} tekens. Mik op 70–160.` });
  else if (description.length > 165) add({ id: 'desc', level: 'warn', title: 'Omschrijving is lang', detail: `${description.length} tekens. Google toont er ongeveer 155.` });
  else add({ id: 'desc', level: 'ok', title: 'Omschrijving heeft een goede lengte', detail: `${description.length} tekens.` });

  // Koppen en tekst
  const headings: { level: number; text: string; id: string }[] = [];
  const missingAlt: string[] = [];
  let words = 0;
  let images = 0;
  let internalLinks = 0;
  let firstAltlessName = '';
  walk(tree, (n: VNode) => {
    if (n.hidden) return false;
    if (n.type === 'text') {
      const t = plain(n.content);
      words += t.split(/\s+/).filter(Boolean).length;
      if (n.tag && /^h[1-4]$/.test(n.tag)) headings.push({ level: Number(n.tag[1]), text: t, id: n.id });
      if (/\]\(\//.test(n.content)) internalLinks++;
    }
    if (n.href?.startsWith('/')) internalLinks++;
    if (n.type === 'image') {
      images++;
      const a = n.asset ? input.assets[n.asset] : undefined;
      if ((n.asset || n.src) && !(n.alt || a?.alt)) {
        missingAlt.push(n.id);
        if (!firstAltlessName) firstAltlessName = n.name;
      }
    }
  });
  const h1 = headings.filter((h) => h.level === 1);
  if (!h1.length) add({ id: 'h1', level: 'error', title: 'Geen hoofdkop (h1)', detail: 'Elke pagina hoort precies één h1 te hebben die zegt waar de pagina over gaat.' });
  else if (h1.length > 1) add({ id: 'h1', level: 'warn', title: `${h1.length} hoofdkoppen (h1)`, detail: 'Gebruik er één; maak de rest h2 of h3.', nodeId: h1[1].id });
  else add({ id: 'h1', level: 'ok', title: 'Precies één hoofdkop', detail: `"${h1[0].text.slice(0, 60)}"` });

  let skip: (typeof headings)[number] | undefined;
  for (let i = 1; i < headings.length; i++) if (headings[i].level > headings[i - 1].level + 1) skip = headings[i];
  if (skip) add({ id: 'order', level: 'warn', title: 'Kopniveau overgeslagen', detail: `"${skip.text.slice(0, 40)}" springt een niveau over. Houd de volgorde h1 → h2 → h3 aan.`, nodeId: skip.id });

  if (words < 80) add({ id: 'words', level: input.slug === '' ? 'warn' : 'warn', title: 'Weinig tekst', detail: `${words} woorden. Zoekmachines begrijpen een pagina beter met minstens zo'n 150–300 woorden.` });
  else add({ id: 'words', level: 'ok', title: 'Genoeg tekst', detail: `${words} woorden.` });

  if (missingAlt.length) add({ id: 'alt', level: 'warn', title: `${missingAlt.length} afbeelding(en) zonder alt-tekst`, detail: `Beschrijf wat erop staat, bijvoorbeeld bij "${firstAltlessName}". Goed voor Google Afbeeldingen en schermlezers.`, nodeId: missingAlt[0] });
  else if (images) add({ id: 'alt', level: 'ok', title: 'Alle afbeeldingen hebben alt-tekst', detail: `${images} afbeelding(en).` });

  if (!internalLinks) add({ id: 'links', level: 'warn', title: 'Geen interne links', detail: 'Link naar andere pagina’s (bijvoorbeeld je werk of contact), zodat bezoekers en Google verder kunnen.' });

  // Slug
  if (input.slug && (input.slug.length > 60 || /[^a-z0-9/-]/.test(input.slug))) add({ id: 'slug', level: 'warn', title: 'Adres kan korter of netter', detail: 'Gebruik korte woorden met streepjes, zoals /werk/ of /over/.' });

  // Focuswoord
  if (seo.focusKeyword) {
    const k = seo.focusKeyword.toLowerCase();
    const inTitle = title.toLowerCase().includes(k);
    const inDesc = description.toLowerCase().includes(k);
    const inH1 = h1.some((h) => h.text.toLowerCase().includes(k));
    const hits = [inTitle && 'titel', inDesc && 'omschrijving', inH1 && 'h1'].filter(Boolean);
    add({ id: 'kw', level: hits.length >= 2 ? 'ok' : 'warn', title: `Zoekterm "${seo.focusKeyword}"`, detail: hits.length ? `Staat in: ${hits.join(', ')}.` : 'Komt nog niet voor in titel, omschrijving of h1.' });
  }

  // Delen en site-instellingen
  if (!(seo.image || site.socialImage)) add({ id: 'og', level: 'warn', title: 'Geen deelafbeelding', detail: 'Zonder afbeelding ziet een gedeelde link op WhatsApp, LinkedIn of Discord er kaal uit (1200×630 werkt overal).' });
  else add({ id: 'og', level: 'ok', title: 'Deelafbeelding ingesteld', detail: 'Links zien er goed uit als ze gedeeld worden.' });
  if (!site.domain) add({ id: 'domain', level: 'warn', title: 'Geen domein ingesteld', detail: 'Zonder domein kan er geen sitemap en canonical-adres gemaakt worden (Site-instellingen).' });
  if (seo.noindex || site.seo?.noindex) add({ id: 'noindex', level: 'error', title: 'Verborgen voor zoekmachines', detail: site.seo?.noindex ? 'De hele site staat op "verbergen" (Site-instellingen → SEO).' : 'Deze pagina staat op "verbergen voor zoekmachines".' });

  const weights: Record<SeoLevel, number> = { ok: 1, warn: 0.5, error: 0 };
  const score = checks.length ? Math.round((checks.reduce((s, c) => s + weights[c.level], 0) / checks.length) * 100) : 100;
  const order: Record<SeoLevel, number> = { error: 0, warn: 1, ok: 2 };
  checks.sort((a, b) => order[a.level] - order[b.level]);
  return { score, checks, title, description, words };
}

// ── Toegankelijkheid ─────────────────────────────────────────
// Een praktische check zoals de audit van Webflow/Framer: contrast, linkteksten, knoppen zonder naam, kleine tekst.

const hexRgb = (h: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i.exec(h.trim());
  if (!m) return null;
  const x = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) as [number, number, number];
};
const lum = ([r, g, b]: [number, number, number]) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
export const contrastRatio = (a: string, b: string): number | null => {
  const x = hexRgb(a);
  const y = hexRgb(b);
  if (!x || !y) return null;
  const [l1, l2] = [lum(x), lum(y)].sort((p, q) => q - p);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 10) / 10;
};

const VAGUE = /^(klik hier|hier|lees meer|meer|meer info|link|bekijk|klik|click here|read more|here|more)\.?$/i;

export function analyzeA11y(input: { site: SiteSettings; tree: FrameNode; assets: Record<string, Asset> }): { score: number; checks: SeoCheck[] } {
  const theme = siteTheme(input.site);
  const checks: SeoCheck[] = [];
  const add = (c: SeoCheck) => checks.push(c);
  const lowContrast: { id: string; name: string; ratio: number }[] = [];
  const vague: { id: string; text: string }[] = [];
  const noName: { id: string; name: string }[] = [];
  const tiny: { id: string; name: string; size: number }[] = [];
  let textCount = 0;

  const resolve = (c: string | undefined, sch: Scheme): string | undefined => {
    if (!c) return undefined;
    if (!c.startsWith('token:')) return c;
    const k = c.slice(6);
    return (sch as Record<string, string>)[k] ?? theme.palette[k];
  };
  const rec = (n: VNode, sch: Scheme, bg: string) => {
    if (n.hidden) return;
    let s = sch;
    if (n.scheme && theme.schemes[n.scheme]) s = theme.schemes[n.scheme];
    let back = n.scheme && theme.schemes[n.scheme] ? s.bg : bg;
    const fill = resolve(n.style?.fill, s);
    if (fill && hexRgb(fill) && !(n.style?.opacity !== undefined && n.style.opacity < 1)) back = fill;
    if (n.type === 'text') {
      textCount++;
      const ts = n.textStyle ? theme.text[n.textStyle] : theme.text.body;
      const size = n.style?.fontSize ?? ts?.size ?? 16;
      const heading = n.tag && /^h[1-6]$/.test(n.tag);
      const col = resolve(n.style?.color, s) ?? (heading ? s.heading : s.text);
      const ratio = !n.style?.textGradient && !n.style?.textOutline && col ? contrastRatio(col, back) : null;
      const large = size >= 24 || (size >= 18.6 && (n.style?.fontWeight ?? ts?.weight ?? 400) >= 700);
      if (ratio !== null && ratio < (large ? 3 : 4.5)) lowContrast.push({ id: n.id, name: n.name, ratio });
      if (size < 12 && plain(n.content).length > 3) tiny.push({ id: n.id, name: n.name, size });
      for (const m of n.content.matchAll(/\[([^\]]+)\]\([^)]+\)/g)) if (VAGUE.test(m[1].trim())) vague.push({ id: n.id, text: m[1] });
    }
    if (n.type === 'button') {
      const label = (n as { label?: string }).label?.trim();
      if (!label && !n.ariaLabel) noName.push({ id: n.id, name: n.name });
      else if (label && VAGUE.test(label) && !n.ariaLabel) vague.push({ id: n.id, text: label });
    }
    if ((n.type === 'svg' || n.type === 'image') && n.href && !n.ariaLabel && !(n.type === 'image' && n.alt)) noName.push({ id: n.id, name: n.name });
    if (n.type === 'frame') for (const c of n.children) rec(c, s, back);
  };
  const base = theme.schemes[theme.defaultScheme] ?? Object.values(theme.schemes)[0];
  rec(input.tree, base, base.bg);

  if (lowContrast.length) {
    const w = lowContrast.sort((a, b) => a.ratio - b.ratio)[0];
    add({ id: 'contrast', level: lowContrast.some((x) => x.ratio < 2.5) ? 'error' : 'warn', title: `${lowContrast.length} tekst(en) met te weinig contrast`, detail: `Slechtst: "${w.name}" (${w.ratio}:1). Mik op 4,5:1 voor gewone tekst en 3:1 voor grote koppen. Klik om erheen te gaan.`, nodeId: w.id });
  } else if (textCount) add({ id: 'contrast', level: 'ok', title: 'Contrast is goed leesbaar', detail: 'Alle teksten halen de WCAG-norm (voor zover te meten).' });
  if (vague.length) add({ id: 'vague', level: 'warn', title: 'Vage linktekst', detail: `"${vague[0].text}" zegt niet waar de link heen gaat. Liever: "Bekijk het project Judox" of geef de knop een naam voor schermlezers.`, nodeId: vague[0].id });
  else add({ id: 'vague', level: 'ok', title: 'Linkteksten zijn duidelijk', detail: 'Geen "klik hier" of "lees meer" zonder context.' });
  if (noName.length) add({ id: 'noname', level: 'error', title: `${noName.length} klikbare laag/lagen zonder naam`, detail: `Bijv. "${noName[0].name}". Schermlezers zeggen dan alleen "link". Vul bij Schermlezer een naam in.`, nodeId: noName[0].id });
  else add({ id: 'noname', level: 'ok', title: 'Alle knoppen en links hebben een naam', detail: 'Ook iconen die linken.' });
  if (tiny.length) add({ id: 'tiny', level: 'warn', title: 'Heel kleine tekst', detail: `"${tiny[0].name}" is ${tiny[0].size}px. Onder de 12px wordt het lastig lezen, zeker op mobiel.`, nodeId: tiny[0].id });
  if (!input.site.seo?.lang) add({ id: 'lang', level: 'warn', title: 'Taal van de site niet ingesteld', detail: 'Schermlezers spreken dan mogelijk met het verkeerde accent. Stel de taal in bij Site-instellingen → SEO.' });

  const weights: Record<SeoLevel, number> = { ok: 1, warn: 0.5, error: 0 };
  const score = checks.length ? Math.round((checks.reduce((s, c) => s + weights[c.level], 0) / checks.length) * 100) : 100;
  const order: Record<SeoLevel, number> = { error: 0, warn: 1, ok: 2 };
  checks.sort((a, b) => order[a.level] - order[b.level]);
  return { score, checks };
}
