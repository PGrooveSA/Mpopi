import { ALL_SIZES, type Product, type ProductColor } from "./types";

export type Draft = Omit<Product, "id" | "createdAt" | "updatedAt"> & { id?: string };

export const newColor = (): ProductColor => ({ id: Math.random().toString(36).slice(2, 9), name: "Cloud White", hex: "#F6F4F1", print: "/prints/mpopi-hot.png", photos: [] });

export function emptyProduct(collection: string): Draft {
  return {
    slug: "",
    name: "",
    collection,
    description: "",
    price: 350,
    sizes: [...ALL_SIZES],
    colors: [newColor()],
    variants: [],
    printScale: 0.7,
    printOffsetY: 0,
    backPrintScale: 0.85,
    featured: false,
    isNew: true,
    status: "active",
  };
}

