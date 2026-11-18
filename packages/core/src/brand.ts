// ─────────────────────────────────────────────────────────────
// Vystara Studios: merk-SVG's en het merkthema.
// Logo, icoon en patroon zijn echte vectoren met kleurslots, dus elke kleur
// is in de Studio aan te passen (Inspector → SVG-kleuren).
// ─────────────────────────────────────────────────────────────

import type { SvgItem } from './svg.js';
import type { Theme, TextStyle, ButtonStyle, Scheme, SchemeRole } from './theme.js';
import { LOGO_VIEWBOX, LOGO_WORD, LOGO_STUDIOS, MARK_VIEWBOX, MARK_PATH } from './brand-paths.js';

/** Merkkleuren (Coolors-palet "Vystara Studios"). */
export const BRAND = {
  mint: '#E8F7EE',
  roze: '#DB5375',
  blauw: '#0471A6',
  pruim: '#42213D',
  nacht: '#061826',
} as const;

const S1 = 'var(--svg-1, currentColor)';
const S2 = 'var(--svg-2, currentColor)';

export const LOGO_SVG = `<svg viewBox="${LOGO_VIEWBOX}" role="img" aria-label="Vystara Studios"><path fill-rule="evenodd" fill="${S1}" d="${LOGO_WORD}"/><path fill-rule="evenodd" fill="${S2}" d="${LOGO_STUDIOS}"/></svg>`;
export const MARK_SVG = `<svg viewBox="${MARK_VIEWBOX}" aria-hidden="true"><path fill-rule="evenodd" fill="${S1}" d="${MARK_PATH}"/></svg>`;

/** App-icoon: afgeronde tegel met het merkteken erin. */
export const APP_ICON_SVG = `<svg viewBox="0 0 640 640" aria-hidden="true"><rect width="640" height="640" rx="150" fill="${S1}"/><g transform="translate(185 130) scale(.62)"><path fill-rule="evenodd" fill="${S2}" d="${MARK_PATH}"/></g></svg>`;

/**
 * Het merkpatroon: schuin geplaatste sterren in verspringende rijen.
 * Vult altijd de hele laag (slice), zonder te vervormen.
 */
const tile = 120;
const m = (x: number, y: number) => `<use href="#vx-mark" transform="translate(${x} ${y}) rotate(-38) scale(.085) translate(-200 -276)"/>`;
export const PATTERN_SVG = `<svg viewBox="0 0 1440 960" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><path id="vx-mark" fill-rule="evenodd" d="${MARK_PATH}"/><pattern id="vx-pattern" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse"><g fill="${S1}">${m(30, 30)}${m(90, 90)}${m(90, -30)}${m(-30, 90)}${m(150, 30)}${m(30, 150)}</g></pattern></defs><rect width="1440" height="960" fill="url(#vx-pattern)"/></svg>`;

/** Draaiende badge: tekst rond een cirkel met de ster in het midden (kleur 1 = tekst, 2 = ster). */
const badge = (text: string) =>
  `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><path id="vx-badge-c" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0"/></defs><text font-family="Unbounded, 'Arial Black', sans-serif" font-size="14.5" font-weight="600" fill="${S1}"><textPath href="#vx-badge-c" textLength="472" lengthAdjust="spacing">${text}</textPath></text><g transform="translate(100 100) scale(.17) translate(-200 -276)"><path fill-rule="evenodd" fill="${S2}" d="${MARK_PATH}"/></g></svg>`;
export const BADGE_SVG = badge('DESIGN ZONDER GRENZEN • VYSTARA STUDIOS • ');
export const BADGE_AVAILABLE_SVG = badge('BESCHIKBAAR VOOR NIEUWE PROJECTEN • ');

export const BRAND_SVGS: SvgItem[] = [
  { id: 'vx-badge', name: 'Draaiende badge', category: 'Merk', svg: BADGE_SVG, colors: ['mint', 'roze'] },
  { id: 'vx-badge-available', name: 'Badge: beschikbaar', category: 'Merk', svg: BADGE_AVAILABLE_SVG, colors: ['mint', 'roze'] },
  { id: 'vx-logo', name: 'Vystara-logo', category: 'Merk', svg: LOGO_SVG, colors: ['mint', 'roze'] },
  { id: 'vx-mark', name: 'Vystara-ster', category: 'Merk', svg: MARK_SVG, colors: ['roze'] },
  { id: 'vx-app-icon', name: 'App-icoon', category: 'Merk', svg: APP_ICON_SVG, colors: ['nacht', 'roze'] },
  { id: 'vx-pattern', name: 'Sterrenpatroon', category: 'Merk', svg: PATTERN_SVG, colors: ['token:surface'] },
].map((x) => ({ ...x, colors: x.colors.map((c) => (c.startsWith('token:') ? c : `token:${c}`)) })) as SvgItem[];

// ── Thema ─────────────────────────────────────────────────────

const sc = (name: string, c: Record<SchemeRole, string>): Scheme => ({ name, ...c });

