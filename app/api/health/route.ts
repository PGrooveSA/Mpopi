import { NextResponse } from "next/server";
import { readDB, storageMode } from "@/lib/store";
import { mediaMode } from "@/lib/media";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Deployment health check.
 *  - Public:     only { ok } — reveals nothing about the setup.
 *  - Signed-in:  which settings are present (yes/no only — never the values) and database status.
 */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k] && process.env[k]!.trim());
  const env = {
    AUTH_SECRET: has("AUTH_SECRET") && process.env.AUTH_SECRET!.length >= 32,
    ADMIN_EMAIL: has("ADMIN_EMAIL"),
    ADMIN_PASSWORD: has("ADMIN_PASSWORD"),
    DATABASE_URL: has("DATABASE_URL") || has("POSTGRES_URL"),
    SUPABASE_URL: has("SUPABASE_URL") || has("NEXT_PUBLIC_SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY"),
    NEXT_PUBLIC_SITE_URL: has("NEXT_PUBLIC_SITE_URL"),
  };

  let database: { ok: boolean; products?: number; error?: string; hint?: string };
  try {
    const db = await readDB();
    database = { ok: true, products: db.products.length };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    const msg = String(err.message || e)
      .replace(/postgres(ql)?:\/\/\S+/gi, "[connection string]")
      .replace(/for user "[^"]*"/i, "for user [hidden]")
      .slice(0, 160);
    const code = err.code || "";
    const hint = /ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH/.test(code + msg)
      ? "Can't reach the database host. In Supabase use the 'Transaction pooler' connection string (…pooler.supabase.com:6543)."
      : /password authentication failed|28P01/.test(code + msg)
        ? "Wrong database password in DATABASE_URL."
        : /EROFS|read-only/.test(code + msg)
          ? "DATABASE_URL is not set, so the site tried to save to disk — Vercel doesn't allow that."
          : /ADMIN_PASSWORD|AUTH_SECRET/.test(msg)
            ? "A required environment variable is missing — see the env list."
            : /timeout|ETIMEDOUT/i.test(code + msg)
              ? "Database connection timed out. Check the connection string and that the Supabase project isn't paused."
              : undefined;
    database = { ok: false, error: code ? `${code}: ${msg}` : msg, hint };
    console.error("health check: database error", database.error);
  }

  const onVercel = Boolean(process.env.VERCEL);
  const ok =
    database.ok && env.AUTH_SECRET && (!onVercel || (env.DATABASE_URL && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY));
  const headers = { "Cache-Control": "no-store" };
  const status = ok ? 200 : 503;

  const admin = database.ok ? await getAdmin().catch(() => null) : null;
  // Without a session, details are only shown while the site is broken AND has no working database
  // (first deploy), so setup problems can still be diagnosed. A healthy site reveals nothing.
  if (!admin && (ok || database.ok)) return NextResponse.json({ ok }, { status, headers });
  return NextResponse.json({ ok, storage: storageMode, images: mediaMode, env, database }, { status, headers });
}
