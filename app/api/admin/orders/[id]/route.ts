import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mutate } from "@/lib/store";
import { adminRoute, bad, str, UserError } from "@/lib/api";
import { ORDER_STATUSES, type OrderStatus, type DB, type Order } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

function restock(db: DB, order: Order, sign: 1 | -1) {
  for (const i of order.items) {
    const v = db.products.find((p) => p.id === i.productId)?.variants.find((v) => v.colorId === i.colorId && v.size === i.size);
    if (v) v.stock = Math.max(0, v.stock + sign * i.qty);
  }
}

export const PATCH = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const order = await mutate((db) => {
      const o = db.orders.find((x) => x.id === id);
      if (!o) throw new UserError("Order not found.");
      if (body.status !== undefined) {
        const status = body.status as OrderStatus;
        if (!ORDER_STATUSES.includes(status)) throw new UserError("Unknown status.");
        // cancelling puts the stock back; re-opening a cancelled order takes it again
        if (status === "cancelled" && o.status !== "cancelled") restock(db, o, 1);
        if (status !== "cancelled" && o.status === "cancelled") restock(db, o, -1);
        o.status = status;
      }
      if (body.adminNote !== undefined) o.adminNote = str(body.adminNote, 2000, true) || undefined;
      o.updatedAt = new Date().toISOString();
      return o;
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ order });
  } catch (e) {
    if (e instanceof UserError) return bad(e.message);
    throw e;
  }
});

export const DELETE = adminRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const ok = await mutate((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) return false;
    // an unpaid order that is deleted releases its reserved stock
    if (o.status === "new" || o.status === "awaiting_payment") restock(db, o, 1);
    db.orders = db.orders.filter((x) => x.id !== id);
    return true;
  });
  if (!ok) return bad("Order not found.", 404);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
});
