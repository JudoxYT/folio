// ─────────────────────────────────────────────────────────────
// Vystara-startsite: de oude Squarespace-site, opnieuw opgebouwd.
// Zelfde verhaal en inhoud, maar met een strak merksysteem, vloeiende
// typografie, echte SVG-merkelementen, beweging en betere SEO.
// ─────────────────────────────────────────────────────────────

import type { ButtonNode, CollectionNode, Component, FrameNode, Project, Redirect, Seo, SiteSettings, SvgNode, TextNode, VNode } from './types.js';
import { uid, videoEmbed } from './tree.js';
import { F, T, B, Img, Icon, Grid, Section } from './sections.js';
import { contactForm } from './defaults.js';
import { VYSTARA_THEME } from './brand.js';
import { LEGACY_COPY as COPY, LEGACY_PROJECTS, type LegacyProject, type LocalSection } from './legacy.js';

type P<T> = Omit<Partial<T>, 'type'>;

/** Merkbestanden die de server als media klaarzet (sleutel → asset-id). */
export type BrandAssets = Partial<Record<'notebook' | 'cup' | 'favicon' | 'social' | 'logoPng', string>>;

const row = (name: string, gap: number, children: VNode[], props: P<FrameNode> = {}) =>
  F(name, { layout: { mode: 'horizontal', gap, align: 'center', wrap: true }, size: { width: 'fill' }, ...props }, children);
const stack = (name: string, gap: number, children: VNode[], props: P<FrameNode> = {}) =>
  F(name, { layout: { mode: 'vertical', gap }, size: { width: 'fill' }, ...props }, children);
const split = (name: string, left: VNode, right: VNode, gap = 72): FrameNode =>
  F(name, { layout: { mode: 'horizontal', gap, align: 'center' }, size: { width: 'fill' }, responsive: { tablet: { layout: { mode: 'vertical', gap: 40, align: 'start' } } } }, [left, right]);

const reveal = (stagger = 90, delay = 0) => ({ reveal: { from: { opacity: 0, y: 28 }, duration: 800, stagger, delay, easing: 'smooth' as const } });

const logo = (w: number, props: P<SvgNode> = {}): SvgNode =>
  Icon('vx-logo', { size: { width: 'fixed', w, height: 'fixed', h: Math.round(w / 4.013) }, ariaLabel: 'Vystara Studios', ...props });
const mark = (w: number, color = 'token:roze', props: P<SvgNode> = {}): SvgNode =>
  Icon('vx-mark', { size: { width: 'fixed', w, height: 'fixed', h: Math.round(w * 1.38) }, colors: [color], ...props });
const pattern = (color: string, opacity = 1, props: P<SvgNode> = {}): SvgNode =>
  Icon('vx-pattern', {
    name: 'Patroon',
    colors: [color],
    position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: 0, z: -1 },
    style: { opacity },
    ...props,
  });
const social = (id: 'tiktok' | 'youtube' | 'instagram', color = 'token:heading'): SvgNode =>
  Icon(id, {
    href: COPY.socials[id],
    ariaLabel: { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }[id],
    colors: [color],
    size: { width: 'fixed', w: 22, height: 'fixed', h: 22 },
    effects: { hover: { y: -3, scale: 1.1 } },
  });
const socials = (color?: string) => row('Socials', 22, [social('tiktok', color), social('youtube', color), social('instagram', color)], { size: { width: 'hug' } });

const heading = (label: string, title: string, props: { center?: boolean; level?: 'h1' | 'h2'; maxW?: number } = {}) =>
  stack('Kop', 16, [
    T('label', label, props.center ? { style: { textAlign: 'center' } } : {}),
    T(props.level ?? 'h2', title, { ...(props.center ? { style: { textAlign: 'center' as const } } : {}), effects: { text: { kind: 'words' } } }),
  ], { size: { width: 'fill', maxW: props.maxW ?? 820 }, layout: { mode: 'vertical', gap: 16, align: props.center ? 'center' : 'start' } });

// ── Header en footer ─────────────────────────────────────────

export function vystaraComponents(): Component[] {
  const now = new Date().toISOString();
  const nav = (label: string, href: string) =>
    T('body', label, { tag: 'p', name: label, href, size: { width: 'hug' }, style: { color: 'token:heading', fontWeight: 500 }, effects: { sweep: { color: 'token:roze', duration: 450 } } });

  const header: Component = {
    id: 'c_header',
    name: 'Header',
    updatedAt: now,
    tree: F('Header', {
      tag: 'header',
      scheme: 'basis',
      layout: { mode: 'horizontal', justify: 'space-between', align: 'center', padding: [18, 40, 18, 40] },
      size: { width: 'fill' },
      position: { mode: 'sticky', y: 0, z: 40 },
      style: { fill: '#061826E0', blur: 14 },
      responsive: { mobile: { layout: { padding: [14, 18, 14, 18] } } },
    }, [
      logo(148, { href: '/', ariaLabel: 'Vystara Studios — naar de homepage', responsive: { mobile: { size: { width: 'fixed', w: 118, height: 'fixed', h: 29 } } } }),
      F('Navigatie', { tag: 'nav', layout: { mode: 'horizontal', gap: 32, align: 'center' }, size: { width: 'hug' }, responsive: { mobile: { layout: { gap: 18 } } } }, [
        nav('Werk', '/work/'),
        nav('Over', '/about/'),
        nav('Contact', '/contact/'),
        B('Project starten', '/start/', 'primary', { effects: { magnetic: { strength: 0.25 } }, responsive: { mobile: { hidden: true } } }),
      ]),
    ]),
  };

  const col = (title: string, kids: VNode[]) => stack(title, 14, [T('label', title), ...kids], { size: { width: 'fill' } });
  const link = (label: string, href: string, ext = false) =>
    T('body', label, { href, newTab: ext || undefined, size: { width: 'hug' }, style: { color: 'token:heading' }, effects: { sweep: { color: 'token:roze', duration: 450 } } } as P<TextNode>);

  const footer: Component = {
    id: 'c_footer',
    name: 'Footer',
    updatedAt: now,
    tree: F('Footer', {
      tag: 'footer',
      scheme: 'basis',
      layout: { mode: 'vertical', gap: 72, padding: [112, 40, 32, 40], align: 'center' },
      size: { width: 'fill' },
      style: { overflow: 'hidden' },
      responsive: { mobile: { layout: { padding: [72, 20, 24, 20], gap: 48 } } },
    }, [
      pattern('token:surface', 0.6),
      stack('Inhoud', 72, [
        F('Boven', { layout: { mode: 'horizontal', justify: 'space-between', align: 'start', gap: 48 }, size: { width: 'fill' }, responsive: { tablet: { layout: { mode: 'vertical' } } } }, [
          stack('Oproep', 20, [
            T('label', 'mail me'),
            T('h1', 'Zullen we iets moois maken?', { tag: 'p', effects: { text: { kind: 'letters' }, jelly: true } }),
            T('h3', COPY.email, { tag: 'p', href: `mailto:${COPY.email}`, style: { color: 'token:roze' }, effects: { sweep: { color: 'token:mint' } } }),
          ], { size: { width: 'fill', maxW: 640 } }),
          F('Kolommen', { layout: { mode: 'grid', columns: 2, gap: 48 }, size: { width: 'fill', maxW: 420 }, responsive: { mobile: { layout: { columns: 2, gap: 24 } } } }, [
            col('menu', [link('Werk', '/work/'), link('Over', '/about/'), link('Contact', '/contact/'), link('Project starten', '/start/')]),
            col('volgen', [link('TikTok', COPY.socials.tiktok, true), link('YouTube', COPY.socials.youtube, true), link('Instagram', COPY.socials.instagram, true)]),
          ]),
        ]),
        Icon('vx-logo', {
          name: 'Groot logo',
          ariaLabel: 'Vystara Studios',
          colors: ['token:mint', 'token:roze'],
          size: { width: 'fill', aspectRatio: '1200 / 299' },
          effects: { reveal: { from: { opacity: 0, y: 80 }, duration: 1200, easing: 'smooth' } },
        }),
        F('Onder', { layout: { mode: 'horizontal', justify: 'space-between', align: 'center', gap: 16 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
          row('Merk', 12, [mark(18, 'token:roze', { effects: { spin: { duration: 14 } } }), T('small', '© {{year}} Vystara Studios', { size: { width: 'hug' } })], { size: { width: 'hug' } }),
          T('small', 'Ontworpen en gebouwd in Nederland', { size: { width: 'hug' } }),
        ]),
      ], { size: { width: 'fill', maxW: 1280 } }),
    ]),
  };
  return [header, footer];
}

// ── Herbruikbare bouwstenen ──────────────────────────────────

const magnetic = { magnetic: { strength: 0.3 } };

function band(words: string[], o: { fill: string; text: string; outline?: string; dir: 'left' | 'right'; rotate: number; speed: number }): FrameNode {
  return F('Band', {
    layout: { mode: 'horizontal', padding: [18, 0, 18, 0] },
    size: { width: 'fixed', w: 2600 },
    style: { fill: o.fill },
    effects: { scroll: { from: { rotate: o.rotate, x: o.dir === 'left' ? 60 : -60 }, to: { rotate: o.rotate, x: o.dir === 'left' ? -60 : 60 } } },
  }, [
    F('Loop', { layout: { mode: 'horizontal', gap: 40, align: 'center' }, size: { width: 'fill' }, effects: { marquee: { direction: o.dir, speed: o.speed, pauseOnHover: true } } },
      words.flatMap((w, i) => [
        T('h2', w, { tag: 'p', size: { width: 'hug' }, style: i % 2 && o.outline ? { textOutline: o.outline, noWrap: true } : { color: o.text, noWrap: true } }),
        mark(30, o.text, { effects: { spin: { duration: 6 } } }),
      ])),
  ]);
}

/** Twee lopende banden die elkaar kruisen: de "funky" scheiding tussen secties. */
function crossingBands(words: string[], scheme = 'basis'): FrameNode {
  return F('Kruisende banden', {
    tag: 'section',
    scheme,
    layout: { mode: 'none' },
    size: { width: 'fill', height: 'fixed', h: 230 },
    style: { overflow: 'hidden' },
    responsive: { mobile: { size: { height: 'fixed', h: 170 } } },
  }, [
    F('Achter', { layout: { mode: 'vertical', align: 'center' }, size: { width: 'fill' }, position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'center', x: 0, y: 0 } }, [band(words, { fill: 'token:blauw', text: 'token:mint', outline: 'token:mint', dir: 'right', rotate: 3, speed: 45 })]),
    F('Voor', { layout: { mode: 'vertical', align: 'center' }, size: { width: 'fill' }, position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'center', x: 0, y: 0 } }, [band(words, { fill: 'token:roze', text: 'token:nacht', outline: 'token:nacht', dir: 'left', rotate: -3, speed: 60 })]),
  ]);
}

