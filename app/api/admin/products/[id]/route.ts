import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mutate } from "@/lib/store";
import { adminRoute, bad, UserError } from "@/lib/api";
import { parseProduct } from "@/lib/product-input";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request.");
  try {
    const product = await mutate((db) => {
      const idx = db.products.findIndex((p) => p.id === id);
      if (idx < 0) throw new UserError("Product not found.");
      const p = parseProduct(body, db, db.products[idx]);
      db.products[idx] = p;
      return p;
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof UserError) return bad(e.message);
    throw e;
  }
});

/** Quick toggles: { status: "active" | "hidden" } */
export const PATCH = adminRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const ok = await mutate((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) return false;
    if (body.status === "active" || body.status === "hidden") p.status = body.status;
    if (typeof body.featured === "boolean") p.featured = body.featured;
    p.updatedAt = new Date().toISOString();
    return true;
  });
  if (!ok) return bad("Product not found.", 404);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
});

export const DELETE = adminRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const ok = await mutate((db) => {
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== id);
    return db.products.length < before;
  });
  if (!ok) return bad("Product not found.", 404);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
});
