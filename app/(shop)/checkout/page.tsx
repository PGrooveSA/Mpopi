import type { Metadata } from "next";
import { getStore } from "@/lib/data";
import CheckoutForm from "@/components/CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const { settings } = await getStore();
  return (
    <div className="container-x pt-10">
      <p className="eyebrow">Checkout</p>
      <h1 className="font-display mt-2 text-3xl font-bold sm:text-5xl">Almost yours.</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Fill in your details and we&apos;ll open WhatsApp with your order ready to send. We confirm your order and share payment details right there.
      </p>
      <CheckoutForm deliveryOptions={settings.deliveryOptions} freeDeliveryOver={settings.freeDeliveryOver} />
    </div>
  );
}
