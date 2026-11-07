"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Hand, Pause, Play, Shirt } from "lucide-react";
import type { PublicProduct, Size, SizeChartRow } from "@/lib/types";
import { ALL_SIZES } from "@/lib/types";
import { BODY_CHEST, fitFor, recommendSize, type BodyType } from "@/lib/fit";
import { colorStock, formatPrice, stockOf } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import TeeMockup from "../TeeMockup";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <p className="text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase">Steaming your tee…</p>
    </div>
  ),
});

type Fit = "Regular" | "Oversized";
type View = "Front" | "Side" | "Back";
const VIEW_ANGLE: Record<View, number> = { Front: 0, Side: -Math.PI / 2, Back: Math.PI };

/** A numbered control row, styled like a studio spec sheet. */
function Row({ n, label, value, children }: { n: string; label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-ink/10 pt-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-[11px] tracking-[0.16em] uppercase">
        <span className="whitespace-nowrap">
          <span className="mr-2 text-ink-soft/70">{n}</span>
          <span className="font-bold">{label}</span>
        </span>
        {value && <span className="truncate tracking-normal text-ink-soft normal-case">{value}</span>}
      </div>
      {children}
    </div>
  );
}

const segment = (active: boolean) =>
  `flex-1 whitespace-nowrap rounded-full px-3 py-2 text-sm transition ${active ? "bg-white font-semibold text-ink shadow-[0_6px_18px_-8px_rgba(0,0,0,0.35)]" : "text-ink-soft hover:text-ink"}`;

function isLight(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 200;
}

