import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { uid, sanitizeSvg, type Asset } from '@vystara/core';
import { config, paths } from './config.js';
import { saveAsset, getAsset, deleteAssetRow } from './db.js';

const IMAGE_WIDTHS = [480, 960, 1600, 2400];

// Alle gangbare foto- en videoformaten. Onbekende extensies worden met ffprobe herkend.
const IMAGE_EXT = ['jpg', 'jpeg', 'jfif', 'pjpeg', 'png', 'apng', 'webp', 'avif', 'gif', 'svg', 'heic', 'heif', 'tif', 'tiff', 'bmp', 'ico', 'jxl'];
const VIDEO_EXT = ['mp4', 'm4v', 'mov', 'qt', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'f4v', 'mpeg', 'mpg', 'm2v', 'ts', 'mts', 'm2ts', '3gp', '3g2', 'ogv', 'ogg', 'mxf', 'vob', 'divx', 'dv', 'asf', 'rm', 'rmvb'];
const FONT_EXT = ['woff2', 'woff', 'ttf', 'otf'];

const EXT_KIND: Record<string, Asset['kind']> = Object.fromEntries([
  ...IMAGE_EXT.map((e) => [e, 'image']),
  ...VIDEO_EXT.map((e) => [e, 'video']),
  ...FONT_EXT.map((e) => [e, 'font']),
]) as Record<string, Asset['kind']>;

/** Formaten die browsers direct tonen; de rest wordt omgezet. */
const WEB_IMAGE = ['jpg', 'jpeg', 'jfif', 'png', 'apng', 'webp', 'avif', 'gif', 'svg'];

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', png: 'image/png', apng: 'image/apng', webp: 'image/webp', avif: 'image/avif',
  gif: 'image/gif', svg: 'image/svg+xml', heic: 'image/heic', heif: 'image/heif', tif: 'image/tiff', tiff: 'image/tiff', bmp: 'image/bmp',
  ico: 'image/x-icon', jxl: 'image/jxl',
  mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv', flv: 'video/x-flv', mpeg: 'video/mpeg', mpg: 'video/mpeg', '3gp': 'video/3gpp', ogv: 'video/ogg', ts: 'video/mp2t',
  woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', pdf: 'application/pdf',
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file).slice(1).toLowerCase()] ?? 'application/octet-stream';
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(err.slice(-2000)))));
  });
}

// ── Uploads in stukken (Cloudflare laat max ~100 MB per verzoek door) ──

export function startUpload(): string {
  const id = uid('up');
  fs.writeFileSync(path.join(paths.uploads, id), '');
  return id;
}

export async function appendChunk(uploadId: string, body: ReadableStream<Uint8Array> | null) {
  if (!/^up_[a-z0-9]+$/.test(uploadId)) throw new Error('Ongeldige upload');
  const file = path.join(paths.uploads, uploadId);
  if (!fs.existsSync(file) || !body) throw new Error('Upload niet gevonden');
  const out = fs.createWriteStream(file, { flags: 'a' });
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!out.write(value)) await new Promise((r) => out.once('drain', r));
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  return fs.statSync(file).size;
}

