import type { Asset, Breakpoint, CollectionNode, FrameNode, FormNode, Seo, SiteSettings, Style, VNode } from './types.js';
import { BREAKPOINT_MAX, BREAKPOINT_ORDER } from './types.js';
import { childParentMode, color, cssToString, nodeCss, resolveProps, type Css } from './style.js';
import { themeCss, preloadFonts, altSchemeKey, colorModeCss, themeIsDark } from './theme.js';
import { siteTheme } from './defaults.js';
import { SVG_LIBRARY, svgColorVars, uniqueSvgIds } from './svg.js';
import { assetUrl, embedSrc, walk } from './tree.js';
import type { LayoutMode } from './types.js';
import { effectsCss, fxData, needsRuntime, richText } from './effects.js';
import { LANGUAGES } from './i18n.js';
import { RUNTIME_CSS, RUNTIME_HEAD, RUNTIME_JS } from './runtime.js';

/** Basis-CSS die zowel de gepubliceerde site als het Studio-canvas gebruikt. Volgorde: base < theme < losse lagen. */
export const BASE_CSS = `@layer base, theme;
@layer base{
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0}
html,body{overflow-x:clip}
html{scroll-behavior:smooth;scroll-padding-top:88px}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{background:var(--bg,#fff);color:var(--text,#111);font-family:var(--font-body,system-ui,-apple-system,"Segoe UI",sans-serif);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
h1,h2,h3,h4,p{margin:0;font-size:inherit;font-weight:inherit}
a{color:inherit;text-decoration:none}
img,video{max-width:100%}
.v-text{white-space:pre-wrap;overflow-wrap:break-word}
.v-lang{position:fixed;right:18px;bottom:18px;z-index:900;display:flex;gap:2px;padding:4px;border-radius:999px;background:color-mix(in srgb,var(--bg,#111) 78%,transparent);border:1px solid color-mix(in srgb,var(--text,#fff) 14%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font:600 12px/1 system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.v-lang a{color:var(--text,#fff);opacity:.6;text-decoration:none;padding:7px 10px;border-radius:999px;transition:opacity .2s,background .2s}
.v-lang a:hover{opacity:1}.v-lang a[aria-current]{opacity:1;background:var(--accent,#ff5c8a);color:var(--accent-text,#fff)}
.v-crop{overflow:hidden;display:block}.v-crop>img{width:100%;height:100%;object-fit:cover;object-position:var(--v-focus,50% 50%);scale:var(--v-crop,1);transform-origin:var(--v-focus,50% 50%);display:block}
.v-text mark{background:color-mix(in srgb,var(--accent,#ff5c8a) 32%,transparent);color:inherit;padding:0 .12em;border-radius:.18em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.v-text u{text-decoration-thickness:.07em;text-underline-offset:.14em}
.v-text s{text-decoration-thickness:.07em}
.v-text code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;background:color-mix(in srgb,currentColor 10%,transparent);padding:.05em .3em;border-radius:.25em}
.v-media{display:block;width:100%;height:100%;object-fit:inherit;border-radius:inherit}
.v-video{position:relative}
.v-embed iframe{display:block;width:100%;height:100%;border:0;border-radius:inherit}
.v-sound{position:absolute;right:20px;bottom:20px;z-index:2;border:1px solid rgba(255,255,255,.35);background:rgba(0,0,0,.45);color:#fff;font:500 13px/1 var(--font-body,system-ui);padding:10px 14px;border-radius:999px;cursor:pointer;backdrop-filter:blur(8px)}
.v-placeholder{display:flex;align-items:center;justify-content:center;background:var(--surface,#eee);color:var(--muted,#888);font:13px system-ui;min-height:120px}
.v-svg svg{display:block;width:100%;height:100%;overflow:visible}
.v-btn-icon{display:inline-block;width:1.1em;height:1.1em}
.v-btn-icon svg{display:block;width:100%;height:100%}
img{height:auto}
}`;

