import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mutate } from "@/lib/store";
import { adminRoute, bad, UserError } from "@/lib/api";
import { parseProduct } from "@/lib/product-input";

export const POST = adminRoute(async (req: Request) => {
  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request.");
  try {
    const product = await mutate((db) => {
      const p = parseProduct(body, db);
      db.products.unshift(p);
      return p;
    });
    revalidatePath("/", "layout");
    return NextResponse.json({ product });
  } catch (e) {
    if (e instanceof UserError) return bad(e.message);
    throw e;
  }
});
