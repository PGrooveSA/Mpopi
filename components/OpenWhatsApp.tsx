"use client";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

/** Big WhatsApp button; right after checkout it opens WhatsApp automatically once. */
export default function OpenWhatsApp({ url, orderId, auto }: { url: string; orderId: string; auto: boolean }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!auto) return;
    const key = `mpopi-order-${orderId}`;
    let pending = false;
    try {
      pending = sessionStorage.getItem(key) !== null;
      sessionStorage.removeItem(key);
    } catch {}
    if (!pending) return;
    setCount(3);
    const t = setInterval(() => {
      setCount((c) => {
        if (c === null) return c;
        if (c <= 1) {
          clearInterval(t);
          window.location.href = url;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [auto, orderId, url]);

  return (
    <div className="relative mt-8">
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-whatsapp px-8 py-4 text-base">
        <MessageCircle className="h-5 w-5" /> Send order on WhatsApp
      </a>
      {count !== null && count > 0 && <p className="mt-3 text-sm font-semibold text-ink-soft">Opening WhatsApp in {count}…</p>}
    </div>
  );
}
