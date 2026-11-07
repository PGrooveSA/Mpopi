"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import Background from "@/components/Background";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="glass-strong w-full max-w-sm animate-fade-up rounded-[2.5rem] p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="MPOPI…" className="mx-auto h-10 w-auto" />
      <h1 className="font-display mt-6 text-center text-xl font-semibold">Admin sign in</h1>
      <p className="mt-1 text-center text-sm text-ink-soft">Manage products, orders and your website.</p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" required autoComplete="username" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      {error && <p className="mt-4 rounded-2xl bg-hot/10 p-3 text-sm font-semibold text-hot-deep">{error}</p>}
      <button disabled={busy} className="btn-primary mt-6 w-full py-3.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Sign in
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center p-4">
      <Background />
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
