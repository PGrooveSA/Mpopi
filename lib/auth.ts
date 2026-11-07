import "server-only";
import { cookies } from "next/headers";
import { readDB } from "./store";
import { verifyToken, SESSION_COOKIE } from "./session";

export { SESSION_COOKIE };
export { clientIp } from "./security";

/** bcrypt work factor for new password hashes (~250 ms per hash). */
export const BCRYPT_ROUNDS = 12;

/** Minimum password rules for admin accounts. Returns an error message, or null if OK. */
export function passwordProblem(password: string, email?: string) {
  if (password.length < 10) return "Password must be at least 10 characters.";
  if (password.length > 200) return "Password is too long.";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) return "Password must not contain your email name.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9\W_]/.test(password)) return "Use a mix of letters and numbers or symbols.";
  return null;
}

/** The signed-in admin, or null. Checks the signature, expiry AND that the session wasn't revoked. */
export async function getAdmin() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const db = await readDB();
  const admin = db.admins.find((a) => a.id === payload.sub);
  if (!admin || (admin.tokenVersion ?? 0) !== payload.ver) return null;
  return { id: admin.id, email: admin.email, name: admin.name };
}
