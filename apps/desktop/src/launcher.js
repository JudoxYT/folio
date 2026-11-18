// Startscherm "Mijn websites".
const $ = (s, el = document) => el.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'style') el.style.cssText = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c !== null && c !== undefined) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
};

let state = { sites: [], templates: [], root: '', version: '', platform: '' };

const ago = (iso) => {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'zojuist';
  if (d < 3600) return `${Math.round(d / 60)} min geleden`;
  if (d < 86400) return `${Math.round(d / 3600)} uur geleden`;
  if (d < 86400 * 30) return `${Math.round(d / 86400)} dagen geleden`;
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
};

function thumb(tpl, title) {
  const p = (tpl && tpl.preview) || { bg: '#1f2128', fg: '#eceef4', accent: '#8b7bff' };
  return h('div', { class: 'thumb', style: `background:${p.bg};color:${p.fg}` },
    h('i', { style: `width:38%;background:${p.accent}` }),
    h('b', {}, title),
    h('i', { style: `width:70%;background:${p.fg};opacity:.18` }),
    h('i', { style: `width:52%;background:${p.fg};opacity:.12` }));
}

function busy(text) {
  const el = h('div', { class: 'busy' }, h('div', {}, h('div', { class: 'spinner' }), h('div', {}, text)));
  document.body.append(el);
  return () => el.remove();
}

function showError(err) {
  const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov) ov.remove(); } },
    h('div', { class: 'dialog' },
      h('h2', {}, 'Dat ging niet goed'),
      h('p', {}, 'De website kon niet worden geopend. Probeer het nog eens; blijft het misgaan, stuur dan deze melding mee.'),
      h('div', { class: 'error' }, String((err && err.message) || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '')),
      h('div', { class: 'row', style: 'margin-top:18px' }, h('button', { class: 'primary', onclick: () => ov.remove() }, 'Oké'))));
  document.body.append(ov);
}

async function open(id) {
  const done = busy('Website openen…');
  try {
    await window.folio.open(id);
  } catch (e) {
    done();
    showError(e);
  }
}

function menu(site, x, y) {
  document.querySelectorAll('.menu').forEach((m) => m.remove());
  const item = (label, fn, cls) => h('button', { class: cls, onclick: async () => { m.remove(); await fn(); } }, label);
  const m = h('div', { class: 'menu', style: `left:${Math.min(x, innerWidth - 230)}px;top:${Math.min(y, innerHeight - 240)}px` },
    item('Openen', () => open(site.id)),
    item('Naam wijzigen…', () => renameDialog(site)),
    item('Dupliceren', async () => { await window.folio.duplicate(site.id); await refresh(); }),
    item('Delen als bestand…', async () => { try { if (await window.folio.exportSite(site.id)) note('Bestand gemaakt. Stuur het naar wie je wilt; die opent het met Folio.'); } catch (e) { showError(e); } }),
    item(state.platform === 'darwin' ? 'Toon in Finder' : 'Toon in Verkenner', () => window.folio.reveal(site.id)),
    item('Verwijderen…', () => removeDialog(site), 'danger'));
  document.body.append(m);
  setTimeout(() => addEventListener('click', () => m.remove(), { once: true }), 0);
}

function renameDialog(site) {
  const input = h('input', { value: site.name, maxlength: 80 });
  const save = async () => { await window.folio.rename(site.id, input.value); ov.remove(); await refresh(); };
  const ov = h('div', { class: 'overlay' }, h('div', { class: 'dialog', style: 'width:min(460px,100%)' },
    h('h2', {}, 'Naam wijzigen'),
    h('p', {}, 'Dit is de naam in je overzicht. De naam op de website zelf pas je aan in de Studio.'),
    h('label', { class: 'field' }, 'Naam', input),
    h('div', { class: 'row' }, h('button', { class: 'ghost', onclick: () => ov.remove() }, 'Annuleren'), h('button', { class: 'primary', onclick: save }, 'Opslaan'))));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') ov.remove(); });
  document.body.append(ov);
  input.select();
}

function removeDialog(site) {
  const ov = h('div', { class: 'overlay' }, h('div', { class: 'dialog', style: 'width:min(500px,100%)' },
    h('h2', {}, `“${site.name}” verwijderen?`),
    h('p', {}, 'Je kunt hem alleen uit het overzicht halen (de bestanden blijven staan), of hem helemaal naar de prullenbak verplaatsen.'),
    h('div', { class: 'row' },
      h('button', { class: 'ghost', onclick: () => ov.remove() }, 'Annuleren'),
      h('button', { class: 'ghost', onclick: async () => { await window.folio.remove(site.id, false); ov.remove(); await refresh(); } }, 'Uit overzicht halen'),
      h('button', { class: 'primary', style: 'background:#ff6b81', onclick: async () => { await window.folio.remove(site.id, true); ov.remove(); await refresh(); } }, 'Naar prullenbak'))));
  document.body.append(ov);
}

