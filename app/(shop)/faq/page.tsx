import type { Metadata } from "next";
import { ChevronDown, Truck } from "lucide-react";
import { getStore } from "@/lib/data";
import { formatPrice } from "@/lib/shop";
import { SizeTable } from "@/components/ProductView";

export const metadata: Metadata = { title: "FAQ & delivery" };

export default async function FaqPage() {
  const { settings } = await getStore();
  return (
    <div className="container-x max-w-4xl pt-10">
      <p className="eyebrow">Help</p>
      <h1 className="font-display mt-2 text-4xl font-bold sm:text-5xl">FAQ & delivery</h1>

      <div className="mt-8 space-y-3">
        {settings.faqs.map((f, i) => (
          <details key={i} className="glass group rounded-3xl p-5 open:bg-white/60" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
              {f.q}
              <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
            </summary>
            <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>

      <h2 className="font-display mt-14 text-2xl font-bold">Delivery options</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {settings.deliveryOptions.map((d) => (
          <div key={d.id} className="glass rounded-3xl p-5">
            <Truck className="h-5 w-5 text-hot" />
            <p className="mt-3 font-bold">{d.name}</p>
            <p className="text-sm text-ink-soft">{d.description}</p>
            <p className="font-display mt-2 font-semibold">{d.price ? formatPrice(d.price) : "Free"}</p>
          </div>
        ))}
      </div>
      {settings.freeDeliveryOver > 0 && <p className="mt-3 text-sm text-ink-soft">Free delivery on orders over {formatPrice(settings.freeDeliveryOver)}.</p>}

      <h2 id="size-guide" className="font-display mt-14 scroll-mt-32 text-2xl font-bold">
        Size guide
      </h2>
      <p className="mt-2 text-sm text-ink-soft">Garment measurements in centimetres (chest is measured all the way around).</p>
      <div className="glass mt-2 rounded-3xl p-3">
        <SizeTable rows={settings.sizeChart} />
      </div>
    </div>
  );
}
