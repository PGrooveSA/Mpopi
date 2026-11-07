import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { readDB } from "@/lib/store";
import { signToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/auth";
import { bad, str } from "@/lib/api";

export async function POST(req: Request) {
  if (!rateLimit("login:" + clientIp(req), 10, 15 * 60 * 1000)) {
    return bad("Too many attempts. Please wait 15 minutes and try again.", 429);
  }
  const body = await req.json().catch(() => ({}));
  const email = str(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const db = await readDB();
  const admin = db.admins.find((a) => a.email === email);
  const valid = admin ? await bcrypt.compare(password, admin.passwordHash) : false;
  if (!admin || !valid) return bad("Incorrect email or password.", 401);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signToken(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
