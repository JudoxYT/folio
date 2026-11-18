// Geschiedenispaneel: je laatste stappen, met één klik terug (of weer vooruit).
import { useEffect, useRef, useState } from 'react';
import { jumpHistory, stepName, useStore } from './store';

const time = (t: number) => new Date(t).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function StepsButton() {
  const { past, future } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  // Nieuwste bovenaan. Toekomst (ongedaan gemaakt) staat er grijs boven.
  const rows = [
    ...future.map((e, i) => ({ e, n: past.length + future.length - i, undone: true })),
    ...past.map((e, i) => ({ e, n: i + 1, undone: false })).reverse(),
  ];
  return (
    <div className="vs-steps" ref={box}>
      <button className={`vs-icon-btn ${open ? 'on' : ''}`} title="Stappen (geschiedenis van deze pagina)" onClick={() => setOpen(!open)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4l3 2" /></svg>
      </button>
      {open && (
        <div className="vs-steps-pop">
          <b>Stappen</b>
          <p className="vs-help">Klik op een stap om terug te gaan. Ongedaan gemaakte stappen staan grijs; klik erop om ze terug te halen.</p>
          <ol>
            {rows.map(({ e, n, undone }) => (
              <li key={`${n}-${e.at}`} className={undone ? 'undone' : n === past.length ? 'now' : ''} onClick={() => jumpHistory(n)}>
                <span>{stepName(e.label)}</span>
                <small>{time(e.at)}</small>
              </li>
            ))}
            <li className={past.length === 0 ? 'now' : ''} onClick={() => jumpHistory(0)}>
              <span>Begin (geopend)</span>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
