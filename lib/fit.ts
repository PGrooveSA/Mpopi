import type { Size, SizeChartRow } from "./types";

export type BodyType = "female" | "male";

/** Body chest circumference (cm) the mannequin represents for each body size. */
export const BODY_CHEST: Record<BodyType, Record<Size, number>> = {
  female: { XS: 80, S: 86, M: 92, L: 98, XL: 106, "2XL": 114, "3XL": 124 },
  male: { XS: 84, S: 90, M: 96, L: 104, XL: 112, "2XL": 120, "3XL": 130 },
};

export interface FitResult {
  ease: number;
  label: "Too tight" | "Snug" | "Regular" | "Relaxed" | "Oversized";
  tone: "bad" | "ok" | "good" | "loose" | "over";
  detail: string;
}

export function fitFor(garment: SizeChartRow | undefined, body: BodyType, bodySize: Size): FitResult {
  const chest = BODY_CHEST[body][bodySize];
  const ease = (garment?.chest ?? chest + 12) - chest;
  if (ease < 2) return { ease, label: "Too tight", tone: "bad", detail: "This size will pull across the chest. Go up a size or two." };
  if (ease < 8) return { ease, label: "Snug", tone: "ok", detail: `About ${ease} cm of room — a close, fitted look.` };
  if (ease < 16) return { ease, label: "Regular", tone: "good", detail: `About ${ease} cm of room — the classic, comfortable fit.` };
  if (ease < 22) return { ease, label: "Relaxed", tone: "loose", detail: `About ${ease} cm of room — easy, slightly boxy streetwear fit.` };
  return { ease, label: "Oversized", tone: "over", detail: `About ${ease} cm of room — a big, oversized silhouette.` };
}

export function recommendSize(chart: SizeChartRow[], sizes: Size[], body: BodyType, bodySize: Size, style: "regular" | "oversized" = "regular") {
  const chest = BODY_CHEST[body][bodySize];
  const target = style === "regular" ? 8 : 22;
  const rows = chart.filter((r) => sizes.includes(r.size)).sort((a, b) => a.chest - b.chest);
  return rows.find((r) => r.chest - chest >= target)?.size ?? rows[rows.length - 1]?.size;
}
