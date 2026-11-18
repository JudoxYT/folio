import fs from 'node:fs';
import path from 'node:path';
import { Hono, type Context } from 'hono';
import { serve } from '@hono/node-server';
import { getConnInfo } from '@hono/node-server/conninfo';
import { config, paths } from './config.js';
import * as store from './db.js';
import * as auth from './auth.js';
import * as media from './media.js';
import { publish, renderPage, renderProject } from './publish.js';
import * as forms from './forms.js';
import * as deploy from './deploy.js';
import { downloadGoogleFont } from './fonts.js';
import * as starter from './starter.js';
import crypto from 'node:crypto';
import { zipDir } from './zip.js';
import { getCookie, setCookie } from 'hono/cookie';
import { renderLockPage, expandTree, extraLangs } from '@vystara/core';
import { frame } from '@vystara/core';

const fresh = store.seedIfEmpty();

const app = new Hono();

const ip = (c: Context) => c.req.header('cf-connecting-ip') ?? getConnInfo(c).remote.address ?? 'onbekend';
const bad = (c: Context, msg: string, code: 400 | 404 | 409 | 429 = 400) => c.json({ error: msg }, code);

// ── Over deze installatie (Vystara Studio of Folio) ─────────
app.get('/api/info', (c) => c.json({ edition: config.edition, productName: config.productName }));

// ── Inloggen ─────────────────────────────────────────────────
// Folio (desktop): de app meldt zichzelf aan met een geheime sleutel; er is geen wachtwoord nodig.
app.get('/api/auth/desktop', (c) => {
  const key = c.req.query('key') ?? '';
  const expected = config.desktopKey;
  const ok = !!expected && key.length === expected.length && crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
  if (!ok) return c.text('Niet toegestaan', 403);
  const id = auth.hasUsers() ? auth.firstUserId()! : auth.createUser('lokaal@folio.app', crypto.randomBytes(24).toString('base64url'));
  auth.startSession(c, id);
  return c.redirect('/studio/');
});

app.get('/api/auth/me', (c) => c.json({ user: auth.currentUser(c), needsSetup: !auth.hasUsers() }));

app.post('/api/auth/setup', async (c) => {
  if (auth.hasUsers()) return bad(c, 'Er bestaat al een account', 409);
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email?.includes('@') || (password ?? '').length < 10) return bad(c, 'Geldig mailadres en een wachtwoord van minstens 10 tekens nodig');
  const id = auth.createUser(email, password);
  auth.startSession(c, id);
  return c.json({ ok: true });
});

app.post('/api/auth/login', async (c) => {
  if (!auth.loginAllowed(ip(c))) return bad(c, 'Te veel pogingen, probeer het over 15 minuten opnieuw', 429);
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  const id = auth.checkLogin(email ?? '', password ?? '');
  if (!id) {
    auth.loginFailed(ip(c));
    return c.json({ error: 'Onjuist mailadres of wachtwoord' }, 401);
  }
  auth.startSession(c, id);
  return c.json({ ok: true });
});

app.post('/api/auth/logout', (c) => {
  auth.endSession(c);
  return c.json({ ok: true });
});

// ── Formulieren op de publieke site (geen login nodig) ───────
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' };
app.options('/api/forms/submit', (c) => c.body(null, 204, cors));
app.post('/api/forms/submit', async (c) => {
  const isJson = (c.req.header('content-type') ?? '').includes('application/json');
  let body: Record<string, unknown>;
  try {
    body = isJson ? await c.req.json() : ((await c.req.parseBody()) as Record<string, unknown>);
  } catch {
    return c.json({ error: 'Ongeldig verzoek' }, 400, cors);
  }
  const r = await forms.submitForm(body, ip(c));
  if (!isJson) {
    // Zonder JavaScript: terug naar de pagina met een melding in de URL.
    const back = c.req.header('referer') ?? '/';
    const u = new URL(back, 'http://x');
    u.searchParams.set(r.ok ? 'verzonden' : 'fout', '1');
    return c.redirect(back.startsWith('http') ? u.toString() : u.pathname + u.search, 303);
  }
  return r.ok ? c.json({ ok: true }, 200, cors) : c.json({ error: r.error }, r.status, cors);
});

// Vanaf hier alleen ingelogd.
app.use('/api/*', async (c, next) => {
  if (c.req.path.startsWith('/api/auth/') || c.req.path === '/api/forms/submit') return next();
  return auth.requireAuth(c, next);
});

