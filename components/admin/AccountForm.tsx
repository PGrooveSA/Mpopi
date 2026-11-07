"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Card, PageHeader, useToast } from "./ui";

type A = { id: string; email: string; name: string };

export default function AccountForm({ me, admins }: { me: A; admins: A[] }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: me.name, email: me.email, currentPassword: "", newPassword: "" });
  const [add, setAdd] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState<string | null>(null);

  const send = async (key: string, method: string, body: unknown, ok: string) => {
    setBusy(key);
    try {
      const res = await fetch("/api/admin/account", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.show(ok);
      router.refresh();
      return true;
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Something went wrong", "err");
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Account" subtitle="Your login details and who else can manage the store." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="font-display mb-4 font-semibold">Your details</h2>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await send("me", "PUT", form, "Account updated")) setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }));
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">New password (optional, 10+ characters)</label>
                <input className="input" type="password" autoComplete="new-password" minLength={10} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
              </div>
              <div>
                <label className="label">Current password *</label>
                <input className="input" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
              </div>
            </div>
            <button disabled={busy === "me"} className="btn-primary">
              {busy === "me" && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="font-display mb-4 font-semibold">Admins</h2>
          <ul className="space-y-2">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-2xl bg-white/50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold">
                    {a.name} {a.id === me.id && <span className="text-xs font-normal text-ink-soft">(you)</span>}
                  </p>
                  <p className="text-xs text-ink-soft">{a.email}</p>
                </div>
                {a.id !== me.id && (
                  <button
                    onClick={() => confirm(`Remove ${a.email}?`) && send(a.id, "DELETE", { id: a.id }, "Admin removed")}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-hot-deep"
                    aria-label={`Remove ${a.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form
            className="mt-5 grid gap-3 sm:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await send("add", "PUT", { action: "add", ...add }, "Admin added")) setAdd({ name: "", email: "", password: "" });
            }}
          >
            <input className="input" placeholder="Name" value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
            <input className="input" type="email" required placeholder="Email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} />
            <input className="input" type="password" required minLength={10} autoComplete="new-password" placeholder="Password (10+ characters)" value={add.password} onChange={(e) => setAdd({ ...add, password: e.target.value })} />
            <button disabled={busy === "add"} className="btn-dark sm:col-span-3">
              <UserPlus className="h-4 w-4" /> Add admin
            </button>
          </form>
        </Card>
      </div>
      {toast.node}
    </div>
  );
}
