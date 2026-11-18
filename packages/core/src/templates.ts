// ─────────────────────────────────────────────────────────────
// Sjablonen voor nieuwe websites in Folio (de deelbare desktop-versie).
// Neutraal: geen merk, geen persoonlijke inhoud. Alle tekst is een
// voorbeeld dat je overschrijft; {{site.name}} wordt de naam van de site.
// ─────────────────────────────────────────────────────────────

import type { ButtonNode, FrameNode, Project, Seo, SiteSettings, VNode } from './types.js';
import type { Component } from './types.js';
import { B, F, Grid, Icon, Img, Section, T } from './sections.js';
import { contactForm, defaultComponents, DEFAULT_SITE } from './defaults.js';
import { THEME_PRESETS, type Theme } from './theme.js';
import { uid } from './tree.js';

export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  /** Thema-preset waarmee de site start (kan later in Thema). */
  theme: string;
  /** Kleuren voor het voorbeeldkaartje in het startscherm. */
  preview: { bg: string; fg: string; accent: string };
}

export const SITE_TEMPLATES: SiteTemplate[] = [
  { id: 'portfolio', name: 'Portfolio', description: 'Laat je werk zien: projecten, over mij, diensten en contact.', theme: 'studio-donker', preview: { bg: '#0c0c0d', fg: '#fafafa', accent: '#e4ff54' } },
  { id: 'persoonlijk', name: 'Persoonlijk / cv', description: 'Wie je bent, wat je kunt en wat je hebt gedaan. Ideaal voor stages en sollicitaties.', theme: 'licht-minimal', preview: { bg: '#f7f7f5', fg: '#111', accent: '#2f5bff' } },
  { id: 'schoolproject', name: 'Schoolproject', description: 'Presenteer een opdracht: het probleem, je proces, het resultaat en het team.', theme: 'editorial', preview: { bg: '#f4efe6', fg: '#1c1917', accent: '#c2410c' } },
  { id: 'leeg', name: 'Leeg', description: 'Alleen een kop- en voettekst. Begin helemaal zelf.', theme: 'licht-minimal', preview: { bg: '#ffffff', fg: '#111', accent: '#888' } },
];

type PageDef = { slug: string; title: string; kind: 'page' | 'project-template'; tree: FrameNode; seo?: Seo };
export interface TemplateContent {
  site: SiteSettings;
  components: Component[];
  pages: PageDef[];
  projects: Omit<Project, 'id'>[];
}

// ── Kleine bouwstenen ────────────────────────────────────────
const reveal = { reveal: { from: { opacity: 0, y: 32 }, duration: 800, stagger: 90 } };
const page = (name: string, children: VNode[]): FrameNode =>
  F(name, { tag: 'main', layout: { mode: 'vertical' }, size: { width: 'fill', minH: 800 } }, children);
const row = (name: string, gap: number, children: VNode[]) =>
  F(name, { layout: { mode: 'horizontal', gap, align: 'center', wrap: true }, size: { width: 'fill' } }, children);
const stack = (name: string, gap: number, children: VNode[], props: Partial<FrameNode> = {}) =>
  F(name, { layout: { mode: 'vertical', gap }, size: { width: 'fill' }, ...props }, children);
const split = (name: string, left: VNode, right: VNode, gap = 64): FrameNode =>
  F(name, { layout: { mode: 'horizontal', gap, align: 'center' }, size: { width: 'fill' }, responsive: { tablet: { layout: { mode: 'vertical', gap: 40, align: 'start' } } } }, [left, right]);
const header = () => ({ id: uid(), type: 'instance' as const, name: 'Header', component: 'c_header' });
const footer = () => ({ id: uid(), type: 'instance' as const, name: 'Footer', component: 'c_footer' });
const cards = (items: [string, string, string][], cols = 3) =>
  F('Kaarten', { layout: { mode: 'grid', columns: cols, gap: 24 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 1 } } }, effects: reveal },
    items.map(([icon, title, body]) =>
      F('Kaart', { layout: { mode: 'vertical', gap: 14, padding: [28, 28, 28, 28] }, size: { width: 'fill' }, style: { fill: 'token:surface', radius: 12 }, effects: { hover: { y: -4 } } }, [
        Icon(icon, { size: { width: 'fixed', w: 32, height: 'fixed', h: 32 }, colors: ['token:accent'] }),
        T('h3', title),
        T('body', body, { style: { color: 'token:muted' } }),
      ])));