/** Zet een afgeronde upload om naar een asset (afbeeldingsformaten, videoposter). */
export async function finishUpload(uploadId: string, originalName: string): Promise<Asset> {
  if (!/^up_[a-z0-9]+$/.test(uploadId)) throw new Error('Ongeldige upload');
  const tmp = path.join(paths.uploads, uploadId);
  if (!fs.existsSync(tmp)) throw new Error('Upload niet gevonden');

  const ext = (path.extname(originalName).slice(1).toLowerCase() || 'bin').replace(/[^a-z0-9]/g, '');
  let kind = EXT_KIND[ext] ?? 'file';
  // Onbekende extensie: vraag ffprobe wat het is.
  if (kind === 'file') kind = await sniff(tmp);
  const id = uid('a');
  const dir = path.join(paths.media, id);
  fs.mkdirSync(dir, { recursive: true });
  const originalFile = path.join(dir, `original.${ext}`);
  fs.renameSync(tmp, originalFile);

  const asset: Asset = {
    id,
    kind,
    url: `/media/${id}/original.${ext}`,
    originalName: path.basename(originalName).slice(0, 200),
    mime: mimeFor(originalFile),
    size: fs.statSync(originalFile).size,
    variants: [],
    alt: '',
    status: 'ready',
    createdAt: new Date().toISOString(),
  };

  if (kind === 'image' && ext === 'svg') {
    // SVG's veilig maken: geen scripts of event-handlers.
    const clean = sanitizeSvg(fs.readFileSync(originalFile, 'utf8'));
    fs.writeFileSync(originalFile, clean);
    asset.size = Buffer.byteLength(clean);
    const vb = clean.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (vb) {
      asset.width = Math.round(Number(vb[1]));
      asset.height = Math.round(Number(vb[2]));
    }
  } else if (kind === 'image') {
    try {
      await processImage(asset, originalFile, ext);
    } catch (e) {
      console.warn('Afbeelding kon niet verwerkt worden', e);
      asset.status = 'error';
    }
  }

  saveAsset(asset);

  // Een GIF krijgt ook een video-versie: tot wel tien keer kleiner, zelfde beweging.
  if (kind === 'image' && ext === 'gif') {
    gifToVideo(asset, originalFile).catch((e) => console.warn('GIF naar video mislukt', e));
  }

  if (kind === 'video') {
    asset.status = 'processing';
    saveAsset(asset);
    queued(() => processVideo(asset, originalFile)).catch((e) => {
      console.warn('Video verwerken mislukt', e);
      const a = getAsset(id);
      if (a) saveAsset({ ...a, status: 'error' });
    });
  }
  return asset;
}

