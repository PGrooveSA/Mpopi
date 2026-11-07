import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { DATA_DIR, pgQuery, storageMode } from "./store";

/* ------------------------------------------------------------------ client IP */

/** Client IP. On Vercel `x-real-ip` / `x-forwarded-for` are set by the platform and can't be spoofed. */
export function clientIp(req: Request) {
  return (req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "local").trim().slice(0, 64);
}

/* --------------------------------------------------------------- rate limiting */

const g = globalThis as unknown as { __mpopiRL?: Map<string, { count: number; reset: number }> };
const mem = (g.__mpopiRL ??= new Map());

/**
 * Fixed-window rate limit shared by every server instance (stored in Postgres in production,
 * in memory locally). Returns whether the request may proceed and how long to wait if not.
 */
export async function rateLimit(key: string, max: number, windowSec: number): Promise<{ ok: boolean; retryAfter: number }> {
  if (storageMode === "postgres") {
    try {
      const { rows } = await pgQuery<{ count: number; wait: number }>(
        `INSERT INTO mpopi_rate_limits (key, count, reset_at) VALUES ($1, 1, now() + make_interval(secs => $2))
         ON CONFLICT (key) DO UPDATE SET
           count    = CASE WHEN mpopi_rate_limits.reset_at < now() THEN 1 ELSE mpopi_rate_limits.count + 1 END,
           reset_at = CASE WHEN mpopi_rate_limits.reset_at < now() THEN now() + make_interval(secs => $2) ELSE mpopi_rate_limits.reset_at END
         RETURNING count, CEIL(EXTRACT(EPOCH FROM (reset_at - now())))::int AS wait`,
        [key.slice(0, 200), windowSec],
      );
      if (Math.random() < 0.01) pgQuery("DELETE FROM mpopi_rate_limits WHERE reset_at < now() - interval '1 day'").catch(() => undefined);
      return { ok: rows[0].count <= max, retryAfter: Math.max(1, rows[0].wait) };
    } catch (e) {
      console.error("rate limit store unavailable, falling back to memory", e);
    }
  }
  const now = Date.now();
  const b = mem.get(key);
  if (!b || b.reset < now) {
    mem.set(key, { count: 1, reset: now + windowSec * 1000 });
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return { ok: b.count <= max, retryAfter: Math.ceil((b.reset - now) / 1000) };
}

/** Current count for a key without adding to it (0 if the window has passed). */
export async function peekLimit(key: string): Promise<number> {
  if (storageMode === "postgres") {
    try {
      const { rows } = await pgQuery<{ count: number }>("SELECT count FROM mpopi_rate_limits WHERE key = $1 AND reset_at > now()", [key.slice(0, 200)]);
      return rows[0]?.count ?? 0;
    } catch {
      /* fall through */
    }
  }
  const b = mem.get(key);
  return b && b.reset > Date.now() ? b.count : 0;
}

/** Clears a key (e.g. failed-login counter after a successful sign-in). */
export async function resetLimit(key: string) {
  mem.delete(key);
  if (storageMode === "postgres") await pgQuery("DELETE FROM mpopi_rate_limits WHERE key = $1", [key.slice(0, 200)]).catch(() => undefined);
}

/* ----------------------------------------------------------- security logging */

export type SecurityEventType =
  | "login_success"
  | "login_failed"
  | "login_locked"
  | "logout"
  | "rate_limited"
  | "csrf_blocked"
  | "upload_rejected"
  | "password_changed"
  | "sessions_revoked"
  | "admin_added"
  | "admin_removed"
  | "admin_email_changed"
  | "invalid_session";

export interface SecurityEvent {
  at: string;
  type: SecurityEventType;
  ip: string | null;
  path: string | null;
  detail: string | null;
}

const LOG_FILE = path.join(DATA_DIR, "security-log.jsonl");

/** Records a security event: always to the server log (Vercel → Logs), and to the database for the admin panel. */
export async function logSecurity(type: SecurityEventType, req: Request | null, detail?: string) {
  const ip = req ? clientIp(req) : null;
  const p = req ? new URL(req.url).pathname : null;
  const clean = detail ? detail.replace(/[\u0000-\u001f]/g, " ").slice(0, 300) : null;
  console.warn(JSON.stringify({ security: type, ip, path: p, detail: clean, at: new Date().toISOString() }));
  try {
    if (storageMode === "postgres") {
      await pgQuery("INSERT INTO mpopi_security_log (type, ip, path, detail) VALUES ($1, $2, $3, $4)", [type, ip, p, clean]);
      if (Math.random() < 0.02) pgQuery("DELETE FROM mpopi_security_log WHERE at < now() - interval '90 days'").catch(() => undefined);
    } else {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.appendFile(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), type, ip, path: p, detail: clean }) + "\n");
    }
  } catch (e) {
    console.error("could not store security event", e);
  }
}

export async function recentSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
  try {
    if (storageMode === "postgres") {
      const { rows } = await pgQuery<{ at: Date; type: SecurityEventType; ip: string | null; path: string | null; detail: string | null }>(
        "SELECT at, type, ip, path, detail FROM mpopi_security_log ORDER BY at DESC LIMIT $1",
        [limit],
      );
      return rows.map((r) => ({ ...r, at: new Date(r.at).toISOString() }));
    }
    const raw = await fs.readFile(LOG_FILE, "utf8").catch(() => "");
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((l) => JSON.parse(l) as SecurityEvent);
  } catch {
    return [];
  }
}