/** Enorme typografie die met het scrollen van links naar rechts schuift (twee regels tegen elkaar in). */
function kineticType(a: string, b: string): FrameNode {
  const line = (t: string, from: number, to: number, outline: boolean) =>
    T('display', t, {
      tag: 'p',
      size: { width: 'hug' },
      style: { fontSize: 190, lineHeight: 0.95, noWrap: true, ...(outline ? { textOutline: 'token:roze' } : {}) },
      // Op telefoons: kleiner, netjes afgebroken en gecentreerd in plaats van half buiten beeld.
      responsive: { tablet: { style: { fontSize: 130 } }, mobile: { size: { width: 'fill' }, style: { fontSize: 52, noWrap: false, textAlign: 'center' } } },
      effects: { scroll: { from: { x: from }, to: { x: to } }, mobile: false },
    });
  return F('Bewegende typografie', {
    tag: 'section',
    scheme: 'basis',
    layout: { mode: 'vertical', gap: 0, padding: [80, 0, 80, 0], align: 'center' },
    size: { width: 'fill' },
    style: { overflow: 'hidden' },
    responsive: { mobile: { layout: { padding: [48, 20, 48, 20], gap: 6 } } },
  }, [line(a, 260, -420, false), line(b, -420, 260, true)]);
}

/** Oproep onderaan een pagina; elke pagina krijgt een eigen tekst. */
function cta(o: { title: string; text: string; button: string; href: string; second?: [string, string]; scheme?: string; markColor?: string }): FrameNode {
  return F('Oproep', {
    tag: 'section',
    scheme: o.scheme ?? 'accent',
    layout: { mode: 'vertical', align: 'center', padding: [136, 40, 136, 40], gap: 28 },
    size: { width: 'fill' },
    style: { overflow: 'hidden' },
    responsive: { mobile: { layout: { padding: [88, 20, 88, 20] } } },
  }, [
    pattern('token:surface', 0.6, { position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: -200, z: -1 }, effects: { parallax: { speed: 0.3 } } }),
    mark(64, o.markColor ?? 'token:nacht', { effects: { loop: { kind: 'wiggle', duration: 2.4 }, mouse: { strength: 18 } } }),
    T('h1', o.title, { tag: 'h2', style: { textAlign: 'center' }, size: { width: 'fill', maxW: 900 }, effects: { text: { kind: 'letters' }, jelly: true } }),
    T('large', o.text, { style: { textAlign: 'center' }, size: { width: 'fill', maxW: 620 } }),
    row('Knoppen', 14, [
      B(o.button, o.href, 'primary', { icon: 'arrow-up-right', effects: magnetic }),
      ...(o.second ? [B(o.second[0], o.second[1], 'secondary')] : []),
    ], { size: { width: 'hug' }, layout: { mode: 'horizontal', gap: 14, align: 'center', justify: 'center', wrap: true } }),
  ]);
}

/** Groot, verticaal, omlijnd woord langs de rand van een sectie dat met het scrollen meeschuift. */
const sideWord = (word: string, side: 'left' | 'right' = 'right', speed = 0.25): TextNode =>
  T('display', word, {
    tag: 'span',
    name: `Zijwoord ${word}`,
    ariaLabel: undefined,
    size: { width: 'hug' },
    position: { mode: 'absolute', anchorX: side, anchorY: 'center', x: side === 'right' ? -10 : -10, y: 0, z: -1 },
    style: { fontSize: 230, lineHeight: 0.85, textOutline: 'token:line', noWrap: true, writingMode: 'vertical', textTransform: 'lowercase' },
    effects: { parallax: { speed } },
    responsive: { tablet: { style: { fontSize: 160 } }, mobile: { hidden: true } },
  });

/** Zet een verticaal zijwoord in een sectie (de sectie knipt het af aan de randen). */
function withSideWord(sec: FrameNode, word: string, side: 'left' | 'right' = 'right', speed = 0.25): FrameNode {
  sec.style = { ...(sec.style ?? {}), overflow: 'hidden' };
  sec.children = [sideWord(word, side, speed), ...sec.children];
  return sec;
}

/** Speelse kaart (zoals bij "Wat ik doe"): wordt roze bij hover, kantelt naar de muis, groot omlijnd nummer schuift omhoog. */
function funCard(o: { name: string; n: number; title?: string; text: string; icon?: string; href?: string; cta?: string; cursor?: string; speed?: number; big?: boolean }): FrameNode {
  const ink = { color: 'token:nacht' };
  const num = `0${o.n}`;
  return F(o.name, {
    ...(o.href ? { href: o.href } : {}),
    data: { group: '', ...(o.href ? { cursor: o.cursor ?? 'Bekijk' } : {}) },
    layout: { mode: 'vertical', gap: 16, padding: o.big ? [34, 30, 40, 30] : [30, 24, 30, 24] },
    size: { width: 'fill' },
    style: { fill: 'token:surface', radius: 22, overflow: 'hidden' },
    effects: { hover: { bg: 'token:roze', duration: 400 }, tilt: { max: 7 }, ...(o.href ? { press: { scale: 0.98 } } : {}), ...(o.speed ? { parallax: { speed: o.speed } } : {}) },
  }, [
    T('display', num, { tag: 'span', name: 'Groot nummer', position: { mode: 'absolute', anchorX: 'right', anchorY: 'bottom', x: -10, y: -34, z: -1 }, style: { textOutline: 'token:line', fontSize: 150 }, effects: { groupHover: { y: -24, rotate: -8, color: 'token:nacht' } } }),
    row('Boven', 12, [
      o.icon
        ? Icon(o.icon, { colors: ['token:roze'], size: { width: 'fixed', w: 34, height: 'fixed', h: 34 }, effects: { loop: { kind: 'float', duration: 3 + o.n * 0.4 }, groupHover: { scale: 1.45, rotate: -14, color: 'token:nacht' } } })
        : T('h1', num, { tag: 'p', size: { width: 'hug' }, style: { color: 'token:roze' }, effects: { groupHover: { ...ink, x: 6, rotate: -4 } } }),
      ...(o.icon ? [T('label', num, { size: { width: 'hug' }, style: { color: 'token:muted' }, effects: { groupHover: ink } })] : []),
    ], { layout: { mode: 'horizontal', justify: 'space-between', align: 'center' } }),
    ...(o.title ? [T(o.big ? 'h3' : 'h4', o.title, { tag: 'h3', effects: { groupHover: { ...ink, x: 4 } } })] : []),
    T('body', o.text, { effects: { groupHover: ink } }),
    ...(o.cta ? [T('label', o.cta, { style: { color: 'token:roze' }, effects: { groupHover: { ...ink, x: 10 } } })] : []),
  ]);
}

