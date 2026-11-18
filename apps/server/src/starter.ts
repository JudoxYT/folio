// ─────────────────────────────────────────────────────────────
// "Vystara-startsite installeren": merkbestanden, lettertypes, thema,
// pagina's en projecten in één keer. Optioneel worden de beelden van de
// oude Squarespace-site gedownload en als eigen media opgeslagen.
// ─────────────────────────────────────────────────────────────

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  legacyImageUrls,
  VYSTARA_FONTS,
  VYSTARA_THEME,
  legacyProjects,
  vystaraComponents,
  vystaraPages,
  vystaraSite,
  type BrandAssets,
  type Theme,
} from '@vystara/core';
import { config, paths } from './config.js';
import * as store from './db.js';
import * as media from './media.js';
import { downloadGoogleFont } from './fonts.js';

const BRAND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../brand');

export interface StarterStatus {
  state: 'idle' | 'running' | 'done' | 'error';
  step: string;
  done: number;
  total: number;
  failed: string[];
  error?: string;
  finishedAt?: string;
}

let status: StarterStatus = { state: 'idle', step: '', done: 0, total: 0, failed: [] };
export const getStatus = () => status;
const set = (p: Partial<StarterStatus>) => (status = { ...status, ...p });

/** Een bestand van schijf als asset toevoegen (zelfde pijplijn als een upload). */
async function importFile(file: string, name: string) {
  const id = media.startUpload();
  fs.copyFileSync(file, path.join(paths.uploads, id));
  return media.finishUpload(id, name);
}

/** Merkbestanden één keer als media toevoegen; bij opnieuw installeren hergebruiken. */
async function brandAssets(): Promise<BrandAssets> {
  const known = store.getKv<Record<string, string>>('brand_assets', {});
  const out: Record<string, string> = {};
  const files = fs.existsSync(BRAND_DIR) ? fs.readdirSync(BRAND_DIR).filter((f) => /\.(png|jpe?g|svg)$/i.test(f)) : [];
  for (const f of files) {
    if (known[f] && store.getAsset(known[f])) {
      out[f] = known[f];
      continue;
    }
    const a = await importFile(path.join(BRAND_DIR, f), `Vystara — ${f}`);
    a.alt = f.replace(/\.[a-z]+$/i, '').replace(/-/g, ' ');
    store.saveAsset(a);
    out[f] = a.id;
  }
  store.setKv('brand_assets', out);
  return {
    notebook: out['notebook-mockup.png'],
    cup: out['coffee-cup-mockup.png'],
    favicon: out['favicon.png'],
    social: out['social-image.png'],
    logoPng: out['logo-black.png'],
  };
}

/** Lettertypes van het thema zelf hosten. Lukt het niet (offline), dan blijft de terugval staan. */
async function themeWithFonts(): Promise<{ theme: Theme; failed: string[] }> {
  const theme = structuredClone(VYSTARA_THEME);
  const failed: string[] = [];
  for (const [key, f] of Object.entries(VYSTARA_FONTS)) {
    try {
      const def = await downloadGoogleFont(f.family, f.weights);
      theme.fonts[key] = { ...def, stack: theme.fonts[key].stack };
    } catch (e) {
      failed.push(`${f.family}: ${(e as Error).message}`);
    }
  }
  return { theme, failed };
}

