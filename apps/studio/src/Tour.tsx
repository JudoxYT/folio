// Korte rondleiding de eerste keer dat iemand de Studio opent.
import { useEffect, useLayoutEffect, useState } from 'react';
import { edition } from './edition';

const KEY = 'vs-tour-done';

const STEPS: { sel: string; title: string; text: string; side: 'right' | 'left' | 'bottom' | 'center' }[] = [
  { sel: '', side: 'center', title: 'Welkom!', text: 'In vier stappen zie je waar alles zit. Je kunt de rondleiding altijd overslaan.' },
  { sel: '.vs-left', side: 'right', title: 'Invoegen, pagina’s en lagen', text: 'Hier voeg je secties en blokken toe, wissel je van pagina en zie je alle lagen. Dubbelklik op een laag (of druk F2) om hem een naam te geven.' },
  { sel: '.vs-center', side: 'center', title: 'Het canvas', text: 'Klik iets aan om het te kiezen, dubbelklik op tekst om te typen. Sleep foto’s of screenshots er gewoon op. Met Ctrl + scrollwiel zoom je in.' },
  { sel: '.vs-right', side: 'left', title: 'Ontwerp en effecten', text: 'Hier pas je aan wat je geselecteerd hebt: kleuren, tekst, formaat, afstand en animaties.' },
  { sel: '.vs-publish', side: 'bottom', title: 'Online zetten', text: 'Klaar? Met Publiceren maak je de site. Via het pijltje ernaast zet je hem online. Druk op ? voor alle sneltoetsen.' },
];

export function Tour() {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (edition.edition !== 'folio') return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setStep(0), 900);
    return () => clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    if (step === null) return;
    const s = STEPS[step];
    const measure = () => setRect(s.sel ? document.querySelector(s.sel)?.getBoundingClientRect() ?? null : null);
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [step]);

  if (step === null) return null;
  const s = STEPS[step];
  const done = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* geen opslag */ }
    setStep(null);
  };
  const last = step === STEPS.length - 1;

  // Kaartje naast het gemarkeerde deel van het scherm.
  const W = 320;
  let pos: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect && s.side === 'right') pos = { left: rect.right + 16, top: Math.max(16, rect.top + 80) };
  if (rect && s.side === 'left') pos = { left: rect.left - W - 16, top: Math.max(16, rect.top + 80) };
  if (rect && s.side === 'bottom') pos = { left: Math.min(innerWidth - W - 16, Math.max(16, rect.right - W)), top: rect.bottom + 14 };

  return (
    <div className="vs-tour" role="dialog" aria-label="Rondleiding">
      {rect ? <div className="vs-tour-hole" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} /> : <div className="vs-tour-dim" />}
      <div className="vs-tour-card" style={{ ...pos, width: W }}>
        <small>{step + 1} / {STEPS.length}</small>
        <b>{s.title}</b>
        <p>{s.text}</p>
        <div className="vs-tour-actions">
          <button className="vs-btn ghost" onClick={done}>Overslaan</button>
          <span className="grow" />
          {step > 0 && <button className="vs-btn" onClick={() => setStep(step - 1)}>Terug</button>}
          <button className="vs-btn primary" onClick={() => (last ? done() : setStep(step + 1))}>{last ? 'Aan de slag' : 'Volgende'}</button>
        </div>
      </div>
    </div>
  );
}
