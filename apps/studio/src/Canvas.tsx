import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { getGuides } from './Rulers';
import {
  BASE_CSS,
  BREAKPOINT_CANVAS,
  assetUrl,
  childParentMode,
  cssToReact,
  expandTree,
  findNode,
  nodeCss,
  resolveProps,
  richText,
  sourceId,
  findParent,
  themeClasses,
  themeCss,
  siteTheme,
  buttonIcon,
  esc,
  svgColorVars,
  color as cssColor,
  RUNTIME_CSS,
  pathTo,
  type Asset,
  type Breakpoint,
  type FrameNode,
  type LayoutMode,
  type VNode,
  uniqueSvgIds,
  SCHEME_ROLES,
  SCHEME_ROLE_LABEL,
  withSharedStyle,
  localText,
} from '@vystara/core';
import { mutate, select, useStore, setField, openDoc, moveNode, selectedIds, setRotation, setTranslation, duplicateSelection, uploadAndInsert } from './store';

export interface RenderCtx {
  bp: Breakpoint;
  assets: Record<string, Asset>;
  editingText: string | null;
  styles?: Record<string, { style: import('@vystara/core').Style }>;
  /** Taal die je bewerkt (null = hoofdtaal). */
  lang?: string | null;
}

export function RenderNode({ node, parentMode, ctx }: { node: VNode; parentMode: LayoutMode; ctx: RenderCtx }): ReactNode {
  const p = withSharedStyle(node, resolveProps(node, ctx.bp), ctx.styles);
  const css = nodeCss(node, p, { parentMode, resolveAsset: (id) => assetUrl(ctx.assets[id], 1600) });
  // Verborgen lagen in de Studio half doorzichtig laten zien in plaats van weg.
  const hiddenHere = p.hidden;
  if (hiddenHere) return null;
  // Fixed zou in de Studio aan het scherm plakken; op het canvas tonen we het aan de pagina.
  if (css.position === 'fixed') css.position = 'absolute';
  const style = cssToReact(css) as CSSProperties;
  const kidsMode = childParentMode(node, p);
  const tc = themeClasses(node).trim();
  const cls = (x = '') => [x, tc].filter(Boolean).join(' ') || undefined;
  const kids = node.children?.map((c) => <RenderNode key={c.id} node={c} parentMode={kidsMode} ctx={ctx} />);
  const common = { 'data-id': node.id, style, className: '' } as Record<string, unknown>;
  if ((node as { layout?: { masonry?: boolean } }).layout?.masonry) common['data-masonry'] = '';

  switch (node.type) {
    case 'frame':
    case 'collection': {
      // details/summary in de Studio altijd open tonen, zodat alles bewerkbaar blijft.
      const raw = node.type === 'frame' ? node.tag ?? 'div' : 'div';
      const Tag = (raw === 'details' || raw === 'summary' ? 'div' : raw) as 'div';
      const el = <Tag {...common} className={cls()}>{kids}{node.type === 'collection' && !node.children?.length && <div className="v-placeholder">Nog geen projecten</div>}</Tag>;
      if (node.type === 'collection' && (node.filters || node.viewToggle)) {
        const cats = [...new Set((node.children ?? []).map((c) => c.data?.label).filter(Boolean))];
        return (
          <>
            <div className="v-filter">
              {node.filters && <><span className="v-chip" aria-pressed="true">Alles</span>{cats.map((c) => <span key={c} className="v-chip">{c}</span>)}</>}
              {node.viewToggle && <span className="v-views"><span className="v-chip" aria-pressed={node.view === 'index'}>Lijst</span><span className="v-chip" aria-pressed={node.view !== 'index'}>Raster</span></span>}
            </div>
            {el}
          </>
        );
      }
      return el;
    }
    case 'text': {
      const Tag = (node.tag ?? 'p') as 'p';
      const editing = ctx.editingText === node.id;
      if (editing) return <TextEditor node={node} style={style} className={cls('v-text vs-editing')} lang={ctx.lang ?? null} />;
      const shown = localText(node, ctx.lang) ?? '';
      const todo = ctx.lang && node.content.trim() && !node.i18n?.[ctx.lang] && !/^\{[^}]+\}$/.test(node.content.trim()) ? ' vs-untranslated' : '';
      return shown ? <Tag {...common} className={cls('v-text' + todo)} dangerouslySetInnerHTML={{ __html: richText(shown) }} /> : <Tag {...common} className={cls('v-text')}>{'\u00a0'}</Tag>;
    }
    case 'button':
      return <a {...common} className={cls('v-btn' + (ctx.lang && node.label.trim() && !node.i18n?.[ctx.lang] ? ' vs-untranslated' : ''))} dangerouslySetInnerHTML={{ __html: esc(localText(node, ctx.lang) ?? '') + buttonIcon(node.icon) }} />;
    case 'image': {
      const a = node.asset ? ctx.assets[node.asset] : undefined;
      const src = a ? assetUrl(a, 1600) : node.src;
      if (!src) return <div {...common} className={cls('v-placeholder')}>Afbeelding — kies een asset</div>;
      const gif = a?.variants.find((v) => v.type === 'video/mp4');
      if (gif) return <video {...common} className={cls()} src={gif.url} autoPlay muted loop playsInline />;
      if (node.crop && node.crop > 100)
        return (
          <span {...common} className={cls('v-crop')}>
            <img src={src} alt={node.alt ?? ''} draggable={false} />
          </span>
        );
      return <img {...common} className={cls()} src={src} alt={node.alt ?? ''} draggable={false} />;
    }
    case 'video': {
      const a = node.asset ? ctx.assets[node.asset] : undefined;
      const src = a ? assetUrl(a) : node.src;
      if (!src) return <div {...common} className={cls('v-placeholder')}>Video — kies een asset</div>;
      return (
        <div {...common} className={cls('v-video')}>
          <video className="v-media" src={a?.variants.find((v) => v.type === 'video/mp4')?.url ?? src} poster={a?.poster ?? undefined} autoPlay={node.autoplay !== false} muted loop playsInline />
          {node.soundToggle && <button className="v-sound" type="button" tabIndex={-1}>Geluid aan</button>}
        </div>
      );
    }
    case 'embed':
      return (
        <div {...common} className={cls('v-embed')}>
          {node.url ? <iframe src={node.url} style={{ pointerEvents: 'none' }} title={node.name} /> : <div className="v-placeholder">Embed — vul een URL in</div>}
        </div>
      );
    case 'form':
      return (
        <form {...common} className={cls('v-form')} onSubmit={(e) => e.preventDefault()}>
          {node.fields.map((f) => (
            <label key={f.id} className="v-field">
              <span>{f.label}{f.required ? ' *' : ''}</span>
              {f.kind === 'textarea' ? <textarea placeholder={f.placeholder} readOnly tabIndex={-1} /> : f.kind === 'select' ? <select tabIndex={-1}><option>{f.placeholder || 'Kies…'}</option></select> : <input placeholder={f.placeholder} readOnly tabIndex={-1} />}
            </label>
          ))}
          <button className="v-submit" type="button" tabIndex={-1}>{node.submitLabel ?? 'Versturen'}</button>
        </form>
      );
    case 'svg': {
      const vars: Record<string, string> = {};
      for (const part of svgColorVars(node.colors, cssColor).split(';').filter(Boolean)) {
        const i = part.indexOf(':');
        vars[part.slice(0, i)] = part.slice(i + 1);
      }
      return <div {...common} className={cls('v-svg')} style={{ ...style, ...vars }} dangerouslySetInnerHTML={{ __html: uniqueSvgIds(node.svg, node.id) }} />;
    }
    case 'instance':
      return <div {...common} className="v-placeholder">Component ontbreekt</div>;
  }
}