const DISCIPLINES: { id: string; title: string; icon: string; text: string }[] = [
  { id: 'animatie', title: 'Animatie', icon: 'film', text: 'Korte films, personages en loops. Elk frame met de hand gemaakt.' },
  { id: 'illustratie', title: 'Illustratie', icon: 'pen', text: 'Verhalen en posters, getekend met een dromerig, eigenwijs randje.' },
  { id: 'fotomanipulatie', title: 'Fotomanipulatie', icon: 'layers', text: 'Photoshop-werelden die net niet kunnen bestaan. Collages, campagnes, surrealisme.' },
  { id: 'branding', title: 'Branding', icon: 'sparkle', text: 'Identiteiten die als thuis voelen: logo, brandbook, merch en alles ertussen.' },
  { id: 'videomontage', title: 'Videomontage', icon: 'scissors', text: 'Tempo, kleur en sfeer op de juiste plek. Van ruw materiaal naar iets dat je voelt.' },
];

function disciplines(): FrameNode {
  const card = (d: (typeof DISCIPLINES)[number], i: number) =>
    funCard({ name: d.title, n: i + 1, title: d.title, text: d.text, icon: d.icon, href: `/work/?filter=${d.id}`, cta: 'bekijk projecten →', speed: i % 2 ? -0.025 : 0.025 });
  const sec = Section('Wat ik doe', { scheme: 'zacht', gap: 56 }, [
    split('Intro', heading('wat ik doe', 'Kleur, beweging en een vleugje magie'), T('large', COPY.whatWeDo, { size: { width: 'fill', maxW: 540 } }), 64),
    F('Disciplines', { layout: { mode: 'grid', columns: 5, gap: 16 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 2 } }, mobile: { layout: { columns: 1 } } }, effects: reveal(100) }, DISCIPLINES.map(card)),
  ]);
  return withSideWord(sec, 'doen', 'left');
}

const STEPS: [string, string][] = [
  ['Kennismaken', 'We bellen of drinken een koffie. Jij vertelt over je merk, je doel en je deadline; ik stel de lastige vragen.'],
  ['Concept', 'Ik werk een richting uit met schetsen, een moodboard of een storyboard. Pas als het klopt, gaan we door.'],
  ['Maken', 'Ontwerpen, animeren, monteren. Je kijkt mee via tussenversies, dus geen verrassingen achteraf.'],
  ['Opleveren', 'Alles netjes klaar voor gebruik, in elk formaat dat je nodig hebt. En daarna blijf ik gewoon bereikbaar.'],
];

function process(): FrameNode {
  const step = ([t, d]: [string, string], i: number) => funCard({ name: t, n: i + 1, title: t, text: d, big: true, speed: [0.025, -0.02, 0.035, -0.01][i] });
  const s = Section('Werkwijze', { scheme: 'basis', gap: 56 }, [
    split('Kop', heading('werkwijze', 'Van eerste idee tot laatste export'), T('large', 'Helder, persoonlijk en zonder gedoe. Zo werk ik, of het nu om een logo gaat of om een complete animatiefilm.', { size: { width: 'fill', maxW: 520 } }), 64),
    F('Stappen', { layout: { mode: 'grid', columns: 4, gap: 16 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 2, gap: 16 } }, mobile: { layout: { columns: 1 } } }, effects: reveal(130) }, STEPS.map(step)),
  ]);
  s.anchor = 'werkwijze';
  return withSideWord(s, 'proces', 'right');
}

function showreel(url: string): FrameNode {
  const e = videoEmbed(url);
  return F('Showreel', {
    tag: 'section',
    anchor: 'showreel',
    scheme: 'basis',
    layout: { mode: 'vertical', padding: [120, 40, 120, 40], align: 'center' },
    size: { width: 'fill' },
    responsive: { mobile: { layout: { padding: [72, 16, 72, 16] } } },
  }, [
    stack('Container', 40, [
      F('Kopregel', { layout: { mode: 'horizontal', justify: 'space-between', align: 'end', gap: 24 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
        heading('showreel 2025', 'Mijn werk in beweging'),
        B('Meer op YouTube', COPY.socials.youtube, 'secondary', { icon: 'arrow-up-right', newTab: true } as P<ButtonNode>),
      ]),
      { id: uid(), type: 'embed', name: 'Showreel', url: e?.embed ?? url, autoplay: true, loop: true, ariaLabel: 'Showreel van Vystara Studios', size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 22, overflow: 'hidden', fill: '#000000' }, effects: { scroll: { from: { scale: 0.88, opacity: 0.5 }, to: { scale: 1, opacity: 1 }, start: 0, end: 0.5 } } },
    ], { size: { width: 'fill', maxW: 1280 } }),
  ]);
}

/** Twee vallende sterren die af en toe door de hero schieten. */
function shootingStars(): SvgNode[] {
  const shooting = (name: string, y: number, delay: number, dur: number): SvgNode =>
    mark(26, 'token:mint', {
      name,
      position: { mode: 'absolute', z: -1, anchorX: 'left', anchorY: 'top', x: -80, y },
      effects: { loop: { kind: 'shoot', duration: dur, delay } },
      responsive: { mobile: { hidden: true } },
    });
  return [shooting('Vallende ster 1', 60, 1.5, 9), shooting('Vallende ster 2', 220, 6, 11)];
}

/** Grote, zachte gloed die langzaam zweeft en meebeweegt met muis en scroll. */
const glow = (name: string, c: string, pos: P<SvgNode>['position'], size: number, opacity: number, speed: number, mouse: number) =>
  Icon('gradient-orb', {
    name,
    colors: [c, 'token:bg'],
    position: { mode: 'absolute', z: -1, ...pos },
    size: { width: 'fixed', w: size, height: 'fixed', h: size },
    style: { opacity },
    effects: { parallax: { speed }, mouse: { strength: mouse }, loop: { kind: 'float', duration: 9 } },
    responsive: { mobile: { size: { width: 'fixed', w: Math.round(size * 0.7), height: 'fixed', h: Math.round(size * 0.7) } } },
  });

/** Draaiende tekstbadge. */
const spinBadge = (id: 'vx-badge' | 'vx-badge-available', w: number, props: P<SvgNode> = {}) =>
  Icon(id, { name: 'Draaiende badge', size: { width: 'fixed', w, height: 'fixed', h: w }, colors: ['token:mint', 'token:roze'], effects: { spin: { duration: 22 }, hover: { scale: 1.08 } }, ...props });

const statusPill = (text: string) =>
  F('Status', { layout: { mode: 'horizontal', gap: 10, align: 'center', padding: [8, 16, 8, 12] }, size: { width: 'hug' }, style: { fill: 'token:surface', radius: 999 } }, [
    F('Stip', { layout: { mode: 'none' }, size: { width: 'fixed', w: 8, height: 'fixed', h: 8 } }, [
      Icon('circle', { name: 'Ring', colors: ['#2ECC71'], position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: 0 }, effects: { loop: { kind: 'pulse' } } }),
      Icon('circle', { name: 'Stip', colors: ['#2ECC71'], position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: 0 } }),
    ]),
    T('small', text, { size: { width: 'hug' }, style: { color: 'token:heading' } }),
  ]);

