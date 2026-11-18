import { useEffect, useRef, useState } from 'react';
import { useStore } from './store';

/**
 * Linialen langs het canvas, met hulplijnen die je eruit sleept (zoals in Figma en Photoshop).
 * Hulplijnen worden per pagina en per schermformaat bewaard in deze browser.
 * Sleep een hulplijn terug op de liniaal om hem weg te halen.
 */

export const RULER = 20;
type Guides = { v: number[]; h: number[] };

const key = () => {
  const { doc, bp } = useStore.getState();
  return doc ? `vs-guides:${doc.kind}:${doc.id}:${bp}` : '';
};
let current: Guides = { v: [], h: [] };
const listeners = new Set<() => void>();
function load() {
  try {
    current = JSON.parse(localStorage.getItem(key()) || '') as Guides;
    if (!current?.v || !current?.h) throw 0;
  } catch {
    current = { v: [], h: [] };
  }
  listeners.forEach((f) => f());
}
function save(g: Guides) {
  current = g;
  try {
    const k = key();
    if (k) localStorage.setItem(k, JSON.stringify(g));
  } catch {
    /* geen opslag */
  }
  listeners.forEach((f) => f());
}
/** Hulplijnen in board-pixels, voor het slim uitlijnen tijdens slepen. */
export const getGuides = () => current;

export function rulersOn() {
  try {
    return localStorage.getItem('vs-rulers') !== '0';
  } catch {
    return true;
  }
}
export function toggleRulers() {
  try {
    localStorage.setItem('vs-rulers', rulersOn() ? '0' : '1');
  } catch {
    /* geen opslag */
  }
  window.dispatchEvent(new Event('vs-rulers'));
}

const STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

