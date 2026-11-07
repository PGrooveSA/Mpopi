import Link from "next/link";
import { AlertTriangle, ArrowRight, PackageX, ReceiptText, Shirt, Wallet, Clock } from "lucide-react";
import { readDB } from "@/lib/store";
import { formatPrice, isSoldOut } from "@/lib/shop";
import StatusBadge from "@/components/admin/StatusBadge";

export default async function Dashboard() {
  const db = await readDB();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paidStatuses = ["paid", "shipped", "completed"];
  const revenue = db.orders.filter((o) => paidStatuses.includes(o.status) && new Date(o.createdAt) >= monthStart).reduce((n, o) => n + o.total, 0);
  const newOrders = db.orders.filter((o) => o.status === "new");
  const awaiting = db.orders.filter((o) => o.status === "awaiting_payment");
  const active = db.products.filter((p) => p.status === "active");
  const soldOut = db.products.filter((p) => isSoldOut(p) && p.status === "active");
  const low: { product: string; id: string; color: string; size: string; stock: number }[] = [];
  for (const p of active) {
    for (const v of p.variants) {
      if (v.stock > 0 && v.stock <= 2) low.push({ product: p.name, id: p.id, color: p.colors.find((c) => c.id === v.colorId)?.name ?? "", size: v.size, stock: v.stock });
    }
  }
  const whatsappMissing = db.settings.whatsappNumber.replace(/0/g, "").length < 3;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Hello 👋</h1>
      <p className="mt-1 text-sm text-ink-soft">Here&apos;s what&apos;s happening in your store.</p>

      {whatsappMissing && (
        <Link href="/admin/settings" className="mt-5 flex items-center gap-3 rounded-2xl bg-amber-100/80 p-4 text-sm font-semibold text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Set your WhatsApp number so orders reach your phone. <span className="ml-auto underline">Go to settings</span>
        </Link>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[
          { label: "New orders", value: newOrders.length, icon: ReceiptText, href: "/admin/orders?status=new", tone: "from-hot to-[#b54bc4]" },
          { label: "Awaiting payment", value: awaiting.length, icon: Clock, href: "/admin/orders?status=awaiting_payment", tone: "from-amber-400 to-orange-500" },
          { label: "Revenue this month", value: formatPrice(revenue), icon: Wallet, href: "/admin/orders?status=paid", tone: "from-emerald-400 to-teal-600" },
          { label: "Live products", value: active.length, icon: Shirt, href: "/admin/products", tone: "from-sky to-indigo-500" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="glass group rounded-[1.75rem] p-5 transition hover:-translate-y-0.5">
            <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${s.tone} text-white shadow-lg`}>
              <s.icon className="h-5 w-5" />
            </span>
            <p className="font-display mt-4 text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-semibold text-ink-soft">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="glass rounded-[1.75rem] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm font-bold text-hot">
              All orders <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {db.orders.length === 0 ? (
            <p className="rounded-2xl bg-white/50 p-6 text-center text-sm text-ink-soft">No orders yet. They&apos;ll appear here as soon as a customer checks out.</p>
          ) : (
            <ul className="divide-y divide-white/80">
              {db.orders.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {o.ref} · {o.customer.name}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {new Date(o.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })} · {o.items.reduce((n, i) => n + i.qty, 0)} items
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                    <span className="w-20 text-right text-sm font-bold">{formatPrice(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section className="glass rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <PackageX className="h-5 w-5 text-hot" />
              <h2 className="font-display text-lg font-semibold">Sold out</h2>
            </div>
            {soldOut.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">Nothing is completely sold out. 🎉</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-soft">
                  {soldOut.length} product{soldOut.length > 1 ? "s are" : " is"} sold out but still showing in the shop.
                </p>
                <ul className="mt-3 space-y-1 text-sm font-semibold">
                  {soldOut.map((p) => (
                    <li key={p.id}>
                      <Link href={`/admin/products/${p.id}`} className="hover:text-hot">
                        • {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/admin/products?filter=soldout" className="btn-dark mt-4 w-full">
                  Review & remove sold-out items
                </Link>
              </>
            )}
          </section>
          <section className="glass rounded-[1.75rem] p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Low stock</h2>
            {low.length === 0 ? (
              <p className="mt-3 text-sm text-ink-soft">All sizes are well stocked.</p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 text-sm">
                {low.map((l, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2">
                    <Link href={`/admin/products/${l.id}`} className="min-w-0 truncate font-semibold hover:text-hot">
                      {l.product} <span className="font-normal text-ink-soft">· {l.color} · {l.size}</span>
                    </Link>
                    <span className="ml-2 shrink-0 rounded-full bg-hot/15 px-2 py-0.5 text-xs font-bold text-hot-deep">{l.stock} left</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
