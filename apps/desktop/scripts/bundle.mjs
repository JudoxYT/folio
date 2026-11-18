// Bouwt alles wat de desktop-app meeneemt:
//   app/server.mjs   de server in één bestand (geen TypeScript of tsx nodig op de pc van de gebruiker)
//   app/studio/      de gebouwde Studio
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const desk = path.resolve(here, '..');
const root = path.resolve(desk, '../..');
const out = path.join(desk, 'app');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

console.log('• Studio bouwen…');
execSync('npx vite build', { cwd: path.join(root, 'apps/studio'), stdio: 'inherit' });
fs.cpSync(path.join(root, 'apps/studio/dist'), path.join(out, 'studio'), { recursive: true });
// Folio-icoon en -naam in de Studio (in plaats van die van Vystara).
const sharp = (await import('sharp')).default;
const icon = path.join(desk, 'build/icon.png');
for (const [f, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-maskable.png', 512]]) await sharp(icon).resize(size, size).png().toFile(path.join(out, 'studio', f));
const mf = path.join(out, 'studio/manifest.webmanifest');
if (fs.existsSync(mf)) fs.writeFileSync(mf, JSON.stringify({ ...JSON.parse(fs.readFileSync(mf, 'utf8')), name: 'Folio', short_name: 'Folio', description: 'Bouw en publiceer je eigen website.' }, null, 2));

console.log('• Server bundelen…');
await build({
  entryPoints: [path.join(root, 'apps/server/src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: path.join(out, 'server.mjs'),
  // Binaire pakketten blijven los (die worden per besturingssysteem meegeleverd).
  external: ['sharp', 'ffmpeg-static', '@ffprobe-installer/ffprobe', 'cloudflared'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: 'warning',
});
console.log('• Sjablonen…');
const tpl = await build({
  stdin: { contents: "export { SITE_TEMPLATES } from './packages/core/src/templates.ts';", resolveDir: root, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning',
});
const tmp = path.join(out, '_tpl.mjs');
fs.writeFileSync(tmp, tpl.outputFiles[0].text);
const { SITE_TEMPLATES } = await import(`file://${tmp}`);
fs.rmSync(tmp);
fs.writeFileSync(path.join(out, 'templates.json'), JSON.stringify(SITE_TEMPLATES, null, 2));
console.log('✓ Klaar: app/server.mjs, app/studio/ en app/templates.json');
