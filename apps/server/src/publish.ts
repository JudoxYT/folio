import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  assetUrl,
  mediaUrl,
  videoEmbed,
  expandTree,
  renderDocument,
  usedAssets,
  walk,
  type Asset,
  type FrameNode,
  type Page,
  type Project,
  extraLangs,
  langPath,
  localizeLinks,
  localizeProject,
  localizeTree,
  mainLang,
} from '@vystara/core';
import { config, paths } from './config.js';
import { allForms } from './forms.js';
import { getProjectTemplate, getSite, listAssets, listComponents, listPages, listProjects, addRevision, markPublished } from './db.js';

function loadContext() {
  const site = getSite();
  const assets: Record<string, Asset> = Object.fromEntries(listAssets().map((a) => [a.id, a]));
  const components = Object.fromEntries(listComponents().map((c) => [c.id, c]));
  const projects = listProjects();
  return { site, assets, components, projects, year: String(new Date().getFullYear()) };
}

/** Projectsjabloon + eigen projectinhoud in het slot. */
export function projectTree(template: FrameNode, project: Project): FrameNode {
  const tree = structuredClone(template);
  if (project.tree?.children?.length) {
    walk(tree, (n) => {
      if (n.type === 'frame' && n.slot) {
        n.children = structuredClone(project.tree!.children);
        return false;
      }
    });
  }
  return tree;
}

// ── Structured data (JSON-LD) ────────────────────────────────
function abs(ctx: ReturnType<typeof loadContext>, p: string) {
  return ctx.site.domain ? `https://${ctx.site.domain}${p}` : p;
}

function entityLd(ctx: ReturnType<typeof loadContext>) {
  const e = ctx.site.seo?.entity;
  const logo = e?.logo ? assetUrl(ctx.assets[e.logo], 512) : undefined;
  return {
    '@type': e?.type ?? 'Organization',
    '@id': abs(ctx, '/#entity'),
    name: e?.name || ctx.site.name,
    url: abs(ctx, '/'),
    ...(logo ? { [e?.type === 'Person' ? 'image' : 'logo']: abs(ctx, mediaUrl(ctx.site, logo)!) } : {}),
    ...(e?.email ? { email: e.email } : {}),
    ...(e?.jobTitle && e.type === 'Person' ? { jobTitle: e.jobTitle } : {}),
    ...(e?.sameAs?.length ? { sameAs: e.sameAs.filter(Boolean) } : {}),
  };
}

function pageLd(ctx: ReturnType<typeof loadContext>, page: Page): object[] {
  const path = page.slug ? `/${page.slug}/` : '/';
  const out: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': page.seo.schemaType ?? 'WebPage',
      '@id': abs(ctx, path),
      url: abs(ctx, path),
      name: page.seo.title || page.title,
      ...(page.seo.description ? { description: page.seo.description } : {}),
      inLanguage: ctx.site.seo?.lang ?? 'nl',
      isPartOf: { '@type': 'WebSite', '@id': abs(ctx, '/#website'), name: ctx.site.name, url: abs(ctx, '/'), publisher: { '@id': abs(ctx, '/#entity') } },
    },
  ];
  if (!page.slug) out.push({ '@context': 'https://schema.org', ...entityLd(ctx) });
  return out;
}

function projectLd(ctx: ReturnType<typeof loadContext>, pr: Project): object[] {
  const path = `/work/${pr.slug}/`;
  const img = pr.cover ? abs(ctx, mediaUrl(ctx.site, assetUrl(ctx.assets[pr.cover], 1600))!) : videoEmbed(pr.video)?.thumb;
  const v = videoEmbed(pr.video);
  const work: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': v ? 'VideoObject' : 'CreativeWork',
    '@id': abs(ctx, path),
    name: pr.title,
    url: abs(ctx, path),
    ...(pr.summary ? { description: pr.summary } : {}),
    ...(img ? (v ? { thumbnailUrl: img } : { image: img }) : {}),
    ...(v ? { embedUrl: v.embed, uploadDate: pr.year ? `${pr.year}-01-01` : undefined } : {}),
    ...(pr.year ? { dateCreated: pr.year } : {}),
    ...(pr.category ? { genre: pr.category } : {}),
    creator: { '@id': abs(ctx, '/#entity') },
  };
  const crumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs(ctx, '/') },
      { '@type': 'ListItem', position: 2, name: 'Werk', item: abs(ctx, '/work/') },
      { '@type': 'ListItem', position: 3, name: pr.title, item: abs(ctx, path) },
    ],
  };
  return [JSON.parse(JSON.stringify(work)), crumbs];
}

