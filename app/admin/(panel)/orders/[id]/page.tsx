import { notFound } from "next/navigation";
import { readDB } from "@/lib/store";
import OrderDetail from "@/components/admin/OrderDetail";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDB();
  const order = db.orders.find((o) => o.id === id);
  if (!order) notFound();
  const products = Object.fromEntries(
    order.items.map((i) => {
      const p = db.products.find((x) => x.id === i.productId);
      const c = p?.colors.find((x) => x.id === i.colorId);
      return [`${i.productId}|${i.colorId}`, c ? { hex: c.hex, print: c.print, printScale: p!.printScale } : null];
    }),
  );
  return <OrderDetail key={order.updatedAt} order={order} products={products} storeName={db.settings.storeName} />;
}
