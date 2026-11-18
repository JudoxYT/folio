import crypto from 'node:crypto';
import { walk, type FormNode, type VNode } from '@vystara/core';
import { db, listComponents, listPages, listProjects, getProjectTemplate } from './db.js';
import { config } from './config.js';

db.exec(`
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, form_id TEXT NOT NULL, form_name TEXT NOT NULL, data TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
`);

/** Zoek de definitie van een formulier in alle pagina's, projecten en componenten. */
/** Alle formulieren op de site (voor de Vercel-functie bij publiceren). */
export function allForms(): FormNode[] {
  const out: FormNode[] = [];
  const trees: VNode[] = [...listPages().map((p) => p.tree), ...listComponents().map((c) => c.tree)];
  const tpl = getProjectTemplate();
  if (tpl) trees.push(tpl.tree);
  for (const t of trees) walk(t, (n) => { if (n.type === 'form') out.push(n); });
  return out;
}

function findForm(id: string): FormNode | null {
  const trees: VNode[] = [
    ...listPages().map((p) => p.tree),
    ...listComponents().map((c) => c.tree),
    ...listProjects().flatMap((p) => (p.tree ? [p.tree] : [])),
  ];
  const tpl = getProjectTemplate();
  if (tpl) trees.push(tpl.tree);
  for (const t of trees) {
    let found: FormNode | null = null;
    walk(t, (n) => {
      // In instances krijgt een node het id "instance__node"; het formulier zelf zit in de component.
      if (n.type === 'form' && (n.id === id || id.endsWith(`__${n.id}`))) {
        found = n;
        return false;
      }
    });
    if (found) return found as FormNode;
  }
  return null;
}

// Max 5 inzendingen per 10 minuten per IP (IP wordt niet opgeslagen).
const hits = new Map<string, number[]>();
function allowed(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (list.length >= 5) return false;
  list.push(now);
  hits.set(ip, list);
  return true;
}

export type SubmitResult = { ok: true } | { ok: false; status: 400 | 404 | 429; error: string };

export async function submitForm(body: Record<string, unknown>, ip: string): Promise<SubmitResult> {
  // Honeypot: mensen zien dit veld niet, bots vullen het in. Doe alsof het gelukt is.
  if (typeof body._hp === 'string' && body._hp.trim()) return { ok: true };
  if (!allowed(ip)) return { ok: false, status: 429, error: 'Te veel berichten. Probeer het later opnieuw.' };
  const form = findForm(String(body._form ?? ''));
  if (!form) return { ok: false, status: 404, error: 'Formulier niet gevonden' };

  const data: Record<string, string> = {};
  for (const f of form.fields) {
    const v = String(body[`f_${f.id}`] ?? '').trim().slice(0, f.kind === 'textarea' ? 5000 : 500);
    if (f.required && !v) return { ok: false, status: 400, error: `Vul "${f.label}" in` };
    if (v && f.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, status: 400, error: 'Dat e-mailadres klopt niet' };
    if (v && f.kind === 'select' && f.options && !f.options.includes(v)) return { ok: false, status: 400, error: `Ongeldige keuze bij "${f.label}"` };
    data[f.label] = v;
  }

  db.prepare('INSERT INTO submissions (id, form_id, form_name, data, created_at) VALUES (?, ?, ?, ?, ?)').run(
    crypto.randomUUID(), form.id, form.name, JSON.stringify(data), new Date().toISOString(),
  );
  void forward(form.name, data);
  return { ok: true };
}

/** Optioneel doorsturen, bv. naar een Discord-kanaal via een webhook. */
async function forward(formName: string, data: Record<string, string>) {
  const url = config.formWebhook;
  if (!url) return;
  const lines = Object.entries(data).map(([k, v]) => `**${k}:** ${v}`).join('\n');
  const isDiscord = /discord(app)?\.com\/api\/webhooks\//.test(url);
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(isDiscord ? { content: `📬 Nieuw bericht via **${formName}**\n${lines}`.slice(0, 1990), allowed_mentions: { parse: [] } } : { form: formName, data }),
    });
  } catch (e) {
    console.warn('Doorsturen van formulier mislukt', e);
  }
}

export function listSubmissions() {
  return (db.prepare('SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500').all() as { id: string; form_name: string; data: string; read: number; created_at: string }[]).map((r) => ({
    id: r.id,
    formName: r.form_name,
    data: JSON.parse(r.data) as Record<string, string>,
    read: !!r.read,
    createdAt: r.created_at,
  }));
}

export function markRead(id: string) {
  db.prepare('UPDATE submissions SET read = 1 WHERE id = ?').run(id);
}

export function deleteSubmission(id: string) {
  db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
}
