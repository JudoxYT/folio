// ─────────────────────────────────────────────────────────────
// SVG-elementen met bewerkbare kleuren.
// Elke kleur in een SVG is een "slot": var(--svg-1), var(--svg-2), ...
// De laag vult die slots met themakleuren of eigen kleuren.
// ─────────────────────────────────────────────────────────────

export interface SvgItem {
  id: string;
  name: string;
  category: 'Merk' | 'Iconen' | 'Socials' | 'Vormen' | 'Scheidingen' | 'Decoratie';
  svg: string;
  /** Standaardkleuren per slot. */
  colors: string[];
  stretch?: boolean;
}

import { BRAND_SVGS } from './brand.js';

const S1 = 'var(--svg-1, currentColor)';
const S2 = 'var(--svg-2, currentColor)';
const S3 = 'var(--svg-3, currentColor)';

const icon = (id: string, name: string, body: string, category: SvgItem['category'] = 'Iconen'): SvgItem => ({
  id,
  name,
  category,
  svg: `<svg viewBox="0 0 24 24" fill="none" stroke="${S1}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`,
  colors: ['token:heading'],
});

const social = (id: string, name: string, path: string): SvgItem => ({
  id,
  name,
  category: 'Socials',
  svg: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${S1}" d="${path}"/></svg>`,
  colors: ['token:heading'],
});

