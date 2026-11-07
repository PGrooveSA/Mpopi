import "server-only";
import { NextResponse } from "next/server";
import { getAdmin } from "./auth";

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Wraps an admin route handler: double-checks the session (middleware also does). */
export function adminRoute<A extends unknown[]>(handler: (req: Request, ...args: A) => Promise<Response>) {
  return async (req: Request, ...args: A) => {
    const admin = await getAdmin();
    if (!admin) return bad("Not signed in", 401);
    try {
      return await handler(req, ...args);
    } catch (e) {
      console.error(e);
      return bad(e instanceof Error ? e.message : "Something went wrong", 500);
    }
  };
}

export function str(v: unknown, max = 500) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function num(v: unknown, fallback = 0) {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}
