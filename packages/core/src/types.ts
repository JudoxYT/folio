// ─────────────────────────────────────────────────────────────
// Vystara datamodel
// Een pagina is een boom van nodes, net als een Figma-bestand.
// Desktop is de basis; tablet en mobiel zijn aanpassingen daarop
// (cascade: mobiel erft van tablet, tablet erft van desktop).
// ─────────────────────────────────────────────────────────────

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';
export const BREAKPOINT_ORDER: Breakpoint[] = ['desktop', 'tablet', 'mobile'];

/** max-width van elk breakpoint in px (desktop heeft geen max). */
export const BREAKPOINT_MAX: Record<Exclude<Breakpoint, 'desktop'>, number> = {
  tablet: 1024,
  mobile: 640,
};

/** Breedte van het canvas in de Studio per breakpoint. */
export const BREAKPOINT_CANVAS: Record<Breakpoint, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};

export type NodeType =
  | 'frame'
  | 'text'
  | 'image'
  | 'video'
  | 'button'
  | 'embed'
  | 'instance'
  | 'collection'
  | 'form'
  | 'svg';

/** Figma "resizing": hug contents / fill container / fixed. */
export type SizeMode = 'hug' | 'fill' | 'fixed';

export type LayoutMode = 'none' | 'horizontal' | 'vertical' | 'grid';
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type Justify = 'start' | 'center' | 'end' | 'space-between';

/** Auto layout. `none` = vrije positionering (Figma frame zonder auto layout). */
export interface Layout {
  mode?: LayoutMode;
  gap?: number;
  /** [boven, rechts, onder, links] */
  padding?: [number, number, number, number];
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  /** Alleen voor grid. */
  columns?: number;
  rowGap?: number;
  /** Grid als metselwerk: beelden van verschillende hoogtes sluiten naadloos op elkaar aan (zoals Pinterest). */
  masonry?: boolean;
}

export interface Size {
  width?: SizeMode;
  height?: SizeMode;
  w?: number;
  h?: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  aspectRatio?: string;
}

/**
 * Positie zoals in Figma Sites:
 * flow = relatief in de auto layout, absolute = vrij in de ouder,
 * fixed = vast t.o.v. het scherm, sticky = plakt bij scrollen (y = afstand tot boven).
 */
export interface Position {
  mode?: 'flow' | 'absolute' | 'fixed' | 'sticky';
  x?: number;
  y?: number;
  anchorX?: 'left' | 'right' | 'center' | 'stretch';
  anchorY?: 'top' | 'bottom' | 'center' | 'stretch';
  z?: number;
}

/**
 * Kleuren mogen een token zijn: "token:bg" → var(--bg).
 */
