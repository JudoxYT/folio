// ─────────────────────────────────────────────────────────────
// Folio — desktop-app.
// Start met "Mijn websites". Elke website is een eigen map met een eigen
// database en media. Open je er een, dan start de app daarvoor een kleine
// server op je eigen pc (alleen bereikbaar vanaf deze pc) en opent de Studio.
// ─────────────────────────────────────────────────────────────
const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const net = require('node:net');
const crypto = require('node:crypto');
const os = require('node:os');
const { fork, spawn, execFileSync } = require('node:child_process');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { writeZip, readZip } = require('./zip.cjs');

const isMac = process.platform === 'darwin';
const APP_DIR = path.join(__dirname, '..', 'app');
const USER = () => app.getPath('userData');
const SITES_FILE = () => path.join(USER(), 'sites.json');
const DEFAULT_ROOT = () => path.join(app.getPath('documents'), 'Folio');
const LOG_DIR = () => path.join(USER(), 'logs');

/** @type {BrowserWindow | null} */
let win = null;
/** @type {{ child: import('node:child_process').ChildProcess, site: any, port: number } | null} */
let running = null;

// ── Websites bijhouden ───────────────────────────────────────
function readSites() {
  try {
    const list = JSON.parse(fs.readFileSync(SITES_FILE(), 'utf8'));
    return Array.isArray(list) ? list.filter((s) => s && s.id && s.dir) : [];
  } catch {
    return [];
  }
}
function writeSites(list) {
  fs.mkdirSync(USER(), { recursive: true });
  fs.writeFileSync(SITES_FILE(), JSON.stringify(list, null, 2));
}
function sitesWithInfo() {
  return readSites()
    .map((s) => ({ ...s, missing: !fs.existsSync(s.dir) }))
    .sort((a, b) => (b.lastOpened || b.created || '').localeCompare(a.lastOpened || a.created || ''));
}
const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website';
function uniqueDir(base) {
  let dir = base;
  for (let i = 2; fs.existsSync(dir); i++) dir = `${base}-${i}`;
  return dir;
}
function templates() {
  try {
    return JSON.parse(fs.readFileSync(path.join(APP_DIR, 'templates.json'), 'utf8'));
  } catch {
    return [];
  }
}

// ── De server per website ────────────────────────────────────
const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