function notFound(): PageDef {
  return {
    slug: '404', title: 'Niet gevonden', kind: 'page', seo: { noindex: true },
    tree: page('Niet gevonden', [header(), Section('404', { align: 'center', gap: 24, pad: [180, 48, 180, 48] }, [
      T('display', '404', { tag: 'h1', style: { textAlign: 'center' } }),
      T('large', 'Deze pagina bestaat niet (meer).', { style: { textAlign: 'center' } }),
      B('Naar de homepage', '/', 'primary'),
    ]), footer()]),
  };
}

function projectTemplate(): PageDef {
  return {
    slug: '__project', title: 'Projectsjabloon', kind: 'project-template',
    tree: page('Projectpagina', [header(), Section('Project', { pad: [96, 48, 120, 48], gap: 32 }, [
      T('label', '{{project.category}}'),
      T('h1', '{{project.title}}'),
      T('large', '{{project.meta}}', { style: { color: 'token:muted' } }),
      { id: uid(), type: 'image', name: 'Cover', asset: '{{project.cover}}', src: '{{project.thumb}}', alt: '{{project.title}}', size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 12, fill: 'token:surface' } },
      T('body', '{{project.summary}}', { size: { width: 'fill', maxW: 760 } }),
      F('Projectinhoud', { slot: true, layout: { mode: 'vertical', gap: 32 }, size: { width: 'fill' } }, []),
      { id: uid(), type: 'button', name: 'Terug', label: 'Al het werk', href: '/work/', variant: 'link', icon: 'arrow-right' } as ButtonNode,
    ]), footer()]),
  };
}

function contactPage(intro: string): PageDef {
  return {
    slug: 'contact', title: 'Contact', kind: 'page', seo: { schemaType: 'ContactPage' },
    tree: page('Contact', [header(), Section('Contact', {}, [split('Contact',
      stack('Gegevens', 20, [
        T('h1', 'Contact'),
        T('large', intro),
        row('Mail', 12, [Icon('mail', { size: { width: 'fixed', w: 22, height: 'fixed', h: 22 } }), T('body', '[jouw@email.nl](mailto:jouw@email.nl)', { size: { width: 'hug' } })]),
      ]),
      contactForm(),
    )]), footer()]),
  };
}

const sampleProject = (n: number, title: string, category: string, summary: string): Omit<Project, 'id'> => ({
  slug: `project-${n}`,
  title,
  client: 'Eigen werk',
  year: String(new Date().getFullYear()),
  category,
  summary,
  video: '',
  tree: F('Projectinhoud', { layout: { mode: 'vertical', gap: 32 }, size: { width: 'fill' } }, [
    T('h2', 'Het verhaal'),
    T('body', 'Wat was de vraag, wat heb je gemaakt en hoe pakte het uit? Sleep hier beelden in of voeg een video toe.', { size: { width: 'fill', maxW: 760 } }),
    F('Beelden', { layout: { mode: 'grid', columns: 2, gap: 24 }, size: { width: 'fill' }, responsive: { mobile: { layout: { columns: 1 } } } }, [Img('Beeld'), Img('Beeld')]),
  ]),
  featured: true,
  published: true,
  sort: n,
});