// ── Site ─────────────────────────────────────────────────────
app.get('/api/site', (c) => c.json(store.getSite()));
app.put('/api/site', async (c) => {
  store.saveSite(await c.req.json());
  return c.json(store.getSite());
});

// ── Alles in één keer voor de Studio ─────────────────────────
app.get('/api/bootstrap', (c) =>
  c.json({
    site: store.getSite(),
    pages: store.listPages(),
    projects: store.listProjects(),
    components: store.listComponents(),
    assets: store.listAssets(),
  }),
);

// ── Pagina's ─────────────────────────────────────────────────
app.get('/api/pages', (c) => c.json(store.listPages()));
app.post('/api/pages', async (c) => {
  const { title, slug } = await c.req.json<{ title: string; slug?: string }>();
  const s = store.slugify(slug ?? title ?? '');
  if (!s) return bad(c, 'Titel of slug ontbreekt');
  if (store.listPages().some((p) => p.slug === s)) return bad(c, 'Deze slug bestaat al', 409);
  const tree = frame(title, {
    tag: 'main',
    layout: { mode: 'vertical' },
    size: { width: 'fill', minH: 800 },
    style: { fill: 'token:bg', color: 'token:text' },
  }, [
    { id: `h_${Date.now().toString(36)}`, type: 'instance', name: 'Header', component: 'c_header', size: { width: 'fill' } },
    { id: `f_${Date.now().toString(36)}`, type: 'instance', name: 'Footer', component: 'c_footer', size: { width: 'fill' } },
  ]);
  return c.json(store.createPage({ title, slug: s, tree, sort: store.listPages().length }));
});
app.get('/api/pages/:id', (c) => {
  const p = store.getPage(c.req.param('id'));
  return p ? c.json(p) : bad(c, 'Niet gevonden', 404);
});
app.put('/api/pages/:id', async (c) => {
  const body = await c.req.json();
  if (body.slug !== undefined) {
    body.slug = body.slug === '' ? '' : store.slugify(body.slug);
    const clash = store.listPages().find((p) => p.slug === body.slug && p.id !== c.req.param('id'));
    if (clash) return bad(c, 'Deze slug bestaat al', 409);
  }
  const p = store.updatePage(c.req.param('id'), body);
  return p ? c.json(p) : bad(c, 'Niet gevonden', 404);
});
app.delete('/api/pages/:id', (c) => {
  const p = store.getPage(c.req.param('id'));
  if (p?.kind === 'project-template') return bad(c, 'Het projectsjabloon kun je niet verwijderen');
  store.deletePage(c.req.param('id'));
  return c.json({ ok: true });
});

// ── Projecten ────────────────────────────────────────────────
app.get('/api/projects', (c) => c.json(store.listProjects()));
app.post('/api/projects', async (c) => {
  const body = await c.req.json();
  if (body.slug) body.slug = store.slugify(body.slug);
  return c.json(store.saveProject({ ...body, id: undefined, sort: store.listProjects().length + 1 }));
});
app.put('/api/projects/:id', async (c) => {
  const body = await c.req.json();
  if (body.slug) body.slug = store.slugify(body.slug);
  const clash = store.listProjects().find((p) => p.slug === body.slug && p.id !== c.req.param('id'));
  if (body.slug && clash) return bad(c, 'Deze slug bestaat al', 409);
  const before = store.getProject(c.req.param('id'));
  const saved = store.saveProject({ ...body, id: c.req.param('id') });
  if (before && before.slug !== saved.slug) store.addRedirect(`/work/${before.slug}/`, `/work/${saved.slug}/`);
  return c.json(saved);
});
app.delete('/api/projects/:id', (c) => {
  store.deleteProject(c.req.param('id'));
  return c.json({ ok: true });
});

// ── Componenten ──────────────────────────────────────────────
app.get('/api/components', (c) => c.json(store.listComponents()));
app.post('/api/components', async (c) => c.json(store.saveComponent({ ...(await c.req.json()), id: undefined })));
app.put('/api/components/:id', async (c) => c.json(store.saveComponent({ ...(await c.req.json()), id: c.req.param('id') })));
app.delete('/api/components/:id', (c) => {
  store.deleteComponent(c.req.param('id'));
  return c.json({ ok: true });
});

