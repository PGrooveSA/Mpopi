import type { Metadata } from "next";
import { getShopProducts, getStore } from "@/lib/data";
import FittingRoom from "@/components/fitting/FittingRoom";

export const metadata: Metadata = {
  title: "Try it on — 3D Fitting Room",
  description: "Try any MPOPI… tee in 3D. Change colour, fit and size, and spin it 360° to see how it hangs.",
};

export default async function FittingRoomPage({ searchParams }: { searchParams: Promise<{ product?: string; color?: string; size?: string }> }) {
  const [initial, products, { settings }] = await Promise.all([searchParams, getShopProducts(), getStore()]);
  return (
    <div className="container-x pt-4">
      <FittingRoom products={products} sizeChart={settings.sizeChart} initial={initial} />
    </div>
  );
}
