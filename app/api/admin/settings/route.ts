import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { mutate } from "@/lib/store";
import { adminRoute, bad, str, num, UserError, safeImageUrl, safeLink } from "@/lib/api";
import { slugify } from "@/lib/shop";
import { ALL_SIZES, type Settings, type Collection, type Size } from "@/lib/types";

const url = safeImageUrl;
const link = safeLink;
const arr = (v: unknown) => (Array.isArray(v) ? v : []) as Record<string, unknown>[];

export const PUT = adminRoute(async (req: Request) => {
  const body = await req.json().catch(() => null);
  if (!body?.settings) return bad("Invalid request.");
  const s = body.settings;

  const settings: Settings = {
    storeName: str(s.storeName, 60) || "MPOPI…",
    whatsappNumber: str(s.whatsappNumber, 20).replace(/[^\d]/g, ""),
    contactEmail: str(s.contactEmail, 120),
    announcement: str(s.announcement, 200),
    hideSoldOut: !!s.hideSoldOut,
    freeDeliveryOver: Math.max(0, Math.round(num(s.freeDeliveryOver, 0))),
    hero: {
      eyebrow: str(s.hero?.eyebrow, 100),
      title: str(s.hero?.title, 120),
      subtitle: str(s.hero?.subtitle, 400),
      image: url(s.hero?.image),
    },
    about: { title: str(s.about?.title, 120), body: str(s.about?.body, 5000, true), image: url(s.about?.image) },
    deliveryOptions: arr(s.deliveryOptions)
      .slice(0, 10)
      .map((d, i) => ({
        id: slugify(str(d.id, 40) || str(d.name, 40)) || `option-${i + 1}`,
        name: str(d.name, 60),
        description: str(d.description, 160),
        price: Math.max(0, Math.round(num(d.price, 0))),
        requiresAddress: !!d.requiresAddress,
      }))
      .filter((d) => d.name),
    sizeChart: arr(s.sizeChart)
      .filter((r) => ALL_SIZES.includes(r.size as Size))
      .map((r) => ({ size: r.size as Size, chest: num(r.chest, 0), length: num(r.length, 0), sleeve: num(r.sleeve, 0) })),
    faqs: arr(s.faqs)
      .map((f) => ({ q: str(f.q, 200), a: str(f.a, 1500, true) }))
      .filter((f) => f.q && f.a)
      .slice(0, 40),
    socials: { instagram: link(s.socials?.instagram), tiktok: link(s.socials?.tiktok), facebook: link(s.socials?.facebook) },
    lookbook: arr(s.lookbook)
      .map((l) => ({ src: url(l.src), caption: str(l.caption, 120) }))
      .filter((l) => l.src)
      .slice(0, 40),
  };
  if (!settings.deliveryOptions.length) return bad("Add at least one delivery option.");
  if (settings.whatsappNumber.length < 9) return bad("Please enter the WhatsApp number orders should go to (e.g. 27821234567).");

  const collectionsIn = Array.isArray(body.collections) ? body.collections : null;
  try {
    await mutate((db) => {
      if (collectionsIn) {
        const next: Collection[] = collectionsIn.slice(0, 20).map((c: Record<string, unknown>) => ({
          slug: slugify(str(c.slug, 40) || str(c.name, 40)),
          name: str(c.name, 60),
          tagline: str(c.tagline, 120),
          description: str(c.description, 500),
          image: url(c.image),
          accent: /^#[0-9a-f]{6}$/i.test(str(c.accent, 7)) ? str(c.accent, 7) : "#F0609A",
        }));
        if (next.some((c) => !c.slug || !c.name)) throw new UserError("Every collection needs a name.");
        if (new Set(next.map((c) => c.slug)).size !== next.length) throw new UserError("Two collections have the same name.");
        const used = new Set(db.products.map((p) => p.collection));
        const missing = [...used].filter((slug) => !next.some((c) => c.slug === slug));
        if (missing.length) throw new UserError(`You can't remove a collection that still has products (${missing.join(", ")}).`);
        db.collections = next;
      }
      db.settings = settings;
    });
  } catch (e) {
    if (e instanceof UserError) return bad(e.message);
    throw e;
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
});
