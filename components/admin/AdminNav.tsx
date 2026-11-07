"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Shirt, ReceiptText, Settings, UserCog, LogOut, ExternalLink, Menu, X } from "lucide-react";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: Shirt },
  { href: "/admin/orders", label: "Orders", icon: ReceiptText },
  { href: "/admin/settings", label: "Website content", icon: Settings },
  { href: "/admin/account", label: "Account", icon: UserCog },
];

export default function AdminNav({ name, email, newOrders }: { name: string; email: string; newOrders: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <>
      <div className="glass-strong sticky top-0 z-40 flex items-center justify-between px-4 py-3 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="MPOPI…" className="h-7 w-auto" />
        <button onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full bg-white/70" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} glass-strong z-30 m-0 flex-col p-4 lg:sticky lg:top-4 lg:m-4 lg:flex lg:h-[calc(100vh-2rem)] lg:w-64 lg:rounded-[2rem]`}
      >
        <Link href="/admin" className="hidden px-3 pt-2 pb-6 lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="MPOPI…" className="h-8 w-auto" />
          <span className="mt-1 block text-[10px] font-bold tracking-[0.25em] text-ink-soft uppercase">Admin panel</span>
        </Link>
        <nav className="space-y-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${active(href) ? "bg-ink text-white shadow-lg" : "text-ink-soft hover:bg-white/70 hover:text-ink"}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {href === "/admin/orders" && newOrders > 0 && <span className="rounded-full bg-hot px-2 py-0.5 text-[10px] font-bold text-white">{newOrders}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-1 pt-6">
          <a href="/" target="_blank" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-white/70">
            <ExternalLink className="h-4 w-4" /> View website
          </a>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-ink-soft hover:bg-white/70">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
          <div className="mt-3 rounded-2xl bg-white/60 px-3 py-2.5">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="truncate text-xs text-ink-soft">{email}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
