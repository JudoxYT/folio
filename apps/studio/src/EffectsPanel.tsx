import { EFFECT_PRESETS, type Easing, type Effects, type Motion, type VNode } from '@vystara/core';
import { setField, useStore, flushSave } from './store';
import { ColorField, Num, Row, Section, Select, Toggle } from './ui';

const EASINGS: { value: Easing; label: string }[] = [
  { value: 'smooth', label: 'Soepel' },
  { value: 'ease-out', label: 'Uitlopend' },
  { value: 'ease-in-out', label: 'In en uit' },
  { value: 'spring', label: 'Veerkrachtig' },
  { value: 'ease', label: 'Standaard' },
  { value: 'linear', label: 'Lineair' },
];

type Kind = keyof Effects;

/** Kant-en-klare scroll-animaties (zoals in Framer). */
const SCROLL_PRESETS: { label: string; make: () => NonNullable<Effects['scroll']> }[] = [
  { label: 'Inzoomen tijdens scrollen', make: () => ({ from: { scale: 0.85, opacity: 0.3 }, to: { scale: 1, opacity: 1 }, start: 0, end: 0.5 }) },
  { label: 'Uitzoomen bij weggaan', make: () => ({ from: { scale: 1 }, to: { scale: 0.88, opacity: 0.4 }, start: 0.5, end: 1 }) },
  { label: 'Draaien tijdens scrollen', make: () => ({ from: { rotate: -12 }, to: { rotate: 12 }, start: 0, end: 1 }) },
  { label: 'Inschuiven van links', make: () => ({ from: { x: -160, opacity: 0 }, to: { x: 0, opacity: 1 }, start: 0, end: 0.45 }) },
  { label: 'Inschuiven van rechts', make: () => ({ from: { x: 160, opacity: 0 }, to: { x: 0, opacity: 1 }, start: 0, end: 0.45 }) },
  { label: 'Scherp worden', make: () => ({ from: { blur: 14, opacity: 0.2 }, to: { blur: 0, opacity: 1 }, start: 0, end: 0.4 }) },
  { label: 'Horizontaal meeschuiven (tekstband)', make: () => ({ from: { x: 240 }, to: { x: -240 }, start: 0, end: 1 }) },
  { label: 'Omhoog zweven', make: () => ({ from: { y: 120 }, to: { y: -120 }, start: 0, end: 1 }) },
];

const ADD: { kind: Kind; label: string; make: (n: VNode) => Effects[Kind] }[] = [
  { kind: 'reveal', label: 'Verschijnen (reveal)', make: () => ({ from: { opacity: 0, y: 40 }, duration: 800 }) },
  { kind: 'scroll', label: 'Scroll-animatie (beweegt mee met scrollen)', make: () => ({ from: { scale: 0.9, opacity: 0.4 }, to: { scale: 1, opacity: 1 }, start: 0, end: 0.6 }) },
  { kind: 'parallax', label: 'Scroll parallax', make: () => ({ speed: 0.25 }) },
  { kind: 'mouse', label: 'Muis parallax', make: () => ({ strength: 20 }) },
  { kind: 'hover', label: 'Hover effect', make: () => ({ y: -4, scale: 1.02 }) },
  { kind: 'press', label: 'Press effect', make: () => ({ scale: 0.97 }) },
  { kind: 'marquee', label: 'Lopende band (marquee)', make: () => ({ direction: 'left', speed: 60 }) },
  { kind: 'text', label: 'Tekst-animatie', make: () => ({ kind: 'typewriter', duration: 1400 }) },
  { kind: 'spin', label: 'Ronddraaien', make: () => ({ duration: 12 }) },
  { kind: 'loop', label: 'Doorlopende animatie (zweven, pulseren…)', make: () => ({ kind: 'float' }) },
  { kind: 'magnetic', label: 'Magnetisch (volgt de muis)', make: () => ({ strength: 0.3 }) },
  { kind: 'sweep', label: 'Kleur bij hover (tekst)', make: () => ({ color: 'roze' }) },
  { kind: 'groupHover', label: 'Reageert op hover van de kaart', make: () => ({ scale: 1.06 }) },
  { kind: 'tilt', label: '3D-kantelen naar de muis', make: () => ({ max: 7 }) },
  { kind: 'jelly', label: 'Jelly-letters bij hover', make: () => true },
  { kind: 'lightbox', label: 'Lightbox (groot openen)', make: () => true },
];