export interface Style {
  fill?: string;
  /** CSS-verloop over de vulling, bv. linear-gradient(to top, #000a, transparent). */
  gradient?: string;
  fillImage?: string; // asset-id als achtergrondafbeelding
  color?: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadow?: string;
  blur?: number;
  overflow?: 'visible' | 'hidden';
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase';
  objectFit?: 'cover' | 'contain';
  cursor?: 'pointer' | 'default';
  /** Omlijnde tekst: alleen de rand in deze kleur, binnenkant transparant. */
  textOutline?: string;
  /** Tekst niet laten afbreken (handig voor grote bewegende typografie). */
  noWrap?: boolean;
  /** Verticale tekst (van boven naar beneden), bv. grote woorden langs de rand van een sectie. */
  writingMode?: 'vertical';
  /** Uitgebreide tekstopmaak. */
  italic?: boolean;
  decoration?: 'underline' | 'line-through';
  /** Tekstschaduw: een voorinstelling of eigen CSS (bv. "0 2px 8px #0008"). */
  textShadow?: 'soft' | 'hard' | 'glow' | 'neon' | 'long' | string;
  /** Verlooptekst: van kleur naar kleur (tokens of hex). */
  textGradient?: [string, string];
  /** Hoeveel regels maximaal, daarna "…". */
  lineClamp?: number;
  /** Mooier afbreken: koppen gebalanceerd, lopende tekst zonder weeswoorden. */
  textWrap?: 'balance' | 'pretty';
  /** Tekst in kolommen (zoals een krant). */
  columns?: number;
  smallCaps?: boolean;
  /** Cijfers even breed (handig voor tellers en tabellen). */
  tabularNums?: boolean;
  /** Mengmodus met wat eronder ligt (zoals in Photoshop/Figma). */
  blend?: 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
  /** Beeldfilters op de laag zelf. Percentages: 100 = normaal. */
  filters?: { blur?: number; grayscale?: number; brightness?: number; contrast?: number; saturate?: number; hue?: number; sepia?: number };
  /** Masker: laat de laag zacht uitlopen of geef hem een vorm. */
  mask?: 'fade-bottom' | 'fade-top' | 'fade-x' | 'fade-y' | 'circle' | 'arch' | 'diamond' | 'blob';
  /** Rotatie in graden (met de klok mee). Staat los van animaties, dus effecten blijven werken. */
  rotate?: number;
  /** Horizontaal / verticaal spiegelen. */
  flipX?: boolean;
  flipY?: boolean;
  /** Visueel schalen (1 = 100%), inclusief alles erin. Verandert de ruimte in de layout niet. */
  scale?: number;
  /** Draaipunt voor rotatie en spiegelen. */
  origin?: TransformOrigin;
}

export type TransformOrigin = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right';

/** Alles wat per breakpoint kan verschillen. */
export interface ResponsiveProps {
  layout?: Layout;
  size?: Size;
  position?: Position;
  style?: Style;
  hidden?: boolean;
}

// ── Interacties en effecten (zoals Figma Sites) ───────────────

/** Een beweging/toestand: verschuiving in px, schaal, rotatie in graden, dekking 0..1, vervaging in px. */
export interface Motion {
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  blur?: number;
  /** Alleen bij hover: tekst-/iconkleur (ook SVG-kleur 1). */
  color?: string;
  /** Alleen bij hover: achtergrondkleur. */
  bg?: string;
}

export type Easing = 'ease' | 'ease-out' | 'ease-in-out' | 'linear' | 'smooth' | 'spring';

export interface Effects {
  /** Hover effect: alleen met muis (niet op telefoons en tablets). */
  hover?: Motion & { duration?: number; easing?: Easing };
  /** Press effect: zolang erop gedrukt/geklikt wordt. */
  press?: Motion & { duration?: number };
  /** Reveal: verschijnen bij in beeld komen of bij laden. */
  reveal?: {
    from: Motion;
    trigger?: 'inView' | 'load';
    duration?: number;
    delay?: number;
    easing?: Easing;
    /** Kinderen één voor één laten verschijnen, met deze vertraging (ms) ertussen. */
    stagger?: number;
    /** Opnieuw afspelen telkens als het in beeld komt. */
    repeat?: boolean;
  };
  /** Scroll transform: van → naar terwijl de laag door het scherm scrollt (0 = komt binnen, 1 = verlaat). */
  scroll?: { from: Motion; to: Motion; start?: number; end?: number };
  /** Scroll parallax: -1..1; positief = langzamer dan de pagina (diepte), negatief = sneller. */
  parallax?: { speed: number };
  /** Mouse parallax: maximale verschuiving in px; negatief = tegen de muis in. */
  mouse?: { strength: number };
  /** Marquee: inhoud loopt eindeloos door. Snelheid in px per seconde. */
  marquee?: { direction?: 'left' | 'right'; speed?: number; pauseOnHover?: boolean };
  /** Tekst-animatie bij in beeld komen. */
  /** Tekst-animatie: typemachine, scramble, woord-voor-woord, of cijfers die optellen (bv. "15K+"). */
  text?: { kind: 'typewriter' | 'scramble' | 'words' | 'count' | 'letters'; duration?: number };
  /** Kleurveeg: bij hover schuift een nieuwe tekstkleur van links naar rechts over de tekst. */
  sweep?: { color: string; duration?: number };
  /** Reageert als de omliggende link/kaart gehoverd wordt (niet alleen de laag zelf). */
  groupHover?: Motion & { duration?: number };
  /** 3D-kantelen richting de muis. */
  tilt?: { max: number };
  /** Letters springen los als je eroverheen beweegt (bij letters-animatie). */
  jelly?: boolean;
  /** Doorlopende animatie: zweven, pulseren, wiebelen, twinkelen of een vallende ster. */
  loop?: { kind: 'float' | 'pulse' | 'wiggle' | 'twinkle' | 'shoot'; duration?: number; delay?: number };
  /** Magnetisch: schuift een stukje mee naar de muis (knoppen, iconen). */
  magnetic?: { strength: number };
  /** Blijft ronddraaien; seconden per rondje. */
  spin?: { duration: number };
  /** Afbeelding groot openen bij klikken. */
  lightbox?: boolean;
  /** Effecten ook op telefoons uitvoeren (standaard aan). */
  mobile?: boolean;
}

