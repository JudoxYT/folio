// ─────────────────────────────────────────────────────────────
// Sectie-bibliotheek (zoals Squarespace "sections", Wix "section library",
// Framer "insert → sections"). Alles gebruikt het thema: tekststijlen,
// knopstijlen en kleurschema's. Daardoor past elke sectie bij elk thema.
// ─────────────────────────────────────────────────────────────

import type { ButtonNode, CollectionNode, FrameNode, ImageNode, TextNode, VideoNode, VNode, EmbedNode, SvgNode } from './types.js';
import type { ButtonKey, TextStyleKey } from './theme.js';
import { uid } from './tree.js';
import { SVG_LIBRARY } from './svg.js';
import { contactForm } from './defaults.js';

type P<T> = Omit<Partial<T>, 'type'>;

// ── Bouwstenen ───────────────────────────────────────────────
export const F = (name: string, props: P<FrameNode>, children: VNode[] = []): FrameNode => ({
  id: uid(),
  type: 'frame',
  name,
  ...props,
  children,
});
export const T = (style: TextStyleKey, content: string, props: P<TextNode> = {}): TextNode => ({
  id: uid(),
  type: 'text',
  name: { display: 'Display', h1: 'Titel', h2: 'Kop', h3: 'Subkop', h4: 'Kleine kop', large: 'Intro', body: 'Tekst', small: 'Klein', label: 'Label' }[style],
  // Display is een stijl, geen kopniveau: standaard h2. Alleen de hero krijgt bewust een h1.
  tag: style === 'display' ? 'h2' : style.startsWith('h') ? (style as 'h1') : 'p',
  textStyle: style,
  content,
  ...props,
});
export const B = (label: string, href: string, variant: ButtonKey = 'primary', props: P<ButtonNode> = {}): ButtonNode => ({
  id: uid(),
  type: 'button',
  name: 'Knop',
  label,
  href,
  variant,
  ...props,
});
export const Img = (name: string, props: P<ImageNode> = {}): ImageNode => ({
  id: uid(),
  type: 'image',
  name,
  size: { width: 'fill', aspectRatio: '4 / 3' },
  style: { radius: 8, fill: 'token:surface' },
  ...props,
});
export const Icon = (id: string, props: P<SvgNode> = {}): SvgNode => {
  const it = SVG_LIBRARY.find((x) => x.id === id) ?? SVG_LIBRARY[0];
  return { id: uid(), type: 'svg', name: it.name, svg: it.svg, colors: [...it.colors], stretch: it.stretch, ...props };
};
export const Grid = (props: P<CollectionNode> = {}): CollectionNode => ({
  id: uid(),
  type: 'collection',
  name: 'Projecten-grid',
  source: 'projects',
  layout: { mode: 'grid', columns: 3, gap: 32, rowGap: 48 },
  size: { width: 'fill' },
  responsive: { tablet: { layout: { columns: 2 } }, mobile: { layout: { columns: 1, gap: 20, rowGap: 32 } } },
  ...props,
});

const PAD: [number, number, number, number] = [120, 48, 120, 48];
const PAD_M: [number, number, number, number] = [72, 20, 72, 20];

/** Een sectie: volle breedte, binnen een gecentreerde container van max 1280 px. */
export function Section(name: string, opts: { scheme?: string; pad?: [number, number, number, number]; gap?: number; align?: 'start' | 'center'; maxW?: number } = {}, children: VNode[]): FrameNode {
  return F(
    name,
    {
      tag: 'section',
      scheme: opts.scheme,
      layout: { mode: 'vertical', padding: opts.pad ?? PAD, align: 'center' },
      size: { width: 'fill' },
      responsive: { mobile: { layout: { padding: PAD_M } } },
    },
    [
      F(
        'Container',
        {
          layout: { mode: 'vertical', gap: opts.gap ?? 40, align: opts.align ?? 'start' },
          size: { width: 'fill', maxW: opts.maxW ?? 1280 },
          responsive: { mobile: { layout: { gap: Math.round((opts.gap ?? 40) * 0.7) } } },
        },
        children,
      ),
    ],
  );
}

const row = (name: string, gap: number, children: VNode[], props: P<FrameNode> = {}) =>
  F(name, { layout: { mode: 'horizontal', gap, align: 'center', wrap: true }, size: { width: 'fill' }, ...props }, children);

