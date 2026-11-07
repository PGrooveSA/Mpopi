"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Rotate3d } from "lucide-react";
import type { PublicProduct } from "@/lib/types";
import TeeMockup from "./TeeMockup";

/** Home page "Try it on" block — interactive preview that leads into the 3D fitting room. */
export default function TryOnTeaser({ products }: { products: PublicProduct[] }) {
  const [pi, setPi] = useState(0);
  const p = products[pi] ?? products[0];
  const [ci, setCi] = useState(0);
  const [view, setView] = useState<"front" | "back">("front");
  const [fit, setFit] = useState<"Regular" | "Oversized">("Regular");
  if (!p) return null;
  const c = p.colors[ci] ?? p.colors[0];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.2fr_1fr]">
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">04 / Virtual fitting room</p>
        <h2 className="font-display mt-3 text-5xl font-bold tracking-tight text-white uppercase sm:text-6xl">
          Try it on<span className="text-hot">.</span>
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
          Pick a tee, choose a body close to yours and spin it 360°. Switch sizes and see instantly whether it fits snug, regular or oversized.
        </p>
        <p className="mt-8 text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">Colour</p>
        <div className="mt-3 flex gap-2">
          {p.colors.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setCi(i)}
              aria-label={x.name}
              className={`h-8 w-8 rounded-full border-2 transition ${i === ci ? "scale-110 border-hot" : "border-white/30"}`}
              style={{ background: x.hex }}
            />
          ))}
        </div>
        <p className="mt-6 text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">Fit</p>
        <div className="mt-3 inline-flex rounded-full bg-white/10 p-1">
          {(["Regular", "Oversized"] as const).map((f) => (
            <button key={f} onClick={() => setFit(f)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${fit === f ? "bg-white text-night" : "text-white/70"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-x-10 bottom-4 h-10 rounded-[100%] bg-black/60 blur-2xl" />
        <div className="absolute inset-0 rounded-full bg-white/5 blur-3xl" />
        <TeeMockup
          key={`${p.id}-${c.id}-${view}`}
          hex={c.hex}
          print={c.print}
          printBack={c.printBack}
          printScale={p.printScale}
          printOffsetY={p.printOffsetY}
          backPrintScale={p.backPrintScale}
          view={view}
          shadow={false}
          className={`relative mx-auto w-full max-w-md animate-fade-up drop-shadow-[0_30px_40px_rgba(0,0,0,0.6)] transition-transform duration-500 ${fit === "Oversized" ? "scale-[1.08]" : ""}`}
        />
        <span className="glass-dark absolute top-4 left-4 rounded-full px-3 py-1.5 text-[11px] font-bold text-white">
          <Rotate3d className="mr-1 inline h-3.5 w-3.5 text-hot" /> 360° in the fitting room
        </span>
      </div>

      <div className="glass-dark rounded-[2rem] p-5 text-white">
        <p className="text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">View</p>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-white/10 p-1">
          {(["front", "back"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full py-1.5 text-xs font-bold capitalize ${view === v ? "bg-white text-night" : "text-white/70"}`}>
              {v}
            </button>
          ))}
        </div>
        <p className="mt-5 text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">Tee</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {products.slice(0, 6).map((x, i) => (
            <button
              key={x.id}
              onClick={() => {
                setPi(i);
                setCi(0);
              }}
              className={`rounded-2xl bg-white/5 p-1 transition ${i === pi ? "ring-2 ring-hot" : "opacity-70 hover:opacity-100"}`}
              aria-label={x.name}
            >
              <TeeMockup hex={x.colors[0].hex} print={x.colors[0].print} printScale={x.printScale} printOffsetY={x.printOffsetY} shadow={false} />
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-2xl bg-white/5 p-3 text-xs">
          <p className="text-white/50">Your look</p>
          <p className="mt-0.5 font-semibold">
            {c.name} · {fit} · {p.name}
          </p>
        </div>
        <Link href={`/fitting-room?product=${p.slug}&color=${c.id}&size=${fit === "Oversized" ? "XL" : "M"}`} className="btn-primary mt-4 w-full">
          Try it on in 3D <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