type Fmt = 'b' | 'i' | 'u' | 's' | 'mark' | 'code';
const FMT: Record<Fmt, [string, string]> = { b: ['**', '**'], i: ['*', '*'], u: ['__', '__'], s: ['~~', '~~'], mark: ['==', '=='], code: ['`', '`'] };

/** Platte opmaak-tekens weghalen (Opmaak wissen). */
const stripMarks = (t: string) =>
  t
    .replace(/\[\[([^\]|]+)[^\]]*\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\{[^}]*\}/g, '$1')
    .replace(/\*\*|__|~~|==|`/g, '')
    .replace(/\*([^*]+)\*/g, '$1');

function TextEditor({ node, style, className, lang }: { node: Extract<VNode, { type: 'text' }>; style: CSSProperties; className?: string; lang: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const id = sourceId(node.id);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [url, setUrl] = useState('');
  const site = useStore((s) => s.site);
  const theme = site ? siteTheme(site) : null;
  const scheme = theme ? theme.schemes[theme.defaultScheme] ?? Object.values(theme.schemes)[0] : undefined;
  const swatches = [
    ...SCHEME_ROLES.map((r) => ({ key: r as string, label: SCHEME_ROLE_LABEL[r], hex: scheme?.[r] })),
    ...Object.entries(theme?.palette ?? {}).map(([k, v]) => ({ key: k, label: k, hex: v })),
  ]
    .filter((x) => x.hex && /^[a-zA-Z][\w-]*$/.test(x.key))
    .sort((a, b) => Number(b.key === 'accent') - Number(a.key === 'accent'));

  const place = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const y = r.top > 64 ? r.top - 46 : r.bottom + 8;
    setPos({ x: Math.max(8, Math.min(window.innerWidth - 420, r.left)), y });
  };
  useLayoutEffect(() => {
    const el = ref.current!;
    el.innerText = lang ? node.i18n?.[lang] || node.content : node.content;
    el.focus();
    const r = document.createRange();
    r.selectNodeContents(el);
    const s = window.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
    place();
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const commit = () => {
    const v = ref.current?.innerText.replace(/\n$/, '') ?? '';
    if (lang) {
      if (v !== (node.i18n?.[lang] || node.content)) setTranslation(id, lang, v === node.content ? undefined : v);
    } else if (v !== node.content) setField(id, 'content', v);
    useStore.setState({ editingText: null });
  };
  const restore = () => {
    const el = ref.current!;
    el.focus();
    if (saved.current) {
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(saved.current);
    }
  };
  /** Vervang de selectie en selecteer het resultaat opnieuw (zodat je kunt blijven stapelen). */
  const replaceSel = (text: string, caretBack = 0) => {
    const sel = window.getSelection();
    if (!sel || !ref.current?.contains(sel.anchorNode)) return;
    document.execCommand('insertText', false, text);
    const ext = sel as Selection & { modify?: (a: string, d: string, g: string) => void };
    if (!ext.modify) return;
    if (caretBack) for (let i = 0; i < caretBack; i++) ext.modify('move', 'backward', 'character');
    else for (let i = 0; i < text.length; i++) ext.modify('extend', 'backward', 'character');
    place();
  };
  const wrap = (open: string, close: string) => {
    const t = window.getSelection()?.toString() ?? '';
    if (!t) return replaceSel(open + close, close.length);
    if (t.length >= open.length + close.length && t.startsWith(open) && t.endsWith(close)) return replaceSel(t.slice(open.length, t.length - close.length));
    // Spaties aan de randen buiten de opmaak houden.
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(t)!;
    replaceSel(m[1] + open + m[2] + close + m[3]);
  };
  const fmt = (f: Fmt) => wrap(...FMT[f]);
  const color = (key: string) => {
    restore();
    const t = window.getSelection()?.toString() || 'tekst';
    // Bestaande kleur vervangen in plaats van stapelen; overige opmaak (vet e.d.) blijft staan.
    const inner = /^\[([^\]]*)\]\{[^}]*\}$/.exec(t)?.[1] ?? t;
    replaceSel(`[${inner}]{${key}}`);
    setColorOpen(false);
  };
  const applyLink = () => {
    restore();
    const u = url.trim();
    const t = window.getSelection()?.toString() || u;
    if (u) replaceSel(`[${t}](${/^(https?:|mailto:|tel:|\/|#)/.test(u) ? u : 'https://' + u})`);
    setLinkOpen(false);
    setUrl('');
  };
  const openLink = () => {
    const sel = window.getSelection();
    saved.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    setColorOpen(false);
    setLinkOpen(true);
  };
  const openColor = () => {
    const sel = window.getSelection();
    saved.current = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    setLinkOpen(false);
    setColorOpen((o) => !o);
  };
  const keep = (e: { preventDefault: () => void }) => e.preventDefault();
  const B = ({ t, title, on, children }: { t?: Fmt; title: string; on?: () => void; children: ReactNode }) => (
    <button type="button" title={title} onMouseDown={keep} onClick={() => (t ? fmt(t) : on?.())}>{children}</button>
  );

  return (
    <>
      <div
        ref={ref}
        data-id={node.id}
        className={className}
        style={style}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck
        lang={lang ?? useStore.getState().site?.seo?.lang ?? 'nl'}
        onInput={place}
        onBlur={(e) => {
          if (bar.current && e.relatedTarget && bar.current.contains(e.relatedTarget as Node)) return;
          commit();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          const mod = e.metaKey || e.ctrlKey;
          const k = e.key.toLowerCase();
          if (e.key === 'Escape' || (e.key === 'Enter' && mod)) {
            e.preventDefault();
            commit();
          } else if (mod && !e.altKey) {
            const map: Record<string, Fmt> = e.shiftKey ? { x: 's', h: 'mark', c: 'code' } : { b: 'b', i: 'i', u: 'u' };
            if (map[k]) { e.preventDefault(); fmt(map[k]); }
            else if (k === 'k' && !e.shiftKey) { e.preventDefault(); openLink(); }
            else if (k === '\\') { e.preventDefault(); const t = window.getSelection()?.toString(); if (t) replaceSel(stripMarks(t)); }
          }
        }}
      />
      {pos &&
        createPortal(
          <div ref={bar} className="vs-textbar" style={{ left: pos.x, top: pos.y }} onMouseDown={(e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }}>
            <B t="b" title="Vet (Ctrl+B)"><b>B</b></B>
            <B t="i" title="Cursief (Ctrl+I)"><i>I</i></B>
            <B t="u" title="Onderstrepen (Ctrl+U)"><u>U</u></B>
            <B t="s" title="Doorhalen (Ctrl+Shift+X)"><s>S</s></B>
            <B t="mark" title="Markeren (Ctrl+Shift+H)"><span className="vs-tb-mark">M</span></B>
            <B t="code" title="Code (Ctrl+Shift+C)"><span style={{ fontFamily: 'ui-monospace,monospace', fontSize: 12 }}>{'</>'}</span></B>
            <span className="vs-tb-sep" />
            <B title="Kleur voor dit stukje tekst" on={openColor}><span className="vs-tb-color" style={{ background: scheme?.accent ?? '#ff5c8a' }} /></B>
            <B title="Link (Ctrl+K)" on={openLink}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
            </B>
            <B title="Wisselwoorden: [[woord|ander woord]]" on={() => wrap('[[', '|]]')}><span style={{ fontSize: 12 }}>⇅</span></B>
            <span className="vs-tb-sep" />
            <B title="Opmaak wissen (Ctrl+\)" on={() => { const t = window.getSelection()?.toString(); if (t) replaceSel(stripMarks(t)); }}><span style={{ fontSize: 12 }}>Tx</span></B>
            <B title="Klaar (Esc)" on={() => ref.current?.blur()}><span style={{ fontSize: 12 }}>✓</span></B>
            {linkOpen && (
              <div className="vs-tb-pop">
                <input
                  autoFocus
                  className="vs-input"
                  placeholder="https://… of /pagina of mailto:"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
                    if (e.key === 'Escape') { setLinkOpen(false); restore(); }
                  }}
                  onBlur={(e) => {
                    const to = e.relatedTarget as Node | null;
                    if (to && (bar.current?.contains(to) || ref.current === to)) return;
                    setLinkOpen(false);
                    commit();
                  }}
                />
                <button type="button" className="vs-btn" onClick={applyLink}>Toevoegen</button>
              </div>
            )}
            {colorOpen && (
              <div className="vs-tb-pop vs-swatches">
                {swatches.map((x) => (
                  <button key={x.key} type="button" title={x.label} onMouseDown={keep} onClick={() => color(x.key)}>
                    <span className="vs-swatch" style={{ background: x.hex }} />
                  </button>
                ))}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Rechthoek van een element t.o.v. de viewport-container. */
function rectOf(container: HTMLElement, id: string | null): DOMRect | null {
  if (!id) return null;
  const el = container.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  return new DOMRect(r.left - c.left + container.scrollLeft, r.top - c.top + container.scrollTop, r.width, r.height);
}

/** Middelpunt, ware breedte/hoogte (zonder rotatie) en rotatie van de selectie, in viewport-coördinaten. */
interface Geo { cx: number; cy: number; w: number; h: number; rot: number; s: number }
function geoOf(container: HTMLElement, id: string | null, rot: number, scl = 1): Geo | null {
  if (!id) return null;
  const el = container.querySelector(`[data-id="${CSS.escape(id)}"]`) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const c = container.getBoundingClientRect();
  const board = container.querySelector('.vs-board') as HTMLElement | null;
  const k = board && board.offsetWidth ? board.getBoundingClientRect().width / board.offsetWidth : 1;
  const w = el.offsetWidth ? el.offsetWidth * k * scl : r.width;
  const h = el.offsetHeight ? el.offsetHeight * k * scl : r.height;
  return { cx: r.left + r.width / 2 - c.left + container.scrollLeft, cy: r.top + r.height / 2 - c.top + container.scrollTop, w, h, rot, s: scl };
}
const sameGeo = (a: Geo | null, b: Geo | null) => (!a || !b ? a === b : a.cx === b.cx && a.cy === b.cy && a.w === b.w && a.h === b.h && a.rot === b.rot && a.s === b.s);

type Edge = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
const EDGES: Edge[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const EDGE_ANGLE: Record<Edge, number> = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
/** Cursor die meedraait met de rotatie van de laag. */
function edgeCursor(edge: Edge, rot: number) {
  const a = (((EDGE_ANGLE[edge] + rot) % 180) + 180) % 180;
  const opts: [number, string][] = [[0, 'ns-resize'], [45, 'nesw-resize'], [90, 'ew-resize'], [135, 'nwse-resize'], [180, 'ns-resize']];
  return opts.reduce((best, o) => (Math.abs(o[0] - a) < Math.abs(best[0] - a) ? o : best))[1];
}
const ROTATE_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/><path d="M20 12a8 8 0 1 1-2.3-5.6" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"/><path d="M20 3v5h-5" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 3v5h-5" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')}") 12 12, grab`;

export function Canvas() {
  const { tree, bp, zoom, assets, components, projects, site, selection, extra, hover, editingText, doc, lang } = useStore();
  const viewport = useRef<HTMLDivElement>(null);
  const [rects, setRects] = useState<{ sel: DOMRect | null; hov: DOMRect | null; extra: DOMRect[] }>({ sel: null, hov: null, extra: [] });
  const [dropLine, setDropLine] = useState<DOMRect | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [hud, setHud] = useState<{ x: number; y: number; text: string } | null>(null);

  const assetMap = useMemo(() => Object.fromEntries(assets.map((a) => [a.id, a])), [assets]);
  const expanded = useMemo(() => {
    if (!tree || !site) return null;
    const project = doc?.kind === 'project' ? projects.find((p) => p.id === doc.id) : projects[0];
    return expandTree(tree, {
      site,
      components: Object.fromEntries(components.map((c) => [c.id, c])),
      projects,
      project: project ?? null,
      year: String(new Date().getFullYear()),
    }) as FrameNode;
  }, [tree, site, components, projects, doc]);

  // Selectie- en hoverkaders bijhouden (ook tijdens laden van media en scrollen).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = viewport.current;
      if (v) {
        const sel = rectOf(v, selection);
        const st = useStore.getState();
        const sn = st.tree && selection ? findNode(st.tree, selection) : null;
        // Rotatie van de laag plus die van al zijn ouders: zo draait het kader echt mee.
        let rot = 0;
        let scl = 1;
        if (sn && st.tree) {
          rot = resolveProps(sn, st.bp).style?.rotate ?? 0;
          scl = resolveProps(sn, st.bp).style?.scale ?? 1;
          let p = findParent(st.tree, sn.id);
          while (p) {
            const ps = resolveProps(p.parent, st.bp).style;
            rot += ps?.rotate ?? 0;
            scl *= ps?.scale ?? 1;
            p = findParent(st.tree, p.parent.id);
          }
        }
        const g = geoOf(v, selection, rot, scl);
        setGeo((old) => (sameGeo(old, g) ? old : g));
        const hov = hover && hover !== selection ? rectOf(v, hover) : null;
        const ex = extra.map((id) => rectOf(v, id)).filter((r): r is DOMRect => !!r);
        setRects((old) =>
          same(old.sel, sel) && same(old.hov, hov) && old.extra.length === ex.length && old.extra.every((r, i) => same(r, ex[i])) ? old : { sel, hov, extra: ex },
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selection, hover, extra]);

  // Webfonts van de site ook in de Studio laden.
  useEffect(() => {
    if (!site?.fontsHref) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = site.fontsHref;
    document.head.appendChild(l);
    return () => l.remove();
  }, [site?.fontsHref]);

  // Vrij gepositioneerde lagen verslepen (absolute/fixed).
  const drag = useRef<{
    id: string; x0: number; y0: number; x: number; y: number; ax: string; ay: string;
    /** Voor slim uitlijnen: eigen maat, maat van de ouder, en randen van broertjes (CSS-px binnen de ouder). */
    w: number; h: number; pw: number; ph: number; xs: number[]; ys: number[]; pr: DOMRect | null;
    /** Alt+slepen: bij de eerste beweging een kopie maken en die slepen. */
    dup?: boolean;
  } | null>(null);
  const [guides, setGuides] = useState<{ v: number[]; h: number[]; box: { left: number; top: number; width: number; height: number } } | null>(null);
  const pan = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [measuring, setMeasuring] = useState(false);
  const [fileOver, setFileOver] = useState(false);
  // Alt ingedrukt = afstanden meten (zoals Figma). Losgelaten merken we ook via de muis (altKey).
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setMeasuring(true); else if (!e.altKey) setMeasuring(false); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setMeasuring(false); };
    const blur = () => setMeasuring(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  const [panning, setPanning] = useState(false);

  // Spatie ingedrukt houden = canvas verslepen (zoals in Figma/Photoshop).
  useEffect(() => {
    const typing = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.('input,textarea,select,[contenteditable]');
    const down = (e: KeyboardEvent) => { if (e.code === 'Space' && !typing(e.target)) { e.preventDefault(); setSpaceDown(true); } };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceDown(false); };
    const blur = () => setSpaceDown(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  // Ctrl/⌘ + scrollwiel (of knijpen op een trackpad) = zoomen rond de muis.
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const z0 = useStore.getState().zoom;
      const z1 = Math.min(3, Math.max(0.1, Math.round(z0 * Math.exp(-e.deltaY * 0.0025) * 100) / 100));
      if (z1 === z0) return;
      const r = vp.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      const cx = (vp.scrollLeft + mx) / z0;
      const cy = (vp.scrollTop + my) / z0;
      useStore.setState({ zoom: z1 });
      requestAnimationFrame(() => {
        vp.scrollLeft = cx * z1 - mx;
        vp.scrollTop = cy * z1 - my;
      });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  });
  // Lagen in auto layout herschikken door te slepen.
  const reorder = useRef<{ id: string; x0: number; y0: number; active: boolean; target: string | null; where: 'before' | 'after'; dup?: boolean } | null>(null);
  // Formaat en rotatie aanpassen met handvatten (zoals in Adobe-apps), via window-luisteraars
  // zodat slepen ook buiten het canvas doorgaat.
  const startTransform = (e: React.MouseEvent, mode: 'resize' | 'rotate', edge?: Edge) => {
    e.stopPropagation();
    e.preventDefault();
    const st = useStore.getState();
    const id = st.selection;
    const n = st.tree && id ? findNode(st.tree, id) : null;
    const v = viewport.current;
    if (!n || !id || !v || !geo) return;
    const p = resolveProps(n, st.bp);
    const pos = p.position ?? {};
    const vr = v.getBoundingClientRect();
    const cxs = geo.cx - v.scrollLeft + vr.left;
    const cys = geo.cy - v.scrollTop + vr.top;
    // Werk in echte CSS-pixels van de laag: zonder canvas-zoom en zonder eigen schaal.
    const z = st.zoom * (geo.s || 1);
    const w0 = geo.w / z;
    const h0 = geo.h / z;
    const rot0 = geo.rot;
    const own0 = p.style?.rotate ?? 0;
    const a0 = (Math.atan2(e.clientY - cys, e.clientX - cxs) * 180) / Math.PI;
    const x0 = e.clientX;
    const y0 = e.clientY;
    const abs = pos.mode === 'absolute' || pos.mode === 'fixed';
    const ex = edge?.includes('e') ? 1 : edge?.includes('w') ? -1 : 0;
    const ey = edge?.includes('s') ? 1 : edge?.includes('n') ? -1 : 0;
    const size0 = p.size ?? {};
    const el = v.querySelector(`[data-id="${CSS.escape(id)}"]`) as HTMLElement | null;
    // Tekst schaalt mee (lettergrootte) bij hoek- en boven/ondergrepen, zoals puntentekst in Adobe-apps.
    // De zijgrepen links/rechts veranderen alleen de breedte, zodat de tekst anders afbreekt.
    const textScale = n.type === 'text' && !!ey && !(e.ctrlKey || e.metaKey);
    // Ctrl/Cmd + hoekgreep: de hele laag visueel schalen, inclusief alles erin.
    const uniform = !!ex && !!ey && (e.ctrlKey || e.metaKey);
    const scale0 = p.style?.scale ?? 1;
    const font0 = p.style?.fontSize ?? (el ? parseFloat(getComputedStyle(el).fontSize) || 16 : 16);
    // Vaste beeldverhouding (bv. 16 / 9): alleen de breedte zetten, de hoogte volgt vanzelf.
    const ratio = size0.aspectRatio ? (() => { const [a1, b1] = size0.aspectRatio!.split('/').map((x) => parseFloat(x)); return a1 && b1 ? a1 / b1 : 0; })() : 0;
    // Uitgerekt over de breedte/hoogte? Dan eerst omzetten naar een vaste plek, anders botst de maat met de ankers.
    let stretch0: { x?: number; y?: number } = {};
    if (abs && el) {
      const op = (el.offsetParent as HTMLElement | null) ?? el.parentElement;
      const er = el.getBoundingClientRect();
      const pr = op?.getBoundingClientRect();
      if (pr) stretch0 = { x: Math.round((er.left - pr.left) / st.zoom), y: Math.round((er.top - pr.top) / st.zoom) };
    }
    document.body.style.cursor = mode === 'rotate' ? ROTATE_CURSOR : edgeCursor(edge!, rot0);
    const move = (ev: MouseEvent) => {
      if (mode === 'rotate') {
        const a = (Math.atan2(ev.clientY - cys, ev.clientX - cxs) * 180) / Math.PI;
        let r = own0 + (a - a0);
        r = ev.shiftKey ? Math.round(r / 15) * 15 : Math.round(r);
        setRotation(id, r);
        const shown = ((((r % 360) + 540) % 360) - 180);
        setHud({ x: ev.clientX, y: ev.clientY, text: `${shown}°` });
        return;
      }
      const t = (rot0 * Math.PI) / 180;
      const dxs = ev.clientX - x0;
      const dys = ev.clientY - y0;
      const lx = (dxs * Math.cos(t) + dys * Math.sin(t)) / z;
      const ly = (-dxs * Math.sin(t) + dys * Math.cos(t)) / z;
      const k = ev.altKey ? 2 : 1;
      let nw = Math.max(4, w0 + ex * lx * k);
      let nh = Math.max(4, h0 + ey * ly * k);
      let f = 1;
      if (uniform) {
        f = Math.max(0.05, Math.max(nw / w0, nh / h0));
        const sc = Math.round(scale0 * f * 100) / 100;
        mutate(`scale:${id}`, (tree) => {
          const node = findNode(tree, id);
          if (!node) return;
          const target = st.bp === 'desktop' ? node : ((node.responsive ??= {})[st.bp] ??= {});
          target.style = { ...(target.style ?? {}), scale: sc };
          if (sc === 1 && st.bp === 'desktop') delete target.style.scale;
        });
        setHud({ x: ev.clientX, y: ev.clientY, text: `${Math.round(sc * 100)}%` });
        return;
      }
      if (textScale) {
        f = ex ? Math.max(nw / w0, nh / h0) : nh / h0;
        f = Math.max(0.05, f);
        nw = w0 * f;
        nh = h0 * f;
      } else if (ratio && ex && ey) {
        nh = nw / ratio;
      } else if (ratio && ey && !ex) {
        nw = nh * ratio;
      } else if (ex && ey && ev.shiftKey) {
        f = Math.max(nw / w0, nh / h0);
        nw = w0 * f;
        nh = h0 * f;
      } else if (ratio && ex) {
        nh = nw / ratio;
      }
      nw = Math.round(nw);
      nh = Math.round(nh);
      const font = Math.max(4, Math.round(font0 * f * 10) / 10);
      mutate(`resize:${id}`, (tree) => {
        const node = findNode(tree, id);
        if (!node) return;
        const target = st.bp === 'desktop' ? node : ((node.responsive ??= {})[st.bp] ??= {});
        const size = { ...(target.size ?? {}) };
        if (textScale) {
          target.style = { ...(target.style ?? {}), fontSize: font };
          // Een vaste breedte/hoogte schaalt mee, anders blijft de tekst passend om zichzelf.
          if (size0.width === 'fixed' && size0.w) Object.assign(size, { width: 'fixed', w: Math.round(size0.w * f) });
          if (size0.height === 'fixed' && size0.h) Object.assign(size, { height: 'fixed', h: Math.round(size0.h * f) });
        } else {
          if (ex || (ratio && ey)) Object.assign(size, { width: 'fixed', w: nw });
          if (ey && !ratio) Object.assign(size, { height: 'fixed', h: nh });
        }
        target.size = size;
        if (abs) {
          // De overkant blijft staan (of het midden, met Alt).
          const np = { ...(pos), ...(target.position ?? {}) };
          if (np.anchorX === 'stretch' && (ex || textScale || ratio)) Object.assign(np, { anchorX: 'left', x: stretch0.x ?? 0 });
          if (np.anchorY === 'stretch' && (ey || textScale || ratio)) Object.assign(np, { anchorY: 'top', y: stretch0.y ?? 0 });
          const base = { x: np.anchorX === pos.anchorX ? pos.x : np.x, y: np.anchorY === pos.anchorY ? pos.y : np.y };
          const shift = (anchor: string | undefined, e1: number, d: number, b0: number | undefined) => {
            const b = b0 ?? 0;
            if (!e1) return b;
            if (ev.altKey) return anchor === 'center' ? b : b - d / 2;
            if (anchor === 'center') return b + (e1 * d) / 2;
            if (anchor === 'left') return e1 < 0 ? b - d : b;
            return e1 > 0 ? b - d : b;
          };
          const dirX = ex || (textScale ? 1 : 0);
          const dirY = ey;
          const axX = np.anchorX ?? 'left';
          const axY = np.anchorY === 'bottom' ? 'right' : np.anchorY === 'center' ? 'center' : 'left';
          np.x = Math.round(shift(axX, dirX, nw - w0, base.x));
          np.y = Math.round(shift(axY, dirY, nh - h0, base.y));
          target.position = np;
        }
      });
      setHud({ x: ev.clientX, y: ev.clientY, text: textScale ? `${font} px · ${nw} × ${nh}` : `${nw} × ${nh}` });
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      setHud(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!expanded || !site) return <div className="vs-canvas-empty">Kies links een pagina</div>;

  const width = BREAKPOINT_CANVAS[bp];
  const ctx: RenderCtx = { bp, assets: assetMap, editingText, styles: siteTheme(site).styles, lang };

  const idAt = (target: EventTarget | null): string | null => {
    const el = (target as HTMLElement | null)?.closest?.('[data-id]') as HTMLElement | null;
    return el ? el.dataset.id! : null;
  };

  return (
    <div
      className="vs-viewport"
      ref={viewport}
      data-space={spaceDown || undefined}
      data-panning={panning || undefined}
      data-file-over={fileOver || undefined}
      onMouseDown={(e) => {
        if (e.button === 1 || (e.button === 0 && spaceDown)) {
          e.preventDefault();
          const vp = viewport.current!;
          pan.current = { x: e.clientX, y: e.clientY, sl: vp.scrollLeft, st: vp.scrollTop };
          setPanning(true);
          return;
        }
        if (e.button !== 0) return;
        const raw = idAt(e.target);
        if (editingText && raw && sourceId(raw) === editingText) return;
        if (!raw) {
          if ((e.target as HTMLElement).classList.contains('vs-viewport') || (e.target as HTMLElement).classList.contains('vs-board-wrap')) select(null);
          return;
        }
        e.preventDefault();
        const id = sourceId(raw);
        select(id, e.shiftKey);
        if (e.shiftKey) return;
        const n = tree && findNode(tree, id);
        if (!n || n.locked || n.id === tree?.id) return;
        const pos = resolveProps(n, bp).position ?? {};
        if (pos.mode === 'absolute' || pos.mode === 'fixed') {
          const el = (e.target as HTMLElement).closest(`[data-id="${CSS.escape(raw)}"]`) as HTMLElement | null;
          const par = (el?.offsetParent as HTMLElement | null) ?? null;
          const xs: number[] = [];
          const ys: number[] = [];
          if (el && par) {
            for (const sib of Array.from(par.querySelectorAll<HTMLElement>(':scope > [data-id], :scope > * > [data-id]'))) {
              if (sib === el || sib.offsetParent !== par || !sib.offsetWidth) continue;
              xs.push(sib.offsetLeft, sib.offsetLeft + sib.offsetWidth / 2, sib.offsetLeft + sib.offsetWidth);
              ys.push(sib.offsetTop, sib.offsetTop + sib.offsetHeight / 2, sib.offsetTop + sib.offsetHeight);
            }
          }
          // Eigen hulplijnen (uit de linialen) doen ook mee, omgerekend naar de ouder.
          const boardEl = viewport.current?.querySelector('.vs-board') as HTMLElement | null;
          if (par && boardEl) {
            const br = boardEl.getBoundingClientRect();
            const pr0 = par.getBoundingClientRect();
            const offX = (pr0.left - br.left) / zoom;
            const offY = (pr0.top - br.top) / zoom;
            const g = getGuides();
            xs.push(...g.v.map((x) => x - offX));
            ys.push(...g.h.map((y) => y - offY));
          }
          drag.current = {
            id, x0: e.clientX, y0: e.clientY, x: pos.x ?? 0, y: pos.y ?? 0, ax: pos.anchorX ?? 'left', ay: pos.anchorY ?? 'top',
            w: el?.offsetWidth ?? 0, h: el?.offsetHeight ?? 0, pw: par?.clientWidth ?? 0, ph: par?.clientHeight ?? 0, xs, ys,
            pr: par && pos.mode === 'absolute' ? par.getBoundingClientRect() : null,
            dup: e.altKey,
          };
        } else if (bp === 'desktop') {
          // Zoals Figma Sites: structuur alleen wijzigen op het hoofd-breakpoint.
          reorder.current = { id, x0: e.clientX, y0: e.clientY, active: false, target: null, where: 'after', dup: e.altKey };
        }
      }}
      onMouseMove={(e) => {
        const ro = reorder.current;
        if (ro && e.buttons === 1 && tree) {
          if (!ro.active && Math.hypot(e.clientX - ro.x0, e.clientY - ro.y0) < 6) return;
          if (!ro.active && ro.dup) {
            duplicateSelection();
            ro.id = useStore.getState().selection ?? ro.id;
            ro.dup = false;
          }
          ro.active = true;
          // Zoek de laag onder de muis (behalve wat je sleept).
          // Na Alt+slepen bestaat de kopie nog niet in de 'tree' van deze render: lees de actuele.
          const cur = useStore.getState().tree ?? tree;
          const dragged = findNode(cur, ro.id);
          const under = document.elementsFromPoint(e.clientX, e.clientY).find((el) => {
            const id = (el as HTMLElement).dataset?.id;
            return id && (!dragged || !findNode(dragged, sourceId(id)));
          }) as HTMLElement | undefined;
          const tid = under ? sourceId(under.dataset.id!) : null;
          if (!tid || tid === cur.id) {
            ro.target = null;
            setDropLine(null);
            return;
          }
          const parent = findParent(cur, tid);
          const pmode = parent ? (resolveProps(parent.parent, bp).layout?.mode ?? 'vertical') : 'vertical';
          const r = under!.getBoundingClientRect();
          const horiz = pmode === 'horizontal';
          ro.where = horiz ? (e.clientX < r.left + r.width / 2 ? 'before' : 'after') : e.clientY < r.top + r.height / 2 ? 'before' : 'after';
          ro.target = tid;
          const v = viewport.current!.getBoundingClientRect();
          const sx = viewport.current!.scrollLeft;
          const sy = viewport.current!.scrollTop;
          setDropLine(
            horiz
              ? new DOMRect((ro.where === 'before' ? r.left : r.right) - v.left + sx - 1, r.top - v.top + sy, 2, r.height)
              : new DOMRect(r.left - v.left + sx, (ro.where === 'before' ? r.top : r.bottom) - v.top + sy - 1, r.width, 2),
          );
          return;
        }
        const p = pan.current;
        if (p) {
          const vp = viewport.current!;
          vp.scrollLeft = p.sl - (e.clientX - p.x);
          vp.scrollTop = p.st - (e.clientY - p.y);
          return;
        }
        const d = drag.current;
        if (d && e.buttons === 1 && d.dup) {
          if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 3) return;
          duplicateSelection();
          d.id = useStore.getState().selection ?? d.id;
          d.dup = false;
        }
        if (d && e.buttons === 1) {
          const dx = Math.round((e.clientX - d.x0) / zoom);
          const dy = Math.round((e.clientY - d.y0) / zoom);
          let nx = d.ax === 'right' ? d.x - dx : d.x + dx;
          let ny = d.ay === 'bottom' ? d.y - dy : d.y + dy;
          // Slim uitlijnen: rand/midden van de laag klikt vast aan ouder en broertjes. Ctrl/⌘ ingedrukt = vrij slepen.
          const gv: number[] = [];
          const gh: number[] = [];
          if (d.pw && !(e.ctrlKey || e.metaKey)) {
            const tol = 6 / zoom;
            const snap = (start: number, size: number, targets: number[], out: number[]) => {
              let best: { d: number; t: number; off: number } | null = null;
              for (const off of [0, size / 2, size]) for (const t of targets) {
                const dd = Math.abs(start + off - t);
                if (dd <= tol && (!best || dd < best.d)) best = { d: dd, t, off };
              }
              if (!best) return start;
              out.push(best.t);
              return Math.round(best.t - best.off);
            };
            const left = d.ax === 'right' ? d.pw - nx - d.w : nx;
            const top = d.ay === 'bottom' ? d.ph - ny - d.h : ny;
            const sl = snap(left, d.w, [0, d.pw / 2, d.pw, ...d.xs], gv);
            const stp = snap(top, d.h, [0, d.ph / 2, d.ph, ...d.ys], gh);
            nx = d.ax === 'right' ? Math.round(d.pw - sl - d.w) : sl;
            ny = d.ay === 'bottom' ? Math.round(d.ph - stp - d.h) : stp;
          }
          const vp = viewport.current!.getBoundingClientRect();
          setGuides(d.pr && (gv.length || gh.length)
            ? {
                v: gv.map((x) => d.pr!.left - vp.left + viewport.current!.scrollLeft + x * zoom),
                h: gh.map((y) => d.pr!.top - vp.top + viewport.current!.scrollTop + y * zoom),
                box: { left: d.pr.left - vp.left + viewport.current!.scrollLeft, top: d.pr.top - vp.top + viewport.current!.scrollTop, width: d.pr.width, height: d.pr.height },
              }
            : null);
          mutate(`drag:${d.id}`, (t) => {
            const n = findNode(t, d.id);
            if (!n) return;
            const target = bp === 'desktop' ? n : ((n.responsive ??= {})[bp] ??= {});
            target.position = { ...(target.position ?? {}), x: nx, y: ny };
          });
          return;
        }
        const raw = idAt(e.target);
        const h = raw ? sourceId(raw) : null;
        if (h !== useStore.getState().hover) useStore.setState({ hover: h });
        if (e.altKey !== measuring) setMeasuring(e.altKey);
      }}
      onMouseUp={() => {
        if (pan.current) { pan.current = null; setPanning(false); return; }
        setGuides(null);
        const ro = reorder.current;
        if (ro?.active && ro.target) moveNode(ro.id, ro.target, ro.where);
        reorder.current = null;
        drag.current = null;
        setDropLine(null);
      }}
      onMouseLeave={() => {
        pan.current = null;
        setPanning(false);
        setGuides(null);
        drag.current = null;
        reorder.current = null;
        setDropLine(null);
        useStore.setState({ hover: null });
      }}
      onDoubleClick={(e) => {
        const raw = idAt(e.target);
        if (!raw || !tree) return;
        const id = sourceId(raw);
        const n = findNode(tree, id);
        if (n?.type === 'text') useStore.setState({ editingText: n.id, selection: n.id });
        else if (n?.type === 'instance' && n.component) void openDoc({ kind: 'component', id: n.component });
      }}
      onDragOver={(e) => {
        if (!Array.from(e.dataTransfer.types).includes('Files')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!fileOver) setFileOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) setFileOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setFileOver(false);
        // Op een laag gelaten: daar(in/na) invoegen.
        const under = document.elementsFromPoint(e.clientX, e.clientY).find((el) => (el as HTMLElement).dataset?.id) as HTMLElement | undefined;
        void uploadAndInsert(Array.from(e.dataTransfer.files), under ? sourceId(under.dataset.id!) : undefined);
      }}
      onContextMenu={(e) => {
        // Tijdens tekst bewerken: het normale menu (met spellingssuggesties).
        if (editingText && (e.target as HTMLElement).closest('[contenteditable]')) return;
        const raw = idAt(e.target);
        e.preventDefault();
        const id = raw ? sourceId(raw) : null;
        if (id && !useStore.getState().extra.includes(id)) select(id);
        useStore.setState({ menu: { x: e.clientX, y: e.clientY, id } });
      }}
      onClickCapture={(e) => {
        // Links in het canvas niet volgen.
        if ((e.target as HTMLElement).closest('a')) e.preventDefault();
      }}
    >
      <style>{BASE_CSS.replace(/html,body\{[^}]*\}/, '').replace(/body\{[^}]*\}/, '')}{'\n'}{RUNTIME_CSS.replace(/html\{[^}]*\}/, '')}{'\n'}{themeCss(siteTheme(site), { bp, root: '.vs-board' })}</style>
      <div className="vs-board-wrap" style={{ width: width * zoom + 160 }}>
        <div className="vs-board-label">{docLabel()} · {width}px</div>
        <div className="vs-board" style={{ width, zoom }}>
          <RenderNode node={expanded} parentMode="vertical" ctx={ctx} />
        </div>
      </div>
      {rects.hov && <div className="vs-outline vs-hover" style={box(rects.hov)} />}
      {rects.extra.map((r, i) => <div key={i} className="vs-outline vs-selected" style={box(r)} />)}
      {dropLine && <div className="vs-dropline" style={box(dropLine)} />}
      {guides?.v.map((x, i) => <div key={'v' + i} className="vs-guide vs-guide-v" style={{ left: x, top: guides.box.top, height: guides.box.height }} />)}
      {guides?.h.map((y, i) => <div key={'h' + i} className="vs-guide vs-guide-h" style={{ top: y, left: guides.box.left, width: guides.box.width }} />)}
      {rects.sel && geo && (
        <div className="vs-selbox" style={{ left: geo.cx - geo.w / 2, top: geo.cy - geo.h / 2, width: geo.w, height: geo.h, transform: geo.rot ? `rotate(${geo.rot}deg)` : undefined }}>
          <span className="vs-outline-label">{selectionName()}{selectedIds().length > 1 ? ` + ${selectedIds().length - 1}` : ''}{geo.rot ? ` · ${Math.round(geo.rot)}°` : ''}</span>
          {selection !== tree?.id && !editingText && (
            <>
              {(['nw', 'ne', 'se', 'sw'] as Edge[]).map((c) => (
                <span key={`r-${c}`} className={`vs-rotzone vs-rotzone-${c}`} style={{ cursor: ROTATE_CURSOR }} title="Draaien (Shift = stappen van 15°)" onMouseDown={(e) => startTransform(e, 'rotate')} />
              ))}
              {EDGES.map((edge) => (
                <span
                  key={edge}
                  className={`vs-handle vs-handle-${edge}`}
                  style={{ cursor: edgeCursor(edge, geo.rot) }}
                  title="Slepen = formaat · Shift = verhouding vast · Alt = vanuit het midden"
                  onMouseDown={(e) => startTransform(e, 'resize', edge)}
                />
              ))}
              <span className="vs-rothandle" style={{ cursor: ROTATE_CURSOR }} title="Draaien (Shift = stappen van 15°)" onMouseDown={(e) => startTransform(e, 'rotate')} />
            </>
          )}
        </div>
      )}
      {measuring && rects.sel && rects.hov && !editingText && <Measure a={rects.sel} b={rects.hov} zoom={zoom} />}
      {fileOver && <div className="vs-file-over">Loslaten om toe te voegen</div>}
      {hud && <div className="vs-hud" style={{ left: hud.x + 16, top: hud.y + 18 }}>{hud.text}</div>}
    </div>
  );
}

/** Afstandslijnen tussen de selectie (a) en de laag onder de muis (b), in CSS-pixels. */
function Measure({ a, b, zoom }: { a: DOMRect; b: DOMRect; zoom: number }) {
  const lines: { x: number; y: number; w: number; h: number; label: number }[] = [];
  const px = (v: number) => Math.round(v / zoom);
  const contains = (o: DOMRect, i: DOMRect) => o.left <= i.left + 0.5 && o.top <= i.top + 0.5 && o.right >= i.right - 0.5 && o.bottom >= i.bottom - 0.5;
  if (contains(b, a) || contains(a, b)) {
    // Binnen elkaar: afstand van de binnenste naar alle randen van de buitenste.
    const [o, i] = contains(b, a) ? [b, a] : [a, b];
    const cy = i.top + i.height / 2;
    const cx = i.left + i.width / 2;
    if (i.left - o.left > 0.5) lines.push({ x: o.left, y: cy, w: i.left - o.left, h: 0, label: px(i.left - o.left) });
    if (o.right - i.right > 0.5) lines.push({ x: i.right, y: cy, w: o.right - i.right, h: 0, label: px(o.right - i.right) });
    if (i.top - o.top > 0.5) lines.push({ x: cx, y: o.top, w: 0, h: i.top - o.top, label: px(i.top - o.top) });
    if (o.bottom - i.bottom > 0.5) lines.push({ x: cx, y: i.bottom, w: 0, h: o.bottom - i.bottom, label: px(o.bottom - i.bottom) });
  } else {
    const oy = [Math.max(a.top, b.top), Math.min(a.bottom, b.bottom)];
    const ox = [Math.max(a.left, b.left), Math.min(a.right, b.right)];
    const y = oy[0] < oy[1] ? (oy[0] + oy[1]) / 2 : a.top + a.height / 2;
    const x = ox[0] < ox[1] ? (ox[0] + ox[1]) / 2 : a.left + a.width / 2;
    if (a.right <= b.left) lines.push({ x: a.right, y, w: b.left - a.right, h: 0, label: px(b.left - a.right) });
    else if (b.right <= a.left) lines.push({ x: b.right, y, w: a.left - b.right, h: 0, label: px(a.left - b.right) });
    if (a.bottom <= b.top) lines.push({ x, y: a.bottom, w: 0, h: b.top - a.bottom, label: px(b.top - a.bottom) });
    else if (b.bottom <= a.top) lines.push({ x, y: b.bottom, w: 0, h: a.top - b.bottom, label: px(a.top - b.bottom) });
  }
  return (
    <>
      <div className="vs-outline vs-measure-box" style={box(b)} />
      {lines.map((l, i) => (
        <div key={i} className={`vs-measure ${l.w ? 'h' : 'v'}`} style={{ left: l.x, top: l.y, width: l.w || 1, height: l.h || 1 }}>
          <span>{l.label}</span>
        </div>
      ))}
    </>
  );
}

function docLabel() {
  const { doc, pages, projects, components } = useStore.getState();
  if (!doc) return '';
  if (doc.kind === 'page') return pages.find((p) => p.id === doc.id)?.title;
  if (doc.kind === 'project') return projects.find((p) => p.id === doc.id)?.title;
  return components.find((c) => c.id === doc.id)?.name;
}

function selectionName() {
  const { tree, selection, bp } = useStore.getState();
  const n = tree && selection ? findNode(tree, selection) : null;
  if (!n) return '';
  const r = resolveProps(n, bp);
  const s = r.size ?? {};
  const w = s.width === 'fixed' ? `${s.w}` : s.width === 'hug' ? 'Hug' : 'Fill';
  return `${n.name} · ${w}`;
}

function same(a: DOMRect | null, b: DOMRect | null) {
  if (!a || !b) return a === b;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

const box = (r: DOMRect): CSSProperties => ({ left: r.x, top: r.y, width: r.width, height: r.height });