// ── Revisies (versiegeschiedenis) ────────────────────────────
app.get('/api/revisions/:kind/:id', (c) => c.json(store.listRevisions(c.req.param('kind'), c.req.param('id'))));
app.get('/api/revision/:id', (c) => {
  const r = store.getRevision(c.req.param('id'));
  return r ? c.json(r) : bad(c, 'Niet gevonden', 404);
});

// ── Assets ───────────────────────────────────────────────────
app.get('/api/assets', (c) => c.json(store.listAssets()));
app.post('/api/uploads', (c) => c.json({ uploadId: media.startUpload() }));
app.put('/api/uploads/:id', async (c) => {
  try {
    const size = await media.appendChunk(c.req.param('id'), c.req.raw.body);
    return c.json({ size });
  } catch (e) {
    return bad(c, (e as Error).message);
  }
});
app.post('/api/uploads/:id/complete', async (c) => {
  const { name } = await c.req.json<{ name: string }>();
  try {
    return c.json(await media.finishUpload(c.req.param('id'), name ?? 'bestand'));
  } catch (e) {
    return bad(c, (e as Error).message);
  }
});
app.patch('/api/assets/:id', async (c) => {
  const a = store.getAsset(c.req.param('id'));
  if (!a) return bad(c, 'Niet gevonden', 404);
  const { alt } = await c.req.json<{ alt?: string }>();
  store.saveAsset({ ...a, alt: alt ?? a.alt });
  return c.json(store.getAsset(a.id));
});
app.delete('/api/assets/:id', (c) => {
  media.deleteAsset(c.req.param('id'));
  return c.json({ ok: true });
});

// ── Formulierinzendingen ─────────────────────────────────────
app.get('/api/submissions', (c) => c.json(forms.listSubmissions()));
app.post('/api/submissions/:id/read', (c) => {
  forms.markRead(c.req.param('id'));
  return c.json({ ok: true });
});
app.delete('/api/submissions/:id', (c) => {
  forms.deleteSubmission(c.req.param('id'));
  return c.json({ ok: true });
});


// ── Thema's ──────────────────────────────────────────────────
app.get('/api/themes', (c) => c.json(store.listThemes()));
app.post('/api/themes', async (c) => c.json(store.saveTheme(await c.req.json())));
app.delete('/api/themes/:id', (c) => {
  store.deleteTheme(c.req.param('id'));
  return c.json({ ok: true });
});
app.post('/api/fonts/google', async (c) => {
  const { family, weights, italic } = await c.req.json<{ family: string; weights?: number[]; italic?: boolean }>();
  try {
    return c.json(await downloadGoogleFont(family, weights, italic));
  } catch (e) {
    return bad(c, `Font ophalen mislukt: ${(e as Error).message}`);
  }
});

// ── Opgeslagen secties ───────────────────────────────────────
app.get('/api/sections', (c) => c.json(store.listSectionTemplates()));
app.post('/api/sections', async (c) => {
  const b = await c.req.json<{ name: string; category?: string; tree: import('@vystara/core').FrameNode }>();
  if (!b.name?.trim() || !b.tree) return bad(c, 'Naam en inhoud zijn nodig');
  return c.json(store.saveSectionTemplate(b));
});
app.delete('/api/sections/:id', (c) => {
  store.deleteSectionTemplate(c.req.param('id'));
  return c.json({ ok: true });
});

// ── Hosting: GitHub + Vercel ─────────────────────────────────
app.get('/api/deploy', (c) => c.json(deploy.getDeployConfig()));
app.put('/api/deploy', async (c) => {
  try {
    return c.json(deploy.saveDeployConfig(await c.req.json()));
  } catch (e) {
    return bad(c, (e as Error).message);
  }
});
app.post('/api/deploy/test', async (c) => {
  try {
    return c.json(await deploy.testConnection());
  } catch (e) {
    return bad(c, (e as Error).message);
  }
});
app.post('/api/deploy/push', async (c) => {
  try {
    return c.json(await deploy.pushSite());
  } catch (e) {
    return bad(c, (e as Error).message);
  }
});

