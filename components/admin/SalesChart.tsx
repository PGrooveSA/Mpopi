"use client";
import { useMemo, useState } from "react";
import { CaretDown, ChartBar, ChartLine } from "@phosphor-icons/react";
import { formatPrice } from "@/lib/shop";

export interface DayPoint {
  date: string; // ISO day
  paid: number;
  pending: number;
  orders: number;
}

/** Sales overview: big total, bar/line toggle and a per-day breakdown on hover. */
export default function SalesChart({ days }: { days: DayPoint[] }) {
  const [range, setRange] = useState<7 | 30>(7);
  const [mode, setMode] = useState<"bar" | "line">("bar");
  const data = useMemo(() => days.slice(-range), [days, range]);
  const [active, setActive] = useState<number | null>(null);
  const best = data.reduce((b, d, i) => (d.paid + d.pending > data[b].paid + data[b].pending ? i : b), 0);
  const sel = active ?? best;
  const total = data.reduce((n, d) => n + d.paid + d.pending, 0);
  const max = Math.max(1, ...data.map((d) => d.paid + d.pending));
  const nice = niceMax(max);
  const ticks = [nice, nice * 0.75, nice * 0.5, nice * 0.25, 0];
  const label = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", range === 7 ? { weekday: "short" } : { day: "numeric" });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[34px] leading-none font-semibold tracking-tight">{formatPrice(total)}</p>
          <p className="mt-1.5 text-xs text-[var(--a-muted)]">Sales overview · last {range} days</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRange(range === 7 ? 30 : 7);
              setActive(null);
            }}
            className="flex h-8 items-center gap-1 rounded-lg border border-[var(--a-line)] px-2.5 text-xs font-semibold hover:bg-[var(--a-soft)]"
          >
            {range}d <CaretDown size={12} />
          </button>
          <div className="flex rounded-lg border border-[var(--a-line)] p-0.5">
            <button onClick={() => setMode("bar")} className={`grid h-7 w-7 place-items-center rounded-md ${mode === "bar" ? "bg-[var(--a-soft)]" : "text-[var(--a-muted)]"}`} aria-label="Bar chart">
              <ChartBar size={15} />
            </button>
            <button onClick={() => setMode("line")} className={`grid h-7 w-7 place-items-center rounded-md ${mode === "line" ? "bg-[var(--a-soft)]" : "text-[var(--a-muted)]"}`} aria-label="Line chart">
              <ChartLine size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-4 text-[11px] text-[#5d5d59]">
        <span className="flex items-center gap-1.5">
          <span className="hatch-green h-2.5 w-2.5 rounded-sm" /> Paid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="hatch-yellow h-2.5 w-2.5 rounded-sm" /> Awaiting payment
        </span>
      </div>

      <div className="relative mt-2 flex min-h-[220px] flex-1">
        <div className="flex w-12 shrink-0 flex-col justify-between pb-6 text-[10px] text-[var(--a-muted)]">
          {ticks.map((t) => (
            <span key={t}>{t >= 1000 ? `R${Math.round(t / 1000)}k` : `R${Math.round(t)}`}</span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {ticks.map((t) => (
              <div key={t} className="border-t border-dashed border-[#e6e6e3]" />
            ))}
          </div>

          {mode === "bar" ? (
            <div className="absolute inset-x-0 top-0 bottom-0 flex items-end gap-[3%]">
              {data.map((d, i) => {
                const h = ((d.paid + d.pending) / nice) * 100;
                const on = i === sel;
                return (
                  <button
                    key={d.date}
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end pb-6 outline-none"
                    aria-label={`${label(d.date)}: ${formatPrice(d.paid + d.pending)}`}
                  >
                    <div className="flex w-full max-w-[64px] flex-col justify-end overflow-hidden rounded-lg" style={{ height: `${Math.max(h, 4)}%` }}>
                      {on ? (
                        <>
                          <div className="hatch-yellow w-full" style={{ height: `${d.paid + d.pending ? (d.pending / (d.paid + d.pending)) * 100 : 0}%` }} />
                          <div className="hatch-green w-full flex-1" />
                        </>
                      ) : (
                        <div className="hatch-grey h-full w-full transition group-hover:bg-[#e6e6e3]" />
                      )}
                    </div>
                    <span className={`absolute bottom-0 text-[11px] ${on ? "font-semibold text-[var(--a-ink)]" : "text-[var(--a-muted)]"}`}>{label(d.date)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <svg className="absolute inset-x-0 top-0 bottom-6 h-[calc(100%-24px)] w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="var(--a-green)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                points={data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * 100},${100 - ((d.paid + d.pending) / nice) * 100}`).join(" ")}
              />
              {data.map((d, i) => (
                <circle
                  key={d.date}
                  cx={(i / Math.max(1, data.length - 1)) * 100}
                  cy={100 - ((d.paid + d.pending) / nice) * 100}
                  r={i === sel ? 1.8 : 1}
                  fill={i === sel ? "var(--a-ink)" : "var(--a-green)"}
                  onMouseEnter={() => setActive(i)}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}

          {data[sel] && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-44 rounded-xl border border-[var(--a-line)] bg-white p-3 text-[11px] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.25)]"
              style={{ left: `min(calc(${((sel + 0.5) / data.length) * 100}% + 12px), calc(100% - 11rem))` }}
            >
              <p className="mb-1.5 text-[var(--a-muted)]">{new Date(data[sel].date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</p>
              <Row color="hatch-green" label="Paid" value={formatPrice(data[sel].paid)} />
              <Row color="hatch-yellow" label="Awaiting" value={formatPrice(data[sel].pending)} />
              <Row color="bg-[var(--a-ink)]" label="Orders" value={String(data[sel].orders)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="flex items-center gap-1.5">
        <span className={`${color} h-2 w-2 rounded-full`} />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function niceMax(v: number) {
  const steps = [500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000, 250000, 500000, 1000000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 1000000) * 1000000;
}