export interface BaseNode extends ResponsiveProps {
  id: string;
  type: NodeType;
  name: string;
  locked?: boolean;
  /** HTML-id, zodat je ernaar kunt linken met #anker (scroll to). */
  anchor?: string;
  /** Toegankelijke naam voor schermlezers. */
  ariaLabel?: string;
  /** Notitie voor jezelf of een meekijker; alleen zichtbaar in de Studio. */
  note?: string;
  /** Gedeelde stijl uit het thema (theme.styles). Eigen stijl van de laag gaat erboven. */
  styleRef?: string;
  /** Vertalingen per taalcode: tekst (tekstlaag), label (knop) of alt-tekst (afbeelding). */
  i18n?: Record<string, string>;
  effects?: Effects;
  /** Kleurschema uit het thema (zoals Squarespace section themes): alles erin past zich aan. */
  scheme?: string;
  /** Link op een willekeurige laag: maakt er een <a> van. */
  href?: string;
  newTab?: boolean;
  /** Alleen tonen als een sjabloonvariabele gevuld is, bv. "project.video" (of "!project.video" voor juist niet). */
  when?: string;
  /** Extra data-attributen (alleen letters/cijfers in de sleutel), bv. voor filters. */
  data?: Record<string, string>;
  responsive?: Partial<Record<Exclude<Breakpoint, 'desktop'>, ResponsiveProps>>;
  children?: VNode[];
}

export interface FrameNode extends BaseNode {
  type: 'frame';
  /** details/summary = uitklapblok (bv. veelgestelde vragen): de eerste laag (summary) is de klikbare vraag. */
  tag?: 'div' | 'section' | 'header' | 'footer' | 'nav' | 'main' | 'article' | 'details' | 'summary';
  /** In het projectsjabloon: hier komt de eigen inhoud van een project. */
  slot?: boolean;
  children: VNode[];
}

export interface TextNode extends BaseNode {
  type: 'text';
  /** Ondersteunt **vet**, *cursief* en [link](https://…). */
  content: string;
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'span';
  /** Tekststijl uit het thema; zonder stijl volgt een kop (h1–h4) de gelijknamige stijl. */
  textStyle?: import('./theme.js').TextStyleKey;
}

export interface ImageNode extends BaseNode {
  type: 'image';
  asset?: string;
  src?: string;
  alt?: string;
  /** Focuspunt in procenten (0–100): dit deel blijft altijd in beeld bij bijsnijden. */
  focus?: { x: number; y: number };
  /** Inzoomen binnen het kader (100 = normaal). */
  crop?: number;
  /** Bijschrift, ook getoond in de lightbox. */
  caption?: string;
}

