import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { readDB } from "@/lib/store";
import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const db = await readDB();
  const newOrders = db.orders.filter((o) => o.status === "new").length;
  return (
    <div className="min-h-screen bg-[#f6f0ec]">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-blush/40 blur-[100px]" />
        <div className="absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-sky/40 blur-[100px]" />
      </div>
      <div className="relative flex min-h-screen flex-col lg:flex-row">
        <AdminNav name={admin.name} email={admin.email} newOrders={newOrders} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
