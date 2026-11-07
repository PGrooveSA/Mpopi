"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, Loader2, MessageCircle, Phone, Trash2 } from "lucide-react";
import type { Order, OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";
import { formatPrice, STATUS_LABEL, whatsappLink } from "@/lib/shop";
import TeeMockup from "../TeeMockup";
import { Card, PageHeader, useToast } from "./ui";

const NEXT_MESSAGE: Partial<Record<OrderStatus, (o: Order, store: string) => string>> = {
  awaiting_payment: (o, s) =>
    `Hi ${o.customer.name.split(" ")[0]}! Thank you for your ${s} order ${o.ref} 💗\n\nYour total is ${formatPrice(o.total)}. Here are our payment details:\n\n[add your bank details here]\n\nPlease use ${o.ref} as the reference and send proof of payment here.`,
  paid: (o) => `Hi ${o.customer.name.split(" ")[0]}! We've received your payment for ${o.ref} 🎉 We'll let you know as soon as it ships.`,
  shipped: (o) => `Hi ${o.customer.name.split(" ")[0]}! Your order ${o.ref} is on its way 🚚 [add tracking number here]`,
};

export default function OrderDetail({
  order,
  products,
  storeName,
}: {
  order: Order;
  products: Record<string, { hex: string; print: string; printScale: number } | null>;
  storeName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [status, setStatus] = useState(order.status);
  const [note, setNote] = useState(order.adminNote ?? "");
  const [busy, setBusy] = useState(false);
  const store = storeName.replace(/…|\.\.\./g, "");

  const patch = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.show(ok);
      router.refresh();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not update", "err");
      setStatus(order.status);
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (s: OrderStatus) => {
    if (s === "cancelled" && !confirm("Cancel this order? The items go back into stock.")) return;
    setStatus(s);
    patch({ status: s }, s === "cancelled" ? "Order cancelled — stock restored" : `Marked as ${STATUS_LABEL[s].toLowerCase()}`);
  };

  const del = async () => {
    if (!confirm(`Delete order ${order.ref} permanently?`)) return;
    const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/admin/orders");
      router.refresh();
    }
  };

  const template = NEXT_MESSAGE[status === "new" ? "awaiting_payment" : status];

  return (
    <div>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Orders
      </Link>
      <PageHeader title={`Order ${order.ref}`} subtitle={`Placed ${new Date(order.createdAt).toLocaleString("en-ZA", { dateStyle: "long", timeStyle: "short" })}`}>
        <button onClick={del} className="btn-glass text-hot-deep">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-display mb-3 font-semibold">Items</h2>
            <ul className="divide-y divide-white/80">
              {order.items.map((i, k) => {
                const look = products[`${i.productId}|${i.colorId}`];
                return (
                  <li key={k} className="flex items-center gap-3 py-3">
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-white/70 p-0.5">{look && <TeeMockup hex={look.hex} print={look.print} printScale={look.printScale} shadow={false} />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{i.name}</p>
                      <p className="text-xs text-ink-soft">
                        {i.colorName} · Size {i.size} · {formatPrice(i.price)} each
                      </p>
                    </div>
                    <span className="text-sm font-semibold">× {i.qty}</span>
                    <span className="w-20 text-right font-bold">{formatPrice(i.price * i.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-white pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery — {order.delivery.name}</dt>
                <dd>{order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}</dd>
              </div>
              <div className="flex justify-between text-base font-bold">
                <dt>Total</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-display mb-3 font-semibold">Customer</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Name" value={order.customer.name} />
              <Info label="WhatsApp" value={order.customer.phone} />
              {order.customer.email && <Info label="Email" value={order.customer.email} />}
              <Info label="Delivery" value={order.delivery.name} />
              {(order.customer.address || order.customer.city) && <Info label="Address" value={[order.customer.address, order.customer.city].filter(Boolean).join(", ")} />}
              {order.customer.note && <Info label="Customer note" value={order.customer.note} />}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={whatsappLink(order.customer.phone, `Hi ${order.customer.name.split(" ")[0]}! This is ${store} about your order ${order.ref}.`)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
              </a>
              <a href={`tel:${order.customer.phone}`} className="btn-glass">
                <Phone className="h-4 w-4" /> Call
              </a>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display mb-3 font-semibold">Status</h2>
            <div className="grid grid-cols-2 gap-2">
              {ORDER_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={busy}
                  onClick={() => s !== status && changeStatus(s)}
                  className={`rounded-2xl px-3 py-2.5 text-sm font-bold transition ${s === status ? (s === "cancelled" ? "bg-ink/60 text-white" : "bg-ink text-white shadow-lg") : "bg-white/60 hover:bg-white"}`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {busy && <Loader2 className="mt-3 h-4 w-4 animate-spin text-hot" />}
            <p className="mt-3 text-xs text-ink-soft">Stock was reserved when the order was placed. Cancelling returns it to stock automatically.</p>
          </Card>

          {template && (
            <Card>
              <h2 className="font-display mb-2 font-semibold">Quick message</h2>
              <p className="mb-3 text-xs text-ink-soft">A ready-made WhatsApp message for the next step. Edit it before sending.</p>
              <pre className="rounded-2xl bg-white/60 p-3 font-sans text-xs whitespace-pre-wrap">{template(order, store)}</pre>
              <div className="mt-3 flex gap-2">
                <a href={whatsappLink(order.customer.phone, template(order, store))} target="_blank" rel="noopener noreferrer" className="btn-whatsapp flex-1 !px-4">
                  <MessageCircle className="h-4 w-4" /> Open in WhatsApp
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(template(order, store));
                    toast.show("Copied");
                  }}
                  className="btn-glass !px-4"
                  aria-label="Copy message"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-display mb-2 font-semibold">Private note</h2>
            <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid via EFT on Monday, tracking #…" />
            <button disabled={busy || note === (order.adminNote ?? "")} onClick={() => patch({ adminNote: note }, "Note saved")} className="btn-dark mt-3 w-full">
              Save note
            </button>
          </Card>
        </div>
      </div>
      {toast.node}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/50 px-4 py-3">
      <p className="text-[11px] font-bold tracking-wide text-ink-soft uppercase">{label}</p>
      <p className="mt-0.5 font-semibold break-words">{value}</p>
    </div>
  );
}
