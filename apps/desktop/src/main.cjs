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
const { fork } = require('node:child_process');

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
    try { child.kill('SIGTERM'); } catch { resolve(); }
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
  const home = { label: 'Mijn websites', accelerator: 'CmdOrCtrl+Shift+H', click: async () => { await stopServer(); showHome(); } };
  const template = [
    ...(isMac ? [{ label: 'Folio', submenu: [{ role: 'about', label: 'Over Folio' }, { type: 'separator' }, home, { type: 'separator' }, { role: 'hide', label: 'Verberg Folio' }, { role: 'hideOthers', label: 'Verberg andere' }, { type: 'separator' }, { role: 'quit', label: 'Stop Folio' }] }] : []),
    { label: 'Bestand', submenu: [home, { type: 'separator' }, isMac ? { role: 'close', label: 'Sluit venster' } : { role: 'quit', label: 'Afsluiten' }] },
    { label: 'Wijzig', submenu: [{ role: 'undo', label: 'Ongedaan maken' }, { role: 'redo', label: 'Opnieuw' }, { type: 'separator' }, { role: 'cut', label: 'Knippen' }, { role: 'copy', label: 'Kopiëren' }, { role: 'paste', label: 'Plakken' }, { role: 'selectAll', label: 'Alles selecteren' }] },
    { label: 'Beeld', submenu: [{ role: 'reload', label: 'Opnieuw laden' }, { role: 'togglefullscreen', label: 'Volledig scherm' }, { type: 'separator' }, { role: 'resetZoom', label: 'Werkelijke grootte' }, { role: 'zoomIn', label: 'Inzoomen' }, { role: 'zoomOut', label: 'Uitzoomen' }, { type: 'separator' }, { role: 'toggleDevTools', label: 'Ontwikkelaarstools' }] },
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
  // Op Windows installeert hij de update zelf. Op een Mac kan dat alleen met een betaald Apple-certificaat,
  // dus daar tonen we een melding met een downloadlink.
  autoUpdater.autoDownload = !isMac;
  autoUpdater.on('update-available', (info) => {
    if (win && !win.isDestroyed()) win.webContents.send('folio:update', { version: info.version, mac: isMac });
  });
  autoUpdater.on('update-downloaded', (info) => {
    if (win && !win.isDestroyed()) win.webContents.send('folio:update', { version: info.version, ready: true });
  });
  autoUpdater.on('error', () => { /* offline of geen release: geen probleem */ });
  void autoUpdater.checkForUpdates().catch(() => {});
  ipcMain.handle('folio:install-update', () => autoUpdater.quitAndInstall());
}

// ── Opstarten ────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
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
    app.on('activate', () => {
      if (!win) createWindow();
    });
  });
  app.on('window-all-closed', () => {
    void stopServer().then(() => {
      if (!isMac) app.quit();
    });
  });
  app.on('before-quit', () => {
    if (running) try { running.child.kill('SIGTERM'); } catch { /* al weg */ }
  });
}