// ── Pagina's ─────────────────────────────────────────────────

const page = (name: string, children: VNode[]): FrameNode =>
  F(name, { tag: 'main', layout: { mode: 'vertical' }, size: { width: 'fill', minH: 800 } }, children);
const header = () => ({ id: uid(), type: 'instance', name: 'Header', component: 'c_header', size: { width: 'fill' } }) as VNode;
const footer = () => ({ id: uid(), type: 'instance', name: 'Footer', component: 'c_footer', size: { width: 'fill' } }) as VNode;

const pageHero = (name: string, scheme: string, kids: VNode[]) =>
  F(name, {
    tag: 'section',
    scheme,
    layout: { mode: 'vertical', padding: [140, 48, 96, 48], align: 'center' },
    size: { width: 'fill' },
    style: { overflow: 'hidden' },
    responsive: { mobile: { layout: { padding: [96, 20, 64, 20] } } },
  }, [
    pattern('token:surface', 0.8, { position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: -260, z: -1 }, effects: { parallax: { speed: 0.35 } } }),
    stack('Container', 28, kids, { size: { width: 'fill', maxW: 1280 } }),
  ]);

const qa = (q: string, a: string) =>
  F('Vraag', { tag: 'details', layout: { mode: 'vertical', gap: 12, padding: [22, 0, 22, 0] }, size: { width: 'fill' } }, [
    F('Vraagregel', { tag: 'summary', layout: { mode: 'horizontal', align: 'center', gap: 16 }, size: { width: 'fill' } }, [T('h4', q, { tag: 'p', size: { width: 'fill' } })]),
    T('body', a),
  ]);

