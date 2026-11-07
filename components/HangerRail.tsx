"use client";
import Link from "next/link";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import { formatPrice, isSoldOut } from "@/lib/shop";
import TeeMockup from "./TeeMockup";

/** Studio clothes rail: tees hang from a bar on hangers and sway on hover. */
export default function HangerRail({ products }: { products: PublicProduct[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * (scroller.current.clientWidth * 0.6), behavior: "smooth" });

  return (
    <div className="relative">
      {/* the rail */}
      <div className="pointer-events-none absolute top-[30px] right-0 left-0 z-10 px-2 sm:px-6">
        <div className="relative h-[3px] rounded-full bg-ink/80">
          <span className="absolute -top-3 left-0 h-7 w-[3px] rounded-full bg-ink/80" />
          <span className="absolute -top-3 right-0 h-7 w-[3px] rounded-full bg-ink/80" />
        </div>
      </div>
      <button
        onClick={() => scroll(-1)}
        className="glass-strong absolute top-1/2 -left-1 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full sm:grid"
        aria-label="Previous"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => scroll(1)}
        className="glass-strong absolute top-1/2 -right-1 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full sm:grid"
        aria-label="Next"
      >
        <ArrowRight className="h-4 w-4" />
      </button>
      <div ref={scroller} className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 pt-2 pb-4 sm:gap-6 sm:px-10">
        {products.map((p, i) => {
          const c = p.colors[0];
          const sold = isSoldOut(p);
          return (
            <Link key={p.id} href={`/product/${p.slug}`} className="group w-[72%] shrink-0 snap-start min-[480px]:w-[44%] md:w-[30%] lg:w-[23%]">
              <div className="sway origin-[50%_6%]">
                <TeeMockup
                  hex={c.hex}
                  print={c.print}
                  printBack={c.printBack}
                  printScale={p.printScale}
                  printOffsetY={p.printOffsetY}
                  backPrintScale={p.backPrintScale}
                  hanger
                  className={`w-full transition duration-500 group-hover:-translate-y-1 ${sold ? "opacity-60 grayscale-[30%]" : ""}`}
                />
              </div>
              <div className="mt-3 px-2">
                <p className="text-[11px] font-bold tracking-[0.18em] text-hot">{String(i + 1).padStart(2, "0")}</p>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold tracking-tight group-hover:text-hot">{p.name}</h3>
                  <span className="text-sm font-semibold whitespace-nowrap">{sold ? "Sold out" : formatPrice(p.price)}</span>
                </div>
                <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-ink-soft uppercase">{p.colors.map((x) => x.name).join(" / ")}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
