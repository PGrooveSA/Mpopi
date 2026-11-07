import { SignJWT, jwtVerify } from "jose";

/**
 * Edge-safe session helpers (used by middleware and server code).
 *
 * The session is a signed JWT (HS256) in an HttpOnly cookie. It carries the admin id and a
 * "token version": bumping the version on the admin record (password change / sign out
 * everywhere) instantly invalidates every existing session.
 */
const PROD = process.env.NODE_ENV === "production";

/** `__Host-` cookies must be Secure, path=/ and host-only — browsers then refuse any subdomain or HTTP override. */
export const SESSION_COOKIE = PROD ? "__Host-mpopi_admin" : "mpopi_admin";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
const ISSUER = "mpopi-store";
const AUDIENCE = "mpopi-admin";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: PROD,
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE,
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. Set a long random value in your environment variables.");
  }
  return new TextEncoder().encode(s);
}

export async function signToken(adminId: string, version: number) {
  return new SignJWT({ ver: version })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(adminId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], issuer: ISSUER, audience: AUDIENCE });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub, ver: typeof payload.ver === "number" ? payload.ver : -1 };
  } catch {
    return null;
  }
}
