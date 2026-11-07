import type { DB, Product, Size, ProductColor } from "./types";

const now = () => new Date().toISOString();

const WHITE = "#F6F4F1";
const CHOC = "#3B2622";
const BLACK = "#1C1A1D";
const BLUE = "#A8C5E6";
const PINK = "#F7C6D6";
const CREAM = "#EFE4D4";

function color(id: string, name: string, hex: string, print: string, photos: string[] = [], printBack?: string): ProductColor {
  return { id, name, hex, print, photos, printBack };
}

function stockGrid(colors: ProductColor[], sizes: Size[], base: number[], zero: [string, Size][] = []) {
  const variants: Product["variants"] = [];
  for (const c of colors) {
    sizes.forEach((s, i) => {
      const isZero = zero.some(([cid, sz]) => (cid === c.id || cid === "*") && (sz === s));
      variants.push({ colorId: c.id, size: s, stock: isZero ? 0 : base[i % base.length] });
    });
  }
  return variants;
}

function product(p: Omit<Product, "createdAt" | "updatedAt" | "backPrintScale"> & { backPrintScale?: number }): Product {
  return { backPrintScale: 0.9, ...p, createdAt: now(), updatedAt: now() };
}

const S: Size[] = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];

export function seedData(): Omit<DB, "admins"> {
  const teddyColors = [
    color("white", "Cloud White", WHITE, "/prints/mpopi-hot.png", ["/photos/look-white-set.webp", "/photos/mpopi-cafe.webp"]),
    color("choc", "Chocolate", CHOC, "/prints/mpopi-soft.png", ["/photos/flat-brown-tee.webp"]),
    color("black", "Midnight", BLACK, "/prints/mpopi-hot.png", ["/photos/stack.webp"]),
    color("blue", "Baby Blue", BLUE, "/prints/mpopi-hot.png", ["/photos/mpopi-tank.webp"]),
  ];
  const hisColors = [
    color("white", "Cloud White", WHITE, "/prints/hiswona-brown.png", ["/photos/hiswona-her.webp", "/photos/hiswona-him.webp"]),
    color("choc", "Chocolate", CHOC, "/prints/hiswona-cream.png", ["/photos/packaging.webp"]),
    color("black", "Midnight", BLACK, "/prints/hiswona-cream.png", ["/photos/stack.webp"]),
  ];

  const products: Product[] = [
    product({
      id: "p_teddy",
      slug: "mpopi-teddy-tee",
      name: "MPOPI Teddy Tee",
      collection: "mpopi",
      description:
        "The one that started it all. Heavyweight cotton tee with our signature MPOPI… teddy print across the chest. Soft hand-feel, relaxed everyday fit and a print that stays bright wash after wash.",
      price: 350,
      sizes: S,
      colors: teddyColors,
      variants: stockGrid(teddyColors, S, [6, 10, 14, 12, 9, 5, 3], [["black", "XS"], ["black", "3XL"], ["blue", "2XL"], ["blue", "3XL"]]),
      printScale: 0.66,
      printOffsetY: 0,
      featured: true,
      isNew: true,
      status: "active",
    }),
    product({
      id: "p_hiswona",
      slug: "hiswona-embroidered-tee",
      name: "Hiswona… Embroidered Tee",
      collection: "hiswona",
      description:
        "Quiet luxury. Our Hiswona… script is embroidered thread-by-thread on a clean, heavyweight tee. Made for him, for her, for everyday.",
      price: 380,
      sizes: S,
      colors: hisColors,
      variants: stockGrid(hisColors, S, [5, 9, 12, 12, 8, 4, 2], [["choc", "XS"]]),
      printScale: 0.42,
      printOffsetY: 6,
      featured: true,
      isNew: false,
      status: "active",
    }),
    product({
      id: "p_backprint",
      slug: "mpopi-big-back-tee",
      name: "MPOPI Big Back Tee",
      collection: "mpopi",
      description:
        "Small bear up front, big statement at the back. The full MPOPI… wordmark printed large across the shoulders.",
      price: 420,
      compareAtPrice: 460,
      sizes: S,
      colors: [
        color("choc", "Chocolate", CHOC, "/brand/bear.png", [], "/prints/mpopi-soft.png"),
        color("white", "Cloud White", WHITE, "/brand/bear.png", [], "/prints/mpopi-hot.png"),
      ],
      variants: [],
      printScale: 0.16,
      printOffsetY: 4,
      backPrintScale: 0.86,
      featured: true,
      isNew: true,
      status: "active",
    }),
    product({
      id: "p_minibear",
      slug: "mpopi-mini-bear-tee",
      name: "Mini Bear Tee",
      collection: "mpopi",
      description: "Just the bear. A soft, minimal tee with a small MPOPI teddy on the chest — the cutest way to wear the brand.",
      price: 300,
      sizes: S,
      colors: [
        color("pink", "Candy Pink", PINK, "/brand/bear.png"),
        color("white", "Cloud White", WHITE, "/brand/bear.png"),
        color("blue", "Baby Blue", BLUE, "/brand/bear.png"),
      ],
      variants: [],
      printScale: 0.2,
      printOffsetY: 8,
      featured: false,
      isNew: false,
      status: "active",
    }),
    product({
      id: "p_hiswona_cream",
      slug: "hiswona-cream-tee",
      name: "Hiswona… Cream Tee",
      collection: "hiswona",
      description: "Warm cream cotton with chocolate Hiswona… embroidery. Pair it with brown for the full look.",
      price: 380,
      sizes: S,
      colors: [color("cream", "Cream", CREAM, "/prints/hiswona-brown.png"), color("blue", "Baby Blue", BLUE, "/prints/hiswona-brown.png")],
      variants: [],
      printScale: 0.42,
      printOffsetY: 6,
      featured: false,
      isNew: true,
      status: "active",
    }),
    product({
      id: "p_launch",
      slug: "mpopi-launch-edition-tee",
      name: "Launch Edition Tee",
      collection: "mpopi",
      description: "Our very first run, numbered and gone in days. Sold out — follow us for restocks.",
      price: 400,
      sizes: S,
      colors: [color("pink", "Candy Pink", PINK, "/prints/mpopi-hot.png")],
      variants: [],
      printScale: 0.66,
      printOffsetY: 0,
      featured: false,
      isNew: false,
      status: "active",
    }),
  ];

  // fill stock grids for products created with empty variants
  for (const p of products) {
    if (p.variants.length) continue;
    const base = p.id === "p_launch" ? [0] : p.id === "p_hiswona_cream" ? [4, 6, 8, 8, 6, 3, 2] : [5, 8, 10, 10, 7, 4, 2];
    p.variants = stockGrid(p.colors, p.sizes, base, p.id === "p_hiswona_cream" ? [["blue", "XS"], ["blue", "S"], ["blue", "M"], ["blue", "L"], ["blue", "XL"], ["blue", "2XL"], ["blue", "3XL"]] : []);
  }

  return {
    version: 1,
    orderSeq: 1000,
    settings: {
      storeName: "MPOPI…",
      whatsappNumber: "27000000000",
      contactEmail: "hello@mpopi.co.za",
      announcement: "Free delivery on orders over R1 000 · Order & pay easily on WhatsApp",
      hideSoldOut: false,
      freeDeliveryOver: 1000,
      hero: {
        eyebrow: "New drop · MPOPI… × Hiswona…",
        title: "Soft feelings, loud tees.",
        subtitle:
          "Proudly South African streetwear made to feel like a hug. Try every tee on our 3D fitting room, then order straight to WhatsApp.",
        image: "/photos/look-white-set.webp",
      },
      about: {
        title: "Made with love, worn with attitude.",
        body:
          "MPOPI… started with a teddy bear and a feeling — that clothes should feel as good as they look. Every tee is heavyweight cotton, printed or embroidered in small batches, and checked by hand before it reaches you.\n\nHiswona… is our quieter sister line: clean silhouettes and embroidered script for days when you want to whisper, not shout.\n\nWe keep things personal. When you order, you chat to a real person on WhatsApp who will confirm your sizes, delivery and payment.",
        image: "/photos/mpopi-cafe.webp",
      },
      deliveryOptions: [
        { id: "paxi", name: "PAXI (PEP store)", description: "7–9 working days to your nearest PEP", price: 70, requiresAddress: false },
        { id: "courier", name: "Door-to-door courier", description: "2–4 working days nationwide", price: 120, requiresAddress: true },
        { id: "collect", name: "Collect", description: "We'll arrange a collection point on WhatsApp", price: 0, requiresAddress: false },
      ],
      sizeChart: [
        { size: "XS", chest: 92, length: 64, sleeve: 19 },
        { size: "S", chest: 98, length: 67, sleeve: 20 },
        { size: "M", chest: 104, length: 70, sleeve: 21 },
        { size: "L", chest: 110, length: 72, sleeve: 22 },
        { size: "XL", chest: 116, length: 74, sleeve: 23 },
        { size: "2XL", chest: 124, length: 76, sleeve: 24 },
        { size: "3XL", chest: 132, length: 78, sleeve: 25 },
      ],
      faqs: [
        { q: "How do I pay?", a: "Add your tees to the cart and check out. Your order is sent to us on WhatsApp, where we confirm stock, delivery and send you payment details (EFT, instant EFT or cash send)." },
        { q: "How long does delivery take?", a: "Courier orders arrive in 2–4 working days, PAXI in 7–9 working days after payment is confirmed." },
        { q: "How do the sizes fit?", a: "Our tees have a relaxed fit. Use the 3D fitting room or the size chart on each product — if you like an oversized look, go one size up." },
        { q: "Can I exchange my size?", a: "Yes — unworn items can be exchanged within 7 days. Just message us on WhatsApp." },
        { q: "How do I wash my tee?", a: "Turn it inside out, wash cold, and don't tumble dry. Never iron directly on the print or embroidery." },
      ],
      socials: { instagram: "https://instagram.com/", tiktok: "https://tiktok.com/", facebook: "" },
      lookbook: [
        { src: "/photos/look-white-set.webp", caption: "MPOPI… Teddy Tee — Cloud White" },
        { src: "/photos/hiswona-him.webp", caption: "Hiswona… Embroidered — for him" },
        { src: "/photos/mpopi-tank.webp", caption: "MPOPI… in Baby Blue" },
        { src: "/photos/hiswona-her.webp", caption: "Hiswona… Embroidered — for her" },
        { src: "/photos/stack.webp", caption: "The full drop" },
        { src: "/photos/mpopi-cafe.webp", caption: "Sunday matcha" },
        { src: "/photos/flat-brown-tee.webp", caption: "Chocolate is the new black" },
        { src: "/photos/packaging.webp", caption: "Packed with love" },
      ],
    },
    collections: [
      {
        slug: "mpopi",
        name: "MPOPI…",
        tagline: "Playful. Pink. Unapologetic.",
        description: "Our signature teddy line — bold prints and soft colours for main-character days.",
        image: "/photos/mpopi-cafe.webp",
        accent: "#F0609A",
      },
      {
        slug: "hiswona",
        name: "Hiswona…",
        tagline: "Quiet luxury, embroidered.",
        description: "Clean silhouettes with embroidered script. Understated, elegant, for him and for her.",
        image: "/photos/hiswona-her.webp",
        accent: "#6B3A2A",
      },
    ],
    products,
    orders: [],
  };
}