/** Bestand zonder bekende extensie: video, beeld of iets anders? */
async function sniff(file: string): Promise<Asset['kind']> {
  try {
    const p = JSON.parse(await run(config.ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name:format=format_name,duration', '-of', 'json', file]));
    const v = (p.streams ?? []).find((x: { codec_type: string }) => x.codec_type === 'video');
    if (v && Number(p.format?.duration ?? 0) > 0.2) return 'video';
    if (v) return 'image';
  } catch {
    /* geen media */
  }
  try {
    await sharp(file).metadata();
    return 'image';
  } catch {
    return 'file';
  }
}

/** Foto → WebP-varianten. Formaten die sharp niet kent (HEIC van iPhone, ICO, ...) eerst via ffmpeg naar PNG. */
async function processImage(asset: Asset, file: string, ext: string) {
  const dir = path.dirname(file);
  let src = file;
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(src, { animated: ext === 'gif' }).metadata();
  } catch {
    src = path.join(dir, 'decoded.png');
    await run(config.ffmpeg, ['-y', '-i', file, '-frames:v', '1', src]);
    meta = await sharp(src).metadata();
  }
  const rotated = await sharp(src).rotate().metadata().catch(() => meta);
  asset.width = rotated.autoOrient?.width ?? meta.width ?? null;
  asset.height = rotated.autoOrient?.height ?? (ext === 'gif' ? meta.pageHeight : meta.height) ?? null;
  const widths = IMAGE_WIDTHS.filter((w) => !asset.width || w <= asset.width);
  if (!widths.length && asset.width) widths.push(asset.width);
  for (const w of widths) {
    const out = path.join(dir, `${w}.webp`);
    await sharp(src, { animated: ext === 'gif' }).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toFile(out);
    asset.variants.push({ width: w, url: `/media/${asset.id}/${w}.webp`, type: 'image/webp' });
  }
  // Niet-webformaten (HEIC, TIFF, BMP, ...): de grootste WebP wordt het "origineel" dat browsers tonen.
  if (!WEB_IMAGE.includes(ext) && asset.variants.length) {
    asset.url = asset.variants[asset.variants.length - 1].url;
    asset.mime = 'image/webp';
  }
  if (src !== file) fs.rmSync(src, { force: true });
}

async function gifToVideo(asset: Asset, file: string) {
  const dir = path.dirname(file);
  const out = path.join(dir, 'gif.mp4');
  await run(config.ffmpeg, ['-y', '-i', file, '-movflags', '+faststart', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-an', out]);
  const cur = getAsset(asset.id);
  if (!cur) return;
  saveAsset({ ...cur, variants: [...cur.variants, { width: cur.width ?? 0, url: `/media/${asset.id}/gif.mp4`, type: 'video/mp4' }] });
}

/**
 * Elk videoformaat → web-versie(s) + poster. Draait op de achtergrond.
 * - Altijd: MP4 (H.264, max 1920 breed, faststart) — speelt overal af.
 * - Met transparantie (bv. ProRes 4444, WebM met alfa): ook WebM VP9 met alfa, die gaat voor.
 * - Met VIDEO_WEBM=1: ook een WebM (VP9) voor kleinere bestanden in moderne browsers.
 */
/** Hooguit twee video's tegelijk omzetten, zodat een grote import de pc niet platlegt. */
let busy = 0;
const waiting: (() => void)[] = [];
async function queued<T>(job: () => Promise<T>): Promise<T> {
  if (busy >= 2) await new Promise<void>((r) => waiting.push(r));
  busy++;
  try {
    return await job();
  } finally {
    busy--;
    waiting.shift()?.();
  }
}

async function processVideo(asset: Asset, file: string) {
  const dir = path.dirname(file);
  const probe = JSON.parse(
    await run(config.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt,codec_name:stream_tags=rotate,alpha_mode:format=duration', '-of', 'json', file]),
  );
  const width = probe.streams?.[0]?.width ?? null;
  const height = probe.streams?.[0]?.height ?? null;
  const pixFmt: string = probe.streams?.[0]?.pix_fmt ?? '';
  const codec: string = probe.streams?.[0]?.codec_name ?? '';
  // WebM (VP8/VP9) bewaart transparantie apart: ffprobe meldt dan yuv420p met de tag alpha_mode=1.
  const alpha = /^(yuva|rgba|argb|bgra|abgr|gbrap|ya)/.test(pixFmt) || Object.entries(probe.streams?.[0]?.tags ?? {}).some(([k, v]) => k.toLowerCase() === 'alpha_mode' && String(v) === '1');
  // Alleen de libvpx-decoder leest dat transparante kanaal.
  const dec = alpha && (codec === 'vp9' || codec === 'vp8') ? ['-c:v', codec === 'vp9' ? 'libvpx-vp9' : 'libvpx'] : [];
  const duration = Number(probe.format?.duration ?? 0);

  const posterPng = path.join(dir, 'poster.png');
  await run(config.ffmpeg, ['-y', '-ss', String(Math.min(1, duration / 2)), ...dec, '-i', file, '-frames:v', '1', posterPng]);
  await sharp(posterPng).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 80, alphaQuality: 90 }).toFile(path.join(dir, 'poster.webp'));
  fs.rmSync(posterPng);

  const web = path.join(dir, 'web.mp4');
  await run(config.ffmpeg, [
    '-y', '-i', file,
    '-vf', "scale='min(1920,iw)':-2",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    web,
  ]);

  const variants: Asset['variants'] = [];
  if (alpha || process.env.VIDEO_WEBM === '1') {
    const webm = path.join(dir, 'web.webm');
    await run(config.ffmpeg, [
      '-y', ...dec, '-i', file, '-vf', "scale='min(1920,iw)':-2",
      '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
      '-pix_fmt', alpha ? 'yuva420p' : 'yuv420p', '-c:a', 'libopus', '-b:a', '96k', webm,
    ]);
    variants.push({ width: Math.min(1920, width ?? 1920), url: `/media/${asset.id}/web.webm`, type: 'video/webm' });
  }
  variants.push({ width: Math.min(1920, width ?? 1920), url: `/media/${asset.id}/web.mp4`, type: 'video/mp4' });

  const cur = getAsset(asset.id);
  if (!cur) return; // intussen verwijderd
  saveAsset({ ...cur, width, height, poster: `/media/${asset.id}/poster.webp`, variants, status: 'ready' });
}

export function deleteAsset(id: string) {
  if (!/^a_[a-z0-9]+$/.test(id)) return;
  fs.rmSync(path.join(paths.media, id), { recursive: true, force: true });
  deleteAssetRow(id);
}
