import "server-only";
import { nanoid } from "nanoid";
import { ALL_SIZES, type DB, type Product, type Size, type ProductColor, type Variant } from "./types";
import { slugify } from "./shop";
import { str, num } from "./api";

const URL_RE = /^(\/[\w\-./]+|https:\/\/[\w\-./%?=&]+)$/;
const cleanUrl = (v: unknown) => {
  const s = str(v, 500);
  return URL_RE.test(s) ? s : "";
};

export function parseProduct(input: Record<string, unknown>, db: DB, existing?: Product): Product {
  const name = str(input.name, 120);
  if (!name) throw new Error("Product name is required.");
  const price = Math.round(num(input.price, -1));
  if (!(price > 0)) throw new Error("Price must be more than 0.");
  const collection = str(input.collection, 60);
  if (!db.collections.some((c) => c.slug === collection)) throw new Error("Please choose a collection.");

  const sizes = (Array.isArray(input.sizes) ? input.sizes : []).filter((s): s is Size => ALL_SIZES.includes(s as Size));
  const orderedSizes = ALL_SIZES.filter((s) => sizes.includes(s));
  if (!orderedSizes.length) throw new Error("Choose at least one size.");

  const colorsIn = Array.isArray(input.colors) ? input.colors : [];
  const colors: ProductColor[] = colorsIn.slice(0, 20).map((c: Record<string, unknown>) => {
    const hex = str(c.hex, 7);
    return {
      id: str(c.id, 40) || nanoid(8),
      name: str(c.name, 60) || "Colour",
      hex: /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#ffffff",
      print: cleanUrl(c.print),
      printBack: cleanUrl(c.printBack) || undefined,
      photos: (Array.isArray(c.photos) ? c.photos : []).map(cleanUrl).filter(Boolean).slice(0, 12),
    };
  });
  if (!colors.length) throw new Error("Add at least one colour.");

  const variantsIn = Array.isArray(input.variants) ? input.variants : [];
  const variants: Variant[] = [];
  for (const c of colors) {
    for (const s of orderedSizes) {
      const v = variantsIn.find((x: Record<string, unknown>) => x.colorId === c.id && x.size === s) as Record<string, unknown> | undefined;
      variants.push({ colorId: c.id, size: s, stock: Math.max(0, Math.min(99999, Math.floor(num(v?.stock, 0)))) });
    }
  }

  let slug = slugify(str(input.slug, 80) || name) || nanoid(6);
  const taken = (s: string) => db.products.some((p) => p.slug === s && p.id !== existing?.id);
  if (taken(slug)) {
    let i = 2;
    while (taken(`${slug}-${i}`)) i++;
    slug = `${slug}-${i}`;
  }

  const compare = Math.round(num(input.compareAtPrice, 0));
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? "p_" + nanoid(10),
    slug,
    name,
    collection,
    description: str(input.description, 3000),
    price,
    compareAtPrice: compare > price ? compare : undefined,
    sizes: orderedSizes,
    colors,
    variants,
    printScale: Math.min(1.2, Math.max(0.1, num(input.printScale, 0.7))),
    printOffsetY: Math.min(160, Math.max(-60, num(input.printOffsetY, 0))),
    backPrintScale: Math.min(1.2, Math.max(0.1, num(input.backPrintScale, 0.85))),
    featured: !!input.featured,
    isNew: !!input.isNew,
    status: input.status === "hidden" ? "hidden" : "active",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
