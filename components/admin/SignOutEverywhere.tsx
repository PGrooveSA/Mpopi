"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpinnerGap as Loader2, SignOut as LogOut } from "@phosphor-icons/react";

/** Revokes every session for this admin account (all devices), then returns to the login page. */
export default function SignOutEverywhere() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm("Sign out of the admin on every device, including this one?")) return;
        setBusy(true);
        await fetch("/api/admin/account", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "signout-all" }) });
        router.replace("/admin/login");
        router.refresh();
      }}
      className="btn-dark"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Sign out everywhere
    </button>
  );
}
