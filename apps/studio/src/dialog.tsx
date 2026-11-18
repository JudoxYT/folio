// Eigen vervanging voor prompt(): die werkt niet in de desktop-app (Electron) en ziet er in browsers ook niet uit.
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Modal } from './ui';

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
