// Google Fonts downloaden en zelf hosten. Bezoekers maken dan geen verbinding met
// Google (beter voor privacy/AVG) en de fonts laden van je eigen domein.
import fs from 'node:fs';
import path from 'node:path';
import { paths } from './config.js';
import type { FontDef } from '@vystara/core';

// Moderne browser-user-agent: dan levert Google WOFF2 met unicode-range-blokken.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export async function downloadGoogleFont(family: string, weights: number[] = [400, 500, 600, 700], italic = false): Promise<FontDef> {
  const clean = family.trim();
  if (!/^[A-Za-z0-9 ]{2,60}$/.test(clean)) throw new Error('Ongeldige fontnaam');
  const w = [...new Set(weights)].filter((x) => x >= 100 && x <= 900).sort((a, b) => a - b);
  const axis = italic ? `ital,wght@${[...w.map((x) => `0,${x}`), ...w.map((x) => `1,${x}`)].join(';')}` : `wght@${w.join(';')}`;
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(clean).replace(/%20/g, '+')}:${axis}&display=swap`;
  let res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (res.status === 400) {
    // Sommige fonts hebben maar één gewicht: probeer zonder gewichten.
    res = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(clean).replace(/%20/g, '+')}&display=swap`, { headers: { 'User-Agent': UA } });
  }
  if (!res.ok) throw new Error(res.status === 400 ? `"${clean}" staat niet in Google Fonts` : `Google Fonts gaf fout ${res.status}`);
  let css = await res.text();

  const slug = clean.toLowerCase().replace(/\s+/g, '-');
  const dir = path.join(paths.media, 'fonts', slug);
  fs.mkdirSync(dir, { recursive: true });
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]))];
  if (!urls.length) throw new Error('Geen fontbestanden gevonden');
  let i = 0;
  for (const u of urls) {
    const file = `${String(i++).padStart(3, '0')}.woff2`;
    const r = await fetch(u, { headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error(`Fontbestand downloaden mislukt (${r.status})`);
    fs.writeFileSync(path.join(dir, file), Buffer.from(await r.arrayBuffer()));
    css = css.split(u).join(`/media/fonts/${slug}/${file}`);
  }
  // Alleen @font-face-blokken bewaren (geen commentaar).
  css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').trim();
  const generic = /serif|garamond|fraunces|playfair/i.test(clean) && !/sans/i.test(clean) ? 'serif' : /mono/i.test(clean) ? 'monospace' : 'sans-serif';
  return { family: clean, stack: `"${clean}", ${generic === 'serif' ? 'Georgia, serif' : generic === 'monospace' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'}`, source: 'google', css };
}
