import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Receipt,
  Browser,
  ShieldCheck,
  DotsThree,
  DotsThreeVertical,
  PencilSimple,
  CaretRight,
  WhatsappLogo,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { readDB } from "@/lib/store";
import { formatPrice, isSoldOut, totalStock, STATUS_LABEL } from "@/lib/shop";
import type { Order } from "@/lib/types";
import SalesChart, { type DayPoint } from "@/components/admin/SalesChart";
import TeeMockup from "@/components/TeeMockup";

const PAID = new Set(["paid", "shipped", "completed"]);
const PENDING = new Set(["new", "awaiting_payment"]);
const DAY = 24 * 3600 * 1000;
const SEG = ["hatch-orange", "hatch-yellow", "hatch-green", "bg-[#5e8f1f]", "bg-[#cfe6a8]", "bg-[#ffd3a8]", "bg-[#d9d9d5]"];

function card(extra = "") {
  return `rounded-[18px] border border-[var(--a-line)] bg-white p-5 ${extra}`;
}

function pct(now: number, before: number) {
  if (!before) return now ? 100 : 0;
  return Math.round(((now - before) / before) * 1000) / 10;
}

function Change({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-1 flex items-center gap-1 text-[11px] ${good ? "text-[var(--a-green-deep)]" : "text-[#c2611f]"}`}>
      <Icon size={13} weight="bold" /> {Math.abs(value)}% <span className="text-[var(--a-muted)]">vs previous 7 days</span>
    </p>
  );
}

export default async function Dashboard() {
  const db = await readDB();
  const now = Date.now();
  const live = db.orders.filter((o) => o.status !== "cancelled");
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const today = startOfDay(now);

  // per-day series (30 days)
  const days: DayPoint[] = Array.from({ length: 30 }, (_, i) => {
    const start = today - (29 - i) * DAY;
    const inDay = live.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= start && t < start + DAY;
    });
    return {
      date: new Date(start).toISOString(),
      paid: inDay.filter((o) => PAID.has(o.status)).reduce((n, o) => n + o.total, 0),
      pending: inDay.filter((o) => PENDING.has(o.status)).reduce((n, o) => n + o.total, 0),
      orders: inDay.length,
    };
  });

  const inRange = (o: Order, from: number, to: number) => {
    const t = new Date(o.createdAt).getTime();
    return t >= from && t < to;
  };
  const wk = live.filter((o) => inRange(o, today - 6 * DAY, now + DAY));
  const prevWk = live.filter((o) => inRange(o, today - 13 * DAY, today - 6 * DAY));
  const sum = (list: Order[], set: Set<string>) => list.filter((o) => set.has(o.status)).reduce((n, o) => n + o.total, 0);
  const paid7 = sum(wk, PAID);
  const pending7 = sum(wk, PENDING);
  const month = live.filter((o) => inRange(o, today - 29 * DAY, now + DAY));

  // product mix (30 days)
  const byProduct = new Map<string, { name: string; revenue: number }>();
  for (const o of month)
    for (const i of o.items) {
      const e = byProduct.get(i.productId) ?? { name: i.name, revenue: 0 };
      e.revenue += i.price * i.qty;
      byProduct.set(i.productId, e);
    }
  const mix = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
  const mixTotal = mix.reduce((n, m) => n + m.revenue, 0);

  // fulfilment gauge
  const fulfilled = month.filter((o) => o.status === "shipped" || o.status === "completed").length;
  const fulfilPct = month.length ? Math.round((fulfilled / month.length) * 100) : 0;

  // stock
  const active = db.products.filter((p) => p.status === "active");
  const variants = active.flatMap((p) => p.variants);
  const inStockSizes = variants.filter((v) => v.stock > 0).length;
  const units = active.reduce((n, p) => n + totalStock(p), 0);
  const stockPct = variants.length ? Math.round((inStockSizes / variants.length) * 100) : 0;

  const lowStock = active
    .map((p) => {
      const sizes = p.variants.length;
      const ok = p.variants.filter((v) => v.stock > 0).length;
      return { p, ok, sizes, low: p.variants.filter((v) => v.stock > 0 && v.stock <= 2).length, units: totalStock(p) };
    })
    .sort((a, b) => a.ok / a.sizes - b.ok / b.sizes)
    .slice(0, 4);

  // customers & orders
  const seen = new Set<string>();
  const customers = db.orders.filter((o) => (seen.has(o.customer.phone) ? false : (seen.add(o.customer.phone), true))).slice(0, 6);
  const recent = db.orders.slice(0, 7);
  const whatsappMissing = db.settings.whatsappNumber.replace(/0/g, "").length < 3;
  const soldOutCount = db.products.filter((p) => isSoldOut(p) && p.status === "active").length;

  const tip = whatsappMissing
    ? { title: "Connect your WhatsApp number", text: "Orders can't reach your phone until you add the number customers should message.", href: "/admin/settings", cta: "Add number" }
    : lowStock.some((l) => l.ok < l.sizes)
      ? {
          title: "Restock before your next drop",
          text: `${lowStock.filter((l) => l.ok < l.sizes).length} products have sold-out sizes. Update stock so customers can keep ordering.`,
          href: "/admin/products?filter=low",
          cta: "Review stock",
        }
      : { title: "Feature your best seller", text: "Products marked “Featured” appear first on the home page hanger rail.", href: "/admin/products", cta: "Manage products" };

  const collections = db.collections.map((c) => {
    const ps = db.products.filter((p) => p.collection === c.slug);
    return { ...c, products: ps.length, units: ps.reduce((n, p) => n + totalStock(p), 0) };
  });

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
      {/* ================= LEFT ================= */}
      <div className="min-w-0 space-y-4">
        {/* sales + stats */}
        <div className="grid rounded-[18px] border border-[var(--a-line)] bg-white lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="min-w-0 p-5">
            <SalesChart days={days} />
          </div>
          <div className="grid grid-cols-1 divide-y divide-[var(--a-line)] border-t border-[var(--a-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:border-t-0 lg:border-l">
            <div className="p-5">
              <p className="text-xs text-[var(--a-muted)]">Paid revenue</p>
              <p className="font-display mt-1 text-[26px] font-semibold tracking-tight">{formatPrice(paid7)}</p>
              <Change value={pct(paid7, sum(prevWk, PAID))} />
            </div>
            <div className="p-5">
              <p className="text-xs text-[var(--a-muted)]">Awaiting payment</p>
              <p className="font-display mt-1 text-[26px] font-semibold tracking-tight">{formatPrice(pending7)}</p>
              <Change value={pct(pending7, sum(prevWk, PENDING))} invert />
            </div>
            <div className="p-5">
              <p className="text-xs text-[var(--a-muted)]">Orders</p>
              <p className="font-display mt-1 text-[26px] font-semibold tracking-tight">{wk.length}</p>
              <Change value={pct(wk.length, prevWk.length)} />
            </div>
          </div>
        </div>

        {/* stock + tip */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className={card()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-semibold">Stock in the shop</p>
                <p className="text-xs text-[var(--a-muted)]">
                  {units} items across {active.length} live products
                </p>
              </div>
              <Link href="/admin/products" className="text-[var(--a-muted)] hover:text-[var(--a-ink)]" aria-label="Edit stock">
                <PencilSimple size={17} />
              </Link>
            </div>
            <div className="mt-5 h-4 overflow-hidden rounded-md bg-[var(--a-soft)]">
              <div className="hatch-green h-full rounded-md" style={{ width: `${stockPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px]">
              <span className="font-semibold">{inStockSizes} sizes in stock</span>
              <span className="text-[var(--a-muted)]">{variants.length} sizes total</span>
            </div>
          </div>
          <Link href={tip.href} className={card("relative overflow-hidden transition hover:border-[#d6d6d2]")}>
            <div className="relative z-10 max-w-[70%]">
              <p className="text-[15px] font-semibold">{tip.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--a-muted)]">{tip.text}</p>
              <p className="mt-4 flex items-center gap-1 text-[13px] font-semibold">
                {tip.cta} <CaretRight size={13} weight="bold" />
              </p>
            </div>
            <div className="absolute right-4 bottom-4 grid grid-cols-3 gap-1.5" aria-hidden>
              {["", "", "hatch-green", "", "hatch-yellow", "hatch-green", "hatch-orange", "hatch-green", "hatch-green"].map((c, i) => (
                <span key={i} className={`h-6 w-6 rounded-md ${c || "bg-transparent"}`} />
              ))}
            </div>
            {whatsappMissing && <Warning size={18} weight="fill" className="absolute top-5 right-5 text-[var(--a-orange)]" />}
          </Link>
        </div>

        {/* mix / fulfilment / stock tracker */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={card()}>
            <p className="text-[15px] font-semibold">Sales by product</p>
            <p className="text-xs text-[var(--a-muted)]">Last 30 days</p>
            <p className="font-display mt-3 text-[26px] font-semibold tracking-tight">{formatPrice(mixTotal)}</p>
            <div className="mt-3 flex h-5 gap-1">
              {(mix.length ? mix : [{ name: "No sales yet", revenue: 1 }]).slice(0, 7).map((m, i) => (
                <div key={m.name} className={`${mix.length ? SEG[i % SEG.length] : "hatch-grey"} rounded-[5px]`} style={{ flex: Math.max(m.revenue, 1) }} title={m.name} />
              ))}
            </div>
            <ul className="mt-4 space-y-2 text-[13px]">
              {mix.slice(0, 6).map((m, i) => (
                <li key={m.name} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={`${SEG[i % SEG.length]} h-2.5 w-2.5 shrink-0 rounded-sm`} />
                    <span className="truncate">{m.name}</span>
                  </span>
                  <span className="font-semibold">{Math.round((m.revenue / mixTotal) * 100)}%</span>
                </li>
              ))}
              {!mix.length && <li className="text-xs text-[var(--a-muted)]">Sales appear here once orders come in.</li>}
            </ul>
          </div>

          <div className={card("flex flex-col")}>
            <p className="text-[15px] font-semibold">Order fulfilment</p>
            <p className="text-xs text-[var(--a-muted)]">Shipped or completed, last 30 days</p>
            <p className="font-display mt-3 text-[26px] font-semibold tracking-tight">{formatPrice(sum(month, PAID))}</p>
            <p className="text-[11px] text-[var(--a-muted)]">paid in the last 30 days</p>
            <div className="relative mx-auto mt-4 w-full max-w-[230px]">
              <Gauge value={fulfilPct} />
              <div className="absolute inset-x-0 bottom-1 text-center">
                <p className="font-display text-2xl font-semibold">{fulfilPct}%</p>
                <p className="text-[11px] text-[var(--a-muted)]">
                  {fulfilled} of {month.length} orders
                </p>
              </div>
            </div>
          </div>

          <div className={card()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[15px] font-semibold">Stock tracker</p>
                <p className="text-xs text-[var(--a-muted)]">Sizes available per product</p>
              </div>
              <Link href="/admin/products/new" className="flex items-center gap-1 rounded-lg border border-[var(--a-line)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--a-soft)]">
                <Plus size={12} weight="bold" /> Add
              </Link>
            </div>
            <ul className="mt-4 space-y-3.5">
              {lowStock.map(({ p, ok, sizes, units: u }) => {
                const c = p.colors[0];
                const ratio = sizes ? ok / sizes : 0;
                return (
                  <li key={p.id}>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                      <span className="h-11 w-11 shrink-0 rounded-lg bg-[var(--a-soft)] p-0.5">
                        {c && <TeeMockup hex={c.hex} print={c.print} printScale={p.printScale} printOffsetY={p.printOffsetY} shadow={false} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2 text-[13px]">
                          <span className="truncate font-semibold">{p.name}</span>
                          <span className="shrink-0 text-[11px]">
                            <b>{ok}</b>
                            <span className="text-[var(--a-muted)]">/{sizes}</span>
                          </span>
                        </span>
                        <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[var(--a-soft)]">
                          <span className={`block h-full rounded-full ${ratio < 0.5 ? "hatch-orange" : "hatch-green"}`} style={{ width: `${ratio * 100}%` }} />
                        </span>
                        <span className="mt-1 block text-[10px] text-[var(--a-muted)]">{u} items left</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {soldOutCount > 0 && (
              <Link href="/admin/products?filter=soldout" className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--a-green-deep)]">
                {soldOutCount} sold out — review <CaretRight size={11} weight="bold" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ================= RIGHT ================= */}
      <div className="space-y-4">
        <div className={card()}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[15px] font-semibold">My store</p>
              <p className="text-xs text-[var(--a-muted)]">Collections & quick actions</p>
            </div>
            <Link href="/admin/settings" className="flex items-center gap-1 rounded-lg border border-[var(--a-line)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--a-soft)]">
              <Plus size={12} weight="bold" /> Collection
            </Link>
          </div>
          <div className="no-scrollbar -mx-5 mt-4 flex gap-3 overflow-x-auto px-5">
            {collections.map((c, i) => (
              <Link
                key={c.slug}
                href="/admin/products"
                className={`relative flex aspect-[1.6/1] w-[82%] shrink-0 flex-col justify-between rounded-2xl p-4 ${i === 0 ? "hatch-green text-white" : "bg-[#efefec] text-[var(--a-ink)]"}`}
              >
                <div className="flex items-start justify-between text-[11px] font-semibold">
                  <span>{i === 0 ? "Main collection" : "Collection"}</span>
                  <span className={`text-sm font-bold ${c.slug === "hiswona" ? "font-script italic" : "font-display tracking-tight"}`}>{c.name}</span>
                </div>
                <div>
                  <p className="font-mono text-[13px] tracking-widest opacity-90">•••• {String(c.units).padStart(4, "0")}</p>
                  <div className="mt-2 flex justify-between text-[11px] opacity-90">
                    <span>{c.products} products</span>
                    <span>{c.units} in stock</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px]">
            {[
              { href: "/admin/products/new", label: "Add", Icon: Plus },
              { href: "/admin/orders", label: "Orders", Icon: Receipt },
              { href: "/admin/settings", label: "Website", Icon: Browser },
              { href: "/admin/security", label: "Security", Icon: ShieldCheck },
              { href: "/admin/account", label: "More", Icon: DotsThree },
            ].map(({ href, label, Icon }) => (
              <Link key={label} href={href} className="group">
                <span className="mx-auto grid aspect-square w-full max-w-[52px] place-items-center rounded-xl border border-[var(--a-line)] transition group-hover:bg-[var(--a-soft)]">
                  <Icon size={20} />
                </span>
                <span className="mt-1.5 block">{label}</span>
              </Link>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-[13px] font-semibold">Recent customers</p>
            <Link href="/admin/orders" className="text-[var(--a-muted)]" aria-label="All orders">
              <DotsThreeVertical size={18} weight="bold" />
            </Link>
          </div>
          {customers.length ? (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {customers.map((o) => (
                <Link key={o.id} href={`/admin/orders/${o.id}`} className="text-center" title={o.customer.name}>
                  <span className={`mx-auto grid aspect-square w-full max-w-[44px] place-items-center rounded-xl text-[13px] font-bold ${avatarColor(o.customer.name)}`}>
                    {initials(o.customer.name)}
                  </span>
                  <span className="mt-1 block truncate text-[11px]">{o.customer.name.split(" ")[0]}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--a-muted)]">Customers appear here after their first order.</p>
          )}
        </div>

        <div className={card()}>
          <div className="flex items-start justify-between">
            <p className="text-[15px] font-semibold">Recent orders</p>
            <Link href="/admin/orders" className="rounded-lg border border-[var(--a-line)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--a-soft)]">
              View all
            </Link>
          </div>
          <div className="mt-3 flex justify-between border-b border-[var(--a-line)] pb-2 text-[11px] text-[var(--a-muted)]">
            <span>Customer</span>
            <span>Amount</span>
          </div>
          {recent.length === 0 ? (
            <div className="py-8 text-center">
              <WhatsappLogo size={28} className="mx-auto text-[var(--a-muted)]" />
              <p className="mt-2 text-xs text-[var(--a-muted)]">No orders yet. They appear here the moment a customer checks out.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--a-line)]">
              {recent.map((o) => {
                const first = o.items[0];
                const p = db.products.find((x) => x.id === first?.productId);
                const c = p?.colors.find((x) => x.id === first?.colorId);
                const tone = o.status === "cancelled" ? "text-[var(--a-red)]" : PAID.has(o.status) ? "text-[var(--a-green-deep)]" : "text-[#c2611f]";
                return (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5">
                      <span className="h-9 w-9 shrink-0 rounded-lg bg-[var(--a-soft)] p-0.5">{c && p ? <TeeMockup hex={c.hex} print={c.print} printScale={p.printScale} shadow={false} /> : null}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{o.customer.name}</span>
                        <span className="block text-[10px] text-[var(--a-muted)]">
                          {o.ref} · {new Date(o.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-[13px] font-semibold">{formatPrice(o.total)}</span>
                        <span className={`block text-[10px] ${tone}`}>{STATUS_LABEL[o.status]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  // semicircle of 12 segments; filled ones are hatched green
  const segs = 12;
  const filled = Math.round((value / 100) * segs);
  const r = 80;
  const cx = 100;
  const cy = 100;
  const arcs = Array.from({ length: segs }, (_, i) => {
    const a0 = Math.PI + (i / segs) * Math.PI + 0.03;
    const a1 = Math.PI + ((i + 1) / segs) * Math.PI - 0.03;
    const p = (a: number, rad: number) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
    return `M ${p(a0, r)} A ${r} ${r} 0 0 1 ${p(a1, r)} L ${p(a1, r - 26)} A ${r - 26} ${r - 26} 0 0 0 ${p(a0, r - 26)} Z`;
  });
  return (
    <svg viewBox="0 0 200 110" className="w-full" role="img" aria-label={`${value}% fulfilled`}>
      <defs>
        <pattern id="gauge-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="#8cc63f" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
        </pattern>
      </defs>
      {arcs.map((d, i) => (
        <path key={i} d={d} fill={i < filled ? "url(#gauge-hatch)" : "#efefec"} />
      ))}
    </svg>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const palette = ["bg-[#eef7e0] text-[#4d7a17]", "bg-[#fff3d6] text-[#8a6a00]", "bg-[#ffe7d4] text-[#a2531a]", "bg-[#ececea] text-[#3d3d3a]", "bg-[#e3effa] text-[#2c5d8a]", "bg-[#f3e6f7] text-[#7a3f8f]"];
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
}