// ── De sjablonen ─────────────────────────────────────────────
function portfolio(): Omit<TemplateContent, 'site' | 'components'> {
  const home = page('Home', [
    header(),
    Section('Hero', { pad: [160, 48, 120, 48], gap: 28 }, [
      T('label', 'Portfolio'),
      T('display', '{{site.name}}', { tag: 'h1' }),
      T('large', 'Eén zin over wat je maakt en voor wie. Bijvoorbeeld: ik ontwerp, fotografeer en bouw dingen die opvallen.', { size: { width: 'fill', maxW: 640 } }),
      row('Knoppen', 12, [B('Bekijk mijn werk', '/work/', 'primary', { icon: 'arrow-right' }), B('Neem contact op', '/contact/', 'secondary')]),
    ]),
    Section('Geselecteerd werk', {}, [
      F('Kopregel', { layout: { mode: 'horizontal', justify: 'space-between', align: 'end', gap: 24 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
        stack('Kop', 12, [T('label', 'Werk'), T('h2', 'Geselecteerd werk')], { size: { width: 'hug' } }),
        B('Al het werk', '/work/', 'secondary', { icon: 'arrow-right' }),
      ]),
      Grid({ featuredOnly: true, limit: 6, effects: { reveal: { from: { opacity: 0, y: 40 }, duration: 800, stagger: 120 } } }),
    ]),
    Section('Wat ik doe', { scheme: 'zacht' }, [
      stack('Kop', 12, [T('label', 'Wat ik doe'), T('h2', 'Waar je me voor kunt vragen')]),
      cards([
        ['sparkle', 'Vaardigheid 1', 'Korte uitleg van iets waar je goed in bent.'],
        ['monitor', 'Vaardigheid 2', 'Nog iets wat je graag doet, met een voorbeeld.'],
        ['film', 'Vaardigheid 3', 'En een derde. Houd het kort en concreet.'],
      ]),
    ]),
    Section('Oproep', { scheme: 'accent', align: 'center', gap: 28, pad: [130, 48, 130, 48] }, [
      T('display', 'Samen iets maken?', { style: { textAlign: 'center' } }),
      B('Neem contact op', '/contact/', 'primary', { icon: 'arrow-up-right' }),
    ]),
    footer(),
  ]);
  const work = page('Werk', [header(), Section('Werk', {}, [T('h1', 'Werk'), Grid({ layout: { mode: 'grid', columns: 2, gap: 40, rowGap: 64 }, responsive: { mobile: { layout: { columns: 1, gap: 20, rowGap: 32 } } } })]), footer()]);
  const about = page('Over', [header(), Section('Over', {}, [split('Over',
    stack('Tekst', 20, [T('label', 'Over mij'), T('h1', 'Hoi, ik ben {{site.name}}.'), T('large', 'Vertel hier wie je bent en waar je trots op bent.'), T('body', 'Hoe werk je, wat vind je leuk en wat kan iemand van je verwachten?')]),
    Img('Portret', { size: { width: 'fill', aspectRatio: '3 / 4' } }),
  )]), footer()]);
  return {
    pages: [
      { slug: '', title: 'Home', kind: 'page', tree: home, seo: { schemaType: 'WebPage' } },
      { slug: 'work', title: 'Werk', kind: 'page', tree: work, seo: { schemaType: 'CollectionPage' } },
      { slug: 'about', title: 'Over', kind: 'page', tree: about, seo: { schemaType: 'AboutPage' } },
      contactPage('Een vraag of een idee? Stuur me een bericht.'),
      notFound(),
      projectTemplate(),
    ],
    projects: [
      sampleProject(1, 'Voorbeeldproject 1', 'Ontwerp', 'Vervang dit door een echt project: open het via Projecten.'),
      sampleProject(2, 'Voorbeeldproject 2', 'Fotografie', 'Een tweede voorbeeld. Je kunt projecten verwijderen of toevoegen.'),
      sampleProject(3, 'Voorbeeldproject 3', 'Video', 'Projecten verschijnen vanzelf in het grid op de homepage en de werkpagina.'),
    ],
  };
}

function persoonlijk(): Omit<TemplateContent, 'site' | 'components'> {
  const line = (when: string, what: string, where: string) =>
    F('Regel', { layout: { mode: 'horizontal', gap: 32, align: 'start', padding: [20, 0, 20, 0] }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', gap: 6 } } } }, [
      T('small', when, { size: { width: 'fixed', w: 140 }, style: { color: 'token:muted' } }),
      stack('Wat', 4, [T('h4', what), T('body', where, { style: { color: 'token:muted' } })]),
    ]);
  const rule = () => F('Lijn', { size: { width: 'fill', height: 'fixed', h: 1 }, style: { fill: 'token:line' } });
  const home = page('Home', [
    header(),
    Section('Hero', { pad: [140, 48, 100, 48] }, [split('Hero',
      stack('Tekst', 22, [T('label', 'Hallo, ik ben'), T('display', '{{site.name}}', { tag: 'h1' }), T('large', 'Student, maker en altijd nieuwsgierig. Eén of twee zinnen over wie je bent.'), row('Knoppen', 12, [B('Neem contact op', '/contact/'), B('Download mijn cv', '#', 'link', { icon: 'arrow-right' })])]),
      Img('Foto', { size: { width: 'fill', aspectRatio: '1 / 1' }, style: { radius: 999, fill: 'token:surface' } }),
    )]),
    Section('Vaardigheden', { scheme: 'zacht' }, [
      stack('Kop', 12, [T('label', 'Wat ik kan'), T('h2', 'Vaardigheden')]),
      cards([
        ['sparkle', 'Ontwerpen', 'Bijvoorbeeld: Figma, Photoshop, Illustrator.'],
        ['monitor', 'Digitaal', 'Bijvoorbeeld: websites, video, social media.'],
        ['heart', 'Samenwerken', 'Bijvoorbeeld: projecten leiden, presenteren.'],
      ]),
    ]),
    Section('Ervaring', {}, [
      stack('Kop', 12, [T('label', 'Wat ik heb gedaan'), T('h2', 'Ervaring en opleiding')]),
      stack('Lijst', 0, [
        line('2024 – nu', 'Opleiding of studie', 'School · plaats'),
        rule(),
        line('2023', 'Stage of bijbaan', 'Bedrijf · wat je daar deed'),
        rule(),
        line('2022', 'Project of prestatie', 'Korte uitleg'),
      ]),
    ]),
    Section('Oproep', { scheme: 'accent', align: 'center', gap: 24, pad: [110, 48, 110, 48] }, [
      T('h2', 'Zin om kennis te maken?', { style: { textAlign: 'center' } }),
      B('Stuur een bericht', '/contact/', 'primary', { icon: 'arrow-up-right' }),
    ]),
    footer(),
  ]);
  return {
    pages: [
      { slug: '', title: 'Home', kind: 'page', tree: home, seo: { schemaType: 'AboutPage' } },
      contactPage('Vragen, een stageplek of gewoon even hallo? Ik hoor graag van je.'),
      notFound(),
      projectTemplate(),
    ],
    projects: [],
  };
}

function schoolproject(): Omit<TemplateContent, 'site' | 'components'> {
  const step = (n: string, title: string, body: string) =>
    stack('Stap', 10, [T('display', n, { tag: 'p', style: { color: 'token:accent' } }), T('h3', title), T('body', body, { style: { color: 'token:muted' } })]);
  const member = (name: string, role: string) =>
    stack('Teamlid', 12, [Img('Foto', { size: { width: 'fill', aspectRatio: '1 / 1' }, style: { radius: 12, fill: 'token:surface' } }), T('h4', name), T('small', role, { style: { color: 'token:muted' } })]);
  const home = page('Home', [
    header(),
    Section('Hero', { pad: [150, 48, 110, 48], gap: 26 }, [
      T('label', 'Schoolproject · vak of opleiding'),
      T('display', '{{site.name}}', { tag: 'h1' }),
      T('large', 'In één zin: wat hebben jullie gemaakt en waarom?', { size: { width: 'fill', maxW: 680 } }),
      Img('Hoofdbeeld', { size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 16, fill: 'token:surface' } }),
    ]),
    Section('De opdracht', {}, [split('Opdracht',
      stack('Tekst', 18, [T('label', 'De opdracht'), T('h2', 'Wat was het probleem?'), T('body', 'Beschrijf de opdracht, de doelgroep en wat er moest gebeuren. Wat maakte het lastig of interessant?')]),
      stack('Tekst', 18, [T('label', 'Ons doel'), T('h2', 'Wat wilden we bereiken?'), T('body', 'Wat was jullie aanpak en waar wilden jullie aan het eind staan?')]),
    )]),
    Section('Proces', { scheme: 'zacht' }, [
      stack('Kop', 12, [T('label', 'Proces'), T('h2', 'Hoe we het aanpakten')]),
      F('Stappen', { layout: { mode: 'grid', columns: 4, gap: 28 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 2 } }, mobile: { layout: { columns: 1 } } }, effects: reveal }, [
        step('01', 'Onderzoek', 'Wat hebben jullie uitgezocht?'),
        step('02', 'Ideeën', 'Schetsen, moodboards, concepten.'),
        step('03', 'Maken', 'Prototypes en de uitwerking.'),
        step('04', 'Testen', 'Feedback en verbeteringen.'),
      ]),
    ]),
    Section('Resultaat', {}, [
      stack('Kop', 12, [T('label', 'Resultaat'), T('h2', 'Het eindresultaat')]),
      F('Beelden', { layout: { mode: 'grid', columns: 3, gap: 20 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 2 } }, mobile: { layout: { columns: 1 } } }, effects: reveal }, [Img('Beeld'), Img('Beeld'), Img('Beeld')]),
      T('body', 'Wat is het geworden, wat werkte goed en wat zouden jullie de volgende keer anders doen?', { size: { width: 'fill', maxW: 760 } }),
    ]),
    Section('Team', { scheme: 'zacht' }, [
      stack('Kop', 12, [T('label', 'Team'), T('h2', 'Wie hebben eraan gewerkt?')]),
      F('Teamleden', { layout: { mode: 'grid', columns: 4, gap: 24 }, size: { width: 'fill' }, responsive: { tablet: { layout: { columns: 2 } } } }, [
        member('Naam 1', 'Rol in het project'), member('Naam 2', 'Rol in het project'), member('Naam 3', 'Rol in het project'), member('Naam 4', 'Rol in het project'),
      ]),
    ]),
    footer(),
  ]);
  return {
    pages: [{ slug: '', title: 'Home', kind: 'page', tree: home, seo: { schemaType: 'WebPage' } }, notFound(), projectTemplate()],
    projects: [],
  };
}

