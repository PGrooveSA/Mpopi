"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, MagnifyingGlass as Search, Eye, EyeSlash as EyeOff, PencilSimple as Pencil, Trash as Trash2, Package as PackageX, SpinnerGap as Loader2, Star } from "@phosphor-icons/react";
import type { Collection, Product } from "@/lib/types";
import { formatPrice, isSoldOut, totalStock } from "@/lib/shop";
import TeeMockup from "../TeeMockup";
import { PageHeader, useToast } from "./ui";

type Filter = "all" | "active" | "hidden" | "soldout" | "low";

export default function ProductsTable({
  products,
  collections,
  initialFilter,
  hideSoldOut,
}: {
  products: Product[];
  collections: Collection[];
  initialFilter: string;
  hideSoldOut: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>((["all", "active", "hidden", "soldout", "low"].includes(initialFilter) ? initialFilter : "all") as Filter);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const soldOutCount = products.filter(isSoldOut).length;
  const soldOutColours = products.filter((p) => !isSoldOut(p)).reduce(
    (n, p) => n + p.colors.filter((c) => p.variants.filter((v) => v.colorId === c.id).every((v) => v.stock <= 0)).length,
    0,
  );

  const list = useMemo(() => {
    let l = products;
    if (filter === "active") l = l.filter((p) => p.status === "active");
    if (filter === "hidden") l = l.filter((p) => p.status === "hidden");
    if (filter === "soldout") l = l.filter(isSoldOut);
    if (filter === "low") l = l.filter((p) => p.variants.some((v) => v.stock > 0 && v.stock <= 2));
    if (q.trim()) l = l.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [products, filter, q]);

  const call = async (key: string, url: string, init: RequestInit, ok: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      toast.show(typeof ok === "string" ? ok : "Saved");
      router.refresh();
      return data;
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Something went wrong", "err");
    } finally {
      setBusy(null);
    }
  };

  const removeSoldOut = async (action: "hide" | "delete", scope: "products" | "colours") => {
    const data = await call("bulk", "/api/admin/products/sold-out", { method: "POST", body: JSON.stringify({ action, scope }) }, "Done");
    if (data) {
      toast.show(
        `${action === "hide" ? "Hidden" : "Deleted"} ${data.products} sold-out product${data.products === 1 ? "" : "s"}${scope === "colours" ? ` and removed ${data.colours} sold-out colour${data.colours === 1 ? "" : "s"}` : ""}.`,
      );
      setModal(false);
    }
  };

  const tabs: [Filter, string, number][] = [
    ["all", "All", products.length],
    ["active", "Live", products.filter((p) => p.status === "active").length],
    ["hidden", "Hidden", products.filter((p) => p.status === "hidden").length],
    ["soldout", "Sold out", soldOutCount],
    ["low", "Low stock", products.filter((p) => p.variants.some((v) => v.stock > 0 && v.stock <= 2)).length],
  ];

  return (
    <div>
      <PageHeader title="Products" subtitle={`${products.length} products · ${hideSoldOut ? "sold-out items are automatically hidden from the shop" : "sold-out items still show in the shop with a “Sold out” badge"}`}>
        <button onClick={() => setModal(true)} className="btn-glass" disabled={soldOutCount + soldOutColours === 0}>
          <PackageX className="h-4 w-4 text-hot" /> Remove sold-out items
        </button>
        <Link href="/admin/products/new" className="btn-primary">
          <Plus className="h-4 w-4" /> Add product
        </Link>
      </PageHeader>

      <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-[1.5rem] p-2">
        {tabs.map(([k, label, n]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === k ? "bg-ink text-white" : "text-ink-soft hover:bg-white/70"}`}
          >
            {label} <span className="opacity-60">{n}</span>
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" className="input !rounded-full !py-2 pl-9" />
        </div>
      </div>

      <div className="glass overflow-hidden rounded-[1.75rem]">
        {list.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-soft">No products here.</p>
        ) : (
          <ul className="divide-y divide-white/80">
            {list.map((p) => {
              const c = p.colors[0];
              const stock = totalStock(p);
              const out = stock <= 0;
              const lowCount = p.variants.filter((v) => v.stock > 0 && v.stock <= 2).length;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
                  <Link href={`/admin/products/${p.id}`} className="h-16 w-16 shrink-0 rounded-2xl bg-white/70 p-1">
                    {c && <TeeMockup hex={c.hex} print={c.print} printScale={p.printScale} printOffsetY={p.printOffsetY} shadow={false} />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/products/${p.id}`} className="font-bold hover:text-hot">
                      {p.name}
                    </Link>
                    <p className="text-xs text-ink-soft">
                      {collections.find((x) => x.slug === p.collection)?.name ?? p.collection} · {p.colors.length} colour{p.colors.length === 1 ? "" : "s"} · {p.sizes[0]}–
                      {p.sizes[p.sizes.length - 1]}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`chip ${p.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-ink/10 text-ink-soft"}`}>{p.status === "active" ? "Live" : "Hidden"}</span>
                      {out && <span className="chip bg-ink text-white">Sold out</span>}
                      {!out && lowCount > 0 && <span className="chip bg-hot/15 text-hot-deep">{lowCount} sizes low</span>}
                      {p.featured && (
                        <span className="chip bg-amber-100 text-amber-800">
                          <Star className="h-3 w-3" /> Featured
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-bold">{formatPrice(p.price)}</p>
                    <p className={`text-xs font-semibold ${out ? "text-hot-deep" : "text-ink-soft"}`}>{stock} in stock</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      title={p.status === "active" ? "Hide from shop" : "Show in shop"}
                      onClick={() =>
                        call(p.id, `/api/admin/products/${p.id}`, { method: "PATCH", body: JSON.stringify({ status: p.status === "active" ? "hidden" : "active" }) }, p.status === "active" ? "Hidden from shop" : "Now live in shop")
                      }
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/70 hover:bg-white"
                      aria-label={p.status === "active" ? "Hide" : "Show"}
                    >
                      {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : p.status === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Link href={`/admin/products/${p.id}`} className="grid h-9 w-9 place-items-center rounded-full bg-white/70 hover:bg-white" aria-label="Edit" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete “${p.name}” permanently? This cannot be undone.`)) call(p.id, `/api/admin/products/${p.id}`, { method: "DELETE" }, "Product deleted");
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-hot-deep hover:bg-white"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-label="Remove sold-out items">
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="glass-strong relative w-full max-w-md animate-fade-up rounded-[2rem] p-6">
            <h2 className="font-display text-xl font-semibold">Remove sold-out items</h2>
            <p className="mt-2 text-sm text-ink-soft">
              <strong>{soldOutCount}</strong> product{soldOutCount === 1 ? " is" : "s are"} completely sold out
              {soldOutColours > 0 && (
                <>
                  , and <strong>{soldOutColours}</strong> colour{soldOutColours === 1 ? " is" : "s are"} sold out on other products
                </>
              )}
              .
            </p>
            <div className="mt-5 space-y-2">
              <button disabled={busy === "bulk"} onClick={() => removeSoldOut("hide", "products")} className="w-full rounded-2xl bg-white/70 p-4 text-left transition hover:bg-white">
                <p className="text-sm font-bold">Hide sold-out products</p>
                <p className="text-xs text-ink-soft">They disappear from the shop but stay here, so you can restock and show them again.</p>
              </button>
              {soldOutColours > 0 && (
                <button disabled={busy === "bulk"} onClick={() => removeSoldOut("hide", "colours")} className="w-full rounded-2xl bg-white/70 p-4 text-left transition hover:bg-white">
                  <p className="text-sm font-bold">Hide sold-out products and remove sold-out colours</p>
                  <p className="text-xs text-ink-soft">Also deletes individual colours with no stock left from products that are still selling.</p>
                </button>
              )}
              <button
                disabled={busy === "bulk"}
                onClick={() => {
                  if (confirm("Permanently delete all sold-out products? This cannot be undone.")) removeSoldOut("delete", soldOutColours > 0 ? "colours" : "products");
                }}
                className="w-full rounded-2xl bg-hot/10 p-4 text-left transition hover:bg-hot/15"
              >
                <p className="text-sm font-bold text-hot-deep">Delete sold-out items permanently</p>
                <p className="text-xs text-ink-soft">Removes them completely. Past orders are not affected.</p>
              </button>
            </div>
            <button onClick={() => setModal(false)} className="btn-glass mt-4 w-full">
              Cancel
            </button>
          </div>
        </div>
      )}
      {toast.node}
    </div>
  );
}
