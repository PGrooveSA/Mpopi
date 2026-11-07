import { NextResponse } from "next/server";
import { readDB, storageMode } from "@/lib/store";
import { mediaMode } from "@/lib/media";

export const dynamic = "force-dynamic";

/**
 * Deployment health check: which settings are present (yes/no only — never the values)
 * and whether the database can be reached. Visit /api/health after deploying.
 */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k] && process.env[k]!.trim());
  const env = {
    AUTH_SECRET: has("AUTH_SECRET"),
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
    const hint =
      /ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH/.test(code + msg)
        ? "Can't reach the database host. In Supabase use the 'Transaction pooler' connection string (…pooler.supabase.com:6543), not the direct one."
        : /password authentication failed|28P01/.test(code + msg)
          ? "Wrong database password in DATABASE_URL (make sure [YOUR-PASSWORD] was replaced, and special characters are URL-encoded)."
          : /EROFS|read-only/.test(code + msg)
            ? "DATABASE_URL is not set, so the site tried to save to disk — Vercel doesn't allow that. Add DATABASE_URL and redeploy."
            : /ADMIN_PASSWORD/.test(msg)
              ? "ADMIN_PASSWORD is not set in Vercel → Settings → Environment Variables."
              : /timeout|ETIMEDOUT/i.test(code + msg)
                ? "Database connection timed out. Check the connection string and that the Supabase project isn't paused."
                : undefined;
    database = { ok: false, error: code ? `${code}: ${msg}` : msg, hint };
  }

  const ok = database.ok && env.AUTH_SECRET && env.ADMIN_PASSWORD && (storageMode === "file" || env.SUPABASE_URL);
  return NextResponse.json(
    { ok, storage: storageMode, images: mediaMode, env, database },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
