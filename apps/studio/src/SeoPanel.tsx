import { useMemo } from 'react';
import { LANGUAGES, extraLangs, analyzeA11y, analyzeSeo, assetUrl, expandTree, type FrameNode, type Page, type Project, type Seo } from '@vystara/core';
import { api } from './api';
import { patchState, toast, useStore } from './store';
import { AssetSelect, Row, Section, Select, Text, Toggle } from './ui';

/** SEO van de open pagina of het open project: voorbeeld in Google, deelkaart en checklist. */
export function SeoPanel() {
  const { doc, pages, projects, components, site, assets, tree } = useStore();
  const page = doc?.kind === 'page' ? pages.find((p) => p.id === doc.id) : undefined;
  const project = doc?.kind === 'project' ? projects.find((p) => p.id === doc.id) : undefined;
  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);

  const data = useMemo(() => {
    if (!site || !tree) return null;
    const comps = Object.fromEntries(components.map((c) => [c.id, c]));
    if (page) {
      const expanded = expandTree(tree, { site, components: comps, projects, project: projects[0] ?? null, year: String(new Date().getFullYear()) }) as FrameNode;
      return { title: page.title, slug: page.slug, seo: page.seo, tree: expanded };
    }
    if (project) {
      const tpl = pages.find((p) => p.kind === 'project-template');
      // Projectpagina = sjabloon + deze inhoud.
      const full = structuredClone(tpl?.tree ?? tree);
      const fill = (n: FrameNode): void => {
        for (const c of n.children) {
          if (c.type === 'frame' && c.slot) c.children = structuredClone(tree.children);
          else if (c.type === 'frame') fill(c);
        }
      };
      fill(full);
      const expanded = expandTree(full, { site, components: comps, projects, project, year: '' }) as FrameNode;
      return { title: project.title, slug: `work/${project.slug}`, seo: { description: project.summary, image: project.cover } as Seo, tree: expanded };
    }
    return null;
  }, [site, tree, components, projects, page, project, pages]);

  if (!site || !data) return null;
  const result = analyzeSeo({ site, title: data.title, slug: data.slug, seo: data.seo, tree: data.tree, assets: assetMap });
  const a11y = analyzeA11y({ site, tree: data.tree, assets: assetMap });
  const a11yCol = a11y.score >= 80 ? '#2ecc71' : a11y.score >= 55 ? '#f5a623' : '#f24822';
  const url = `${site.domain ?? 'jouwdomein.nl'}${data.slug ? ` › ${data.slug.split('/').join(' › ')}` : ''}`;
  const ogId = data.seo.image || site.socialImage;
  const og = ogId ? assetUrl(assetMap[ogId], 960) : undefined;

  const savePage = async (patch: Partial<Page>) => {
    if (!page) return;
    try {
      const p = await api.put<typeof page>(`/api/pages/${page.id}`, patch);
      patchState({ pages: useStore.getState().pages.map((x) => (x.id === p.id ? p : x)) });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const setSeo = (k: keyof Seo, v: unknown) => page && savePage({ seo: { ...page.seo, [k]: v === '' ? undefined : v } });
  const saveProject = async (patch: Partial<Project>) => {
    if (!project) return;
    const p = await api.put<Project>(`/api/projects/${project.id}`, { ...project, ...patch });
    patchState({ projects: useStore.getState().projects.map((x) => (x.id === p.id ? p : x)) });
  };

  const col = result.score >= 80 ? '#2ecc71' : result.score >= 55 ? '#f5a623' : '#f24822';
  return (
    <>
      <Section title="Score">
        <div className="vs-seo-score">
          <div className="vs-seo-ring" style={{ background: `conic-gradient(${col} ${result.score * 3.6}deg, var(--ui-bg) 0)` }}>
            <span>{result.score}</span>
          </div>
          <p className="vs-help">
            {result.score >= 80 ? 'Deze pagina staat er goed voor.' : 'Los de rode en oranje punten op voor een betere vindbaarheid.'} {result.words} woorden.
          </p>
        </div>
        <div className="vs-seo-checks">
          {result.checks.map((c) => (
            <div
              key={c.id}
              className={`vs-seo-check ${c.level}`}
              onClick={() => c.nodeId && useStore.setState({ selection: c.nodeId.split('__')[0], extra: [] })}
              style={{ cursor: c.nodeId ? 'pointer' : 'default' }}
            >
              <b>{c.level === 'ok' ? '✓' : c.level === 'warn' ? '!' : '✕'}</b>
              <div>
                <div>{c.title}</div>
                <div className="vs-muted">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Toegankelijkheid">
        <div className="vs-seo-score">
          <div className="vs-seo-ring" style={{ background: `conic-gradient(${a11yCol} ${a11y.score * 3.6}deg, var(--ui-bg) 0)` }}>
            <span>{a11y.score}</span>
          </div>
          <p className="vs-help">
            {a11y.score >= 80 ? 'Goed leesbaar en bruikbaar voor iedereen.' : 'Een paar dingen maken de pagina lastiger voor slechtzienden of schermlezers.'} Alt-teksten en kopvolgorde staan hierboven bij de SEO-score.
          </p>
        </div>
        <div className="vs-seo-checks">
          {a11y.checks.map((c) => (
            <div
              key={c.id}
              className={`vs-seo-check ${c.level}`}
              onClick={() => c.nodeId && useStore.setState({ selection: c.nodeId.split('__')[0], extra: [] })}
              style={{ cursor: c.nodeId ? 'pointer' : 'default' }}
            >
              <b>{c.level === 'ok' ? '✓' : c.level === 'warn' ? '!' : '✕'}</b>
              <div>
                <div>{c.title}</div>
                <div className="vs-muted">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Zo ziet het eruit in Google">
        <div className="vs-serp">
          <div className="vs-serp-url">{url}</div>
          <div className="vs-serp-title">{result.title.length > 62 ? result.title.slice(0, 60) + '…' : result.title}</div>
          <div className="vs-serp-desc">{(result.description || 'Google kiest zelf een stukje tekst van de pagina.').slice(0, 158)}{result.description.length > 158 ? '…' : ''}</div>
        </div>
      </Section>

      <Section title="Zo ziet een gedeelde link eruit">
        <div className="vs-og">
          <div className="vs-og-img" style={og ? { backgroundImage: `url(${og})` } : undefined}>{!og && 'Geen deelafbeelding'}</div>
          <div className="vs-og-body">
            <div className="vs-muted">{site.domain ?? 'jouwdomein.nl'}</div>
            <b>{result.title}</b>
            <div className="vs-muted">{result.description.slice(0, 110)}</div>
          </div>
        </div>
      </Section>

      {page && page.kind === 'page' && extraLangs(site).map((l) => (
        <Section key={l} title={`Vertaling: ${LANGUAGES[l]?.label ?? l}`}>
          <Row label="Paginatitel">
            <Text value={page.seo.i18n?.[l]?.title} placeholder={page.seo.title || page.title} onChange={(v) => savePage({ seo: { ...page.seo, i18n: { ...(page.seo.i18n ?? {}), [l]: { ...(page.seo.i18n?.[l] ?? {}), title: v || undefined } } } })} />
          </Row>
          <Row label="Omschrijving">
            <Text multiline value={page.seo.i18n?.[l]?.description} placeholder={page.seo.description || 'Omschrijving in deze taal'} onChange={(v) => savePage({ seo: { ...page.seo, i18n: { ...(page.seo.i18n ?? {}), [l]: { ...(page.seo.i18n?.[l] ?? {}), description: v || undefined } } } })} />
          </Row>
          <p className="vs-help">Adres in deze taal: /{l}{page.slug ? `/${page.slug}/` : '/'}</p>
        </Section>
      ))}

      {page && page.kind === 'page' && (
        <Section title="Instellingen">
          <Row label="SEO-titel">
            <Text value={page.seo.title} placeholder={result.title} onChange={(v) => setSeo('title', v)} />
          </Row>
          <Counter n={(page.seo.title || result.title).length} min={30} max={60} />
          <Row label="Omschrijving">
            <Text multiline value={page.seo.description} placeholder="Wat vindt iemand op deze pagina? (70–160 tekens)" onChange={(v) => setSeo('description', v)} />
          </Row>
          <Counter n={(page.seo.description ?? '').length} min={70} max={160} />
          <Row label="Zoekterm">
            <Text value={page.seo.focusKeyword} placeholder="bv. videograaf Utrecht" onChange={(v) => setSeo('focusKeyword', v)} />
          </Row>
          <Row label="Deelafbeelding">
            <AssetSelect kind="image" value={page.seo.image} onChange={(v) => setSeo('image', v)} />
          </Row>
          <Row label="Soort pagina">
            <Select
              value={page.seo.schemaType ?? 'WebPage'}
              onChange={(v) => setSeo('schemaType', v)}
              options={[{ value: 'WebPage', label: 'Gewone pagina' }, { value: 'AboutPage', label: 'Over-pagina' }, { value: 'ContactPage', label: 'Contactpagina' }, { value: 'CollectionPage', label: 'Overzicht (bv. werk)' }]}
            />
          </Row>
          <Row label="Canonical">
            <Text value={page.seo.canonical} placeholder="Leeg laten (automatisch)" onChange={(v) => setSeo('canonical', v)} />
          </Row>
          <Row label="">
            <Toggle value={!!page.seo.noindex} onChange={(v) => setSeo('noindex', v || undefined)} label="Verbergen voor zoekmachines" />
          </Row>
          <p className="vs-help">Structured data (JSON-LD), sitemap, robots.txt en Open Graph worden bij publiceren automatisch gemaakt. Site-brede SEO staat onder ⚙ Site-instellingen.</p>
        </Section>
      )}

      {project && (
        <Section title="Project-SEO">
          <p className="vs-help">De titel, samenvatting en cover van het project zijn ook de SEO-titel, omschrijving en deelafbeelding. Met een video-link wordt het project in Google als video gemarkeerd.</p>
          <Row label="Samenvatting">
            <Text multiline value={project.summary} onChange={(v) => saveProject({ summary: v })} />
          </Row>
          <Counter n={(project.summary ?? '').length} min={70} max={160} />
        </Section>
      )}
    </>
  );
}

function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const ok = n >= min && n <= max;
  return (
    <div className="vs-counter">
      <i style={{ width: `${Math.min(100, (n / max) * 100)}%`, background: ok ? '#2ecc71' : n > max ? '#f24822' : '#f5a623' }} />
      <span>{n} / {min}–{max} tekens</span>
    </div>
  );
}