// ── Vystara-startsite ────────────────────────────────────────
app.get('/api/starter', (c) => c.json(starter.getStatus()));
// Nieuwe installatie: merkbestanden, lettertypes en beelden van de oude site meteen ophalen.
// Ook als de startsite nog nooit volledig is geïnstalleerd en er nog niets met de hand is aangepast.
if (config.edition !== 'folio' && (fresh || (!store.getKv('brand_assets', null) && !store.hasEdits()))) setTimeout(() => void starter.installStarter({ importImages: true }), 1500);
app.post('/api/starter', async (c) => {
  if (config.edition === 'folio') return bad(c, 'Niet beschikbaar in Folio', 404);
  const { importImages } = await c.req.json<{ importImages?: boolean }>().catch(() => ({ importImages: false }));
  if (starter.getStatus().state === 'running') return bad(c, 'De installatie loopt al', 409);
  void starter.installStarter({ importImages: !!importImages });
  return c.json(starter.getStatus());
});

// ── Vergrendelen en voorbeeld-link ───────────────────────────
app.get('/api/access', (c) => {
  const site = store.getSite();
  return c.json({ ...(site.access ?? { mode: 'open' }), hasPassword: !!store.getSecret('access_password'), previewToken: store.getSecret('preview_token') });
});
app.put('/api/access', async (c) => {
  const b = await c.req.json<{ mode: 'open' | 'maintenance' | 'password'; title?: string; message?: string; password?: string }>();
  if (!['open', 'maintenance', 'password'].includes(b.mode)) return bad(c, 'Ongeldige modus');
  if (b.password) {
    if (b.password.length < 4) return bad(c, 'Kies een wachtwoord van minstens 4 tekens');
    const salt = crypto.randomBytes(16).toString('hex');
    store.setSecret('access_password', `${salt}$${crypto.scryptSync(b.password, salt, 32).toString('hex')}`);
  }
  if (b.mode === 'password' && !store.getSecret('access_password')) return bad(c, 'Stel eerst een wachtwoord in');
  const site = store.getSite();
  store.saveSite({ ...site, access: { mode: b.mode, title: b.title || undefined, message: b.message || undefined } });
  // Hangt de site aan GitHub/Vercel? Dan meteen de juiste versie pushen.
  let pushed: unknown = null;
  const dc = deploy.getDeployConfig();
  if (dc.autoPush && dc.repo && dc.hasToken) pushed = await deploy.pushSite().catch((e) => ({ ok: false, message: (e as Error).message }));
  return c.json({ ok: true, pushed });
});
app.post('/api/preview-token', (c) => {
  const t = crypto.randomBytes(18).toString('base64url');
  store.setSecret('preview_token', t);
  return c.json({ token: t });
});
app.delete('/api/preview-token', (c) => {
  store.setSecret('preview_token', null);
  return c.json({ ok: true });
});

// ── Voorbeeld en publiceren ──────────────────────────────────
// Voorbeeld van één pagina of project: door naar het live voorbeeld, zodat alle links daar blijven werken.
app.get('/api/preview/page/:id', (c) => {
  const p = store.getPage(c.req.param('id'));
  if (!p) return bad(c, 'Niet gevonden', 404);
  if (p.kind === 'project-template') {
    const pr = store.listProjects()[0];
    return c.redirect(pr ? `/preview/work/${pr.slug}/` : '/preview/');
  }
  return c.redirect(p.slug ? `/preview/${p.slug}/` : '/preview/');
});
app.get('/api/preview/project/:id', (c) => {
  const p = store.getProject(c.req.param('id'));
  return p ? c.redirect(`/preview/work/${p.slug}/`) : bad(c, 'Niet gevonden', 404);
});

let publishing = false;
// Hele website als zip: eerst opnieuw publiceren, dan de map inpakken.
app.get('/api/export.zip', async (c) => {
  if (publishing) return bad(c, 'Er wordt al gepubliceerd', 409);
  publishing = true;
  try {
    await publish();
  } finally {
    publishing = false;
  }
  const name = (store.slugify(store.getSite().name) || 'website') + '.zip';
  return new Response(new Uint8Array(zipDir(paths.site)), { headers: { 'content-type': 'application/zip', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'no-store' } });
});

