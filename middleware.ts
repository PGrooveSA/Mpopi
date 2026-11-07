import { NextResponse, type NextRequest } from "next/server";
import { verifyToken, SESSION_COOKIE } from "./lib/session";

const DEV = process.env.NODE_ENV !== "production";
const SUPABASE = (() => {
  try {
    return new URL(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
})();

/** Content-Security-Policy: only our own scripts (with this request's nonce) may run. */
function csp(nonce: string) {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${DEV ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:${SUPABASE ? ` ${SUPABASE}` : ""}`,
    `font-src 'self' data:`,
    `connect-src 'self'${DEV ? " ws: wss:" : ""}`,
    `media-src 'self'`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    ...(DEV ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function deny(status: number, error: string) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    // CORS: this API is for this website only. Preflights get no Access-Control-* headers,
    // so browsers block every cross-origin call.
    if (method === "OPTIONS") return new NextResponse(null, { status: 204, headers: { Allow: "GET, POST, PUT, PATCH, DELETE" } });

    // CSRF: state-changing requests must come from our own pages.
    if (!["GET", "HEAD"].includes(method)) {
      const origin = req.headers.get("origin");
      const site = req.headers.get("sec-fetch-site");
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      let sameOrigin = true;
      if (origin) {
        try {
          sameOrigin = new URL(origin).host === host;
        } catch {
          sameOrigin = false;
        }
      } else if (site && site !== "same-origin" && site !== "none") {
        sameOrigin = false;
      }
      if (!sameOrigin) {
        console.warn(JSON.stringify({ security: "csrf_blocked", path: pathname, origin, site, ip: req.headers.get("x-real-ip") }));
        return deny(403, "Cross-site request blocked.");
      }
    }
  }

  // Admin area: a valid signed session is required (route handlers re-check it against the database)
  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin/") && pathname !== "/api/admin/login";
  if (isAdminPage || isAdminApi) {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const ok = token ? await verifyToken(token) : null;
    if (!ok) {
      if (isAdminApi) return deny(401, "Not signed in");
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = `?next=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  if (isApi) return NextResponse.next();

  // Pages: attach a per-request nonce so Next.js can mark its own inline scripts as trusted.
  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", policy);
  return res;
}

export const config = {
  matcher: [
    {
      // everything except static build files and public images
      source: "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|brand/|photos/|prints/|.*\\.(?:png|jpg|jpeg|webp|svg|ico|ttf|woff2?)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
