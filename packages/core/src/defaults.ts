import type {
  ButtonNode,
  CollectionNode,
  Component,
  FrameNode,
  InstanceNode,
  Project,
  SiteSettings,
  TextNode,
  VideoNode,
  ImageNode,
  FormNode,
  SvgNode,
  Seo,
  VNode,
} from './types.js';
import { uid, videoEmbed } from './tree.js';
import { SECTION_LIBRARY, Section, T, Grid } from './sections.js';
import { DEFAULT_THEME, SCHEME_ROLES, type Theme } from './theme.js';
import { SVG_LIBRARY } from './svg.js';

// Kleine bouwhulpjes voor de standaardinhoud.
type Partial2<T> = Omit<Partial<T>, 'type'>;

export const frame = (name: string, props: Partial2<FrameNode>, children: VNode[] = []): FrameNode => ({
  id: uid(),
  type: 'frame',
  name,
  ...props,
  children,
});
export const text = (name: string, content: string, props: Partial2<TextNode> = {}): TextNode => ({
  id: uid(),
  type: 'text',
  name,
  content,
  ...props,
});
export const button = (label: string, href: string, props: Partial2<ButtonNode> = {}): ButtonNode => ({
  id: uid(),
  type: 'button',
  name: 'Knop',
  label,
  href,
  variant: 'primary',
  ...props,
});
export const instance = (name: string, component: string): InstanceNode => ({
  id: uid(),
  type: 'instance',
  name,
  component,
  size: { width: 'fill' },
});

export const DEFAULT_SITE: SiteSettings = {
  name: 'Vystara Studios',
  description: 'Portfolio van Vystara Studios.',
  theme: structuredClone(DEFAULT_THEME),
  seo: { lang: 'nl', entity: { type: 'Organization', name: 'Vystara Studios', sameAs: [] } },
  redirects: [],
  tokens: {
    colors: {
      bg: '#0c0c0d',
      surface: '#18181b',
      text: '#f4f4f5',
      muted: '#a1a1aa',
      line: '#27272a',
      accent: '#e4ff54',
    },
    fonts: {
      body: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      display: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    },
  },
};

const page = (name: string, children: VNode[]): FrameNode =>
  frame(name, { tag: 'main', layout: { mode: 'vertical' }, size: { width: 'fill', minH: 800 } }, children);

// ── Componenten ──────────────────────────────────────────────

