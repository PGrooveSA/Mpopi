import "server-only";
import { cookies } from "next/headers";
import { readDB } from "./store";
import { verifyToken, SESSION_COOKIE } from "./session";

export { SESSION_COOKIE };

export async function getAdmin() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const db = await readDB();
  const admin = db.admins.find((a) => a.id === payload.sub);
  if (!admin) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}

/** Simple in-memory rate limiter (per process). */
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