/** Klassen uit het thema: tekststijl, knopstijl, kleurschema. */
export function themeClasses(n: VNode): string {
  const c: string[] = [];
  if (n.scheme) c.push(`sc-${n.scheme}`);
  if (n.type === 'text') {
    const ts = n.textStyle ?? (n.tag && /^h[1-4]$/.test(n.tag) ? n.tag : undefined);
    if (ts) c.push(`ts-${ts}`);
  }
  if (n.type === 'button') c.push(`btn-${n.variant ?? 'primary'}`);
  return c.length ? ' ' + c.join(' ') : '';
}

export function buttonIcon(id?: string): string {
  if (!id) return '';
  const it = SVG_LIBRARY.find((x) => x.id === id);
  return it ? `<span class="v-btn-icon" aria-hidden="true">${it.svg.replace(/var\(--svg-1, currentColor\)/g, 'currentColor')}</span>` : '';
}

const SOUND_SCRIPT = `document.querySelectorAll('.v-sound').forEach(function(b){b.addEventListener('click',function(){var v=b.parentElement.querySelector('video');v.muted=!v.muted;if(!v.muted){v.play()}b.textContent=v.muted?'Geluid aan':'Geluid uit'})})`;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export interface RenderContext {
  site: SiteSettings;
  assets: Record<string, Asset>;
  /** Grote beelden automatisch in de lightbox (gezet door renderDocument). */
  autoLightbox?: boolean;
}

/** /media/... → eigen media-domein als dat ingesteld is. */
export function mediaUrl(site: SiteSettings, url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const base = site.mediaBaseUrl?.replace(/\/$/, '');
  return base && url.startsWith('/media/') ? base + url : url;
}

/** Gedeelde stijl onder de eigen stijl van de laag schuiven. */
export function withSharedStyle<P extends { style?: Style }>(n: VNode, p: P, styles?: Record<string, { style: Style }>): P {
  const sh = n.styleRef ? styles?.[n.styleRef] : undefined;
  return sh ? { ...p, style: { ...sh.style, ...(p.style ?? {}) } } : p;
}

/** CSS per node per breakpoint. Breakpoints alleen als ze afwijken. */
function collectCss(root: VNode, ctx: RenderContext): string {
  const rules: Record<Breakpoint, string[]> = { desktop: [], tablet: [], mobile: [] };
  const fx: string[] = [];
  const resolveAsset = (id: string) => mediaUrl(ctx.site, assetUrl(ctx.assets[id], 1600));
  const shared = siteTheme(ctx.site).styles;

  const rec = (n: VNode, parentModes: Record<Breakpoint, LayoutMode>) => {
    const modes = {} as Record<Breakpoint, LayoutMode>;
    let prev: Css | null = null;
    for (const bp of BREAKPOINT_ORDER) {
      const p = withSharedStyle(n, resolveProps(n, bp), shared);
      const css = nodeCss(n, p, { parentMode: parentModes[bp], resolveAsset });
      if (n.effects?.marquee && !p.hidden) css.overflow = 'hidden';
      modes[bp] = childParentMode(n, p);
      if (prev === null) {
        rules[bp].push(`.${n.id}{${cssToString(css)}}`);
      } else {
        // Eigenschappen die wegvallen terugzetten naar de basislaag.
        const diff: Css = {};
        for (const [k, v] of Object.entries(css)) if (prev[k] !== v) diff[k] = v;
        for (const k of Object.keys(prev)) if (!(k in css)) diff[k] = 'revert-layer';
        if (Object.keys(diff).length) rules[bp].push(`.${n.id}{${cssToString(diff)}}`);
      }
      prev = css;
    }
    const e = effectsCss(n);
    if (e) fx.push(e);
    n.children?.forEach((c) => rec(c, modes));
  };
  rec(root, { desktop: 'vertical', tablet: 'vertical', mobile: 'vertical' });

  return [
    rules.desktop.join('\n'),
    fx.join('\n'),
    rules.tablet.length ? `@media (max-width:${BREAKPOINT_MAX.tablet}px){${rules.tablet.join('\n')}}` : '',
    rules.mobile.length ? `@media (max-width:${BREAKPOINT_MAX.mobile}px){${rules.mobile.join('\n')}}` : '',
  ].join('\n');
}

