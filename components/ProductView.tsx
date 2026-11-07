"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, Ruler, ShoppingBag, Sparkles, Truck, MessageCircle, X, Check } from "lucide-react";
import type { DeliveryOption, PublicProduct, Size, SizeChartRow } from "@/lib/types";
import { colorStock, formatPrice, stockOf } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import TeeMockup from "./TeeMockup";

export default function ProductView({
  product,
  initialColor,
  collectionName,
  sizeChart,
  deliveryOptions,
  freeDeliveryOver,
}: {
  product: PublicProduct;
  initialColor?: string;
  collectionName?: string;
  sizeChart: SizeChartRow[];
  deliveryOptions: DeliveryOption[];
  freeDeliveryOver: number;
}) {
  const start =
    product.colors.find((c) => c.id === initialColor) ?? product.colors.find((c) => colorStock(product, c.id) > 0) ?? product.colors[0];
  const [colorId, setColorId] = useState(start.id);
  const [size, setSize] = useState<Size | null>(null);
  const [qty, setQty] = useState(1);
  const [slide, setSlide] = useState(0);
  const [guide, setGuide] = useState(false);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);

  const color = product.colors.find((c) => c.id === colorId) ?? product.colors[0];
  const slides = useMemo(() => {
    const s: ({ type: "mock"; view: "front" | "back" } | { type: "photo"; src: string })[] = [{ type: "mock", view: "front" }];
    if (color.printBack) s.push({ type: "mock", view: "back" });
    color.photos.forEach((src) => s.push({ type: "photo", src }));
    return s;
  }, [color]);
  const current = slides[Math.min(slide, slides.length - 1)];
  const stock = size ? stockOf(product, color.id, size) : 0;
  const soldOutColour = colorStock(product, color.id) <= 0;

  const pickColor = (id: string) => {
    setColorId(id);
    setSlide(0);
    setQty(1);
    if (size && stockOf(product, id, size) <= 0) setSize(null);
  };

  const onAdd = () => {
    if (!size || stock <= 0) return;
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        colorId: color.id,
        colorName: color.name,
        hex: color.hex,
        print: color.print,
        size,
        price: product.price,
        maxQty: stock,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      {/* GALLERY */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="glass shine-border relative overflow-hidden rounded-[2.5rem] p-3">
          <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-white/90 via-white/50 to-white/10 sm:aspect-[5/4.6]">
            <div className="absolute inset-1/4 rounded-full blur-3xl" style={{ background: `${color.hex}66` }} />
            {current.type === "mock" ? (
              <TeeMockup
                key={`${color.id}-${current.view}`}
                hex={color.hex}
                print={color.print}
                printBack={color.printBack}
                printScale={product.printScale}
                printOffsetY={product.printOffsetY}
                backPrintScale={product.backPrintScale}
                view={current.view}
                className="relative h-full w-full animate-fade-up p-6 sm:p-10"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={current.src} alt={`${product.name} in ${color.name}`} className="absolute inset-0 h-full w-full animate-fade-up object-cover" />
            )}
            <Link
              href={`/fitting-room?product=${product.slug}&color=${color.id}${size ? `&size=${size}` : ""}`}
              className="glass-strong absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition hover:scale-105"
            >
              <Sparkles className="h-4 w-4 text-hot" /> View in 3D fitting room
            </Link>
          </div>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto p-1">
          {slides.map((s, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`glass h-20 w-20 shrink-0 overflow-hidden rounded-2xl p-1 transition ${i === slide ? "ring-2 ring-hot" : "opacity-75 hover:opacity-100"}`}
              aria-label={s.type === "mock" ? `${s.view} view` : `Photo ${i}`}
            >
              {s.type === "mock" ? (
                <TeeMockup
                  hex={color.hex}
                  print={color.print}
                  printBack={color.printBack}
                  printScale={product.printScale}
                  printOffsetY={product.printOffsetY}
                  backPrintScale={product.backPrintScale}
                  view={s.view}
                  shadow={false}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.src} alt="" className="h-full w-full rounded-xl object-cover" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* DETAILS */}
      <div>
        {collectionName && <p className="eyebrow">{collectionName}</p>}
        <h1 className="font-display mt-2 text-3xl leading-tight font-bold sm:text-4xl">{product.name}</h1>
        <div className="mt-3 flex items-center gap-3">
          <span className="font-display text-2xl font-semibold">{formatPrice(product.price)}</span>
          {product.compareAtPrice && <span className="text-lg text-ink-soft line-through">{formatPrice(product.compareAtPrice)}</span>}
          {product.isNew && <span className="chip bg-hot text-white">New</span>}
        </div>
        <p className="mt-5 leading-relaxed text-ink-soft">{product.description}</p>

        <div className="glass mt-7 rounded-[2rem] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="label !mb-0">
              Colour: <span className="text-ink normal-case">{color.name}</span>
            </p>
            {soldOutColour && <span className="chip bg-ink text-white">Sold out</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {product.colors.map((c) => {
              const out = colorStock(product, c.id) <= 0;
              return (
                <button
                  key={c.id}
                  onClick={() => pickColor(c.id)}
                  title={`${c.name}${out ? " — sold out" : ""}`}
                  aria-label={`${c.name}${out ? " (sold out)" : ""}`}
                  aria-pressed={c.id === color.id}
                  className={`relative h-11 w-11 rounded-full border-[3px] transition ${c.id === color.id ? "scale-110 border-hot shadow-lg" : "border-white hover:scale-105"}`}
                  style={{ background: c.hex, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}
                >
                  {out && <span className="absolute inset-0 m-auto h-[2px] w-full rotate-45 rounded bg-ink/60" />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="label !mb-0">
              Size{size && <span className="text-ink normal-case">: {size}</span>}
            </p>
            <button onClick={() => setGuide(true)} className="inline-flex items-center gap-1 text-xs font-bold text-hot hover:underline">
              <Ruler className="h-3.5 w-3.5" /> Size guide
            </button>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {product.sizes.map((s) => {
              const n = stockOf(product, color.id, s);
              const out = n <= 0;
              return (
                <button
                  key={s}
                  disabled={out}
                  onClick={() => {
                    setSize(s);
                    setQty(1);
                  }}
                  aria-pressed={size === s}
                  className={`relative rounded-2xl py-3 text-sm font-bold transition ${
                    out
                      ? "cursor-not-allowed bg-white/30 text-ink-soft/40 line-through"
                      : size === s
                        ? "bg-ink text-white shadow-lg"
                        : "bg-white/70 hover:bg-white"
                  }`}
                  title={out ? "Sold out" : n <= 3 ? `Only ${n} left` : undefined}
                >
                  {s}
                  {!out && n <= 3 && <span className="absolute -top-1.5 -right-1 h-2.5 w-2.5 rounded-full bg-hot ring-2 ring-white" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 min-h-5 text-xs font-semibold">
            {size ? (
              stock <= 3 ? (
                <span className="text-hot">Hurry — only {stock} left in {size}</span>
              ) : (
                <span className="text-emerald-700">In stock</span>
              )
            ) : soldOutColour ? (
              <span className="text-ink-soft">This colour is sold out — try another colour.</span>
            ) : (
              <span className="text-ink-soft">Not sure? Try sizes on the 3D model first.</span>
            )}
          </p>

          <div className="mt-5 flex gap-3">
            <div className="flex items-center rounded-full bg-white/80">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-11 place-items-center" aria-label="Decrease quantity">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(stock || 1, q + 1))}
                disabled={!size || qty >= stock}
                className="grid h-12 w-11 place-items-center disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button onClick={onAdd} disabled={!size || stock <= 0} className="btn-primary flex-1 py-4">
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added to bag
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> {size ? "Add to bag" : "Choose a size"}
                </>
              )}
            </button>
          </div>
          <Link href={`/fitting-room?product=${product.slug}&color=${color.id}${size ? `&size=${size}` : ""}`} className="btn-glass mt-3 w-full py-3.5">
            <Sparkles className="h-4 w-4 text-hot" /> Try it on in the fitting room
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="glass flex gap-3 rounded-3xl p-4">
            <Truck className="mt-0.5 h-5 w-5 shrink-0 text-hot" />
            <div className="text-sm">
              <p className="font-bold">Delivery</p>
              <p className="text-ink-soft">
                {deliveryOptions.map((d) => `${d.name} ${d.price ? formatPrice(d.price) : "free"}`).join(" · ")}
                {freeDeliveryOver > 0 && ` · Free over ${formatPrice(freeDeliveryOver)}`}
              </p>
            </div>
          </div>
          <div className="glass flex gap-3 rounded-3xl p-4">
            <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="text-sm">
              <p className="font-bold">Pay on WhatsApp</p>
              <p className="text-ink-soft">Checkout sends your order to us on WhatsApp — we&apos;ll confirm and share payment details.</p>
            </div>
          </div>
        </div>
      </div>

      {guide && <SizeGuide rows={sizeChart} onClose={() => setGuide(false)} />}
    </div>
  );
}

export function SizeGuide({ rows, onClose }: { rows: SizeChartRow[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-label="Size guide">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-strong relative w-full max-w-lg animate-fade-up rounded-[2rem] p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">Size guide</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/70" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">Garment measurements in cm. Lay a tee you love flat and compare.</p>
        <SizeTable rows={rows} />
        <Link href="/fitting-room" className="btn-primary mt-5 w-full">
          <Sparkles className="h-4 w-4" /> Compare sizes in 3D
        </Link>
      </div>
    </div>
  );
}

export function SizeTable({ rows }: { rows: SizeChartRow[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-white/60">
      <table className="w-full text-center text-sm">
        <thead className="bg-ink text-white">
          <tr>
            <th className="py-2.5">Size</th>
            <th>Chest</th>
            <th>Length</th>
            <th>Sleeve</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.size} className="border-t border-white">
              <td className="py-2 font-bold">{r.size}</td>
              <td>{r.chest}</td>
              <td>{r.length}</td>
              <td>{r.sleeve}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