const stack = (name: string, gap: number, children: VNode[], props: P<FrameNode> = {}) =>
  F(name, { layout: { mode: 'vertical', gap }, size: { width: 'fill' }, ...props }, children);

const split = (name: string, left: VNode, right: VNode, gap = 64): FrameNode =>
  F(
    name,
    {
      layout: { mode: 'horizontal', gap, align: 'center' },
      size: { width: 'fill' },
      responsive: { tablet: { layout: { mode: 'vertical', gap: 40, align: 'start' } } },
    },
    [left, right],
  );

const reveal = { reveal: { from: { opacity: 0, y: 32 }, duration: 800, stagger: 90 } };

/** Leeg: plak in het rechterpaneel de link van je eigen video (YouTube of Vimeo). */
export const SHOWREEL_EMBED = '';

// ── De bibliotheek ───────────────────────────────────────────
export interface SectionTemplate {
  id: string;
  name: string;
  category: 'Hero' | 'Werk' | 'Inhoud' | 'Media' | 'Contact' | 'Scheiding';
  description: string;
  build: () => FrameNode;
}

export const SECTION_LIBRARY: SectionTemplate[] = [
  {
    id: 'hero-video',
    name: 'Hero met video op de achtergrond',
    category: 'Hero',
    description: 'Video over de volle breedte, tekst linksonder, zoomt in bij wegscrollen.',
    build: () => {
      const video: VideoNode = {
        id: uid(), type: 'video', name: 'Showreel', autoplay: true, muted: true, loop: true, soundToggle: true,
        position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: 0 },
        style: { objectFit: 'cover' },
        effects: { scroll: { from: { scale: 1, y: 0 }, to: { scale: 1.15, y: 120 }, start: 0.5, end: 1 } },
      };
      return F('Hero', {
        tag: 'section',
        layout: { mode: 'none' },
        size: { width: 'fill', height: 'fixed', h: 820 },
        style: { overflow: 'hidden', fill: '#000000' },
        responsive: { tablet: { size: { h: 640 } }, mobile: { size: { h: 560 } } },
      }, [
        video,
        F('Verloop', { layout: { mode: 'none' }, position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'stretch', x: 0, y: 0 }, style: { gradient: 'linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,0) 55%)' } }),
        F('Hero-tekst', {
          layout: { mode: 'vertical', gap: 20 },
          size: { width: 'fill', maxW: 980 },
          position: { mode: 'absolute', anchorX: 'stretch', anchorY: 'bottom', x: 48, y: 64, z: 1 },
          responsive: { mobile: { position: { x: 20, y: 36 } } },
          style: { color: '#ffffff' },
          effects: { reveal: { from: { opacity: 0, y: 32 }, trigger: 'load', duration: 1000, delay: 200, stagger: 140 }, parallax: { speed: -0.15 } },
        }, [
          T('label', 'Welkom', { style: { color: 'rgba(255,255,255,.75)' } }),
          T('display', '{{site.name}}', { tag: 'h1', style: { color: '#ffffff' } }),
          T('large', 'Eén zin die laat zien waar je voor staat.', { style: { color: 'rgba(255,255,255,.85)' } }),
        ]),
      ]);
    },
  },
  {
    id: 'hero-text',
    name: 'Hero met grote tekst',
    category: 'Hero',
    description: 'Groot statement, intro en twee knoppen. Werkt zonder beeld.',
    build: () =>
      Section('Hero', { pad: [160, 48, 120, 48], gap: 28 }, [
        T('label', 'Wat ik doe, in een paar woorden'),
        T('display', 'Een grote, krachtige\nopening.', { tag: 'h1' }),
        T('large', 'Vertel in één of twee zinnen wat je maakt en voor wie.', { size: { width: 'fill', maxW: 640 } }),
        row('Knoppen', 12, [B('Bekijk werk', '/work/', 'primary', { icon: 'arrow-right' }), B('Neem contact op', '/contact/', 'secondary')]),
      ]),
  },
  {
    id: 'hero-split',
    name: 'Hero tekst + beeld',
    category: 'Hero',
    description: 'Tekst links, beeld of video rechts. Op mobiel onder elkaar.',
    build: () =>
      Section('Hero', { pad: [120, 48, 120, 48] }, [
        split(
          'Hero',
          stack('Tekst', 24, [T('label', 'Hallo, ik ben'), T('h1', '{{site.name}}'), T('large', 'Korte introductie van wat je maakt en voor wie.'), row('Knoppen', 12, [B('Bekijk werk', '/work/'), B('Contact', '/contact/', 'link')])]),
          Img('Beeld', { size: { width: 'fill', aspectRatio: '4 / 5' }, effects: { reveal: { from: { opacity: 0, scale: 0.95 }, duration: 1000 } } }),
        ),
      ]),
  },
  {
    id: 'hero-marquee',
    name: 'Hero gecentreerd met lopende band',
    category: 'Hero',
    description: 'Gecentreerde titel met eindeloos doorlopende woorden eronder.',
    build: () => {
      const words = ['Ontwerp', 'Beeld', 'Tekst', 'Ideeën', 'Projecten'];
      return F('Hero', { tag: 'section', layout: { mode: 'vertical', gap: 56, align: 'center', padding: [160, 0, 96, 0] }, size: { width: 'fill' }, style: { overflow: 'hidden' } }, [
        F('Tekst', { layout: { mode: 'vertical', gap: 20, align: 'center', padding: [0, 24, 0, 24] }, size: { width: 'fill', maxW: 900 } }, [
          T('display', '{{site.name}}', { tag: 'h1', style: { textAlign: 'center' } }),
          T('large', 'Een korte zin over wat je doet.', { style: { textAlign: 'center' } }),
        ]),
        F('Band', { layout: { mode: 'horizontal', gap: 56, align: 'center' }, size: { width: 'fill' }, effects: { marquee: { direction: 'left', speed: 70 } } },
          words.flatMap((w) => [T('h2', w, { size: { width: 'hug' } }), Icon('sparkle', { size: { width: 'fixed', w: 36, height: 'fixed', h: 36 }, colors: ['token:accent'] })])),
      ]);
    },
  },
  {
    id: 'work-grid',
    name: 'Geselecteerd werk',
    category: 'Werk',
    description: 'Kop met knop en een grid met uitgelichte projecten.',
    build: () =>
      Section('Geselecteerd werk', {}, [
        F('Kopregel', { layout: { mode: 'horizontal', justify: 'space-between', align: 'end', gap: 24 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
          stack('Kop', 12, [T('label', 'Werk'), T('h2', 'Geselecteerd werk')], { size: { width: 'hug' } }),
          B('Al het werk', '/work/', 'secondary', { icon: 'arrow-right' }),
        ]),
        Grid({ featuredOnly: true, limit: 6, effects: { reveal: { from: { opacity: 0, y: 40 }, duration: 800, stagger: 120 } } }),
      ]),
  },
  {
    id: 'work-big',
    name: 'Werk groot (2 kolommen)',
    category: 'Werk',
    description: 'Alle projecten in een ruim grid van twee kolommen.',
    build: () => Section('Werk', {}, [T('h1', 'Werk'), Grid({ layout: { mode: 'grid', columns: 2, gap: 40, rowGap: 64 }, responsive: { mobile: { layout: { columns: 1, gap: 20, rowGap: 32 } } } })]),
  },
  {
    id: 'showreel-embed',
    name: 'Video (YouTube of Vimeo)',
    category: 'Media',
    description: 'Een video als embed op 16:9, met kop. Plak de link van je video in het rechterpaneel.',
    build: () =>
      Section('Showreel', { scheme: 'zacht', gap: 32 }, [
        stack('Kop', 12, [T('label', 'Video'), T('h2', 'Bekijk de video')]),
        { id: uid(), type: 'embed', name: 'Video', url: SHOWREEL_EMBED, size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 12, overflow: 'hidden' }, effects: { reveal: { from: { opacity: 0, scale: 0.96 }, duration: 900 } } } as EmbedNode,
      ]),
  },
  {
    id: 'text-image',
    name: 'Tekst + beeld',
    category: 'Inhoud',
    description: 'Verhaal naast een foto. Draai de volgorde om met Alt+↑/↓.',
    build: () =>
      Section('Tekst + beeld', {}, [
        split(
          'Rij',
          Img('Foto', { size: { width: 'fill', aspectRatio: '4 / 5' }, effects: { reveal: { from: { opacity: 0, scale: 0.96 }, duration: 1000 } } }),
          stack('Tekst', 20, [T('label', 'Over mij'), T('h2', 'Een kop die vertelt wie je bent.'), T('body', 'Vertel hier in een paar zinnen wie je bent, hoe je werkt en wat mensen van je kunnen verwachten.'), B('Meer over mij', '/about/', 'link', { icon: 'arrow-right' })], { effects: reveal }),
        ),
      ]),
  },
  {
    id: 'services',
    name: 'Diensten (3 kolommen)',
    category: 'Inhoud',
    description: 'Drie kaarten met icoon, titel en tekst.',
    build: () => {
      const card = (icon: string, title: string, body: string) =>
        F('Kaart', { layout: { mode: 'vertical', gap: 16, padding: [32, 32, 32, 32] }, size: { width: 'fill' }, style: { fill: 'token:surface', radius: 12 }, effects: { hover: { y: -6 } } }, [
          Icon(icon, { size: { width: 'fixed', w: 40, height: 'fixed', h: 40 }, colors: ['token:accent'] }),
          T('h3', title),
          T('body', body, { style: { color: 'token:muted' } }),
        ]);
      return Section('Diensten', { scheme: 'zacht' }, [
        stack('Kop', 12, [T('label', 'Wat ik doe'), T('h2', 'Diensten')]),
        F('Kaarten', { layout: { mode: 'grid', columns: 3, gap: 24 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 1 } } }, effects: reveal }, [
          card('sparkle', 'Dienst 1', 'Korte uitleg van wat je doet en voor wie.'),
          card('pen', 'Dienst 2', 'Nog iets wat je aanbiedt, met een voorbeeld.'),
          card('monitor', 'Dienst 3', 'En een derde. Houd het kort en concreet.'),
        ]),
      ]);
    },
  },
  {
    id: 'stats',
    name: 'Cijfers',
    category: 'Inhoud',
    description: 'Vier grote getallen met uitleg.',
    build: () => {
      const stat = (n: string, l: string) => stack('Cijfer', 8, [T('display', n, { tag: 'p' }), T('small', l)]);
      return Section('Cijfers', {}, [
        F('Cijfers', { layout: { mode: 'grid', columns: 4, gap: 32 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 2 } } }, effects: reveal }, [
          stat('25+', 'Projecten'), stat('3 jr', 'Ervaring'), stat('10', 'Opdrachtgevers'), stat('100%', 'Inzet'),
        ]),
      ]);
    },
  },
  {
    id: 'quote',
    name: 'Citaat / review',
    category: 'Inhoud',
    description: 'Groot citaat met naam. Gebruik alleen echte reviews.',
    build: () =>
      Section('Citaat', { align: 'center', gap: 28, maxW: 900 }, [
        Icon('quote', { size: { width: 'fixed', w: 48, height: 'fixed', h: 48 }, colors: ['token:accent'] }),
        T('h2', '“Plaats hier een echte uitspraak van een klant.”', { style: { textAlign: 'center' } }),
        T('small', 'Naam — Bedrijf', { style: { textAlign: 'center' } }),
      ]),
  },
  {
    id: 'logos',
    name: 'Logo-band',
    category: 'Inhoud',
    description: 'Namen of logo’s van klanten die eindeloos voorbijkomen.',
    build: () =>
      Section('Klanten', { pad: [64, 0, 64, 0], gap: 24, align: 'center' }, [
        T('label', 'Gewerkt voor', { style: { textAlign: 'center' } }),
        F('Logo’s', { layout: { mode: 'horizontal', gap: 80, align: 'center' }, size: { width: 'fill' }, style: { opacity: 0.7 }, effects: { marquee: { direction: 'left', speed: 40, pauseOnHover: true } } },
          ['Klant A', 'Klant B', 'Klant C', 'Klant D', 'Klant E', 'Klant F'].map((n) => T('h3', n, { size: { width: 'hug' } }))),
      ]),
  },
  {
    id: 'gallery',
    name: 'Fotogalerij',
    category: 'Media',
    description: 'Grid met afbeeldingen die groot openen bij klikken.',
    build: () =>
      Section('Galerij', {}, [
        T('h2', 'Achter de schermen'),
        F('Galerij', { layout: { mode: 'grid', columns: 3, gap: 16 }, size: { width: 'fill' }, responsive: { mobile: { layout: { columns: 2, gap: 8 } } }, effects: { reveal: { from: { opacity: 0, scale: 0.94 }, duration: 700, stagger: 60 } } },
          Array.from({ length: 6 }, (_, i) => Img(`Foto ${i + 1}`, { size: { width: 'fill', aspectRatio: '1 / 1' }, effects: { lightbox: true, hover: { scale: 1.02 } } }))),
      ]),
  },
  {
    id: 'faq',
    name: 'Veelgestelde vragen',
    category: 'Inhoud',
    description: 'Vragen en antwoorden met lijnen ertussen. Goed voor SEO.',
    build: () => {
      const qa = (q: string, a: string) => stack('Vraag', 10, [T('h4', q), T('body', a, { style: { color: 'token:muted' } })], { layout: { mode: 'vertical', gap: 10, padding: [24, 0, 24, 0] }, style: { stroke: 'token:line', strokeWidth: 0 } });
      return Section('FAQ', { maxW: 860, gap: 8 }, [
        T('h2', 'Veelgestelde vragen'),
        qa('Wat kost een video?', 'Elke opdracht is anders. Stuur je idee, dan krijg je een voorstel op maat.'),
        Icon('div-line', { stretch: true, size: { width: 'fill', height: 'fixed', h: 1 } }),
        qa('Hoe lang duurt een project?', 'Meestal twee tot zes weken, afhankelijk van de omvang.'),
        Icon('div-line', { stretch: true, size: { width: 'fill', height: 'fixed', h: 1 } }),
        qa('Werk je ook op locatie?', 'Ja, door heel Nederland en daarbuiten.'),
      ]);
    },
  },
  {
    id: 'cta-accent',
    name: 'Oproep (accentkleur)',
    category: 'Contact',
    description: 'Groot statement met knop, in het accent-schema.',
    build: () =>
      Section('Oproep', { scheme: 'accent', align: 'center', gap: 28, pad: [140, 48, 140, 48] }, [
        T('display', 'Samen iets maken?', { style: { textAlign: 'center' }, effects: { scroll: { from: { scale: 0.85, opacity: 0.3 }, to: { scale: 1, opacity: 1 }, start: 0, end: 0.6 } } }),
        B('Neem contact op', '/contact/', 'primary', { icon: 'arrow-up-right', effects: { hover: { scale: 1.05 }, press: { scale: 0.97 } } }),
      ]),
  },
  {
    id: 'contact-split',
    name: 'Contact met formulier',
    category: 'Contact',
    description: 'Gegevens links, formulier rechts.',
    build: () =>
      Section('Contact', {}, [
        split(
          'Contact',
          stack('Gegevens', 20, [
            T('h1', 'Contact'),
            T('large', 'Een project in gedachten? Vertel er alles over.'),
            row('Mail', 12, [Icon('mail', { size: { width: 'fixed', w: 22, height: 'fixed', h: 22 } }), T('body', '[jouw@email.nl](mailto:jouw@email.nl)', { size: { width: 'hug' } })]),
            row('Socials', 16, ['instagram', 'youtube', 'twitch', 'tiktok', 'discord'].map((s) => Icon(s, { size: { width: 'fixed', w: 24, height: 'fixed', h: 24 }, href: '#', ariaLabel: s }))),
          ]),
          contactForm(),
        ),
      ]),
  },
  {
    id: 'about',
    name: 'Over mij',
    category: 'Inhoud',
    description: 'Portret, verhaal en werkwijze.',
    build: () =>
      Section('Over', {}, [
        split(
          'Over',
          stack('Tekst', 20, [T('label', 'Over'), T('h1', 'Hoi, ik ben de maker achter {{site.name}}.'), T('large', 'Jouw verhaal: hoe het begon en waar je trots op bent.'), T('body', 'Hoe je werkt, met wie, en wat iemand kan verwachten als jullie samenwerken.')]),
          Img('Portret', { size: { width: 'fill', aspectRatio: '3 / 4' }, effects: { reveal: { from: { opacity: 0, y: 40 }, duration: 1000 } } }),
        ),
      ]),
  },
  {
    id: 'divider-wave',
    name: 'Scheiding: golf',
    category: 'Scheiding',
    description: 'Golvende overgang. Kleur instelbaar per laag.',
    build: () => F('Scheiding', { layout: { mode: 'vertical' }, size: { width: 'fill' } }, [Icon('div-wave', { size: { width: 'fill', height: 'fixed', h: 100 }, colors: ['token:surface'] })]),
  },
  {
    id: 'divider-curve',
    name: 'Scheiding: bocht',
    category: 'Scheiding',
    description: 'Zachte boog als overgang tussen secties.',
    build: () => F('Scheiding', { layout: { mode: 'vertical' }, size: { width: 'fill' } }, [Icon('div-curve', { size: { width: 'fill', height: 'fixed', h: 90 }, colors: ['token:surface'] })]),
  },
];