app.post('/api/publish', async (c) => {
  if (publishing) return bad(c, 'Er wordt al gepubliceerd', 409);
  publishing = true;
  try {
    const r = await publish();
    const dc = deploy.getDeployConfig();
    let deployResult: unknown = null;
    if (dc.autoPush && dc.repo && dc.hasToken) {
      deployResult = await deploy.pushSite().catch((e) => ({ ok: false, message: (e as Error).message }));
    } else if (dc.repo && dc.hasToken) {
      deployResult = { ok: false, message: 'niet naar GitHub gestuurd: zet "Automatisch na publiceren" aan (Publiceren ▾)' };
    } else {
      deployResult = config.edition === 'folio'
        ? { ok: true, message: 'klaar. Zet hem online via Publiceren ▾ → Online zetten' }
        : { ok: false, message: 'alleen lokaal gepubliceerd. Koppel GitHub onder Hosting, anders ziet je live site (Vercel) deze versie niet' };
    }
    return c.json({ ...r, deploy: deployResult });
  } finally {
    publishing = false;
  }
});

// ── Bestanden serveren ───────────────────────────────────────
/** Leest een (deel van een) bestand als web-stream; sluit netjes af als de bezoeker afhaakt. */
function fileStream(file: string, start: number, end: number): ReadableStream<Uint8Array> {
  let fh: fs.promises.FileHandle | undefined;
  let pos = start;
  const close = async () => {
    const h = fh;
    fh = undefined;
    await h?.close().catch(() => {});
  };
  return new ReadableStream<Uint8Array>({
    async start() {
      fh = await fs.promises.open(file, 'r');
    },
    async pull(ctrl) {
      const len = Math.min(256 * 1024, end - pos + 1);
      if (!fh || len <= 0) {
        await close();
        ctrl.close();
        return;
      }
      const buf = Buffer.alloc(len);
      const { bytesRead } = await fh.read(buf, 0, len, pos);
      if (!bytesRead) {
        await close();
        ctrl.close();
        return;
      }
      pos += bytesRead;
      ctrl.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, bytesRead));
    },
    cancel: close,
  });
}

function sendFile(c: Context, file: string, cache: string) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  const stat = fs.statSync(file);
  const type = media.mimeFor(file) === 'application/octet-stream'
    ? ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json', '.webmanifest': 'application/manifest+json' } as Record<string, string>)[path.extname(file)] ?? 'application/octet-stream'
    : media.mimeFor(file);

  // Range-verzoeken, nodig om video's te kunnen doorspoelen.
  const range = c.req.header('range');
  if (range && /^bytes=\d*-\d*$/.test(range)) {
    const [s, e] = range.slice(6).split('-');
    const start = s ? Number(s) : Math.max(0, stat.size - Number(e));
    const end = s && e ? Math.min(Number(e), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) return c.body(null, 416, { 'Content-Range': `bytes */${stat.size}` });
    return c.body(fileStream(file, start, end), 206, {
      ...extraHeaders(file),
      'Content-Type': type,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cache,
    });
  }
  return c.body(fileStream(file, 0, stat.size - 1), 200, {
    ...extraHeaders(file),
    'Content-Type': type,
    'Content-Length': String(stat.size),
    'Accept-Ranges': 'bytes',
    'Cache-Control': cache,
  });
}

