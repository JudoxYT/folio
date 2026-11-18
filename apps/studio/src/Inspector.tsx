import { useState } from 'react';
import {
  findNode,
  resolveProps,
  walk,
  type Breakpoint,
  type Layout,
  type Position,
  type ResponsiveProps,
  type Size,
  type Style,
  type VNode,
} from '@vystara/core';
import { useStore, setProp, resetProp, setField, setHidden, openDoc, toast, patchState, resetBreakpoint, selectedIds, rotateSelection, flipSelection, resetTransform, alignSelection, distributeSelection, createSharedStyle, updateSharedStyle, variantName, variantSet, setTranslation, detachSharedStyle, renameSharedStyle, deleteSharedStyle } from './store';
import { EffectsPanel } from './EffectsPanel';
import { BUTTON_KEYS, BUTTON_LABEL, SVG_LIBRARY, TEXT_STYLE_KEYS, TEXT_STYLE_LABEL, recolorSvg, siteTheme, type FormField, type FormNode, type SvgNode } from '@vystara/core';
import { SeoPanel } from './SeoPanel';
import { api } from './api';
import { AssetSelect, ColorField, Num, Row, Section, Segmented, Select, Text, Toggle } from './ui';
import { askText } from './dialog';

type Sec = 'layout' | 'size' | 'position' | 'style';

/** Is deze eigenschap aangepast voor het huidige (niet-desktop) breakpoint? */
function over(n: VNode, bp: Breakpoint, sec: Sec, key: string): boolean {
  if (bp === 'desktop') return false;
  const o = n.responsive?.[bp]?.[sec] as Record<string, unknown> | undefined;
  return !!o && key in o;
}

export function Inspector() {
  const { tree, selection, bp } = useStore();
  if (!tree) return <aside className="vs-right" />;
  const n = selection ? findNode(tree, selection) : null;
  return (
    <aside className="vs-right">
      {bp !== 'desktop' && (
        <div className="vs-bp-note">
          Je past <b>{bp === 'tablet' ? 'tablet' : 'mobiel'}</b> aan. Wijzigingen gelden alleen hier en kleiner. Klik op een paars label om terug te zetten.
        </div>
      )}
      {n ? <NodeTabs n={n} /> : <DocTabs />}
    </aside>
  );
}

function NodeTabs({ n }: { n: VNode }) {
  const tab = useStore((s) => s.rightTab);
  const tree = useStore((s) => s.tree)!;
  const count = Object.keys(n.effects ?? {}).filter((k) => k !== 'mobile').length;
  return (
    <>
      <div className="vs-rtabs">
        <button className={tab === 'design' ? 'on' : ''} onClick={() => patchState({ rightTab: 'design' })}>Ontwerp</button>
        <button className={tab === 'effects' ? 'on' : ''} onClick={() => patchState({ rightTab: 'effects' })} disabled={n.id === tree.id}>
          Effecten{count ? ` (${count})` : ''}
        </button>
      </div>
      {tab === 'effects' && n.id !== tree.id ? <EffectsPanel n={n} /> : <NodeInspector key={n.id} n={n} />}
    </>
  );
}

function DocTabs() {
  const tab = useStore((s) => s.docTab);
  const doc = useStore((s) => s.doc);
  const seoAble = doc?.kind === 'page' || doc?.kind === 'project';
  return (
    <>
      <div className="vs-rtabs">
        <button className={tab === 'page' || !seoAble ? 'on' : ''} onClick={() => patchState({ docTab: 'page' })}>{doc?.kind === 'component' ? 'Component' : doc?.kind === 'project' ? 'Project' : 'Pagina'}</button>
        {seoAble && <button className={tab === 'seo' ? 'on' : ''} onClick={() => patchState({ docTab: 'seo' })}>SEO</button>}
      </div>
      {tab === 'seo' && seoAble ? <SeoPanel /> : <DocInspector />}
    </>
  );
}