function srcset(a: Asset, site: SiteSettings): string {
  return a.variants
    .filter((v) => v.type.startsWith('image/'))
    .map((v) => `${esc(mediaUrl(site, v.url)!)} ${v.width}w`)
    .join(', ');
}

function linkAttrs(n: VNode): string {
  if (!n.href) return '';
  const ext = /^https?:/.test(n.href) || n.newTab;
  return ` href="${esc(n.href)}"${ext ? ' target="_blank" rel="noopener"' : ''}`;
}

/** id (anker), aria-label en effect-data. */
function extraAttrs(n: VNode): string {
  let s = '';
  if (n.anchor) s += ` id="${esc(n.anchor)}"`;
  if (n.ariaLabel) s += ` aria-label="${esc(n.ariaLabel)}"`;
  const d = fxData(n);
  if (d) s += ` data-fx="${esc(d)}"`;
  if (n.effects?.reveal) s += ' data-reveal';
  for (const [k, v] of Object.entries(n.data ?? {})) if (/^[a-z][a-z0-9-]*$/.test(k)) s += ` data-${k}="${esc(v)}"`;
  if (n.type === 'collection') s += ` data-view="${n.view ?? 'grid'}"`;
  if ((n as FrameNode).layout?.masonry) s += ' data-masonry';
  return s;
}

/** Tekst zonder opmaaktekens (voor data-text bij de kleurveeg). */
function plainText(src: string): string {
  return src.replace(/\[\[([^\]|]+)[^\]]*\]\]/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1');
}

/** Filterknoppen (per categorie) en de knoppen raster/lijst boven een projectencollectie. */
function filterBar(n: CollectionNode): string {
  const cats = new Map<string, { label: string; n: number }>();
  for (const c of n.children ?? []) {
    const keys = (c.data?.cat ?? '').split(' ').filter(Boolean);
    const labels = (c.data?.label ?? '').split(/\s*[·,/|]\s*/);
    keys.forEach((k, i) => {
      const cur = cats.get(k) ?? { label: labels[i] || k, n: 0 };
      cur.n++;
      cats.set(k, cur);
    });
  }
  const total = (n.children ?? []).length;
  const chips = n.filters
    ? [`<button class="v-chip" type="button" data-filter="*" aria-pressed="true">Alles<sup>${total}</sup></button>`,
      ...[...cats].map(([k, v]) => `<button class="v-chip" type="button" data-filter="${esc(k)}" aria-pressed="false">${esc(v.label)}<sup>${v.n}</sup></button>`)].join('')
    : '';
  const views = n.viewToggle
    ? `<span class="v-views"><button class="v-chip" type="button" data-view-btn="index" aria-pressed="${n.view === 'index'}">Lijst</button><button class="v-chip" type="button" data-view-btn="grid" aria-pressed="${n.view !== 'index'}">Raster</button></span>`
    : '';
  return `<div class="v-filter" role="toolbar" aria-label="Projecten filteren">${chips}${views}</div>`;
}

/** Marquee: inhoud twee keer naast elkaar, die samen eindeloos doorschuiven. */
function marqueeInner(n: VNode, inner: string, gap: number): string {
  const g = `display:flex;gap:${gap}px;padding-right:${gap}px`;
  return `<div class="v-mq"><div class="v-mq-g" style="${g}">${inner}</div><div class="v-mq-g" style="${g}" aria-hidden="true">${inner}</div></div>`;
}

