// ─────────────────────────────────────────────────────────────
// Publiceren naar GitHub (en daarmee automatisch naar Vercel).
// Werkt via de GitHub REST API: geen git nodig op de server.
// Alleen gewijzigde bestanden worden geüpload; verwijderde pagina's
// verdwijnen ook uit de repository.
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './config.js';
import { getKv, getSecret, getSite, setKv, setSecret } from './db.js';
import { renderLockPage } from '@vystara/core';

export interface DeployConfig {
  /** "gebruiker/repository" */
  repo: string;
  branch: string;
  /** Na elke publicatie automatisch pushen. */
  autoPush: boolean;
}

export interface DeployResult {
  ok: boolean;
  message: string;
  commitUrl?: string;
  changed?: number;
  skipped?: string[];
  at: string;
}

const MAX_FILE = 95 * 1024 * 1024; // GitHub weigert bestanden boven 100 MB

export function getDeployConfig() {
  let cfg = getKv<DeployConfig>('deploy', { repo: '', branch: 'main', autoPush: true });
  // Eénmalig: oudere installaties hadden automatisch pushen standaard uit, waardoor Publiceren nooit live ging.
  if (!cfg.autoPush && !getKv<boolean>('deploy_autopush_v2', false)) {
    cfg = { ...cfg, autoPush: true };
    setKv('deploy', cfg);
  }
  if (!getKv<boolean>('deploy_autopush_v2', false)) setKv('deploy_autopush_v2', true);
  return {
    ...cfg,
    hasToken: !!getSecret('github_token'),
    hasHook: !!getSecret('vercel_hook'),
    last: getKv<DeployResult | null>('deploy_last', null),
  };
}

