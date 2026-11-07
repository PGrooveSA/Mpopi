import "server-only";
import { readDB } from "./store";
import { isSoldOut, toPublic } from "./shop";

export async function getStore() {
  const db = await readDB();
  return { settings: db.settings, collections: db.collections };
}

/** Products visible in the shop (active, and not sold out when the admin hides sold-out items). */
export async function getShopProducts() {
  const db = await readDB();
  return db.products
    .filter((p) => p.status === "active" && !(db.settings.hideSoldOut && isSoldOut(p)))
    .map(toPublic);
}

export async function getProduct(slug: string) {
  const db = await readDB();
  const p = db.products.find((x) => x.slug === slug && x.status === "active");
  return p ? toPublic(p) : null;
}
