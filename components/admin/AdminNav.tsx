"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  SquaresFour,
  TShirt,
  Receipt,
  Browser,
  ShieldCheck,
  UserCircle,
  ArrowSquareOut,
  SignOut,
  CaretDown,
  CaretDoubleLeft,
  CaretDoubleRight,
  List,
  X,
  Storefront,
  Lifebuoy,
} from "@phosphor-icons/react";

type Item = { href: string; label: string; icon: typeof SquaresFour; children?: { href: string; label: string; badge?: number }[] };

export default function AdminNav({ newOrders, soldOut, storeUrl }: { newOrders: number; soldOut: number; storeUrl: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ "/admin/products": true, "/admin/orders": true });

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("mpopi-admin-collapsed") === "1");
    } catch {}
  }, []);
  useEffect(() => setMobile(false), [pathname]);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("mpopi-admin-collapsed", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  const items: Item[] = [
    { href: "/admin", label: "Dashboard", icon: SquaresFour },
    {
      href: "/admin/products",
      label: "Products",
      icon: TShirt,
      children: [
        { href: "/admin/products", label: "All products" },
        { href: "/admin/products/new", label: "Add product" },
        { href: "/admin/products?filter=soldout", label: "Sold out", badge: soldOut },
      ],
    },
    {
      href: "/admin/orders",
      label: "Orders",
      icon: Receipt,
      children: [
        { href: "/admin/orders", label: "All orders" },
        { href: "/admin/orders?status=new", label: "New", badge: newOrders },
        { href: "/admin/orders?status=awaiting_payment", label: "Awaiting payment" },
      ],
    },
    { href: "/admin/settings", label: "Website content", icon: Browser },
    { href: "/admin/security", label: "Security", icon: ShieldCheck },
    { href: "/admin/account", label: "Account", icon: UserCircle },
  ];

  const current = pathname + (params.toString() ? `?${params}` : "");
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href.split("?")[0]));
  const isChildActive = (href: string) => (href.includes("?") ? current === href : pathname === href && !params.toString());

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const navBody = (compact: boolean) => (
    <>
      <div className={`flex items-center ${compact ? "justify-center" : "justify-between"} px-3 pt-2 pb-6`}>
        <Link href="/admin" className="flex items-center gap-2" aria-label="Dashboard">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={compact ? "/brand/bear.png" : "/brand/logo.png"} alt="MPOPI…" className={compact ? "h-8 w-auto" : "h-7 w-auto"} />
        </Link>
      </div>

      <nav className="space-y-1">
        {items.map((it) => {
          const active = isActive(it.href);
          const Icon = it.icon;
          const expanded = !compact && it.children && open[it.href];
          return (
            <div key={it.href}>
              <div className="flex items-center">
                <Link
                  href={it.href}
                  title={compact ? it.label : undefined}
                  className={`flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition ${compact ? "justify-center" : ""} ${
                    active ? "bg-[var(--a-card)] font-semibold text-[var(--a-ink)] shadow-[0_1px_0_var(--a-line)] ring-1 ring-[var(--a-line)]" : "text-[#4a4a47] hover:bg-[var(--a-card)]"
                  }`}
                >
                  <Icon size={20} weight={active ? "fill" : "regular"} />
                  {!compact && <span className="flex-1">{it.label}</span>}
                </Link>
                {!compact && it.children && (
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [it.href]: !o[it.href] }))}
                    className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-[var(--a-muted)] hover:bg-[var(--a-card)]"
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${it.label}`}
                    aria-expanded={!!expanded}
                  >
                    <CaretDown size={14} className={`transition ${expanded ? "" : "-rotate-90"}`} />
                  </button>
                )}
              </div>
              {expanded && (
                <div className="relative mt-1 mb-2 ml-[22px] space-y-0.5 border-l border-[#dcdcd8] pl-4">
                  {it.children!.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`relative flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] before:absolute before:top-1/2 before:-left-4 before:h-px before:w-3 before:bg-[#dcdcd8] ${
                        isChildActive(c.href) ? "font-semibold text-[var(--a-ink)]" : "text-[#6b6b67] hover:text-[var(--a-ink)]"
                      }`}
                    >
                      {c.label}
                      {!!c.badge && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--a-ink)] px-1.5 text-[10px] font-bold text-white">{c.badge}</span>}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="my-5 border-t border-[var(--a-line)]" />
      <nav className="space-y-1">
        <a
          href="/"
          target="_blank"
          title={compact ? "View website" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[#4a4a47] hover:bg-[var(--a-card)] ${compact ? "justify-center" : ""}`}
        >
          <Storefront size={20} /> {!compact && "View website"}
        </a>
        <a
          href="/faq"
          target="_blank"
          title={compact ? "Help" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[#4a4a47] hover:bg-[var(--a-card)] ${compact ? "justify-center" : ""}`}
        >
          <Lifebuoy size={20} /> {!compact && "Help & FAQ"}
        </a>
        <button
          onClick={logout}
          title={compact ? "Sign out" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[#4a4a47] hover:bg-[var(--a-card)] ${compact ? "justify-center" : ""}`}
        >
          <SignOut size={20} /> {!compact && "Sign out"}
        </button>
      </nav>

      <div className="mt-auto pt-6">
        {!compact && (
          <div className="rounded-2xl border border-[var(--a-line)] bg-[var(--a-card)] p-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--a-ink)] text-white">
              <Storefront size={18} weight="fill" />
            </span>
            <p className="mt-3 text-[15px] font-bold">Your store is live</p>
            <p className="mt-1 truncate text-xs text-[var(--a-muted)]">{storeUrl.replace(/^https?:\/\//, "")}</p>
            <a href="/" target="_blank" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--a-ink)] py-2.5 text-sm font-semibold text-white hover:bg-[#2c2c2c]">
              Open store <ArrowSquareOut size={15} />
            </a>
          </div>
        )}
        <button
          onClick={toggleCollapsed}
          className={`mt-4 hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-[#4a4a47] hover:bg-[var(--a-card)] lg:flex ${compact ? "justify-center" : ""}`}
        >
          {compact ? <CaretDoubleRight size={18} /> : <CaretDoubleLeft size={18} />} {!compact && "Collapse sidebar"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--a-line)] bg-[var(--a-shell)] px-4 py-3 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="MPOPI…" className="h-6 w-auto" />
        <button onClick={() => setMobile((m) => !m)} className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--a-line)] bg-white" aria-label="Menu">
          {mobile ? <X size={20} /> : <List size={20} />}
        </button>
      </div>
      {mobile && (
        <aside className="fixed inset-0 top-[65px] z-30 flex flex-col overflow-y-auto bg-[var(--a-shell)] p-4 lg:hidden">{navBody(false)}</aside>
      )}
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r border-[var(--a-line)] bg-[var(--a-shell)] p-4 transition-[width] lg:flex ${collapsed ? "w-[84px]" : "w-[264px]"}`}
      >
        {navBody(collapsed)}
      </aside>
    </>
  );
}
