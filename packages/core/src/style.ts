import type {
  Breakpoint,
  Layout,
  LayoutMode,
  ResponsiveProps,
  VNode,
  DesignTokens,
} from './types.js';

/** CSS als object met kebab-case eigenschappen. */
export type Css = Record<string, string>;

const merge = <T extends object>(a?: T, b?: T): T | undefined =>
  a || b ? ({ ...(a ?? {}), ...(b ?? {}) } as T) : undefined;

/** Eigenschappen van een node zoals ze gelden op een breakpoint (met cascade). */
export function resolveProps(node: VNode, bp: Breakpoint): ResponsiveProps {
  let out: ResponsiveProps = {
    layout: node.layout,
    size: node.size,
    position: node.position,
    style: node.style,
    hidden: node.hidden,
  };
  const chain: Exclude<Breakpoint, 'desktop'>[] =
    bp === 'desktop' ? [] : bp === 'tablet' ? ['tablet'] : ['tablet', 'mobile'];
  for (const b of chain) {
    const o = node.responsive?.[b];
    if (!o) continue;
    out = {
      layout: merge(out.layout, o.layout),
      size: merge(out.size, o.size),
      position: merge(out.position, o.position),
      style: merge(out.style, o.style),
      hidden: o.hidden ?? out.hidden,
    };
  }
  return out;
}

/** "token:accent" → var(--accent); anders de waarde zelf. */
export function color(v?: string): string | undefined {
  if (!v) return undefined;
  if (v.startsWith('token:')) return `var(--${v.slice(6).replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())})`;
  return v;
}

export function font(v?: string): string | undefined {
  if (!v) return undefined;
  if (v.startsWith('token:')) return `var(--font-${v.slice(6)})`;
  return v;
}

const px = (n?: number) => (n === undefined || n === null ? undefined : `${n}px`);

const alignMap: Record<string, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
  'space-between': 'space-between',
};

export interface CssContext {
  /** Layout-modus van de ouder, bepaalt hoe 'fill' en 'hug' werken. */
  parentMode: LayoutMode;
  /** Absolute posities (vrije frames) — alleen geldig als de ouder mode 'none' heeft. */
  resolveAsset?: (id: string) => string | undefined;
}

