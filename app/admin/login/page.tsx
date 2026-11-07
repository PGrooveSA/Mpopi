"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EnvelopeSimple, LockSimple, Eye, EyeSlash, SignIn, SpinnerGap, ShieldCheck, ArrowUpRight, Storefront } from "@phosphor-icons/react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Could not sign in.");
      setBusy(false);
      return;
    }
    const next = params.get("next");
    router.replace(next && /^\/admin(\/|$)/.test(next) ? next : "/admin");
    router.refresh();
  };

  const field = "h-12 w-full rounded-xl border border-[var(--a-line)] bg-[var(--a-soft)] pl-11 text-sm outline-none transition focus:border-[var(--a-ink)] focus:bg-white";

  return (
    <form onSubmit={submit} className="w-full max-w-[380px]" noValidate={false}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="MPOPI…" className="h-8 w-auto" />
      <h1 className="font-display mt-10 text-[30px] leading-tight font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-1.5 text-sm text-[var(--a-muted)]">Sign in to manage products, orders and your website.</p>

      <label className="mt-8 block text-xs font-semibold text-[#5d5d59]" htmlFor="email">
        Email
      </label>
      <div className="relative mt-1.5">
        <EnvelopeSimple size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--a-muted)]" />
        <input id="email" type="email" required autoComplete="username" className={field} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>

      <label className="mt-4 block text-xs font-semibold text-[#5d5d59]" htmlFor="password">
        Password
      </label>
      <div className="relative mt-1.5">
        <LockSimple size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--a-muted)]" />
        <input
          id="password"
          type={show ? "text" : "password"}
          required
          autoComplete="current-password"
          className={`${field} pr-12`}
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--a-muted)] hover:bg-white"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeSlash size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-[#f3d2d2] bg-[#fdf2f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </p>
      )}

      <button disabled={busy} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--a-ink)] text-sm font-semibold text-white transition hover:bg-[#2c2c2c] disabled:opacity-60">
        {busy ? <SpinnerGap size={18} className="animate-spin" /> : <SignIn size={18} />} Sign in
      </button>

      <p className="mt-6 flex items-center gap-2 text-xs text-[var(--a-muted)]">
        <ShieldCheck size={16} className="text-[var(--a-green-deep)]" /> Protected sign-in. Accounts lock for 15 minutes after 5 failed attempts.
      </p>
      <a href="/" className="mt-10 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5d5d59] hover:text-[var(--a-ink)]">
        <Storefront size={15} /> Back to the store
      </a>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="admin-ui min-h-screen bg-[var(--a-canvas)] p-3">
      <div className="grid min-h-[calc(100vh-24px)] overflow-hidden rounded-[28px] border border-[var(--a-line)] bg-white lg:grid-cols-[1fr_1.05fr]">
        <div className="flex items-center justify-center px-6 py-12 sm:px-12">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>

        {/* preview panel */}
        <div className="relative hidden overflow-hidden bg-[var(--a-shell)] p-10 lg:flex lg:flex-col lg:justify-center">
          <div className="mx-auto w-full max-w-[460px] space-y-4">
            <div className="rounded-[18px] border border-[var(--a-line)] bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-[30px] leading-none font-semibold tracking-tight">R12 450</p>
                  <p className="mt-1.5 text-xs text-[var(--a-muted)]">Sales overview · example</p>
                </div>
                <span className="rounded-lg border border-[var(--a-line)] px-2.5 py-1 text-xs font-semibold">7d</span>
              </div>
              <div className="mt-5 flex h-36 items-end gap-3">
                {[38, 52, 46, 92, 60, 74, 55].map((h, i) => (
                  <div key={i} className="flex flex-1 flex-col justify-end overflow-hidden rounded-lg" style={{ height: `${h}%` }}>
                    {i === 3 ? (
                      <>
                        <div className="hatch-yellow h-[28%]" />
                        <div className="hatch-green flex-1" />
                      </>
                    ) : (
                      <div className="hatch-grey h-full" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-[var(--a-muted)]">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d} className={d === "Wed" ? "font-semibold text-[var(--a-ink)]" : ""}>
                    {d}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="hatch-green rounded-[18px] p-5 text-white">
                <p className="text-xs font-semibold opacity-90">New orders</p>
                <p className="font-display mt-6 text-3xl font-semibold">12</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] opacity-90">
                  <ArrowUpRight size={12} weight="bold" /> 18% this week
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--a-line)] bg-white p-5">
                <p className="text-xs font-semibold text-[var(--a-muted)]">Stock health</p>
                <p className="font-display mt-6 text-3xl font-semibold">86%</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--a-soft)]">
                  <div className="hatch-green h-full w-[86%] rounded-full" />
                </div>
              </div>
            </div>
            <p className="pt-2 text-center text-sm text-[var(--a-muted)]">Everything about your store, in one place.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
