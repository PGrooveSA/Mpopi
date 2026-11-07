import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { mutate } from "@/lib/store";
import { rateLimit, clientIp } from "@/lib/auth";
import { bad, str } from "@/lib/api";
import { orderMessage, whatsappLink, normalisePhone } from "@/lib/shop";
import { ALL_SIZES, type Order, type OrderItem, type Size } from "@/lib/types";

class OrderError extends Error {}

export async function POST(req: Request) {
  if (!rateLimit("order:" + clientIp(req), 8, 10 * 60 * 1000)) {
    return bad("Too many orders from this device. Please try again in a few minutes.", 429);
  }
  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.items) || body.items.length === 0) return bad("Your cart is empty.");
  if (body.items.length > 50) return bad("Too many items in one order.");

  const name = str(body.customer?.name, 100);
  const phone = str(body.customer?.phone, 30);
  if (name.length < 2) return bad("Please enter your name.");
  if (normalisePhone(phone).length < 9) return bad("Please enter a valid WhatsApp number.");

  try {
    const result = await mutate((db) => {
      const delivery = db.settings.deliveryOptions.find((d) => d.id === body.deliveryId);
      if (!delivery) throw new OrderError("Please choose a delivery option.");
      const address = str(body.customer?.address, 300);
      const city = str(body.customer?.city, 100);
      if (delivery.requiresAddress && (address.length < 5 || city.length < 2))
        throw new OrderError("Please enter your delivery address and city.");

      // merge duplicate lines, then validate every line against live stock
      const merged = new Map<string, { productId: string; colorId: string; size: Size; qty: number }>();
      for (const raw of body.items) {
        const size = String(raw.size) as Size;
        const qty = Math.floor(Number(raw.qty));
        if (!ALL_SIZES.includes(size) || !(qty > 0) || qty > 99) throw new OrderError("Invalid item in cart.");
        const key = `${raw.productId}|${raw.colorId}|${size}`;
        const prev = merged.get(key);
        merged.set(key, { productId: String(raw.productId), colorId: String(raw.colorId), size, qty: (prev?.qty ?? 0) + qty });
      }

      const items: OrderItem[] = [];
      for (const line of merged.values()) {
        const p = db.products.find((x) => x.id === line.productId && x.status === "active");
        const color = p?.colors.find((c) => c.id === line.colorId);
        const variant = p?.variants.find((v) => v.colorId === line.colorId && v.size === line.size);
        if (!p || !color || !variant) throw new OrderError("One of the items in your cart is no longer available.");
        if (variant.stock < line.qty) {
          throw new OrderError(
            variant.stock <= 0
              ? `${p.name} (${color.name}, ${line.size}) just sold out. Please remove it from your cart.`
              : `Only ${variant.stock} left of ${p.name} (${color.name}, ${line.size}). Please update your cart.`,
          );
        }
        items.push({ productId: p.id, slug: p.slug, name: p.name, colorId: color.id, colorName: color.name, size: line.size, qty: line.qty, price: p.price });
      }

      // reserve stock
      for (const i of items) {
        const v = db.products.find((p) => p.id === i.productId)!.variants.find((v) => v.colorId === i.colorId && v.size === i.size)!;
        v.stock -= i.qty;
      }

      const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
      const free = db.settings.freeDeliveryOver > 0 && subtotal >= db.settings.freeDeliveryOver;
      const deliveryFee = free ? 0 : delivery.price;
      db.orderSeq += 1;
      const now = new Date().toISOString();
      const order: Order = {
        id: nanoid(16),
        ref: `MP-${db.orderSeq}`,
        createdAt: now,
        updatedAt: now,
        status: "new",
        customer: {
          name,
          phone,
          email: str(body.customer?.email, 200) || undefined,
          address: address || undefined,
          city: city || undefined,
          note: str(body.customer?.note, 500) || undefined,
        },
        delivery: { id: delivery.id, name: delivery.name, price: delivery.price },
        items,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
      };
      db.orders.unshift(order);
      return { order, url: whatsappLink(db.settings.whatsappNumber, orderMessage(order, db.settings)) };
    });
    return NextResponse.json({ id: result.order.id, ref: result.order.ref, whatsappUrl: result.url });
  } catch (e) {
    if (e instanceof OrderError) return bad(e.message, 409);
    console.error(e);
    return bad("Could not place your order. Please try again.", 500);
  }
}