/** Zet de eigenschappen van één node om naar CSS. */
export function nodeCss(node: VNode, p: ResponsiveProps, ctx: CssContext): Css {
  const css: Css = {};
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== null && v !== '') css[k] = String(v);
  };

  if (p.hidden) {
    css.display = 'none';
    return css;
  }

  // ── Layout (deze node als container) ───────────────────────
  const L: Layout = p.layout ?? {};
  // Een knop zonder eigen layout krijgt alles van de knopstijl in het thema.
  const isContainer = node.type === 'frame' || node.type === 'collection' || node.type === 'form' || (node.type === 'button' && !!p.layout);
  if (isContainer) {
    const mode = L.mode ?? (node.type === 'collection' ? 'grid' : 'vertical');
    set('position', 'relative');
    if (mode === 'horizontal' || mode === 'vertical') {
      set('display', 'flex');
      set('flex-direction', mode === 'horizontal' ? 'row' : 'column');
      if (L.wrap) set('flex-wrap', 'wrap');
      set('align-items', alignMap[L.align ?? 'start']);
      set('justify-content', alignMap[L.justify ?? 'start']);
      set('gap', px(L.gap));
    } else if (mode === 'grid' && L.masonry) {
      // Metselwerk: kolommen die van boven naar beneden vullen, zonder gaten.
      set('display', 'block');
      set('column-count', L.columns ?? 3);
      set('column-gap', px(L.gap));
      set('--mg', px(L.rowGap ?? L.gap) ?? '0px');
    } else if (mode === 'grid') {
      set('display', 'grid');
      set('grid-template-columns', `repeat(${L.columns ?? 3}, minmax(0, 1fr))`);
      set('column-gap', px(L.gap));
      set('row-gap', px(L.rowGap ?? L.gap));
      if (L.align && L.align !== 'stretch') set('align-items', alignMap[L.align]);
    } else {
      set('display', 'block');
    }
    if (L.padding) set('padding', L.padding.map((n) => `${n}px`).join(' '));
  }

  // ── Grootte (afhankelijk van de ouder) ─────────────────────
  const S = p.size ?? {};
  const pm = ctx.parentMode;
  const width = S.width ?? (node.type === 'button' ? 'hug' : 'fill');
  const height = S.height ?? 'hug';

  if (width === 'fixed') {
    set('width', px(S.w));
    set('flex-shrink', '0');
  } else if (width === 'fill') {
    if (pm === 'horizontal') {
      set('flex', '1 1 0');
      set('min-width', '0');
    } else if (pm === 'vertical') {
      // Met een max-breedte volgt de laag de uitlijning van de ouder (bv. gecentreerd).
      if (S.maxW !== undefined) set('width', '100%');
      else set('align-self', 'stretch');
    } else {
      set('width', '100%');
    }
  } else {
    set('width', 'fit-content');
    if (pm === 'vertical') set('align-self', 'auto');
  }

  if (height === 'fixed') set('height', px(S.h));
  else if (height === 'fill') {
    if (pm === 'vertical') set('flex', '1 1 0');
    else if (pm === 'horizontal') set('align-self', 'stretch');
    else set('height', '100%');
    set('min-height', '0');
  }
  if (S.minW !== undefined) set('min-width', px(S.minW));
  if (S.maxW !== undefined) set('max-width', px(S.maxW));
  if (S.minH !== undefined) set('min-height', px(S.minH));
  if (S.aspectRatio) set('aspect-ratio', S.aspectRatio);

  // width/height-attributen van <img> mogen de hoogte niet vastzetten.
  if ((node.type === 'image' || node.type === 'video') && height === 'hug') set('height', 'auto');

  // ── Positie (Figma constraints) ────────────────────────────
  const P = p.position ?? {};
  if (P.mode === 'sticky') {
    set('position', 'sticky');
    set('top', px(P.y ?? 0));
    set('z-index', P.z ?? 10);
  }
  if (P.mode === 'absolute' || P.mode === 'fixed') {
    set('position', P.mode);
    const x = P.x ?? 0;
    const y = P.y ?? 0;
    switch (P.anchorX ?? 'left') {
      case 'left': set('left', px(x)); break;
      case 'right': set('right', px(x)); break;
      case 'center': set('left', `calc(50% + ${x}px)`); set('translate', '-50% 0'); break;
      case 'stretch': set('left', px(x)); set('right', px(x)); break;
    }
    switch (P.anchorY ?? 'top') {
      case 'top': set('top', px(y)); break;
      case 'bottom': set('bottom', px(y)); break;
      case 'center':
        set('top', `calc(50% + ${y}px)`);
        set('translate', P.anchorX === 'center' ? '-50% -50%' : '0 -50%');
        break;
      case 'stretch': set('top', px(y)); set('bottom', px(y)); break;
    }
    if (P.anchorX === 'stretch') delete css.width;
    if (P.anchorY === 'stretch') delete css.height;
  }
  if (P.z !== undefined) set('z-index', P.z);
  else if (P.mode === 'fixed') set('z-index', 50);

  // ── Stijl ──────────────────────────────────────────────────
  const st = p.style ?? {};
  set('background-color', color(st.fill));
  if (st.gradient && /^(linear|radial|conic)-gradient\([^;{}]*\)$/.test(st.gradient)) set('background-image', st.gradient);
  if (st.fillImage && ctx.resolveAsset) {
    const url = ctx.resolveAsset(st.fillImage);
    if (url) {
      set('background-image', `url("${url}")`);
      set('background-size', 'cover');
      set('background-position', 'center');
    }
  }
  set('color', color(st.color));
  set('border-radius', px(st.radius));
  if (st.stroke) set('border', `${st.strokeWidth ?? 1}px solid ${color(st.stroke)}`);
  if (st.opacity !== undefined && st.opacity !== 1) set('opacity', st.opacity);
  set('box-shadow', st.shadow);
  if (st.blur) set('backdrop-filter', `blur(${st.blur}px)`);
  set('overflow', st.overflow);
  // Eigen stapel: achtergrondlagen met z-index -1 blijven binnen deze laag (achter de inhoud, vóór de achtergrond).
  if (st.overflow === 'hidden') set('isolation', 'isolate');
  set('font-family', font(st.fontFamily));
  set('font-size', px(st.fontSize));
  set('font-weight', st.fontWeight);
  set('line-height', st.lineHeight);
  if (st.letterSpacing !== undefined) set('letter-spacing', `${st.letterSpacing}em`);
  set('text-align', st.textAlign);
  if (st.textOutline) {
    // De rand volgt de tekstkleur: een hover-kleur verandert dus de rand mee, de binnenkant blijft leeg.
    set('color', color(st.textOutline));
    set('-webkit-text-fill-color', 'transparent');
    set('-webkit-text-stroke', '0.035em currentColor');
  }
  if (st.noWrap) set('white-space', 'nowrap');
  else if (st.noWrap === false) set('white-space', 'normal');
  if (st.writingMode === 'vertical') set('writing-mode', 'vertical-rl');
  // Rotatie en spiegelen via de losse CSS-eigenschappen rotate/scale: die tellen op bij de
  // transform van animaties (parallax, hover), in plaats van ze te overschrijven.
  if (st.rotate !== undefined) set('rotate', `${Math.round(st.rotate * 100) / 100}deg`);
  if (st.flipX !== undefined || st.flipY !== undefined || st.scale !== undefined) {
    const k = st.scale ?? 1;
    set('scale', `${(st.flipX ? -1 : 1) * k} ${(st.flipY ? -1 : 1) * k}`);
  }
  if (st.origin && st.origin !== 'center') set('transform-origin', st.origin.replace('-', ' '));
  set('text-transform', st.textTransform);
  if (st.italic) set('font-style', 'italic');
  else if (st.italic === false) set('font-style', 'normal');
  if (st.decoration) {
    set('text-decoration', `${st.decoration} 0.07em`);
    set('text-underline-offset', '0.14em');
  }
  if (st.textShadow) {
    const SH: Record<string, string> = {
      soft: '0 2px 12px rgba(0,0,0,.35)',
      hard: '0.06em 0.06em 0 rgba(0,0,0,.85)',
      glow: '0 0 0.35em currentColor',
      neon: '0 0 0.08em #fff, 0 0 0.25em currentColor, 0 0 0.6em currentColor',
      long: '0.04em 0.04em 0 rgba(0,0,0,.6), 0.08em 0.08em 0 rgba(0,0,0,.45), 0.12em 0.12em 0 rgba(0,0,0,.3)',
    };
    const v = SH[st.textShadow] ?? st.textShadow;
    if (/^[^;{}<>]*$/.test(v)) set('text-shadow', v);
  }
  if (st.textGradient && st.textGradient[0] && st.textGradient[1]) {
    set('background-image', `linear-gradient(90deg, ${color(st.textGradient[0])}, ${color(st.textGradient[1])})`);
    set('-webkit-background-clip', 'text');
    set('background-clip', 'text');
    set('-webkit-text-fill-color', 'transparent');
    set('color', 'transparent');
  }
  if (st.lineClamp) {
    set('display', '-webkit-box');
    set('-webkit-line-clamp', st.lineClamp);
    set('-webkit-box-orient', 'vertical');
    set('overflow', 'hidden');
  }
  if (st.textWrap) set('text-wrap', st.textWrap);
  if (st.columns && st.columns > 1) {
    set('column-count', st.columns);
    set('column-gap', '2em');
  }
  if (st.smallCaps || st.tabularNums) set('font-variant', [st.smallCaps ? 'small-caps' : '', st.tabularNums ? 'tabular-nums' : ''].filter(Boolean).join(' '));
  set('cursor', st.cursor);
  if (st.blend) set('mix-blend-mode', st.blend);
  if (st.filters) {
    const f = st.filters;
    const parts = [
      f.blur ? `blur(${f.blur}px)` : '',
      f.grayscale ? `grayscale(${f.grayscale}%)` : '',
      f.sepia ? `sepia(${f.sepia}%)` : '',
      f.brightness !== undefined && f.brightness !== 100 ? `brightness(${f.brightness}%)` : '',
      f.contrast !== undefined && f.contrast !== 100 ? `contrast(${f.contrast}%)` : '',
      f.saturate !== undefined && f.saturate !== 100 ? `saturate(${f.saturate}%)` : '',
      f.hue ? `hue-rotate(${f.hue}deg)` : '',
    ].filter(Boolean);
    if (parts.length) set('filter', parts.join(' '));
  }
  if (st.mask) {
    const M: Record<string, string> = {
      'fade-bottom': 'linear-gradient(to bottom, #000 55%, transparent)',
      'fade-top': 'linear-gradient(to top, #000 55%, transparent)',
      'fade-x': 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)',
      'fade-y': 'linear-gradient(transparent, #000 18%, #000 82%, transparent)',
      circle: 'radial-gradient(circle closest-side, #000 99%, transparent 100%)',
    };
    const C: Record<string, string> = {
      arch: 'inset(0 round 50% 50% 0 0 / 34% 34% 0 0)',
      diamond: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
      blob: 'polygon(50% 0%, 83% 12%, 100% 43%, 94% 78%, 68% 100%, 32% 100%, 6% 78%, 0% 43%, 17% 12%)',
    };
    if (M[st.mask]) { set('-webkit-mask-image', M[st.mask]); set('mask-image', M[st.mask]); }
    if (C[st.mask]) set('clip-path', C[st.mask]);
  }
  if (node.type === 'image' || node.type === 'video') {
    set('object-fit', st.objectFit ?? 'cover');
    if (node.type === 'image' && node.focus) set('object-position', `${Math.round(node.focus.x)}% ${Math.round(node.focus.y)}%`);
    if (node.type === 'image' && node.crop && node.crop > 100) {
      // Ingezoomd: de klasse komt op een omhulsel, het beeld zelf schaalt daarbinnen (zie render).
      set('--v-crop', `${node.crop / 100}`);
      if (node.focus) set('--v-focus', `${Math.round(node.focus.x)}% ${Math.round(node.focus.y)}%`);
    }
    set('display', css.display ?? 'block');
  }
  if (node.type === 'svg') {
    set('display', css.display ?? 'block');
    const abs = P.mode === 'absolute' || P.mode === 'fixed';
    const fullX = abs && P.anchorX === 'stretch';
    const fullY = abs && P.anchorY === 'stretch';
    if (S.width === undefined && !(node as { stretch?: boolean }).stretch && !fullX) {
      set('width', '48px');
      set('flex-shrink', '0');
      delete css['align-self'];
      delete css.flex;
    }
    if (S.height === undefined && !fullY) set('height', (node as { stretch?: boolean }).stretch ? '80px' : css.width === '48px' ? '48px' : 'auto');
  }
  return css;
}

/** De layout-modus die deze node aan zijn kinderen geeft. */
export function childParentMode(node: VNode, p: ResponsiveProps): LayoutMode {
  if (node.type === 'collection') return p.layout?.mode ?? 'grid';
  if (node.type === 'frame' || node.type === 'button' || node.type === 'form') return p.layout?.mode ?? 'vertical';
  return 'none';
}

export function cssToString(css: Css): string {
  return Object.entries(css)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

/** kebab-case CSS → React style-object. */
export function cssToReact(css: Css): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(css)) {
    out[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

/** :root { --bg: ...; --font-display: ... } */
export function tokensCss(tokens: DesignTokens): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(tokens.colors)) lines.push(`--${k}:${v}`);
  for (const [k, v] of Object.entries(tokens.fonts)) lines.push(`--font-${k}:${v}`);
  return `:root{${lines.join(';')}}`;
}