function renderForm(n: FormNode, ctx: RenderContext, cls: string, attrs: string): string {
  const endpoint = `${(ctx.site.formEndpoint ?? '').replace(/\/$/, '')}/api/forms/submit`;
  const fields = n.fields
    .map((f) => {
      const name = `f_${f.id}`;
      const req = f.required ? ' required' : '';
      const ph = f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : '';
      let input: string;
      if (f.kind === 'textarea') input = `<textarea name="${name}"${req}${ph} maxlength="5000"></textarea>`;
      else if (f.kind === 'select')
        input = `<select name="${name}"${req}><option value="">${esc(f.placeholder || 'Kies…')}</option>${(f.options ?? []).map((o) => `<option>${esc(o)}</option>`).join('')}</select>`;
      else input = `<input type="${f.kind}" name="${name}"${req}${ph} maxlength="500"${f.kind === 'email' ? ' autocomplete="email"' : ''}>`;
      return `<label class="v-field"><span>${esc(f.label)}${f.required ? ' *' : ''}</span>${input}</label>`;
    })
    .join('');
  return `<form class="${cls} v-form"${attrs} data-form="${esc(n.id)}" data-success="${esc(n.successMessage ?? 'Bedankt! Je bericht is verstuurd.')}" action="${esc(endpoint)}" method="post">` +
    `<input type="hidden" name="_form" value="${esc(n.id)}"><input class="v-hp" name="_hp" tabindex="-1" autocomplete="off" aria-hidden="true">` +
    `${fields}<button class="v-submit" type="submit">${esc(n.submitLabel ?? 'Versturen')}</button><p class="v-form-msg" role="status"></p></form>`;
}