function newDialog() {
  let chosen = (state.templates[0] && state.templates[0].id) || 'portfolio';
  const name = h('input', { placeholder: 'Bijvoorbeeld: Portfolio van Sam', maxlength: 80 });
  const tpls = h('div', { class: 'tpls' });
  const draw = () => {
    tpls.replaceChildren(...state.templates.map((t) =>
      h('button', { class: `tpl ${t.id === chosen ? 'on' : ''}`, type: 'button', onclick: () => { chosen = t.id; draw(); } },
        thumb(t, name.value.trim() || t.name),
        h('div', { class: 'txt' }, h('strong', {}, t.name), h('span', {}, t.description)))));
  };
  name.addEventListener('input', draw);
  const go = async () => {
    const n = name.value.trim();
    if (!n) { name.focus(); return; }
    ov.remove();
    const done = busy('Website aanmaken…');
    try {
      await window.folio.create(n, chosen);
    } catch (e) {
      done();
      showError(e);
      await refresh();
    }
  };
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  const ov = h('div', { class: 'overlay', onclick: (e) => { if (e.target === ov) ov.remove(); } }, h('div', { class: 'dialog' },
    h('h2', {}, 'Nieuwe website'),
    h('p', {}, 'Geef je website een naam en kies een sjabloon om mee te beginnen. Alles is daarna aan te passen.'),
    h('label', { class: 'field' }, 'Naam', name),
    h('div', { style: 'font-weight:600' }, 'Sjabloon'),
    tpls,
    h('div', { class: 'row' }, h('button', { class: 'ghost', onclick: () => ov.remove() }, 'Annuleren'), h('button', { class: 'primary', onclick: go }, 'Website maken'))));
  draw();
  document.body.append(ov);
  name.focus();
}

function render() {
  const grid = $('#grid');
  const byId = Object.fromEntries(state.templates.map((t) => [t.id, t]));
  const cards = state.sites.map((s) => {
    const more = h('button', { class: 'more', title: 'Meer', onclick: (e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); menu(s, r.left, r.bottom + 6); } }, '⋯');
    return h('div', { class: `card ${s.missing ? 'missing' : ''}`, tabindex: 0, onclick: () => open(s.id), oncontextmenu: (e) => { e.preventDefault(); menu(s, e.clientX, e.clientY); }, onkeydown: (e) => { if (e.key === 'Enter') open(s.id); } },
      thumb(byId[s.template], s.name),
      more,
      h('div', { class: 'meta' }, h('strong', {}, s.name), h('span', {}, s.missing ? 'Map niet gevonden' : s.lastOpened ? `Geopend ${ago(s.lastOpened)}` : `Gemaakt ${ago(s.created)}`)));
  });
  const add = h('div', { class: 'card new', onclick: newDialog }, h('div', { class: 'plus' }, '+'), h('strong', {}, 'Nieuwe website'), h('span', {}, 'Begin met een sjabloon'));
  grid.replaceChildren(...cards, add);
  if (!state.sites.length) $('.sub').textContent = 'Je hebt nog geen websites. Maak je eerste website; dat duurt nog geen minuut.';
  $('#ver').textContent = `Folio ${state.version}`;
  $('#root').textContent = `Websites worden bewaard in ${state.root}`;
}

async function refresh() {
  state = await window.folio.list();
  document.body.classList.toggle('mac', state.platform === 'darwin');
  render();
}

$('#new').addEventListener('click', newDialog);
$('#import').addEventListener('click', async () => { if (await window.folio.importSite()) await refresh(); });
$('#import-file').addEventListener('click', async () => { const s = await window.folio.importFile(); if (s) { await refresh(); note(`“${s.name}” staat nu tussen je websites.`); } });
window.folio.onRefresh(async (info) => { await refresh(); if (info?.added) note(`“${info.added}” staat nu tussen je websites.`); });

/** Korte melding onderin. */
function note(text) {
  const n = h('div', { class: 'note' }, text);
  document.body.append(n);
  setTimeout(() => n.remove(), 4000);
}
window.folio.onUpdate((info) => {
  const b = $('#update');
  b.hidden = false;
  b.replaceChildren(
    h('span', { class: 'grow' }, info.ready ? `Folio ${info.version} is gedownload.` : `Er is een nieuwe versie van Folio: ${info.version}.`),
    info.ready
      ? h('button', { class: 'primary', onclick: () => window.folio.installUpdate() }, 'Herstarten en bijwerken')
      : info.mac
        ? h('button', { class: 'primary', onclick: () => window.folio.external('https://github.com/JudoxYT/folio/releases/latest') }, 'Downloaden')
        : h('span', { style: 'color:var(--muted)' }, 'Wordt op de achtergrond gedownload…'));
});
refresh();
