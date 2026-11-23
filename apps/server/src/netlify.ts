// ─────────────────────────────────────────────────────────────
// Publiceren naar Netlify met één klik.
// Eén keer een (gratis) Netlify-token plakken; daarna maakt Folio zelf een site aan
// en zet hij elke nieuwe versie online als zip-deploy. Het adres blijft hetzelfde.
// ─────────────────────────────────────────────────────────────
import crypto from 'node:crypto';
import { paths } from './config.js';
import { getKv, getSecret, getSite, setKv, setSecret, slugify } from './db.js';
import { zipDir } from './zip.js';

const API = () => (process.env.NETLIFY_API_URL ?? 'https://api.netlify.com/api/v1').replace(/\/$/, '');

interface NetlifySite {
  siteId: string;
  name: string;
  url: string;
  adminUrl: string;
  autoPush: boolean;
}
export interface NetlifyResult {
  ok: boolean;
  message: string;
  url?: string;
  at: string;
}

const EMPTY: NetlifySite = { siteId: '', name: '', url: '', adminUrl: '', autoPush: true };

export function getNetlify() {
  const s = getKv<NetlifySite>('netlify', EMPTY);
  return { ...s, hasToken: !!getSecret('netlify_token'), last: getKv<NetlifyResult | null>('netlify_last', null) };
}

/** Het adres waarop de site live staat (voor deel-afbeeldingen als er geen eigen domein is). */
export function netlifyUrl(): string {
  return getKv<NetlifySite>('netlify', EMPTY).url;
}

async function nf<T>(method: string, p: string, body?: unknown, raw?: { data: Buffer; type: string }): Promise<{ status: number; json: T }> {
  const token = getSecret('netlify_token');
  if (!token) throw new Error('Nog geen Netlify-token ingesteld');
  let res!: Response;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(API() + p, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'folio',
          ...(raw ? { 'content-type': raw.type } : body ? { 'content-type': 'application/json' } : {}),
        },
        body: raw ? new Uint8Array(raw.data) : body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(raw ? 10 * 60_000 : 30_000),
      });
      if (res.status >= 500 && attempt < 3) throw new Error(`Netlify gaf ${res.status}`);
      break;
    } catch (e) {
      if (attempt >= 3) throw new Error(`Netlify is niet bereikbaar (${(e as Error).message})`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  const json = (await res.json().catch(() => ({}))) as T;
  if (res.status === 401) throw new Error('Netlify accepteert de token niet (verlopen of verkeerd gekopieerd). Plak een nieuwe.');
  return { status: res.status, json };
}

export async function saveNetlify(body: { token?: string | null; autoPush?: boolean; forget?: boolean }) {
  const cur = getKv<NetlifySite>('netlify', EMPTY);
  if (body.token !== undefined) {
    const t = body.token?.trim() || null;
    setSecret('netlify_token', t);
    if (t) {
      try {
        const r = await nf<{ email?: string }>('GET', '/user');
        if (r.status !== 200) throw new Error(`Netlify gaf ${r.status}`);
      } catch (e) {
        setSecret('netlify_token', null);
        throw e;
      }
    }
  }
  const next = body.forget ? { ...EMPTY, autoPush: cur.autoPush } : cur;
  setKv('netlify', { ...next, autoPush: body.autoPush ?? next.autoPush });
  if (body.forget) setKv('netlify_last', null);
  return getNetlify();
}

interface ApiSite { id: string; name: string; url?: string; ssl_url?: string; admin_url?: string }

/** Zorgt dat er een Netlify-site is (vóór het bouwen, zodat het adres bekend is voor deel-afbeeldingen). */
export async function ensureSite(): Promise<NetlifySite> {
  const cur = getKv<NetlifySite>('netlify', EMPTY);
  if (cur.siteId) {
    const r = await nf<ApiSite>('GET', `/sites/${cur.siteId}`);
    if (r.status === 200) return cur;
    if (r.status !== 404) throw new Error(`Netlify gaf ${r.status} bij het ophalen van je site`);
  }
  // Nieuwe site: naam van de website + een kort willekeurig stukje (namen zijn wereldwijd uniek).
  const base = (slugify(getSite().name) || 'folio-site').slice(0, 40).replace(/-+$/, '');
  for (let i = 0; i < 5; i++) {
    const name = `${base}-${crypto.randomBytes(2).toString('hex')}`;
    const r = await nf<ApiSite & { errors?: unknown; message?: string }>('POST', '/sites', { name });
    if (r.status === 201 || r.status === 200) {
      const s: NetlifySite = {
        siteId: r.json.id,
        name: r.json.name,
        url: r.json.ssl_url || r.json.url || `https://${r.json.name}.netlify.app`,
        adminUrl: r.json.admin_url || `https://app.netlify.com/sites/${r.json.name}`,
        autoPush: cur.autoPush,
      };
      setKv('netlify', s);
      return s;
    }
    if (r.status !== 422) throw new Error(`Netlify kon geen site aanmaken (${r.status}${r.json.message ? `: ${r.json.message}` : ''})`);
  }
  throw new Error('Netlify kon geen vrije sitenaam vinden. Probeer het nog eens.');
}

interface ApiDeploy { id: string; state: string; error_message?: string; ssl_url?: string; url?: string }

/** De gebouwde site (map "site") online zetten. Roep eerst publish() aan. */
export async function pushNetlify(): Promise<NetlifyResult> {
  const at = new Date().toISOString();
  try {
    const site = await ensureSite();
    const zip = zipDir(paths.site);
    const d = await nf<ApiDeploy & { message?: string }>('POST', `/sites/${site.siteId}/deploys`, undefined, { data: zip, type: 'application/zip' });
    if (d.status !== 200 && d.status !== 201) throw new Error(`Uploaden mislukt (${d.status}${d.json.message ? `: ${d.json.message}` : ''})`);
    // Netlify verwerkt de upload nog even; wachten tot hij live staat.
    let state = d.json.state, err = d.json.error_message;
    const until = Date.now() + 3 * 60_000;
    while (!['ready', 'error'].includes(state) && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 1500));
      const s = await nf<ApiDeploy>('GET', `/deploys/${d.json.id}`);
      state = s.json.state;
      err = s.json.error_message;
    }
    if (state === 'error') throw new Error(`Netlify meldt een fout: ${err || 'onbekend'}`);
    const result: NetlifyResult = state === 'ready'
      ? { ok: true, message: `Online op ${site.url}`, url: site.url, at }
      : { ok: true, message: `Geüpload. Netlify is nog bezig; over een minuut staat hij op ${site.url}`, url: site.url, at };
    setKv('netlify_last', result);
    return result;
  } catch (e) {
    const result: NetlifyResult = { ok: false, message: (e as Error).message, at };
    setKv('netlify_last', result);
    return result;
  }
}
