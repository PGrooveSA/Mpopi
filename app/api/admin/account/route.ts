import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { mutate } from "@/lib/store";
import { getAdmin, passwordProblem, BCRYPT_ROUNDS } from "@/lib/auth";
import { adminRoute, bad, str, UserError } from "@/lib/api";
import { rateLimit, logSecurity } from "@/lib/security";
import { signToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

/**
 * PUT actions:
 *  - (default) update your own name / email / password — needs your current password
 *  - "add"          create another admin
 *  - "signout-all"  revoke every session for your account (including this one)
 */
export const PUT = adminRoute(async (req: Request) => {
  const me = (await getAdmin())!;
  const body = await req.json().catch(() => ({}));

  // anything that checks the current password is rate limited (10 per 15 min per admin)
  const rl = await rateLimit(`account:${me.id}`, 10, 15 * 60);
  if (!rl.ok) {
    await logSecurity("rate_limited", req, `account changes by ${me.email}`);
    return bad("Too many attempts. Please wait 15 minutes.", 429);
  }

  try {
    if (body.action === "signout-all") {
      await mutate((db) => {
        const a = db.admins.find((x) => x.id === me.id);
        if (a) a.tokenVersion = (a.tokenVersion ?? 0) + 1;
      });
      await logSecurity("sessions_revoked", req, `all sessions for ${me.email}`);
      const res = NextResponse.json({ ok: true });
      res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
      return res;
    }

    if (body.action === "add") {
      const email = str(body.email, 200).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      if (!EMAIL_RE.test(email)) throw new UserError("Enter a valid email.");
      const problem = passwordProblem(password, email);
      if (problem) throw new UserError(problem);
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await mutate((db) => {
        if (db.admins.some((a) => a.email === email)) throw new UserError("That email already has an account.");
        db.admins.push({ id: nanoid(), email, name: str(body.name, 60) || "Admin", passwordHash: hash, tokenVersion: 0 });
      });
      await logSecurity("admin_added", req, `${me.email} added ${email}`);
      return NextResponse.json({ ok: true });
    }

    const current = typeof body.currentPassword === "string" ? body.currentPassword.slice(0, 200) : "";
    const next = typeof body.newPassword === "string" ? body.newPassword : "";
    const email = str(body.email, 200).toLowerCase();
    if (next) {
      const problem = passwordProblem(next, email || me.email);
      if (problem) throw new UserError(problem);
    }
    const hash = next ? await bcrypt.hash(next, BCRYPT_ROUNDS) : null;

    const result = await mutate(async (db) => {
      const a = db.admins.find((x) => x.id === me.id);
      if (!a) throw new UserError("Account not found.");
      if (!(await bcrypt.compare(current, a.passwordHash))) throw new UserError("Your current password is incorrect.");
      let emailChanged = false;
      if (email && email !== a.email) {
        if (!EMAIL_RE.test(email)) throw new UserError("Enter a valid email.");
        if (db.admins.some((x) => x.email === email)) throw new UserError("That email already has an account.");
        a.email = email;
        emailChanged = true;
      }
      if (body.name) a.name = str(body.name, 60);
      if (hash) {
        a.passwordHash = hash;
        a.tokenVersion = (a.tokenVersion ?? 0) + 1; // signs out every other device
      }
      return { version: a.tokenVersion ?? 0, emailChanged };
    });

    if (result.emailChanged) await logSecurity("admin_email_changed", req, `${me.email} → ${email}`);
    const res = NextResponse.json({ ok: true });
    if (hash) {
      await logSecurity("password_changed", req, `for ${email || me.email}; other sessions signed out`);
      // keep this browser signed in with a fresh session
      res.cookies.set(SESSION_COOKIE, await signToken(me.id, result.version), sessionCookieOptions);
    }
    return res;
  } catch (e) {
    if (e instanceof UserError) {
      if (/current password/.test(e.message)) await logSecurity("login_failed", req, `wrong current password on account page (${me.email})`);
      return bad(e.message);
    }
    throw e;
  }
});

export const DELETE = adminRoute(async (req: Request) => {
  const me = (await getAdmin())!;
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string" || id === me.id) return bad("You can't remove your own account.");
  const removed = await mutate((db) => {
    const victim = db.admins.find((a) => a.id === id);
    db.admins = db.admins.filter((a) => a.id !== id);
    return victim?.email;
  });
  if (removed) await logSecurity("admin_removed", req, `${me.email} removed ${removed}`);
  return NextResponse.json({ ok: true });
});