export function vystaraPages(a: BrandAssets = {}): { slug: string; title: string; kind: 'page' | 'project-template'; tree: FrameNode; seo?: Seo }[] {
  // ── Home ──
  const hero = F('Hero', {
    tag: 'section',
    scheme: 'basis',
    layout: { mode: 'vertical', align: 'center', justify: 'center', padding: [120, 24, 140, 24] },
    size: { width: 'fill', minH: 820 },
    style: { overflow: 'hidden' },
    responsive: { mobile: { layout: { padding: [88, 20, 110, 20] }, size: { minH: 640 } } },
  }, [
    pattern('token:surface', 1, { position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: -320, z: -1 }, effects: { parallax: { speed: 0.4 } } }),
    glow('Gloed roze', 'token:roze', { anchorX: 'right', anchorY: 'top', x: -380, y: -420 }, 1200, 0.5, 0.25, -40),
    glow('Gloed blauw', 'token:blauw', { anchorX: 'left', anchorY: 'bottom', x: -420, y: -460 }, 1250, 0.6, -0.15, 32),
    glow('Gloed pruim', 'token:pruim', { anchorX: 'center', anchorY: 'center', x: 0, y: 0 }, 900, 0.55, 0.1, 18),
    ...shootingStars(),
    spinBadge('vx-badge-available', 150, { position: { mode: 'absolute', anchorX: 'right', anchorY: 'bottom', x: 64, y: 64 }, effects: { spin: { duration: 22 }, parallax: { speed: -0.25 } }, responsive: { mobile: { hidden: true } } }),
    F('Inhoud', { layout: { mode: 'vertical', gap: 30, align: 'center' }, size: { width: 'fill', maxW: 1040 }, effects: { reveal: { from: { opacity: 0, y: 36 }, trigger: 'load', duration: 1000, stagger: 120, easing: 'smooth' }, parallax: { speed: 0.15 } } }, [
      statusPill('Beschikbaar voor nieuwe projecten'),
      Icon('vx-logo', { ariaLabel: 'Vystara Studios', size: { width: 'fill', maxW: 900, aspectRatio: '1200 / 299' }, effects: { scroll: { from: { scale: 1, opacity: 1 }, to: { scale: 1.35, opacity: 0 }, start: 0.45, end: 1 } } }),
      T('h1', COPY.tagline, { style: { textAlign: 'center', color: 'token:roze' }, effects: { text: { kind: 'letters' }, jelly: true } }),
      T('large', 'Animatie, illustratie, fotomanipulatie, branding en videomontage. Speels waar het kan, strak waar het moet.', { style: { textAlign: 'center' }, size: { width: 'fill', maxW: 620 } }),
      row('Knoppen', 14, [B('Bekijk de showreel', '#showreel', 'primary', { icon: 'play', effects: magnetic }), B('Bekijk het werk', '/work/', 'secondary', { icon: 'arrow-right', effects: magnetic })], { size: { width: 'hug' }, layout: { mode: 'horizontal', gap: 14, align: 'center', justify: 'center', wrap: true } }),
    ]),
    F('Scrollhint', { layout: { mode: 'vertical', gap: 8, align: 'center' }, size: { width: 'hug' }, position: { mode: 'absolute', anchorX: 'center', anchorY: 'bottom', x: 0, y: 32 }, responsive: { mobile: { hidden: true } } }, [
      T('label', 'scroll', { size: { width: 'hug' }, style: { color: 'token:muted' } }),
      Icon('arrow-down', { colors: ['token:muted'], size: { width: 'fixed', w: 20, height: 'fixed', h: 20 }, effects: { loop: { kind: 'float', duration: 1.2 } } }),
    ]),
  ]);

  const statement = withSideWord(Section('De studio', { scheme: 'basis', gap: 44, pad: [140, 48, 40, 48] }, [
    T('label', 'de studio'),
    T('h1', 'Een ontwerpstudio voor merken die [[niet op de rest willen lijken|durven op te vallen|iets te vertellen hebben|graag in beweging zijn]].', { tag: 'h2', size: { width: 'fill', maxW: 1150 } }),
    split('Uitleg', T('large', 'Ik maak beeld dat opvalt en klopt. Geen standaardwerk, wel een helder proces, korte lijnen en een eerlijk verhaal over wat werkt.', { size: { width: 'fill', maxW: 560 } }),
      row('Links', 14, [B('Over mij', '/about/', 'secondary', { icon: 'arrow-right' }), B('Mijn werkwijze', '/about/#werkwijze', 'link')], { size: { width: 'hug' } }), 48),
  ]), 'studio', 'right', 0.3);

  const featured = withSideWord(Section('Uitgelicht werk', { scheme: 'contrast', gap: 48 }, [
    F('Kopregel', { layout: { mode: 'horizontal', justify: 'space-between', align: 'end', gap: 24 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
      heading('uitgelicht', 'Werk waar ik trots op ben'),
      B('Al het werk', '/work/', 'secondary', { icon: 'arrow-right', effects: magnetic }),
    ]),
    Grid({ featuredOnly: true, limit: 6, layout: { mode: 'grid', columns: 2, gap: 32, rowGap: 56 }, responsive: { mobile: { layout: { columns: 1, gap: 20, rowGap: 36 } } }, effects: reveal(120) }),
  ]), 'werk', 'right', 0.35);

  const teaser = Section('Wie ik ben', { scheme: 'contrast', gap: 40, pad: [40, 48, 140, 48] }, [
    split('Over', F('Beeldvlak', { layout: { mode: 'vertical', align: 'center' }, size: { width: 'fill', maxW: 540 } }, [Img('Notitieboek', {
      asset: a.notebook,
      alt: 'Notitieboek van Vystara Studios met het sterrenpatroon en een roze elastiek',
      size: { width: 'fill' },
      style: { radius: 0, fill: 'transparent' },
      effects: { parallax: { speed: -0.18 }, scroll: { from: { rotate: -6 }, to: { rotate: 4 } }, hover: { scale: 1.03 } },
    })]), stack('Tekst', 24, [
      T('label', 'wie ik ben'),
      T('h2', 'Hoi, ik ben Joost.', { effects: { text: { kind: 'words' } } }),
      T('large', 'Ontwerper, animator en de enige koffiedrinker achter Vystara. Ik geloof dat een merk best plezier mag hebben, zolang het klopt.'),
      B('Leer me kennen', '/about/', 'primary', { icon: 'arrow-right', effects: magnetic }),
    ], { effects: reveal(100) })),
  ]);

  const stat = (n: string, l: string, speed: number) =>
    stack(l, 6, [T('display', n, { tag: 'p', style: { textAlign: 'center' }, effects: { text: { kind: 'count', duration: 1600 } } }), T('label', l, { style: { textAlign: 'center', color: 'token:heading' } })], { layout: { mode: 'vertical', gap: 6, align: 'center' }, size: { width: 'fill' }, effects: { parallax: { speed } } });
  const social = withSideWord(Section('Social', { scheme: 'blauw', align: 'center', gap: 48 }, [
    heading('op social', 'Ik weet hoe je opvalt in een tijdlijn', { center: true }),
    F('Cijfers', { layout: { mode: 'grid', columns: 3, gap: 32 }, size: { width: 'fill' }, responsive: { mobile: { layout: { columns: 1, gap: 28 } } } }, [
      stat('15K+', 'volgers', 0.08),
      stat('2,15M', 'views', -0.08),
      stat('100K+', 'likes', 0.14),
    ]),
    T('large', COPY.social, { size: { width: 'fill', maxW: 700 }, style: { textAlign: 'center' } }),
    socials('token:heading'),
  ]), 'volg', 'left', 0.2);

  const home = page('Home', [
    header(),
    hero,
    crossingBands(['Animatie', 'Illustratie', 'Fotomanipulatie', 'Branding', 'Videomontage', 'Motion design']),
    statement,
    showreel('https://youtu.be/0ycl_c_l91k'),
    kineticType('Ik maak dingen die bewegen', 'frame voor frame ✦ met de hand'),
    featured,
    teaser,
    disciplines(),
    social,
    cta({ title: 'Iets in gedachten?', text: 'Groot of klein, strak of lekker gek: vertel wat je wilt maken en ik denk mee.', button: 'Project starten', href: '/start/' }),
    footer(),
  ]);

  // ── Werk ──
  const list = Grid({ name: 'Projectenlijst', view: 'index', filters: true, viewToggle: true, layout: { mode: 'vertical', gap: 0 }, responsive: {}, effects: reveal(60) } as P<CollectionNode>);
  const grid = Grid({ name: 'Projectenraster', view: 'grid', layout: { mode: 'grid', columns: 3, gap: 28, rowGap: 44 }, effects: reveal(80) } as P<CollectionNode>);
  const workPage = page('Werk', [
    header(),
    pageHero('Werk-intro', 'basis', [
      T('label', 'portfolio'),
      T('display', 'Werk', { tag: 'h1', effects: { text: { kind: 'letters' }, jelly: true } }),
      T('large', 'Filter op wat je zoekt, wissel tussen lijst en raster, of scroll gewoon lekker door. Beweeg over een titel voor een voorproefje.', { size: { width: 'fill', maxW: 720 } }),
    ]),
    Section('Projecten', { scheme: 'basis', gap: 0, pad: [24, 48, 140, 48] }, [list, grid]),
    cta({ title: 'Zin in zoiets voor jouw merk?', text: 'Vertel me wat je wilt maken. Ik laat je weten hoe ik het zou aanpakken.', button: 'Project starten', href: '/start/', scheme: 'zacht', markColor: 'token:roze' }),
    footer(),
  ]);

  // ── Over ──
  const aboutHero = Section('Over-intro', { scheme: 'contrast', gap: 40, pad: [140, 48, 120, 48] }, [
    split('Intro', stack('Tekst', 22, [
      T('label', 'over'),
      T('display', 'Hoi! Ik ben Joost.', { tag: 'h1', effects: { text: { kind: 'letters' }, jelly: true } }),
      T('large', COPY.about[0]),
      ...COPY.about.slice(1).map((p) => T('body', p)),
    ], { effects: reveal(80) }), F('Beeldvlak', { layout: { mode: 'vertical', align: 'center' }, size: { width: 'fill', maxW: 460 } }, [Img('Koffiebeker', {
      asset: a.cup,
      alt: 'Koffiebeker van Vystara Studios met pruimkleurig deksel en het sterlogo',
      size: { width: 'fill' },
      style: { radius: 0, fill: 'transparent' },
      effects: { parallax: { speed: -0.2 }, scroll: { from: { rotate: 8 }, to: { rotate: -6 } }, hover: { rotate: 4 } },
    }), spinBadge('vx-badge', 130, { position: { mode: 'absolute', anchorX: 'right', anchorY: 'top', x: -10, y: 10 }, colors: ['token:nacht', 'token:roze'], effects: { spin: { duration: 20 }, parallax: { speed: 0.15 } } })])),
  ]);
  const why = withSideWord(Section('Waarom', { scheme: 'basis', gap: 48 }, [
    heading('waarom vystara', 'Waarom Vystara bestaat'),
    F('Redenen', { layout: { mode: 'grid', columns: 3, gap: 16 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 1 } } }, effects: reveal(120) },
      COPY.why.map((t, i) => funCard({ name: `Reden ${i + 1}`, n: i + 1, text: t, big: true, speed: [0.025, -0.025, 0.04][i] }))),
  ]), 'waarom', 'right');
  const name = F('De naam', {
    tag: 'section', scheme: 'zacht', layout: { mode: 'vertical', align: 'center', gap: 28, padding: [140, 48, 140, 48] }, size: { width: 'fill' }, style: { overflow: 'hidden' },
    responsive: { mobile: { layout: { padding: [88, 20, 88, 20] } } },
  }, [
    pattern('token:surface', 0.7, { position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: -240, z: -1 }, effects: { parallax: { speed: 0.35 } } }),
    mark(56, 'token:roze', { effects: { spin: { duration: 16 } } }),
    T('h1', '‘Vistara’ betekent grenzeloos.', { tag: 'h2', style: { textAlign: 'center' }, size: { width: 'fill', maxW: 900 }, effects: { text: { kind: 'words' } } }),
    T('large', 'Daar komt de naam vandaan. Een sterretje erbij, een y erin, en klaar was Vystara.', { style: { textAlign: 'center' }, size: { width: 'fill', maxW: 640 } }),
  ]);
  const aboutPage = page('Over', [
    header(),
    aboutHero,
    why,
    name,
    process(),
    cta({ title: 'Klinkt als een match?', text: 'Dan hoor ik graag wat je van plan bent. Of stuur gewoon een berichtje om kennis te maken.', button: 'Project starten', href: '/start/', second: ['Even hallo zeggen', '/contact/'] }),
    footer(),
  ]);

  // ── Contact (algemeen) ──
  const helloForm = contactForm();
  helloForm.submitLabel = 'Versturen';
  helloForm.successMessage = 'Ontvangen! Ik lees het en kom bij je terug.';
  helloForm.fields = [
    { id: 'naam', label: 'Naam', kind: 'text', required: true },
    { id: 'email', label: 'E-mail', kind: 'email', required: true },
    { id: 'bericht', label: 'Bericht', kind: 'textarea', required: true, placeholder: 'Een vraag, een idee of gewoon hallo.' },
  ];
  const bigSocial = (label: string, href: string) =>
    F(label, { href, newTab: true, layout: { mode: 'horizontal', justify: 'space-between', align: 'center', padding: [24, 0, 24, 0] }, size: { width: 'fill' }, effects: { hover: { x: 12 } } } as P<FrameNode>, [
      T('display', label, { tag: 'p', effects: { sweep: { color: 'token:roze', duration: 650 } } }),
      Icon('arrow-up-right', { colors: ['token:roze'], size: { width: 'fixed', w: 48, height: 'fixed', h: 48 }, effects: { groupHover: { rotate: 45, scale: 1.2 } } }),
    ]);
  const line = () => F('Lijn', { size: { width: 'fill', height: 'fixed', h: 1 }, style: { fill: 'token:line' } });
  const contactPage = page('Contact', [
    header(),
    pageHero('Contact', 'basis', [
      split('Inhoud', stack('Tekst', 24, [
        T('label', 'contact'),
        T('display', 'Zeg gerust hallo', { tag: 'h1', effects: { text: { kind: 'letters' }, jelly: true } }),
        T('large', 'Een vraag, een samenwerking of gewoon even sparren? Stuur een berichtje of mail me direct. Ik lees alles zelf.'),
        B(COPY.email, `mailto:${COPY.email}`, 'link', { icon: 'mail' }),
        F('Doorverwijzing', { layout: { mode: 'vertical', gap: 10, padding: [22, 24, 22, 24] }, size: { width: 'fill', maxW: 480 }, style: { fill: 'token:surface', radius: 18 } }, [
          T('h4', 'Al een concreet project?'),
          T('body', 'Gebruik dan de projectplanner. Daarmee kan ik je sneller een goed voorstel doen.'),
          B('Naar de projectplanner', '/start/', 'link', { icon: 'arrow-right' }),
        ]),
      ], { effects: reveal(90) }), F('Formulier', { layout: { mode: 'vertical', gap: 20, padding: [40, 36, 40, 36] }, size: { width: 'fill', maxW: 520 }, style: { fill: 'token:surface', radius: 24 }, responsive: { mobile: { layout: { padding: [28, 20, 28, 20] } } } }, [
        T('h3', 'Kort berichtje'),
        helloForm,
      ])),
    ]),
    Section('Volgen', { scheme: 'contrast', gap: 8, pad: [96, 48, 96, 48] }, [
      T('label', 'volg mee'),
      bigSocial('TikTok', COPY.socials.tiktok),
      line(),
      bigSocial('YouTube', COPY.socials.youtube),
      line(),
      bigSocial('Instagram', COPY.socials.instagram),
    ]),
    footer(),
  ]);

  // ── Project starten (projectplanner) ──
  const planner = contactForm();
  planner.name = 'Projectplanner';
  planner.submitLabel = 'Aanvraag versturen';
  planner.successMessage = 'Top, je aanvraag is binnen! Ik neem contact met je op om kennis te maken.';
  planner.fields = [
    { id: 'naam', label: 'Naam', kind: 'text', required: true },
    { id: 'email', label: 'E-mail', kind: 'email', required: true },
    { id: 'bedrijf', label: 'Bedrijf of merk', kind: 'text', placeholder: 'Optioneel' },
    { id: 'soort', label: 'Wat wil je laten maken?', kind: 'select', required: true, placeholder: 'Kies…', options: ['Animatie', 'Illustratie', 'Fotomanipulatie', 'Branding', 'Videomontage', 'Combinatie / weet ik nog niet'] },
    { id: 'budget', label: 'Budget (indicatie)', kind: 'select', placeholder: 'Kies…', options: ['Tot € 500', '€ 500 – € 1.500', '€ 1.500 – € 5.000', 'Meer dan € 5.000', 'Weet ik nog niet'] },
    { id: 'planning', label: 'Wanneer moet het af zijn?', kind: 'select', placeholder: 'Kies…', options: ['Zo snel mogelijk', 'Binnen een maand', 'Over 1 tot 3 maanden', 'Geen haast'] },
    { id: 'omschrijving', label: 'Vertel over je project', kind: 'textarea', required: true, placeholder: 'Wat is het doel, voor wie is het en wat moet het oproepen?' },
    { id: 'links', label: 'Inspiratie of links', kind: 'text', placeholder: 'Optioneel: voorbeelden die je mooi vindt' },
  ];
  const stepRow = (n: string, t: string, d: string) =>
    F(t, { layout: { mode: 'horizontal', gap: 18, align: 'start' }, size: { width: 'fill' } }, [
      F('Nummer', { layout: { mode: 'vertical', align: 'center', justify: 'center' }, size: { width: 'fixed', w: 44, height: 'fixed', h: 44 }, style: { fill: 'token:roze', radius: 999 } }, [T('h4', n, { tag: 'p', style: { color: 'token:nacht', textAlign: 'center' } })]),
      stack('Tekst', 4, [T('h4', t), T('small', d)]),
    ]);
  const startPage = page('Project starten', [
    header(),
    pageHero('Start', 'basis', [
      T('label', 'project starten'),
      T('display', 'Laten we iets bouwen', { tag: 'h1', effects: { text: { kind: 'letters' }, jelly: true } }),
      T('large', 'Vul de projectplanner in. Hoe meer je vertelt, hoe beter mijn voorstel. Geen verplichtingen, gewoon een eerste stap.', { size: { width: 'fill', maxW: 680 } }),
      F('Planner', { layout: { mode: 'horizontal', gap: 48, align: 'start' }, size: { width: 'fill' }, responsive: { tablet: { layout: { mode: 'vertical', gap: 40 } } } }, [
        F('Formulier', { layout: { mode: 'vertical', gap: 20, padding: [40, 36, 40, 36] }, size: { width: 'fill' }, style: { fill: 'token:surface', radius: 24 }, responsive: { mobile: { layout: { padding: [28, 20, 28, 20] } } } }, [
          T('h3', 'Projectplanner'),
          planner,
        ]),
        stack('Uitleg', 40, [
          stack('Zo gaat het verder', 18, [
            T('label', 'zo gaat het verder'),
            stepRow('1', 'Ik lees je aanvraag', 'Persoonlijk, niet door een bot. Mis ik iets, dan vraag ik het.'),
            stepRow('2', 'We maken kennis', 'Een kort gesprek over je doel, je publiek en de planning.'),
            stepRow('3', 'Je krijgt een voorstel', 'Met een duidelijke aanpak en prijs vooraf. Pas als jij ja zegt, ga ik aan de slag.'),
          ]),
          stack('Vragen', 0, [
            T('label', 'veelgestelde vragen'),
            qa('Wat kost een project?', 'Dat hangt af van wat je nodig hebt. Na het kennismakingsgesprek weet je precies waar je aan toe bent.'),
            qa('Hoe lang duurt het?', 'Een logo of socialcampagne kan binnen een paar weken. Een animatiefilm vraagt meer tijd. We spreken samen een planning af.'),
            qa('Werk je ook voor kleine merken?', 'Zeker. Van startende ondernemer tot gevestigd merk: als het project leuk is, doe ik mee.'),
            qa('Wat heb je van mij nodig?', 'Een idee van je doel, je doelgroep en je planning. Voorbeelden die je mooi vindt helpen altijd.'),
          ]),
        ], { size: { width: 'fill', maxW: 440 } }),
      ]),
    ]),
    footer(),
  ]);

  // ── Projectsjabloon ──
  const nextBlock = F('Volgend project', {
    tag: 'section',
    scheme: 'zacht',
    href: '{{project.next.url}}',
    layout: { mode: 'horizontal', gap: 56, padding: [96, 48, 96, 48], align: 'center' },
    size: { width: 'fill' },
    style: { overflow: 'hidden' },
    responsive: { tablet: { layout: { mode: 'vertical', gap: 32, align: 'start' } }, mobile: { layout: { padding: [64, 20, 64, 20] } } },
  }, [
    pattern('token:surface', 0.6, { position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: -200, z: -1 }, effects: { parallax: { speed: 0.3 } } }),
    stack('Tekst', 12, [
      T('label', 'volgend project →'),
      T('display', '{{project.next.title}}', { tag: 'p', effects: { sweep: { color: 'token:roze', duration: 700 } } }),
      T('small', '{{project.next.category}}'),
    ]),
    F('Beeld', { layout: { mode: 'vertical' }, size: { width: 'fill', maxW: 520 }, style: { radius: 22, overflow: 'hidden', fill: 'token:surface' } }, [
      { id: uid(), type: 'image', name: 'Volgende cover', asset: '{{project.next.cover}}', src: '{{project.next.thumb}}', alt: '{{project.next.title}}', size: { width: 'fill', aspectRatio: '16 / 10' }, style: { objectFit: 'cover' }, effects: { hover: { scale: 1.06, duration: 700 } } },
    ]),
  ]);
  const projectTemplate = page('Projectpagina', [
    header(),
    Section('Project', { scheme: 'basis', pad: [112, 48, 72, 48], gap: 28 }, [
      F('Navigatie boven', { layout: { mode: 'horizontal', justify: 'space-between', align: 'center', gap: 16 }, size: { width: 'fill' } }, [
        B('Al het werk', '/work/', 'link'),
        row('Bladeren', 14, [T('label', '{{project.number}} / {{project.total}}', { size: { width: 'hug' }, style: { color: 'token:muted' } }), B('Volgende', '{{project.next.url}}', 'secondary', { icon: 'arrow-right' })], { size: { width: 'hug' } }),
      ]),
      T('display', '{{project.title}}', { tag: 'h1', effects: { text: { kind: 'letters' }, jelly: true } }),
      split('Info', T('large', '{{project.summary}}', { size: { width: 'fill', maxW: 760 } }), stack('Details', 6, [T('label', 'project'), T('body', '{{project.client}}', { style: { color: 'token:heading' } }), T('small', '{{project.category}}')], { size: { width: 'fill', maxW: 260 } }), 48),
      { id: uid(), type: 'image', name: 'Cover (zonder video)', when: '!project.video', asset: '{{project.cover}}', src: '{{project.thumb}}', alt: '{{project.title}}', size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 22, fill: 'token:surface', objectFit: 'cover' }, effects: { reveal: { from: { opacity: 0, scale: 0.96 }, trigger: 'load', duration: 900 } } },
    ]),
    Section('Inhoud', { scheme: 'basis', pad: [0, 48, 112, 48], gap: 48 }, [
      F('Projectinhoud', { slot: true, layout: { mode: 'vertical', gap: 28 }, size: { width: 'fill' } }, []),
      F('Navigatie onder', { layout: { mode: 'horizontal', justify: 'space-between', align: 'center', gap: 16, wrap: true }, size: { width: 'fill' } }, [
        B('← {{project.prev.title}}', '{{project.prev.url}}', 'secondary'),
        B('Zoiets laten maken?', '/start/', 'primary', { icon: 'arrow-up-right', effects: magnetic }),
      ]),
    ]),
    nextBlock,
    footer(),
  ]);

  const notFound = page('Niet gevonden', [
    header(),
    F('404', { tag: 'section', scheme: 'basis', layout: { mode: 'vertical', align: 'center', justify: 'center', gap: 24, padding: [160, 24, 160, 24] }, size: { width: 'fill', minH: 680 }, style: { overflow: 'hidden' } }, [
      pattern('token:surface', 1),
      mark(90, 'token:roze', { effects: { spin: { duration: 8 }, mouse: { strength: 30 } } }),
      T('display', '404', { tag: 'h1', style: { textAlign: 'center', textOutline: 'token:roze', fontSize: 220 }, effects: { text: { kind: 'letters' }, jelly: true } }),
      T('large', 'Verdwaald in de ruimte? Deze pagina bestaat niet (meer).', { style: { textAlign: 'center' } }),
      B('Terug naar home', '/', 'primary'),
    ]),
    footer(),
  ]);

  return [
    { slug: '', title: 'Home', kind: 'page', tree: home, seo: { schemaType: 'WebPage', title: 'Vystara Studios — design zonder grenzen', description: 'Vystara Studios is een ontwerpstudio voor animatie, illustratie, fotomanipulatie, branding en videomontage. Speels waar het kan, strak waar het moet.', focusKeyword: 'ontwerpstudio' } },
    { slug: 'work', title: 'Werk', kind: 'page', tree: workPage, seo: { schemaType: 'CollectionPage', description: 'Bekijk animaties, illustraties, fotomanipulatie, branding en videomontage van Vystara Studios. Filter op discipline of blader door de lijst.', focusKeyword: 'portfolio' } },
    { slug: 'about', title: 'Over', kind: 'page', tree: aboutPage, seo: { schemaType: 'AboutPage', description: 'Maak kennis met Joost, eigenaar van Vystara Studios: waarom de studio bestaat, waar de naam vandaan komt en hoe ik werk.', focusKeyword: 'Vystara Studios' } },
    { slug: 'contact', title: 'Contact', kind: 'page', tree: contactPage, seo: { schemaType: 'ContactPage', description: 'Vraag, idee of gewoon hallo? Neem contact op met Vystara Studios of volg mee op TikTok, YouTube en Instagram.', focusKeyword: 'contact' } },
    { slug: 'start', title: 'Project starten', kind: 'page', tree: startPage, seo: { schemaType: 'ContactPage', description: 'Start je project met Vystara Studios. Vul de projectplanner in en ontvang een voorstel op maat voor animatie, illustratie, branding of video.', focusKeyword: 'project starten' } },
    { slug: '404', title: 'Niet gevonden', kind: 'page', tree: notFound, seo: { noindex: true } },
    { slug: '__project', title: 'Projectsjabloon', kind: 'project-template', tree: projectTemplate },
  ];
}

