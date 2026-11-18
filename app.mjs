// ─────────────────────────────────────────────────────────────
// Vystara Studio als "gewone app": één bestand dat alles regelt.
//
//   node app.mjs
//
// - Installeert wat er mist (eerste keer).
// - Bouwt de Studio als dat nodig is.
// - Start de server op één poort (standaard 8787).
// - Met TUNNEL_TOKEN in .env: start ook een Cloudflare Tunnel, zodat de
//   Studio overal bereikbaar is (bv. https://studio.vystarastudios.com).
// - Op je eigen pc (zonder tunnel): opent de Studio in je browser.
//
// Werkt op Windows, macOS en Linux, en op hosts als PebbleHost (Node.js).
// ─────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Alleen echte waarschuwingen tonen (node:sqlite meldt zich als "experimenteel").
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name !== 'ExperimentalWarning') console.warn(w);
});

const root = path.dirname(fileURLToPath(import.meta.url));
process.chdir(root);

// Node 23.0 t/m 23.3 heeft de ingebouwde SQLite nog achter een vlag. Dan starten we onszelf
// één keer opnieuw met die vlag (signalen gaan mee, zodat stoppen netjes werkt).
{
  const [ma, mi] = process.versions.node.split('.').map(Number);
  if (ma === 23 && mi < 4 && !process.execArgv.includes('--experimental-sqlite')) {
    const child = spawn(process.execPath, ['--experimental-sqlite', ...process.execArgv, fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit' });
    for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
    child.on('exit', (code, sig) => process.exit(code ?? (sig ? 1 : 0)));
    await new Promise(() => {}); // wacht op het kind
  }
}
const log = (m) => console.log(`[Vystara] ${m}`);

// .env lezen (voor PORT, TUNNEL_TOKEN, enz.).
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
// Veel hosts (zoals PebbleHost/Pterodactyl) geven de poort mee als SERVER_PORT.
if (!process.env.PORT && process.env.SERVER_PORT) process.env.PORT = process.env.SERVER_PORT;
const port = Number(process.env.PORT || 8787);
const tunnel = (process.env.TUNNEL_TOKEN || '').trim();
if (tunnel && !process.env.SECURE_COOKIES) process.env.SECURE_COOKIES = '1';

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`[Vystara] Node ${process.versions.node} is te oud. Kies Node 22.13 of nieuwer (op PebbleHost: Startup → Docker Image).`);
  process.exit(1);
}

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts }).status === 0;

// 1. Pakketten installeren als ze ontbreken.
if (!fs.existsSync(path.join(root, 'node_modules', 'tsx')) || !fs.existsSync(path.join(root, 'node_modules', 'hono'))) {
  log('Eerste keer: onderdelen installeren (een paar minuten)…');
  if (!run(npm, ['install', '--no-audit', '--no-fund'])) {
    console.error('[Vystara] npm install mislukt. Bekijk de melding hierboven.');
    process.exit(1);
  }
}

// 2. De Studio bouwen als hij er nog niet is of als de broncode nieuwer is.
const dist = path.join(root, 'apps', 'studio', 'dist', 'index.html');
const newest = (dir) => {
  let t = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    t = Math.max(t, e.isDirectory() ? newest(p) : fs.statSync(p).mtimeMs);
  }
  return t;
};
const srcTime = Math.max(newest(path.join(root, 'apps', 'studio', 'src')), newest(path.join(root, 'packages', 'core', 'src')));
if (!fs.existsSync(dist) || fs.statSync(dist).mtimeMs < srcTime) {
  log('Studio bouwen…');
  const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!run(process.execPath, [vite, 'build'], { cwd: path.join(root, 'apps', 'studio'), shell: false })) {
    console.error('[Vystara] Bouwen van de Studio mislukt.');
    process.exit(1);
  }
}

// 3. De server starten (in dit proces).
process.env.PORT = String(port);
const { register } = await import('tsx/esm/api');
register();
await import(pathToFileURL(path.join(root, 'apps', 'server', 'src', 'index.ts')).href);

// 4. Tunnel of browser.
if (tunnel) {
  let bin = 'cloudflared';
  try {
    const cf = await import('cloudflared');
    if (cf.bin && !fs.existsSync(cf.bin)) {
      log('Cloudflared downloaden…');
      await cf.install(cf.bin);
    }
    if (cf.bin) bin = cf.bin;
  } catch {
    /* geen npm-pakket: probeer de cloudflared op het systeem */
  }
  log('Cloudflare Tunnel starten…');
  const t = spawn(bin, ['tunnel', '--no-autoupdate', 'run', '--token', tunnel], { stdio: ['ignore', 'pipe', 'pipe'] });
  const out = (d) => {
    const s = String(d);
    if (/Registered tunnel connection/i.test(s)) log('Tunnel verbonden: je Studio is nu overal bereikbaar.');
    if (/error|failed/i.test(s) && !/retrying/i.test(s)) process.stdout.write(`[tunnel] ${s}`);
  };
  t.stdout.on('data', out);
  t.stderr.on('data', out);
  t.on('exit', (code) => log(`Tunnel gestopt (code ${code}). Controleer TUNNEL_TOKEN in .env.`));
  const stop = () => {
    t.kill();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
} else if (!process.env.NO_BROWSER && (process.platform === 'win32' || process.platform === 'darwin' || process.env.DISPLAY)) {
  const url = `http://localhost:${port}/studio/`;
  log(`Studio openen: ${url}`);
  const opener = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(opener[0], opener[1], { stdio: 'ignore', detached: true }).unref();
}
