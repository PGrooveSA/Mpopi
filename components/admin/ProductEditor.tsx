"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, SpinnerGap as Loader2, Plus, FloppyDisk as Save, Trash as Trash2, Sparkle as Sparkles } from "@phosphor-icons/react";
import type { Collection, ProductColor, Size, Variant } from "@/lib/types";
import { ALL_SIZES } from "@/lib/types";
import TeeMockup from "../TeeMockup";
import { Card, ImageField, PageHeader, Toggle, useToast, uploadImage, PRINT_PRESETS } from "./ui";

import { newColor, type Draft } from "@/lib/product-defaults";

const SWATCHES = [
  ["Cloud White", "#F6F4F1"],
  ["Midnight", "#1C1A1D"],
  ["Chocolate", "#3B2622"],
  ["Baby Blue", "#A8C5E6"],
  ["Candy Pink", "#F7C6D6"],
  ["Cream", "#EFE4D4"],
  ["Sage", "#B9C8B0"],
  ["Lilac", "#CDBCE3"],
];

export default function ProductEditor({ initial, collections }: { initial: Draft; collections: Collection[] }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState<Draft>(initial);
  const [active, setActive] = useState<string | undefined>(initial.colors[0]?.id);
  const [view, setView] = useState<"front" | "back">("front");
  const [saving, setSaving] = useState(false);
  const isNew = !initial.id;
  const color = p.colors.find((c) => c.id === active) ?? p.colors[0];

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setP((d) => ({ ...d, [k]: v }));
  const setColor = (id: string, patch: Partial<ProductColor>) => setP((d) => ({ ...d, colors: d.colors.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const stock = (colorId: string, size: Size) => p.variants.find((v) => v.colorId === colorId && v.size === size)?.stock ?? 0;
  const setStock = (colorId: string, size: Size, n: number) =>
    setP((d) => {
      const others = d.variants.filter((v) => !(v.colorId === colorId && v.size === size));
      return { ...d, variants: [...others, { colorId, size, stock: Math.max(0, Math.floor(n) || 0) } as Variant] };
    });

  const addColor = () => {
    const c = { ...newColor(), print: color?.print ?? "/prints/mpopi-hot.png", printBack: color?.printBack };
    setP((d) => ({ ...d, colors: [...d.colors, c] }));
    setActive(c.id);
  };
  const removeColor = (id: string) => {
    if (p.colors.length === 1) return;
    if (!confirm("Remove this colour and its stock?")) return;
    setP((d) => ({ ...d, colors: d.colors.filter((c) => c.id !== id), variants: d.variants.filter((v) => v.colorId !== id) }));
    setActive(p.colors.find((c) => c.id !== id)?.id);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || !color) return;
    try {
      const urls = await Promise.all([...files].slice(0, 8).map((f) => uploadImage(f, "photo")));
      setColor(color.id, { photos: [...color.photos, ...urls] });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Upload failed", "err");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(isNew ? "/api/admin/products" : `/api/admin/products/${initial.id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      toast.show(isNew ? "Product created" : "Changes saved");
      if (isNew) router.replace(`/admin/products/${data.product.id}`);
      else {
        setP({ ...data.product });
        router.refresh();
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not save", "err");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial.id || !confirm(`Delete “${p.name}” permanently?`)) return;
    const res = await fetch(`/api/admin/products/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      router.replace("/admin/products");
      router.refresh();
    } else toast.show("Could not delete", "err");
  };

  const totalStock = p.colors.reduce((n, c) => n + p.sizes.reduce((m, s) => m + stock(c.id, s), 0), 0);

  return (
    <div className="pb-24">
      <Link href="/admin/products" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Products
      </Link>
      <PageHeader title={isNew ? "New product" : p.name || "Edit product"} subtitle={isNew ? "Create a tee — the mockup and 3D fitting room update automatically." : `${totalStock} items in stock`}>
        {!isNew && (
          <>
            <Link href={`/product/${p.slug}`} target="_blank" className="btn-glass">
              View in shop
            </Link>
            <button onClick={remove} className="btn-glass text-hot-deep">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        )}
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="font-display mb-4 font-semibold">Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Name *</label>
                <input className="input" value={p.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. MPOPI Teddy Tee" />
              </div>
              <div>
                <label className="label">Collection</label>
                <select className="input" value={p.collection} onChange={(e) => set("collection", e.target.value)}>
                  {collections.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Web address</label>
                <input className="input" value={p.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from name" />
              </div>
              <div>
                <label className="label">Price (R) *</label>
                <input className="input" type="number" min={1} value={p.price} onChange={(e) => set("price", Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Was price (R) — shows a sale</label>
                <input className="input" type="number" min={0} value={p.compareAtPrice ?? ""} onChange={(e) => set("compareAtPrice", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Description</label>
                <textarea className="input min-h-28" value={p.description} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-6">
              <Toggle checked={p.status === "active"} onChange={(v) => set("status", v ? "active" : "hidden")} label="Live in shop" />
              <Toggle checked={p.featured} onChange={(v) => set("featured", v)} label="Featured on home page" />
              <Toggle checked={p.isNew} onChange={(v) => set("isNew", v)} label="“New” badge" />
            </div>
          </Card>

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display font-semibold">Colours & artwork</h2>
              <button onClick={addColor} className="btn-glass !px-4 !py-2">
                <Plus className="h-4 w-4" /> Add colour
              </button>
            </div>
            <div className="mb-5 flex flex-wrap gap-2">
              {p.colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={`flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold transition ${c.id === color?.id ? "bg-ink text-white" : "bg-white/70 hover:bg-white"}`}
                >
                  <span className="h-6 w-6 rounded-full border-2 border-white" style={{ background: c.hex }} />
                  {c.name}
                </button>
              ))}
            </div>
            {color && (
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_90px] gap-3">
                    <div>
                      <label className="label">Colour name</label>
                      <input className="input" value={color.name} onChange={(e) => setColor(color.id, { name: e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Colour</label>
                      <input type="color" className="h-[46px] w-full cursor-pointer rounded-2xl border border-white bg-white/60 p-1" value={color.hex} onChange={(e) => setColor(color.id, { hex: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SWATCHES.map(([name, hex]) => (
                      <button key={hex} title={name} onClick={() => setColor(color.id, { name, hex })} className="h-7 w-7 rounded-full border-2 border-white shadow-sm" style={{ background: hex }} aria-label={name} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ImageField
                      kind="print"
                      label="Front print"
                      value={color.print}
                      onChange={(url) => setColor(color.id, { print: url })}
                      presets={PRINT_PRESETS}
                    />
                    <ImageField kind="print" label="Back print (optional)" value={color.printBack} onChange={(url) => setColor(color.id, { printBack: url || undefined })} presets={PRINT_PRESETS} />
                  </div>
                  <p className="text-xs text-ink-soft">Upload artwork as a PNG with a transparent background. It&apos;s placed on the mockups and the 3D fitting room automatically.</p>
                  {p.colors.length > 1 && (
                    <button onClick={() => removeColor(color.id)} className="text-xs font-bold text-hot-deep hover:underline">
                      Remove this colour
                    </button>
                  )}
                </div>
                <div>
                  <p className="label">Real photos of this colour (optional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {color.photos.map((src, i) => (
                      <ImageField key={src + i} value={src} onChange={(url) => setColor(color.id, { photos: url ? color.photos.map((x, k) => (k === i ? url : x)) : color.photos.filter((_, k) => k !== i) })} />
                    ))}
                    <label className="grid aspect-square cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-ink/15 bg-white/50 text-xs font-semibold text-ink-soft hover:border-hot/50">
                      <span className="text-center">
                        <Plus className="mx-auto h-5 w-5" /> Add photos
                      </span>
                      <input type="file" accept="image/*" multiple hidden onChange={(e) => addPhotos(e.target.files)} />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-display font-semibold">Sizes & stock</h2>
            <p className="mt-1 mb-4 text-xs text-ink-soft">Sizes with 0 stock show as sold out and can&apos;t be ordered. Stock goes down automatically when a customer places an order and comes back if you cancel it.</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {ALL_SIZES.map((s) => {
                const on = p.sizes.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => set("sizes", on ? p.sizes.filter((x) => x !== s) : ALL_SIZES.filter((x) => x === s || p.sizes.includes(x)))}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${on ? "bg-ink text-white" : "bg-white/60 text-ink-soft"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-xs text-ink-soft">
                    <th className="pb-2 text-left font-semibold">Colour</th>
                    {p.sizes.map((s) => (
                      <th key={s} className="pb-2 font-semibold">
                        {s}
                      </th>
                    ))}
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {p.colors.map((c) => (
                    <tr key={c.id}>
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-2 font-semibold whitespace-nowrap">
                          <span className="h-4 w-4 rounded-full border border-white" style={{ background: c.hex }} />
                          {c.name}
                        </span>
                      </td>
                      {p.sizes.map((s) => {
                        const n = stock(c.id, s);
                        return (
                          <td key={s} className="px-0.5 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={n}
                              onChange={(e) => setStock(c.id, s, Number(e.target.value))}
                              className={`w-full min-w-12 rounded-xl border px-2 py-2 text-center font-bold outline-none focus:ring-2 focus:ring-hot/30 ${n === 0 ? "border-hot/30 bg-hot/10 text-hot-deep" : "border-white bg-white/70"}`}
                              aria-label={`${c.name} ${s} stock`}
                            />
                          </td>
                        );
                      })}
                      <td className="pl-2">
                        <button onClick={() => p.sizes.forEach((s) => setStock(c.id, s, 0))} className="text-[11px] font-bold whitespace-nowrap text-ink-soft hover:text-hot-deep">
                          Mark sold out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* PREVIEW */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-semibold">Mockup preview</h2>
              <div className="flex rounded-full bg-white/60 p-0.5 text-xs font-bold">
                {(["front", "back"] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1 capitalize ${view === v ? "bg-ink text-white" : ""}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="aspect-square rounded-2xl bg-[var(--a-soft)]">
              {color && (
                <TeeMockup
                  hex={color.hex}
                  print={color.print}
                  printBack={color.printBack}
                  printScale={p.printScale}
                  printOffsetY={p.printOffsetY}
                  backPrintScale={p.backPrintScale}
                  view={view}
                  className="h-full w-full p-4"
                />
              )}
            </div>
            <div className="mt-4 space-y-4">
              <Slider label="Front print size" value={p.printScale} min={0.1} max={1.2} step={0.01} onChange={(v) => set("printScale", v)} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Front print position" value={p.printOffsetY} min={-60} max={160} step={1} onChange={(v) => set("printOffsetY", v)} format={(v) => (v > 0 ? `${v} lower` : v < 0 ? `${-v} higher` : "default")} />
              <Slider label="Back print size" value={p.backPrintScale} min={0.1} max={1.2} step={0.01} onChange={(v) => set("backPrintScale", v)} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
            {!isNew && (
              <Link href={`/fitting-room?product=${p.slug}&color=${color?.id}`} target="_blank" className="btn-glass mt-5 w-full">
                <Sparkles className="h-4 w-4 text-hot" /> Preview in 3D fitting room
              </Link>
            )}
          </Card>
        </div>
      </div>
      {toast.node}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs font-semibold text-ink-soft">
        <span>{label}</span>
        <span className="text-ink">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range w-full"
        style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }}
      />
    </div>
  );
}
