"use client";
import { useMemo, useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { Collection, PublicProduct, Size } from "@/lib/types";
import { ALL_SIZES } from "@/lib/types";
import { isSoldOut, stockOf } from "@/lib/shop";
import ProductCard from "./ProductCard";

type Sort = "featured" | "new" | "low" | "high";

export default function ShopGrid({
  products,
  collections,
  initialCollection,
}: {
  products: PublicProduct[];
  collections: Collection[];
  initialCollection: string;
}) {
  const [collection, setCollection] = useState(initialCollection);
  const [size, setSize] = useState<Size | "all">("all");
  const [colour, setColour] = useState<string>("all");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("featured");
  useEffect(() => setCollection(initialCollection), [initialCollection]);

  const colours = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => m.set(c.name, c.hex)));
    return [...m.entries()];
  }, [products]);

  const list = useMemo(() => {
    let l = products.filter((p) => collection === "all" || p.collection === collection);
    if (colour !== "all") l = l.filter((p) => p.colors.some((c) => c.name === colour));
    if (size !== "all")
      l = l.filter((p) => p.sizes.includes(size) && p.colors.some((c) => (colour === "all" || c.name === colour) && stockOf(p, c.id, size) > 0));
    if (inStock) l = l.filter((p) => !isSoldOut(p));
    const sorted = [...l];
    if (sort === "low") sorted.sort((a, b) => a.price - b.price);
    if (sort === "high") sorted.sort((a, b) => b.price - a.price);
    if (sort === "new") sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    if (sort === "featured") sorted.sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)) || Number(b.featured) - Number(a.featured));
    return sorted;
  }, [products, collection, colour, size, inStock, sort]);

  const pickCollection = (slug: string) => {
    setCollection(slug);
    // filtering happens in the browser; just keep the URL shareable without re-fetching the page
    window.history.replaceState(window.history.state, "", slug === "all" ? "/shop" : `/shop?collection=${slug}`);
  };

  const pill = (active: boolean) =>
    `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${active ? "bg-ink text-white shadow-lg" : "bg-white/60 text-ink-soft hover:bg-white"}`;

  return (
    <>
      <div className="glass sticky top-[92px] z-30 mt-6 rounded-[1.75rem] p-3 sm:top-[104px]">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          <button className={pill(collection === "all")} onClick={() => pickCollection("all")}>
            All
          </button>
          {collections.map((c) => (
            <button key={c.slug} className={pill(collection === c.slug)} onClick={() => pickCollection(c.slug)}>
              {c.name}
            </button>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-ink/10" />
          <select value={size} onChange={(e) => setSize(e.target.value as Size | "all")} className="rounded-full bg-white/60 px-4 py-2 text-sm font-semibold outline-none" aria-label="Filter by size">
            <option value="all">Any size</option>
            {ALL_SIZES.map((s) => (
              <option key={s} value={s}>
                Size {s}
              </option>
            ))}
          </select>
          <select value={colour} onChange={(e) => setColour(e.target.value)} className="rounded-full bg-white/60 px-4 py-2 text-sm font-semibold outline-none" aria-label="Filter by colour">
            <option value="all">Any colour</option>
            {colours.map(([name]) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold whitespace-nowrap">
            <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="accent-hot" /> In stock
          </label>
          <div className="ml-auto flex items-center gap-2 pl-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-soft" />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-full bg-white/60 px-4 py-2 text-sm font-semibold outline-none" aria-label="Sort">
              <option value="featured">Featured</option>
              <option value="new">Newest</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
        </div>
      </div>

      <p className="mt-6 mb-4 px-2 text-sm text-ink-soft">
        {list.length} {list.length === 1 ? "tee" : "tees"}
      </p>
      {list.length === 0 ? (
        <div className="glass rounded-[2rem] p-12 text-center">
          <p className="font-display text-lg">Nothing matches those filters</p>
          <button
            className="btn-glass mt-4"
            onClick={() => {
              setSize("all");
              setColour("all");
              setInStock(false);
              pickCollection("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p, i) => (
            <ProductCard key={p.id} index={i} product={p} collectionName={collections.find((c) => c.slug === p.collection)?.name} />
          ))}
        </div>
      )}
    </>
  );
}