// ── Projecten ────────────────────────────────────────────────

const gallery = (title: string, ids: string[], cols = 2) => {
  const img = (id: string, i: number) => Img(`Beeld ${i + 1}`, { asset: id, alt: `${title} — beeld ${i + 1}`, size: { width: 'fill' }, style: { radius: 16, fill: 'token:surface' }, effects: { lightbox: true, hover: { scale: 1.015 } } });
  return F('Galerij', {
    // Metselwerk: beelden van verschillende hoogtes sluiten altijd naadloos op elkaar aan.
    layout: { mode: 'grid', masonry: true, columns: ids.length === 1 ? 1 : Math.min(cols, ids.length), gap: 20, rowGap: 20 },
    size: { width: 'fill' },
    responsive: { tablet: { layout: { columns: Math.min(2, ids.length) } }, mobile: { layout: { columns: 1, gap: 14, rowGap: 14 } } },
    effects: reveal(70),
  }, ids.map(img));
};

/** Inhoud van een projectpagina: video bovenaan, dan beelden (of hoofdstukken, zoals bij LOUERS). */
/** Een sectie met eigen beelden en video's (bv. alerts, emotes, panelen). */
function localSection(title: string, sec: LocalSection, images: Record<string, string>): FrameNode | null {
  const items = sec.items.filter((it) => images[it.file]);
  if (!items.length) return null;
  const isVideo = (f: string) => /\.(mp4|webm|mov)$/i.test(f);
  const media = (it: (typeof items)[number]): VNode =>
    isVideo(it.file)
      ? { id: uid(), type: 'video', name: it.alt, asset: images[it.file], ariaLabel: it.alt, autoplay: true, muted: true, loop: true, soundToggle: !sec.tiles || sec.cols <= 2, size: { width: 'fill', aspectRatio: it.ratio ?? '16 / 9' }, style: { radius: sec.tiles ? 0 : 16, overflow: 'hidden', fill: sec.tiles ? 'transparent' : '#000000' } }
      : Img(it.alt, { asset: images[it.file], alt: it.alt, size: { width: 'fill' }, style: { radius: sec.tiles ? 0 : 16, fill: 'transparent' }, effects: { lightbox: true, ...(sec.tiles ? {} : { hover: { scale: 1.015 } }) } });
  const tile = (it: (typeof items)[number]): VNode =>
    sec.tiles
      ? F(it.alt, {
          data: { group: '' },
          layout: { mode: 'vertical', align: 'center', justify: 'center', padding: sec.cols >= 5 ? [18, 18, 18, 18] : [20, 20, 20, 20] },
          size: { width: 'fill' },
          style: { fill: 'token:surface', radius: 20, overflow: 'hidden' },
          effects: { hover: { bg: 'token:pruim', duration: 400 }, ...(sec.cols >= 5 ? { tilt: { max: 10 } } : {}) },
        }, [media(it)])
      : media(it);
  const cols = Math.min(sec.cols, items.length);
  const grid = F(sec.title, {
    layout: sec.masonry ? { mode: 'grid', masonry: true, columns: cols, gap: 20, rowGap: 20 } : { mode: 'grid', columns: cols, gap: 16, rowGap: 16 },
    size: { width: 'fill', ...(cols === 1 && sec.tiles ? { maxW: 220 } : {}) },
    responsive: {
      tablet: { layout: { columns: Math.min(cols, sec.cols >= 5 ? 3 : 2) } },
      mobile: { layout: { columns: sec.cols >= 5 ? 2 : 1, gap: 12, rowGap: 12 } },
    },
    effects: reveal(70),
  }, items.map(tile));
  return F(sec.label, { layout: { mode: 'vertical', gap: 22, padding: [40, 0, 8, 0], align: cols === 1 ? 'center' : 'start' }, size: { width: 'fill' } }, [
    split('Kop', stack('Titel', 8, [T('label', sec.label), T('h2', sec.title, { effects: { text: { kind: 'words' } } })]), T('body', sec.text, { size: { width: 'fill', maxW: 520 } }), 40),
    grid,
  ]);
}

