import { ShieldAlert, ShieldCheck } from "lucide-react";
import { recentSecurityEvents, type SecurityEventType } from "@/lib/security";
import { PageHeader } from "@/components/admin/ui";
import SignOutEverywhere from "@/components/admin/SignOutEverywhere";

const LABEL: Record<SecurityEventType, string> = {
  login_success: "Signed in",
  login_failed: "Failed sign-in",
  login_locked: "Account locked",
  logout: "Signed out",
  rate_limited: "Rate limit hit",
  csrf_blocked: "Cross-site request blocked",
  upload_rejected: "Upload rejected",
  password_changed: "Password changed",
  sessions_revoked: "Signed out everywhere",
  admin_added: "Admin added",
  admin_removed: "Admin removed",
  admin_email_changed: "Admin email changed",
  invalid_session: "Request with invalid session",
};
const ALERT = new Set<SecurityEventType>(["login_failed", "login_locked", "rate_limited", "csrf_blocked", "upload_rejected", "invalid_session"]);

export default async function SecurityPage() {
  const events = await recentSecurityEvents(150);
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const recent = events.filter((e) => new Date(e.at).getTime() > dayAgo);
  const failed = recent.filter((e) => e.type === "login_failed" || e.type === "login_locked").length;
  const blocked = recent.filter((e) => e.type === "rate_limited" || e.type === "csrf_blocked").length;
  const ips = new Set(recent.filter((e) => ALERT.has(e.type)).map((e) => e.ip)).size;

  return (
    <div>
      <PageHeader title="Security" subtitle="Sign-ins, failed attempts and blocked requests. Events older than 90 days are removed automatically.">
        <SignOutEverywhere />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          ["Failed sign-ins (24h)", failed],
          ["Blocked requests (24h)", blocked],
          ["Suspicious IPs (24h)", ips],
        ].map(([label, n]) => (
          <div key={label as string} className="glass rounded-[1.75rem] p-5">
            {Number(n) > 0 ? <ShieldAlert className="h-6 w-6 text-hot" /> : <ShieldCheck className="h-6 w-6 text-emerald-600" />}
            <p className="font-display mt-3 text-2xl font-bold">{n as number}</p>
            <p className="text-xs font-semibold text-ink-soft">{label as string}</p>
          </div>
        ))}
      </div>

      <div className="glass mt-6 overflow-hidden rounded-[1.75rem]">
        {events.length === 0 ? (
          <p className="p-10 text-center text-sm text-ink-soft">No security events yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-ink-soft">
                <tr className="border-b border-white/80">
                  <th className="p-4 font-semibold">When</th>
                  <th className="p-4 font-semibold">Event</th>
                  <th className="p-4 font-semibold">IP address</th>
                  <th className="p-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/80">
                {events.map((e, i) => (
                  <tr key={i} className={ALERT.has(e.type) ? "bg-hot/5" : ""}>
                    <td className="p-4 whitespace-nowrap text-ink-soft">{new Date(e.at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="p-4">
                      <span className={`chip ${ALERT.has(e.type) ? "bg-hot/15 text-hot-deep" : "bg-emerald-100 text-emerald-800"}`}>{LABEL[e.type] ?? e.type}</span>
                    </td>
                    <td className="p-4 font-mono text-xs">{e.ip ?? "—"}</td>
                    <td className="max-w-md truncate p-4 text-xs text-ink-soft" title={e.detail ?? ""}>
                      {e.detail ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs text-ink-soft">
        Full request logs (including blocked cross-site requests) are also in Vercel → your project → Logs. Vercel&apos;s firewall additionally challenges
        bot traffic before it reaches the site.
      </p>
    </div>
  );
}