type Ctx = ReturnType<typeof loadContext>;

/** Context met vertaalde componenten en projecten (voor een extra taal). */
function langCtx(ctx: Ctx, lang: string | undefined): Ctx {
  if (!lang || lang === mainLang(ctx.site)) return ctx;
  return {
    ...ctx,
    components: Object.fromEntries(Object.entries(ctx.components).map(([k, c]) => [k, { ...c, tree: localizeTree(c.tree, lang) }])),
    projects: ctx.projects.map((p) => ({ ...p, ...localizeProject(p, lang) })),
  };
}
const allLangs = (ctx: Ctx) => [mainLang(ctx.site), ...extraLangs(ctx.site)];
const alternates = (ctx: Ctx, path: string) => (extraLangs(ctx.site).length ? allLangs(ctx).map((l) => ({ lang: l, path: langPath(ctx.site, path, l) })) : undefined);

export function renderPage(page: Page, ctx = loadContext(), lang?: string): string {
  const extra = lang && lang !== mainLang(ctx.site) ? lang : undefined;
  const lc = langCtx(ctx, extra);
  let tree = expandTree(extra ? localizeTree(page.tree, extra) : page.tree, { ...lc, project: null });
  if (extra) tree = localizeLinks(tree, extra);
  const base = page.slug ? `/${page.slug}/` : '/';
  const tr = extra ? page.seo.i18n?.[extra] : undefined;
  const seo = tr ? { ...page.seo, title: tr.title || page.seo.title, description: tr.description || page.seo.description } : page.seo;
  return renderDocument(
    { title: tr?.title || page.title, seo, tree, path: langPath(ctx.site, base, extra ?? mainLang(ctx.site)), jsonLd: pageLd(ctx, page), lang: extra, alternates: alternates(ctx, base) },
    lc,
  );
}

export function renderProject(project: Project, ctx = loadContext(), lang?: string): string | null {
  const tpl = getProjectTemplate();
  if (!tpl) return null;
  const extra = lang && lang !== mainLang(ctx.site) ? lang : undefined;
  const lc = langCtx(ctx, extra);
  const pr = extra ? lc.projects.find((p) => p.id === project.id) ?? project : project;
  let tree = expandTree(projectTree(extra ? localizeTree(tpl.tree, extra) : tpl.tree, pr), { ...lc, project: pr });
  if (extra) tree = localizeLinks(tree, extra);
  const base = `/work/${project.slug}/`;
  return renderDocument(
    {
      title: pr.title,
      seo: { description: pr.summary, image: pr.cover },
      tree,
      path: langPath(ctx.site, base, extra ?? mainLang(ctx.site)),
      jsonLd: projectLd(ctx, pr),
      ogType: videoEmbed(project.video) ? 'video.other' : 'article',
      lang: extra,
      alternates: alternates(ctx, base),
    },
    lc,
  );
}

