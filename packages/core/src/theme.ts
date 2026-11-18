// ─────────────────────────────────────────────────────────────
// Thema's: zoals "Site styles" (Squarespace), "Styles" (Webflow) en
// "Text styles" + "Color styles" (Framer/Figma).
//
// - Palet: vrije kleuren met een naam (→ var(--naam)).
// - Kleurschema's per sectie (Squarespace "section themes"): elke sectie
//   kan licht/donker/accent zijn; alles erin past zich automatisch aan.
// - Tekststijlen per breakpoint (display, h1–h4, groot, platte tekst, ...).
// - Knopstijlen (primair, secundair, ghost, link) met hover.
// - Lettertypes: systeem, geüpload of Google Fonts (zelf gehost).
// ─────────────────────────────────────────────────────────────

import type { Breakpoint } from './types.js';
import { BREAKPOINT_MAX } from './types.js';
import { VYSTARA_THEME } from './brand.js';

export type TextStyleKey = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'large' | 'body' | 'small' | 'label';
export const TEXT_STYLE_KEYS: TextStyleKey[] = ['display', 'h1', 'h2', 'h3', 'h4', 'large', 'body', 'small', 'label'];
export const TEXT_STYLE_LABEL: Record<TextStyleKey, string> = {
  display: 'Display (extra groot)',
  h1: 'Kop 1',
  h2: 'Kop 2',
  h3: 'Kop 3',
  h4: 'Kop 4',
  large: 'Grote tekst (intro)',
  body: 'Platte tekst',
  small: 'Kleine tekst',
  label: 'Label / bovenkop',
};

/** Rol-kleuren binnen een kleurschema. */
export type SchemeRole = 'bg' | 'surface' | 'text' | 'heading' | 'muted' | 'line' | 'accent' | 'accentText';
export const SCHEME_ROLES: SchemeRole[] = ['bg', 'surface', 'text', 'heading', 'muted', 'line', 'accent', 'accentText'];
export const SCHEME_ROLE_LABEL: Record<SchemeRole, string> = {
  bg: 'Achtergrond',
  surface: 'Vlak (kaarten)',
  text: 'Tekst',
  heading: 'Koppen',
  muted: 'Gedempte tekst',
  line: 'Lijnen',
  accent: 'Accent',
  accentText: 'Tekst op accent',
};
/** CSS-variabele per rol. `bg` → --bg, `accentText` → --accent-text. */
export const roleVar = (r: SchemeRole) => `--${r.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}`;

export type Scheme = { name: string } & Record<SchemeRole, string>;

/** Elk thema heeft deze vier schema's, zodat secties hun schema houden bij het wisselen van thema. */
export const SCHEME_KEYS = ['basis', 'contrast', 'accent', 'zacht'] as const;

export interface TextStyle {
  font: string; // sleutel in fonts, bv. 'display'
  size: number;
  sizeTablet?: number;
  sizeMobile?: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number; // em
  transform?: 'none' | 'uppercase' | 'lowercase';
  italic?: boolean;
  /** Welke rol-kleur: koppen gebruiken meestal 'heading'. */
  color?: 'heading' | 'text' | 'muted' | 'accent';
}

export type ButtonKey = 'primary' | 'secondary' | 'ghost' | 'link';
export const BUTTON_KEYS: ButtonKey[] = ['primary', 'secondary', 'ghost', 'link'];
export const BUTTON_LABEL: Record<ButtonKey, string> = { primary: 'Primair', secondary: 'Secundair', ghost: 'Ghost', link: 'Link' };

/** Kleurwaarden: hex, 'token:<palet of rol>' of 'transparent'. */
export interface ButtonStyle {
  bg: string;
  text: string;
  border: string;
  borderWidth: number;
  radius: number;
  padX: number;
  padY: number;
  fontSize: number;
  weight: number;
  font: string;
  transform?: 'none' | 'uppercase';
  letterSpacing?: number;
  hoverBg?: string;
  hoverText?: string;
  hoverBorder?: string;
  /** Beetje omhoog bij hover. */
  hoverLift?: boolean;
  underline?: boolean;
}

