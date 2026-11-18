import { edition, isFolio } from './edition';
import { useEffect, useState } from 'react';
import { api } from './api';
import { flushSave, patchState, toast, useStore } from './store';
import { Modal, Row, Text, Toggle } from './ui';

interface DeployState {
  repo: string;
  branch: string;
  autoPush: boolean;
  hasToken: boolean;
  hasHook: boolean;
  last: { ok: boolean; message: string; commitUrl?: string; skipped?: string[]; at: string } | null;
}

type Tab = 'online' | 'vercel' | 'server' | 'pages';

export function HostingModal() {
  const [tab, setTab] = useState<Tab>(isFolio() ? 'online' : 'vercel');
  const tabs: [Tab, string][] = isFolio()
    ? [['online', 'Online zetten'], ['vercel', 'GitHub + Vercel (gevorderd)']]
    : [['vercel', 'GitHub + Vercel'], ['server', 'Eigen server'], ['pages', 'Cloudflare Pages']];
  return (
    <Modal title="Publiceren & hosting" onClose={() => patchState({ modal: null })} wide>
      <div className="vs-insert-tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'online' && <Online />}
      {tab === 'vercel' && <Vercel />}
      {tab === 'server' && <OwnServer />}
      {tab === 'pages' && <Pages />}
    </Modal>
  );
}

type FolioBridge = { revealSite: () => Promise<void>; external: (u: string) => Promise<void> };
const bridge = () => (window as unknown as { folio?: FolioBridge }).folio;

/** Folio: de makkelijkste manieren om je site online te zetten, zonder accounts te koppelen. */
function Online() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const prepare = async () => {
    setBusy(true);
    try {
      await flushSave();
      await api.post('/api/publish');
      setDone(true);
      await bridge()?.revealSite();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <p className="vs-help" style={{ marginBottom: 18 }}>
        Je website is een map met gewone bestanden (HTML, afbeeldingen). Die kun je overal online zetten. Dit is de snelste manier, gratis en zonder iets te installeren:
      </p>
      <h3 style={{ margin: '4px 0 12px' }}>Gratis online met Netlify Drop</h3>
      <Step n={1} title="Maak je website klaar" done={done}>
        <p>Folio zet de nieuwste versie in een map en opent die voor je.</p>
        <button className="vs-btn primary" disabled={busy} onClick={prepare}>{busy ? 'Bezig…' : 'Website klaarmaken en map openen'}</button>
      </Step>
      <Step n={2} title="Open Netlify Drop">
        <p>Maak een gratis account (bijvoorbeeld met je Google- of GitHub-account), dan kun je je site later bijwerken en een eigen naam geven.</p>
        <button className="vs-btn" onClick={() => void bridge()?.external('https://app.netlify.com/drop')}>Netlify Drop openen ↗</button>
      </Step>
      <Step n={3} title="Sleep de map naar de pagina">
        <p>Sleep de map <code>site</code> (die net is geopend) naar het vak op de Netlify-pagina. Na een paar seconden krijg je een adres zoals <code>jouw-naam.netlify.app</code>. Klaar!</p>
      </Step>
      <Step n={4} title="Later bijwerken">
        <p>Heb je iets veranderd? Doe stap 1 opnieuw en sleep de map in Netlify naar <b>Deploys</b> van je site. Het adres blijft hetzelfde.</p>
      </Step>
      <h3 style={{ margin: '26px 0 8px' }}>Of: download als zip</h3>
      <p className="vs-help">Voor een eigen hosting, je school of om op te sturen. Pak de zip uit en upload de inhoud naar je webserver.</p>
      <a className="vs-btn" href="/api/export.zip" download>Website downloaden als zip</a>
      <p className="vs-help" style={{ marginTop: 18 }}>Let op: een contactformulier werkt alleen met GitHub + Vercel of je eigen server. Op Netlify en andere hosts kun je beter een mailadres als link gebruiken.</p>
    </div>
  );
}

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <div className={`vs-step ${done ? 'done' : ''}`}>
      <div className="vs-step-n">{done ? '✓' : n}</div>
      <div className="vs-step-body">
        <b>{title}</b>
        {children}
      </div>
    </div>
  );
}