export function legacyProjectTree(p: LegacyProject, images: Record<string, string>): FrameNode {
  const kids: VNode[] = [];
  const e = p.video ? videoEmbed(p.video) : null;
  if (e) kids.push({ id: uid(), type: 'embed', name: 'Video', url: e.embed, autoplay: true, loop: true, size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 22, overflow: 'hidden', fill: '#000000' } });
  const ids = p.images.map((u) => images[u]).filter(Boolean);
  if (ids.length) {
    if (e) kids.push(T('label', p.category === 'Animatie' ? 'storyboard en concept' : 'achter de schermen', { style: { color: 'token:muted' } }));
    if (!e) kids.push(Img('Hoofdbeeld', { asset: ids[0], alt: `${p.title} — hoofdbeeld`, size: { width: 'fill' }, style: { radius: 16, fill: 'token:surface' }, effects: { lightbox: true } }));
    const rest = e ? ids : ids.slice(1);
    if (rest.length) kids.push(gallery(p.title, rest, e ? 3 : 2));
  }
  if (p.story?.length)
    kids.push(F('Verhaal', { layout: { mode: 'grid', columns: p.story.length, gap: 20 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 1 } } }, effects: reveal(120) },
      p.story.map((st, i) => F(st.title, { layout: { mode: 'vertical', gap: 14, padding: [30, 28, 30, 28] }, size: { width: 'fill' }, style: { fill: 'token:surface', radius: 22 }, effects: { tilt: { max: 5 } } }, [
        T('label', `0${i + 1}`),
        T('h3', st.title),
        T('body', st.text),
      ]))));
  for (const sec of p.sections ?? []) {
    const block = localSection(p.title, sec, images);
    if (block) kids.push(block);
  }
  for (const v of p.extraVideos ?? []) {
    const ev = videoEmbed(v.url);
    if (!ev) continue;
    kids.push(F(v.title, { layout: { mode: 'horizontal', gap: 40, align: 'center', padding: [24, 0, 0, 0] }, size: { width: 'fill' }, responsive: { tablet: { layout: { mode: 'vertical', align: 'start', gap: 20 } } } }, [
      stack('Tekst', 10, [T('label', 'extra'), T('h2', v.title), T('body', v.text)], { size: { width: 'fill', maxW: 380 } }),
      { id: uid(), type: 'embed', name: v.title, url: ev.embed, size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 18, overflow: 'hidden', fill: '#000000' } },
    ]));
  }
  for (const [i, ch] of (p.chapters ?? []).entries()) {
    const chIds = ch.images.map((u) => images[u]).filter(Boolean);
    kids.push(F(`Hoofdstuk ${i + 1}`, { layout: { mode: 'vertical', gap: 20, padding: [32, 0, 8, 0] }, size: { width: 'fill' } }, [
      split('Kop', stack('Titel', 8, [T('label', `thema 0${i + 1}`), T('h2', ch.title, { effects: { text: { kind: 'words' } } })]), T('body', ch.text, { size: { width: 'fill', maxW: 560 } }), 40),
      ...(chIds.length ? [gallery(`${p.title} — ${ch.title}`, chIds, 3)] : []),
    ]));
  }
  return F('Projectinhoud', { layout: { mode: 'vertical', gap: 20 }, size: { width: 'fill' } }, kids);
}