export function EffectsPanel({ n }: { n: VNode }) {
  const fx: Effects = n.effects ?? {};
  const doc = useStore((s) => s.doc);
  const save = (next: Effects) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== false));
    setField(n.id, 'effects', Object.keys(clean).length ? clean : undefined);
  };
  const put = <K extends Kind>(k: K, v: Effects[K] | undefined) => save({ ...fx, [k]: v });
  const available = ADD.filter((a) => fx[a.kind] === undefined).filter((a) => {
    if (a.kind === 'text') return n.type === 'text';
    if (a.kind === 'lightbox') return n.type === 'image';
    if (a.kind === 'sweep' || a.kind === 'jelly') return n.type === 'text';
    if (a.kind === 'marquee') return n.type === 'frame' || n.type === 'text';
    return true;
  });
  const active = ADD.filter((a) => fx[a.kind] !== undefined);

  return (
    <Section
      title="Interacties en effecten"
      right={
        active.length > 0 && doc?.kind !== 'component' ? (
          <button
            className="vs-icon-btn"
            title="Bekijk de effecten in het voorbeeld"
            onClick={async () => {
              await flushSave();
              window.open(doc?.kind === 'project' ? `/api/preview/project/${doc.id}` : `/api/preview/page/${doc?.id}`, '_blank');
            }}
          >
            ▶ Bekijk
          </button>
        ) : undefined
      }
    >
      <Row label="Snel">
        <select
          className="vs-input"
          value=""
          onChange={(e) => {
            const p = EFFECT_PRESETS.find((x) => x.id === e.target.value);
            if (p) save({ ...fx, ...structuredClone(p.effects) });
          }}
        >
          <option value="">Kies een voorinstelling…</option>
          {EFFECT_PRESETS.filter((p) => !(p.effects.marquee && n.type !== 'frame' && n.type !== 'text') && !(p.effects.text && n.type !== 'text')).map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </Row>
      {available.length > 0 && (
        <Row label="Toevoegen">
          <select className="vs-input" value="" onChange={(e) => { const a = ADD.find((x) => x.kind === e.target.value); if (a) put(a.kind, a.make(n) as never); }}>
            <option value="">Effect…</option>
            {available.map((a) => <option key={a.kind} value={a.kind}>{a.label}</option>)}
          </select>
        </Row>
      )}

      {fx.reveal && (
        <Block title="Verschijnen" onRemove={() => put('reveal', undefined)}>
          <Row label="Wanneer">
            <Select value={fx.reveal.trigger ?? 'inView'} onChange={(v) => put('reveal', { ...fx.reveal!, trigger: v })} options={[{ value: 'inView', label: 'Als het in beeld komt' }, { value: 'load', label: 'Bij laden van de pagina' }]} />
          </Row>
          <MotionRows label="Begint als" m={fx.reveal.from} onChange={(from) => put('reveal', { ...fx.reveal!, from })} />
          <Row label="Duur / wacht">
            <Num value={fx.reveal.duration ?? 800} min={0} step={50} suffix="ms" onChange={(v) => put('reveal', { ...fx.reveal!, duration: v })} />
            <Num value={fx.reveal.delay ?? 0} min={0} step={50} suffix="ms" onChange={(v) => put('reveal', { ...fx.reveal!, delay: v || undefined })} title="Vertraging" />
          </Row>
          <Row label="Curve">
            <Select value={fx.reveal.easing ?? 'smooth'} onChange={(v) => put('reveal', { ...fx.reveal!, easing: v })} options={EASINGS} />
          </Row>
          {n.type !== 'text' && n.type !== 'image' && n.type !== 'video' && (
            <Row label="Na elkaar">
              <Num value={fx.reveal.stagger} min={0} step={20} placeholder="uit" suffix="ms" onChange={(v) => put('reveal', { ...fx.reveal!, stagger: v || undefined })} title="Kinderen één voor één, met deze tussenpauze" />
            </Row>
          )}
          <Row label=""><Toggle value={!!fx.reveal.repeat} onChange={(v) => put('reveal', { ...fx.reveal!, repeat: v || undefined })} label="Elke keer opnieuw" /></Row>
        </Block>
      )}

      {fx.scroll && (
        <Block title="Scroll transform" onRemove={() => put('scroll', undefined)}>
          <MotionRows label="Van" m={fx.scroll.from} onChange={(from) => put('scroll', { ...fx.scroll!, from })} />
          <MotionRows label="Naar" m={fx.scroll.to} onChange={(to) => put('scroll', { ...fx.scroll!, to })} />
          <Row label="Traject">
            <Num value={Math.round((fx.scroll.start ?? 0) * 100)} min={0} suffix="%" onChange={(v) => put('scroll', { ...fx.scroll!, start: Math.min(100, v ?? 0) / 100 })} title="Start (0% = komt onderin binnen)" />
            <Num value={Math.round((fx.scroll.end ?? 1) * 100)} min={0} suffix="%" onChange={(v) => put('scroll', { ...fx.scroll!, end: Math.min(100, v ?? 100) / 100 })} title="Einde (100% = verdwijnt bovenin)" />
          </Row>
          <Row label="Snel kiezen">
            <Select
              value=""
              onChange={(v) => { const p = SCROLL_PRESETS.find((x) => x.label === v); if (p) put('scroll', { ...p.make() }); }}
              options={[{ value: '', label: 'Voorinstelling…' }, ...SCROLL_PRESETS.map((p) => ({ value: p.label, label: p.label }))]}
            />
          </Row>
          <p className="vs-help">0% is het moment dat de laag onderin binnenkomt, 100% als hij bovenin verdwijnt.</p>
        </Block>
      )}

      {fx.parallax && (
        <Block title="Scroll parallax" onRemove={() => put('parallax', undefined)}>
          <Row label="Snelheid">
            <Num value={fx.parallax.speed} step={0.05} onChange={(v) => put('parallax', { speed: Math.max(-1, Math.min(1, v ?? 0)) })} />
          </Row>
          <p className="vs-help">Positief (0.1 tot 0.5) beweegt langzamer dan de pagina en voelt verder weg. Negatief beweegt sneller, als voorgrond. Zet "Overloop: afknippen" op de ouder om randen te verbergen.</p>
        </Block>
      )}

      {fx.mouse && (
        <Block title="Muis parallax" onRemove={() => put('mouse', undefined)}>
          <Row label="Afstand">
            <Num value={fx.mouse.strength} step={2} suffix="px" onChange={(v) => put('mouse', { strength: v ?? 0 })} />
          </Row>
          <p className="vs-help">Hoe ver de laag meebeweegt met de muis. Negatief = tegen de muis in. Werkt niet op telefoons.</p>
        </Block>
      )}

      {fx.hover && (
        <Block title="Hover" onRemove={() => put('hover', undefined)}>
          <MotionRows label="Wordt" m={fx.hover} onChange={(m) => put('hover', { ...fx.hover!, ...m })} />
          <Row label="Duur / curve">
            <Num value={fx.hover.duration ?? 250} min={0} step={25} suffix="ms" onChange={(v) => put('hover', { ...fx.hover!, duration: v })} />
            <Select value={fx.hover.easing ?? 'smooth'} onChange={(v) => put('hover', { ...fx.hover!, easing: v })} options={EASINGS} />
          </Row>
        </Block>
      )}

      {fx.press && (
        <Block title="Press" onRemove={() => put('press', undefined)}>
          <MotionRows label="Wordt" m={fx.press} onChange={(m) => put('press', { ...fx.press!, ...m })} />
        </Block>
      )}

      {fx.marquee && (
        <Block title="Lopende band" onRemove={() => put('marquee', undefined)}>
          <Row label="Richting">
            <Select value={fx.marquee.direction ?? 'left'} onChange={(v) => put('marquee', { ...fx.marquee!, direction: v })} options={[{ value: 'left', label: 'Naar links' }, { value: 'right', label: 'Naar rechts' }]} />
          </Row>
          <Row label="Snelheid">
            <Num value={fx.marquee.speed ?? 60} min={1} step={10} suffix="px/s" onChange={(v) => put('marquee', { ...fx.marquee!, speed: v })} />
          </Row>
          <Row label=""><Toggle value={!!fx.marquee.pauseOnHover} onChange={(v) => put('marquee', { ...fx.marquee!, pauseOnHover: v || undefined })} label="Pauzeren bij hover" /></Row>
          <p className="vs-help">Zet op een horizontaal frame met bijvoorbeeld logo's of woorden. Op het canvas staat hij stil.</p>
        </Block>
      )}

      {fx.text && (
        <Block title="Tekst-animatie" onRemove={() => put('text', undefined)}>
          <Row label="Soort">
            <Select value={fx.text.kind} onChange={(v) => put('text', { ...fx.text!, kind: v })} options={[{ value: 'letters', label: 'Letter voor letter' }, { value: 'words', label: 'Woord voor woord' }, { value: 'count', label: 'Cijfers tellen op' }, { value: 'typewriter', label: 'Typemachine' }, { value: 'scramble', label: 'Scramble' }]} />
          </Row>
          <Row label="Duur">
            <Num value={fx.text.duration ?? 1400} min={100} step={100} suffix="ms" onChange={(v) => put('text', { ...fx.text!, duration: v })} />
          </Row>
        </Block>
      )}

      {fx.spin && (
        <Block title="Ronddraaien" onRemove={() => put('spin', undefined)}>
          <Row label="Rondje in">
            <Num value={fx.spin.duration} min={0.5} step={1} suffix="s" onChange={(v) => put('spin', { duration: v ?? 12 })} />
          </Row>
        </Block>
      )}

      {fx.loop && (
        <Block title="Doorlopende animatie" onRemove={() => put('loop', undefined)}>
          <Row label="Soort">
            <Select value={fx.loop.kind} onChange={(v) => put('loop', { ...fx.loop!, kind: v })} options={[{ value: 'float', label: 'Zweven' }, { value: 'pulse', label: 'Pulseren (ring)' }, { value: 'wiggle', label: 'Wiebelen' }, { value: 'twinkle', label: 'Twinkelen' }, { value: 'shoot', label: 'Vallende ster' }]} />
          </Row>
          <Row label="Duur">
            <Num value={fx.loop.duration} min={0.3} step={0.5} suffix="s" placeholder="auto" onChange={(v) => put('loop', { ...fx.loop!, duration: v })} />
          </Row>
          <Row label="Vertraging">
            <Num value={fx.loop.delay ?? 0} min={0} step={0.5} suffix="s" onChange={(v) => put('loop', { ...fx.loop!, delay: v || undefined })} />
          </Row>
          {fx.loop.kind === 'shoot' && <p className="vs-help">Zet de laag linksboven in een sectie met "afknippen" aan; hij schiet dan schuin over de sectie.</p>}
        </Block>
      )}

      {fx.magnetic && (
        <Block title="Magnetisch" onRemove={() => put('magnetic', undefined)}>
          <Row label="Kracht">
            <Num value={fx.magnetic.strength} min={0.05} step={0.05} onChange={(v) => put('magnetic', { strength: v ?? 0.3 })} />
          </Row>
          <p className="vs-help">Schuift mee richting de muis zolang je erboven hangt. Alleen met muis, niet op telefoons.</p>
        </Block>
      )}

      {fx.sweep && (
        <Block title="Kleur bij hover" onRemove={() => put('sweep', undefined)}>
          <Row label="Kleur"><ColorField value={fx.sweep.color} allowNone={false} onChange={(v) => put('sweep', { ...fx.sweep!, color: v ?? 'roze' })} /></Row>
          <Row label="Duur"><Num value={fx.sweep.duration ?? 350} min={100} step={50} suffix="ms" onChange={(v) => put('sweep', { ...fx.sweep!, duration: v })} /></Row>
          <p className="vs-help">De tekst (en een omlijning) loopt rustig over naar deze kleur. Werkt ook als de muis boven de omliggende link of kaart hangt.</p>
        </Block>
      )}

      {fx.groupHover && (
        <Block title="Reageert op de kaart" onRemove={() => put('groupHover', undefined)}>
          <MotionRows label="Wordt" m={fx.groupHover} onChange={(m) => put('groupHover', { ...fx.groupHover!, ...m })} />
          <Row label="Kleur"><ColorField value={fx.groupHover.color} onChange={(v) => put('groupHover', { ...fx.groupHover!, color: v })} /></Row>
          <p className="vs-help">Verandert zodra je boven de omliggende link of kaart hangt (een ouder met data-group), niet alleen boven deze laag.</p>
        </Block>
      )}

      {fx.tilt && (
        <Block title="3D-kantelen" onRemove={() => put('tilt', undefined)}>
          <Row label="Maximaal"><Num value={fx.tilt.max} min={1} step={1} suffix="°" onChange={(v) => put('tilt', { max: v ?? 7 })} /></Row>
        </Block>
      )}

      {fx.jelly && (
        <Block title="Jelly-letters" onRemove={() => put('jelly', undefined)}>
          <p className="vs-help">Elke letter springt los op als je erover beweegt. Combineer met "Letter voor letter" voor de beste look.</p>
        </Block>
      )}

      {fx.lightbox && (
        <Block title="Lightbox" onRemove={() => put('lightbox', undefined)}>
          <p className="vs-help">Klikken opent de afbeelding schermvullend. Esc of klikken sluit hem weer.</p>
        </Block>
      )}

      {active.length > 0 && (
        <Row label="">
          <Toggle value={fx.mobile !== false} onChange={(v) => save({ ...fx, mobile: v ? undefined : false })} label="Ook op telefoons" />
        </Row>
      )}
      {active.length > 0 && <p className="vs-help">Bezoekers die "beperkte beweging" aan hebben staan zien alles direct, zonder animatie.</p>}
    </Section>
  );
}