function extraHeaders(file: string): Record<string, string> {
  const h: Record<string, string> = { 'X-Content-Type-Options': 'nosniff' };
  // Een SVG mag nooit scripts uitvoeren, ook niet als hij los geopend wordt.
  if (file.endsWith('.svg')) h['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; img-src data:";
  if (/\.(woff2?|ttf|otf)$/.test(file)) h['Access-Control-Allow-Origin'] = '*';
  return h;
}

/** Voorkomt ../-trucs: het pad moet binnen de map blijven. */
function safeJoin(root: string, rel: string): string | null {
  const p = path.resolve(root, '.' + path.posix.normalize('/' + decodeURIComponent(rel)));
  return p.startsWith(root + path.sep) || p === root ? p : null;
}

app.get('/media/*', (c) => {
  const file = safeJoin(paths.media, c.req.path.replace(/^\/media/, ''));
  return (file && sendFile(c, file, 'public, max-age=31536000, immutable')) || c.notFound();
});

app.get('/studio', (c) => c.redirect('/studio/'));
app.get('/studio/*', (c) => {
  const rel = c.req.path.replace(/^\/studio/, '') || '/';
  const file = safeJoin(config.studioDist, rel);
  const asset = file && rel !== '/' ? sendFile(c, file, rel.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache') : null;
  if (asset) return asset;
  // SPA: alle andere routes naar index.html
  return sendFile(c, path.join(config.studioDist, 'index.html'), 'no-cache') ?? c.text('Studio is nog niet gebouwd. Draai: npm run build', 503);
});


// ── Live voorbeeld: altijd de huidige werkversie, ook ongepubliceerd ──
function previewAllowed(c: Context): boolean {
  if (auth.currentUser(c)) return true;
  const token = store.getSecret('preview_token');
  if (!token) return false;
  const q = c.req.query('token');
  if (q && q === token) {
    setCookie(c, 'vystara_preview', token, { httpOnly: true, sameSite: 'Lax', secure: config.secureCookies, path: '/preview', maxAge: 7 * 86400 });
    return true;
  }
  return getCookie(c, 'vystara_preview') === token;
}

/** Een getal dat verandert zodra er iets opgeslagen wordt; het voorbeeld ververst dan. */
function contentVersion(): string {
  const row = store.db.prepare(`SELECT
    (SELECT MAX(updated_at) FROM pages) AS p, (SELECT MAX(updated_at) FROM projects) AS pr,
    (SELECT MAX(updated_at) FROM components) AS c, (SELECT settings FROM site WHERE id = 1) AS s,
    (SELECT COUNT(*) FROM assets) AS a`).get() as Record<string, string | number | null>;
  return crypto.createHash('sha1').update(JSON.stringify(row)).digest('hex').slice(0, 12);
}

const PREVIEW_BAR = (v: string) => `<div id="vys-preview" style="position:fixed;left:50%;bottom:16px;translate:-50% 0;z-index:2147483000;display:flex;gap:10px;align-items:center;background:#111;color:#fff;font:500 13px/1 system-ui,sans-serif;padding:10px 14px;border-radius:999px;box-shadow:0 8px 30px rgba(0,0,0,.35)"><span style="width:8px;height:8px;border-radius:50%;background:#2ecc71;display:inline-block"></span>Live voorbeeld — nog niet gepubliceerd<button onclick="this.parentNode.remove()" style="all:unset;cursor:pointer;opacity:.6;padding-left:6px">✕</button></div>
<script>(function(){var v='${v}';setInterval(function(){fetch('/preview/__version',{credentials:'same-origin'}).then(function(r){return r.text()}).then(function(n){if(n&&n!==v){location.reload()}}).catch(function(){})},2000)})()</script>`;

app.get('/preview/__version', (c) => (previewAllowed(c) ? c.text(contentVersion()) : c.text('', 401)));
app.get('/preview', (c) => c.redirect('/preview/' + (c.req.query('token') ? `?token=${c.req.query('token')}` : '')));
app.get('/preview/*', (c) => {
  if (!previewAllowed(c)) return c.html('<p style="font-family:system-ui;padding:40px">Dit voorbeeld is privé. Log in op <a href="/studio/">de Studio</a> of gebruik een deellink.</p>', 401);
  const rel = c.req.path.replace(/^\/preview/, '') || '/';
  let parts = rel.split('/').filter(Boolean);
  // Extra taal: /preview/en/work/x/
  const lang = parts[0] && extraLangs(store.getSite()).includes(parts[0]) ? parts[0] : undefined;
  if (lang) parts = parts.slice(1);
  let html: string | null = null;
  if (parts[0] === 'work' && parts[1]) {
    const pr = store.listProjects().find((p) => p.slug === parts[1]);
    if (pr) html = renderProject(pr, undefined, lang);
  } else {
    const slug = parts.join('/');
    const page = store.listPages().find((p) => p.kind === 'page' && p.slug === slug);
    if (page) html = renderPage(page, undefined, lang);
  }
  if (!html) {
    const nf = store.listPages().find((p) => p.slug === '404');
    html = nf ? renderPage(nf) : '<p>Niet gevonden</p>';
  }
  // Interne links binnen het voorbeeld houden.
  html = html.replace(/href="\/(?!media\/|preview\/|api\/)/g, 'href="/preview/').replace('</body>', `${PREVIEW_BAR(contentVersion())}</body>`);
  return c.html(html, 200, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
});

// ── Vergrendeling van de publieke site ───────────────────────
function accessKey(): string {
  const stored = store.getSecret('access_password') ?? '';
  return crypto.createHash('sha256').update(`vystara-access:${stored}`).digest('base64url');
}

app.post('/__unlock', async (c) => {
  const site = store.getSite();
  if (site.access?.mode !== 'password') return c.redirect('/', 303);
  if (!auth.loginAllowed(ip(c))) return c.html(renderLockPage(site, { mode: 'password', error: 'Te veel pogingen. Probeer het over 15 minuten opnieuw.' }), 429);
  const body = await c.req.parseBody();
  const stored = store.getSecret('access_password') ?? '';
  const [salt, hash] = stored.split('$');
  const given = crypto.scryptSync(String(body.password ?? ''), salt ?? '', 32).toString('hex');
  if (!hash || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(hash))) {
    auth.loginFailed(ip(c));
    return c.html(renderLockPage(site, { mode: 'password', error: 'Dat wachtwoord klopt niet.' }), 401);
  }
  setCookie(c, 'vystara_access', accessKey(), { httpOnly: true, sameSite: 'Lax', secure: config.secureCookies, path: '/', maxAge: 30 * 86400 });
  const back = c.req.header('referer');
  return c.redirect(back && new URL(back).host === new URL(c.req.url).host ? back : '/', 303);
});

app.use('/*', async (c, next) => {
  const p = c.req.path;
  if (p.startsWith('/api/') || p.startsWith('/studio') || p.startsWith('/media/') || p.startsWith('/preview') || p === '/__unlock') return next();
  const site = store.getSite();
  const mode = site.access?.mode ?? 'open';
  if (mode === 'open' || auth.currentUser(c)) return next();
  if (mode === 'password' && getCookie(c, 'vystara_access') === accessKey()) return next();
  return c.html(renderLockPage(site, { mode }), mode === 'maintenance' ? 503 : 401, {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
    ...(mode === 'maintenance' ? { 'Retry-After': '3600' } : {}),
  });
});

// ── Redirects (bv. oude Squarespace-adressen) ────────────────
app.use('/*', async (c, next) => {
  const list = store.getSite().redirects ?? [];
  if (!list.length || c.req.method !== 'GET') return next();
  const p = c.req.path;
  const norm = (x: string) => (x.endsWith('/') ? x : x + '/');
  const hit = list.find((r) => r.from === p || norm(r.from) === norm(p));
  if (hit) return c.redirect(hit.to, hit.status ?? 301);
  return next();
});

// De gepubliceerde site.
app.get('/*', (c) => {
  let rel = c.req.path;
  if (rel.endsWith('/')) rel += 'index.html';
  const file = safeJoin(paths.site, rel);
  const res =
    (file && sendFile(c, file, 'public, max-age=300')) ||
    (file && !path.extname(file) && sendFile(c, path.join(file, 'index.html'), 'public, max-age=300'));
  if (res) return res;
  const notFound = path.join(paths.site, '404.html');
  if (fs.existsSync(notFound)) return c.html(fs.readFileSync(notFound, 'utf8'), 404);
  if (!fs.existsSync(path.join(paths.site, 'index.html'))) {
    // Nog niet gepubliceerd: ingelogd ga je naar het live voorbeeld van dezelfde pagina.
    if (auth.currentUser(c) && !path.extname(c.req.path)) return c.redirect('/preview' + c.req.path);
    return c.html('<p style="font-family:system-ui;padding:40px">Nog niets gepubliceerd. Ga naar <a href="/studio/">/studio</a>.</p>', 404);
  }
  return c.text('Niet gevonden', 404);
});

// Netjes afsluiten (Folio vraagt dit via IPC; op Windows bestaat SIGTERM eigenlijk niet).
let closing = false;
function shutdown(sig?: NodeJS.Signals) {
  if (closing) return;
  closing = true;
  try {
    store.db.close();
  } catch (e) {
    console.error('Database sluiten mislukt:', (e as Error).message);
  }
  // Heeft het opstartscript (app.mjs) ook een handler, dan sluit dat zelf af (en stopt de tunnel).
  if (sig && process.listenerCount(sig) > 1) return;
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('message', (m: unknown) => {
  if ((m as { type?: string } | null)?.type === 'shutdown') shutdown();
});
process.on('disconnect', () => shutdown()); // hoofdproces van Folio is weg

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`${config.edition === 'folio' ? 'Folio' : 'Vystara'} draait op http://localhost:${info.port}  (Studio: /studio/)`);
  if (process.send) process.send({ type: 'ready', port: info.port });
  console.log(`Data-map: ${config.dataDir}`);
});
