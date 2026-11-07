"use client";
import Link from "next/link";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import { formatPrice, isSoldOut, colorStock } from "@/lib/shop";
import TeeMockup from "./TeeMockup";

export default function ProductCard({ product, collectionName, index }: { product: PublicProduct; collectionName?: string; index?: number }) {
  const firstInStock = product.colors.find((c) => colorStock(product, c.id) > 0) ?? product.colors[0];
  const [colorId, setColorId] = useState(firstInStock?.id);
  const [hover, setHover] = useState(false);
  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0];
  const soldOut = isSoldOut(product);
  const hasBack = !!color?.printBack;
  if (!color) return null;

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-[2rem] p-2 transition duration-500"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Link href={`/product/${product.slug}?color=${color.id}`} className="relative block aspect-[4/4.6] overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/45 transition duration-500 group-hover:bg-white/70 group-hover:shadow-[0_20px_50px_-25px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-x-0 top-[6%] mx-6 h-[2px] rounded-full bg-ink/70" />
        <TeeMockup
          hex={color.hex}
          print={color.print}
          printBack={color.printBack}
          printScale={product.printScale}
          printOffsetY={product.printOffsetY}
          backPrintScale={product.backPrintScale}
          view={hover && hasBack ? "back" : "front"}
          hanger
          className={`sway relative h-full w-full origin-[50%_8%] px-3 pt-1 pb-2 ${soldOut ? "opacity-50 grayscale-[40%]" : ""}`}
        />
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {soldOut && <span className="chip bg-ink text-white">Sold out</span>}
          {!soldOut && product.isNew && <span className="chip bg-hot text-white">New</span>}
          {!soldOut && product.compareAtPrice && <span className="chip bg-white/90 text-hot">Sale</span>}
        </div>
        {hasBack && <span className="chip absolute right-3 bottom-3 bg-white/80 text-ink-soft">{hover ? "Back" : "Front"}</span>}
      </Link>

      <div className="flex flex-1 flex-col px-2 pt-4 pb-2">
        <p className="text-[11px] font-bold tracking-[0.18em] uppercase">
          {index !== undefined && <span className="mr-2 text-hot">{String(index + 1).padStart(2, "0")}</span>}
          <span className="text-ink-soft/80">{collectionName}</span>
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <Link href={`/product/${product.slug}?color=${color.id}`} className="font-display text-lg leading-snug font-semibold tracking-tight hover:text-hot">
            {product.name}
          </Link>
          <div className="text-right whitespace-nowrap">
            <p className="font-bold">{formatPrice(product.price)}</p>
            {product.compareAtPrice && <p className="text-xs text-ink-soft line-through">{formatPrice(product.compareAtPrice)}</p>}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5" role="radiogroup" aria-label="Colour">
            {product.colors.map((c) => {
              const out = colorStock(product, c.id) <= 0;
              return (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={c.id === color.id}
                  aria-label={`${c.name}${out ? " (sold out)" : ""}`}
                  title={`${c.name}${out ? " — sold out" : ""}`}
                  onClick={() => setColorId(c.id)}
                  className={`relative h-6 w-6 rounded-full border-2 transition ${c.id === color.id ? "scale-110 border-hot" : "border-white"}`}
                  style={{ background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}
                >
                  {out && <span className="absolute inset-0 m-auto h-[2px] w-full rotate-45 rounded bg-ink/60" />}
                </button>
              );
            })}
          </div>
          <Link
            href={`/fitting-room?product=${product.slug}&color=${color.id}`}
            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-bold text-ink transition hover:bg-hot hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5" /> Try on
          </Link>
        </div>
      </div>
    </div>
  );
}