function writeFile(root: string, rel: string, content: string) {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export interface PublishResult {
  pages: number;
  projects: number;
  files: number;
  durationMs: number;
  commandOutput?: string;
}

export async function publish(): Promise<PublishResult> {
  const t0 = Date.now();
  const ctx = loadContext();
  const out = path.join(config.dataDir, `site-build-${t0}`);
  fs.mkdirSync(out, { recursive: true });
  const media = new Set<string>();
  const collect = (tree: FrameNode) => usedAssets(tree).forEach((id) => media.add(id));
  if (ctx.site.favicon) media.add(ctx.site.favicon);
  if (ctx.site.socialImage) media.add(ctx.site.socialImage);

  const pages = listPages().filter((p) => p.kind === 'page' && p.status !== 'draft');
  const tpl = getProjectTemplate();
  const projects = ctx.projects.filter((p) => p.published !== false);
  for (const lang of [undefined, ...extraLangs(ctx.site)]) {
    const pre = lang ? `${lang}/` : '';
    for (const p of pages) {
      const html = renderPage(p, ctx, lang);
      writeFile(out, `${pre}${p.slug ? `${p.slug}/` : ''}index.html`, html);
      if (!lang) collect(expandTree(p.tree, ctx));
      if (p.slug === '404' && !lang) writeFile(out, '404.html', html);
    }
    if (tpl) {
      for (const pr of projects) {
        writeFile(out, `${pre}work/${pr.slug}/index.html`, renderProject(pr, ctx, lang)!);
        if (!lang) collect(expandTree(projectTree(tpl.tree, pr), { ...ctx, project: pr }));
      }
    }
  }

  // Met een eigen media-domein blijven de bestanden op de server en gaan ze niet mee.
  // Alle /media/-verwijzingen in de gebouwde HTML (beeld, video, posters, fonts) meekopiëren.
  if (!ctx.site.mediaBaseUrl) copyReferencedMedia(out);
  void media;

  writeSeoFiles(out, ctx, pages, projects);
  writeFormFunction(out);

  // Atomisch wisselen: bezoekers zien nooit een halve site.
  const old = `${paths.site}-old-${t0}`;
  if (fs.existsSync(paths.site)) fs.renameSync(paths.site, old);
  fs.renameSync(out, paths.site);
  fs.rmSync(old, { recursive: true, force: true });

  const stamp = new Date().toISOString();
  for (const p of pages) {
    addRevision('page', p.id, p.tree, `Gepubliceerd ${stamp}`);
    markPublished(p.id, stamp);
  }

  let files = 0;
  const count = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? count(path.join(d, e.name)) : files++));
  count(paths.site);

  const result: PublishResult = { pages: pages.length, projects: projects.length, files, durationMs: Date.now() - t0 };
  if (config.publishCommand) result.commandOutput = await runPublishCommand();
  return result;
}

function runPublishCommand(): Promise<string> {
  return new Promise((resolve) => {
    const p = spawn(config.publishCommand, { shell: true, cwd: config.dataDir, env: { ...process.env, SITE_DIR: paths.site } });
    let log = '';
    p.stdout.on('data', (d) => (log += d));
    p.stderr.on('data', (d) => (log += d));
    p.on('close', (code) => resolve(`${log.slice(-4000)}\n(exit ${code})`));
  });
}

