// Eigen vervanging voor prompt(): die werkt niet in de desktop-app (Electron) en ziet er in browsers ook niet uit.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from './ui';
import { api } from './api';
import { toast } from './store';

function Ask({ title, initial, okLabel, onDone }: { title: string; initial: string; okLabel: string; onDone: (v: string | null) => void }) {
  const [value, setValue] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const ok = () => onDone(value.trim() ? value.trim() : null);
  return (
    <Modal title={title} onClose={() => onDone(null)}>
      <input
        ref={input}
        className="vs-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ok();
          if (e.key === 'Escape') onDone(null);
          e.stopPropagation();
        }}
        style={{ width: '100%' }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
        <button className="vs-btn" onClick={() => onDone(null)}>Annuleren</button>
        <button className="vs-btn primary" onClick={ok} disabled={!value.trim()}>{okLabel}</button>
      </div>
    </Modal>
  );
}

/** Vraag om een korte tekst (bv. een naam). Geeft null bij annuleren. */
export function askText(title: string, initial = '', okLabel = 'OK'): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: string | null) => {
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(<Ask title={title} initial={initial} okLabel={okLabel} onDone={done} />);
  });
}

/** Lijst met kapotte links tonen vóór het publiceren. true = toch publiceren. */
export function confirmLinks(issues: { where: string; layer: string; href: string; reason: string }[]): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: boolean) => {
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(
      <Modal title={`${issues.length} ${issues.length === 1 ? 'link werkt' : 'links werken'} niet`} onClose={() => done(false)} wide>
        <p className="vs-help" style={{ marginTop: 0 }}>Deze links verwijzen naar een pagina of anker dat niet bestaat. Bezoekers komen dan op een foutpagina terecht.</p>
        <ul className="vs-linkissues">
          {issues.slice(0, 50).map((i, k) => (
            <li key={k}>
              <code>{i.href}</code>
              <span>{i.reason}</span>
              <small>{i.where} · laag “{i.layer}”</small>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="vs-btn" onClick={() => done(true)}>Toch publiceren</button>
          <button className="vs-btn primary" autoFocus onClick={() => done(false)}>Eerst aanpassen</button>
        </div>
      </Modal>,
    );
  });
}

/** Links controleren vanuit het opdrachtenpalet. */
export async function runLinkCheck() {
  try {
    const r = await api.get<{ issues: { where: string; layer: string; href: string; reason: string }[] }>('/api/linkcheck');
    if (!r.issues.length) toast('Alle interne links werken');
    else await confirmLinks(r.issues);
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}
