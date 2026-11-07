import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mutate } from "@/lib/store";
import { adminRoute, bad } from "@/lib/api";
import { isSoldOut } from "@/lib/shop";

/**
 * Remove sold-out items from the shop.
 * body: { action: "hide" | "delete", scope: "products" | "colours" }
 *  - products: every product with no stock left at all
 *  - colours: also removes individual colours that are completely sold out
 */
export const POST = adminRoute(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const action = body.action === "delete" ? "delete" : body.action === "hide" ? "hide" : null;
  if (!action) return bad("Choose hide or delete.");
  const scope = body.scope === "colours" ? "colours" : "products";

  const result = await mutate((db) => {
    let products = 0;
    let colours = 0;
    if (scope === "colours") {
      for (const p of db.products) {
        if (isSoldOut(p)) continue; // whole product handled below
        const empty = p.colors.filter((c) => p.variants.filter((v) => v.colorId === c.id).every((v) => v.stock <= 0));
        if (empty.length && empty.length < p.colors.length) {
          const ids = new Set(empty.map((c) => c.id));
          p.colors = p.colors.filter((c) => !ids.has(c.id));
          p.variants = p.variants.filter((v) => !ids.has(v.colorId));
          p.updatedAt = new Date().toISOString();
          colours += empty.length;
        }
      }
    }
    const soldOut = db.products.filter((p) => isSoldOut(p) && (action === "delete" || p.status === "active"));
    products = soldOut.length;
    if (action === "delete") {
      const ids = new Set(soldOut.map((p) => p.id));
      db.products = db.products.filter((p) => !ids.has(p.id));
    } else {
      soldOut.forEach((p) => (p.status = "hidden"));
    }
    return { products, colours };
  });
  revalidatePath("/", "layout");
  return NextResponse.json(result);
});
