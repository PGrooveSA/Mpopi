"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart, cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";
import TeeMockup from "./TeeMockup";

export default function CartDrawer({ freeDeliveryOver }: { freeDeliveryOver: number }) {
  const { items, open, setOpen, setQty, remove } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);
  if (!mounted) return null;

  const total = cartTotal(items);
  const toFree = freeDeliveryOver > 0 ? Math.max(0, freeDeliveryOver - total) : 0;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-ink/25 backdrop-blur-sm transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-label="Shopping cart"
        className={`glass-strong absolute top-0 right-0 flex h-full w-full max-w-md flex-col rounded-l-[2rem] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-display text-xl font-semibold">Your bag</h2>
          <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/70 hover:bg-white" aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>

        {freeDeliveryOver > 0 && items.length > 0 && (
          <div className="mx-6 mb-3 rounded-2xl bg-white/60 p-3 text-xs font-semibold text-ink-soft">
            {toFree > 0 ? (
              <>
                You&apos;re <span className="text-hot">{formatPrice(toFree)}</span> away from free delivery
              </>
            ) : (
              <span className="text-emerald-700">🎉 You qualify for free delivery</span>
            )}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-gradient-to-r from-hot to-sky transition-all" style={{ width: `${Math.min(100, (total / freeDeliveryOver) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/bear.png" alt="" className="mb-4 h-24 w-auto animate-float opacity-90" />
              <p className="font-display text-lg">Your bag is empty</p>
              <p className="mt-1 text-sm text-ink-soft">Find a tee that feels like you.</p>
              <Link href="/shop" onClick={() => setOpen(false)} className="btn-primary mt-6">
                Start shopping
              </Link>
            </div>
          ) : (
            items.map((i) => (
              <div key={i.key} className="flex gap-3 rounded-3xl bg-white/55 p-3">
                <Link href={`/product/${i.slug}?color=${i.colorId}`} onClick={() => setOpen(false)} className="w-20 shrink-0 rounded-2xl bg-gradient-to-br from-white to-white/40 p-1">
                  <TeeMockup hex={i.hex} print={i.print} shadow={false} />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{i.name}</p>
                      <p className="text-xs text-ink-soft">
                        {i.colorName} · Size {i.size}
                      </p>
                    </div>
                    <button onClick={() => remove(i.key)} className="text-ink-soft/70 hover:text-hot" aria-label={`Remove ${i.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-full bg-white/80">
                      <button onClick={() => setQty(i.key, i.qty - 1)} className="grid h-8 w-8 place-items-center" aria-label="Decrease quantity">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.key, i.qty + 1)}
                        disabled={i.qty >= i.maxQty}
                        className="grid h-8 w-8 place-items-center disabled:opacity-30"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-bold">{formatPrice(i.price * i.qty)}</span>
                  </div>
                  {i.qty >= i.maxQty && <p className="mt-1 text-[11px] font-semibold text-hot">Only {i.maxQty} in stock</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-white/70 p-6">
            <div className="mb-1 flex justify-between text-sm text-ink-soft">
              <span>Subtotal</span>
              <span className="font-display text-lg font-semibold text-ink">{formatPrice(total)}</span>
            </div>
            <p className="mb-4 text-xs text-ink-soft">Delivery is calculated at checkout. Payment is arranged on WhatsApp.</p>
            <Link href="/checkout" onClick={() => setOpen(false)} className="btn-primary w-full py-4">
              <ShoppingBag className="h-4 w-4" /> Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