const head = (size: number, tab: number, mob: number, lh: number, ls: number, weight = 700): TextStyle => ({
  font: 'display', size, sizeTablet: tab, sizeMobile: mob, weight, lineHeight: lh, letterSpacing: ls, color: 'heading',
});

const btn = (o: Partial<ButtonStyle>): ButtonStyle => ({
  bg: 'token:accent', text: 'token:accentText', border: 'token:accent', borderWidth: 2, radius: 999,
  padX: 26, padY: 15, fontSize: 14, weight: 600, font: 'wide', letterSpacing: 0.01, ...o,
});

/**
 * Vystara: speels maar strak. Nachtblauw als basis, mint als licht, roze als
 * merkaccent, en blauw en pruim als extra sectiekleuren, net als op de oude site
 * maar met betere contrasten, één lettertypesysteem en vloeiende schaal.
 */
export const VYSTARA_THEME: Theme = {
  id: 'vystara',
  name: 'Vystara Studios',
  palette: { mint: BRAND.mint, roze: BRAND.roze, blauw: BRAND.blauw, pruim: BRAND.pruim, nacht: BRAND.nacht },
  fonts: {
    // Zelf gehost na "Vystara-startsite installeren"; tot dan de nette terugval.
    display: { family: 'Bricolage Grotesque', stack: '"Bricolage Grotesque", "Arial Rounded MT Bold", system-ui, sans-serif', source: 'google' },
    body: { family: 'DM Sans', stack: '"DM Sans", system-ui, -apple-system, "Segoe UI", sans-serif', source: 'google' },
    wide: { family: 'Unbounded', stack: 'Unbounded, "Arial Black", system-ui, sans-serif', source: 'google' },
    mono: { family: 'Systeem (mono)', stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', source: 'system' },
  },
  text: {
    display: head(128, 88, 54, 0.9, -0.04, 800),
    h1: head(80, 60, 42, 0.98, -0.035, 800),
    h2: head(52, 42, 32, 1.04, -0.03),
    h3: head(28, 26, 22, 1.15, -0.015),
    h4: head(20, 19, 18, 1.3, -0.005, 600),
    large: { font: 'body', size: 22, sizeMobile: 18, weight: 400, lineHeight: 1.5, letterSpacing: -0.005, color: 'text' },
    body: { font: 'body', size: 17, sizeMobile: 16, weight: 400, lineHeight: 1.65, letterSpacing: 0, color: 'text' },
    small: { font: 'body', size: 14, weight: 400, lineHeight: 1.5, letterSpacing: 0, color: 'muted' },
    label: { font: 'wide', size: 13, sizeMobile: 12, weight: 500, lineHeight: 1.3, letterSpacing: 0.02, transform: 'lowercase', color: 'accent' },
  },
  buttons: {
    primary: btn({ hoverLift: true }),
    secondary: btn({ bg: 'transparent', text: 'token:heading', border: 'token:heading', hoverBg: 'token:heading', hoverText: 'token:bg' }),
    ghost: btn({ bg: 'token:surface', text: 'token:heading', border: 'token:surface', hoverBorder: 'token:accent' }),
    link: btn({ bg: 'transparent', text: 'token:heading', border: 'transparent', padX: 0, padY: 4, underline: true, hoverText: 'token:accent' }),
  },
  schemes: {
    basis: sc('Nachtblauw', { bg: BRAND.nacht, surface: '#0E2638', text: '#C6DBD1', heading: BRAND.mint, muted: '#8FA8A2', line: '#1D3649', accent: BRAND.roze, accentText: BRAND.nacht }),
    contrast: sc('Mint', { bg: BRAND.mint, surface: '#D5EEE0', text: '#29404F', heading: BRAND.nacht, muted: '#557080', line: '#C2DFCF', accent: BRAND.pruim, accentText: BRAND.mint }),
    accent: sc('Roze', { bg: BRAND.roze, surface: '#E36D8B', text: '#2A0E1E', heading: BRAND.nacht, muted: '#4D1A30', line: '#06182633', accent: BRAND.nacht, accentText: BRAND.mint }),
    zacht: sc('Pruim', { bg: BRAND.pruim, surface: '#512B4B', text: '#E9D6E4', heading: BRAND.mint, muted: '#C7A9C0', line: '#5E3758', accent: BRAND.roze, accentText: BRAND.nacht }),
    blauw: sc('Blauw', { bg: BRAND.blauw, surface: '#0C80B9', text: '#E3F4EC', heading: BRAND.mint, muted: '#BFE1E8', line: '#E8F7EE33', accent: BRAND.nacht, accentText: BRAND.mint }),
  },
  defaultScheme: 'basis',
  radius: 18,
  fluid: true,
};

/** Google Fonts die de startsite zelf host (familie → gewichten). */
export const VYSTARA_FONTS: Record<'display' | 'body' | 'wide', { family: string; weights: number[] }> = {
  display: { family: 'Bricolage Grotesque', weights: [600, 700, 800] },
  body: { family: 'DM Sans', weights: [400, 500, 700] },
  wide: { family: 'Unbounded', weights: [500, 600] },
};
