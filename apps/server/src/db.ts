import Database from './sqlite.js';
import {
  DEFAULT_SITE,
  siteTheme,
  type Theme,
  vystaraComponents,
  vystaraPages,
  vystaraSite,
  legacyProjects,
  uid,
  type Asset,
  type Component,
  type FrameNode,
  type Page,
  type Project,
  type SiteSettings,
  templateContent,
} from '@vystara/core';
import { config, paths } from './config.js';

export const db = new Database(paths.db);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS site (id INTEGER PRIMARY KEY CHECK (id = 1), settings TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pass_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'page',
  tree TEXT NOT NULL, seo TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'live',
  sort INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, published_at TEXT
);
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, client TEXT, year TEXT, category TEXT,
  summary TEXT, cover TEXT, tree TEXT, featured INTEGER NOT NULL DEFAULT 0, published INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS components (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, tree TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, url TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL,
  size INTEGER NOT NULL, width INTEGER, height INTEGER, variants TEXT NOT NULL DEFAULT '[]', poster TEXT,
  alt TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ready', created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY, doc_kind TEXT NOT NULL, doc_id TEXT NOT NULL, tree TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS revisions_doc ON revisions(doc_kind, doc_id, created_at);
CREATE TABLE IF NOT EXISTS themes (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS section_templates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Eigen', tree TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

// Kleine migraties voor bestaande databases.
const cols = (t: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
if (!cols('projects').includes('video')) db.exec('ALTER TABLE projects ADD COLUMN video TEXT');
if (!cols('projects').includes('i18n')) db.exec('ALTER TABLE projects ADD COLUMN i18n TEXT');

const now = () => new Date().toISOString();
const j = <T>(s: string | null | undefined, fallback: T): T => (s ? (JSON.parse(s) as T) : fallback);

// ── Site ─────────────────────────────────────────────────────
export function getSite(): SiteSettings {
  const row = db.prepare('SELECT settings FROM site WHERE id = 1').get() as { settings: string } | undefined;
  const s: SiteSettings = row ? { ...DEFAULT_SITE, ...JSON.parse(row.settings) } : structuredClone(DEFAULT_SITE);
  // Oude sites zonder thema: thema afleiden uit de oude tokens.
  if (row && !JSON.parse(row.settings).theme) s.theme = siteTheme({ ...s, theme: undefined });
  return s;
}
export function saveSite(s: SiteSettings) {
  db.prepare('INSERT INTO site (id, settings) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET settings = excluded.settings').run(JSON.stringify(s));
}

// ── Pagina's ─────────────────────────────────────────────────
type PageRow = { id: string; slug: string; title: string; kind: string; tree: string; seo: string; status: string; sort: number; updated_at: string; published_at: string | null };
const toPage = (r: PageRow): Page & { sort: number } => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  kind: r.kind as Page['kind'],
  tree: JSON.parse(r.tree),
  seo: j(r.seo, {}),
  status: r.status as Page['status'],
  sort: r.sort,
  updatedAt: r.updated_at,
  publishedAt: r.published_at,
});

export function listPages() {
  return (db.prepare('SELECT * FROM pages ORDER BY sort, title').all() as PageRow[]).map(toPage);
}
export function getPage(id: string) {
  const r = db.prepare('SELECT * FROM pages WHERE id = ?').get(id) as PageRow | undefined;
  return r ? toPage(r) : null;
}
export function getProjectTemplate() {
  const r = db.prepare("SELECT * FROM pages WHERE kind = 'project-template' LIMIT 1").get() as PageRow | undefined;
  return r ? toPage(r) : null;
}
export function createPage(p: { slug: string; title: string; kind?: Page['kind']; tree: FrameNode; seo?: Page['seo']; sort?: number }) {
  const id = uid('p');
  db.prepare('INSERT INTO pages (id, slug, title, kind, tree, seo, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, p.slug, p.title, p.kind ?? 'page', JSON.stringify(p.tree), JSON.stringify(p.seo ?? {}), p.sort ?? 0, now(),
  );
  return getPage(id)!;
}
export function updatePage(id: string, patch: Partial<Pick<Page, 'slug' | 'title' | 'tree' | 'seo' | 'status'>> & { sort?: number }) {
  const cur = getPage(id);
  if (!cur) return null;
  if (patch.tree) maybeRevision('page', id, cur.tree, cur.updatedAt);
  const next = { ...cur, ...patch };
  // Adres veranderd? Automatisch een 301 van het oude naar het nieuwe adres (zoals Webflow voorstelt).
  if (patch.slug !== undefined && patch.slug !== cur.slug && cur.slug && cur.kind === 'page') addRedirect(`/${cur.slug}/`, next.slug ? `/${next.slug}/` : '/');
  db.prepare('UPDATE pages SET slug = ?, title = ?, tree = ?, seo = ?, status = ?, sort = ?, updated_at = ? WHERE id = ?').run(
    next.slug, next.title, JSON.stringify(next.tree), JSON.stringify(next.seo), next.status, next.sort, now(), id,
  );
  return getPage(id);
}
export function markPublished(id: string, at: string) {
  db.prepare('UPDATE pages SET published_at = ? WHERE id = ?').run(at, id);
}
export function deletePage(id: string) {
  db.prepare('DELETE FROM pages WHERE id = ?').run(id);
  db.prepare("DELETE FROM revisions WHERE doc_kind = 'page' AND doc_id = ?").run(id);
}

// ── Projecten ────────────────────────────────────────────────
type ProjectRow = { id: string; slug: string; title: string; video: string | null; i18n: string | null; client: string | null; year: string | null; category: string | null; summary: string | null; cover: string | null; tree: string | null; featured: number; published: number; sort: number; updated_at: string };
const toProject = (r: ProjectRow): Project & { updatedAt: string } => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  client: r.client ?? '',
  year: r.year ?? '',
  category: r.category ?? '',
  summary: r.summary ?? '',
  cover: r.cover ?? undefined,
  video: r.video ?? '',
  ...(r.i18n ? { i18n: j<Project['i18n']>(r.i18n, undefined) } : {}),
  tree: j<FrameNode | null>(r.tree, null),
  featured: !!r.featured,
  published: !!r.published,
  sort: r.sort,
  updatedAt: r.updated_at,
});
export function listProjects() {
  return (db.prepare('SELECT * FROM projects ORDER BY sort, title').all() as ProjectRow[]).map(toProject);
}
export function getProject(id: string) {
  const r = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  return r ? toProject(r) : null;
}
export function saveProject(p: Partial<Project> & { id?: string }) {
  const cur = p.id ? getProject(p.id) : null;
  const id = cur?.id ?? uid('pr');
  const next: Project = {
    slug: '', title: 'Nieuw project', sort: 0,
    ...(cur ?? {}),
    ...p,
    id,
  } as Project;
  if (cur && p.tree && cur.tree) maybeRevision('project', id, cur.tree, cur.updatedAt);
  db.prepare(`INSERT INTO projects (id, slug, title, client, year, category, summary, cover, video, i18n, tree, featured, published, sort, updated_at)
    VALUES (@id, @slug, @title, @client, @year, @category, @summary, @cover, @video, @i18n, @tree, @featured, @published, @sort, @updated_at)
    ON CONFLICT(id) DO UPDATE SET slug=@slug, title=@title, client=@client, year=@year, category=@category, summary=@summary,
    cover=@cover, video=@video, i18n=@i18n, tree=@tree, featured=@featured, published=@published, sort=@sort, updated_at=@updated_at`).run({
    id,
    slug: next.slug || slugify(next.title) || id,
    title: next.title,
    client: next.client ?? null,
    year: next.year ?? null,
    category: next.category ?? null,
    summary: next.summary ?? null,
    cover: next.cover ?? null,
    video: next.video ?? null,
    i18n: next.i18n && Object.keys(next.i18n).length ? JSON.stringify(next.i18n) : null,
    tree: next.tree ? JSON.stringify(next.tree) : null,
    featured: next.featured ? 1 : 0,
    published: next.published === false ? 0 : 1,
    sort: next.sort ?? 0,
    updated_at: now(),
  });
  return getProject(id)!;
}
export function deleteProject(id: string) {
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

// ── Componenten ──────────────────────────────────────────────
type CompRow = { id: string; name: string; tree: string; updated_at: string };
const toComp = (r: CompRow): Component => ({ id: r.id, name: r.name, tree: JSON.parse(r.tree), updatedAt: r.updated_at });
export function listComponents() {
  return (db.prepare('SELECT * FROM components ORDER BY name').all() as CompRow[]).map(toComp);
}
export function getComponent(id: string) {
  const r = db.prepare('SELECT * FROM components WHERE id = ?').get(id) as CompRow | undefined;
  return r ? toComp(r) : null;
}
export function saveComponent(c: { id?: string; name: string; tree: FrameNode }) {
  const id = c.id ?? uid('c');
  const cur = getComponent(id);
  if (cur) maybeRevision('component', id, cur.tree, cur.updatedAt);
  db.prepare(`INSERT INTO components (id, name, tree, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, tree = excluded.tree, updated_at = excluded.updated_at`).run(id, c.name, JSON.stringify(c.tree), now());
  return getComponent(id)!;
}
export function deleteComponent(id: string) {
  db.prepare('DELETE FROM components WHERE id = ?').run(id);
}

// ── Assets ───────────────────────────────────────────────────
type AssetRow = { id: string; kind: string; url: string; original_name: string; mime: string; size: number; width: number | null; height: number | null; variants: string; poster: string | null; alt: string; status: string; created_at: string };
const toAsset = (r: AssetRow): Asset => ({
  id: r.id,
  kind: r.kind as Asset['kind'],
  url: r.url,
  originalName: r.original_name,
  mime: r.mime,
  size: r.size,
  width: r.width,
  height: r.height,
  variants: JSON.parse(r.variants),
  poster: r.poster,
  alt: r.alt,
  status: r.status as Asset['status'],
  createdAt: r.created_at,
});
export function listAssets() {
  return (db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all() as AssetRow[]).map(toAsset);
}
export function getAsset(id: string) {
  const r = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined;
  return r ? toAsset(r) : null;
}
export function saveAsset(a: Asset) {
  db.prepare(`INSERT INTO assets (id, kind, url, original_name, mime, size, width, height, variants, poster, alt, status, created_at)
    VALUES (@id, @kind, @url, @originalName, @mime, @size, @width, @height, @variants, @poster, @alt, @status, @createdAt)
    ON CONFLICT(id) DO UPDATE SET url=@url, width=@width, height=@height, variants=@variants, poster=@poster, alt=@alt, status=@status`).run({
    ...a,
    width: a.width ?? null,
    height: a.height ?? null,
    poster: a.poster ?? null,
    alt: a.alt ?? '',
    variants: JSON.stringify(a.variants),
  });
}
export function deleteAssetRow(id: string) {
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
}

// ── Revisies ─────────────────────────────────────────────────
const REVISION_INTERVAL_MS = 2 * 60 * 1000;
const REVISION_KEEP = 100;

/** Bewaar de vorige versie, maar hooguit eens per 2 minuten per document. */
function maybeRevision(kind: string, docId: string, tree: FrameNode, prevUpdatedAt: string, note?: string, force = false) {
  const last = db.prepare('SELECT created_at FROM revisions WHERE doc_kind = ? AND doc_id = ? ORDER BY created_at DESC LIMIT 1').get(kind, docId) as { created_at: string } | undefined;
  if (!force && last && Date.now() - Date.parse(last.created_at) < REVISION_INTERVAL_MS) return;
  db.prepare('INSERT INTO revisions (id, doc_kind, doc_id, tree, note, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    uid('r'), kind, docId, JSON.stringify(tree), note ?? null, force ? now() : prevUpdatedAt,
  );
  db.prepare(`DELETE FROM revisions WHERE doc_kind = ? AND doc_id = ? AND id NOT IN (
    SELECT id FROM revisions WHERE doc_kind = ? AND doc_id = ? ORDER BY created_at DESC LIMIT ?)`).run(kind, docId, kind, docId, REVISION_KEEP);
}
export function addRevision(kind: string, docId: string, tree: FrameNode, note: string) {
  maybeRevision(kind, docId, tree, now(), note, true);
}
export function listRevisions(kind: string, docId: string) {
  return db.prepare('SELECT id, note, created_at AS createdAt FROM revisions WHERE doc_kind = ? AND doc_id = ? ORDER BY created_at DESC').all(kind, docId);
}
export function getRevision(id: string) {
  const r = db.prepare('SELECT * FROM revisions WHERE id = ?').get(id) as { id: string; doc_kind: string; doc_id: string; tree: string } | undefined;
  return r ? { ...r, tree: JSON.parse(r.tree) as FrameNode } : null;
}

// ── Hulpjes ──────────────────────────────────────────────────
export function slugify(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Eerste start: standaardsite, componenten, pagina's en voorbeeldprojecten. */
export function seedIfEmpty() {
  const count = (db.prepare('SELECT COUNT(*) AS n FROM pages').get() as { n: number }).n;
  if (count > 0) return false;
  if (config.edition === 'folio') {
    // Folio: nieuwe site op basis van het gekozen sjabloon (neutraal, zonder merk).
    const t = templateContent(config.template, config.siteName);
    db.transaction(() => {
      saveSite(t.site);
      for (const c of t.components) saveComponent(c);
      t.pages.forEach((p, i) => createPage({ ...p, sort: i }));
      for (const p of t.projects) saveProject(p);
    })();
    return true;
  }
  const tx = db.transaction(() => {
    // Nieuwe installatie: meteen de Vystara-startsite (zonder beelden; die komen via Site → Startsite).
    saveSite(vystaraSite(DEFAULT_SITE));
    for (const c of vystaraComponents()) saveComponent(c);
    vystaraPages().forEach((p, i) => createPage({ ...p, sort: i }));
    for (const p of legacyProjects()) saveProject(p);
  });
  tx();
  return true;
}

// ── Eigen thema's ────────────────────────────────────────────
export function listThemes(): Theme[] {
  return (db.prepare('SELECT data FROM themes ORDER BY updated_at DESC').all() as { data: string }[]).map((r) => JSON.parse(r.data));
}
export function saveTheme(t: Theme): Theme {
  const id = t.id && !t.id.startsWith('preset:') ? t.id : uid('t');
  const theme = { ...t, id };
  db.prepare(`INSERT INTO themes (id, name, data, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, data = excluded.data, updated_at = excluded.updated_at`).run(id, t.name, JSON.stringify(theme), now());
  return theme;
}
export function deleteTheme(id: string) {
  db.prepare('DELETE FROM themes WHERE id = ?').run(id);
}

// ── Opgeslagen secties ───────────────────────────────────────
export function listSectionTemplates() {
  return (db.prepare('SELECT * FROM section_templates ORDER BY created_at DESC').all() as { id: string; name: string; category: string; tree: string; created_at: string }[]).map((r) => ({
    id: r.id, name: r.name, category: r.category, tree: JSON.parse(r.tree) as FrameNode, createdAt: r.created_at,
  }));
}
export function saveSectionTemplate(t: { name: string; category?: string; tree: FrameNode }) {
  const id = uid('s');
  db.prepare('INSERT INTO section_templates (id, name, category, tree, created_at) VALUES (?, ?, ?, ?, ?)').run(id, t.name, t.category || 'Eigen', JSON.stringify(t.tree), now());
  return listSectionTemplates().find((x) => x.id === id)!;
}
export function deleteSectionTemplate(id: string) {
  db.prepare('DELETE FROM section_templates WHERE id = ?').run(id);
}

// ── Geheimen (tokens) en losse instellingen ──────────────────
// Geheimen gaan nooit terug naar de Studio; alleen of ze ingesteld zijn.
export function getSecret(key: string): string | null {
  return (db.prepare('SELECT value FROM secrets WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? null;
}
export function setSecret(key: string, value: string | null) {
  if (value) db.prepare('INSERT INTO secrets (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
  else db.prepare('DELETE FROM secrets WHERE key = ?').run(key);
}
export function getKv<T>(key: string, fallback: T): T {
  const r = db.prepare('SELECT value FROM kv WHERE key = ?').get(key) as { value: string } | undefined;
  return r ? (JSON.parse(r.value) as T) : fallback;
}
export function setKv(key: string, value: unknown) {
  db.prepare('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
}

export function addRedirect(from: string, to: string) {
  const site = getSite();
  const list = (site.redirects ?? []).filter((r) => r.from !== from && r.from !== to);
  list.push({ from, to, status: 301 });
  saveSite({ ...site, redirects: list });
}

/** Meerdere schrijfacties als één geheel. */
export function transaction(fn: () => void) {
  return db.transaction(fn);
}

/** Is er al met de hand iets aangepast (dan installeren we niets automatisch)? */
export function hasEdits(): boolean {
  return (db.prepare('SELECT COUNT(*) AS n FROM revisions').get() as { n: number }).n > 0;
}
