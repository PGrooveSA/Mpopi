import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { readDB } from "@/lib/store";
import { signToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { rateLimit, peekLimit, resetLimit, logSecurity, clientIp } from "@/lib/security";
import { bad, str } from "@/lib/api";
import { BCRYPT_ROUNDS } from "@/lib/auth";

// Compared against when the email is unknown, so the response takes the same time either way
// and attackers can't discover which emails have admin accounts.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), BCRYPT_ROUNDS);

const MAX_FAILURES = 5; // per account, per 15 minutes
const WINDOW = 15 * 60;
const locked = (retry?: number) =>
  NextResponse.json(
    { error: "This account is temporarily locked after too many failed attempts. Try again in 15 minutes." },
    { status: 429, headers: retry ? { "Retry-After": String(retry) } : undefined },
  );

export async function POST(req: Request) {
  const ip = clientIp(req);

  // 10 attempts per 15 minutes per IP address
  const byIp = await rateLimit(`login:ip:${ip}`, 10, WINDOW);
  if (!byIp.ok) {
    await logSecurity("rate_limited", req, "too many sign-in attempts from this IP");
    return NextResponse.json({ error: "Too many sign-in attempts. Please wait 15 minutes and try again." }, { status: 429, headers: { "Retry-After": String(byIp.retryAfter) } });
  }

  const body = await req.json().catch(() => ({}));
  const email = str(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!email || !password) return bad("Enter your email and password.");

  // account lockout: blocked even with the right password until the window passes
  const failKey = `login:fail:${email}`;
  if ((await peekLimit(failKey)) >= MAX_FAILURES) {
    await logSecurity("login_locked", req, `attempt on locked account ${email}`);
    return locked();
  }

  const db = await readDB();
  const admin = db.admins.find((a) => a.email === email);
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);

  if (!admin || !valid) {
    // the MAX_FAILURES-th wrong password locks the account
    const f = await rateLimit(failKey, MAX_FAILURES - 1, WINDOW);
    await logSecurity(f.ok ? "login_failed" : "login_locked", req, `email=${email}`);
    if (!f.ok) return locked(f.retryAfter);
    return bad("Incorrect email or password.", 401);
  }

  await resetLimit(failKey);
  await logSecurity("login_success", req, `email=${email}`);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signToken(admin.id, admin.tokenVersion ?? 0), sessionCookieOptions);
  return res;
}
