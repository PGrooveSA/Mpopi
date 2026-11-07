import Link from "next/link";
import { ArrowRight, ArrowDown, MessageCircle, ShoppingBag, Truck } from "lucide-react";
import { getStore, getShopProducts } from "@/lib/data";
import TeeMockup from "@/components/TeeMockup";
import HangerRail from "@/components/HangerRail";
import TryOnTeaser from "@/components/TryOnTeaser";

const SPECS = [
  { title: "Heavyweight cotton", text: "Dense, soft-washed cotton that keeps its shape and gets softer with every wash.", pos: "top-[18%] left-[8%]", dot: "top-[34%] left-[40%]" },
  { title: "Regular fit", text: "Classic shoulders, easy body and a length that sits right at the hip.", pos: "top-[16%] right-[6%]", dot: "top-[22%] right-[30%]" },
  { title: "Print that lasts", text: "Bright, soft-touch prints and thread-by-thread embroidery.", pos: "bottom-[14%] left-[6%]", dot: "top-[42%] left-[50%]" },
  { title: "Made in small batches", text: "Every piece is checked by hand before it's packed for you.", pos: "bottom-[16%] right-[8%]", dot: "bottom-[30%] right-[40%]" },
];

export default async function Home() {
  const [{ settings, collections }, products] = await Promise.all([getStore(), getShopProducts()]);
  const rail = [...products].sort((a, b) => Number(b.featured) - Number(a.featured));
  const teddy = products.find((p) => p.slug === "mpopi-teddy-tee") ?? products[0];
  const dark = teddy?.colors.find((c) => c.id === "choc" || c.id === "black") ?? teddy?.colors[0];
  const words = settings.hero.title.replace(/[.!]$/, "").split(" ");

  return (
    <>
      {/* HERO — cinematic, dark */}
      <section className="container-x pt-4">
        <div className="spotlight relative overflow-hidden rounded-[2.5rem] px-6 pt-14 pb-10 text-white sm:px-12 sm:pt-20">
          <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "64px 64px", maskImage: "radial-gradient(ellipse at 50% 40%,black,transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 40%,black,transparent 70%)" }} />
          <div className="relative flex flex-wrap items-start justify-between gap-6">
            <p className="text-[11px] font-bold tracking-[0.22em] text-hot uppercase">{settings.hero.eyebrow}</p>
            <p className="hidden max-w-[220px] text-right text-[11px] font-semibold tracking-[0.18em] text-white/50 uppercase sm:block">
              {products.length} tees / {collections.length} collections / one soft feeling
            </p>
          </div>
          <h1 className="font-display relative mt-6 text-center text-[13vw] leading-[0.9] font-bold tracking-tighter uppercase sm:text-[9vw] xl:text-[8.5rem]">
            {words.slice(0, Math.ceil(words.length / 2)).join(" ")}
            <br />
            <span className="text-white/90">{words.slice(Math.ceil(words.length / 2)).join(" ")}</span>
            <span className="text-hot">.</span>
          </h1>
          <p className="relative mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-white/60 sm:text-base">{settings.hero.subtitle}</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/shop" className="btn bg-white px-7 py-3.5 text-night hover:bg-blush">
              <ShoppingBag className="h-4 w-4" /> Shop the drop
            </Link>
            <Link href="/fitting-room" className="btn glass-dark px-7 py-3.5 text-white hover:bg-white/10">
              Try it on in 3D
            </Link>
          </div>
          {teddy && dark && (
            <div className="relative mx-auto mt-6 max-w-lg">
              <div className="absolute inset-x-12 bottom-6 h-10 rounded-[100%] bg-black blur-2xl" />
              <TeeMockup hex={dark.hex} print={dark.print} printScale={teddy.printScale} printOffsetY={teddy.printOffsetY} shadow={false} className="relative w-full drop-shadow-[0_40px_50px_rgba(0,0,0,0.7)]" />
              <span className="glass-dark absolute top-[30%] -left-2 hidden rounded-2xl px-3 py-2 text-[11px] font-semibold sm:block">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-hot align-middle" /> MPOPI… Teddy print
              </span>
              <span className="glass-dark absolute top-[55%] -right-2 hidden rounded-2xl px-3 py-2 text-[11px] font-semibold sm:block">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-sky align-middle" /> XS – 3XL · Regular fit
              </span>
            </div>
          )}
          <p className="relative mt-2 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" /> Scroll to explore
          </p>
        </div>
      </section>

      {/* STUDIO RAIL — light */}
      <section className="container-x mt-20">
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink/10 pb-8">
          <h2 className="font-display text-5xl leading-[0.95] font-bold tracking-tighter sm:text-7xl">
            Made for
            <br />
            feeling<span className="text-hot">.</span>
          </h2>
          <div className="max-w-xs">
            <p className="text-[11px] font-bold tracking-[0.2em] text-hot uppercase">Capsule 001 / MPOPI…</p>
            <p className="mt-3 text-lg leading-snug">
              Everyday tees.
              <br />A soft state of mind.
            </p>
            <p className="mt-3 text-[11px] font-semibold tracking-[0.18em] text-ink-soft uppercase">
              {String(products.length).padStart(2, "0")} tees / proudly South African
            </p>
          </div>
        </div>
        <div className="mt-10">
          <HangerRail products={rail} />
        </div>
        <div className="mt-6 flex justify-center">
          <Link href="/shop" className="btn-dark px-7 py-3.5">
            View the full collection <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="container-x mt-24">
        <p className="text-[11px] font-bold tracking-[0.2em] text-ink-soft uppercase">02 / Collections</p>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {collections.map((c) => (
            <Link key={c.slug} href={`/shop?collection=${c.slug}`} className="group relative block aspect-[4/3.6] overflow-hidden rounded-[2.5rem] sm:aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition duration-1000 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/20 to-transparent" />
              <div className="absolute right-6 bottom-6 left-6 flex items-end justify-between gap-4 text-white">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] text-white/60 uppercase">{c.tagline}</p>
                  <h3 className={`mt-1 text-4xl font-bold sm:text-5xl ${c.slug === "hiswona" ? "font-script italic" : "font-display tracking-tight uppercase"}`}>{c.name}</h3>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-night transition group-hover:-rotate-45 group-hover:bg-hot group-hover:text-white">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FABRIC — dark with hotspots */}
      {teddy && (
        <section className="container-x mt-24">
          <div className="spotlight relative overflow-hidden rounded-[2.5rem] px-6 py-14 text-white sm:px-12 sm:py-16">
            <div className="relative z-10 max-w-md">
              <p className="text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">03 / The tee</p>
              <h2 className="font-display mt-3 text-5xl leading-[0.95] font-bold tracking-tighter uppercase sm:text-6xl">
                Fabric,
                <br />
                engineered<span className="text-hot">.</span>
              </h2>
            </div>
            <div className="relative mx-auto mt-6 aspect-[5/4] max-w-3xl">
              <TeeMockup hex="#1C1A1D" print="/brand/bear.png" printScale={0.2} printOffsetY={8} shadow={false} className="absolute inset-[6%] drop-shadow-[0_40px_60px_rgba(0,0,0,0.8)]" />
              {SPECS.map((s) => (
                <span key={s.title} className={`hotspot absolute hidden h-3.5 w-3.5 rounded-full bg-white sm:block ${s.dot}`} />
              ))}
              {SPECS.map((s) => (
                <div key={s.title} className={`glass-dark absolute hidden w-52 rounded-2xl p-4 lg:block ${s.pos}`}>
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{s.text}</p>
                </div>
              ))}
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
              {SPECS.map((s) => (
                <div key={s.title} className="glass-dark rounded-2xl p-4">
                  <p className="text-sm font-bold">{s.title}</p>
                  <p className="mt-1 text-xs text-white/60">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TRY IT ON — dark */}
      <section className="container-x mt-6">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-night px-6 py-14 sm:px-12">
          <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-hot/25 blur-[110px]" />
          <div className="relative">
            <TryOnTeaser products={products} />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-x mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-8">
          <h2 className="font-display text-4xl leading-[0.95] font-bold tracking-tighter sm:text-6xl">
            Order on
            <br />
            WhatsApp<span className="text-hot">.</span>
          </h2>
          <p className="max-w-xs text-sm text-ink-soft">No accounts, no card forms. Your order goes straight to a real person who confirms everything with you.</p>
        </div>
        <div className="grid md:grid-cols-3">
          {[
            ["01", "Pick your tees", "Choose colours and sizes — use the 3D fitting room if you're unsure.", ShoppingBag],
            ["02", "Send on WhatsApp", "Checkout opens WhatsApp with your order already written out.", MessageCircle],
            ["03", "Pay & relax", "We confirm stock, share payment details and send your tees on their way.", Truck],
          ].map(([n, t, d, Icon], i) => {
            const I = Icon as typeof Truck;
            return (
              <div key={n as string} className={`py-8 md:px-8 ${i > 0 ? "border-t border-ink/10 md:border-t-0 md:border-l" : "md:pl-0"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.2em] text-hot">{n as string}</span>
                  <I className="h-5 w-5 text-ink-soft" />
                </div>
                <h3 className="font-display mt-6 text-2xl font-semibold tracking-tight">{t as string}</h3>
                <p className="mt-2 text-sm text-ink-soft">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* LOOKBOOK — dark cards */}
      {settings.lookbook.length > 0 && (
        <section className="container-x mt-16">
          <div className="rounded-[2.5rem] bg-night px-6 py-14 text-white sm:px-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-white/50 uppercase">Worn and loved</p>
                <h2 className="font-display mt-3 text-4xl font-bold tracking-tighter uppercase sm:text-5xl">
                  Worn by you<span className="text-hot">.</span>
                </h2>
              </div>
              {settings.socials.instagram && (
                <a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" className="btn glass-dark text-white">
                  Follow us
                </a>
              )}
            </div>
            <div className="no-scrollbar -mx-2 mt-8 flex snap-x gap-4 overflow-x-auto px-2 pb-2">
              {settings.lookbook.map((l, i) => (
                <figure key={i} className="group relative w-[70%] shrink-0 snap-start overflow-hidden rounded-[1.75rem] bg-white/5 min-[480px]:w-[42%] md:w-[30%] lg:w-[23%]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.src} alt={l.caption} loading="lazy" className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                  {l.caption && (
                    <figcaption className="glass-dark absolute right-3 bottom-3 left-3 rounded-xl px-3 py-2 text-xs font-semibold">{l.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