function backup() {
  const dir = path.join(config.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `voor-startsite-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify({
    site: store.getSite(),
    pages: store.listPages(),
    projects: store.listProjects(),
    components: store.listComponents(),
  }, null, 1));
  return file;
}

/** Download met time-out; Squarespace geeft het origineel zonder ?format. */
async function download(url: string, name: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 Vystara-Studio-import' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const id = media.startUpload();
    fs.writeFileSync(path.join(paths.uploads, id), Buffer.from(await r.arrayBuffer()));
    return await media.finishUpload(id, name);
  } finally {
    clearTimeout(t);
  }
}

async function importLegacyImages() {
  const known = store.getKv<Record<string, string>>('legacy_images', {});
  const urls = legacyImageUrls();
  set({ step: 'Beelden van je oude site downloaden', done: 0, total: urls.length });
  let i = 0;
  const worker = async () => {
    for (;;) {
      const url = urls[i++];
      if (!url) return;
      if (!(known[url] && store.getAsset(known[url]))) {
        const yt = url.match(/i\.ytimg\.com\/vi\/([\w-]+)\//);
        const name = yt ? `YouTube-thumbnail ${yt[1]}.jpg` : decodeURIComponent(url.split('/').pop() ?? 'beeld').replace(/\+/g, ' ');
        try {
          // YouTube heeft niet altijd een maxres-thumbnail: dan de kleinere.
          const a = await download(url, name).catch((e) => {
            if (url.includes('i.ytimg.com') && url.includes('maxresdefault')) return download(url.replace('maxresdefault', 'hqdefault'), name);
            throw e;
          });
          a.alt = name.replace(/\.[a-z0-9]+$/i, '').replace(/^\d+\.\s*/, '');
          store.saveAsset(a);
          known[url] = a.id;
          store.setKv('legacy_images', known);
        } catch (e) {
          status.failed.push(`${name}: ${(e as Error).message}`);
        }
      }
      set({ done: status.done + 1 });
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return known;
}

/** Eigen beelden en video's uit data/import/<map>/ als media toevoegen (sleutel "local:<map>/<bestand>"). */
async function importLocalMedia(): Promise<Record<string, string>> {
  const root = path.join(config.dataDir, 'import');
  const known = store.getKv<Record<string, string>>('local_media', {});
  if (!fs.existsSync(root)) return known;
  const files: { key: string; file: string }[] = [];
  for (const dir of fs.readdirSync(root)) {
    const d = path.join(root, dir);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d)) if (/\.(png|jpe?g|gif|webp|svg|mp4|webm|mov)$/i.test(f)) files.push({ key: `local:${dir}/${f}`, file: path.join(d, f) });
  }
  set({ step: 'Eigen beelden en video’s toevoegen', done: 0, total: files.length });
  for (const { key, file } of files) {
    const size = fs.statSync(file).size;
    const prev = known[key] ? store.getAsset(known[key]) : undefined;
    if (!prev || prev.size !== size) {
      try {
        const a = await importFile(file, path.basename(file));
        a.alt = path.basename(file).replace(/\.[a-z0-9]+$/i, '').replace(/-/g, ' ');
        store.saveAsset({ ...(store.getAsset(a.id) ?? a), alt: a.alt });
        known[key] = a.id;
        store.setKv('local_media', known);
      } catch (e) {
        status.failed.push(`${path.basename(file)}: ${(e as Error).message}`);
      }
    }
    set({ done: status.done + 1 });
  }
  return known;
}

/** Projecten (opnieuw) vullen, met beelden waar die er al zijn. */
function writeProjects(images: Record<string, string>) {
  const bySlug = new Map(store.listProjects().map((p) => [p.slug, p.id]));
  for (const p of legacyProjects(images)) store.saveProject({ ...p, id: bySlug.get(p.slug) });
}

export async function installStarter(opts: { importImages: boolean }) {
  if (status.state === 'running') throw new Error('De installatie loopt al');
  status = { state: 'running', step: 'Back-up maken', done: 0, total: 0, failed: [] };
  try {
    backup();

    set({ step: 'Merkbestanden toevoegen' });
    const assets = await brandAssets();

    set({ step: 'Lettertypes ophalen (Bricolage Grotesque, DM Sans, Unbounded)' });
    const { theme, failed } = await themeWithFonts();
    status.failed.push(...failed);

    set({ step: 'Thema, pagina’s en projecten plaatsen' });
    const tx = store.transaction(() => {
      store.saveSite(vystaraSite(store.getSite(), assets, theme));
      for (const c of store.listComponents()) store.deleteComponent(c.id);
      for (const c of vystaraComponents()) store.saveComponent(c);
      for (const p of store.listPages()) store.deletePage(p.id);
      vystaraPages(assets).forEach((p, i) => store.createPage({ ...p, sort: i }));
      for (const p of store.listProjects()) store.deleteProject(p.id);
    });
    tx();
    const local = await importLocalMedia();
    writeProjects({ ...store.getKv<Record<string, string>>('legacy_images', {}), ...local });

    if (opts.importImages) {
      const images = await importLegacyImages();
      set({ step: 'Beelden aan projecten koppelen' });
      writeProjects({ ...images, ...local });
    }
    set({ state: 'done', step: 'Klaar', finishedAt: new Date().toISOString() });
  } catch (e) {
    set({ state: 'error', error: (e as Error).message, step: 'Mislukt' });
    console.error('Startsite installeren mislukt', e);
  }
}