/** sitemap.xml, robots.txt, redirects voor Cloudflare Pages (_redirects) en Vercel (vercel.json). */
function writeSeoFiles(out: string, ctx: ReturnType<typeof loadContext>, pages: Page[], projects: (Project & { updatedAt?: string })[]) {
  const indexable = pages.filter((p) => !p.seo.noindex && p.slug !== '404');
  const day = (d?: string | null) => (d ? d.slice(0, 10) : new Date().toISOString().slice(0, 10));
  if (ctx.site.domain && !ctx.site.seo?.noindex) {
    const base = [
      ...indexable.map((p) => ({ loc: p.slug ? `/${p.slug}/` : '/', mod: day(p.updatedAt), pri: p.slug ? '0.8' : '1.0' })),
      ...projects.map((p) => ({ loc: `/work/${p.slug}/`, mod: day(p.updatedAt), pri: '0.6' })),
    ];
    const urls = [...base, ...extraLangs(ctx.site).flatMap((l) => base.map((u) => ({ ...u, loc: `/${l}${u.loc}` })))];
    writeFile(
      out,
      'sitemap.xml',
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
        .map((u) => `<url><loc>https://${ctx.site.domain}${u.loc}</loc><lastmod>${u.mod}</lastmod><priority>${u.pri}</priority></url>`)
        .join('\n')}\n</urlset>\n`,
    );
  }
  writeFile(
    out,
    'robots.txt',
    ctx.site.seo?.noindex
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n${ctx.site.domain ? `Sitemap: https://${ctx.site.domain}/sitemap.xml\n` : ''}`,
  );

  const redirects = (ctx.site.redirects ?? []).filter((r) => r.from && r.to);
  // Cloudflare Pages / Netlify
  writeFile(out, '_redirects', redirects.map((r) => `${r.from} ${r.to} ${r.status ?? 301}`).join('\n') + '\n');
  // Vercel: nette URL's, redirects, cache voor media en beveiligingsheaders.
  writeFile(
    out,
    'vercel.json',
    JSON.stringify(
      {
        cleanUrls: true,
        trailingSlash: true,
        redirects: redirects.map((r) => ({ source: r.from, destination: r.to, permanent: (r.status ?? 301) === 301 })),
        headers: [
          { source: '/media/(.*)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
          {
            source: '/(.*)',
            headers: [
              { key: 'X-Content-Type-Options', value: 'nosniff' },
              { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            ],
          },
        ],
      },
      null,
      2,
    ),
  );
}

/** Kopieer precies de mediabestanden waar de gebouwde pagina's naar verwijzen. */
function copyReferencedMedia(root: string) {
  const refs = new Set<string>();
  const scan = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) scan(full);
      else if (e.name.endsWith('.html')) for (const m of fs.readFileSync(full, 'utf8').matchAll(/\/media\/[A-Za-z0-9_\-./]+/g)) refs.add(m[0]);
    }
  };
  scan(root);
  for (const u of refs) {
    const rel = u.replace(/^\/media\//, '');
    if (rel.includes('..')) continue;
    const src = path.join(paths.media, rel);
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) continue;
    const dst = path.join(root, u);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

/**
 * Formulieren zonder dat de Studio aan hoeft te staan: een kleine serverless functie
 * voor Vercel (api/forms/submit.js). Die controleert de velden en stuurt het bericht naar
 * je Discord-webhook (FORM_WEBHOOK_URL in Vercel) en, als je dat wilt, ook naar je Studio
 * (STUDIO_URL), zodat het in je inbox komt.
 */
function writeFormFunction(out: string) {
  const forms = Object.fromEntries(
    allForms().map((f) => [f.id, { name: f.name, fields: f.fields.map((x) => ({ id: x.id, label: x.label, kind: x.kind, required: !!x.required, options: x.options })) }]),
  );
  const code = `// Gemaakt door Vystara Studio bij het publiceren. Niet met de hand aanpassen.
const FORMS = ${JSON.stringify(forms)};
const hits = new Map();
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Alleen POST' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  if (typeof body._hp === 'string' && body._hp.trim()) return res.json({ ok: true });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0];
  const now = Date.now(), list = (hits.get(ip) || []).filter((t) => now - t < 600000);
  if (list.length >= 5) return res.status(429).json({ error: 'Te veel berichten. Probeer het later opnieuw.' });
  hits.set(ip, [...list, now]);
  const id = String(body._form || ''), form = FORMS[id] || FORMS[id.split('__').pop()];
  if (!form) return res.status(404).json({ error: 'Formulier niet gevonden' });
  const data = {};
  for (const f of form.fields) {
    const v = String(body['f_' + f.id] || '').trim().slice(0, f.kind === 'textarea' ? 5000 : 500);
    if (f.required && !v) return res.status(400).json({ error: 'Vul "' + f.label + '" in' });
    if (v && f.kind === 'email' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v)) return res.status(400).json({ error: 'Dat e-mailadres klopt niet' });
    data[f.label] = v;
  }
  const lines = Object.entries(data).map(([k, v]) => '**' + k + ':** ' + v).join('\\n');
  const jobs = [];
  if (process.env.FORM_WEBHOOK_URL) jobs.push(fetch(process.env.FORM_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: ('📬 Nieuw bericht via **' + form.name + '**\\n' + lines).slice(0, 1990), allowed_mentions: { parse: [] } }) }));
  if (process.env.STUDIO_URL) jobs.push(fetch(process.env.STUDIO_URL.replace(/\\/$/, '') + '/api/forms/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  if (!jobs.length) return res.status(500).json({ error: 'Formulier is nog niet ingesteld (FORM_WEBHOOK_URL ontbreekt in Vercel).' });
  const results = await Promise.allSettled(jobs);
  if (results.every((r) => r.status === 'rejected')) return res.status(502).json({ error: 'Versturen mislukt, probeer het later opnieuw.' });
  return res.json({ ok: true });
};
`;
  fs.mkdirSync(path.join(out, 'api', 'forms'), { recursive: true });
  fs.writeFileSync(path.join(out, 'api', 'forms', 'submit.js'), code);
}
