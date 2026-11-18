import type { Easing, Effects, Motion, VNode } from './types.js';
import { color } from './style.js';

export const EASING: Record<Easing, string> = {
  ease: 'ease',
  'ease-out': 'cubic-bezier(.16,1,.3,1)',
  'ease-in-out': 'cubic-bezier(.65,0,.35,1)',
  linear: 'linear',
  smooth: 'cubic-bezier(.22,1,.36,1)',
  spring: 'cubic-bezier(.34,1.56,.64,1)',
};

/** Motion → CSS transform-waarde. */
export function motionTransform(m: Motion): string {
  const parts: string[] = [];
  if (m.x || m.y) parts.push(`translate(${m.x ?? 0}px, ${m.y ?? 0}px)`);
  if (m.scale !== undefined && m.scale !== 1) parts.push(`scale(${m.scale})`);
  if (m.rotate) parts.push(`rotate(${m.rotate}deg)`);
  return parts.join(' ') || 'none';
}

function motionDecls(m: Motion): string {
  const d: string[] = [];
  if (m.x || m.y || (m.scale !== undefined && m.scale !== 1) || m.rotate) d.push(`transform:${motionTransform(m)}`);
  if (m.color) d.push(`color:${color(m.color)}`, `--svg-1:${color(m.color)}`);
  if (m.bg) d.push(`background-color:${color(m.bg)}`);
  if (m.opacity !== undefined) d.push(`opacity:${m.opacity}`);
  if (m.blur) d.push(`filter:blur(${m.blur}px)`);
  return d.join(';');
}

/** CSS-regels voor hover, press en spin van één node. */
export function effectsCss(n: VNode): string {
  const fx = n.effects;
  if (!fx) return '';
  const sel = `.${n.id}`;
  const out: string[] = [];
  if (fx.hover || fx.press) {
    const dur = fx.hover?.duration ?? 250;
    const ease = EASING[fx.hover?.easing ?? 'smooth'];
    out.push(`${sel}{transition:transform ${dur}ms ${ease},opacity ${dur}ms ${ease},filter ${dur}ms ${ease},color ${dur}ms ${ease},background-color ${dur}ms ${ease}}`);
  }
  if (fx.groupHover) {
    const g = fx.groupHover;
    const dur = g.duration ?? 450;
    if (!fx.hover && !fx.press) out.push(`${sel}{transition:transform ${dur}ms ${EASING.smooth},opacity ${dur}ms,color ${dur}ms,background-color ${dur}ms}`);
    out.push(`@media (hover:hover){a:hover ${sel},[data-group]:hover ${sel}{${motionDecls(g)}}}`);
  }
  if (fx.sweep) {
    // Rustige kleurwissel bij hover (ook als de muis boven de omliggende link of kaart hangt).
    const dur = fx.sweep.duration ?? 350;
    const c = color(fx.sweep.color);
    if (!fx.hover && !fx.press && !fx.groupHover) out.push(`${sel}{transition:color ${dur}ms ease}`);
    out.push(`@media (hover:hover){${sel}:hover,a:hover ${sel},[data-group]:hover ${sel}{color:${c};--svg-1:${c}}}`);
  }
  if (fx.hover) out.push(`@media (hover:hover){${sel}:hover{${motionDecls(fx.hover)}}}`);
  if (fx.press) out.push(`${sel}:active{${motionDecls(fx.press)};transition-duration:${fx.press.duration ?? 100}ms}`);
  if (fx.spin) out.push(`${sel}{animation:v-spin ${fx.spin.duration}s linear infinite}`);
  if (fx.loop) {
    const l = fx.loop;
    const dur = l.duration ?? ({ float: 6, pulse: 1.8, wiggle: 3, twinkle: 2.6, shoot: 9 } as const)[l.kind];
    const ease = l.kind === 'shoot' ? 'cubic-bezier(.3,0,.2,1)' : 'ease-in-out';
    const dir = l.kind === 'float' || l.kind === 'wiggle' ? ' alternate' : '';
    out.push(`@media (prefers-reduced-motion:no-preference){${sel}{animation:v-${l.kind} ${dur}s ${ease} ${l.delay ?? 0}s infinite${dir}}}`);
  }
  if (fx.marquee?.pauseOnHover) out.push(`${sel}:hover .v-mq{animation-play-state:paused}`);
  if (fx.mobile === false) {
    // Op telefoons geen beweging: hover/spin uit.
    out.push(`@media (max-width:640px){${sel}{animation:none;transition:none}}`);
  }
  return out.join('\n');
}

/** Wat de runtime op de site nodig heeft, als data-fx attribuut. */
export function fxData(n: VNode): string | null {
  const fx = n.effects;
  if (!fx) return null;
  const d: Record<string, unknown> = {};
  if (fx.reveal) d.reveal = { ...fx.reveal, easing: EASING[fx.reveal.easing ?? 'smooth'] };
  if (fx.scroll) d.scroll = fx.scroll;
  if (fx.parallax?.speed) d.parallax = fx.parallax.speed;
  if (fx.mouse?.strength) d.mouse = fx.mouse.strength;
  if (fx.marquee) d.marquee = { speed: fx.marquee.speed ?? 60, dir: fx.marquee.direction ?? 'left' };
  if (fx.text) d.text = fx.text;
  if (fx.magnetic?.strength) d.magnetic = fx.magnetic.strength;
  if (fx.tilt?.max) d.tilt = fx.tilt.max;
  if (fx.jelly) d.jelly = 1;
  if (fx.lightbox) d.lightbox = 1;
  if (fx.mobile === false) d.noMobile = 1;
  return Object.keys(d).length ? JSON.stringify(d) : null;
}

