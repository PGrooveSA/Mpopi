import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Sparkles, MessageCircle } from "lucide-react";
import { getStore } from "@/lib/data";
import { whatsappLink } from "@/lib/shop";

export const metadata: Metadata = { title: "Our story" };

export default async function AboutPage() {
  const { settings } = await getStore();
  return (
    <div className="container-x pt-10">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Our story</p>
          <h1 className="font-display mt-3 text-4xl leading-tight font-bold sm:text-6xl">{settings.about.title}</h1>
          <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
            {settings.about.body.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">
              Shop the collection
            </Link>
            <a href={whatsappLink(settings.whatsappNumber, "Hi MPOPI! 😊")} target="_blank" rel="noopener noreferrer" className="btn-glass">
              <MessageCircle className="h-4 w-4 text-emerald-600" /> Say hi on WhatsApp
            </a>
          </div>
        </div>
        <div className="relative">
          <div className="glass shine-border rounded-[2.5rem] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {settings.about.image && <img src={settings.about.image} alt="" className="aspect-[4/5] w-full rounded-[2rem] object-cover" />}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/bear.png" alt="" className="absolute -right-4 -bottom-8 h-32 w-auto animate-float drop-shadow-2xl" />
        </div>
      </div>
      <div className="mt-20 grid gap-5 md:grid-cols-3">
        {[
          [Heart, "Made to feel good", "Heavyweight, soft cotton that gets better with every wash."],
          [Sparkles, "Small batches", "Printed and embroidered in limited runs, checked by hand."],
          [MessageCircle, "Real people", "Every order is handled personally on WhatsApp."],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Heart;
          return (
            <div key={t as string} className="glass rounded-[2rem] p-7">
              <I className="h-6 w-6 text-hot" />
              <h3 className="font-display mt-4 text-lg font-semibold">{t as string}</h3>
              <p className="mt-2 text-sm text-ink-soft">{d as string}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
