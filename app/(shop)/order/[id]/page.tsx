import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { readDB } from "@/lib/store";
import { formatPrice, orderMessage, whatsappLink, STATUS_LABEL } from "@/lib/shop";
import OpenWhatsApp from "@/components/OpenWhatsApp";

export const metadata: Metadata = { title: "Order placed", robots: { index: false } };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ go?: string }> }) {
  const [{ id }, { go }] = await Promise.all([params, searchParams]);
  const db = await readDB();
  const order = db.orders.find((o) => o.id === id);
  if (!order) notFound();
  const url = whatsappLink(db.settings.whatsappNumber, orderMessage(order, db.settings));
  const firstName = order.customer.name.split(" ")[0];

  return (
    <div className="container-x max-w-3xl pt-12">
      <div className="glass-strong relative overflow-hidden rounded-[2.5rem] p-8 text-center sm:p-12">
        <div className="absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-300/40 blur-3xl" />
        <CheckCircle2 className="relative mx-auto h-14 w-14 text-emerald-600" />
        <p className="eyebrow relative mt-4">Order {order.ref}</p>
        <h1 className="font-display relative mt-2 text-3xl font-bold sm:text-4xl">Thank you, {firstName}!</h1>
        <p className="relative mx-auto mt-3 max-w-md text-ink-soft">
          Your tees are reserved. <strong>Send the WhatsApp message</strong> so we can confirm your order and share payment details.
        </p>
        <OpenWhatsApp url={url} orderId={order.id} auto={go === "1"} />
        <p className="relative mt-3 text-xs text-ink-soft">Status: {STATUS_LABEL[order.status]}</p>
      </div>

      <div className="glass mt-6 rounded-[2rem] p-6">
        <h2 className="font-display text-lg font-semibold">Your order</h2>
        <ul className="mt-4 divide-y divide-white">
          {order.items.map((i, k) => (
            <li key={k} className="flex justify-between py-3 text-sm">
              <span>
                <Link href={`/product/${i.slug}`} className="font-bold hover:text-hot">
                  {i.name}
                </Link>{" "}
                <span className="text-ink-soft">
                  — {i.colorName} / {i.size} × {i.qty}
                </span>
              </span>
              <span className="font-semibold">{formatPrice(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 space-y-1 border-t border-white pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-soft">Delivery ({order.delivery.name})</span>
            <span>{order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center">
        <Link href="/shop" className="btn-glass">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