/** In een gebouwde app staan programma's als ffmpeg buiten het app-archief. */
const unpacked = (p) => (p ? p.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`) : p);
function mediaTools() {
  const out = {};
  try {
    out.FFMPEG_PATH = unpacked(require('ffmpeg-static'));
  } catch { /* niet meegeleverd */ }
  try {
    out.FFPROBE_PATH = unpacked(require('@ffprobe-installer/ffprobe').path);
  } catch { /* niet meegeleverd */ }
  return out;
}

function stopServer() {
  if (!running) return Promise.resolve();
  const { child } = running;
  running = null;
  return new Promise((resolve) => {
    const done = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* al weg */ }
      resolve();
    }, 3000);
    child.once('exit', () => {
      clearTimeout(done);
      resolve();
    });
    // Eerst netjes vragen (database wordt dan goed afgesloten), daarna pas hard stoppen.
    try {
      if (child.connected) child.send({ type: 'shutdown' });
      else child.kill('SIGTERM');
    } catch {
      try { child.kill('SIGTERM'); } catch { resolve(); }
    }
  });
}

async function startServer(site) {
  await stopServer();
  fs.mkdirSync(site.dir, { recursive: true });
  fs.mkdirSync(LOG_DIR(), { recursive: true });
  const port = await freePort();
  const key = crypto.randomBytes(24).toString('hex');
  const logFile = path.join(LOG_DIR(), `${site.id}.log`);
  const log = fs.createWriteStream(logFile, { flags: 'w' });
  const child = fork(path.join(APP_DIR, 'server.mjs'), [], {
    env: {
      ...process.env,
      ...mediaTools(),
      ELECTRON_RUN_AS_NODE: '1',
      NODE_NO_WARNINGS: '1',
      FOLIO: '1',
      FOLIO_KEY: key,
      FOLIO_TEMPLATE: site.template || 'portfolio',
      FOLIO_SITE_NAME: site.name,
      DATA_DIR: site.dir,
      STUDIO_DIST: path.join(APP_DIR, 'studio'),
      PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  running = { child, site, port };
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('De website startte niet op tijd.')), 60000);
    child.on('message', (m) => {
      if (m && m.type === 'ready') {
        clearTimeout(t);
        resolve();
      }
    });
    child.once('exit', (code) => {
      clearTimeout(t);
      let tail = '';
      try { tail = fs.readFileSync(logFile, 'utf8').split('\n').slice(-12).join('\n'); } catch { /* geen log */ }
      reject(new Error(`De website kon niet starten (code ${code}).\n${tail}`));
    });
  });
  child.on('exit', () => {
    // Onverwacht gestopt terwijl de Studio open is: terug naar het overzicht.
    if (running && running.child === child) {
      running = null;
      if (win && !win.isDestroyed()) {
        showHome();
        dialog.showErrorBox('Folio', 'De website is onverwacht gestopt. Open hem opnieuw vanuit Mijn websites.');
      }
    }
  });
  return { port, key };
}

// ── Vensters ─────────────────────────────────────────────────
function isLocal(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'file:' || u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}
function guard(contents) {
  // Links naar buiten openen in je eigen browser; vensters van de site (Voorbeeld) blijven in de app.
  contents.setWindowOpenHandler(({ url }) => {
    if (isLocal(url)) return { action: 'allow', overrideBrowserWindowOptions: { width: 1280, height: 860, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs') } } };
    void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (e, url) => {
    if (!isLocal(url)) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function showHome() {
  if (!win) return;
  win.setTitle('Folio — Mijn websites');
  void win.loadFile(path.join(__dirname, 'launcher.html'));
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 620,
    title: 'Folio',
    backgroundColor: '#0f1014',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    autoHideMenuBar: !isMac,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  guard(win.webContents);
  // Spellingscontrole in het Nederlands en Engels, met suggesties in het rechtsklikmenu.
  try { win.webContents.session.setSpellCheckerLanguages(['nl', 'en-US']); } catch { /* macOS kiest zelf */ }
  win.webContents.on('context-menu', (_e, p) => {
    if (!p.isEditable) return;
    const items = [];
    for (const w of p.dictionarySuggestions.slice(0, 6)) items.push({ label: w, click: () => win.webContents.replaceMisspelling(w) });
    if (p.misspelledWord) {
      if (!items.length) items.push({ label: 'Geen suggesties', enabled: false });
      items.push({ label: 'Aan woordenboek toevoegen', click: () => win.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) });
      items.push({ type: 'separator' });
    }
    items.push({ role: 'cut', label: 'Knippen' }, { role: 'copy', label: 'Kopiëren' }, { role: 'paste', label: 'Plakken' }, { type: 'separator' }, { role: 'selectAll', label: 'Alles selecteren' });
    Menu.buildFromTemplate(items).popup({ window: win });
  });
  // Alt loslaten opent op Windows anders de menubalk; in de Studio is Alt voor meten en sneltoetsen.
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyUp' && input.key === 'Alt' && running) e.preventDefault();
  });
  win.on('page-title-updated', (e) => {
    if (running) {
      e.preventDefault();
      win.setTitle(`${running.site.name} — Folio`);
    }
  });
  win.on('closed', () => {
    win = null;
  });
  showHome();
}

async function openSite(id) {
  const list = readSites();
  const site = list.find((s) => s.id === id);
  if (!site) throw new Error('Deze website bestaat niet meer.');
  if (!fs.existsSync(site.dir) && site.created && site.opened) throw new Error(`De map van deze website is niet gevonden:\n${site.dir}`);
  const { port, key } = await startServer(site);
  site.lastOpened = new Date().toISOString();
  site.opened = true;
  writeSites(list);
  await win.loadURL(`http://127.0.0.1:${port}/api/auth/desktop?key=${key}`);
  win.setTitle(`${site.name} — Folio`);
}

// ── Koppeling met het startscherm en de Studio ──────────────
ipcMain.handle('folio:list', () => ({ sites: sitesWithInfo(), templates: templates(), root: DEFAULT_ROOT(), version: app.getVersion(), platform: process.platform }));

ipcMain.handle('folio:create', async (_e, { name, template }) => {
  name = String(name || '').trim().slice(0, 80) || 'Mijn website';
  fs.mkdirSync(DEFAULT_ROOT(), { recursive: true });
  const site = {
    id: crypto.randomBytes(6).toString('hex'),
    name,
    template: template || 'portfolio',
    dir: uniqueDir(path.join(DEFAULT_ROOT(), slugify(name))),
    created: new Date().toISOString(),
  };
  writeSites([...readSites(), site]);
  await openSite(site.id);
  return site.id;
});

