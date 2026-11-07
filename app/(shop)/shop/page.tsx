import type { Metadata } from "next";
import { getStore, getShopProducts } from "@/lib/data";
import ShopGrid from "@/components/ShopGrid";

export const metadata: Metadata = { title: "Shop all tees" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ collection?: string }> }) {
  const { collection } = await searchParams;
  const [{ collections }, products] = await Promise.all([getStore(), getShopProducts()]);
  const active = collections.find((c) => c.slug === collection);
  return (
    <div className="container-x pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/10 pb-8">
        <h1 className={`text-5xl leading-[0.95] font-bold sm:text-7xl ${active?.slug === "hiswona" ? "font-script italic" : "font-display tracking-tighter"}`}>
          {active ? active.name : <>The collection<span className="text-hot">.</span></>}
        </h1>
        <div className="max-w-xs">
        <p className="text-[11px] font-bold tracking-[0.2em] text-hot uppercase">{active ? active.tagline : "All tees / MPOPI… × Hiswona…"}</p>
        <p className="mt-3 text-sm text-ink-soft">
          {active ? active.description : "Every MPOPI… and Hiswona… tee in one place. Tap “Try on” to see any tee on our 3D model."}
        </p>
        </div>
      </div>
      <ShopGrid products={products} collections={collections} initialCollection={active?.slug ?? "all"} />
    </div>
  );
}
