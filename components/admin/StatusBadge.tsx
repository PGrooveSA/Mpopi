import type { OrderStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/shop";

const STYLES: Record<OrderStatus, string> = {
  new: "bg-hot text-white",
  awaiting_payment: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  shipped: "bg-sky/50 text-indigo-900",
  completed: "bg-ink/10 text-ink",
  cancelled: "bg-ink/5 text-ink-soft line-through",
};

export default function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`chip whitespace-nowrap ${STYLES[status]}`}>{STATUS_LABEL[status]}</span>;
}