export function needsRuntime(n: VNode): boolean {
  return fxData(n) !== null || n.type === 'form';
}

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/|#)/i;

/**
 * Heel kleine opmaak voor tekstlagen: **vet**, *cursief*, [tekst](url).
 * Eerst escapen, daarna pas omzetten: veilig voor HTML-injectie.
 */
export function richText(src: string): string {
  const esc = src.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  return esc
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text: string, url: string) => {
      const raw = url.replace(/&amp;/g, '&');
      if (!SAFE_URL.test(raw)) return text;
      const ext = /^https?:/i.test(raw);
      return `<a href="${url.replace(/[_~=`]/g, (c) => `&#${c.charCodeAt(0)};`)}"${ext ? ' target="_blank" rel="noopener"' : ''} class="v-link">${text}</a>`;
    })
    .replace(/\[\[([^\]]+)\]\]([.,!?…:;]*)/g, (m, list: string, after: string) => {
      // [[woord a|woord b|woord c]] = wisselende woorden. Een leesteken direct erna schuift mee,
      // zodat het op een smal scherm nooit los op een eigen regel belandt.
      const words = list.split('|').map((w) => w.trim()).filter(Boolean);
      const pu = after ? `<span class="v-pu">${after}</span>` : '';
      return `<span class="v-rot" data-words="${words.join('|')}"${after ? ` data-after="${after}"` : ''}><span>${words[0] ?? ''}${pu}</span></span>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    // Uitgebreide opmaak: __onderstreept__, ~~doorgestreept~~, ==gemarkeerd==, `code`, [tekst]{kleur}
    .replace(/__([^_\n]+)__/g, '<u>$1</u>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/==([^=\n]+)==/g, '<mark>$1</mark>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\{(#[0-9a-fA-F]{3,8}|[a-zA-Z][\w-]*)\}/g, (m, text: string, c: string) => `<span style="color:${c.startsWith('#') ? c : color('token:' + c)}">${text}</span>`);
}

export function hasRichText(src: string): boolean {
  return /\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\)|\[\[[^\]]+\]\]|__[^_\n]+__|~~[^~\n]+~~|==[^=\n]+==|`[^`\n]+`|\[[^\]]+\]\{[^}]+\}/.test(src);
}

/** Standaardeffecten voor de knoppen in de Studio ("presets"). */
export const EFFECT_PRESETS: { id: string; label: string; effects: Effects }[] = [
  { id: 'fade-up', label: 'Omhoog infaden', effects: { reveal: { from: { opacity: 0, y: 40 }, duration: 800 } } },
  { id: 'fade', label: 'Infaden', effects: { reveal: { from: { opacity: 0 }, duration: 900 } } },
  { id: 'zoom-in', label: 'Inzoomen', effects: { reveal: { from: { opacity: 0, scale: 0.92 }, duration: 900 } } },
  { id: 'blur-in', label: 'Uit vaag', effects: { reveal: { from: { opacity: 0, blur: 16, y: 16 }, duration: 1000 } } },
  { id: 'stagger', label: 'Kinderen na elkaar', effects: { reveal: { from: { opacity: 0, y: 24 }, duration: 700, stagger: 90 } } },
  { id: 'parallax-slow', label: 'Parallax (diepte; zet de ouder op afknippen)', effects: { parallax: { speed: 0.25 } } },
  { id: 'parallax-fast', label: 'Parallax (voorgrond)', effects: { parallax: { speed: -0.2 } } },
  { id: 'scroll-zoom', label: 'Inzoomen bij scrollen', effects: { scroll: { from: { scale: 0.85, opacity: 0.4 }, to: { scale: 1, opacity: 1 }, start: 0, end: 0.5 } } },
  { id: 'hover-lift', label: 'Optillen bij hover', effects: { hover: { y: -6, scale: 1.02 }, press: { scale: 0.98 } } },
  { id: 'mouse', label: 'Volgt de muis', effects: { mouse: { strength: 20 } } },
  { id: 'marquee', label: 'Lopende band', effects: { marquee: { direction: 'left', speed: 60 } } },
  { id: 'typewriter', label: 'Typemachine', effects: { text: { kind: 'typewriter', duration: 1400 } } },
  { id: 'words', label: 'Woord voor woord', effects: { text: { kind: 'words', duration: 900 } } },
  { id: 'letters', label: 'Letters springen erin (+ los bij hover)', effects: { text: { kind: 'letters' }, jelly: true } },
  { id: 'sweep', label: 'Kleur bij hover', effects: { sweep: { color: 'token:roze' } } },
  { id: 'tilt', label: '3D-kantelen naar de muis', effects: { tilt: { max: 8 } } },
  { id: 'count', label: 'Cijfers tellen op', effects: { text: { kind: 'count', duration: 1600 } } },
  { id: 'float', label: 'Zweven', effects: { loop: { kind: 'float' } } },
  { id: 'pulse', label: 'Pulseren', effects: { loop: { kind: 'pulse' } } },
  { id: 'wiggle', label: 'Wiebelen', effects: { loop: { kind: 'wiggle' } } },
  { id: 'twinkle', label: 'Twinkelen', effects: { loop: { kind: 'twinkle' } } },
  { id: 'shoot', label: 'Vallende ster (zet de laag linksboven)', effects: { loop: { kind: 'shoot' } } },
  { id: 'magnetic', label: 'Magnetisch', effects: { magnetic: { strength: 0.35 } } },
];