ipcMain.handle('folio:open', (_e, id) => openSite(id));

ipcMain.handle('folio:rename', (_e, { id, name }) => {
  const list = readSites();
  const s = list.find((x) => x.id === id);
  if (s && String(name).trim()) s.name = String(name).trim().slice(0, 80);
  writeSites(list);
});

ipcMain.handle('folio:duplicate', async (_e, id) => {
  const list = readSites();
  const s = list.find((x) => x.id === id);
  if (!s) return;
  if (running && running.site.id === id) await stopServer();
  const dir = uniqueDir(`${s.dir}-kopie`);
  fs.cpSync(s.dir, dir, { recursive: true });
  list.push({ ...s, id: crypto.randomBytes(6).toString('hex'), name: `${s.name} (kopie)`, dir, created: new Date().toISOString(), lastOpened: undefined });
  writeSites(list);
});

ipcMain.handle('folio:remove', async (_e, { id, deleteFiles }) => {
  const list = readSites();
  const s = list.find((x) => x.id === id);
  if (!s) return;
  if (deleteFiles && fs.existsSync(s.dir)) await shell.trashItem(s.dir); // naar de prullenbak, dus terug te halen
  writeSites(list.filter((x) => x.id !== id));
});

ipcMain.handle('folio:reveal', (_e, id) => {
  const s = readSites().find((x) => x.id === id);
  if (s) void shell.openPath(s.dir);
});

ipcMain.handle('folio:import', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Kies de map van een Folio-website', properties: ['openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return null;
  const dir = r.filePaths[0];
  if (!fs.existsSync(path.join(dir, 'site.db'))) {
    await dialog.showMessageBox(win, { type: 'warning', message: 'Dit is geen Folio-website', detail: 'In deze map staat geen site.db. Kies de map van een website die je eerder met Folio hebt gemaakt.' });
    return null;
  }
  const list = readSites();
  if (list.some((s) => path.resolve(s.dir) === path.resolve(dir))) return null;
  list.push({ id: crypto.randomBytes(6).toString('hex'), name: path.basename(dir), template: 'leeg', dir, created: new Date().toISOString(), opened: true });
  writeSites(list);
  return true;
});

ipcMain.handle('folio:home', async () => {
  await stopServer();
  showHome();
});

ipcMain.handle('folio:reveal-site', () => {
  if (running) void shell.openPath(path.join(running.site.dir, 'site'));
});