function Block({ title, onRemove, children }: { title: string; onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="vs-fx-block">
      <div className="vs-fx-head">
        <span>⚡ {title}</span>
        <button className="vs-icon-btn" title="Effect verwijderen" onClick={onRemove}>✕</button>
      </div>
      {children}
    </div>
  );
}

/** x, y, schaal, rotatie, dekking, vaagheid. */
function MotionRows({ label, m, onChange }: { label: string; m: Motion; onChange: (m: Motion) => void }) {
  const set = (k: keyof Motion, v: number | undefined) => {
    const next = { ...m, [k]: v };
    if (v === undefined) delete next[k];
    onChange(next);
  };
  return (
    <>
      <Row label={label}>
        <Num value={m.x} placeholder="0" suffix="x" onChange={(v) => set('x', v)} title="Verschuiving horizontaal (px)" />
        <Num value={m.y} placeholder="0" suffix="y" onChange={(v) => set('y', v)} title="Verschuiving verticaal (px)" />
        <Num value={m.scale} placeholder="1" step={0.05} suffix="×" onChange={(v) => set('scale', v)} title="Schaal" />
      </Row>
      <Row label="">
        <Num value={m.rotate} placeholder="0" suffix="°" onChange={(v) => set('rotate', v)} title="Rotatie" />
        <Num value={m.opacity === undefined ? undefined : Math.round(m.opacity * 100)} placeholder="100" min={0} suffix="%" onChange={(v) => set('opacity', v === undefined ? undefined : Math.min(100, v) / 100)} title="Dekking" />
        <Num value={m.blur} placeholder="0" min={0} suffix="blur" onChange={(v) => set('blur', v)} title="Vaagheid (px)" />
      </Row>
    </>
  );
}