export default function FittingRoom({
  products,
  sizeChart,
  initial,
}: {
  products: PublicProduct[];
  sizeChart: SizeChartRow[];
  initial: { product?: string; color?: string; size?: string };
}) {
  const startProduct = products.find((p) => p.slug === initial.product) ?? products[0];
  const [productId, setProductId] = useState(startProduct?.id);
  const product = products.find((p) => p.id === productId) ?? products[0];
  const [colorId, setColorId] = useState(product?.colors.find((c) => c.id === initial.color)?.id ?? product?.colors[0]?.id);
  const color = product?.colors.find((c) => c.id === colorId) ?? product?.colors[0];

  const [fit, setFit] = useState<Fit>("Regular");
  const [bodyType, setBodyType] = useState<BodyType>("female");
  const [bodySize, setBodySize] = useState<Size>("M");
  const [override, setOverride] = useState<Size | null>((ALL_SIZES as readonly string[]).includes(initial.size ?? "") ? (initial.size as Size) : null);
  const [view, setView] = useState<View>("Front");
  const [autoRotate, setAutoRotate] = useState(false);
  const [added, setAdded] = useState(false);
  const rotation = useRef(0);
  const drag = useRef<{ x: number; r: number } | null>(null);
  const add = useCart((s) => s.add);

  const recommended = product ? recommendSize(sizeChart, product.sizes, bodyType, bodySize, fit === "Oversized" ? "oversized" : "regular") : undefined;
  const shirtSize: Size = override ?? recommended ?? "M";
  const garment = sizeChart.find((r) => r.size === shirtSize) ?? sizeChart[2];
  const fitResult = fitFor(garment, bodyType, bodySize);
  const stock = product && color ? stockOf(product, color.id, shirtSize) : 0;

  // keep the URL shareable
  // Update the address bar in the browser only (no server round-trip), keyed on plain values so it
  // can never loop. Using router.replace here re-fetched the page and re-triggered this effect.
  const productSlug = product?.slug;
  const colorKey = color?.id;
  useEffect(() => {
    if (!productSlug || !colorKey) return;
    const url = `/fitting-room?${new URLSearchParams({ product: productSlug, color: colorKey, size: shirtSize })}`;
    if (window.location.pathname + window.location.search !== url) window.history.replaceState(window.history.state, "", url);
  }, [productSlug, colorKey, shirtSize]);

  // keep the view label in sync while dragging / spinning
  useEffect(() => {
    const t = setInterval(() => {
      const a = ((rotation.current % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const v: View = a < Math.PI / 4 || a > (Math.PI * 7) / 4 ? "Front" : a > (Math.PI * 3) / 4 && a < (Math.PI * 5) / 4 ? "Back" : "Side";
      setView((prev) => (prev === v ? prev : v));
    }, 120);
    return () => clearInterval(t);
  }, []);

  const sceneShirt = useMemo(
    () =>
      color && product && garment
        ? {
            chest: garment.chest,
            length: garment.length,
            sleeve: garment.sleeve,
            hex: color.hex,
            print: color.print,
            printBack: color.printBack,
            printScale: product.printScale,
            printOffsetY: product.printOffsetY,
            backPrintScale: product.backPrintScale,
          }
        : null,
    [color, product, garment],
  );
  // the ghost tee always hangs straight like a product shot; only the chest size changes with the body
  const sceneBody = useMemo(() => ({ type: "male" as BodyType, chest: BODY_CHEST[bodyType][bodySize], height: 170, skin: "#000000" }), [bodyType, bodySize]);

  if (!product || !color || !sceneShirt) return <div className="rounded-[2rem] bg-white/50 p-12 text-center">No tees available right now.</div>;

  const goView = (v: View) => {
    setAutoRotate(false);
    const target = VIEW_ANGLE[v];
    const turns = Math.round((rotation.current - target) / (Math.PI * 2));
    rotation.current = target + turns * Math.PI * 2;
    setView(v);
  };

  const pickProduct = (p: PublicProduct) => {
    setProductId(p.id);
    setColorId((p.colors.find((c) => c.name === color.name) ?? p.colors.find((c) => colorStock(p, c.id) > 0) ?? p.colors[0]).id);
    setOverride(null);
  };

  const nextColor = product.colors[(product.colors.findIndex((c) => c.id === color.id) + 1) % product.colors.length];

  const onAdd = () => {
    if (stock <= 0) return;
    add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      colorId: color.id,
      colorName: color.name,
      hex: color.hex,
      print: color.print,
      size: shirtSize,
      price: product.price,
      maxQty: stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-[#efeeec] via-[#eae9e7] to-[#e2e1de] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      {/* colour quick-switch, like the “I wanna black” pill */}
      {product.colors.length > 1 && (
        <button
          onClick={() => setColorId(nextColor.id)}
          className="absolute top-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold tracking-[0.12em] whitespace-nowrap uppercase shadow-[0_10px_30px_-12px_rgba(0,0,0,0.35)] transition hover:scale-105"
        >
          I wanna {nextColor.name.split(" ").pop()}
          <Shirt className="h-4 w-4" style={{ color: isLight(nextColor.hex) ? "#1d1b1c" : nextColor.hex, fill: nextColor.hex }} />
        </button>
      )}

      <div className="grid grid-cols-1 gap-2 lg:min-h-[calc(100vh-150px)] lg:grid-cols-[290px_minmax(0,1fr)_310px] xl:grid-cols-[330px_minmax(0,1fr)_340px]">
        {/* LEFT */}
        <div className="flex flex-col justify-center px-6 pt-20 pb-2 sm:px-10 lg:py-10 lg:pr-0">
          <p className="text-[11px] tracking-[0.2em] text-ink-soft uppercase">MPOPI… / Fitting room</p>
          <h1 className="font-display mt-3 text-5xl font-normal tracking-tight uppercase sm:text-6xl">Try it on</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">
            One tee, your way. Change the colour, fit or angle and watch it move. Pick your size and we&apos;ll show how it hangs.
          </p>

          <div className="mt-8 space-y-5">
            <Row n="01" label="Colour" value={color.name}>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((c) => {
                  const out = colorStock(product, c.id) <= 0;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setColorId(c.id)}
                      aria-label={`${c.name}${out ? " (sold out)" : ""}`}
                      aria-pressed={c.id === color.id}
                      title={c.name}
                      className={`relative grid h-12 w-12 place-items-center rounded-full transition ${c.id === color.id ? "ring-2 ring-ink/80 ring-offset-2 ring-offset-[#ebeae8]" : "hover:scale-105"}`}
                    >
                      <span
                        className="h-10 w-10 rounded-full shadow-[inset_0_-4px_8px_rgba(0,0,0,0.25),0_6px_14px_-6px_rgba(0,0,0,0.5)]"
                        style={{ background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.75), transparent 45%), ${c.hex}` }}
                      />
                      {out && <span className="absolute h-[2px] w-9 rotate-45 rounded bg-ink/50" />}
                    </button>
                  );
                })}
              </div>
            </Row>

            <Row n="02" label="Fit" value={fitResult.label}>
              <div className="flex rounded-full bg-black/[0.05] p-1">
                {(["Regular", "Oversized"] as Fit[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFit(f);
                      setOverride(null);
                    }}
                    className={segment(fit === f && !override)}
                  >
                    <Shirt className={`mr-1.5 inline h-3.5 w-3.5 ${f === "Oversized" ? "scale-125" : ""}`} />
                    {f}
                  </button>
                ))}
              </div>
            </Row>

            <Row n="03" label="Your size" value={`${bodyType === "female" ? "Her" : "Him"} · chest ≈ ${BODY_CHEST[bodyType][bodySize]} cm`}>
              <div className="mb-2 flex rounded-full bg-black/[0.05] p-1">
                {(["female", "male"] as BodyType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setBodyType(t);
                      setOverride(null);
                    }}
                    className={segment(bodyType === t)}
                  >
                    {t === "female" ? "Her" : "Him"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {ALL_SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setBodySize(s);
                      setOverride(null);
                    }}
                    className={`rounded-full py-1.5 text-[11px] font-bold transition ${bodySize === s ? "bg-ink text-white" : "text-ink-soft hover:bg-white/70"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Row>
          </div>
        </div>

        {/* CENTRE — 3D tee */}
        <div className="relative h-[58vh] min-h-[420px] lg:h-auto">
          <div className="absolute inset-x-[15%] bottom-[10%] h-16 rounded-[100%] bg-white/70 blur-2xl" />
          <div
            className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, r: rotation.current };
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              setAutoRotate(false);
            }}
            onPointerMove={(e) => {
              if (drag.current) rotation.current = drag.current.r + ((e.clientX - drag.current.x) / 240) * Math.PI;
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          >
            <Scene ghost body={sceneBody} shirt={sceneShirt} rotation={rotation} autoRotate={autoRotate} />
          </div>
          <div className="pointer-events-none absolute right-0 bottom-4 left-0 flex items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-ink-soft backdrop-blur">
              <Hand className="h-3.5 w-3.5" /> Drag to spin 360°
            </span>
            <button
              onClick={() => setAutoRotate((a) => !a)}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full bg-white/80 shadow backdrop-blur"
              aria-label={autoRotate ? "Stop spinning" : "Spin"}
            >
              {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col justify-center px-6 pt-2 pb-8 sm:px-10 lg:py-10 lg:pl-0">
          <div className="space-y-5">
            <Row n="04" label="View" value={view}>
              <div className="flex rounded-full bg-black/[0.05] p-1">
                {(["Front", "Side", "Back"] as View[]).map((v) => (
                  <button key={v} onClick={() => goView(v)} className={segment(view === v)}>
                    {v}
                  </button>
                ))}
              </div>
            </Row>

            <Row n="05" label="Tee" value={product.name}>
              <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pt-1 pb-1">
                {products.map((p) => {
                  const c = p.colors.find((x) => x.name === color.name) ?? p.colors[0];
                  const active = p.id === product.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => pickProduct(p)}
                      aria-pressed={active}
                      aria-label={p.name}
                      className={`relative aspect-[4/5] w-[31%] shrink-0 snap-start overflow-hidden rounded-2xl bg-white/80 text-left transition ${active ? "ring-2 ring-ink" : "opacity-80 hover:opacity-100"}`}
                    >
                      <TeeMockup hex={c.hex} print={c.print} printScale={p.printScale} printOffsetY={p.printOffsetY} shadow={false} className="absolute inset-x-1 top-1" />
                      <span className="absolute right-2 bottom-1.5 left-2 truncate text-[10px] font-semibold">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </Row>

            <Row n="06" label="Shirt size" value={override ? "Your pick" : `Best for ${fit.toLowerCase()}`}>
              <div className="grid grid-cols-7 gap-1">
                {ALL_SIZES.map((s) => {
                  const offered = product.sizes.includes(s);
                  const out = offered && stockOf(product, color.id, s) <= 0;
                  return (
                    <button
                      key={s}
                      disabled={!offered}
                      onClick={() => setOverride(s)}
                      title={out ? "Sold out" : undefined}
                      className={`rounded-full py-1.5 text-[11px] font-bold transition disabled:opacity-25 ${shirtSize === s ? "bg-ink text-white" : out ? "text-ink-soft/50 line-through" : "text-ink-soft hover:bg-white/70"}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-ink-soft">{fitResult.detail}</p>
            </Row>

            <div className="flex items-center justify-between gap-3 rounded-[1.5rem] bg-white/75 p-4 pl-5 shadow-[0_14px_40px_-20px_rgba(0,0,0,0.35)] backdrop-blur">
              <div className="min-w-0">
                <p className="text-[10px] tracking-[0.2em] text-ink-soft uppercase">Your look</p>
                <p className="mt-0.5 truncate text-sm">
                  {color.name.split(" ").pop()} · {fitResult.label} · {view} · {shirtSize}
                </p>
                <p className={`text-[11px] font-semibold ${stock > 0 ? (stock <= 3 ? "text-hot" : "text-emerald-700") : "text-ink-soft"}`}>
                  {stock > 0 ? (stock <= 3 ? `Only ${stock} left` : "In stock") : `${shirtSize} sold out`}
                </p>
              </div>
              <button
                onClick={onAdd}
                disabled={stock <= 0}
                className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <span className="text-ink-soft">{formatPrice(product.price)}</span>
                <span className="font-bold tracking-wide uppercase">{added ? <Check className="h-4 w-4" /> : "Get it"}</span>
              </button>
            </div>
            <p className="text-[11px] text-ink-soft">
              The 3D tee is a guide based on our size chart.{" "}
              <Link href={`/product/${product.slug}?color=${color.id}`} className="font-semibold underline hover:text-hot">
                Product details
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