export interface VideoNode extends BaseNode {
  type: 'video';
  asset?: string;
  src?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  /** Toon een knop om het geluid aan te zetten (voor de showreel). */
  soundToggle?: boolean;
}

export interface ButtonNode extends BaseNode {
  type: 'button';
  label: string;
  /** Knopstijl uit het thema (standaard: primair). */
  variant?: import('./theme.js').ButtonKey;
  /** Optioneel icoon (SVG uit de bibliotheek) achter de tekst. */
  icon?: string;
}

export interface EmbedNode extends BaseNode {
  type: 'embed';
  /** Alleen een URL voor een iframe (YouTube, Vimeo, ...). Geen losse HTML. */
  url: string;
  /** YouTube/Vimeo: vanzelf (en dus gedempt) afspelen. */
  autoplay?: boolean;
  /** Opnieuw beginnen als de video klaar is. */
  loop?: boolean;
  /** Bedieningsknoppen tonen (standaard aan). */
  controls?: boolean;
}

export interface InstanceNode extends BaseNode {
  type: 'instance';
  component: string;
  /** Per node-id in de component: tekst, asset of link vervangen. */
  overrides?: Record<string, { content?: string; asset?: string; href?: string; label?: string; hidden?: boolean }>;
}

export interface CollectionNode extends BaseNode {
  type: 'collection';
  source: 'projects';
  limit?: number;
  category?: string;
  featuredOnly?: boolean;
  /** Raster met kaarten of een lijst (index) met een zwevend voorbeeldbeeld bij hover. */
  view?: 'grid' | 'index';
  /** Filterknoppen per categorie boven de projecten (werkt ook voor andere collecties in dezelfde sectie). */
  filters?: boolean;
  /** Knoppen om te wisselen tussen raster en lijst (zet op de collectie met de filters; de andere weergave staat in dezelfde sectie). */
  viewToggle?: boolean;
}

/**
 * Inline SVG met bewerkbare kleuren. In de SVG staan kleuren als var(--svg-1), var(--svg-2), ...
 * en `colors` vult die in (hex of token:rol/palet).
 */
export interface SvgNode extends BaseNode {
  type: 'svg';
  svg: string;
  colors?: string[];
  /** Uitrekken (voor scheidingen) of verhouding behouden (iconen). */
  stretch?: boolean;
}

