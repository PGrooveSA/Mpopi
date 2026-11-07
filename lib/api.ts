import "server-only";
import { NextResponse } from "next/server";
import { getAdmin } from "./auth";
import { logSecurity } from "./security";

/** An error whose message is safe to show to the user (validation problems etc.). */
export class UserError extends Error {}

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Wraps an admin route handler: re-checks the session against the database (middleware only
 * checks the signature) and never leaks internal error details.
 */
export function adminRoute<A extends unknown[]>(handler: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A) => {
    const admin = await getAdmin();
    if (!admin) {
      await logSecurity("invalid_session", req, "admin API call without a valid session");
      return bad("Not signed in", 401);
    }
    try {
      return await handler(req, ...args);
    } catch (e) {
      if (e instanceof UserError) return bad(e.message);
      console.error(e);
      return bad("Something went wrong. Please try again.", 500);
    }
  };
}

/** Trimmed string with control characters removed (newlines kept only when `multiline`). */
export function str(v: unknown, max = 500, multiline = false) {
  if (typeof v !== "string") return "";
  const cleaned = multiline ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "") : v.replace(/[\u0000-\u001f\u007f]/g, " ");
  return cleaned.trim().slice(0, max);
}

export function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
  } catch {
    return "";
  }
})();

/**
 * Image addresses may only point at this site ("/photos/…", "/api/media/…") or at our own
 * Supabase storage. Anything else (other websites, javascript:, data:) is dropped.
 */
export function safeImageUrl(v: unknown) {
  const s = str(v, 500);
  if (/^\/(?!\/)[\w\-./]+$/.test(s) && !s.includes("..")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" && SUPABASE_HOST && u.host === SUPABASE_HOST && u.pathname.startsWith("/storage/v1/object/public/")) return u.toString();
  } catch {
    /* not a URL */
  }
  return "";
}

/** External links (social media) must be plain http(s) URLs. */
export function safeLink(v: unknown) {
  const s = str(v, 300);
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}