/** HTML voor één (uitgeklapte) node. */
export function renderNodeHtml(n: VNode, ctx: RenderContext): string {
  const cls = n.id + themeClasses(n);
  const attrs = extraAttrs(n);
  const kids = () => (n.children ?? []).map((c) => renderNodeHtml(c, ctx)).join('');
  const gap = n.layout?.gap ?? 0;
  switch (n.type) {
    case 'frame':
    case 'collection': {
      const tag = n.href ? 'a' : n.type === 'frame' ? n.tag ?? 'div' : 'div';
      const inner = n.effects?.marquee ? marqueeInner(n, kids(), gap) : kids();
      const html = `<${tag} class="${cls}"${linkAttrs(n)}${attrs}>${inner}</${tag}>`;
      return n.type === 'collection' && (n.filters || n.viewToggle) ? filterBar(n) + html : html;
    }
    case 'text': {
      const tag = n.tag ?? 'p';
      let inner = n.href ? esc(n.content) : richText(n.content);
      if (n.effects?.marquee) inner = marqueeInner(n, `<span>${inner}</span>`, 48);
      return n.href
        ? `<a class="${cls} v-text"${linkAttrs(n)}${attrs}>${inner}</a>`
        : `<${tag} class="${cls} v-text"${attrs}>${inner}</${tag}>`;
    }
    case 'button':
      return `<a class="${cls} v-btn"${linkAttrs(n) || ' href="#"'}${attrs}>${esc(n.label)}${buttonIcon(n.icon)}</a>`;
    case 'image': {
      const a = n.asset ? ctx.assets[n.asset] : undefined;
      // Een GIF is als video vele malen kleiner: dezelfde beweging, zonder geluid.
      const gifVideo = a?.variants.find((v) => v.type === 'video/mp4');
      if (a && gifVideo) {
        return `<video class="${cls}" src="${esc(mediaUrl(ctx.site, gifVideo.url)!)}" autoplay muted loop playsinline aria-label="${esc(n.alt ?? a.alt ?? '')}"${attrs}></video>`;
      }
      const src = mediaUrl(ctx.site, a ? assetUrl(a, 1600) : n.src);
      if (!src) return `<div class="${cls} v-placeholder" aria-hidden="true"${attrs}></div>`;
      const ss = a && a.variants.length ? ` srcset="${srcset(a, ctx.site)}" sizes="(max-width:640px) 100vw, 50vw"` : '';
      const dims = a?.width && a?.height ? ` width="${a.width}" height="${a.height}"` : '';
      const lb = !!n.effects?.lightbox || (!!ctx.autoLightbox && !n.href && !!a);
      const full = lb && a ? ` data-full="${esc(mediaUrl(ctx.site, assetUrl(a, 2400))!)}"` : '';
      const auto = lb && !n.effects?.lightbox ? ' data-lb' : '';
      const cap = n.caption ? ` data-caption="${esc(n.caption)}"` : '';
      const alt = esc(n.alt ?? a?.alt ?? '');
      if (n.crop && n.crop > 100) {
        const inner = `<img src="${esc(src)}"${ss}${dims}${full}${auto}${cap} alt="${alt}" loading="lazy" decoding="async">`;
        const wrap = `<span class="${cls} v-crop"${attrs}>${inner}</span>`;
        return n.href ? `<a${linkAttrs(n)} style="display:contents">${wrap}</a>` : wrap;
      }
      const img = `<img class="${cls}" src="${esc(src)}"${ss}${dims}${full}${auto}${cap} alt="${alt}" loading="lazy" decoding="async"${attrs}>`;
      return n.href ? `<a${linkAttrs(n)} style="display:contents">${img}</a>` : img;
    }
    case 'video': {
      const a = n.asset ? ctx.assets[n.asset] : undefined;
      const src = mediaUrl(ctx.site, a ? assetUrl(a) : n.src);
      if (!src) return `<div class="${cls} v-placeholder" aria-hidden="true"${attrs}></div>`;
      const auto = n.autoplay !== false;
      const poster = mediaUrl(ctx.site, a?.poster);
      const vattrs = [
        auto ? 'autoplay' : '',
        n.muted !== false || auto ? 'muted' : '',
        n.loop !== false ? 'loop' : '',
        n.controls ? 'controls' : '',
        'playsinline',
        poster ? `poster="${esc(poster)}"` : '',
        'preload="metadata"',
      ].filter(Boolean).join(' ');
      const sound = n.soundToggle ? `<button class="v-sound" type="button">Geluid aan</button>` : '';
      // Meerdere bronnen: de browser kiest de eerste die hij kan afspelen (bv. WebM met transparantie, dan MP4).
      const vids = a?.variants.filter((v) => v.type.startsWith('video/')) ?? [];
      const inner = vids.length > 1
        ? vids.map((v) => `<source src="${esc(mediaUrl(ctx.site, v.url)!)}" type="${v.type}">`).join('')
        : '';
      return `<div class="${cls} v-video"${attrs}><video class="v-media"${inner ? '' : ` src="${esc(src)}"`} ${vattrs}>${inner}</video>${sound}</div>`;
    }
    case 'embed':
      return `<div class="${cls} v-embed"${attrs}><iframe src="${esc(embedSrc(n))}" loading="lazy" title="${esc(n.ariaLabel ?? n.name)}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>`;
    case 'form':
      return renderForm(n, ctx, cls, attrs);
    case 'svg': {
      const vars = svgColorVars(n.colors, color);
      const label = n.ariaLabel ? '' : ' aria-hidden="true"';
      const svg = uniqueSvgIds(n.svg, n.id);
      const inner = n.href ? `<a${linkAttrs(n)} style="display:contents">${svg}</a>` : svg;
      return `<div class="${cls} v-svg"${vars ? ` style="${esc(vars)}"` : ''}${label}${attrs}>${inner}</div>`;
    }
    case 'instance':
      // Hoort uitgeklapt te zijn vóór het renderen.
      return `<div class="${cls}"></div>`;
  }
}