export const SVG_LIBRARY: SvgItem[] = [
  // ── Merk (Vystara) ──
  ...BRAND_SVGS,
  // ── Iconen (lijn) ──
  icon('arrow-right', 'Pijl rechts', '<path d="M5 12h14M13 6l6 6-6 6"/>'),
  icon('arrow-up-right', 'Pijl schuin', '<path d="M7 17 17 7M8 7h9v9"/>'),
  icon('arrow-down', 'Pijl omlaag', '<path d="M12 5v14M6 13l6 6 6-6"/>'),
  icon('play', 'Afspelen', '<path d="M8 5.5v13l11-6.5z"/>'),
  icon('play-circle', 'Afspelen (rond)', '<circle cx="12" cy="12" r="9.5"/><path d="M10 8.5v7l6-3.5z"/>'),
  icon('camera', 'Camera', '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.8l1.4-2h6.6l1.4 2h1.8A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle cx="12" cy="13" r="4"/>'),
  icon('film', 'Film', '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'),
  icon('mic', 'Microfoon', '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  icon('sparkle', 'Sparkle', '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'),
  icon('star', 'Ster', '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
  icon('check', 'Vinkje', '<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  icon('plus', 'Plus', '<path d="M12 5v14M5 12h14"/>'),
  icon('mail', 'Mail', '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>'),
  icon('phone', 'Telefoon', '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
  icon('map-pin', 'Locatie', '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  icon('globe', 'Wereld', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  icon('quote', 'Citaat', '<path d="M9 7H5v6h4v4H5M19 7h-4v6h4v4h-4"/>'),
  icon('menu', 'Menu', '<path d="M4 7h16M4 12h16M4 17h16"/>'),
  icon('close', 'Sluiten', '<path d="M6 6l12 12M18 6 6 18"/>'),
  icon('download', 'Download', '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
  icon('external', 'Externe link', '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  icon('heart', 'Hart', '<path d="M12 20s-7.5-4.6-9-9.3C2 7.4 4.2 4.5 7.3 4.5c2 0 3.6 1.2 4.7 2.8 1.1-1.6 2.7-2.8 4.7-2.8 3.1 0 5.3 2.9 4.3 6.2C19.5 15.4 12 20 12 20z"/>'),
  icon('lightning', 'Bliksem', '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'),
  icon('eye', 'Oog', '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  icon('layers', 'Lagen', '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>'),
  icon('pen', 'Pen', '<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>'),
  icon('scissors', 'Montage', '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5 20 18M8.5 16.5 20 6"/>'),
  icon('monitor', 'Scherm', '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  // ── Socials (gevuld) ──
  social('instagram', 'Instagram', 'M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.7a5.1 5.1 0 1 0 0 10.2 5.1 5.1 0 0 0 0-10.2zm0 8.4a3.3 3.3 0 1 1 0-6.6 3.3 3.3 0 0 1 0 6.6zm5.3-9.8a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z'),
  social('youtube', 'YouTube', 'M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z'),
  social('twitch', 'Twitch', 'M4.3 2 3 5.3v13.4h4.6V22h2.6l3.3-3.3h4L22 14.2V2zm16 11.4-2.6 2.6h-4.2l-2.3 2.3V16H7.6V3.6h12.7zM17 6.7v5.4h-1.6V6.7zm-4.4 0v5.4H11V6.7z'),
  social('tiktok', 'TikTok', 'M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .8.1V9.2a6.2 6.2 0 1 0 5.4 6.2V8.6a7.9 7.9 0 0 0 4.6 1.5V6.8A4.6 4.6 0 0 1 16.6 2z'),
  social('discord', 'Discord', 'M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.7.1 18.2a19.9 19.9 0 0 0 6 3l1.3-2a13 13 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a13 13 0 0 1-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.8zM8 15.5c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.7 8 10.7s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z'),
  social('linkedin', 'LinkedIn', 'M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.4V9h3.4v1.6h.1a3.7 3.7 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5zM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1zM7.1 20.5H3.6V9h3.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z'),
  social('x', 'X', 'M18.2 2.3h3.4l-7.4 8.4L23 21.7h-6.8l-5.3-7-6.1 7H1.4l7.9-9L.9 2.3h7l4.8 6.4zm-1.2 17.4h1.9L7 4.2H5z'),
  social('vimeo', 'Vimeo', 'M23.9 6.4c-.1 2.3-1.7 5.5-4.8 9.5C15.9 20 13.2 22 11 22c-1.4 0-2.5-1.3-3.4-3.8L5.7 11.4C5 9 4.3 7.7 3.5 7.7c-.2 0-.8.4-1.8 1.1L.6 7.4l3.4-3c1.5-1.3 2.7-2 3.4-2.1 1.8-.2 2.9 1 3.3 3.6.4 2.8.7 4.6.9 5.3.5 2.3 1.1 3.5 1.7 3.5.5 0 1.2-.7 2.2-2.2a9 9 0 0 0 1.6-3.4c.1-1.4-.4-2.2-1.6-2.2-.6 0-1.2.1-1.8.4 1.2-3.9 3.5-5.8 6.9-5.7 2.5.1 3.7 1.7 3.5 4.8z'),
  social('behance', 'Behance', 'M8 11.3c.9-.4 1.4-1.1 1.4-2.2C9.4 7 7.9 6 5.8 6H0v12h6c2.2 0 4.3-1.1 4.3-3.6 0-1.5-.8-2.7-2.3-3.1zM2.7 8h2.6c1 0 1.8.3 1.8 1.4S6.4 11 5.4 11H2.7zm2.8 8H2.7v-3.3h2.8c1.1 0 1.9.5 1.9 1.7S6.6 16 5.5 16zM20 7.3h-6V6h6zm-2.9 1.6c-3 0-4.6 2.1-4.6 4.8 0 2.9 1.7 4.6 4.6 4.6 2.1 0 3.5-1 4.2-3h-2.3c-.3.8-1.2 1.2-1.9 1.2-1.4 0-2.1-.8-2.1-2.2h6.4c.2-3-1.4-5.4-4.3-5.4zm-2.1 3.7c.1-1.1.8-1.8 2-1.8 1.1 0 1.7.7 1.8 1.8z'),
  // ── Vormen (gevuld, 2 kleuren) ──
  { id: 'blob', name: 'Blob', category: 'Vormen', colors: ['token:accent'], svg: `<svg viewBox="0 0 200 200" aria-hidden="true"><path fill="${S1}" d="M43.5-58.7C55.6-50.3 64.2-36.3 69.5-20.8 74.8-5.3 76.8 11.7 70.7 25.2 64.6 38.7 50.4 48.7 35.3 56.9 20.2 65.1 4.2 71.5-12.6 72.4-29.4 73.3-47 68.7-58.3 57.4-69.6 46.1-74.6 28.1-75.7 10.6-76.8-6.9-74-24-65.5-37.4-57-50.8-42.8-60.5-28.1-67.6-13.4-74.7 1.8-79.1 16.4-77.5 31-75.9 31.4-67.1 43.5-58.7z" transform="translate(100 100)"/></svg>` },
  { id: 'circle', name: 'Cirkel', category: 'Vormen', colors: ['token:accent'], svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="50" fill="${S1}"/></svg>` },
  { id: 'ring', name: 'Ring', category: 'Vormen', colors: ['token:accent'], svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="${S1}" stroke-width="4"/></svg>` },
  { id: 'arch', name: 'Boog', category: 'Vormen', colors: ['token:surface'], svg: `<svg viewBox="0 0 100 120" aria-hidden="true"><path fill="${S1}" d="M0 120V50a50 50 0 0 1 100 0v70z"/></svg>` },
  { id: 'star-burst', name: 'Sticker-ster', category: 'Vormen', colors: ['token:accent', 'token:accentText'], svg: `<svg viewBox="0 0 120 120" aria-hidden="true"><path fill="${S1}" d="M60 0l9 17 18-7 1 19 19 2-7 18 17 10-15 12 10 16-19 4 1 19-18-5-10 16-12-15-15 11-3-19-19-2 7-18L0 60l15-12-10-16 19-4-1-19 18 5L51 1z"/><text x="60" y="66" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="16" fill="${S2}">NIEUW</text></svg>` },
  { id: 'squiggle', name: 'Krabbel', category: 'Decoratie', colors: ['token:accent'], svg: `<svg viewBox="0 0 200 40" aria-hidden="true"><path fill="none" stroke="${S1}" stroke-width="5" stroke-linecap="round" d="M5 25c15-20 30 20 45 0s30 20 45 0 30 20 45 0 30 20 45 0"/></svg>` },
  { id: 'underline', name: 'Handgetekende streep', category: 'Decoratie', colors: ['token:accent'], svg: `<svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true"><path fill="none" stroke="${S1}" stroke-width="6" stroke-linecap="round" d="M4 16C80 6 180 4 296 12"/></svg>` },
  { id: 'dots', name: 'Stippenraster', category: 'Decoratie', colors: ['token:line'], svg: `<svg viewBox="0 0 120 120" aria-hidden="true"><defs><pattern id="vdots" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="2" fill="${S1}"/></pattern></defs><rect width="120" height="120" fill="url(#vdots)"/></svg>` },
  { id: 'scribble-arrow', name: 'Krabbelpijl', category: 'Decoratie', colors: ['token:heading'], svg: `<svg viewBox="0 0 120 80" aria-hidden="true"><path fill="none" stroke="${S1}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M6 10c30 0 50 10 58 26s4 30-10 28-10-22 8-30 40-4 56 10M104 34l14 10-16 6"/></svg>` },
  { id: 'rec', name: 'REC-indicator', category: 'Decoratie', colors: ['#ff3b30', 'token:heading'], svg: `<svg viewBox="0 0 80 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="${S1}"/><text x="26" y="17" font-family="ui-monospace,monospace" font-weight="700" font-size="14" fill="${S2}">REC</text></svg>` },
  { id: 'gradient-orb', name: 'Gloed', category: 'Decoratie', colors: ['token:accent', 'token:bg'], svg: `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="vorb"><stop offset="0" stop-color="${S1}" stop-opacity=".9"/><stop offset="1" stop-color="${S2}" stop-opacity="0"/></radialGradient></defs><circle cx="100" cy="100" r="100" fill="url(#vorb)"/></svg>` },
  // ── Sectiescheidingen (rekken mee) ──
  { id: 'div-wave', name: 'Golf', category: 'Scheidingen', stretch: true, colors: ['token:bg'], svg: `<svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path fill="${S1}" d="M0 64c120 32 240 48 360 40s240-40 360-40 240 32 360 40 240-8 360-24v40H0z"/></svg>` },
  { id: 'div-curve', name: 'Bocht', category: 'Scheidingen', stretch: true, colors: ['token:bg'], svg: `<svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path fill="${S1}" d="M0 120C360 0 1080 0 1440 120z"/></svg>` },
  { id: 'div-tilt', name: 'Schuin', category: 'Scheidingen', stretch: true, colors: ['token:bg'], svg: `<svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true"><path fill="${S1}" d="M0 120 1440 0v120z"/></svg>` },
  { id: 'div-zigzag', name: 'Zigzag', category: 'Scheidingen', stretch: true, colors: ['token:bg'], svg: `<svg viewBox="0 0 1440 40" preserveAspectRatio="none" aria-hidden="true"><path fill="${S1}" d="M0 40V20l40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20 40-20 40 20v20z"/></svg>` },
  { id: 'div-layers', name: 'Golflagen', category: 'Scheidingen', stretch: true, colors: ['token:accent', 'token:bg'], svg: `<svg viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden="true"><path fill="${S1}" opacity=".35" d="M0 40c240 40 480 60 720 40s480-60 720-40v100H0z"/><path fill="${S2}" d="M0 80c240 30 480 40 720 20s480-40 720-20v60H0z"/></svg>` },
  { id: 'div-line', name: 'Lijn', category: 'Scheidingen', stretch: true, colors: ['token:line'], svg: `<svg viewBox="0 0 1440 2" preserveAspectRatio="none" aria-hidden="true"><rect width="1440" height="2" fill="${S1}"/></svg>` },
];

void S3;

// ── Veilig maken ─────────────────────────────────────────────

const ALLOWED = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'defs', 'lineargradient', 'radialgradient',
  'stop', 'clippath', 'mask', 'pattern', 'symbol', 'use', 'title', 'desc', 'text', 'tspan', 'textpath', 'filter', 'image',
  'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix', 'fecomposite', 'feflood', 'femerge', 'femergenode', 'feturbulence',
  'fedisplacementmap', 'femorphology', 'fedropshadow', 'metadata',
]);

/**
 * Haalt scripts, event-handlers, externe verwijzingen en onbekende elementen uit een SVG.
 * Zo kan een geüploade SVG nooit code uitvoeren in de Studio of op de site.
 */
export function sanitizeSvg(input: string): string {
  let s = input;
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, '').replace(/<!DOCTYPE[\s\S]*?>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  // Gevaarlijke blokken in hun geheel weg.
  s = s.replace(/<(script|style|foreignObject|iframe|object|embed|audio|video|canvas|a)\b[\s\S]*?<\/\1\s*>/gi, '');
  s = s.replace(/<(script|style|foreignObject|iframe|object|embed|audio|video|canvas)\b[^>]*\/?>/gi, '');
  // Tags die niet op de lijst staan: alleen de tag weg, inhoud blijft.
  s = s.replace(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g, (tag, name: string) => (ALLOWED.has(name.toLowerCase()) ? tag : ''));
  // Event-handlers en javascript:-links.
  s = s.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/\s+(xlink:)?href\s*=\s*("|')\s*(?!#)[^"']*\2/gi, (m) => (/href\s*=\s*("|')\s*data:image\//i.test(m) ? m : ''));
  s = s.replace(/javascript:/gi, '').replace(/expression\s*\(/gi, '');
  const start = s.search(/<svg\b/i);
  const end = s.toLowerCase().lastIndexOf('</svg>');
  if (start === -1 || end === -1) throw new Error('Geen geldige SVG');
  return s.slice(start, end + 6).trim();
}

// ── Kleuren omzetten naar slots ──────────────────────────────

const COLOR_RE = /#(?:[0-9a-fA-F]{3,4}){1,2}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:black|white|red|green|blue|yellow|orange|purple|gray|grey|pink)\b/;

/**
 * Zoekt de kleuren in fill/stroke/stop-color en maakt er slots van:
 * fill="#ff0000" → fill="var(--svg-1, #ff0000)". Geeft de gevonden kleuren terug.
 */
export function recolorSvg(svg: string, max = 6): { svg: string; palette: string[] } {
  const palette: string[] = [];
  const slot = (c: string) => {
    const key = c.toLowerCase();
    let i = palette.findIndex((p) => p.toLowerCase() === key);
    if (i === -1) {
      if (palette.length >= max) return null;
      palette.push(c);
      i = palette.length - 1;
    }
    return `var(--svg-${i + 1}, ${c})`;
  };
  const attr = /\b(fill|stroke|stop-color|color)\s*=\s*("|')([^"']+)\2/gi;
  let out = svg.replace(attr, (m, name: string, q: string, val: string) => {
    if (!COLOR_RE.test(val) || /var\(--svg-/.test(val)) return m;
    const v = slot(val.trim());
    return v ? `${name}=${q}${v}${q}` : m;
  });
  out = out.replace(/style\s*=\s*("|')([^"']*)\1/gi, (m, q: string, css: string) => {
    const next = css.replace(/(fill|stroke|stop-color)\s*:\s*([^;]+)/gi, (mm, p: string, val: string) => {
      if (!COLOR_RE.test(val) || /var\(--svg-/.test(val)) return mm;
      const v = slot(val.trim());
      return v ? `${p}:${v}` : mm;
    });
    return `style=${q}${next}${q}`;
  });
  // Paden zonder eigen kleur zijn standaard zwart: maak daar ook een slot van.
  if (!palette.length) {
    out = out.replace(/<svg\b/i, `<svg fill="var(--svg-1, currentColor)"`);
    palette.push('currentColor');
  }
  return { svg: out, palette };
}

/** CSS-variabelen voor de kleuren van een SVG-laag. */
export function svgColorVars(colors: string[] | undefined, color: (v?: string) => string | undefined): string {
  return (colors ?? []).map((c, i) => (c ? `--svg-${i + 1}:${color(c)}` : '')).filter(Boolean).join(';');
}

/**
 * Maakt id's in een SVG uniek per laag. Anders gebruiken twee SVG's met dezelfde
 * <pattern id> of <radialGradient id> op één pagina allebei de eerste (en dus diens kleuren).
 */
export function uniqueSvgIds(svg: string, suffix: string): string {
  const ids = [...svg.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  if (!ids.length) return svg;
  const sfx = suffix.replace(/[^a-zA-Z0-9_-]/g, '');
  let out = svg;
  for (const id of new Set(ids)) {
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out
      .replace(new RegExp(`(\\bid\\s*=\\s*["'])${esc}(["'])`, 'g'), `$1${id}-${sfx}$2`)
      .replace(new RegExp(`url\\(#${esc}\\)`, 'g'), `url(#${id}-${sfx})`)
      .replace(new RegExp(`(href\\s*=\\s*["'])#${esc}(["'])`, 'g'), `$1#${id}-${sfx}$2`);
  }
  return out;
}