export interface FontFile {
  url: string; // /media/... of /media/fonts/...
  weight: string; // '400' of '100 900'
  style: 'normal' | 'italic';
}

export interface FontDef {
  /** Zichtbare naam, bv. "Inter". */
  family: string;
  /** Volledige CSS font-family met fallbacks. */
  stack: string;
  source: 'system' | 'upload' | 'google';
  files?: FontFile[];
  /** Voor Google Fonts (zelf gehost): de @font-face-regels. */
  css?: string;
}

export interface SharedStyle {
  name: string;
  style: import('./types.js').Style;
}

export interface Theme {
  id: string;
  name: string;
  /** Vrije kleuren, bruikbaar als token:<naam>. Namen mogen geen rol zijn. */
  palette: Record<string, string>;
  /** body, display en mono. */
  fonts: Record<string, FontDef>;
  text: Record<TextStyleKey, TextStyle>;
  buttons: Record<ButtonKey, ButtonStyle>;
  schemes: Record<string, Scheme>;
  defaultScheme: string;
  /** Standaard hoekafronding voor kaarten en beeld. */
  radius: number;
  /** Gedeelde stijlen (zoals Figma-stijlen): pas je er één aan, dan verandert elke laag die hem gebruikt mee. */
  styles?: Record<string, SharedStyle>;
  /**
   * Vloeiende typografie: lettergroottes schalen geleidelijk mee met de schermbreedte
   * (van mobiel 390 px tot desktop 1440 px), in plaats van in stappen. Standaard aan.
   */
  fluid?: boolean;
}