function Vercel() {
  const [s, setS] = useState<DeployState | null>(null);
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [token, setToken] = useState('');
  const [hook, setHook] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const site = useStore((st) => st.site);

  const load = async () => {
    const d = await api.get<DeployState>('/api/deploy');
    setS(d);
    setRepo(d.repo);
    setBranch(d.branch);
  };
  useEffect(() => void load(), []);

  const save = async (extra: Record<string, unknown> = {}) => {
    try {
      const d = await api.put<DeployState>('/api/deploy', { repo, branch, ...(token ? { token } : {}), ...(hook ? { hook } : {}), ...extra });
      setS(d);
      setToken('');
      setHook('');
      return d;
    } catch (e) {
      toast((e as Error).message, 'error');
      return null;
    }
  };
  const run = async (what: 'test' | 'push') => {
    setBusy(what);
    if (!(await save())) return setBusy(null);
    try {
      if (what === 'test') setTest(await api.post('/api/deploy/test'));
      else {
        await api.post('/api/publish');
        const r = await api.post<{ message: string }>('/api/deploy/push');
        toast(r.message);
        await load();
      }
    } catch (e) {
      if (what === 'test') setTest({ ok: false, message: (e as Error).message });
      else toast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!s) return <p className="vs-help">Laden…</p>;
  return (
    <div className="vs-modal-cols wide-left">
      <div className="vs-steps">
        <p className="vs-help">
          Zo werkt het: de Studio blijft op je eigen server draaien. Bij publiceren zet de server de complete site (HTML, media, sitemap, redirects) in een GitHub-repository. Vercel ziet die wijziging en zet de site binnen een minuut online, op een snel wereldwijd netwerk.
        </p>
        <Step n={1} title="Maak een (lege) repository op GitHub" done={!!s.repo}>
          <p>Ga naar <a href="https://github.com/new" target="_blank" rel="noopener">github.com/new</a>. Kies een naam (bv. <code>vystara-site</code>), zet hem op <b>Private</b> en klik op <b>Create repository</b>. Je hoeft er verder niets in te zetten.</p>
        </Step>
        <Step n={2} title="Maak een toegangstoken (alleen voor deze repository)" done={s.hasToken}>
          <p>
            Ga naar <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">GitHub → Settings → Developer settings → Fine-grained tokens</a> → <b>Generate new token</b>:
          </p>
          <ul>
            <li>Naam: <code>{edition.productName}</code>, verloopdatum naar keuze (bijvoorbeeld 1 jaar).</li>
            <li><b>Repository access</b>: <i>Only select repositories</i> → kies je nieuwe repository.</li>
            <li><b>Permissions → Repository permissions → Contents</b>: <i>Read and write</i>. Meer is niet nodig.</li>
          </ul>
          <p>Kopieer de token (begint met <code>github_pat_</code>) en plak hem hiernaast. Hij wordt alleen op je server bewaard en nooit meer getoond.</p>
        </Step>
        <Step n={3} title="Test de verbinding en publiceer een eerste keer" done={!!s.last?.ok}>
          <p>Klik hiernaast op <b>Verbinding testen</b> en daarna op <b>Nu publiceren naar GitHub</b>. In je repository verschijnen de bestanden van je site.</p>
        </Step>
        <Step n={4} title="Koppel de repository aan Vercel">
          <p>Ga naar <a href="https://vercel.com/new" target="_blank" rel="noopener">vercel.com/new</a> en log in met GitHub. Kies <b>Import</b> bij je repository en zet:</p>
          <ul>
            <li><b>Framework Preset</b>: <i>Other</i></li>
            <li><b>Build Command</b>: leeg laten (of uitzetten) — de site is al gebouwd</li>
            <li><b>Output Directory</b>: leeg laten (de hoofdmap)</li>
          </ul>
          <p>Klik op <b>Deploy</b>. Na ongeveer een minuut staat je site op een <code>.vercel.app</code>-adres.</p>
        </Step>
        <Step n={5} title="Koppel je eigen domein">
          <p>
            In Vercel: <b>Project → Settings → Domains</b> → voeg je domein toe. Vercel laat zien welke DNS-records nodig zijn; zet die bij je domeinbeheerder (bij Cloudflare: DNS → Add record, en zet het oranje wolkje <i>uit</i> voor deze records). Vul daarna het domein ook in bij ⚙ Site-instellingen, voor de sitemap en Google.
          </p>
        </Step>
        <Step n={6} title="Zet automatisch pushen aan" done={s.autoPush}>
          <p>Met <b>Automatisch na publiceren</b> gaat elke publicatie meteen naar GitHub, en dus naar Vercel. Vergrendel je de site, dan zet hij daar automatisch de onderhoudspagina neer.</p>
        </Step>
        <div className="vs-callout">
          <b>Goed om te weten</b>
          <ul>
            <li><b>De Studio hoeft niet aan te staan</b> voor je live site: Vercel serveert alles zelf. Je moet alleen op Publiceren klikken (met GitHub gekoppeld) om een nieuwe versie live te zetten.</li>
            <li>Formulieren lopen via een Vercel-functie. Zet in Vercel → Settings → Environment Variables <code>FORM_WEBHOOK_URL</code> op een Discord-webhook, dan komt elke inzending in je Discord. Optioneel <code>STUDIO_URL</code> als je ze ook in de Studio-inbox wilt.</li>
            <li>GitHub accepteert geen bestanden boven 100 MB. Grote video’s slaat de push over en meldt dat. Zet in dat geval bij ⚙ Site-instellingen een <i>Media-domein</i> in (je eigen server); dan komen video’s daarvandaan.</li>
            <li>Redirects (bv. oude Squarespace-adressen) gaan automatisch mee in <code>vercel.json</code>.</li>
          </ul>
        </div>
        <div className="vs-callout">
          <b>Overal bewerken (zonder PowerShell)</b>
          <ul>
            <li><b>Op je pc:</b> dubbelklik op <code>Vystara Studio.cmd</code> in de projectmap (of de <code>.vbs</code>-versie, die zonder zwart venster draait). Klik daarna in Chrome of Edge op het installeer-icoon in de adresbalk: dan heb je de Studio als app met eigen icoon.</li>
            <li><b>Altijd online (PebbleHost):</b> upload de projectmap, kies Node.js 22 of nieuwer en zet het startbestand op <code>app.mjs</code>. Zet in <code>.env</code> je <code>TUNNEL_TOKEN</code> van een Cloudflare Tunnel naar <code>http://localhost:{'{poort}'}</code>, met als adres bijvoorbeeld <code>studio.vystarastudios.com</code>. Dan werkt de Studio op elke pc en telefoon, en formulieren komen altijd binnen.</li>
            <li>De volledige stappen staan in <code>README.md</code>, onder "Overal bewerken".</li>
          </ul>
        </div>
      </div>
      <div className="vs-hosting-form">
        <div className="vs-subhead">Koppeling</div>
        <Row label="Repository"><Text value={repo} placeholder="gebruiker/vystara-site" onChange={setRepo} /></Row>
        <Row label="Branch"><Text value={branch} placeholder="main" onChange={setBranch} /></Row>
        <Row label="Token">
          <input className="vs-input" type="password" value={token} placeholder={s.hasToken ? '•••••••• (ingesteld; leeg laten = behouden)' : 'github_pat_…'} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
        </Row>
        {s.hasToken && (
          <Row label="">
            <button className="vs-btn danger" onClick={() => save({ token: null })}>Token verwijderen</button>
          </Row>
        )}
        <Row label="">
          <Toggle value={s.autoPush} onChange={(v) => save({ autoPush: v })} label="Automatisch na publiceren" />
        </Row>
        <details>
          <summary className="vs-muted">Vercel deploy hook (optioneel)</summary>
          <p className="vs-help">Alleen nodig als je de repository niet via Git aan Vercel koppelt. Je vindt hem in Vercel → Settings → Git → Deploy Hooks.</p>
          <input className="vs-input" type="password" value={hook} placeholder={s.hasHook ? '•••••••• (ingesteld)' : 'https://api.vercel.com/v1/integrations/deploy/…'} onChange={(e) => setHook(e.target.value)} />
        </details>
        <div className="vs-row-buttons">
          <button className="vs-btn" onClick={() => run('test')} disabled={!!busy || !repo}>{busy === 'test' ? 'Testen…' : 'Verbinding testen'}</button>
          <button className="vs-btn primary" onClick={() => run('push')} disabled={!!busy || !repo || (!s.hasToken && !token)}>{busy === 'push' ? 'Bezig…' : 'Nu publiceren naar GitHub'}</button>
        </div>
        {test && <div className={`vs-callout ${test.ok ? 'ok' : 'err'}`}>{test.message}</div>}
        {s.last && (
          <div className={`vs-callout ${s.last.ok ? 'ok' : 'err'}`}>
            <b>Laatste push</b> · {new Date(s.last.at).toLocaleString('nl-NL')}
            <div>{s.last.message}</div>
            {s.last.commitUrl && <a href={s.last.commitUrl} target="_blank" rel="noopener">Bekijk op GitHub</a>}
            {!!s.last.skipped?.length && <div>Overgeslagen (te groot voor GitHub): {s.last.skipped.join(', ')}</div>}
          </div>
        )}
        {site?.access?.mode && site.access.mode !== 'open' && <div className="vs-callout err">De site is vergrendeld: er wordt een onderhoudspagina gepusht.</div>}
      </div>
    </div>
  );
}

function OwnServer() {
  return (
    <div className="vs-steps">
      <p className="vs-help">De simpelste route: de server waar de Studio op draait, serveert ook de site. Geen extra diensten nodig.</p>
      <Step n={1} title="Server starten">
        <p>Op de server: <code>docker compose up -d --build</code> (of <code>npm run build && npm start</code>). De site staat dan op poort 8787.</p>
      </Step>
      <Step n={2} title="Bereikbaar maken met Cloudflare Tunnel">
        <p>Maak in Cloudflare (Zero Trust → Networks → Tunnels) een tunnel en zet de token in <code>.env</code> als <code>TUNNEL_TOKEN</code>. Start met <code>docker compose --profile tunnel up -d</code>. Koppel je domein en <code>studio.imjudox.com</code> aan <code>http://vystara:8787</code>.</p>
      </Step>
      <Step n={3} title="Veilige cookies aan">
        <p>Zet <code>SECURE_COOKIES=1</code> in <code>.env</code> zodra alles via HTTPS loopt.</p>
      </Step>
      <p className="vs-help">Voordeel: vergrendelen met wachtwoord werkt hier echt, en wijzigingen staan direct online na publiceren.</p>
    </div>
  );
}

function Pages() {
  return (
    <div className="vs-steps">
      <Step n={1} title="Wrangler instellen">
        <p>Maak in Cloudflare een API-token met "Cloudflare Pages: Edit" en zet in <code>.env</code>: <code>CLOUDFLARE_API_TOKEN</code>, <code>CLOUDFLARE_ACCOUNT_ID</code> en <code>PUBLISH_COMMAND=npx wrangler pages deploy "$SITE_DIR" --project-name vystara</code>.</p>
      </Step>
      <Step n={2} title="Publiceren">
        <p>Elke publicatie draait dat commando. Redirects gaan mee via het bestand <code>_redirects</code>.</p>
      </Step>
      <p className="vs-help">Pages accepteert voor zover bekend geen losse bestanden boven 25 MB; gebruik voor grote video’s een media-domein.</p>
    </div>
  );
}

// ── Vergrendelen en live voorbeeld ───────────────────────────
interface Access {
  mode: 'open' | 'maintenance' | 'password';
  title?: string;
  message?: string;
  hasPassword: boolean;
  previewToken: string | null;
}

export function AccessModal() {
  const [a, setA] = useState<Access | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => setA(await api.get<Access>('/api/access'));
  useEffect(() => void load(), []);
  if (!a) return null;

  const save = async (mode: Access['mode']) => {
    setBusy(true);
    try {
      const r = await api.put<{ pushed: { message: string } | null }>('/api/access', { mode, title: a.title, message: a.message, ...(password ? { password } : {}) });
      setPassword('');
      await load();
      const site = useStore.getState().site!;
      patchState({ site: { ...site, access: { mode, title: a.title, message: a.message } } });
      toast(mode === 'open' ? 'Site is weer open voor iedereen' : mode === 'password' ? 'Site is beveiligd met een wachtwoord' : 'Onderhoudsmodus staat aan');
      if (r.pushed) toast(r.pushed.message);
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };
  const link = a.previewToken ? `${location.origin}/preview/?token=${a.previewToken}` : null;

  return (
    <Modal title="Toegang & live voorbeeld" onClose={() => patchState({ modal: null })} wide>
      <div className="vs-modal-cols">
        <div>
          <div className="vs-subhead">Wie mag de site zien?</div>
          <div className="vs-access-modes">
            {([
              ['open', 'Open', 'Iedereen ziet de gepubliceerde site.'],
              ['maintenance', 'Onderhoud', 'Bezoekers zien "We zijn zo terug". Jij (ingelogd) ziet gewoon alles.'],
              ['password', 'Wachtwoord', 'Alleen wie het wachtwoord heeft, komt erin. Handig om iets te laten zien.'],
            ] as [Access['mode'], string, string][]).map(([m, l, d]) => (
              <button key={m} className={`vs-access-mode ${a.mode === m ? 'on' : ''}`} disabled={busy} onClick={() => save(m)}>
                <b>{l}</b>
                <span className="vs-muted">{d}</span>
              </button>
            ))}
          </div>
          <Row label="Titel"><Text value={a.title} placeholder="We zijn zo terug" onChange={(v) => setA({ ...a, title: v })} /></Row>
          <Row label="Bericht"><Text multiline value={a.message} placeholder="De site wordt even bijgewerkt. Kom straks terug." onChange={(v) => setA({ ...a, message: v })} /></Row>
          <Row label="Wachtwoord">
            <input className="vs-input" type="password" value={password} placeholder={a.hasPassword ? '•••••• (ingesteld)' : 'Kies een wachtwoord'} onChange={(e) => setPassword(e.target.value)} />
          </Row>
          <div className="vs-row-buttons">
            <button className="vs-btn" disabled={busy} onClick={() => save(a.mode)}>Tekst/wachtwoord opslaan</button>
          </div>
          <p className="vs-help">
            Op je eigen server werkt dit meteen, zonder opnieuw te publiceren. Op Vercel of Cloudflare Pages kan een losse site geen wachtwoord controleren: daar wordt bij vergrendelen (onderhoud én wachtwoord) de onderhoudspagina gepusht. Ontgrendel je, dan gaat de echte site automatisch weer terug (als "automatisch pushen" aan staat).
          </p>
        </div>
        <div>
          <div className="vs-subhead">Live voorbeeld</div>
          <p className="vs-help">
            Het live voorbeeld laat altijd je huidige werkversie zien, ook wat nog niet gepubliceerd is, en ververst vanzelf zodra je iets opslaat. Handig op een tweede scherm of op je telefoon.
          </p>
          <div className="vs-row-buttons">
            <button className="vs-btn primary" onClick={() => window.open('/preview/', 'vystara-preview')}>Live voorbeeld openen</button>
          </div>
          <div className="vs-subhead">Delen met iemand anders</div>
          <p className="vs-help">Maak een geheime link. Wie hem heeft, kan het live voorbeeld bekijken zonder in te loggen. Intrekken kan altijd.</p>
          {link ? (
            <>
              <input className="vs-input" readOnly value={link} onFocus={(e) => e.target.select()} />
              <div className="vs-row-buttons">
                <button className="vs-btn" onClick={() => { void navigator.clipboard?.writeText(link); toast('Link gekopieerd'); }}>Kopiëren</button>
                <button className="vs-btn" onClick={async () => { await api.post('/api/preview-token'); await load(); toast('Nieuwe link gemaakt; de oude werkt niet meer'); }}>Nieuwe link</button>
                <button className="vs-btn danger" onClick={async () => { await api.del('/api/preview-token'); await load(); }}>Intrekken</button>
              </div>
            </>
          ) : (
            <button className="vs-btn" onClick={async () => { await api.post('/api/preview-token'); await load(); }}>Deellink maken</button>
          )}
        </div>
      </div>
    </Modal>
  );
}