function leeg(): Omit<TemplateContent, 'site' | 'components'> {
  const home = page('Home', [
    header(),
    Section('Begin hier', { pad: [160, 48, 160, 48], gap: 20 }, [
      T('h1', '{{site.name}}'),
      T('large', 'Een lege pagina. Voeg secties toe via Invoegen of Blokken (links).', { style: { color: 'token:muted' } }),
    ]),
    footer(),
  ]);
  return { pages: [{ slug: '', title: 'Home', kind: 'page', tree: home, seo: { schemaType: 'WebPage' } }, notFound(), projectTemplate()], projects: [] };
}

/** Header en footer zonder vaste links naar pagina's die het sjabloon niet heeft. */
function componentsFor(pages: PageDef[]): Component[] {
  const have = new Set(pages.filter((p) => p.kind === 'page').map((p) => `/${p.slug ? p.slug + '/' : ''}`));
  const prune = (n: VNode): VNode | null => {
    const href = (n as { href?: string }).href;
    if (href && href.startsWith('/') && href !== '/' && !have.has(href)) return null;
    if (n.type === 'frame') return { ...n, children: n.children.map(prune).filter((c): c is VNode => !!c) };
    return n;
  };
  return defaultComponents().map((c) => ({ ...c, tree: prune(c.tree) as FrameNode }));
}

/** Alles voor een nieuwe site op basis van een sjabloon. */
export function templateContent(id: string, name: string): TemplateContent {
  const tpl = SITE_TEMPLATES.find((t) => t.id === id) ?? SITE_TEMPLATES[0];
  const body = { portfolio, persoonlijk, schoolproject, leeg }[tpl.id as 'portfolio']();
  const theme: Theme = structuredClone(THEME_PRESETS.find((t) => t.id === tpl.theme) ?? THEME_PRESETS[1]);
  const site: SiteSettings = {
    ...structuredClone(DEFAULT_SITE),
    name,
    description: '',
    theme,
    seo: { lang: 'nl', entity: { type: 'Person', name, sameAs: [] } },
    redirects: [],
  };
  return { site, components: componentsFor(body.pages), pages: body.pages, projects: body.projects };
}
