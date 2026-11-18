// Dunne laag over de SQLite die in Node.js zelf zit (node:sqlite, vanaf Node 22.13).
// Geen native module nodig: niets te compileren, werkt direct op Windows, macOS en Linux.
import { DatabaseSync, type StatementSync } from 'node:sqlite';

type Params = unknown[];

export interface Statement {
  get(...params: Params): unknown;
  all(...params: Params): unknown[];
  run(...params: Params): { changes: number | bigint; lastInsertRowid: number | bigint };
}

/** Benoemde parameters (@naam) mogen als object; booleans en undefined worden netjes omgezet. */
function norm(params: Params): Params {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p && typeof p === 'object' && !Array.isArray(p) && !(p instanceof Uint8Array)) {
      const o: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(p)) o[k] = v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v;
      return o;
    }
    return p;
  });
}

export class Database {
  private db: DatabaseSync;
  private cache = new Map<string, StatementSync>();

  constructor(file: string) {
    this.db = new DatabaseSync(file);
  }

  exec(sql: string) {
    this.db.exec(sql);
  }

  pragma(p: string) {
    this.db.exec(`PRAGMA ${p}`);
  }

  /** Netjes afsluiten: WAL terugschrijven naar het hoofdbestand en sluiten. */
  close() {
    try {
      this.db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    } catch { /* geen WAL */ }
    this.cache.clear();
    this.db.close();
  }

  prepare(sql: string): Statement {
    let st = this.cache.get(sql);
    if (!st) {
      st = this.db.prepare(sql);
      this.cache.set(sql, st);
    }
    const s = st;
    return {
      get: (...p) => s.get(...(norm(p) as never[])),
      all: (...p) => s.all(...(norm(p) as never[])),
      run: (...p) => s.run(...(norm(p) as never[])),
    };
  }

  /** Zelfde gedrag als better-sqlite3: alles of niets. */
  transaction<T extends (...a: never[]) => unknown>(fn: T): T {
    return ((...args: never[]) => {
      this.db.exec('BEGIN');
      try {
        const r = fn(...args);
        this.db.exec('COMMIT');
        return r;
      } catch (e) {
        this.db.exec('ROLLBACK');
        throw e;
      }
    }) as T;
  }
}

export default Database;