export function defaultComponents(): Component[] {
  const now = new Date().toISOString();
  const navLink = (label: string, href: string) =>
    text(label, label, { href, textStyle: 'body', size: { width: 'hug' }, style: { color: 'token:muted' } });

  const header: Component = {
    id: 'c_header',
    name: 'Header',
    updatedAt: now,
    tree: frame(
      'Header',
      {
        tag: 'header',
        layout: { mode: 'horizontal', justify: 'space-between', align: 'center', padding: [22, 48, 22, 48] },
        size: { width: 'fill' },
        position: { mode: 'sticky', y: 0, z: 40 },
        style: { fill: 'token:bg', blur: 0 },
        responsive: { mobile: { layout: { padding: [16, 20, 16, 20] } } },
      },
      [
        text('Logo', '{{site.name}}', { href: '/', textStyle: 'h4', size: { width: 'hug' } }),
        frame(
          'Navigatie',
          { tag: 'nav', layout: { mode: 'horizontal', gap: 32, align: 'center' }, size: { width: 'hug' }, responsive: { mobile: { layout: { gap: 16 } } } },
          [navLink('Werk', '/work/'), navLink('Over', '/about/'), navLink('Contact', '/contact/')],
        ),
      ],
    ),
  };

  const social = (id: string, url: string): SvgNode => {
    const it = SVG_LIBRARY.find((x) => x.id === id)!;
    return { id: uid(), type: 'svg', name: it.name, svg: it.svg, colors: ['token:muted'], href: url, ariaLabel: it.name, size: { width: 'fixed', w: 20, height: 'fixed', h: 20 }, effects: { hover: { y: -2 } } };
  };

  const footer: Component = {
    id: 'c_footer',
    name: 'Footer',
    updatedAt: now,
    tree: frame(
      'Footer',
      {
        tag: 'footer',
        scheme: 'zacht',
        layout: { mode: 'vertical', gap: 48, padding: [80, 48, 40, 48] },
        size: { width: 'fill' },
        responsive: { mobile: { layout: { padding: [56, 20, 32, 20], gap: 32 } } },
      },
      [
        frame('Boven', { layout: { mode: 'horizontal', justify: 'space-between', align: 'end', gap: 24 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
          text('Slogan', 'Laten we iets moois maken.', { tag: 'p', textStyle: 'h2', size: { width: 'fill', maxW: 560 } }),
          { id: uid(), type: 'button', name: 'Knop', label: 'Neem contact op', href: '/contact/', variant: 'primary', icon: 'arrow-up-right' } as ButtonNode,
        ]),
        frame('Onder', { layout: { mode: 'horizontal', justify: 'space-between', align: 'center', gap: 16 }, size: { width: 'fill' }, responsive: { mobile: { layout: { mode: 'vertical', align: 'start' } } } }, [
          text('Copyright', '© {{year}} {{site.name}}', { textStyle: 'small', size: { width: 'hug' } }),
          frame('Socials', { layout: { mode: 'horizontal', gap: 20, align: 'center' }, size: { width: 'hug' } }, [
            social('instagram', 'https://instagram.com/'),
            social('youtube', 'https://youtube.com/'),
            social('twitch', 'https://twitch.tv/'),
            social('tiktok', 'https://tiktok.com/'),
            social('linkedin', 'https://linkedin.com/'),
          ]),
        ]),
      ],
    ),
  };
  return [header, footer];
}

// ── Pagina's ─────────────────────────────────────────────────

const build = (id: string) => SECTION_LIBRARY.find((s) => s.id === id)!.build();

export function defaultPages(): { slug: string; title: string; kind: 'page' | 'project-template'; tree: FrameNode; seo?: Seo }[] {
  const header = () => instance('Header', 'c_header');
  const footer = () => instance('Footer', 'c_footer');

  const home = page('Home', [header(), build('hero-video'), build('work-grid'), build('showreel-embed'), build('services'), build('logos'), build('text-image'), build('cta-accent'), footer()]);
  const work = page('Werk', [header(), build('work-big'), build('cta-accent'), footer()]);
  const about = page('Over', [header(), build('about'), build('stats'), build('faq'), footer()]);
  const contact = page('Contact', [header(), build('contact-split'), footer()]);

  const cover: ImageNode = { id: uid(), type: 'image', name: 'Cover', asset: '{{project.cover}}', src: '{{project.thumb}}', alt: '{{project.title}}', size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 12, fill: 'token:surface' } };
  const projectTemplate = page('Projectpagina', [
    header(),
    Section('Project', { pad: [96, 48, 120, 48], gap: 32 }, [
      T('label', '{{project.category}}'),
      T('h1', '{{project.title}}'),
      T('large', '{{project.meta}}', { style: { color: 'token:muted' } }),
      cover,
      T('body', '{{project.summary}}', { size: { width: 'fill', maxW: 760 } }),
      frame('Projectinhoud', { slot: true, layout: { mode: 'vertical', gap: 32 }, size: { width: 'fill' } }, []),
      { id: uid(), type: 'button', name: 'Terug', label: 'Al het werk', href: '/work/', variant: 'link', icon: 'arrow-right' } as ButtonNode,
    ]),
    footer(),
  ]);

  const notFound = page('Niet gevonden', [
    header(),
    Section('404', { align: 'center', gap: 24, pad: [200, 48, 200, 48] }, [
      T('display', '404', { tag: 'h1', style: { textAlign: 'center' } }),
      T('large', 'Deze pagina bestaat niet (meer).', { style: { textAlign: 'center' } }),
      { id: uid(), type: 'button', name: 'Knop', label: 'Naar de homepage', href: '/', variant: 'primary' } as ButtonNode,
    ]),
    footer(),
  ]);

  return [
    { slug: '', title: 'Home', kind: 'page', tree: home, seo: { schemaType: 'WebPage' } },
    { slug: 'work', title: 'Werk', kind: 'page', tree: work, seo: { schemaType: 'CollectionPage', description: 'Een selectie van video-, motion- en animatieprojecten van Vystara Studios.' } },
    { slug: 'about', title: 'Over', kind: 'page', tree: about, seo: { schemaType: 'AboutPage' } },
    { slug: 'contact', title: 'Contact', kind: 'page', tree: contact, seo: { schemaType: 'ContactPage' } },
    { slug: '404', title: 'Niet gevonden', kind: 'page', tree: notFound, seo: { noindex: true } },
    { slug: '__project', title: 'Projectsjabloon', kind: 'project-template', tree: projectTemplate },
  ];
}

/** Projectinhoud met een embed van de video (YouTube/Vimeo). */
function videoContent(url: string): FrameNode {
  const e = videoEmbed(url);
  return frame('Projectinhoud', { layout: { mode: 'vertical', gap: 32 }, size: { width: 'fill' } }, e ? [
    { id: uid(), type: 'embed', name: 'Video', url: e.embed, size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 12, overflow: 'hidden' } },
  ] : []);
}