ipcMain.handle('folio:external', (_e, url) => {
  if (/^https?:\/\//.test(url)) void shell.openExternal(url);
});

// ── Menu ─────────────────────────────────────────────────────
function buildMenu() {
  const home = { label: 'Mijn websites', accelerator: 'CmdOrCtrl+Shift+M', click: async () => { await stopServer(); showHome(); } };
  const template = [
    ...(isMac ? [{ label: 'Folio', submenu: [{ role: 'about', label: 'Over Folio' }, { type: 'separator' }, home, { type: 'separator' }, { role: 'hide', label: 'Verberg Folio' }, { role: 'hideOthers', label: 'Verberg andere' }, { type: 'separator' }, { role: 'quit', label: 'Stop Folio' }] }] : []),
    { label: 'Bestand', submenu: [home, { type: 'separator' }, isMac ? { role: 'close', label: 'Sluit venster' } : { role: 'quit', label: 'Afsluiten' }] },
    { label: 'Wijzig', submenu: [{ role: 'undo', label: 'Ongedaan maken' }, { role: 'redo', label: 'Opnieuw' }, { type: 'separator' }, { role: 'cut', label: 'Knippen' }, { role: 'copy', label: 'Kopiëren' }, { role: 'paste', label: 'Plakken' }, { role: 'selectAll', label: 'Alles selecteren' }] },
    { label: 'Beeld', submenu: [{ role: 'reload', label: 'Opnieuw laden', accelerator: 'F5' }, { role: 'togglefullscreen', label: 'Volledig scherm' }, { type: 'separator' }, { role: 'toggleDevTools', label: 'Ontwikkelaarstools' }] },
    { label: 'Help', submenu: [{ label: 'Logbestanden openen', click: () => shell.openPath(LOG_DIR()) }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Updates ──────────────────────────────────────────────────
function checkUpdates() {
  if (!app.isPackaged) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    return;
  }
  // Op Windows installeert electron-updater de update zelf. Op een Mac kan dat alleen met een betaald
  // Apple-certificaat; daar downloadt Folio de nieuwe versie zelf en wisselt hij de app bij herstarten om
  // (zie macDownload). Lukt dat niet, dan tonen we een downloadknop.
  autoUpdater.autoDownload = !isMac;
  // Laatste updatestatus onthouden: elk nieuw geladen scherm (startscherm of Studio) krijgt hem opnieuw.
  let status = null;
  const send = () => { if (status && win && !win.isDestroyed()) win.webContents.send('folio:update', status); };
  autoUpdater.on('update-available', (info) => {
    if (status?.ready) return;
    status = { version: info.version };
    send();
    if (!isMac) return;
    void macDownload(info).then((ok) => {
      status = ok ? { version: info.version, ready: true } : { version: info.version, mac: true };
      send();
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    status = { version: info.version, ready: true };
    send();
  });
  autoUpdater.on('error', () => { /* offline of geen release: geen probleem */ });
  if (win) win.webContents.on('did-finish-load', send);
  void autoUpdater.checkForUpdates().catch(() => {});
  // Elk uur opnieuw kijken, zodat je ook een melding krijgt als Folio de hele dag open staat.
  setInterval(() => { if (!status?.ready) void autoUpdater.checkForUpdates().catch(() => {}); }, 60 * 60 * 1000).unref?.();
  ipcMain.handle('folio:install-update', async () => {
    await stopServer();
    if (isMac) macInstall();
    else autoUpdater.quitAndInstall();
  });
}

// ── Mac: zelf bijwerken zonder Apple-certificaat ─────────────
// Een bestand dat Folio zelf downloadt, krijgt van macOS geen "gedownload van internet"-vlag.
// Daardoor opent de nieuwe versie zonder waarschuwing. We controleren de download met de
// sha512 uit latest-mac.yml, pakken de app uit de .dmg en wisselen hem om zodra Folio stopt.
let macStaged = null;
let macBusy = false;
const shq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;

async function macDownload(info) {
  if (macStaged && macStaged.version === info.version) return true;
  if (macBusy) return false;
  macBusy = true;
  let dir = null;
  try {
    const bundle = path.resolve(process.execPath, '..', '..', '..');
    if (!bundle.endsWith('.app') || bundle.startsWith('/Volumes/')) return false; // draait vanaf de .dmg
    fs.accessSync(path.dirname(bundle), fs.constants.W_OK);
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
    const file = (info.files || []).find((f) => /\.dmg$/.test(f.url) && f.url.includes(`-${arch}.`));
    if (!file) return false;
    const url = /^https?:/.test(file.url) ? file.url : `https://github.com/JudoxYT/folio/releases/download/v${info.version}/${file.url}`;
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'folio-update-'));
    const dmg = path.join(dir, 'update.dmg');
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`download gaf ${res.status}`);
    const hash = crypto.createHash('sha512');
    const body = Readable.fromWeb(res.body);
    body.on('data', (c) => hash.update(c));
    await pipeline(body, fs.createWriteStream(dmg));
    if (file.sha512 && hash.digest('base64') !== file.sha512) throw new Error('controle van de download mislukt');
    const mnt = path.join(dir, 'mnt');
    execFileSync('hdiutil', ['attach', '-nobrowse', '-readonly', '-noautoopen', '-mountpoint', mnt, dmg], { stdio: 'ignore' });
    try {
      const src = fs.readdirSync(mnt).find((n) => n.endsWith('.app'));
      if (!src) throw new Error('geen app gevonden in de .dmg');
      execFileSync('ditto', [path.join(mnt, src), path.join(dir, 'Folio.app')], { stdio: 'ignore' });
    } finally {
      try { execFileSync('hdiutil', ['detach', mnt, '-force'], { stdio: 'ignore' }); } catch { /* al los */ }
    }
    fs.rmSync(dmg, { force: true });
    macStaged = { version: info.version, dir, next: path.join(dir, 'Folio.app'), bundle };
    return true;
  } catch (e) {
    console.error('Mac-update downloaden mislukt:', e && e.message);
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    return false;
  } finally {
    macBusy = false;
  }
}

/** Na het afsluiten van Folio: oude app vervangen door de nieuwe en opnieuw openen. */
function macInstall() {
  if (!macStaged) return void shell.openExternal('https://github.com/JudoxYT/folio/releases/latest');
  const { dir, next, bundle } = macStaged;
  const script = path.join(dir, 'bijwerken.sh');
  fs.writeFileSync(script, [
    '#!/bin/sh',
    `while kill -0 ${process.pid} 2>/dev/null; do sleep 0.3; done`,
    `OLD=${shq(bundle)}`,
    `NEW=${shq(next)}`,
    'rm -rf "$OLD.vorige"',
    'if mv "$OLD" "$OLD.vorige" && ditto "$NEW" "$OLD"; then rm -rf "$OLD.vorige"; else rm -rf "$OLD"; mv "$OLD.vorige" "$OLD"; fi',
    'xattr -dr com.apple.quarantine "$OLD" 2>/dev/null',
    'open "$OLD"',
    `rm -rf ${shq(dir)}`,
    '',
  ].join('\n'));
  spawn('/bin/sh', [script], { detached: true, stdio: 'ignore' }).unref();
  app.quit();
}

// ── Website delen als één bestand (.folio) ───────────────────
/** Database netjes afronden (oude WAL-bestanden opruimen) zodat de kopie compleet is. */
function settleDb(dir) {
  const db = path.join(dir, 'site.db');
  if (!fs.existsSync(db)) return;
  const wal = `${db}-wal`;
  if (!fs.existsSync(wal) || fs.statSync(wal).size === 0) return;
  try {
    const { DatabaseSync } = require('node:sqlite');
    const d = new DatabaseSync(db);
    d.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    d.close();
  } catch { /* lukt het niet, dan nemen we de WAL gewoon mee */ }
}

function listFiles(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    // Niet meedelen: gepubliceerde uitvoer, tijdelijke uploads en back-ups (die maakt Folio opnieuw).
    if (!rel && ['site', 'tmp-uploads', 'backup'].includes(e.name)) continue;
    if (e.isDirectory()) out.push(...listFiles(dir, r));
    else if (e.isFile() && !/\.db-shm$/.test(e.name)) out.push({ name: r, path: path.join(dir, r) });
  }
  return out;
}

async function exportSite(id) {
  const site = readSites().find((s) => s.id === id);
  if (!site || !fs.existsSync(site.dir)) throw new Error('De map van deze website is niet gevonden.');
  if (running && running.site.id === id) await stopServer();
  const r = await dialog.showSaveDialog(win, {
    title: 'Website delen als bestand',
    defaultPath: path.join(app.getPath('desktop'), `${slugify(site.name)}.folio`),
    filters: [{ name: 'Folio-website', extensions: ['folio'] }],
  });
  if (r.canceled || !r.filePath) return null;
  settleDb(site.dir);
  const files = listFiles(site.dir);
  const manifest = { folio: 1, name: site.name, template: site.template, exportedAt: new Date().toISOString(), version: app.getVersion() };
  writeZip(r.filePath, [{ name: 'folio.json', data: Buffer.from(JSON.stringify(manifest, null, 2)) }, ...files]);
  shell.showItemInFolder(r.filePath);
  return r.filePath;
}

function importFolioFile(file) {
  const entries = readZip(file);
  const man = entries.find((e) => e.name === 'folio.json');
  if (!man || !entries.some((e) => e.name === 'site.db')) throw new Error('Dit is geen Folio-website.');
  const info = JSON.parse(man.data.toString('utf8'));
  const name = String(info.name || path.basename(file, '.folio')).slice(0, 80);
  fs.mkdirSync(DEFAULT_ROOT(), { recursive: true });
  const dir = uniqueDir(path.join(DEFAULT_ROOT(), slugify(name)));
  for (const e of entries) {
    if (e.name === 'folio.json') continue;
    const dest = path.join(dir, ...e.name.split('/'));
    if (!dest.startsWith(dir + path.sep)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, e.data);
  }
  const list = readSites();
  const site = { id: crypto.randomBytes(6).toString('hex'), name, template: info.template || 'leeg', dir, created: new Date().toISOString(), opened: true };
  list.push(site);
  writeSites(list);
  return site;
}

/** Een .folio-bestand openen (dubbelklik in Verkenner/Finder of via de knop). */
async function openFolioFile(file) {
  try {
    const site = importFolioFile(file);
    if (win) {
      if (running) await stopServer();
      showHome();
      win.webContents.once('did-finish-load', () => win && win.webContents.send('folio:refresh', { added: site.name }));
    }
    return site;
  } catch (e) {
    if (win) await dialog.showMessageBox(win, { type: 'warning', message: 'Openen mislukt', detail: e.message });
    return null;
  }
}

ipcMain.handle('folio:export', (_e, id) => exportSite(id));

// ── Back-ups terugzetten ─────────────────────────────────────
// De Studio maakt elke dag een kopie (backup/site-JJJJ-MM-DD.db, de laatste 7 dagen).
const BACKUP_RE = /^site-(\d{4}-\d{2}-\d{2}|voor-terugzetten-[\dT-]+)\.db$/;
ipcMain.handle('folio:backups', (_e, id) => {
  const site = readSites().find((s) => s.id === id);
  if (!site) throw new Error('Website niet gevonden.');
  const dir = path.join(site.dir, 'backup');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => BACKUP_RE.test(f)).map((f) => {
    const st = fs.statSync(path.join(dir, f));
    return { file: f, at: st.mtime.toISOString(), size: st.size, before: f.includes('voor-terugzetten') };
  }).sort((a, b) => b.at.localeCompare(a.at));
});
ipcMain.handle('folio:restore', async (_e, { id, file }) => {
  const site = readSites().find((s) => s.id === id);
  if (!site) throw new Error('Website niet gevonden.');
  if (!BACKUP_RE.test(String(file))) throw new Error('Ongeldige back-up.');
  const dir = path.join(site.dir, 'backup');
  const src = path.join(dir, file);
  if (!fs.existsSync(src)) throw new Error('Deze back-up bestaat niet meer.');
  if (running && running.site.id === id) await stopServer();
  settleDb(site.dir);
  const db = path.join(site.dir, 'site.db');
  // Eerst de huidige versie bewaren, zodat terugzetten zelf ook terug te draaien is.
  const stamp = new Date().toISOString().slice(0, 16).replace(/:/g, '-');
  if (fs.existsSync(db)) fs.copyFileSync(db, path.join(dir, `site-voor-terugzetten-${stamp}.db`));
  fs.copyFileSync(src, db);
  for (const ext of ['-wal', '-shm']) fs.rmSync(db + ext, { force: true });
  // Niet eindeloos bewaren: de 3 nieuwste "voor terugzetten"-kopieën blijven.
  fs.readdirSync(dir).filter((f) => f.startsWith('site-voor-terugzetten-')).sort().reverse().slice(3).forEach((f) => fs.rmSync(path.join(dir, f), { force: true }));
  return true;
});
ipcMain.handle('folio:import-file', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Kies een Folio-bestand', properties: ['openFile'], filters: [{ name: 'Folio-website', extensions: ['folio'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  try {
    return importFolioFile(r.filePaths[0]);
  } catch (e) {
    await dialog.showMessageBox(win, { type: 'warning', message: 'Openen mislukt', detail: e.message });
    return null;
  }
});

// Dubbelklik op een .folio-bestand: Windows geeft het pad mee als argument, macOS via 'open-file'.
let pendingFile = process.argv.find((a) => a.toLowerCase().endsWith('.folio')) || null;
app.on('open-file', (e, file) => {
  e.preventDefault();
  if (win) void openFolioFile(file);
  else pendingFile = file;
});

// ── Opstarten ────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const file = argv.find((a) => a.toLowerCase().endsWith('.folio'));
    if (file) void openFolioFile(file);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    app.setName('Folio');
    buildMenu();
    createWindow();
    checkUpdates();
    if (pendingFile) {
      const f = pendingFile;
      pendingFile = null;
      win.webContents.once('did-finish-load', () => void openFolioFile(f));
    }
    app.on('activate', () => {
      if (!win) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    void stopServer().then(() => {
      if (!isMac) app.quit();
    });
  });
  let quitting = false;
  app.on('before-quit', (e) => {
    if (!running || quitting) return;
    // Wachten tot de site netjes is afgesloten, dan echt stoppen.
    e.preventDefault();
    quitting = true;
    void stopServer().then(() => app.quit());
  });
}
