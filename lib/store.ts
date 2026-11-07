import "server-only";
import { promises as fs, readFileSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import type { Pool } from "pg";
import type { DB } from "./types";
import { seedData } from "./seed";

/**
 * The whole shop (settings, products, orders, admins) is one small JSON document.
 *
 *  - Local / any server with a disk:  stored in DATA_DIR/db.json (default, zero setup)
 *  - Vercel + Supabase:                stored in Supabase Postgres when DATABASE_URL is set
 *
 * Writes are always atomic: the file backend serialises writes and renames a temp file;
 * the Postgres backend locks the row (SELECT … FOR UPDATE) inside a transaction, so two
 * customers can never buy the last item at the same time.
 */
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

export const storageMode = DATABASE_URL ? "postgres" : "file";

const g = globalThis as unknown as { __mpopiQueue?: Promise<unknown>; __mpopiPool?: Pool; __mpopiReady?: Promise<void> };

async function createInitial(): Promise<DB> {
  const email = (process.env.ADMIN_EMAIL || "admin@mpopi.co.za").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set. Add it to .env.local (see .env.example).");
  return {
    ...seedData(),
    admins: [{ id: nanoid(), email, name: "Admin", passwordHash: await bcrypt.hash(password, 10) }],
  };
}

// ---------------------------------------------------------------- file backend

async function writeFile(db: DB) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  for (let i = 0; i < 5; i++) {
    try {
      await fs.rename(tmp, DB_FILE);
      return;
    } catch (e) {
      if (i === 4) throw e;
      await new Promise((r) => setTimeout(r, 40 * (i + 1)));
    }
  }
}

async function loadFile(): Promise<DB> {
  try {
    // Read synchronously on purpose: React's dev tooling records the results of awaited
    // I/O and ships them to the browser, which would expose the raw database in dev mode.
    const raw = readFileSync(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = await createInitial();
    await writeFile(db);
    return db;
  }
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const prev = g.__mpopiQueue ?? Promise.resolve();
  const next = prev.then(task, task);
  g.__mpopiQueue = next.catch(() => undefined);
  return next;
}

// ------------------------------------------------------------ postgres backend

async function pool(): Promise<Pool> {
  if (!g.__mpopiPool) {
    const { Pool } = await import("pg");
    // Supabase/hosted Postgres needs SSL. Strip sslmode from the URL (node-postgres would otherwise
    // insist on full certificate verification, which fails on Supabase's pooler) and set SSL here.
    const url = new URL(DATABASE_URL);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    url.searchParams.delete("sslmode");
    g.__mpopiPool = new Pool({
      connectionString: url.toString(),
      // TLS is always on for hosted databases. Set DATABASE_CA_CERT (Supabase → Database → SSL
      // certificate, PEM text) to also verify the server certificate.
      ssl: local
        ? undefined
        : process.env.DATABASE_CA_CERT
          ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true }
          : { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  const p = g.__mpopiPool;
  g.__mpopiReady ??= (async () => {
    await p.query(`CREATE TABLE IF NOT EXISTS mpopi_store (
      id integer PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    // Supabase exposes tables through its public REST API. Row Level Security with no policies
    // blocks that API completely; the site's own server connection (table owner) is unaffected.
    await p.query("ALTER TABLE mpopi_store ENABLE ROW LEVEL SECURITY");
    await p.query(`CREATE TABLE IF NOT EXISTS mpopi_rate_limits (
      key text PRIMARY KEY,
      count integer NOT NULL,
      reset_at timestamptz NOT NULL
    )`);
    await p.query("ALTER TABLE mpopi_rate_limits ENABLE ROW LEVEL SECURITY");
    await p.query(`CREATE TABLE IF NOT EXISTS mpopi_security_log (
      id bigserial PRIMARY KEY,
      at timestamptz NOT NULL DEFAULT now(),
      type text NOT NULL,
      ip text,
      path text,
      detail text
    )`);
    await p.query("ALTER TABLE mpopi_security_log ENABLE ROW LEVEL SECURITY");
    await p.query("CREATE INDEX IF NOT EXISTS mpopi_security_log_at ON mpopi_security_log (at DESC)");
    const { rowCount } = await p.query("SELECT 1 FROM mpopi_store WHERE id = 1");
    if (!rowCount) {
      const initial = await createInitial();
      await p.query("INSERT INTO mpopi_store (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(initial)]);
    }
  })().catch((e) => {
    g.__mpopiReady = undefined; // retry on the next request
    throw e;
  });
  await g.__mpopiReady;
  return p;
}

/** Run a parameterised query (Postgres mode only). Values are always passed separately from the SQL. */
export async function pgQuery<R extends Record<string, unknown> = Record<string, unknown>>(text: string, params: unknown[] = []) {
  const p = await pool();
  return p.query<R>(text, params);
}

async function loadPg(): Promise<DB> {
  const p = await pool();
  const { rows } = await p.query<{ data: DB }>("SELECT data FROM mpopi_store WHERE id = 1");
  return rows[0].data;
}

async function mutatePg<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const p = await pool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ data: DB }>("SELECT data FROM mpopi_store WHERE id = 1 FOR UPDATE");
    const db = rows[0].data;
    const result = await fn(db);
    await client.query("UPDATE mpopi_store SET data = $1, updated_at = now() WHERE id = 1", [JSON.stringify(db)]);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

// ------------------------------------------------------------------ public API

/** Read the current database. */
export function readDB(): Promise<DB> {
  return storageMode === "postgres" ? loadPg() : enqueue(loadFile);
}

/** Apply a change and persist it atomically. The callback may mutate `db` and return a value; throwing cancels the change. */
export function mutate<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  if (storageMode === "postgres") return mutatePg(fn);
  return enqueue(async () => {
    const db = await loadFile();
    const result = await fn(db);
    await writeFile(db);
    return result;
  });
}
