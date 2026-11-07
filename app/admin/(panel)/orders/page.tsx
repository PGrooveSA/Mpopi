import Link from "next/link";
import { readDB } from "@/lib/store";
import { formatPrice, STATUS_LABEL } from "@/lib/shop";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";
import StatusBadge from "@/components/admin/StatusBadge";
import { PageHeader } from "@/components/admin/ui";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status, q } = await searchParams;
  const db = await readDB();
  let orders = db.orders;
  if (status && ORDER_STATUSES.includes(status as OrderStatus)) orders = orders.filter((o) => o.status === status);
  if (q) {
    const s = q.toLowerCase();
    orders = orders.filter((o) => o.ref.toLowerCase().includes(s) || o.customer.name.toLowerCase().includes(s) || o.customer.phone.includes(s));
  }
  const count = (s: OrderStatus) => db.orders.filter((o) => o.status === s).length;

  return (
    <div>
      <PageHeader title="Orders" subtitle="Orders arrive here the moment a customer checks out, even before they send the WhatsApp message." />
      <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-[1.5rem] p-2">
        <Link href="/admin/orders" className={`rounded-full px-4 py-2 text-sm font-semibold ${!status ? "bg-ink text-white" : "text-ink-soft hover:bg-white/70"}`}>
          All <span className="opacity-60">{db.orders.length}</span>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`rounded-full px-4 py-2 text-sm font-semibold ${status === s ? "bg-ink text-white" : "text-ink-soft hover:bg-white/70"}`}>
            {STATUS_LABEL[s]} <span className="opacity-60">{count(s)}</span>
          </Link>
        ))}
        <form className="ml-auto w-full sm:w-64">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search ref, name or phone" className="input !rounded-full !py-2" />
        </form>
      </div>
      <div className="glass overflow-hidden rounded-[1.75rem]">
        {orders.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-soft">No orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr className="border-b border-white/80">
                  <th className="p-4 font-semibold">Order</th>
                  <th className="p-4 font-semibold">Customer</th>
                  <th className="p-4 font-semibold">Items</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/80">
                {orders.map((o) => (
                  <tr key={o.id} className="transition hover:bg-white/40">
                    <td className="p-4">
                      <Link href={`/admin/orders/${o.id}`} className="font-bold hover:text-hot">
                        {o.ref}
                      </Link>
                      <p className="text-xs text-ink-soft">{new Date(o.createdAt).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold">{o.customer.name}</p>
                      <p className="text-xs text-ink-soft">{o.customer.phone}</p>
                    </td>
                    <td className="p-4 text-ink-soft">
                      {o.items.reduce((n, i) => n + i.qty, 0)} × {o.items.length === 1 ? o.items[0].name : `${o.items.length} styles`}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="p-4 text-right font-bold">{formatPrice(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