export interface FormField {
  id: string;
  label: string;
  kind: 'text' | 'email' | 'tel' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormNode extends BaseNode {
  type: 'form';
  fields: FormField[];
  submitLabel?: string;
  successMessage?: string;
}

export type VNode =
  | FrameNode
  | TextNode
  | ImageNode
  | VideoNode
  | ButtonNode
  | EmbedNode
  | InstanceNode
  | CollectionNode
  | FormNode
  | SvgNode;

// ── Opgeslagen entiteiten ────────────────────────────────────

export interface DesignTokens {
  colors: Record<string, string>;
  fonts: Record<string, string>;
}

export interface Redirect {
  from: string;
  to: string;
  /** 301 (permanent, standaard) of 302 (tijdelijk). */
  status?: 301 | 302;
}

export interface SiteSeo {
  /** Taal van de site, bv. 'nl'. */
  lang?: string;
  /** Titelopbouw, %s = paginatitel. Standaard: "%s — Sitenaam". */
  titleTemplate?: string;
  /** Wie er achter de site zit, voor Google (structured data). */
  entity?: { type: 'Person' | 'Organization'; name?: string; logo?: string; email?: string; sameAs?: string[]; jobTitle?: string };
  googleVerification?: string;
  bingVerification?: string;
  twitterHandle?: string;
  /** Hele site verbergen voor zoekmachines (bv. tijdens het bouwen). */
  noindex?: boolean;
  /** Eigen code in <head>, bv. privacyvriendelijke statistieken. */
  headCode?: string;
}

export interface SiteSettings {
  name: string;
  domain?: string;
  description?: string;
  /** Optionele <link href> voor webfonts (liever: thema → lettertypes). */
  fontsHref?: string;
  /** @deprecated Vervangen door theme; blijft voor oude data. */
  tokens?: DesignTokens;
  theme?: import('./theme.js').Theme;
  seo?: SiteSeo;
  redirects?: Redirect[];
  /** Site vergrendelen voor bezoekers (het wachtwoord zelf staat apart en veilig op de server). */
  access?: {
    mode: 'open' | 'maintenance' | 'password';
    title?: string;
    message?: string;
  };
  favicon?: string;
  socialImage?: string;
  /** Extra talen naast de hoofdtaal (seo.lang). Elke taal krijgt eigen adressen: /en/, /en/work/… */
  languages?: string[];
  /** Taalknopje (NL · EN) rechtsonder op de site tonen. Standaard aan als er extra talen zijn. */
  languageSwitcher?: boolean;
  /** Beelden groot openen met een klik: alleen op projectpagina's (standaard), overal, of uit. */
  lightbox?: 'projects' | 'all' | 'off';
  /** Vloeiende overgang tussen pagina's. Standaard: vervagen. */
  pageTransition?: 'none' | 'fade' | 'slide' | 'zoom' | 'wipe';
  /** Knop waarmee bezoekers tussen licht en donker wisselen. `alt` = kleurenschema voor de andere modus (leeg = automatisch). */
  colorMode?: { toggle: boolean; alt?: string };
  /** Bezoekersstatistieken: Vercel Web Analytics (werkt alleen als de site op Vercel staat). */
  analytics?: 'off' | 'vercel';
  /** Label-cursor ("Bekijk") boven projecten. 'default' = uit. */
  cursor?: 'default' | 'star';
  /**
   * Optioneel: media vanaf een eigen domein serveren (bv. https://media.jouwdomein.nl).
   * Handig als de site op Cloudflare Pages staat en video's te groot zijn om mee te uploaden.
   */
  mediaBaseUrl?: string;
  /** Adres van de server voor formulieren, als de site ergens anders gehost wordt. */
  formEndpoint?: string;
}

export interface Seo {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
  /** Eigen canonical-URL (alleen als de inhoud elders "het origineel" is). */
  canonical?: string;
  /** Soort pagina voor Google. */
  schemaType?: 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage';
  /** Belangrijkste zoekterm, alleen voor de SEO-check. */
  focusKeyword?: string;
  /** Titel en omschrijving per extra taal. */
  i18n?: Record<string, { title?: string; description?: string }>;
}

export interface Page {
  id: string;
  slug: string; // '' = homepage
  title: string;
  kind: 'page' | 'project-template';
  tree: FrameNode;
  seo: Seo;
  status: 'draft' | 'live';
  updatedAt: string;
  publishedAt?: string | null;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  client?: string;
  year?: string;
  category?: string;
  summary?: string;
  cover?: string; // asset-id
  /** YouTube- of Vimeo-link: geeft automatisch een embed en (zonder cover) een thumbnail. */
  video?: string;
  /** Inhoud van de projectpagina; leeg = alleen het projectsjabloon. */
  tree?: FrameNode | null;
  featured?: boolean;
  published?: boolean;
  sort: number;
  /** Vertalingen van de projectgegevens per taalcode. */
  i18n?: Record<string, { title?: string; summary?: string; category?: string; client?: string }>;
}

export interface Component {
  id: string;
  name: string;
  tree: FrameNode;
  updatedAt: string;
}

export interface AssetVariant {
  width: number;
  url: string;
  type: string;
}

export interface Asset {
  id: string;
  kind: 'image' | 'video' | 'font' | 'file';
  url: string;
  originalName: string;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  variants: AssetVariant[];
  poster?: string | null;
  alt?: string;
  status: 'ready' | 'processing' | 'error';
  createdAt: string;
}
