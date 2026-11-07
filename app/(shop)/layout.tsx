import Background from "@/components/Background";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getStore();
  return (
    <>
      <Background />
      <Navbar announcement={settings.announcement} />
      <main>{children}</main>
      <Footer settings={settings} />
      <CartDrawer freeDeliveryOver={settings.freeDeliveryOver} />
    </>
  );
}