export function Rulers() {
  const top = useRef<HTMLCanvasElement>(null);
  const left = useRef<HTMLCanvasElement>(null);
  const zoom = useStore((s) => s.zoom);
  const doc = useStore((s) => s.doc);
  const bp = useStore((s) => s.bp);
  const [, force] = useState(0);
  const [on, setOn] = useState(rulersOn());
  const [drag, setDrag] = useState<{ axis: 'v' | 'h'; index: number; pos: number } | null>(null);
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const f = () => setOn(rulersOn());
    window.addEventListener('vs-rulers', f);
    return () => window.removeEventListener('vs-rulers', f);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('vs-has-rulers', on);
  }, [on]);
  useEffect(() => {
    load();
  }, [doc?.id, doc?.kind, bp]);
  useEffect(() => {
    const f = () => force((x) => x + 1);
    listeners.add(f);
    // Hulplijnen meeschuiven met het canvas.
    let raf = 0;
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; f(); });
    };
    const vp = document.querySelector('.vs-viewport');
    vp?.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      listeners.delete(f);
      vp?.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [doc?.id, on]);

  /** Waar staat de board op het scherm? */
  const frame = () => {
    const vp = document.querySelector('.vs-viewport') as HTMLElement | null;
    const board = vp?.querySelector(':scope .vs-board') as HTMLElement | null;
    const center = vp?.parentElement as HTMLElement | null;
    if (!vp || !board || !center) return null;
    const b = board.getBoundingClientRect();
    const c = center.getBoundingClientRect();
    const v = vp.getBoundingClientRect();
    return { ox: b.left - c.left, oy: b.top - c.top, c, v };
  };

  // Linialen tekenen bij scrollen, zoomen en van formaat veranderen.
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const f = frame();
      for (const [cv, horiz] of [
        [top.current, true],
        [left.current, false],
      ] as const) {
        if (!cv || !f) continue;
        const dpr = window.devicePixelRatio || 1;
        const w = cv.clientWidth;
        const h = cv.clientHeight;
        if (cv.width !== w * dpr || cv.height !== h * dpr) {
          cv.width = w * dpr;
          cv.height = h * dpr;
        }
        const g = cv.getContext('2d')!;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, w, h);
        const css = getComputedStyle(cv);
        g.fillStyle = css.getPropertyValue('--ruler-bg').trim() || '#14161b';
        g.fillRect(0, 0, w, h);
        const step = STEPS.find((s) => s * zoom >= 56) ?? 2000;
        const origin = horiz ? f.ox - RULER : f.oy - RULER;
        const len = horiz ? w : h;
        const first = Math.floor(-origin / zoom / step) * step;
        g.strokeStyle = 'rgba(255,255,255,.18)';
        g.fillStyle = 'rgba(255,255,255,.5)';
        g.font = '10px ui-sans-serif, system-ui, sans-serif';
        g.beginPath();
        for (let val = first; origin + val * zoom < len; val += step / 5) {
          const p = Math.round(origin + val * zoom) + 0.5;
          const major = Math.round(val / step) * step === Math.round(val);
          const t = major ? RULER : 5;
          if (horiz) {
            g.moveTo(p, RULER);
            g.lineTo(p, RULER - t);
          } else {
            g.moveTo(RULER, p);
            g.lineTo(RULER - t, p);
          }
          if (major) {
            if (horiz) g.fillText(String(Math.round(val)), p + 3, 10);
            else {
              g.save();
              g.translate(10, p + 3);
              g.rotate(-Math.PI / 2);
              g.textAlign = 'right';
              g.fillText(String(Math.round(val)), 0, 0);
              g.restore();
            }
          }
        }
        g.stroke();
        // Muispositie
        if (mouse) {
          g.fillStyle = 'rgba(255,92,138,.9)';
          const p = horiz ? mouse.x - RULER : mouse.y - RULER;
          if (horiz) g.fillRect(p, 0, 1, RULER);
          else g.fillRect(0, p, RULER, 1);
        }
        g.fillStyle = 'rgba(255,255,255,.08)';
        if (horiz) g.fillRect(0, RULER - 1, w, 1);
        else g.fillRect(RULER - 1, 0, 1, h);
      }
    };
    const req = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    req();
    const vp = document.querySelector('.vs-viewport');
    vp?.addEventListener('scroll', req, { passive: true });
    window.addEventListener('resize', req);
    const ro = new ResizeObserver(req);
    const board = vp?.querySelector('.vs-board');
    if (board) ro.observe(board);
    const t = setInterval(req, 500);
    return () => {
      vp?.removeEventListener('scroll', req);
      window.removeEventListener('resize', req);
      ro.disconnect();
      clearInterval(t);
      if (raf) cancelAnimationFrame(raf);
    };
  });

  if (!on || !doc) return null;
  const f = frame();

  /** Hulplijn uit de liniaal trekken of een bestaande verslepen. */
  const startDrag = (axis: 'v' | 'h', index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const fr = frame();
    if (!fr) return;
    const toPos = (ev: PointerEvent | React.PointerEvent) => Math.round(axis === 'v' ? (ev.clientX - fr.c.left - fr.ox) / zoom : (ev.clientY - fr.c.top - fr.oy) / zoom);
    setDrag({ axis, index, pos: toPos(e) });
    const move = (ev: PointerEvent) => setDrag({ axis, index, pos: toPos(ev) });
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDrag(null);
      const onRuler = axis === 'v' ? ev.clientY - fr.c.top < RULER + 2 : ev.clientX - fr.c.left < RULER + 2;
      const outside = ev.clientX < fr.v.left || ev.clientY < fr.v.top - RULER || ev.clientX > fr.v.right || ev.clientY > fr.v.bottom;
      const list = [...current[axis]];
      if (index >= 0) list.splice(index, 1);
      if (!onRuler && !outside) list.push(toPos(ev));
      save({ ...current, [axis]: list });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const lines: { axis: 'v' | 'h'; index: number; pos: number; ghost?: boolean }[] = [
    ...current.v.map((pos, index) => ({ axis: 'v' as const, index, pos })),
    ...current.h.map((pos, index) => ({ axis: 'h' as const, index, pos })),
  ].filter((l) => !(drag && drag.axis === l.axis && drag.index === l.index));
  if (drag) lines.push({ ...drag, ghost: true });

  return (
    <>
      <canvas
        ref={top}
        className="vs-ruler vs-ruler-top"
        title="Sleep omlaag voor een hulplijn"
        onPointerDown={startDrag('h', -1)}
        onPointerMove={(e) => setMouse({ x: e.clientX - (f?.c.left ?? 0), y: -1 })}
        onPointerLeave={() => setMouse(null)}
      />
      <canvas
        ref={left}
        className="vs-ruler vs-ruler-left"
        title="Sleep naar rechts voor een hulplijn"
        onPointerDown={startDrag('v', -1)}
        onPointerMove={(e) => setMouse({ x: -1, y: e.clientY - (f?.c.top ?? 0) })}
        onPointerLeave={() => setMouse(null)}
      />
      <div className="vs-ruler-corner" title="Linialen verbergen (Shift+R)" onClick={toggleRulers} />
      {f &&
        lines.map((l) => {
          const px = l.axis === 'v' ? f.ox + l.pos * zoom : f.oy + l.pos * zoom;
          if (px < RULER) return null;
          return (
            <div
              key={`${l.axis}${l.index}${l.ghost ? 'g' : ''}`}
              className={`vs-userguide vs-userguide-${l.axis} ${l.ghost ? 'ghost' : ''}`}
              style={l.axis === 'v' ? { left: px } : { top: px }}
              onPointerDown={l.ghost ? undefined : startDrag(l.axis, l.index)}
              title="Sleep om te verplaatsen, sleep terug op de liniaal om te verwijderen"
            >
              {l.ghost && <span>{l.pos}</span>}
            </div>
          );
        })}
    </>
  );
}
