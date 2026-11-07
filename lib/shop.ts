import type { Product, Size, Settings, Order, PublicProduct } from "./types";

export function formatPrice(n: number) {
  return "R" + Math.round(n).toLocaleString("en-ZA").replace(/,/g, " ");
}

export function stockOf(p: Pick<Product, "variants">, colorId: string, size: Size) {
  return p.variants.find((v) => v.colorId === colorId && v.size === size)?.stock ?? 0;
}

export function totalStock(p: Pick<Product, "variants">) {
  return p.variants.reduce((n, v) => n + Math.max(0, v.stock), 0);
}

export function colorStock(p: Pick<Product, "variants">, colorId: string) {
  return p.variants.filter((v) => v.colorId === colorId).reduce((n, v) => n + Math.max(0, v.stock), 0);
}

export function isSoldOut(p: Pick<Product, "variants">) {
  return totalStock(p) <= 0;
}

export function toPublic(p: Product): PublicProduct {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, updatedAt, ...rest } = p;
  return rest;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function normalisePhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "27" + d.slice(1);
  return d;
}

export function orderMessage(order: Order, settings: Settings) {
  const lines = [
    `Hi ${settings.storeName.replace(/…|\.\.\./g, "")}! 👋 I'd like to place an order.`,
    "",
    `🧾 Order: *${order.ref}*`,
    "",
    ...order.items.map((i) => `• ${i.name} — ${i.colorName} / ${i.size} × ${i.qty} = ${formatPrice(i.price * i.qty)}`),
    "",
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Delivery (${order.delivery.name}): ${order.deliveryFee ? formatPrice(order.deliveryFee) : "Free"}`,
    `*Total: ${formatPrice(order.total)}*`,
    "",
    `👤 Name: ${order.customer.name}`,
    `📞 Phone: ${order.customer.phone}`,
  ];
  if (order.customer.email) lines.push(`✉️ Email: ${order.customer.email}`);
  if (order.customer.address || order.customer.city)
    lines.push(`📍 Address: ${[order.customer.address, order.customer.city].filter(Boolean).join(", ")}`);
  if (order.customer.note) lines.push(`📝 Note: ${order.customer.note}`);
  lines.push("", "Please send me the payment details. Thank you!");
  return lines.join("\n");
}

export function whatsappLink(number: string, text: string) {
  return `https://wa.me/${normalisePhone(number)}?text=${encodeURIComponent(text)}`;
}

export const STATUS_LABEL: Record<Order["status"], string> = {
  new: "New",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  shipped: "Shipped",
  completed: "Completed",
  cancelled: "Cancelled",
};
