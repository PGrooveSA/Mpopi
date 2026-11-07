"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useCart, cartCount } from "@/lib/cart";

const LINKS = [
  { href: "/shop", label: "Collection" },
  { href: "/shop?collection=mpopi", label: "MPOPI…" },
  { href: "/shop?collection=hiswona", label: "Hiswona…" },
  { href: "/fitting-room", label: "Try it on" },
  { href: "/about", label: "About" },
];

export default function Navbar({ announcement }: { announcement?: string }) {
  const items = useCart((s) => s.items);
  const setOpen = useCart((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const count = mounted ? cartCount(items) : 0;

  return (
    <header className="sticky top-0 z-40">
      {announcement && (
        <div className="bg-night text-center text-[10px] font-semibold tracking-[0.18em] text-white/80 uppercase sm:text-[11px]">
          <div className="container-x truncate py-2">{announcement}</div>
        </div>
      )}
      <div className={`container-x transition-all duration-300 ${scrolled ? "pt-2" : "pt-3"}`}>
        <nav className={`flex items-center justify-between rounded-full py-2 pr-2 pl-5 transition-all duration-300 sm:pl-6 ${scrolled ? "glass-strong" : "glass"}`}>
          <Link href="/" className="flex shrink-0 items-center" aria-label="MPOPI home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="MPOPI…" className="h-6 w-auto sm:h-7" />
          </Link>
          <p className="hidden text-[11px] font-semibold tracking-[0.2em] text-ink-soft uppercase xl:block">MPOPI… / Studio tees</p>
          <ul className="hidden items-center lg:flex">
            {LINKS.map((l) => {
              const active = l.href === pathname;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`rounded-full px-3.5 py-2 text-[11px] font-bold tracking-[0.16em] uppercase transition hover:text-ink ${active ? "text-ink" : "text-ink-soft"}`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setOpen(true)}
              className="flex h-10 items-center gap-2 rounded-full bg-night px-4 text-[11px] font-bold tracking-[0.16em] text-white uppercase transition hover:bg-ink"
              aria-label={`Open bag, ${count} items`}
            >
              Bag ({count})
              {count > 0 && <span className="h-1.5 w-1.5 rounded-full bg-hot" />}
            </button>
            <button
              onClick={() => setMenu((m) => !m)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/70 lg:hidden"
              aria-label="Menu"
              aria-expanded={menu}
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
        {menu && (
          <div className="glass-strong mt-2 rounded-3xl p-3 lg:hidden animate-fade-up">
            {[...LINKS, { href: "/faq", label: "FAQ & Delivery" }].map((l) => (
              <Link key={l.href} href={l.href} className="block rounded-2xl px-4 py-3 text-sm font-bold tracking-[0.12em] uppercase hover:bg-white/70">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
