import crypto from 'node:crypto';
import type { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { db } from './db.js';
import { config } from './config.js';

const COOKIE = 'vystara_session';
const SESSION_DAYS = 30;

function hash(password: string, salt = crypto.randomBytes(16).toString('hex')): string {
  const key = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt$${salt}$${key}`;
}

function verify(password: string, stored: string): boolean {
  const [, salt, key] = stored.split('$');
  const check = hash(password, salt).split('$')[2];
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(check, 'hex'));
}

export function hasUsers(): boolean {
  return ((db.prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number }).n ?? 0) > 0;
}

export function firstUserId(): string | null {
  return (db.prepare('SELECT id FROM users ORDER BY created_at LIMIT 1').get() as { id: string } | undefined)?.id ?? null;
}

export function createUser(email: string, password: string) {
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO users (id, email, pass_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id, email.trim().toLowerCase(), hash(password), new Date().toISOString(),
  );
  return id;
}

export function checkLogin(email: string, password: string): string | null {
  const u = db.prepare('SELECT id, pass_hash FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | { id: string; pass_hash: string }
    | undefined;
  if (!u) {
    hash(password); // gelijke rekentijd, zodat je niet kunt raden welke mailadressen bestaan
    return null;
  }
  return verify(password, u.pass_hash) ? u.id : null;
}

export function startSession(c: Context, userId: string) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_DAYS * 864e5;
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.secureCookies,
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
}

export function endSession(c: Context) {
  const token = getCookie(c, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  deleteCookie(c, COOKIE, { path: '/' });
}

export function currentUser(c: Context): { id: string; email: string } | null {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  return (
    (db
      .prepare('SELECT u.id, u.email FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?')
      .get(token, Date.now()) as { id: string; email: string } | undefined) ?? null
  );
}

export async function requireAuth(c: Context, next: Next) {
  if (!currentUser(c)) return c.json({ error: 'Niet ingelogd' }, 401);
  // Simpele CSRF-bescherming: schrijvende verzoeken moeten van de Studio zelf komen.
  if (c.req.method !== 'GET' && c.req.header('x-vystara') !== '1') {
    return c.json({ error: 'Ongeldig verzoek' }, 403);
  }
  await next();
}

// Eenvoudige rem op wachtwoord raden: max 10 mislukte pogingen per 15 minuten per IP.
const attempts = new Map<string, { n: number; until: number }>();
export function loginAllowed(ip: string): boolean {
  const a = attempts.get(ip);
  return !a || a.until < Date.now() || a.n < 10;
}
export function loginFailed(ip: string) {
  const a = attempts.get(ip);
  if (!a || a.until < Date.now()) attempts.set(ip, { n: 1, until: Date.now() + 15 * 60_000 });
  else a.n++;
}
