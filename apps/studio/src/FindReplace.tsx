// Zoeken en vervangen (Ctrl+F): tekst op deze pagina of op de hele site in één keer aanpassen.
import { useMemo, useState } from 'react';
import type { Component, FrameNode, Page, VNode } from '@vystara/core';
import { api } from './api';
import { mutate, patchState, toast, useStore } from './store';
import { Modal } from './ui';

type Hit = { doc: string; label: string; count: number };

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Alle tekstvelden in een boom langs (tekst-inhoud en knoplabels). */
function eachText(tree: VNode, fn: (n: Record<string, unknown>, key: 'content' | 'label') => void) {
  const walk = (n: VNode) => {
    const r = n as unknown as Record<string, unknown>;
    if (n.type === 'text' && typeof r.content === 'string') fn(r, 'content');
    if (n.type === 'button' && typeof r.label === 'string') fn(r, 'label');
    for (const c of n.children ?? []) walk(c);
  };
  walk(tree);
}

function countIn(tree: VNode, re: RegExp) {
  let n = 0;
  eachText(tree, (node, key) => { n += ((node[key] as string).match(re) ?? []).length; });
  return n;
}

function replaceIn(tree: VNode, re: RegExp, by: string) {
  let n = 0;
  eachText(tree, (node, key) => {
    const v = node[key] as string;
    const m = v.match(re);
    if (m) {
      n += m.length;
      node[key] = v.replace(re, () => by);
    }
  });
  return n;
}

export function FindReplaceModal() {
  const { tree, doc, pages, components } = useStore();
  const [find, setFind] = useState('');
  const [by, setBy] = useState('');
  const [caseSens, setCaseSens] = useState(false);
  const [whole, setWhole] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => patchState({ modal: null });

  const re = useMemo(() => (find ? new RegExp(escapeRe(find), caseSens ? 'g' : 'gi') : null), [find, caseSens]);
  const hereCount = re && tree ? countIn(tree, re) : 0;

  /** Alle andere documenten ophalen (pagina's en componenten), zonder het document dat open staat. */
  const others = async () => {
    const out: { kind: 'page' | 'component'; id: string; label: string; tree: FrameNode; raw: Page | Component }[] = [];
    for (const p of pages) {
      if (doc?.kind === 'page' && doc.id === p.id) continue;
      const full = await api.get<Page>(`/api/pages/${p.id}`);
      out.push({ kind: 'page', id: p.id, label: `Pagina: ${p.title}`, tree: full.tree, raw: full });
    }
    for (const c of components) {
      if (doc?.kind === 'component' && doc.id === c.id) continue;
      out.push({ kind: 'component', id: c.id, label: `Component: ${c.name}`, tree: structuredClone(c.tree), raw: c });
    }
    return out;
  };

  const search = async () => {
    if (!re) return;
    setBusy(true);
    try {
      const list: Hit[] = [{ doc: 'here', label: 'Dit document', count: hereCount }];
      if (whole) for (const o of await others()) list.push({ doc: o.id, label: o.label, count: countIn(o.tree, re) });
      setHits(list.filter((h) => h.count));
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const replaceAll = async () => {
    if (!re) return;
    setBusy(true);
    let total = 0;
    try {
      // Het open document via mutate: dan kun je het met Ctrl+Z terugdraaien.
      if (hereCount) {
        mutate('replace', (t) => { total += replaceIn(t, re, by); });
      }
      if (whole) {
        const updatedComps: Component[] = [];
        for (const o of await others()) {
          const n = replaceIn(o.tree, re, by);
          if (!n) continue;
          total += n;
          if (o.kind === 'page') await api.put(`/api/pages/${o.id}`, { tree: o.tree });
          else updatedComps.push(await api.put<Component>(`/api/components/${o.id}`, { ...(o.raw as Component), tree: o.tree }));
        }
        if (updatedComps.length) {
          const map = new Map(updatedComps.map((c) => [c.id, c]));
          patchState({ components: useStore.getState().components.map((c) => map.get(c.id) ?? c) });
        }
      }
      toast(total ? `${total}× vervangen` : 'Niets gevonden om te vervangen');
      setHits(null);
      if (total) close();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Zoeken en vervangen" onClose={close}>
      <div className="vs-find">
        <label className="vs-label">Zoeken naar</label>
        <input className="vs-input" autoFocus value={find} onChange={(e) => { setFind(e.target.value); setHits(null); }} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') void search(); if (e.key === 'Escape') close(); }} placeholder="Bijvoorbeeld: woensdag" />
        <label className="vs-label">Vervangen door</label>
        <input className="vs-input" value={by} onChange={(e) => setBy(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') close(); }} placeholder="Leeg laten = weghalen" />
        <label className="vs-check"><input type="checkbox" checked={caseSens} onChange={(e) => { setCaseSens(e.target.checked); setHits(null); }} /> Hoofdlettergevoelig</label>
        <label className="vs-check"><input type="checkbox" checked={whole} onChange={(e) => { setWhole(e.target.checked); setHits(null); }} /> Op de hele site (alle pagina’s en componenten)</label>
        <p className="vs-help">
          {!find ? 'Zoekt in alle teksten en knoppen.' : `${hereCount}× gevonden in dit document${whole ? '; klik op Zoeken voor de rest van de site' : ''}.`}
        </p>
        {hits && (
          <ul className="vs-find-hits">
            {hits.length ? hits.map((h) => <li key={h.doc}><span>{h.label}</span><b>{h.count}×</b></li>) : <li>Nergens gevonden.</li>}
          </ul>
        )}
        <div className="vs-btnrow" style={{ justifyContent: 'flex-end' }}>
          {whole && <button className="vs-btn" disabled={!find || busy} onClick={() => void search()}>Zoeken</button>}
          <button className="vs-btn primary" disabled={!find || busy} onClick={() => void replaceAll()}>{busy ? 'Bezig…' : 'Alles vervangen'}</button>
        </div>
      </div>
    </Modal>
  );
}