export interface PageDocument {
  title: string;
  seo: Seo;
  /** Uitgeklapte boom (zie expandTree). */
  tree: FrameNode;
  path: string;
  /** Structured data (JSON-LD) voor Google. */
  jsonLd?: object[];
  /** og:type, standaard website. */
  ogType?: 'website' | 'article' | 'video.other';
  /** Taal van deze versie (standaard de hoofdtaal). */
  lang?: string;
  /** Dezelfde pagina in andere talen (hreflang en het taalknopje). */
  alternates?: { lang: string; path: string }[];
}

export function pageTitle(site: SiteSettings, doc: { title: string; seo: Seo; path: string }): string {
  if (doc.seo.title) return doc.seo.title;
  if (doc.path === '/') return site.name;
  return (site.seo?.titleTemplate || `%s — ${site.name}`).replace('%s', doc.title);
}

export function renderDocument(doc: PageDocument, ctx: RenderContext): string {
  const { site } = ctx;
  const theme = siteTheme(site);
  const seo = site.seo ?? {};
  const title = pageTitle(site, doc);
  const description = doc.seo.description || site.description || '';
  const imgId = doc.seo.image || site.socialImage;
  const ogImage = imgId ? mediaUrl(site, assetUrl(ctx.assets[imgId], 1200)) : undefined;
  const abs = (u: string) => (site.domain && u.startsWith('/') ? `https://${site.domain}${u}` : u);
  const favicon = site.favicon ? mediaUrl(site, assetUrl(ctx.assets[site.favicon])) : undefined;
  const canonical = doc.seo.canonical || (site.domain ? `https://${site.domain}${doc.path}` : '');
  const noindex = doc.seo.noindex || seo.noindex;
  const lang = doc.lang ?? seo.lang ?? 'nl';
  const alts = doc.alternates ?? [];
  const switcher = alts.length > 1 && site.languageSwitcher !== false
    ? `<nav class="v-lang" aria-label="Taal">${alts.map((a) => `<a href="${esc(a.path)}" hreflang="${esc(a.lang)}" lang="${esc(a.lang)}"${a.lang === lang ? ' aria-current="true"' : ''}>${esc(a.lang.toUpperCase())}</a>`).join('')}</nav>`
    : '';
  let hasSound = false;
  let runtime = false;
  let reveal = false;
  let firstMedia: string | undefined;
  const lbMode = site.lightbox ?? 'projects';
  const autoLightbox = lbMode === 'all' || (lbMode === 'projects' && doc.ogType !== undefined && doc.ogType !== 'website');
  ctx = { ...ctx, autoLightbox };
  walk(doc.tree, (n) => {
    if (autoLightbox && n.type === 'image' && n.asset) runtime = true;
    if (n.type === 'video' && n.soundToggle) hasSound = true;
    if (needsRuntime(n) || n.type === 'collection' || n.data?.cursor || n.type === 'video') runtime = true;
    // Wisselende woorden ([[a|b]]) hebben de runtime ook nodig.
    if (n.type === 'text' && /\[\[[^\]]*\|/.test(n.content)) runtime = true;
    if (n.effects?.reveal) reveal = true;
    if (!firstMedia && (n.type === 'image' || n.type === 'video') && n.asset && !n.hidden) {
      const a = ctx.assets[n.asset];
      firstMedia = n.type === 'video' ? a?.poster ?? undefined : assetUrl(a, 1600);
    }
  });
  const mu = (u: string) => mediaUrl(site, u)!;
  const pt = site.pageTransition ?? 'fade';
  const PT: Record<string, string> = {
    fade: '::view-transition-old(root){animation:.28s ease both v-pt-out}::view-transition-new(root){animation:.38s ease both v-pt-in}@keyframes v-pt-out{to{opacity:0}}@keyframes v-pt-in{from{opacity:0}}',
    slide: '::view-transition-old(root){animation:.4s cubic-bezier(.7,0,.3,1) both v-pt-out}::view-transition-new(root){animation:.5s cubic-bezier(.2,.8,.2,1) both v-pt-in}@keyframes v-pt-out{to{opacity:0;translate:0 -40px}}@keyframes v-pt-in{from{opacity:0;translate:0 60px}}',
    zoom: '::view-transition-old(root){animation:.35s ease both v-pt-out}::view-transition-new(root){animation:.5s cubic-bezier(.2,.8,.2,1) both v-pt-in}@keyframes v-pt-out{to{opacity:0;scale:.96}}@keyframes v-pt-in{from{opacity:0;scale:1.04}}',
    wipe: '::view-transition-old(root){animation:.6s cubic-bezier(.7,0,.3,1) both v-pt-hold}::view-transition-new(root){animation:.6s cubic-bezier(.7,0,.3,1) both v-pt-in}@keyframes v-pt-hold{to{opacity:.6}}@keyframes v-pt-in{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0)}}',
  };
  const transitionCss = PT[pt] ? `@view-transition{navigation:auto}@media (prefers-reduced-motion:no-preference){${PT[pt]}}@media (prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none!important}}` : '';

  // Licht/donker-knop voor bezoekers.
  const modeKey = site.colorMode?.toggle ? altSchemeKey(theme, site.colorMode.alt) : null;
  const dark = themeIsDark(theme);
  const modeButton = modeKey
    ? `<button class="v-mode" type="button" aria-label="${dark ? 'Lichte modus' : 'Donkere modus'}" title="Licht / donker"><svg class="v-mode-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg><svg class="v-mode-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg></button><script>(function(){var b=document.currentScript.previousElementSibling,h=document.documentElement;function s(){var a=h.dataset.mode==='alt';b.setAttribute('aria-pressed',a);b.dataset.show=(a?${dark ? "'moon'" : "'sun'"}:${dark ? "'sun'" : "'moon'"});}s();b.addEventListener('click',function(){var a=h.dataset.mode!=='alt';if(a)h.dataset.mode='alt';else delete h.dataset.mode;try{localStorage.setItem('v-mode',a?'alt':'')}catch(e){}s();});})()</script>`
    : '';

  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(title)}</title>`,
    description ? `<meta name="description" content="${esc(description)}">` : '',
    noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">',
    canonical ? `<link rel="canonical" href="${esc(canonical)}">` : '',
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:type" content="${doc.ogType ?? 'website'}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    description ? `<meta property="og:description" content="${esc(description)}">` : '',
    canonical ? `<meta property="og:url" content="${esc(canonical)}">` : '',
    ogImage ? `<meta property="og:image" content="${esc(abs(ogImage))}">` : '',
    `<meta property="og:locale" content="${esc(LANGUAGES[lang]?.locale ?? lang)}">`,
    ...alts.map((a) => `<link rel="alternate" hreflang="${esc(a.lang)}" href="${esc(abs(a.path))}">`),
    alts.length ? `<link rel="alternate" hreflang="x-default" href="${esc(abs(alts[0].path))}">` : '',
    `<meta name="twitter:card" content="${ogImage ? 'summary_large_image' : 'summary'}">`,
    seo.twitterHandle ? `<meta name="twitter:site" content="${esc(seo.twitterHandle.startsWith('@') ? seo.twitterHandle : '@' + seo.twitterHandle)}">` : '',
    seo.googleVerification ? `<meta name="google-site-verification" content="${esc(seo.googleVerification)}">` : '',
    seo.bingVerification ? `<meta name="msvalidate.01" content="${esc(seo.bingVerification)}">` : '',
    favicon ? `<link rel="icon" href="${esc(favicon)}">` : '',
    `<meta name="theme-color" content="${esc(theme.schemes[theme.defaultScheme]?.bg ?? '#000')}">`,
    ...preloadFonts(theme).map((u) => `<link rel="preload" href="${esc(mu(u))}" as="font" type="font/${u.split('.').pop()}" crossorigin>`),
    firstMedia ? `<link rel="preload" href="${esc(mu(firstMedia))}" as="image" fetchpriority="high">` : '',
    site.fontsHref ? `<link rel="stylesheet" href="${esc(site.fontsHref)}">` : '',
    reveal ? `<script>${RUNTIME_HEAD}</script>` : '',
    modeKey ? `<script>try{if(localStorage.getItem('v-mode')==='alt')document.documentElement.dataset.mode='alt'}catch(e){}</script>` : '',
    `<style>${BASE_CSS}\n${transitionCss}\n${RUNTIME_CSS}\n${themeCss(theme, { mediaUrl: mu })}\n${modeKey ? colorModeCss(theme, modeKey) + '\n' + MODE_CSS : ''}\n${collectCss(doc.tree, ctx)}</style>`,
    site.analytics === 'vercel' ? '<script defer src="/_vercel/insights/script.js"></script>' : '',
    ...(doc.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
    seo.headCode ?? '',
  ].filter(Boolean);

  // Het eerste beeld (meestal de hero) direct laden, de rest lazy.
  const body = renderNodeHtml(doc.tree, ctx).replace(/loading="lazy"/, 'loading="eager" fetchpriority="high"');

  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
${head.join('\n')}
</head>
<body${site.cursor === 'default' ? ' data-cursor="off"' : ''}>
${body}
${switcher}
${modeButton}
${hasSound ? `<script>${SOUND_SCRIPT}</script>` : ''}
${runtime ? `<script>${RUNTIME_JS}</script>` : ''}
</body>
</html>
`;
}

