import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { readDB } from "@/lib/store";
import { isSoldOut } from "@/lib/shop";
import AdminNav from "@/components/admin/AdminNav";
import TopBar from "@/components/admin/TopBar";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const db = await readDB();
  const newOrders = db.orders.filter((o) => o.status === "new").length;
  const soldOut = db.products.filter((p) => isSoldOut(p)).length;
  const storeUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  return (
    <div className="admin-ui min-h-screen bg-[var(--a-canvas)] lg:p-3">
      <div className="flex min-h-screen flex-col overflow-hidden bg-[var(--a-shell)] lg:min-h-[calc(100vh-24px)] lg:flex-row lg:rounded-[28px] lg:border lg:border-[var(--a-line)]">
        <Suspense>
          <AdminNav newOrders={newOrders} soldOut={soldOut} storeUrl={storeUrl} />
        </Suspense>
        <main className="min-w-0 flex-1 bg-[#f0f0ee] p-4 sm:p-6">
          <TopBar name={admin.name} email={admin.email} newOrders={newOrders} />
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
