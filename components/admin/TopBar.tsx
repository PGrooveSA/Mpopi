"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MagnifyingGlass, Bell, GearSix, Plus } from "@phosphor-icons/react";

/** Search, notifications (new orders), settings and the signed-in admin. */
export default function TopBar({ name, email, newOrders }: { name: string; email: string; newOrders: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/admin/orders?q=${encodeURIComponent(q.trim())}`);
        }}
        className="relative order-2 w-full sm:order-1 sm:w-80"
      >
        <MagnifyingGlass size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--a-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search orders, customers, phone…"
          className="h-11 w-full rounded-xl border border-[var(--a-line)] bg-white pr-3 pl-10 text-sm outline-none placeholder:text-[#a3a39f] focus:border-[var(--a-ink)]"
          aria-label="Search orders"
        />
      </form>
      <div className="order-1 ml-auto flex items-center gap-2 sm:order-2">
        <Link
          href="/admin/orders?status=new"
          className="relative grid h-11 w-11 place-items-center rounded-xl border border-[var(--a-line)] bg-white hover:bg-[var(--a-soft)]"
          aria-label={`${newOrders} new orders`}
          title={`${newOrders} new orders`}
        >
          <Bell size={19} />
          {newOrders > 0 && <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[var(--a-green)] ring-2 ring-white" />}
        </Link>
        <Link href="/admin/settings" className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--a-line)] bg-white hover:bg-[var(--a-soft)]" aria-label="Website settings">
          <GearSix size={19} />
        </Link>
        <Link href="/admin/account" className="hidden h-11 items-center gap-2.5 rounded-xl border border-[var(--a-line)] bg-white py-1 pr-4 pl-1.5 hover:bg-[var(--a-soft)] md:flex">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--a-ink)] text-xs font-bold text-white">{initials || "A"}</span>
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold">{name}</span>
            <span className="block text-[11px] text-[var(--a-muted)]">{email}</span>
          </span>
        </Link>
        <Link href="/admin/products/new" className="flex h-11 items-center gap-2 rounded-xl border border-[var(--a-line)] bg-white px-4 text-[13px] font-semibold hover:bg-[var(--a-soft)]">
          <Plus size={16} weight="bold" /> <span className="hidden sm:inline">Add product</span>
        </Link>
      </div>
    </header>
  );
}
