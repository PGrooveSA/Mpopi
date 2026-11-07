import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { mutate } from "@/lib/store";
import { getAdmin } from "@/lib/auth";
import { adminRoute, bad, str } from "@/lib/api";

/** Update your own email / name / password, or add another admin. */
export const PUT = adminRoute(async (req: Request) => {
  const me = (await getAdmin())!;
  const body = await req.json().catch(() => ({}));
  try {
    if (body.action === "add") {
      const email = str(body.email, 200).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email.");
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      const hash = await bcrypt.hash(password, 10);
      await mutate((db) => {
        if (db.admins.some((a) => a.email === email)) throw new Error("That email already has an account.");
        db.admins.push({ id: nanoid(), email, name: str(body.name, 60) || "Admin", passwordHash: hash });
      });
      return NextResponse.json({ ok: true });
    }

    const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const next = typeof body.newPassword === "string" ? body.newPassword : "";
    const email = str(body.email, 200).toLowerCase();
    if (next && next.length < 8) throw new Error("New password must be at least 8 characters.");
    const hash = next ? await bcrypt.hash(next, 10) : null;
    await mutate(async (db) => {
      const a = db.admins.find((x) => x.id === me.id);
      if (!a) throw new Error("Account not found.");
      if (!(await bcrypt.compare(current, a.passwordHash))) throw new Error("Your current password is incorrect.");
      if (email && email !== a.email) {
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email.");
        if (db.admins.some((x) => x.email === email)) throw new Error("That email already has an account.");
        a.email = email;
      }
      if (body.name) a.name = str(body.name, 60);
      if (hash) a.passwordHash = hash;
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e instanceof Error ? e.message : "Could not update account.");
  }
});

export const DELETE = adminRoute(async (req: Request) => {
  const me = (await getAdmin())!;
  const { id } = await req.json().catch(() => ({}));
  if (id === me.id) return bad("You can't remove your own account.");
  await mutate((db) => {
    db.admins = db.admins.filter((a) => a.id !== id);
  });
  return NextResponse.json({ ok: true });
});
