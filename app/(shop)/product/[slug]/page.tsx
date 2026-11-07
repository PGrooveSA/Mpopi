import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProduct, getShopProducts, getStore } from "@/lib/data";
import ProductView from "@/components/ProductView";
import ProductCard from "@/components/ProductCard";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ color?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Not found" };
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    openGraph: { images: p.colors[0]?.photos[0] ? [p.colors[0].photos[0]] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, { color }] = await Promise.all([params, searchParams]);
  const [product, { settings, collections }, all] = await Promise.all([getProduct(slug), getStore(), getShopProducts()]);
  if (!product) notFound();
  const collection = collections.find((c) => c.slug === product.collection);
  const related = all.filter((p) => p.id !== product.id).sort((a, b) => Number(b.collection === product.collection) - Number(a.collection === product.collection)).slice(0, 4);

  return (
    <div className="container-x pt-8">
      <nav className="mb-5 flex items-center gap-1 text-xs font-semibold text-ink-soft" aria-label="Breadcrumb">
        <Link href="/shop" className="hover:text-hot">
          Shop
        </Link>
        <ChevronRight className="h-3 w-3" />
        {collection && (
          <>
            <Link href={`/shop?collection=${collection.slug}`} className="hover:text-hot">
              {collection.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="truncate text-ink">{product.name}</span>
      </nav>
      <ProductView
        product={product}
        initialColor={color}
        collectionName={collection?.name}
        sizeChart={settings.sizeChart}
        deliveryOptions={settings.deliveryOptions}
        freeDeliveryOver={settings.freeDeliveryOver}
      />
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="font-display mb-6 text-2xl font-bold sm:text-3xl">You might also love</h2>
          <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} collectionName={collections.find((c) => c.slug === p.collection)?.name} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