// ── Lettertype-stapels (geen externe bestanden nodig) ────────
export const SYSTEM_FONTS: { family: string; stack: string }[] = [
  { family: 'Systeem (sans)', stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
  { family: 'Systeem (serif)', stack: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' },
  { family: 'Systeem (mono)', stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
  { family: 'Helvetica / Arial', stack: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { family: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { family: 'Avenir / Montserrat-achtig', stack: 'Avenir, "Avenir Next", Montserrat, "Segoe UI", sans-serif' },
];

/** Populaire Google Fonts die de server zelf kan downloaden en hosten (geen IP-adressen naar Google). */
export const GOOGLE_FONTS: { family: string; kind: 'sans' | 'serif' | 'display' | 'mono' }[] = [
  { family: 'Inter', kind: 'sans' },
  { family: 'Inter Tight', kind: 'sans' },
  { family: 'Manrope', kind: 'sans' },
  { family: 'DM Sans', kind: 'sans' },
  { family: 'Plus Jakarta Sans', kind: 'sans' },
  { family: 'Space Grotesk', kind: 'sans' },
  { family: 'Sora', kind: 'sans' },
  { family: 'Outfit', kind: 'sans' },
  { family: 'Archivo', kind: 'sans' },
  { family: 'Syne', kind: 'display' },
  { family: 'Bricolage Grotesque', kind: 'display' },
  { family: 'Unbounded', kind: 'display' },
  { family: 'Anton', kind: 'display' },
  { family: 'Bebas Neue', kind: 'display' },
  { family: 'Fraunces', kind: 'serif' },
  { family: 'Playfair Display', kind: 'serif' },
  { family: 'Instrument Serif', kind: 'serif' },
  { family: 'DM Serif Display', kind: 'serif' },
  { family: 'Cormorant Garamond', kind: 'serif' },
  { family: 'JetBrains Mono', kind: 'mono' },
  { family: 'IBM Plex Mono', kind: 'mono' },
  { family: 'Space Mono', kind: 'mono' },
];

const SANS = SYSTEM_FONTS[0].stack;
const SERIF = SYSTEM_FONTS[1].stack;
const MONO = SYSTEM_FONTS[2].stack;

// ── Bouwstenen voor de kant-en-klare thema's ─────────────────
function textStyles(o: {
  display: string;
  body: string;
  headWeight?: number;
  tight?: number;
  upper?: boolean;
  scale?: number;
  label?: string;
}): Record<TextStyleKey, TextStyle> {
  const k = o.scale ?? 1;
  const t = o.tight ?? -0.025;
  const head = (size: number, tab: number, mob: number, lh: number, ls = t): TextStyle => ({
    font: o.display,
    size: Math.round(size * k),
    sizeTablet: Math.round(tab * k),
    sizeMobile: Math.round(mob * k),
    weight: o.headWeight ?? 600,
    lineHeight: lh,
    letterSpacing: ls,
    transform: o.upper ? 'uppercase' : 'none',
    color: 'heading',
  });
  return {
    display: head(112, 80, 44, 0.95, t * 1.4),
    h1: head(72, 56, 40, 1.02),
    h2: head(44, 36, 28, 1.1),
    h3: head(26, 24, 21, 1.2, t / 2),
    h4: head(19, 18, 17, 1.3, 0),
    large: { font: o.body, size: 22, sizeMobile: 18, weight: 400, lineHeight: 1.5, letterSpacing: -0.005, color: 'text' },
    body: { font: o.body, size: 17, sizeMobile: 16, weight: 400, lineHeight: 1.6, letterSpacing: 0, color: 'text' },
    small: { font: o.body, size: 14, weight: 400, lineHeight: 1.5, letterSpacing: 0, color: 'muted' },
    label: { font: o.label ?? o.body, size: 13, weight: 500, lineHeight: 1.3, letterSpacing: 0.12, transform: 'uppercase', color: 'muted' },
  };
}

function buttons(o: { radius: number; font: string; upper?: boolean; weight?: number }): Record<ButtonKey, ButtonStyle> {
  const base = {
    radius: o.radius,
    padX: 24,
    padY: 14,
    fontSize: 15,
    weight: o.weight ?? 600,
    font: o.font,
    transform: o.upper ? ('uppercase' as const) : ('none' as const),
    letterSpacing: o.upper ? 0.08 : 0,
    borderWidth: 1,
  };
  return {
    primary: { ...base, bg: 'token:accent', text: 'token:accentText', border: 'token:accent', hoverLift: true },
    secondary: { ...base, bg: 'transparent', text: 'token:heading', border: 'token:line', hoverBorder: 'token:heading' },
    ghost: { ...base, bg: 'token:surface', text: 'token:heading', border: 'transparent', hoverBg: 'token:line' },
    link: { ...base, bg: 'transparent', text: 'token:heading', border: 'transparent', padX: 0, padY: 4, underline: true, hoverText: 'token:accent' },
  };
}

const scheme = (name: string, c: Record<SchemeRole, string>): Scheme => ({ name, ...c });

function fonts(display: FontDef, body: FontDef): Record<string, FontDef> {
  return { display, body, mono: { family: 'Systeem (mono)', stack: MONO, source: 'system' } };
}
const sys = (family: string, stack: string): FontDef => ({ family, stack, source: 'system' });

/** Zes vertrekpunten; elk is volledig aan te passen en als eigen thema op te slaan. */
export const THEME_PRESETS: Theme[] = [
  VYSTARA_THEME,
  {
    id: 'studio-donker',
    name: 'Studio Donker',
    palette: { brand: '#e4ff54' },
    fonts: fonts(sys('Systeem (sans)', SANS), sys('Systeem (sans)', SANS)),
    text: textStyles({ display: 'display', body: 'body' }),
    buttons: buttons({ radius: 999, font: 'body' }),
    schemes: {
      basis: scheme('Donker', { bg: '#0c0c0d', surface: '#18181b', text: '#d4d4d8', heading: '#fafafa', muted: '#a1a1aa', line: '#2a2a2e', accent: '#e4ff54', accentText: '#0c0c0d' }),
      contrast: scheme('Licht', { bg: '#f4f4f5', surface: '#ffffff', text: '#3f3f46', heading: '#0c0c0d', muted: '#71717a', line: '#dcdce0', accent: '#0c0c0d', accentText: '#fafafa' }),
      accent: scheme('Accent', { bg: '#e4ff54', surface: '#d6f044', text: '#1a1a1a', heading: '#0c0c0d', muted: '#3f3f2a', line: '#0c0c0d33', accent: '#0c0c0d', accentText: '#e4ff54' }),
      zacht: scheme('Zacht', { bg: '#141416', surface: '#1f1f23', text: '#d4d4d8', heading: '#fafafa', muted: '#a1a1aa', line: '#2f2f34', accent: '#e4ff54', accentText: '#0c0c0d' }),
    },
    defaultScheme: 'basis',
    radius: 8,
  },
  {
    id: 'licht-minimal',
    name: 'Licht Minimal',
    palette: { brand: '#2f5bff' },
    fonts: fonts(sys('Systeem (sans)', SANS), sys('Systeem (sans)', SANS)),
    text: textStyles({ display: 'display', body: 'body', headWeight: 500, tight: -0.035 }),
    buttons: buttons({ radius: 8, font: 'body', weight: 500 }),
    schemes: {
      basis: scheme('Licht', { bg: '#ffffff', surface: '#f5f5f4', text: '#44403c', heading: '#0c0a09', muted: '#78716c', line: '#e7e5e4', accent: '#0c0a09', accentText: '#ffffff' }),
      contrast: scheme('Donker', { bg: '#0c0a09', surface: '#1c1917', text: '#d6d3d1', heading: '#fafaf9', muted: '#a8a29e', line: '#292524', accent: '#fafaf9', accentText: '#0c0a09' }),
      accent: scheme('Accent', { bg: '#2f5bff', surface: '#4a70ff', text: '#e6ecff', heading: '#ffffff', muted: '#c4d0ff', line: '#ffffff33', accent: '#ffffff', accentText: '#2f5bff' }),
      zacht: scheme('Zacht', { bg: '#f5f5f4', surface: '#ffffff', text: '#44403c', heading: '#0c0a09', muted: '#78716c', line: '#e7e5e4', accent: '#0c0a09', accentText: '#ffffff' }),
    },
    defaultScheme: 'basis',
    radius: 6,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    palette: { brand: '#b4532a' },
    fonts: fonts(sys('Systeem (serif)', SERIF), sys('Systeem (sans)', SANS)),
    text: textStyles({ display: 'display', body: 'body', headWeight: 400, tight: -0.02, scale: 1.05 }),
    buttons: buttons({ radius: 2, font: 'body', upper: true, weight: 600 }),
    schemes: {
      basis: scheme('Papier', { bg: '#f4efe6', surface: '#ebe4d6', text: '#3b352d', heading: '#1d1a16', muted: '#7a7064', line: '#d8cfbf', accent: '#b4532a', accentText: '#fbf7f0' }),
      contrast: scheme('Inkt', { bg: '#1d1a16', surface: '#2a2620', text: '#d8cfbf', heading: '#f4efe6', muted: '#a39888', line: '#3a342c', accent: '#e08a5d', accentText: '#1d1a16' }),
      accent: scheme('Terracotta', { bg: '#b4532a', surface: '#c0643b', text: '#fbeee5', heading: '#fff8f2', muted: '#f2cdb8', line: '#ffffff33', accent: '#fbf7f0', accentText: '#b4532a' }),
      zacht: scheme('Zacht', { bg: '#ebe4d6', surface: '#f4efe6', text: '#3b352d', heading: '#1d1a16', muted: '#7a7064', line: '#d8cfbf', accent: '#b4532a', accentText: '#fbf7f0' }),
    },
    defaultScheme: 'basis',
    radius: 2,
  },
  {
    id: 'neon-creator',
    name: 'Neon Creator',
    palette: { brand: '#7c5cff', cyaan: '#2de2e6', roze: '#ff4fd8' },
    fonts: fonts(sys('Avenir / Montserrat-achtig', SYSTEM_FONTS[5].stack), sys('Systeem (sans)', SANS)),
    text: textStyles({ display: 'display', body: 'body', headWeight: 800, tight: -0.03 }),
    buttons: buttons({ radius: 12, font: 'display', weight: 700 }),
    schemes: {
      basis: scheme('Nacht', { bg: '#0b0a1f', surface: '#16143a', text: '#c9c6ee', heading: '#ffffff', muted: '#8d89c2', line: '#2a2766', accent: '#7c5cff', accentText: '#ffffff' }),
      accent: scheme('Neon', { bg: '#7c5cff', surface: '#8d71ff', text: '#ece7ff', heading: '#ffffff', muted: '#d4c9ff', line: '#ffffff40', accent: '#2de2e6', accentText: '#0b0a1f' }),
      contrast: scheme('Licht', { bg: '#f6f5ff', surface: '#ffffff', text: '#3b3870', heading: '#0b0a1f', muted: '#6d6aa3', line: '#e1defa', accent: '#7c5cff', accentText: '#ffffff' }),
      zacht: scheme('Zacht', { bg: '#121033', surface: '#1d1a4a', text: '#c9c6ee', heading: '#ffffff', muted: '#8d89c2', line: '#2f2b70', accent: '#2de2e6', accentText: '#0b0a1f' }),
    },
    defaultScheme: 'basis',
    radius: 14,
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    palette: { brand: '#ff3b00' },
    fonts: fonts(sys('Helvetica / Arial', SYSTEM_FONTS[3].stack), sys('Helvetica / Arial', SYSTEM_FONTS[3].stack)),
    text: { ...textStyles({ display: 'display', body: 'body', headWeight: 800, tight: -0.04, upper: true, label: 'mono' }) },
    buttons: buttons({ radius: 0, font: 'mono', upper: true, weight: 700 }),
    schemes: {
      basis: scheme('Wit', { bg: '#f2f2f2', surface: '#ffffff', text: '#111111', heading: '#000000', muted: '#555555', line: '#000000', accent: '#ff3b00', accentText: '#000000' }),
      contrast: scheme('Zwart', { bg: '#000000', surface: '#111111', text: '#e6e6e6', heading: '#ffffff', muted: '#9a9a9a', line: '#ffffff', accent: '#ff3b00', accentText: '#000000' }),
      accent: scheme('Oranje', { bg: '#ff3b00', surface: '#ff5a26', text: '#000000', heading: '#000000', muted: '#3a0d00', line: '#000000', accent: '#000000', accentText: '#ff3b00' }),
      zacht: scheme('Grijs', { bg: '#dcdcdc', surface: '#ededed', text: '#111111', heading: '#000000', muted: '#555555', line: '#000000', accent: '#ff3b00', accentText: '#000000' }),
    },
    defaultScheme: 'basis',
    radius: 0,
  },
  {
    id: 'warm-film',
    name: 'Warm Film',
    palette: { brand: '#f2a541' },
    fonts: fonts(sys('Systeem (serif)', SERIF), sys('Systeem (sans)', SANS)),
    text: textStyles({ display: 'display', body: 'body', headWeight: 500, tight: -0.02 }),
    buttons: buttons({ radius: 999, font: 'body' }),
    schemes: {
      basis: scheme('Donkerkamer', { bg: '#15110d', surface: '#211a14', text: '#d9cbb8', heading: '#f6ead8', muted: '#a38f78', line: '#3a2f25', accent: '#f2a541', accentText: '#15110d' }),
      contrast: scheme('Crème', { bg: '#f6ead8', surface: '#efe0c9', text: '#4a3b2c', heading: '#15110d', muted: '#86715a', line: '#dccab0', accent: '#c46b1d', accentText: '#fff8ee' }),
      accent: scheme('Amber', { bg: '#f2a541', surface: '#f5b55e', text: '#2a1c0c', heading: '#15110d', muted: '#5a3d16', line: '#15110d33', accent: '#15110d', accentText: '#f2a541' }),
      zacht: scheme('Zacht', { bg: '#1d1712', surface: '#2a2119', text: '#d9cbb8', heading: '#f6ead8', muted: '#a38f78', line: '#3f342a', accent: '#f2a541', accentText: '#15110d' }),
    },
    defaultScheme: 'basis',
    radius: 10,
  },
];

export const DEFAULT_THEME: Theme = THEME_PRESETS[0];

// ── CSS genereren ────────────────────────────────────────────

const ROLE_NAMES = new Set<string>(SCHEME_ROLES);

/** Kleurwaarde uit een thema-veld → CSS. 'token:accentText' → var(--accent-text). */
export function themeColor(v: string | undefined): string | undefined {
  if (!v) return undefined;
  if (v.startsWith('token:')) {
    const k = v.slice(6);
    return ROLE_NAMES.has(k) ? `var(${roleVar(k as SchemeRole)})` : `var(--${k})`;
  }
  return v;
}

function schemeVars(s: Scheme): string {
  return SCHEME_ROLES.map((r) => `${roleVar(r)}:${themeColor(s[r])}`).join(';');
}

function fontFaces(theme: Theme, mediaUrl: (u: string) => string): string {
  const out: string[] = [];
  for (const f of Object.values(theme.fonts)) {
    if (f.source === 'google' && f.css) out.push(f.css.replace(/url\((\/media\/[^)]+)\)/g, (_, u) => `url(${mediaUrl(u)})`));
    if (f.source === 'upload')
      for (const file of f.files ?? [])
        out.push(`@font-face{font-family:"${f.family}";src:url(${mediaUrl(file.url)});font-weight:${file.weight};font-style:${file.style};font-display:swap}`);
  }
  return out.join('\n');
}

function textCss(s: TextStyle, size: number | undefined): string {
  const d = [
    `font-family:var(--font-${s.font})`,
    size !== undefined ? `font-size:${size}px` : '',
    `font-weight:${s.weight}`,
    `line-height:${s.lineHeight}`,
    `letter-spacing:${s.letterSpacing}em`,
    s.transform && s.transform !== 'none' ? `text-transform:${s.transform}` : '',
    s.italic ? 'font-style:italic' : '',
    s.color ? `color:var(--${s.color})` : '',
    s.color === 'heading' ? 'text-wrap:balance' : 'text-wrap:pretty',
  ];
  return d.filter(Boolean).join(';');
}

function buttonCss(b: ButtonStyle): { base: string; hover: string } {
  const base = [
    `display:inline-flex;align-items:center;justify-content:center;gap:8px`,
    `background:${themeColor(b.bg)}`,
    `color:${themeColor(b.text)}`,
    `border:${b.borderWidth}px solid ${themeColor(b.border)}`,
    `border-radius:${b.radius}px`,
    `padding:${b.padY}px ${b.padX}px`,
    `font-family:var(--font-${b.font});font-size:${b.fontSize}px;font-weight:${b.weight};line-height:1.1`,
    b.transform === 'uppercase' ? 'text-transform:uppercase' : '',
    b.letterSpacing ? `letter-spacing:${b.letterSpacing}em` : '',
    b.underline ? 'text-decoration:underline;text-underline-offset:.25em' : 'text-decoration:none',
    'cursor:pointer;transition:background-color .2s,color .2s,border-color .2s,transform .2s',
  ];
  const hover = [
    b.hoverBg ? `background:${themeColor(b.hoverBg)}` : '',
    b.hoverText ? `color:${themeColor(b.hoverText)}` : '',
    b.hoverBorder ? `border-color:${themeColor(b.hoverBorder)}` : '',
    b.hoverLift ? 'transform:translateY(-2px)' : '',
    !b.hoverBg && !b.hoverText && !b.hoverBorder && !b.hoverLift ? 'opacity:.85' : '',
  ];
  return { base: base.filter(Boolean).join(';'), hover: hover.filter(Boolean).join(';') };
}

/**
 * Thema-CSS.
 * - Voor de site (`bp` leeg): basis + @media voor tablet en mobiel.
 * - Voor het Studio-canvas (`bp` gezet): plat voor dat breakpoint, en met `root` als selector.
 */
export function themeCss(
  theme: Theme,
  opts: { bp?: Breakpoint; root?: string; mediaUrl?: (u: string) => string } = {},
): string {
  const root = opts.root ?? ':root';
  const mu = opts.mediaUrl ?? ((u: string) => u);
  const def = theme.schemes[theme.defaultScheme] ?? Object.values(theme.schemes)[0];
  const rootVars = [
    ...Object.entries(theme.palette).map(([k, v]) => `--${k}:${v}`),
    ...Object.entries(theme.fonts).map(([k, f]) => `--font-${k}:${f.stack}`),
    `--radius:${theme.radius}px`,
    def ? schemeVars(def) : '',
  ].filter(Boolean);

  const lines: string[] = [];
  lines.push(fontFaces(theme, mu));
  lines.push(`${root}{${rootVars.join(';')}}`);
  const bodySel = root === ':root' ? 'body' : root;
  lines.push(`${bodySel}{background:var(--bg);color:var(--text);${textCss(theme.text.body, theme.text.body.size)}}`);

  for (const [k, s] of Object.entries(theme.schemes)) {
    lines.push(`.sc-${k}{${schemeVars(s)};background-color:var(--bg);color:var(--text)}`);
  }

  const sizeFor = (s: TextStyle, bp: Breakpoint) =>
    bp === 'mobile' ? s.sizeMobile ?? s.sizeTablet ?? s.size : bp === 'tablet' ? s.sizeTablet ?? s.size : s.size;

  const fluid = theme.fluid !== false && !opts.bp;
  for (const key of Object.keys(theme.text) as TextStyleKey[]) {
    const s = theme.text[key];
    const css = textCss(s, opts.bp ? sizeFor(s, opts.bp) : s.size);
    lines.push(`.ts-${key}{${fluid ? css.replace(/font-size:[^;]+/, `font-size:${fluidSize(sizeFor(s, 'mobile'), s.size)}`) : css}}`);
  }
  for (const key of Object.keys(theme.buttons) as ButtonKey[]) {
    const { base, hover } = buttonCss(theme.buttons[key]);
    lines.push(`.btn-${key}{${base}}`);
    lines.push(`@media (hover:hover){.btn-${key}:hover{${hover}}}`);
  }
  lines.push(`.v-link{color:inherit}`);
  // Lange Nederlandse woorden op kleine schermen netjes afbreken in plaats van buiten beeld te lopen.
  lines.push(`@media (max-width:${BREAKPOINT_MAX.mobile}px){.ts-display,.ts-h1,.ts-h2,.ts-h3{hyphens:auto;-webkit-hyphens:auto;overflow-wrap:break-word}}`);

  if (!opts.bp && !fluid) {
    const tab: string[] = [];
    const mob: string[] = [];
    for (const key of Object.keys(theme.text) as TextStyleKey[]) {
      const s = theme.text[key];
      if (s.sizeTablet && s.sizeTablet !== s.size) tab.push(`.ts-${key}{font-size:${s.sizeTablet}px}`);
      const m = s.sizeMobile ?? s.sizeTablet;
      if (m && m !== (s.sizeTablet ?? s.size)) mob.push(`.ts-${key}{font-size:${m}px}`);
    }
    if (tab.length) lines.push(`@media (max-width:${BREAKPOINT_MAX.tablet}px){${tab.join('')}}`);
    if (mob.length) lines.push(`@media (max-width:${BREAKPOINT_MAX.mobile}px){${mob.join('')}}`);
  }
  return `@layer theme{\n${lines.filter(Boolean).join('\n')}\n}`;
}

/**
 * clamp() tussen de mobiele en desktopgrootte, lineair over 390–1440 px schermbreedte.
 * Boven 1440 px groeit het nog licht mee (tot 1,15×) voor grote schermen.
 */
export function fluidSize(min: number, max: number): string {
  if (min === max) return `${max}px`;
  const vMin = 390;
  const vMax = 1440;
  const slope = (max - min) / (vMax - vMin);
  const base = min - slope * vMin;
  const hi = Math.round(max * 1.15);
  return `clamp(${min}px, ${base.toFixed(2)}px + ${(slope * 100).toFixed(3)}vw, ${hi}px)`;
}

/** Fonts van het thema die vooraf geladen moeten worden (body + display). */
export function preloadFonts(theme: Theme): string[] {
  const urls: string[] = [];
  for (const k of ['body', 'display']) {
    const f = theme.fonts[k];
    if (f?.source === 'upload' && f.files?.[0]) urls.push(f.files[0].url);
  }
  return [...new Set(urls)];
}
