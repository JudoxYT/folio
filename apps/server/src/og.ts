// ─────────────────────────────────────────────────────────────
// Deel-afbeeldingen: het plaatje dat verschijnt als iemand een link naar je site
// in Discord, WhatsApp of op sociale media plakt. Pagina's zonder eigen beeld krijgen
// automatisch een kaart in de kleuren van de site, met de paginatitel erop.
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { siteTheme, type SiteSettings } from '@vystara/core';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const unesc = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Thema-kleur (hex, token:rol of token:palet) → echte kleur. */
function colors(site: SiteSettings) {
  const theme = siteTheme(site);
  const scheme = (theme.schemes[theme.defaultScheme] ?? Object.values(theme.schemes)[0] ?? {}) as Record<string, string>;
  const resolve = (v: string | undefined, depth = 0): string | undefined => {
    if (!v || depth > 4) return undefined;
    if (v.startsWith('token:')) {
      const k = v.slice(6);
      return resolve(theme.palette?.[k] ?? scheme[k], depth + 1);
    }
    return /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\()/i.test(v.trim()) ? v.trim() : undefined;
  };
  return {
    bg: resolve(scheme.bg) ?? '#111111',
    text: resolve(scheme.heading) ?? resolve(scheme.text) ?? '#ffffff',
    muted: resolve(scheme.muted) ?? resolve(scheme.text) ?? '#aaaaaa',
    accent: resolve(scheme.accent) ?? '#ff4d6d',
  };
}

/** Titel over maximaal drie regels verdelen. */
function lines(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) out.push(cur);
  if (out.length > 3) {
    out.length = 3;
    out[2] = out[2].replace(/\s*\S*$/, '') + '…';
  }
  return out.map((l) => (l.length > max + 4 ? l.slice(0, max + 2) + '…' : l));
}

export async function shareCard(site: SiteSettings, title: string, sub: string): Promise<Buffer> {
  const c = colors(site);
  const big = title.length > 40 ? 64 : 80;
  const ls = lines(title, big === 80 ? 22 : 28);
  const lh = big * 1.12;
  const top = 315 - ((ls.length - 1) * lh) / 2 + big * 0.35;
  const font = "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', sans-serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${esc(c.bg)}"/>
<circle cx="1110" cy="80" r="260" fill="${esc(c.accent)}" opacity="0.16"/>
<circle cx="1180" cy="560" r="150" fill="${esc(c.accent)}" opacity="0.10"/>
<rect x="80" y="86" width="72" height="10" rx="5" fill="${esc(c.accent)}"/>
<text x="80" y="150" font-family="${font}" font-size="32" font-weight="600" fill="${esc(c.muted)}">${esc(site.name || '')}</text>
${ls.map((l, i) => `<text x="80" y="${Math.round(top + i * lh)}" font-family="${font}" font-size="${big}" font-weight="800" fill="${esc(c.text)}">${esc(l)}</text>`).join('\n')}
${sub ? `<text x="80" y="560" font-family="${font}" font-size="28" fill="${esc(c.muted)}">${esc(sub.length > 70 ? sub.slice(0, 68) + '…' : sub)}</text>` : ''}
</svg>`;
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Alle gebouwde HTML-pagina's zonder deel-afbeelding krijgen er een.
 * `base` = adres van de live site (voor een volledige link; leeg = relatief).
 */
export async function addShareImages(out: string, site: SiteSettings, base: string) {
  const htmlFiles: string[] = [];
  const walkDir = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && !['media', 'api', 'og'].includes(e.name)) walkDir(p);
      else if (e.isFile() && e.name.endsWith('.html')) htmlFiles.push(p);
    }
  };
  walkDir(out);
  let made = 0;
  const done = new Map<string, string>();
  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('property="og:image"')) {
      // Eigen beeld, maar zonder volledig adres (geen eigen domein): Discord en WhatsApp hebben een volledig adres nodig.
      if (base && /property="og:image" content="\//.test(html)) {
        const b = base.replace(/\/$/, '');
        fs.writeFileSync(file, html.replace(/(property="og:image" content=")\//, `$1${b}/`).replace(/(name="twitter:image" content=")\//, `$1${b}/`));
      }
      continue;
    }
    if (!html.includes('</head>') || site.autoShareImage === false) continue;
    const title = unesc(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? site.name ?? '');
    const isHome = title === site.name;
    const sub = isHome ? site.description ?? '' : site.domain ?? '';
    const key = crypto.createHash('sha1').update(`${title}\n${sub}`).digest('hex').slice(0, 12);
    let rel = done.get(key);
    if (!rel) {
      rel = `og/${key}.png`;
      try {
        fs.mkdirSync(path.join(out, 'og'), { recursive: true });
        fs.writeFileSync(path.join(out, rel), await shareCard(site, isHome ? site.name || title : title, sub));
        made++;
      } catch (e) {
        console.warn('Deel-afbeelding maken mislukt:', (e as Error).message);
        continue;
      }
      done.set(key, rel);
    }
    const url = `${base.replace(/\/$/, '')}/${rel}`;
    const tags = `<meta property="og:image" content="${esc(url)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${esc(url)}">`;
    html = html.replace('<meta name="twitter:card" content="summary">', '<meta name="twitter:card" content="summary_large_image">').replace('</head>', `${tags}</head>`);
    fs.writeFileSync(file, html);
  }
  return made;
}