/** Onderhouds- of wachtwoordpagina in de stijl van het thema. */
export function renderLockPage(site: SiteSettings, opts: { mode: 'maintenance' | 'password'; error?: string; action?: string }): string {
  const theme = siteTheme(site);
  const a = site.access ?? { mode: 'open' };
  const title = a.title || (opts.mode === 'password' ? 'Deze site is beveiligd' : 'We zijn zo terug');
  const msg = a.message || (opts.mode === 'password' ? 'Vul het wachtwoord in om verder te gaan.' : 'De site wordt even bijgewerkt. Kom straks terug.');
  const form = opts.mode === 'password'
    ? `<form method="post" action="${esc(opts.action ?? '/__unlock')}" class="lock-form"><input type="password" name="password" placeholder="Wachtwoord" autocomplete="current-password" required autofocus><button class="btn-primary" type="submit">Openen</button></form>${opts.error ? `<p class="lock-err">${esc(opts.error)}</p>` : ''}`
    : '';
  return `<!doctype html><html lang="${esc(site.seo?.lang ?? 'nl')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)} — ${esc(site.name)}</title>
<style>${BASE_CSS}\n${themeCss(theme, { mediaUrl: (u) => mediaUrl(site, u)! })}
.lock{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:40px 24px;text-align:center}
.lock-form{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.lock-form input{font:inherit;color:inherit;background:transparent;border:1px solid var(--line);border-radius:999px;padding:12px 18px;min-width:240px}
.lock-err{color:#ff6b6b}</style></head>
<body><main class="lock"><p class="ts-label">${esc(site.name)}</p><h1 class="ts-h1">${esc(title)}</h1><p class="ts-large" style="max-width:560px">${esc(msg)}</p>${form}</main></body></html>`;
}

/** Stijl van de licht/donker-knop: rond, rechtsonder, in de kleuren van het thema. */
const MODE_CSS = `.v-mode{position:fixed;right:18px;bottom:18px;z-index:90;width:46px;height:46px;border-radius:999px;border:1px solid color-mix(in srgb,var(--text) 22%,transparent);background:var(--surface);color:var(--heading);display:grid;place-items:center;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .2s ease}
.v-mode:hover{transform:scale(1.07)}.v-mode:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.v-mode svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:none}
.v-mode .v-mode-moon{fill:currentColor;stroke:none}
.v-mode[data-show=sun] .v-mode-sun,.v-mode[data-show=moon] .v-mode-moon{display:block}`;
