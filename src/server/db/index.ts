/**
 * Database access for the whole app.
 *
 * Node's built-in SQLite (`node:sqlite`) keeps the project dependency-free and
 * buildable anywhere. Everything routes through `sql()`/`tx()` below so the
 * driver can be replaced (better-sqlite3, Postgres via Prisma, MySQL) without
 * touching a single repository.
 *
 * A singleton connection is cached on `globalThis` because Next dev reloads
 * modules on every edit; without it we would reopen the same file constantly.
 */
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { env } from "@/server/env";

export type SqlValue = string | number | bigint | Buffer | null;
export type Row = Record<string, unknown>;

type DbHandle = {
  raw: DatabaseSync;
  file: string;
};

const globalCache = globalThis as unknown as { __amwDb?: DbHandle };

function open(): DbHandle {
  const file = env.databasePath;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL");
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA busy_timeout = 4000");
  raw.exec("PRAGMA synchronous = NORMAL");
  return { raw, file };
}

export function db(): DbHandle {
  if (!globalCache.__amwDb) {
    const handle = open();
    applySchema(handle);
    globalCache.__amwDb = handle;
  }
  return globalCache.__amwDb;
}

/** Idempotent DDL: safe to call on every boot, so a fresh clone just runs. */
function applySchema(handle: DbHandle) {
  const schemaPath = path.join(process.cwd(), "src", "server", "db", "schema.sql");
  if (!fs.existsSync(schemaPath)) return; // production `standalone` builds ship the db file only
  handle.raw.exec(fs.readFileSync(schemaPath, "utf8"));
  addMissingColumns(handle);
}

/**
 * SQLite has no `ADD COLUMN IF NOT EXISTS`, so an existing shop database gains new
 * fields here rather than needing to be deleted and re-seeded. Cheap: one PRAGMA per
 * table, once per process.
 */
const ADDITIONS: [table: string, column: string, ddl: string][] = [
  ["products", "payment_mode", "TEXT NOT NULL DEFAULT 'both' CHECK (payment_mode IN ('both','cod','online'))"],
  ["products", "delivery_days", "INTEGER"],
  ["admin_users", "failed_attempts", "INTEGER NOT NULL DEFAULT 0"],
  ["admin_users", "locked_until", "TEXT"],
];

function addMissingColumns(handle: DbHandle) {
  for (const [table, column, ddl] of ADDITIONS) {
    const rows = handle.raw.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!rows.length) continue; // table does not exist yet — schema.sql will make it
    if (rows.some((row) => row.name === column)) continue;
    handle.raw.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

function coerce(params: SqlValue[]): SqlValue[] {
  // node:sqlite rejects booleans/undefined; normalise at the boundary.
  return params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p === undefined ? null : p));
}

export function all<T = Row>(sql: string, ...params: SqlValue[]): T[] {
  // Rows come back with a null prototype from node:sqlite; plain objects are
  // required for React Server Component serialization.
  return (db().raw.prepare(sql).all(...coerce(params)) as T[]).map((row) => ({ ...row } as T));
}

export function get<T = Row>(sql: string, ...params: SqlValue[]): T | undefined {
  const row = db().raw.prepare(sql).get(...coerce(params)) as T | undefined;
  return row ? ({ ...row } as T) : undefined;
}

export function run(sql: string, ...params: SqlValue[]) {
  return db().raw.prepare(sql).run(...coerce(params));
}

export function exec(sql: string) {
  db().raw.exec(sql);
}

export function insert(sql: string, ...params: SqlValue[]): number {
  const res = run(sql, ...params);
  return Number(res.lastInsertRowid);
}

/**
 * Serialized write transaction. SQLite allows one writer at a time, so this is
 * also what keeps "decrement stock" + "create order" atomic under concurrent
 * requests (a stock race would otherwise oversell).
 */
export function tx<T>(fn: () => T): T {
  const { raw } = db();
  raw.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    raw.exec("COMMIT");
    return out;
  } catch (error) {
    try {
      raw.exec("ROLLBACK");
    } catch {
      /* the rollback failed — surface the original error */
    }
    throw error;
  }
}

/** Small SQL builders shared by the repository layer. */
export const nowIso = () => new Date().toISOString();

export function inClause(values: (string | number)[]) {
  return values.map(() => "?").join(",");
}

/** Escapes LIKE wildcards coming from the search box. */
export function likeParam(term: string) {
  return `%${term.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

export function likeParams(term: string) {
  const t = term.trim().replace(/[\\%_]/g, (m) => `\\${m}`);
  // Multi-word searches should match in any order ("linen shirt" == "shirt linen").
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["%%"];
  return words;
}