export function saveDeployConfig(body: Partial<DeployConfig> & { token?: string | null; hook?: string | null }) {
  const cur = getKv<DeployConfig>('deploy', { repo: '', branch: 'main', autoPush: true });
  const repo = (body.repo ?? cur.repo).trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  if (repo && !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Repository moet de vorm "gebruiker/naam" hebben');
  const branch = (body.branch ?? cur.branch).trim() || 'main';
  if (!/^[\w./-]+$/.test(branch)) throw new Error('Ongeldige branch-naam');
  setKv('deploy', { repo, branch, autoPush: body.autoPush ?? cur.autoPush });
  if (body.token !== undefined) setSecret('github_token', body.token?.trim() || null);
  if (body.hook !== undefined) {
    const h = body.hook?.trim() || null;
    if (h && !/^https:\/\/api\.vercel\.com\//.test(h)) throw new Error('Een Vercel deploy hook begint met https://api.vercel.com/');
    setSecret('vercel_hook', h);
  }
  return getDeployConfig();
}

async function gh<T>(method: string, url: string, body?: unknown): Promise<T> {
  const token = getSecret('github_token');
  if (!token) throw new Error('Nog geen GitHub-token ingesteld');
  // Tot drie keer opnieuw proberen bij een time-out of storing aan de kant van GitHub.
  let res!: Response;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(`${process.env.GITHUB_API_URL ?? 'https://api.github.com'}${url}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'vystara-studio',
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(120_000),
      });
      if (res.status < 500 || attempt >= 3) break;
    } catch (e) {
      if (attempt >= 3) throw new Error(`GitHub reageert niet: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const err = new Error(explain(res.status, data.message ?? '')) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data;
}

/** GitHub-foutmeldingen in gewone taal. */
function explain(status: number, msg: string): string {
  if (status === 401) return 'GitHub accepteert de token niet. Is hij verlopen of verkeerd gekopieerd?';
  if (status === 403) return `Geen toestemming. Geef de token "Contents: Read and write" op deze repository. (${msg})`;
  if (status === 404) return 'Repository niet gevonden. Klopt de naam, en heeft de token toegang tot deze repository?';
  if (status === 409) return 'De repository is nog leeg.';
  if (status === 422) return `GitHub weigert de wijziging: ${msg}`;
  return `GitHub-fout ${status}: ${msg}`;
}

export async function testConnection() {
  const { repo, branch } = getDeployConfig();
  if (!repo) throw new Error('Vul eerst de repository in');
  const r = await gh<{ full_name: string; private: boolean; default_branch: string; permissions?: { push?: boolean }; html_url: string }>('GET', `/repos/${repo}`);
  if (r.permissions && !r.permissions.push) throw new Error('De token mag deze repository lezen maar niet schrijven. Zet "Contents" op "Read and write".');
  return {
    ok: true,
    message: `Verbonden met ${r.full_name} (${r.private ? 'privé' : 'openbaar'}). Er wordt gepusht naar branch "${branch}".`,
    url: r.html_url,
  };
}

/** Git-blob-hash, zodat we weten welke bestanden echt veranderd zijn. */
function blobSha(buf: Buffer) {
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

function listFiles(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

let pushing = false;

export async function pushSite(): Promise<DeployResult> {
  if (pushing) throw new Error('Er wordt al gepusht');
  pushing = true;
  try {
    const result = await doPush();
    setKv('deploy_last', result);
    return result;
  } catch (e) {
    const result: DeployResult = { ok: false, message: (e as Error).message, at: new Date().toISOString() };
    setKv('deploy_last', result);
    throw e;
  } finally {
    pushing = false;
  }
}

async function doPush(): Promise<DeployResult> {
  const { repo, branch } = getDeployConfig();
  if (!repo) throw new Error('Vul eerst de repository in');
  if (!fs.existsSync(path.join(paths.site, 'index.html'))) throw new Error('Publiceer eerst in de Studio; er is nog geen site om te pushen');

  // 1. Huidige stand van de branch (of de repository eerst vullen als hij leeg is).
  let headSha: string | null = null;
  let remote = new Map<string, string>();
  try {
    const ref = await gh<{ object: { sha: string } }>('GET', `/repos/${repo}/git/ref/heads/${branch}`);
    headSha = ref.object.sha;
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status !== 404 && status !== 409) throw e;
  }
  if (!headSha) {
    // Lege repository of nieuwe branch: start met een README, dan bestaat de branch.
    const put = await gh<{ commit: { sha: string } }>('PUT', `/repos/${repo}/contents/README.md`, {
      message: 'Start van de Vystara-site',
      content: Buffer.from('# Website\n\nDeze repository wordt automatisch gevuld door Vystara Studio. Niet handmatig bewerken.\n').toString('base64'),
      branch,
    });
    headSha = put.commit.sha;
  }
  const head = await gh<{ tree: { sha: string } }>('GET', `/repos/${repo}/git/commits/${headSha}`);
  const tree = await gh<{ tree: { path: string; sha: string; type: string }[]; truncated: boolean }>('GET', `/repos/${repo}/git/trees/${head.tree.sha}?recursive=1`);
  remote = new Map(tree.tree.filter((t) => t.type === 'blob').map((t) => [t.path, t.sha]));

  // 2. Lokale bestanden vergelijken en alleen het verschil uploaden.
  //    Is de site vergrendeld? Dan gaat overal de onderhoudspagina heen: een statische
  //    host (Vercel, Pages) kan geen wachtwoord controleren.
  const site = getSite();
  const locked = (site.access?.mode ?? 'open') !== 'open';
  const root = locked ? buildLockedDir() : paths.site;
  const files = listFiles(root);
  const skipped: string[] = [];
  const entries: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  const toUpload: { rel: string; buf: Buffer }[] = [];
  for (const rel of files) {
    const full = path.join(root, rel);
    if (fs.statSync(full).size > MAX_FILE) {
      skipped.push(rel);
      continue;
    }
    const buf = fs.readFileSync(full);
    const sha = blobSha(buf);
    entries.push({ path: rel, mode: '100644', type: 'blob', sha });
    if (remote.get(rel) !== sha) toUpload.push({ rel, buf });
  }
  // De README laten staan.
  if (remote.has('README.md') && !files.includes('README.md')) entries.push({ path: 'README.md', mode: '100644', type: 'blob', sha: remote.get('README.md')! });

  const removed = [...remote.keys()].filter((p) => p !== 'README.md' && !entries.some((e) => e.path === p));
  if (!toUpload.length && !removed.length) {
    return { ok: true, message: 'Niets veranderd sinds de vorige push.', changed: 0, skipped, at: new Date().toISOString() };
  }

  await pool(toUpload, 4, async ({ buf }) => {
    await gh('POST', `/repos/${repo}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' });
  });

  // 3. Nieuwe boom stap voor stap opbouwen vanaf de huidige: alleen wat veranderd of verwijderd is,
  //    in porties van 80. Eén grote boom in één keer laat GitHub soms time-outen.
  const changes: { path: string; mode: '100644'; type: 'blob'; sha: string | null }[] = [
    ...entries.filter((e) => remote.get(e.path) !== e.sha),
    ...removed.map((p) => ({ path: p, mode: '100644' as const, type: 'blob' as const, sha: null })),
  ];
  let treeSha = head.tree.sha;
  for (let i = 0; i < changes.length; i += 80) {
    const t = await gh<{ sha: string }>('POST', `/repos/${repo}/git/trees`, { base_tree: treeSha, tree: changes.slice(i, i + 80) });
    treeSha = t.sha;
  }
  const newTree = { sha: treeSha };
  const commit = await gh<{ sha: string; html_url: string }>('POST', `/repos/${repo}/git/commits`, {
    message: `Publicatie vanuit Vystara Studio (${new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })})`,
    tree: newTree.sha,
    parents: [headSha],
  });
  await gh('PATCH', `/repos/${repo}/git/refs/heads/${branch}`, { sha: commit.sha, force: false });

  // 4. Optioneel: Vercel deploy hook (alleen nodig zonder Git-koppeling in Vercel).
  const hook = getSecret('vercel_hook');
  if (hook) await fetch(hook, { method: 'POST' }).catch(() => {});

  if (locked) fs.rmSync(root, { recursive: true, force: true });
  return {
    ok: true,
    message: locked
      ? 'De site is vergrendeld: de onderhoudspagina staat nu online. Ontgrendel en publiceer om de site terug te zetten.'
      : `${toUpload.length} bestand(en) bijgewerkt, ${removed.length} verwijderd. Vercel zet de nieuwe versie nu online.`,
    commitUrl: commit.html_url,
    changed: toUpload.length + removed.length,
    skipped,
    at: new Date().toISOString(),
  };
}

/** Tijdelijke map met op elk adres de onderhoudspagina. */
function buildLockedDir(): string {
  const site = getSite();
  const dir = path.join(paths.uploads, `locked-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  const html = renderLockPage(site, { mode: 'maintenance' });
  const pages = fs.existsSync(paths.site) ? listFiles(paths.site).filter((f) => f.endsWith('.html')) : ['index.html'];
  for (const rel of pages.length ? pages : ['index.html']) {
    const f = path.join(dir, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, html);
  }
  fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(dir, 'vercel.json'), JSON.stringify({ cleanUrls: true, trailingSlash: true }, null, 2));
  return dir;
}