function NodeInspector({ n }: { n: VNode }) {
  const bp = useStore((s) => s.bp);
  const tree = useStore((s) => s.tree)!;
  const p: ResponsiveProps = resolveProps(n, bp);
  const L: Layout = p.layout ?? {};
  const S: Size = p.size ?? {};
  const P: Position = p.position ?? {};
  const st: Style = p.style ?? {};
  const isRoot = n.id === tree.id;
  const sp = (sec: Sec, key: string) => (v: unknown) => setProp(n.id, sec, key, v);
  const rowProps = (sec: Sec, key: string) => ({ overridden: over(n, bp, sec, key), onReset: () => resetProp(n.id, sec, key) });
  const isContainer = n.type === 'frame' || n.type === 'collection' || n.type === 'button' || n.type === 'form';
  const multi = selectedIds().length;
  const hasBpChanges = bp !== 'desktop' && !!n.responsive?.[bp];
  const isTemplateDoc = useStore((s) => s.doc?.kind === 'component' || (s.doc?.kind === 'page' && s.pages.find((pg) => pg.id === s.doc!.id)?.kind === 'project-template'));
  const mode = L.mode ?? (n.type === 'collection' ? 'grid' : 'vertical');
  const pad = L.padding ?? [0, 0, 0, 0];
  const hasText = n.type === 'text' || n.type === 'button' || n.type === 'frame';
  const isSection = n.type === 'frame' || n.type === 'collection' || n.type === 'form';

  return (
    <>
      {multi > 1 && (
        <div className="vs-bp-note">{multi} lagen geselecteerd. Opmaak, grootte, positie en effecten gelden voor allemaal; naam en inhoud alleen voor de eerste.</div>
      )}
      {multi > 1 && (
        <div className="vs-section">
          <div className="vs-subhead">Uitlijnen en verdelen</div>
          <div className="vs-alignbar">
            {(
              [
                ['left', 'Links uitlijnen (Alt+A)', 'M4 3v18M8 7h12v4H8zM8 14h7v4H8z'],
                ['center-x', 'Horizontaal centreren (Alt+H)', 'M12 3v18M6 7h12v4H6zM8.5 14h7v4h-7z'],
                ['right', 'Rechts uitlijnen (Alt+D)', 'M20 3v18M4 7h12v4H4zM9 14h7v4H9z'],
                ['top', 'Boven uitlijnen (Alt+W)', 'M3 4h18M7 8v12h4V8zM14 8v7h4V8z'],
                ['center-y', 'Verticaal centreren (Alt+V)', 'M3 12h18M7 6v12h4V6zM14 8.5v7h4v-7z'],
                ['bottom', 'Onder uitlijnen (Alt+S)', 'M3 20h18M7 4v12h4V4zM14 9v7h4V9z'],
              ] as const
            ).map(([w, title, d]) => (
              <button key={w} type="button" className="vs-icon-btn" title={title} onClick={() => alignSelection(w)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d={d} /></svg>
              </button>
            ))}
            <span className="vs-tb-sep" />
            <button type="button" className="vs-icon-btn" title="Horizontaal gelijk verdelen (Alt+Shift+H)" onClick={() => distributeSelection('x')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18M21 3v18M9 7h6v10H9z" /></svg>
            </button>
            <button type="button" className="vs-icon-btn" title="Verticaal gelijk verdelen (Alt+Shift+V)" onClick={() => distributeSelection('y')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3h18M3 21h18M7 9h10v6H7z" /></svg>
            </button>
          </div>
          <p className="vs-help">Werkt op los geplaatste lagen (Positie: los). Selecteer meerdere lagen met Shift+klik.</p>
        </div>
      )}
      {hasBpChanges && (
        <div className="vs-section">
          <button className="vs-btn" onClick={() => resetBreakpoint(n.id)}>Alle aanpassingen voor {bp === 'tablet' ? 'tablet' : 'mobiel'} terugzetten</button>
        </div>
      )}
      <Section title={typeLabel(n)} right={<span className="vs-muted">{n.id}</span>}>
        <Row label="Naam">
          <Text value={n.name} onChange={(v) => setField(n.id, 'name', v)} />
        </Row>
        {isSection && <SchemeRow n={n} />}
        <Row label="Anker">
          <Text value={n.anchor} placeholder="bv. werk → link met #werk" onChange={(v) => setField(n.id, 'anchor', v.replace(/[^a-zA-Z0-9_-]/g, '') || undefined)} />
        </Row>
        <Row label="Schermlezer">
          <Text value={n.ariaLabel} placeholder="Toegankelijke naam (optioneel)" onChange={(v) => setField(n.id, 'ariaLabel', v || undefined)} />
        </Row>
        <Row label="Notitie">
          <Text multiline value={n.note} placeholder="Alleen zichtbaar in de Studio, bv. 'nog betere foto zoeken'" onChange={(v) => setField(n.id, 'note', v || undefined)} />
        </Row>
        <Row label="Muislabel">
          <Text value={n.data?.cursor} placeholder="bv. Bekijk (pilletje bij de muis)" onChange={(v) => setData(n, 'cursor', v || undefined)} />
        </Row>
        <Row label="">
          <Toggle value={n.data?.group !== undefined} onChange={(v) => setData(n, 'group', v ? '' : undefined)} label="Hover-groep: lagen hierin reageren samen" />
        </Row>
        {isTemplateDoc && (
          <Row label="Alleen als">
            <Text value={n.when} placeholder="bv. project.video of !project.video" onChange={(v) => setField(n.id, 'when', v.trim() || undefined)} />
          </Row>
        )}
        {!isRoot && (
          <Row label="Zichtbaar">
            <Toggle value={!p.hidden} onChange={(v) => setHidden(n.id, !v)} label={bp === 'desktop' ? 'Tonen' : `Tonen op ${bp === 'tablet' ? 'tablet' : 'mobiel'}`} />
          </Row>
        )}
      </Section>

      <ContentSection n={n} />

      {isContainer && (
        <Section title={n.type === 'collection' ? 'Grid' : 'Auto layout'}>
          <Row label="Richting" {...rowProps('layout', 'mode')}>
            <Segmented
              value={mode}
              onChange={sp('layout', 'mode')}
              options={[
                { value: 'vertical', label: '↓', title: 'Verticaal' },
                { value: 'horizontal', label: '→', title: 'Horizontaal' },
                { value: 'grid', label: '▦', title: 'Grid' },
                { value: 'none', label: '✥', title: 'Vrij (geen auto layout)' },
              ]}
            />
          </Row>
          {mode === 'grid' && (
            <Row label="Kolommen" {...rowProps('layout', 'columns')}>
              <Num value={L.columns ?? 3} min={1} onChange={sp('layout', 'columns')} />
              <Num value={L.rowGap} placeholder="rij" min={0} onChange={sp('layout', 'rowGap')} title="Ruimte tussen rijen" />
            </Row>
          )}
          {mode === 'grid' && (
            <Row label="">
              <Toggle value={!!L.masonry} onChange={sp('layout', 'masonry')} label="Metselwerk (beelden sluiten naadloos aan)" />
            </Row>
          )}
          {mode !== 'none' && (
            <>
              <Row label="Ruimte" {...rowProps('layout', 'gap')}>
                <Num value={L.gap} placeholder="0" min={0} onChange={sp('layout', 'gap')} suffix="gap" />
              </Row>
              <Row label="Uitlijnen" {...rowProps('layout', 'align')}>
                <Select
                  value={L.align ?? 'start'}
                  onChange={sp('layout', 'align')}
                  options={[
                    { value: 'start', label: mode === 'horizontal' ? 'Boven' : 'Links' },
                    { value: 'center', label: 'Midden' },
                    { value: 'end', label: mode === 'horizontal' ? 'Onder' : 'Rechts' },
                    { value: 'stretch', label: 'Uitrekken' },
                    ...(mode === 'horizontal' ? [{ value: 'baseline' as const, label: 'Basislijn' }] : []),
                  ]}
                />
              </Row>
              {mode !== 'grid' && (
                <Row label="Verdelen" {...rowProps('layout', 'justify')}>
                  <Select
                    value={L.justify ?? 'start'}
                    onChange={sp('layout', 'justify')}
                    options={[
                      { value: 'start', label: 'Begin' },
                      { value: 'center', label: 'Midden' },
                      { value: 'end', label: 'Eind' },
                      { value: 'space-between', label: 'Ruimte ertussen' },
                    ]}
                  />
                </Row>
              )}
              {mode === 'horizontal' && (
                <Row label="Teruglopen" {...rowProps('layout', 'wrap')}>
                  <Toggle value={!!L.wrap} onChange={sp('layout', 'wrap')} label="Wrap" />
                </Row>
              )}
            </>
          )}
          {[0, 2].map((start) => (
            <Row key={start} label={start === 0 ? 'Padding' : ''} {...(start === 0 ? rowProps('layout', 'padding') : {})}>
              {[start, start + 1].map((i) => (
                <Num
                  key={i}
                  value={pad[i]}
                  min={0}
                  title={['Boven', 'Rechts', 'Onder', 'Links'][i]}
                  suffix={['↑ boven', '→ rechts', '↓ onder', '← links'][i]}
                  onChange={(v) => {
                    const next = [...pad] as [number, number, number, number];
                    next[i] = v ?? 0;
                    setProp(n.id, 'layout', 'padding', next.every((x) => x === 0) ? undefined : next);
                  }}
                />
              ))}
            </Row>
          ))}
        </Section>
      )}

      {!isRoot && (
        <Section title="Grootte">
          <Row label="Breedte" {...rowProps('size', 'width')}>
            <Select value={S.width ?? 'fill'} onChange={sp('size', 'width')} options={[{ value: 'fill', label: 'Vullen' }, { value: 'hug', label: 'Inhoud' }, { value: 'fixed', label: 'Vast' }]} />
            {S.width === 'fixed' && <Num value={S.w} min={0} onChange={sp('size', 'w')} suffix="px" />}
          </Row>
          <Row label="Hoogte" {...rowProps('size', 'height')}>
            <Select value={S.height ?? 'hug'} onChange={sp('size', 'height')} options={[{ value: 'hug', label: 'Inhoud' }, { value: 'fill', label: 'Vullen' }, { value: 'fixed', label: 'Vast' }]} />
            {S.height === 'fixed' && <Num value={S.h} min={0} onChange={sp('size', 'h')} suffix="px" />}
          </Row>
          <Row label="Max breed" {...rowProps('size', 'maxW')}>
            <Num value={S.maxW} min={0} placeholder="geen" onChange={sp('size', 'maxW')} suffix="px" />
            <Num value={S.minH} min={0} placeholder="min h" onChange={sp('size', 'minH')} suffix="↕" title="Minimale hoogte" />
          </Row>
          <Row label="Verhouding" {...rowProps('size', 'aspectRatio')}>
            <Select
              value={S.aspectRatio ?? ''}
              onChange={(v) => setProp(n.id, 'size', 'aspectRatio', v || undefined)}
              options={[
                { value: '', label: 'Vrij' },
                { value: '16 / 9', label: '16:9' },
                { value: '16 / 10', label: '16:10' },
                { value: '4 / 3', label: '4:3' },
                { value: '1 / 1', label: '1:1' },
                { value: '4 / 5', label: '4:5' },
                { value: '9 / 16', label: '9:16' },
              ]}
            />
          </Row>
        </Section>
      )}

      {!isRoot && (
        <Section title="Positie">
          <Row label="Plaatsing" {...rowProps('position', 'mode')}>
            <Segmented
              value={P.mode ?? 'flow'}
              onChange={(v) => setProp(n.id, 'position', 'mode', v === 'flow' ? undefined : v)}
              options={[
                { value: 'flow', label: 'Layout', title: 'Relatief: volgt de auto layout' },
                { value: 'absolute', label: 'Vrij', title: 'Absoluut: vrij in de ouder' },
                { value: 'fixed', label: 'Vast', title: 'Fixed: blijft op dezelfde plek op het scherm' },
                { value: 'sticky', label: 'Plakt', title: 'Sticky: scrollt mee en plakt dan bovenaan' },
              ]}
            />
          </Row>
          {P.mode === 'sticky' && (
            <Row label="Afstand boven" {...rowProps('position', 'y')}>
              <Num value={P.y ?? 0} min={0} onChange={sp('position', 'y')} suffix="px" />
            </Row>
          )}
          {P.mode === 'sticky' && <p className="vs-help">Plakt tot de onderkant van de ouder bereikt is. De ouder moet dus hoger zijn dan deze laag.</p>}
          {(P.mode === 'absolute' || P.mode === 'fixed') && (
            <>
              <Row label="Vast aan" {...rowProps('position', 'anchorX')}>
                <Select value={P.anchorX ?? 'left'} onChange={sp('position', 'anchorX')} options={[{ value: 'left', label: 'Links' }, { value: 'right', label: 'Rechts' }, { value: 'center', label: 'Midden' }, { value: 'stretch', label: 'Links + rechts' }]} />
                <Select value={P.anchorY ?? 'top'} onChange={sp('position', 'anchorY')} options={[{ value: 'top', label: 'Boven' }, { value: 'bottom', label: 'Onder' }, { value: 'center', label: 'Midden' }, { value: 'stretch', label: 'Boven + onder' }]} />
              </Row>
              <Row label="X / Y" {...rowProps('position', 'x')}>
                <Num value={P.x ?? 0} onChange={sp('position', 'x')} suffix="x" />
                <Num value={P.y ?? 0} onChange={sp('position', 'y')} suffix="y" />
              </Row>
            </>
          )}
          <Row label="Laag (z)" {...rowProps('position', 'z')}>
            <Num value={P.z} placeholder="auto" onChange={sp('position', 'z')} />
          </Row>
        </Section>
      )}

      {!isRoot && <SharedStyleSection n={n} />}

      {!isRoot && (
        <Section title="Mengen en filters" defaultClosed>
          <Row label="Mengmodus" {...rowProps('style', 'blend')}>
            <Select
              value={st.blend ?? ''}
              onChange={(v) => sp('style', 'blend')(v || undefined)}
              options={[
                { value: '', label: 'Normaal' }, { value: 'multiply', label: 'Vermenigvuldigen' }, { value: 'screen', label: 'Bleken (screen)' },
                { value: 'overlay', label: 'Bedekken (overlay)' }, { value: 'darken', label: 'Donkerder' }, { value: 'lighten', label: 'Lichter' },
                { value: 'color-dodge', label: 'Kleur tegenhouden' }, { value: 'difference', label: 'Verschil' }, { value: 'exclusion', label: 'Uitsluiting' },
                { value: 'hue', label: 'Kleurtoon' }, { value: 'saturation', label: 'Verzadiging' }, { value: 'color', label: 'Kleur' }, { value: 'luminosity', label: 'Helderheid' },
              ]}
            />
          </Row>
          <Row label="Masker" {...rowProps('style', 'mask')}>
            <Select
              value={st.mask ?? ''}
              onChange={(v) => sp('style', 'mask')(v || undefined)}
              options={[
                { value: '', label: 'Geen' }, { value: 'fade-bottom', label: 'Uitlopen naar onder' }, { value: 'fade-top', label: 'Uitlopen naar boven' },
                { value: 'fade-x', label: 'Zachte zijkanten' }, { value: 'fade-y', label: 'Zacht boven en onder' }, { value: 'circle', label: 'Cirkel' },
                { value: 'arch', label: 'Boog' }, { value: 'diamond', label: 'Ruit' }, { value: 'blob', label: 'Organisch' },
              ]}
            />
          </Row>
          {(
            [
              ['blur', 'Vervagen', 0, 40, 0, 'px'],
              ['grayscale', 'Zwart-wit', 0, 100, 0, '%'],
              ['sepia', 'Sepia', 0, 100, 0, '%'],
              ['brightness', 'Helderheid', 0, 200, 100, '%'],
              ['contrast', 'Contrast', 0, 200, 100, '%'],
              ['saturate', 'Verzadiging', 0, 300, 100, '%'],
              ['hue', 'Kleur draaien', 0, 360, 0, '°'],
            ] as const
          ).map(([k, label, min, max, def, unit]) => {
            const v = st.filters?.[k] ?? def;
            return (
              <Row key={k} label={label}>
                <input
                  type="range"
                  className="vs-range"
                  min={min}
                  max={max}
                  value={v}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    const f = { ...(st.filters ?? {}), [k]: val === def ? undefined : val };
                    for (const key of Object.keys(f) as (keyof typeof f)[]) if (f[key] === undefined) delete f[key];
                    sp('style', 'filters')(Object.keys(f).length ? f : undefined);
                  }}
                  onDoubleClick={() => {
                    const f = { ...(st.filters ?? {}) };
                    delete f[k];
                    sp('style', 'filters')(Object.keys(f).length ? f : undefined);
                  }}
                />
                <span className="vs-muted" style={{ minWidth: 42, textAlign: 'right' }}>{v}{unit}</span>
              </Row>
            );
          })}
          <p className="vs-help">Dubbelklik een schuifje om terug te zetten. Mengmodi werken op wat erónder ligt, zoals in Photoshop.</p>
        </Section>
      )}

      {!isRoot && (
        <Section title="Transformatie">
          <Row label="Rotatie" {...rowProps('style', 'rotate')}>
            <Num value={st.rotate} placeholder="0" step={1} suffix="°" onChange={(v) => sp('style', 'rotate')(v === undefined ? undefined : ((((v % 360) + 540) % 360) - 180))} title="Graden, met de klok mee" />
            <button className="vs-icon-btn" title="90° linksom ( [ )" onClick={() => rotateSelection(-90)}>↺</button>
            <button className="vs-icon-btn" title="90° rechtsom ( ] )" onClick={() => rotateSelection(90)}>↻</button>
          </Row>
          <Row label="Schaal" {...rowProps('style', 'scale')}>
            <Num value={st.scale === undefined ? undefined : Math.round(st.scale * 100)} placeholder="100" min={1} step={5} suffix="%" onChange={(v) => sp('style', 'scale')(v === undefined || v === 100 ? undefined : v / 100)} title="Visueel schalen, inclusief alles erin (Ctrl + hoekgreep)" />
          </Row>
          <Row label="Spiegelen">
            <div className="vs-seg">
              <button type="button" className={st.flipX ? 'on' : ''} title="Horizontaal spiegelen (Shift+H)" onClick={() => flipSelection('x')}>⇋ Horizontaal</button>
              <button type="button" className={st.flipY ? 'on' : ''} title="Verticaal spiegelen (Shift+V)" onClick={() => flipSelection('y')}>⇵ Verticaal</button>
            </div>
          </Row>
          <Row label="Draaipunt" {...rowProps('style', 'origin')}>
            <div className="vs-origin" role="group" aria-label="Draaipunt">
              {(['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right'] as const).map((o) => (
                <button key={o} className={(st.origin ?? 'center') === o ? 'on' : ''} title={o} onClick={() => sp('style', 'origin')(o === 'center' ? undefined : o)} />
              ))}
            </div>
          </Row>
          {(st.rotate || st.flipX || st.flipY || st.origin || st.scale) && (
            <Row label="">
              <button className="vs-btn" onClick={resetTransform}>Transformatie resetten</button>
            </Row>
          )}
          <p className="vs-help">Sleep de ronde greep boven de laag of net buiten een hoek om te draaien (Shift = stappen van 15°). Hoekgrepen: Shift houdt de verhouding vast, Alt werkt vanuit het midden, Ctrl schaalt de hele laag inclusief inhoud. Bij tekst veranderen de hoeken de lettergrootte; links/rechts alleen de breedte.</p>
        </Section>
      )}

      <Section title="Opmaak">
        {n.type !== 'text' && (
          <Row label="Vulling" {...rowProps('style', 'fill')}>
            <ColorField value={st.fill} onChange={sp('style', 'fill')} />
          </Row>
        )}
        {(n.type === 'frame' || n.type === 'button') && (
          <Row label="Achtergrond" {...rowProps('style', 'fillImage')}>
            <AssetSelect kind="image" value={st.fillImage} onChange={sp('style', 'fillImage')} />
          </Row>
        )}
        <Row label="Hoeken" {...rowProps('style', 'radius')}>
          <Num value={st.radius} min={0} placeholder="0" onChange={sp('style', 'radius')} suffix="px" />
          <Num value={st.opacity === undefined ? undefined : Math.round(st.opacity * 100)} min={0} placeholder="100" onChange={(v) => setProp(n.id, 'style', 'opacity', v === undefined ? undefined : Math.min(100, v) / 100)} suffix="%" title="Dekking" />
        </Row>
        <Row label="Rand" {...rowProps('style', 'stroke')}>
          <ColorField value={st.stroke} onChange={sp('style', 'stroke')} />
          {st.stroke && <Num value={st.strokeWidth ?? 1} min={0} onChange={sp('style', 'strokeWidth')} suffix="px" />}
        </Row>
        <Row label="Schaduw" {...rowProps('style', 'shadow')}>
          <Select
            value={st.shadow ?? ''}
            onChange={(v) => setProp(n.id, 'style', 'shadow', v || undefined)}
            options={[
              { value: '', label: 'Geen' },
              { value: '0 1px 2px rgba(0,0,0,.2)', label: 'Klein' },
              { value: '0 8px 24px rgba(0,0,0,.25)', label: 'Middel' },
              { value: '0 24px 64px rgba(0,0,0,.35)', label: 'Groot' },
            ]}
          />
        </Row>
        {(n.type === 'frame' || n.type === 'image' || n.type === 'video') && (
          <Row label="Overloop" {...rowProps('style', 'overflow')}>
            <Segmented value={st.overflow ?? 'visible'} onChange={sp('style', 'overflow')} options={[{ value: 'visible', label: 'Zichtbaar' }, { value: 'hidden', label: 'Afknippen' }]} />
          </Row>
        )}
        {(n.type === 'image' || n.type === 'video') && (
          <Row label="Passen" {...rowProps('style', 'objectFit')}>
            <Segmented value={st.objectFit ?? 'cover'} onChange={sp('style', 'objectFit')} options={[{ value: 'cover', label: 'Vullen' }, { value: 'contain', label: 'Passend' }]} />
          </Row>
        )}
      </Section>

      {hasText && (
        <Section title="Tekst">
          {n.type === 'text' && (
            <Row label="Stijl">
              <Select
                value={n.textStyle ?? (n.tag && /^h[1-4]$/.test(n.tag) ? n.tag : '')}
                onChange={(v) => setField(n.id, 'textStyle', v || undefined)}
                options={[{ value: '', label: 'Geen (erft)' }, ...TEXT_STYLE_KEYS.map((k) => ({ value: k, label: TEXT_STYLE_LABEL[k] }))]}
              />
            </Row>
          )}
          {n.type === 'text' && (n.style?.fontSize || n.style?.fontWeight || n.style?.fontFamily || n.style?.lineHeight) && (
            <Row label="">
              <button className="vs-btn" title="Lettergrootte, gewicht, lettertype en regelhoogte weer uit de tekststijl halen" onClick={() => { for (const k of ['fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing']) setProp(n.id, 'style', k, undefined); }}>
                Eigen opmaak wissen (volg thema)
              </button>
            </Row>
          )}
          <Row label="Kleur" {...rowProps('style', 'color')}>
            <ColorField value={st.color} onChange={sp('style', 'color')} />
          </Row>
          <Row label="Lettertype" {...rowProps('style', 'fontFamily')}>
            <FontSelect value={st.fontFamily} onChange={sp('style', 'fontFamily')} />
          </Row>
          <Row label="Grootte" {...rowProps('style', 'fontSize')}>
            <Num value={st.fontSize} min={1} placeholder="erft" onChange={sp('style', 'fontSize')} suffix="px" />
            <Select
              value={String(st.fontWeight ?? '') as string}
              onChange={(v) => setProp(n.id, 'style', 'fontWeight', v ? Number(v) : undefined)}
              options={[{ value: '', label: 'Gewicht' }, ...['300', '400', '500', '600', '700', '800'].map((w) => ({ value: w, label: w }))]}
            />
          </Row>
          <Row label="Regel / spatie" {...rowProps('style', 'lineHeight')}>
            <Num value={st.lineHeight} min={0} step={0.05} placeholder="1.5" onChange={sp('style', 'lineHeight')} title="Regelhoogte" />
            <Num value={st.letterSpacing} step={0.01} placeholder="0" onChange={sp('style', 'letterSpacing')} suffix="em" title="Letterafstand" />
          </Row>
          <Row label="Uitlijning" {...rowProps('style', 'textAlign')}>
            <Segmented value={st.textAlign ?? 'left'} onChange={sp('style', 'textAlign')} options={[
              { value: 'left', title: 'Links', label: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16" /><path d="M4 12h10" /><path d="M4 18h14" /></svg> },
              { value: 'center', title: 'Midden', label: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16" /><path d="M7 12h10" /><path d="M5 18h14" /></svg> },
              { value: 'right', title: 'Rechts', label: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16" /><path d="M10 12h10" /><path d="M6 18h14" /></svg> },
              { value: 'justify', title: 'Uitvullen', label: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg> },
            ]} />
          </Row>
          <Row label="Opmaak" {...rowProps('style', 'italic')}>
            <div className="vs-seg vs-seg-icons">
              <button type="button" className={st.italic ? 'on' : ''} title="Cursief" onClick={() => sp('style', 'italic')(st.italic ? undefined : true)}><i>I</i></button>
              <button type="button" className={st.decoration === 'underline' ? 'on' : ''} title="Onderstreept" onClick={() => sp('style', 'decoration')(st.decoration === 'underline' ? undefined : 'underline')}><u>U</u></button>
              <button type="button" className={st.decoration === 'line-through' ? 'on' : ''} title="Doorgestreept" onClick={() => sp('style', 'decoration')(st.decoration === 'line-through' ? undefined : 'line-through')}><s>S</s></button>
              <button type="button" className={st.smallCaps ? 'on' : ''} title="Kleinkapitalen" onClick={() => sp('style', 'smallCaps')(st.smallCaps ? undefined : true)} style={{ fontVariant: 'small-caps' }}>Ab</button>
              <button type="button" className={st.tabularNums ? 'on' : ''} title="Cijfers even breed (tellers, prijzen)" onClick={() => sp('style', 'tabularNums')(st.tabularNums ? undefined : true)}>01</button>
            </div>
          </Row>
          <Row label="Schaduw" {...rowProps('style', 'textShadow')}>
            <Select
              value={['soft', 'hard', 'glow', 'neon', 'long'].includes(st.textShadow ?? '') || !st.textShadow ? st.textShadow ?? '' : 'custom'}
              onChange={(v) => sp('style', 'textShadow')(v === 'custom' ? '0 4px 16px rgba(0,0,0,.4)' : v || undefined)}
              options={[{ value: '', label: 'Geen' }, { value: 'soft', label: 'Zacht' }, { value: 'hard', label: 'Hard (retro)' }, { value: 'long', label: 'Lang (3D)' }, { value: 'glow', label: 'Gloed' }, { value: 'neon', label: 'Neon' }, { value: 'custom', label: 'Eigen…' }]}
            />
          </Row>
          {st.textShadow && !['soft', 'hard', 'glow', 'neon', 'long'].includes(st.textShadow) && (
            <Row label="">
              <Text value={st.textShadow} placeholder="0 4px 16px rgba(0,0,0,.4)" onChange={(v) => sp('style', 'textShadow')(v || undefined)} />
            </Row>
          )}
          <Row label="Verloop" {...rowProps('style', 'textGradient')}>
            <Toggle value={!!st.textGradient} onChange={(v) => sp('style', 'textGradient')(v ? ['token:accent', 'token:text'] : undefined)} label="Tekst met kleurverloop" />
          </Row>
          {st.textGradient && (
            <Row label="Van / naar">
              <ColorField allowNone={false} value={st.textGradient[0]} onChange={(c) => sp('style', 'textGradient')([c ?? 'token:accent', st.textGradient![1]])} />
              <ColorField allowNone={false} value={st.textGradient[1]} onChange={(c) => sp('style', 'textGradient')([st.textGradient![0], c ?? 'token:text'])} />
            </Row>
          )}
          <Row label="Afbreken" {...rowProps('style', 'textWrap')}>
            <Select value={st.textWrap ?? ''} onChange={(v) => sp('style', 'textWrap')(v || undefined)} options={[{ value: '', label: 'Normaal' }, { value: 'balance', label: 'Gebalanceerd (koppen)' }, { value: 'pretty', label: 'Netjes (geen los woord)' }]} />
          </Row>
          <Row label="Max. regels" {...rowProps('style', 'lineClamp')}>
            <Num value={st.lineClamp} min={1} step={1} placeholder="∞" onChange={(v) => sp('style', 'lineClamp')(v || undefined)} title="Afkappen met … na zoveel regels" />
            <Num value={st.columns} min={1} step={1} placeholder="1" onChange={(v) => sp('style', 'columns')(v && v > 1 ? v : undefined)} suffix="kol" title="Aantal kolommen" />
          </Row>
          <Row label="Hoofdletters" {...rowProps('style', 'textTransform')}>
            <Segmented value={st.textTransform ?? 'none'} onChange={sp('style', 'textTransform')} options={[{ value: 'none', label: 'Aa' }, { value: 'uppercase', label: 'AA' }, { value: 'lowercase', label: 'aa' }]} />
          </Row>
          <Row label="Omlijnd" {...rowProps('style', 'textOutline')}>
            <ColorField value={st.textOutline} onChange={sp('style', 'textOutline')} />
          </Row>
          <Row label="" {...rowProps('style', 'noWrap')}>
            <Toggle value={!!st.noWrap} onChange={(v) => sp('style', 'noWrap')(v || undefined)} label="Nooit afbreken (één regel)" />
          </Row>
          <Row label="" {...rowProps('style', 'writingMode')}>
            <Toggle value={st.writingMode === 'vertical'} onChange={(v) => sp('style', 'writingMode')(v ? 'vertical' : undefined)} label="Verticaal (van boven naar beneden)" />
          </Row>
        </Section>
      )}

    </>
  );
}

function FontSelect({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  const site = useStore((s) => s.site);
  const fonts = site ? siteTheme(site).fonts : {};
  return (
    <select className="vs-input" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">Erft</option>
      {Object.keys(fonts).map((k) => (
        <option key={k} value={`token:${k}`}>{k}</option>
      ))}
    </select>
  );
}

/** Eén data-attribuut zetten of weghalen (data-cursor, data-group, …). */
function setData(n: VNode, key: string, value: string | undefined) {
  const next = { ...(n.data ?? {}) };
  if (value === undefined) delete next[key];
  else next[key] = value;
  setField(n.id, 'data', Object.keys(next).length ? next : undefined);
}

function typeLabel(n: VNode) {
  return { frame: 'Frame', text: 'Tekst', image: 'Afbeelding', video: 'Video', button: 'Knop', embed: 'Embed', instance: 'Component-instance', collection: 'Projecten-grid', form: 'Formulier', svg: 'SVG / icoon' }[n.type];
}

/** Kleurschema uit het thema (Squarespace "section theme"). */
function SchemeRow({ n }: { n: VNode }) {
  const site = useStore((s) => s.site);
  const theme = site ? siteTheme(site) : null;
  if (!theme) return null;
  return (
    <Row label="Kleurschema">
      <div className="vs-scheme-pick">
        <button className={!n.scheme ? 'on' : ''} title="Erft van de ouder" onClick={() => setField(n.id, 'scheme', undefined)}>
          <span className="vs-scheme-dot" data-empty />
        </button>
        {Object.entries(theme.schemes).map(([k, sc]) => (
          <button key={k} className={n.scheme === k ? 'on' : ''} title={sc.name} onClick={() => setField(n.id, 'scheme', k)}>
            <span className="vs-scheme-dot" style={{ background: sc.bg, borderColor: sc.line }}><i style={{ background: sc.accent }} /></span>
          </button>
        ))}
      </div>
    </Row>
  );
}

function SvgSection({ n }: { n: SvgNode }) {
  const slots = Math.max(1, ...[...n.svg.matchAll(/--svg-(\d+)/g)].map((m) => Number(m[1])));
  const assets = useStore((s) => s.assets).filter((a) => a.mime === 'image/svg+xml');
  const cats = [...new Set(SVG_LIBRARY.map((x) => x.category))];
  return (
    <Section title="SVG / icoon">
      <Row label="Vorm">
        <select
          className="vs-input"
          value={SVG_LIBRARY.find((x) => x.svg === n.svg)?.id ?? ''}
          onChange={(e) => {
            const it = SVG_LIBRARY.find((x) => x.id === e.target.value);
            if (!it) return;
            setField(n.id, 'svg', it.svg);
            setField(n.id, 'colors', [...it.colors]);
            setField(n.id, 'name', it.name);
            setField(n.id, 'stretch', it.stretch || undefined);
          }}
        >
          <option value="">Eigen SVG</option>
          {cats.map((c) => (
            <optgroup key={c} label={c}>
              {SVG_LIBRARY.filter((x) => x.category === c).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </optgroup>
          ))}
        </select>
      </Row>
      {Array.from({ length: Math.min(slots, 6) }, (_, i) => (
        <Row key={i} label={`Kleur ${i + 1}`}>
          <ColorField
            value={n.colors?.[i]}
            onChange={(v) => {
              const next = [...(n.colors ?? [])];
              next[i] = v ?? '';
              setField(n.id, 'colors', next);
            }}
          />
        </Row>
      ))}
      <Row label="">
        <Toggle value={!!n.stretch} onChange={(v) => setField(n.id, 'stretch', v || undefined)} label="Uitrekken (voor scheidingen)" />
      </Row>
      <Row label="Uit bestand">
        <select
          className="vs-input"
          value=""
          onChange={async (e) => {
            const a = assets.find((x) => x.id === e.target.value);
            if (!a) return;
            const text = await fetch(a.url).then((r) => r.text());
            const { svg, palette } = recolorSvg(text);
            setField(n.id, 'svg', svg);
            setField(n.id, 'colors', palette.map((c) => (c === 'currentColor' ? 'token:heading' : c)));
            setField(n.id, 'name', a.originalName.replace(/\.svg$/i, ''));
            toast(`${palette.length} kleur(en) gevonden; elk is nu los aan te passen`);
          }}
        >
          <option value="">Geüploade SVG kiezen…</option>
          {assets.map((a) => <option key={a.id} value={a.id}>{a.originalName}</option>)}
        </select>
      </Row>
      <p className="vs-help">Elke kleur in de SVG is een eigen veld. Kies een kleur uit het kleurschema, dan past het icoon zich automatisch aan per sectie en per thema.</p>
    </Section>
  );
}

/** Inhoud die niet per breakpoint verschilt: tekst, media, link, component-overrides. */
function ContentSection({ n }: { n: VNode }) {
  const lang = useStore((s) => s.lang);
  const components = useStore((s) => s.components);
  const isTemplate = useStore((s) => s.doc?.kind === 'page' && s.pages.find((p) => p.id === s.doc!.id)?.kind === 'project-template');
  const set = (k: string) => (v: unknown) => setField(n.id, k, v);
  const link = (
    <>
      <Row label="Link">
        <Text value={n.href} placeholder="/werk/ of https://…" onChange={(v) => set('href')(v || undefined)} />
      </Row>
      {n.href && (
        <Row label="">
          <Toggle value={!!n.newTab} onChange={set('newTab')} label="Nieuw tabblad" />
        </Row>
      )}
    </>
  );

  switch (n.type) {
    case 'text':
      return (
        <Section title="Inhoud">
          <Row label={lang ? `Tekst (${lang.toUpperCase()})` : 'Tekst'}>
            {lang ? (
              <Text multiline value={n.i18n?.[lang]} placeholder={n.content} onChange={(v) => setTranslation(n.id, lang, v || undefined)} />
            ) : (
              <Text multiline value={n.content} onChange={set('content')} />
            )}
          </Row>
          <p className="vs-help">Makkelijker: dubbelklik de tekst op het canvas, selecteer een stuk en gebruik de zwevende balk (of Ctrl+B/I/U/K). Zelf typen kan ook: **vet**, *cursief*, __onderstreept__, ~~doorgehaald~~, ==gemarkeerd==, `code`, [tekst]{'{'}accent{'}'} voor een kleur, [linktekst](https://…). Een link naar #anker scrollt soepel naar die laag. Wisselende woorden: [[eerste|tweede|derde]].</p>
          <Row label="Soort">
            <Select value={n.tag ?? 'p'} onChange={set('tag')} options={[{ value: 'h1', label: 'Kop 1 (h1)' }, { value: 'h2', label: 'Kop 2 (h2)' }, { value: 'h3', label: 'Kop 3 (h3)' }, { value: 'h4', label: 'Kop 4 (h4)' }, { value: 'p', label: 'Alinea (p)' }, { value: 'span', label: 'Los (span)' }]} />
          </Row>
          {link}
        </Section>
      );
    case 'svg':
      return <SvgSection n={n} />;
    case 'button':
      return (
        <Section title="Inhoud">
          <Row label="Label">
            {lang ? <Text value={n.i18n?.[lang]} placeholder={n.label} onChange={(v) => setTranslation(n.id, lang, v || undefined)} /> : <Text value={n.label} onChange={set('label')} />}
          </Row>
          <Row label="Stijl">
            <Select value={n.variant ?? 'primary'} onChange={set('variant')} options={BUTTON_KEYS.map((k) => ({ value: k, label: BUTTON_LABEL[k] }))} />
          </Row>
          <Row label="Icoon">
            <select className="vs-input" value={n.icon ?? ''} onChange={(e) => set('icon')(e.target.value || undefined)}>
              <option value="">Geen</option>
              {SVG_LIBRARY.filter((x) => x.category === 'Iconen').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </Row>
          {link}
        </Section>
      );
    case 'image':
      return (
        <Section title="Afbeelding">
          <Row label="Asset">
            <AssetSelect kind="image" value={n.asset} onChange={set('asset')} />
          </Row>
          <Row label="Alt-tekst">
            {lang ? <Text value={n.i18n?.[lang]} placeholder={n.alt || 'Wat staat erop?'} onChange={(v) => setTranslation(n.id, lang, v || undefined)} /> : <Text value={n.alt} placeholder="Wat staat erop?" onChange={set('alt')} />}
          </Row>
          <Row label="Bijschrift">
            <Text value={n.caption} placeholder="Optioneel, ook in de grote weergave" onChange={(v) => set('caption')(v || undefined)} />
          </Row>
          <FocusPicker n={n} />
          <Row label="Inzoomen">
            <input type="range" className="vs-range" min={100} max={300} step={5} value={n.crop ?? 100} onChange={(e) => set('crop')(Number(e.target.value) > 100 ? Number(e.target.value) : undefined)} />
            <span className="vs-muted" style={{ minWidth: 42, textAlign: 'right' }}>{n.crop ?? 100}%</span>
          </Row>
          {link}
        </Section>
      );
    case 'video':
      return (
        <Section title="Video">
          <Row label="Asset">
            <AssetSelect kind="video" value={n.asset} onChange={set('asset')} />
          </Row>
          <Row label="">
            <Toggle value={n.autoplay !== false} onChange={set('autoplay')} label="Automatisch afspelen (zonder geluid)" />
          </Row>
          <Row label="">
            <Toggle value={n.loop !== false} onChange={set('loop')} label="Herhalen" />
          </Row>
          <Row label="">
            <Toggle value={!!n.controls} onChange={set('controls')} label="Bedieningsknoppen" />
          </Row>
          <Row label="">
            <Toggle value={!!n.soundToggle} onChange={set('soundToggle')} label="Knop 'Geluid aan'" />
          </Row>
        </Section>
      );
    case 'embed':
      return (
        <Section title="Embed">
          <Row label="URL">
            <Text value={n.url} placeholder="https://youtu.be/… of https://vimeo.com/…" onChange={set('url')} />
          </Row>
          <Row label="">
            <Toggle value={!!n.autoplay} onChange={set('autoplay')} label="Automatisch afspelen (gedempt)" />
          </Row>
          <Row label="">
            <Toggle value={!!n.loop} onChange={set('loop')} label="Herhalen" />
          </Row>
          <Row label="">
            <Toggle value={n.controls !== false} onChange={(v) => set('controls')(v ? undefined : false)} label="Bedieningsknoppen tonen" />
          </Row>
          <p className="vs-help">Werkt met YouTube en Vimeo. Browsers spelen alleen gedempt vanzelf af; bezoekers zetten het geluid zelf aan.</p>
        </Section>
      );
    case 'collection':
      return (
        <Section title="Projecten">
          <Row label="Aantal">
            <Num value={n.limit} min={1} placeholder="alle" onChange={set('limit')} />
          </Row>
          <Row label="Categorie">
            <Text value={n.category} placeholder="alle" onChange={(v) => set('category')(v || undefined)} />
          </Row>
          <Row label="Weergave">
            <Segmented value={n.view ?? 'grid'} onChange={set('view')} options={[{ value: 'grid', label: 'Raster' }, { value: 'index', label: 'Lijst' }]} />
          </Row>
          <Row label="">
            <Toggle value={!!n.filters} onChange={set('filters')} label="Filterknoppen per categorie" />
          </Row>
          <Row label="">
            <Toggle value={!!n.viewToggle} onChange={set('viewToggle')} label="Knoppen lijst / raster" />
          </Row>
          <p className="vs-help">Lijst: grote titels met een zwevend voorbeeldbeeld bij hover. Zet twee collecties (lijst en raster) in één sectie en de knoppen wisselen ertussen.</p>
          <Row label="">
            <Toggle value={!!n.featuredOnly} onChange={set('featuredOnly')} label="Alleen uitgelichte projecten" />
          </Row>
        </Section>
      );
    case 'frame':
      return (
        <Section title="Frame">
          <Row label="HTML-tag">
            <Select value={n.tag ?? 'div'} onChange={set('tag')} options={['div', 'section', 'header', 'footer', 'nav', 'main', 'article', 'details', 'summary'].map((t) => ({ value: t as 'div', label: t === 'details' ? 'details (uitklapper)' : t === 'summary' ? 'summary (kop van uitklapper)' : t }))} />
          </Row>
          {isTemplate && (
            <Row label="">
              <Toggle value={!!n.slot} onChange={(v) => set('slot')(v || undefined)} label="Projectinhoud aan (hier komt de inhoud van elk project)" />
            </Row>
          )}
          {link}
        </Section>
      );
    case 'form':
      return <FormSection n={n} />;
    case 'instance': {
      const comp = components.find((c) => c.id === n.component);
      const editable: VNode[] = [];
      if (comp) walk(comp.tree, (c) => void (c.id !== comp.tree.id && editable.push(c)));
      const ov = n.overrides ?? {};
      const setOv = (cid: string, key: string, v: string | boolean | undefined) => {
        const next = { ...ov, [cid]: { ...(ov[cid] ?? {}), [key]: v } };
        if (v === undefined || v === '') delete next[cid][key as 'content'];
        if (!Object.keys(next[cid]).length) delete next[cid];
        setField(n.id, 'overrides', Object.keys(next).length ? next : undefined);
      };
      return (
        <Section title="Component">
          <Row label="Bron">
            <Select
              value={comp ? variantSet(comp.name) : ''}
              onChange={(v) => { const first = components.find((c) => variantSet(c.name) === v); if (first) set('component')(first.id); }}
              options={[...new Set(components.map((c) => variantSet(c.name)))].map((k) => ({ value: k, label: k }))}
            />
          </Row>
          {comp && components.filter((c) => variantSet(c.name) === variantSet(comp.name)).length > 1 && (
            <Row label="Variant">
              <Segmented
                value={n.component}
                onChange={set('component')}
                options={components.filter((c) => variantSet(c.name) === variantSet(comp.name)).map((c) => ({ value: c.id, label: variantName(c.name) }))}
              />
            </Row>
          )}
          <Row label="">
            <button className="vs-btn" onClick={() => comp && openDoc({ kind: 'component', id: comp.id })}>Component bewerken</button>
          </Row>
          {editable.length > 0 && <div className="vs-subhead">Overschrijven in deze instance</div>}
          {editable.map((c) => (
            <Row key={c.id} label={c.name}>
              {c.type === 'text' && <Text value={ov[c.id]?.content} placeholder={c.content} onChange={(v) => setOv(c.id, 'content', v)} />}
              {c.type === 'button' && <Text value={ov[c.id]?.label} placeholder={c.label} onChange={(v) => setOv(c.id, 'label', v)} />}
              {(c.type === 'image' || c.type === 'video') && <AssetSelect kind={c.type} value={ov[c.id]?.asset} onChange={(v) => setOv(c.id, 'asset', v)} />}
              {c.type !== 'text' && c.type !== 'button' && c.type !== 'image' && c.type !== 'video' && c.href !== undefined && <Text value={ov[c.id]?.href} placeholder={c.href} onChange={(v) => setOv(c.id, 'href', v)} />}
              <button
                className={`vs-icon-btn ${ov[c.id]?.hidden ? 'vs-off' : ''}`}
                title={ov[c.id]?.hidden ? 'Verborgen in deze instance — klik om te tonen' : 'Verbergen in deze instance'}
                onClick={() => setOv(c.id, 'hidden', ov[c.id]?.hidden ? undefined : true)}
              >
                {ov[c.id]?.hidden ? '◌' : '●'}
              </button>
            </Row>
          ))}
        </Section>
      );
    }
  }
}

/** Zonder selectie: instellingen van de pagina / het project / de component. */
function DocInspector() {
  const { doc, pages, components } = useStore();
  if (!doc) return null;

  if (doc.kind === 'page') {
    const page = pages.find((p) => p.id === doc.id);
    if (!page) return null;
    const save = async (patch: Record<string, unknown>) => {
      try {
        const p = await api.put<typeof page>(`/api/pages/${page.id}`, patch);
        patchState({ pages: useStore.getState().pages.map((x) => (x.id === p.id ? p : x)) });
      } catch (e) {
        toast((e as Error).message, 'error');
      }
    };
    const isTemplate = page.kind === 'project-template';
    return (
      <>
        <Section title={isTemplate ? 'Projectsjabloon' : 'Pagina'}>
          {isTemplate ? (
            <p className="vs-help">
              Dit sjabloon gebruikt elke projectpagina. Gebruik {'{{project.title}}'}, {'{{project.client}}'}, {'{{project.year}}'}, {'{{project.summary}}'} en {'{{project.cover}}'} als tekst of asset. Het frame met "Projectinhoud aan" krijgt de eigen inhoud van elk project.
            </p>
          ) : (
            <>
              <Row label="Titel">
                <Text value={page.title} onChange={(v) => save({ title: v })} />
              </Row>
              <Row label="Adres">
                <Text value={page.slug === '' ? '/' : `/${page.slug}/`} onChange={(v) => page.slug !== '' && save({ slug: v.replace(/^\/|\/$/g, '') })} />
              </Row>
              <Row label="">
                <Toggle value={page.status !== 'draft'} onChange={(v) => save({ status: v ? 'live' : 'draft' })} label="Meenemen bij publiceren" />
              </Row>
            </>
          )}
        </Section>
        {!isTemplate && (
          <Section title="Zoekmachines en delen">
            <Row label="SEO-titel">
              <Text value={page.seo.title} placeholder={page.title} onChange={(v) => save({ seo: { ...page.seo, title: v || undefined } })} />
            </Row>
            <Row label="Omschrijving">
              <Text multiline value={page.seo.description} onChange={(v) => save({ seo: { ...page.seo, description: v || undefined } })} />
            </Row>
            <Row label="Deelafbeelding">
              <AssetSelect kind="image" value={page.seo.image} onChange={(v) => save({ seo: { ...page.seo, image: v } })} />
            </Row>
            <Row label="">
              <Toggle value={!!page.seo.noindex} onChange={(v) => save({ seo: { ...page.seo, noindex: v || undefined } })} label="Verbergen voor zoekmachines" />
            </Row>
          </Section>
        )}
        <SelectRootHint />
      </>
    );
  }

  if (doc.kind === 'component') {
    const comp = components.find((c) => c.id === doc.id);
    return (
      <>
        <Section title="Component">
          <Row label="Naam">
            <Text
              value={comp?.name}
              onChange={async (v) => {
                if (!comp) return;
                const saved = await api.put<typeof comp>(`/api/components/${comp.id}`, { name: v, tree: useStore.getState().tree });
                patchState({ components: useStore.getState().components.map((c) => (c.id === saved.id ? saved : c)) });
              }}
            />
          </Row>
          <p className="vs-help">Wijzigingen hier gelden voor elke instance van deze component op alle pagina's.</p>
        </Section>
        <SelectRootHint />
      </>
    );
  }

  return (
    <>
      <Section title="Projectinhoud">
        <p className="vs-help">Deze inhoud komt op de projectpagina in het frame "Projectinhoud" van het projectsjabloon. Titel, cover en gegevens beheer je in het tabblad Projecten.</p>
      </Section>
      <SelectRootHint />
    </>
  );
}

function SelectRootHint() {
  const tree = useStore((s) => s.tree);
  return (
    <div className="vs-section">
      <button className="vs-btn" onClick={() => tree && useStore.setState({ selection: tree.id })}>
        Hoofdframe selecteren
      </button>
    </div>
  );
}

function FormSection({ n }: { n: FormNode }) {
  const setFields = (fields: FormField[]) => setField(n.id, 'fields', fields);
  const upd = (i: number, patch: Partial<FormField>) => setFields(n.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <Section title="Formulier">
      {n.fields.map((f, i) => (
        <div key={f.id} className="vs-field-edit">
          <Row label="Veld">
            <Text value={f.label} onChange={(v) => upd(i, { label: v })} />
            <button className="vs-icon-btn" title="Omhoog" disabled={i === 0} onClick={() => { const a = [...n.fields]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setFields(a); }}>↑</button>
            <button className="vs-icon-btn" title="Verwijderen" onClick={() => setFields(n.fields.filter((_, j) => j !== i))}>✕</button>
          </Row>
          <Row label="">
            <Select value={f.kind} onChange={(v) => upd(i, { kind: v })} options={[{ value: 'text', label: 'Tekst' }, { value: 'email', label: 'E-mail' }, { value: 'tel', label: 'Telefoon' }, { value: 'textarea', label: 'Lang bericht' }, { value: 'select', label: 'Keuzelijst' }]} />
            <Toggle value={!!f.required} onChange={(v) => upd(i, { required: v })} label="Verplicht" />
          </Row>
          {f.kind === 'select' && (
            <Row label="Keuzes">
              <Text value={(f.options ?? []).join(', ')} placeholder="Video, Motion, Anders" onChange={(v) => upd(i, { options: v.split(',').map((x) => x.trim()).filter(Boolean) })} />
            </Row>
          )}
        </div>
      ))}
      <button className="vs-btn" onClick={() => setFields([...n.fields, { id: `veld${Date.now().toString(36)}`, label: 'Nieuw veld', kind: 'text' }])}>+ Veld</button>
      <Row label="Knoptekst"><Text value={n.submitLabel} placeholder="Versturen" onChange={(v) => setField(n.id, 'submitLabel', v || undefined)} /></Row>
      <Row label="Na versturen"><Text multiline value={n.successMessage} onChange={(v) => setField(n.id, 'successMessage', v || undefined)} /></Row>
      <p className="vs-help">Inzendingen zie je onder 📬 bovenin. Met FORM_WEBHOOK_URL in .env gaan ze ook naar bijvoorbeeld een Discord-kanaal.</p>
    </Section>
  );
}

/** Klik op de miniatuur om te kiezen welk deel van de foto altijd in beeld blijft. */
function FocusPicker({ n }: { n: Extract<VNode, { type: 'image' }> }) {
  const assets = useStore((s) => s.assets);
  const a = assets.find((x) => x.id === n.asset);
  const url = a ? a.variants.find((v) => v.width && v.width <= 800)?.url ?? a.url : n.src;
  if (!url) return null;
  const fx = n.focus?.x ?? 50;
  const fy = n.focus?.y ?? 50;
  const pick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100);
    const y = Math.round(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * 100);
    setField(n.id, 'focus', x === 50 && y === 50 ? undefined : { x, y });
  };
  return (
    <Row label="Focuspunt">
      <div className="vs-focus" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }} onPointerMove={(e) => { if (e.buttons) pick(e); }} title="Klik of sleep: dit deel blijft in beeld als de foto wordt bijgesneden">
        <img src={url} alt="" draggable={false} />
        <span style={{ left: `${fx}%`, top: `${fy}%` }} />
      </div>
    </Row>
  );
}

/** Gedeelde stijlen: opslaan, toepassen, bijwerken en losmaken (zoals Figma-stijlen). */
function SharedStyleSection({ n }: { n: VNode }) {
  const site = useStore((s) => s.site);
  const [naming, setNaming] = useState<string | null>(null);
  if (!site) return null;
  const styles = siteTheme(site).styles ?? {};
  const cur = n.styleRef ? styles[n.styleRef] : undefined;
  const hasOwn = Object.keys(n.style ?? {}).some((k) => !['rotate', 'flipX', 'flipY', 'scale', 'origin'].includes(k));
  return (
    <Section title="Gedeelde stijl" defaultClosed={!n.styleRef}>
      <Row label="Stijl">
        <Select
          value={n.styleRef ?? ''}
          onChange={(v) => setField(n.id, 'styleRef', v || undefined)}
          options={[{ value: '', label: Object.keys(styles).length ? 'Geen' : 'Nog geen stijlen' }, ...Object.entries(styles).map(([id, x]) => ({ value: id, label: x.name }))]}
        />
      </Row>
      {cur && n.styleRef && (
        <>
          {hasOwn && <p className="vs-help">Deze laag wijkt af van “{cur.name}”. Zet de afwijking in de stijl, dan krijgen alle lagen hem.</p>}
          <div className="vs-btnrow">
            {hasOwn && <button className="vs-btn" onClick={() => void updateSharedStyle()}>Stijl bijwerken</button>}
            <button className="vs-btn" onClick={detachSharedStyle} title="Opmaak overnemen en de koppeling verbreken">Losmaken</button>
            <button className="vs-btn" onClick={async () => { const v = await askText('Nieuwe naam voor deze stijl', cur.name, 'Hernoemen'); if (v) void renameSharedStyle(n.styleRef!, v); }}>Hernoemen</button>
            <button className="vs-btn vs-danger" onClick={() => { if (confirm(`Stijl “${cur.name}” verwijderen? Lagen die hem gebruiken houden alleen hun eigen opmaak.`)) void deleteSharedStyle(n.styleRef!); }}>Verwijderen</button>
          </div>
        </>
      )}
      {!n.styleRef &&
        (naming === null ? (
          <button className="vs-btn" disabled={!hasOwn} title={hasOwn ? '' : 'Geef de laag eerst wat opmaak'} onClick={() => setNaming('')}>＋ Opmaak van deze laag opslaan als stijl</button>
        ) : (
          <div className="vs-row-fields">
            <input
              autoFocus
              className="vs-input"
              placeholder="Naam, bv. Kop retro neon"
              value={naming}
              onChange={(e) => setNaming(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && naming.trim()) { void createSharedStyle(naming); setNaming(null); }
                if (e.key === 'Escape') setNaming(null);
              }}
            />
            <button className="vs-btn" disabled={!naming.trim()} onClick={() => { void createSharedStyle(naming); setNaming(null); }}>Opslaan</button>
          </div>
        ))}
      <p className="vs-help">Pas je een gedeelde stijl aan, dan verandert elke laag die hem gebruikt mee. Draaien en spiegelen blijven per laag.</p>
    </Section>
  );
}