export function legacyProjects(images: Record<string, string> = {}): Omit<Project, 'id'>[] {
  return LEGACY_PROJECTS.map((p, i) => {
    const first = p.images[0] ?? p.chapters?.[0]?.images[0] ?? '';
    return {
      slug: p.slug,
      title: p.title,
      client: p.client,
      year: '',
      category: p.category,
      summary: p.summary,
      video: p.video,
      // Eerst de eigen cover (bij video's: de YouTube-thumbnail), anders het eerste beeld.
      cover: images[p.cover ?? ''] || images[first] || undefined,
      tree: legacyProjectTree(p, images),
      featured: !!p.featured,
      published: true,
      sort: i + 1,
    };
  });
}

/** Alle beeld-URL's van de oude site (covers, beelden en hoofdstukken). */
export function legacyImageUrls(): string[] {
  return [...new Set(LEGACY_PROJECTS.flatMap((p) => [...(p.cover ? [p.cover] : []), ...p.images, ...(p.chapters ?? []).flatMap((c) => c.images)]))].filter((u) => !u.startsWith('local:'));
}

/** Oude adressen → nieuwe adressen (301). */
export function legacyRedirects(): Redirect[] {
  const r: Redirect[] = [
    { from: '/animation', to: '/work/?filter=animatie' },
    { from: '/illustration', to: '/work/?filter=illustratie' },
    { from: '/branding', to: '/work/?filter=branding' },
    { from: '/video-editing', to: '/work/?filter=videomontage' },
    { from: '/louers-vodka', to: '/work/louers-vodka/' },
    { from: '/portfolio', to: '/work/' },
    { from: '/connect', to: '/contact/' },
  ];
  const map: Record<string, string> = {
    '/animation/waardeer-het-repareer-het': 'waardeer-het-repareer-het',
    '/animation/revenge-on-the-villagers': 'revenge-on-the-villagers',
    '/animation/project-one-ephnc-jseea': 'hackie',
    '/animation/project-two-llrgk-732l8': 'koala-crew',
    '/illustration/koala-crew': 'koala-crew',
    '/illustration/time-machine': 'time-machine',
    '/illustration/boblo-island': 'boblo-island',
    '/illustration/masked-world': 'masked-world',
    '/illustration/halloween': 'halloween',
    '/branding/festival-zomerbries': 'festival-zomerbries',
    '/branding/moonwave': 'moonwave',
    '/louers-vodka/the-capitol': 'louers-vodka',
    '/louers-vodka/art-gallery': 'louers-vodka',
    '/louers-vodka/aviation': 'louers-vodka',
    '/louers-vodka/cotedazur': 'louers-vodka',
    '/louers-vodka/life-on-water': 'louers-vodka',
    '/louers-vodka/space-program': 'louers-vodka',
    '/work/showreel-2025': 'showreel',
    '/work/showreel-v1': 'showreel',
    // Vorige versie van de startsite (losse LOUERS-projecten).
    '/work/louers-the-capitol': 'louers-vodka',
    '/work/louers-art-gallery': 'louers-vodka',
    '/work/louers-aviation': 'louers-vodka',
    '/work/louers-cote-d-azur': 'louers-vodka',
    '/work/louers-life-on-water': 'louers-vodka',
    '/work/louers-space-program': 'louers-vodka',
  };
  for (const [from, slug] of Object.entries(map)) r.push({ from, to: `/work/${slug}/` });
  return r;
}

/** Site-instellingen van de startsite (behoudt domein, toegang, enz.). */
export function vystaraSite(prev: SiteSettings, a: BrandAssets = {}, theme = VYSTARA_THEME): SiteSettings {
  const ours = new Set(legacyRedirects().map((r) => r.from));
  const own = (prev.redirects ?? []).filter((r) => !ours.has(r.from) && !/^\/work\/#/.test(r.to));
  return {
    ...prev,
    name: 'Vystara Studios',
    description: 'Vystara Studios — design zonder grenzen. Animatie, illustratie, fotomanipulatie, branding en videomontage.',
    theme: structuredClone(theme),
    cursor: prev.cursor ?? 'star',
    // Formulieren via de Vercel-functie (of je eigen Studio-adres als dat online staat), nooit via localhost.
    formEndpoint: prev.formEndpoint && !/localhost|127\.0\.0\.1/.test(prev.formEndpoint) ? prev.formEndpoint : undefined,
    favicon: a.favicon ?? prev.favicon,
    socialImage: a.social ?? prev.socialImage,
    seo: {
      ...prev.seo,
      lang: 'nl',
      titleTemplate: '%s — Vystara Studios',
      entity: {
        type: 'Organization',
        name: 'Vystara Studios',
        email: COPY.email,
        logo: a.logoPng,
        sameAs: Object.values(COPY.socials),
        ...(prev.seo?.entity?.jobTitle ? { jobTitle: prev.seo.entity.jobTitle } : {}),
      },
    },
    redirects: [...own, ...legacyRedirects()],
  };
}
