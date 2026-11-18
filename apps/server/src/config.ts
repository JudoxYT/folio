import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// .env in de projectmap inlezen (handig op hosts waar je geen omgevingsvariabelen kunt zetten).
const envFile = path.resolve(here, '../../../.env');
if (process.env.FOLIO !== '1' && fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

/**
 * ffmpeg/ffprobe: eerst een eigen pad (FFMPEG_PATH), dan een geïnstalleerde versie op de pc,
 * en anders de versie die met npm install is meegekomen. Zo werkt video ook zonder losse installatie.
 */
function tool(name: 'ffmpeg' | 'ffprobe', env?: string): string {
  if (env) return env;
  try {
    execFileSync(name, ['-version'], { stdio: 'ignore' });
    return name;
  } catch {
    /* niet op de pc */
  }
  try {
    const p = name === 'ffmpeg' ? (require('ffmpeg-static') as string) : (require('@ffprobe-installer/ffprobe') as { path: string }).path;
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* niet meegeïnstalleerd */
  }
  return name;
}
const root = path.resolve(here, '../../..');

const folio = process.env.FOLIO === '1';

export const config = {
  /** 'folio' = de deelbare desktop-app (neutraal, zonder inloggen); 'vystara' = je eigen Studio. */
  edition: (folio ? 'folio' : 'vystara') as 'folio' | 'vystara',
  productName: folio ? 'Folio' : 'Vystara Studio',
  /** Desktop: geheime sleutel waarmee de app zichzelf aanmeldt (alleen bekend bij de app). */
  desktopKey: folio ? process.env.FOLIO_KEY ?? '' : '',
  /** Desktop: sjabloon en naam voor een nieuwe site. */
  template: process.env.FOLIO_TEMPLATE ?? 'portfolio',
  siteName: process.env.FOLIO_SITE_NAME ?? 'Mijn website',
  /** Desktop luistert alleen op de eigen pc. */
  host: folio ? '127.0.0.1' : undefined,
  port: Number(process.env.PORT ?? 8787),
  /** Alles wat je bewaart: database, uploads en de gepubliceerde site. */
  dataDir: path.resolve(process.env.DATA_DIR ?? path.join(root, 'data')),
  studioDist: path.resolve(process.env.STUDIO_DIST ?? path.join(root, 'apps/studio/dist')),
  /** Optioneel commando na publiceren, bv. uploaden naar Cloudflare Pages. */
  publishCommand: process.env.PUBLISH_COMMAND ?? '',
  /** Zet op 1 achter HTTPS (Cloudflare Tunnel) voor veilige cookies. */
  secureCookies: process.env.SECURE_COOKIES === '1',
  /** Optioneel: webhook voor formulierinzendingen (bv. een Discord-webhook). */
  formWebhook: process.env.FORM_WEBHOOK_URL ?? '',
  ffmpeg: tool('ffmpeg', process.env.FFMPEG_PATH),
  ffprobe: tool('ffprobe', process.env.FFPROBE_PATH),
};

export const paths = {
  db: path.join(config.dataDir, folio ? 'site.db' : 'vystara.db'),
  media: path.join(config.dataDir, 'media'),
  uploads: path.join(config.dataDir, 'tmp-uploads'),
  site: path.join(config.dataDir, 'site'),
};

for (const p of [config.dataDir, paths.media, paths.uploads, paths.site]) fs.mkdirSync(p, { recursive: true });