export function defaultProjects(): Omit<Project, 'id'>[] {
  return [
    {
      slug: 'animatieproject-1',
      title: 'Animatieproject 1',
      client: 'Eigen werk',
      year: '',
      category: 'Animatie',
      summary: 'Animatieproject van Vystara Studios. Vervang deze tekst door het verhaal achter het project.',
      video: 'https://youtu.be/CYqV0XH5faY',
      tree: videoContent('https://youtu.be/CYqV0XH5faY'),
      featured: true,
      published: true,
      sort: 1,
    },
    {
      slug: 'animatieproject-2',
      title: 'Animatieproject 2',
      client: 'Eigen werk',
      year: '',
      category: 'Animatie',
      summary: 'Animatieproject van Vystara Studios. Vervang deze tekst door het verhaal achter het project.',
      video: 'https://youtu.be/4cZO-mN7ty8',
      tree: videoContent('https://youtu.be/4cZO-mN7ty8'),
      featured: true,
      published: true,
      sort: 2,
    },
    {
      slug: 'showreel',
      title: 'Showreel',
      client: 'Vystara Studios',
      year: '',
      category: 'Showreel',
      summary: 'Een overzicht van recent werk.',
      video: 'https://youtu.be/AwS6FmGw43Y',
      tree: videoContent('https://youtu.be/AwS6FmGw43Y'),
      featured: true,
      published: true,
      sort: 3,
    },
  ];
}

export function contactForm(): FormNode {
  return {
    id: uid(),
    type: 'form',
    name: 'Contactformulier',
    layout: { mode: 'vertical', gap: 16 },
    size: { width: 'fill', maxW: 640 },
    fields: [
      { id: 'naam', label: 'Naam', kind: 'text', required: true },
      { id: 'email', label: 'E-mail', kind: 'email', required: true },
      { id: 'bericht', label: 'Bericht', kind: 'textarea', required: true, placeholder: 'Vertel kort over je project…' },
    ],
    submitLabel: 'Versturen',
    successMessage: 'Bedankt! Ik neem zo snel mogelijk contact met je op.',
  };
}

/** Nieuwe lege lagen voor de invoegbalk in de Studio. */
export function newNode(type: VNode['type']): VNode {
  switch (type) {
    case 'frame':
      return frame('Frame', { layout: { mode: 'vertical', gap: 16, padding: [24, 24, 24, 24] }, size: { width: 'fill' }, style: { fill: 'token:surface', radius: 12 } });
    case 'text':
      return text('Tekst', 'Nieuwe tekst', { textStyle: 'body' });
    case 'image':
      return { id: uid(), type: 'image', name: 'Afbeelding', size: { width: 'fill', aspectRatio: '16 / 9' }, style: { radius: 6 } };
    case 'video':
      return { id: uid(), type: 'video', name: 'Video', autoplay: true, muted: true, loop: true, size: { width: 'fill', aspectRatio: '16 / 9' } };
    case 'button':
      return button('Knop', '/');
    case 'embed':
      return { id: uid(), type: 'embed', name: 'Embed', url: '', size: { width: 'fill', aspectRatio: '16 / 9' } };
    case 'collection':
      return Grid({});
    case 'instance':
      return instance('Instance', '');
    case 'form':
      return contactForm();
    case 'svg': {
      const it = SVG_LIBRARY.find((x) => x.id === 'arrow-right') ?? SVG_LIBRARY[0];
      return { id: uid(), type: 'svg', name: it.name, svg: it.svg, colors: [...it.colors] };
    }
  }
}

/** Thema van de site; oude sites (met alleen tokens) krijgen automatisch een thema. */
export function siteTheme(site: SiteSettings): Theme {
  if (site.theme) return site.theme;
  const t = structuredClone(DEFAULT_THEME);
  const cols = site.tokens?.colors ?? {};
  const sc = t.schemes[t.defaultScheme];
  for (const [k, v] of Object.entries(cols)) {
    if ((SCHEME_ROLES as string[]).includes(k)) (sc as Record<string, string>)[k] = v;
    else if (k === 'text') sc.text = v;
    else t.palette[k] = v;
  }
  if (cols.text) sc.heading = cols.text;
  for (const [k, v] of Object.entries(site.tokens?.fonts ?? {})) {
    t.fonts[k] = { family: k, stack: v, source: 'system' };
  }
  return t;
}
