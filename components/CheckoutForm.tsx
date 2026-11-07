"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Lock, MessageCircle } from "lucide-react";
import type { DeliveryOption } from "@/lib/types";
import { useCart, cartTotal } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";
import TeeMockup from "./TeeMockup";

export default function CheckoutForm({ deliveryOptions, freeDeliveryOver }: { deliveryOptions: DeliveryOption[]; freeDeliveryOver: number }) {
  const router = useRouter();
  const { items, clear } = useCart();
  const [mounted, setMounted] = useState(false);
  const [deliveryId, setDeliveryId] = useState(deliveryOptions[0]?.id);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", note: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="glass mt-8 h-96 animate-pulse rounded-[2rem]" />;

  const delivery = deliveryOptions.find((d) => d.id === deliveryId);
  const subtotal = cartTotal(items);
  const free = freeDeliveryOver > 0 && subtotal >= freeDeliveryOver;
  const fee = free ? 0 : delivery?.price ?? 0;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (items.length === 0) {
    return (
      <div className="glass mt-8 rounded-[2rem] p-12 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/bear.png" alt="" className="mx-auto h-24 w-auto animate-float" />
        <p className="font-display mt-4 text-xl">Your bag is empty</p>
        <Link href="/shop" className="btn-primary mt-6">
          Browse tees
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryId,
          customer: form,
          items: items.map((i) => ({ productId: i.productId, colorId: i.colorId, size: i.size, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      try {
        sessionStorage.setItem(`mpopi-order-${data.id}`, data.whatsappUrl);
      } catch {}
      clear();
      router.push(`/order/${data.id}?go=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-6">
          <h2 className="font-display text-lg font-semibold">1. Your details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">
                Full name *
              </label>
              <input id="name" required minLength={2} className="input" value={form.name} onChange={set("name")} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="phone">
                WhatsApp number *
              </label>
              <input id="phone" required type="tel" className="input" placeholder="e.g. 082 123 4567" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </div>
            <div>
              <label className="label" htmlFor="email">
                Email (optional)
              </label>
              <input id="email" type="email" className="input" value={form.email} onChange={set("email")} autoComplete="email" />
            </div>
          </div>
        </section>

        <section className="glass rounded-[2rem] p-6">
          <h2 className="font-display text-lg font-semibold">2. Delivery</h2>
          <div className="mt-4 grid gap-3">
            {deliveryOptions.map((d) => (
              <label
                key={d.id}
                className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition ${deliveryId === d.id ? "border-hot bg-white/80" : "border-transparent bg-white/50 hover:bg-white/70"}`}
              >
                <input type="radio" name="delivery" value={d.id} checked={deliveryId === d.id} onChange={() => setDeliveryId(d.id)} className="accent-hot" />
                <div className="flex-1">
                  <p className="text-sm font-bold">{d.name}</p>
                  <p className="text-xs text-ink-soft">{d.description}</p>
                </div>
                <span className="text-sm font-bold">{free || !d.price ? "Free" : formatPrice(d.price)}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label className="label" htmlFor="address">
                {delivery?.requiresAddress ? "Street address *" : "Address / nearest PEP store"}
              </label>
              <input id="address" required={delivery?.requiresAddress} className="input" value={form.address} onChange={set("address")} autoComplete="street-address" />
            </div>
            <div>
              <label className="label" htmlFor="city">
                City / town {delivery?.requiresAddress && "*"}
              </label>
              <input id="city" required={delivery?.requiresAddress} className="input" value={form.city} onChange={set("city")} autoComplete="address-level2" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="note">
                Note (optional)
              </label>
              <textarea id="note" rows={2} className="input resize-none" value={form.note} onChange={set("note")} placeholder="Anything we should know?" />
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="glass-strong rounded-[2rem] p-6">
          <h2 className="font-display text-lg font-semibold">Order summary</h2>
          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {items.map((i) => (
              <div key={i.key} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 rounded-xl bg-white/70 p-0.5">
                  <TeeMockup hex={i.hex} print={i.print} shadow={false} />
                  <span className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{i.qty}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{i.name}</p>
                  <p className="text-xs text-ink-soft">
                    {i.colorName} · {i.size}
                  </p>
                </div>
                <span className="text-sm font-bold">{formatPrice(i.price * i.qty)}</span>
              </div>
            ))}
          </div>
          <dl className="mt-5 space-y-2 border-t border-white pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="font-semibold">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Delivery</dt>
              <dd className="font-semibold">{fee ? formatPrice(fee) : "Free"}</dd>
            </div>
            <div className="flex justify-between border-t border-white pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-display text-xl font-semibold">{formatPrice(subtotal + fee)}</dd>
            </div>
          </dl>
          {error && <p className="mt-4 rounded-2xl bg-hot/10 p-3 text-sm font-semibold text-hot-deep">{error}</p>}
          <button type="submit" disabled={busy} className="btn-whatsapp mt-5 w-full py-4 text-base">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-5 w-5" />}
            {busy ? "Placing order…" : "Send order on WhatsApp"}
          </button>
          <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            No payment is taken on this site. We&apos;ll confirm your order and send payment details on WhatsApp.
          </p>
        </div>
      </aside>
    </form>
  );
}
