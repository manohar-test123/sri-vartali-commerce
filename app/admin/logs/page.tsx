import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listWhatsappMessages } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Message log · Super admin" };

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "border-amber-200 bg-amber-50 text-amber-800",
  SENT: "border-sky-200 bg-sky-50 text-sky-800",
  DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  READ: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
};

const FILTERS = ["ALL", "QUEUED", "SENT", "DELIVERED", "READ", "FAILED"] as const;

/** §43/§9 message browser: every logged WhatsApp send/capture, honestly. */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Message log" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="System" title="Message log">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const active = (FILTERS as readonly string[]).includes(status ?? "") ? status! : "ALL";
  const messages = await listWhatsappMessages(active === "ALL" ? undefined : active);

  return (
    <AdminShell
      area="System"
      title="Message log"
      intro="Every outbound send and inbound capture (§43). While WhatsApp is unwired, failed sends show NOT_CONFIGURED honestly — that is expected, not a bug."
    >
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/logs" : `/admin/logs?status=${f}`}
            aria-current={active === f ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 transition-colors ${
              active === f
                ? "border-wine-900 bg-wine-900 text-ivory-50"
                : "border-wine-900/20 bg-white text-wine-900/70 hover:border-wine-900/40"
            }`}
          >
            {f}
          </Link>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-wine-900/15 text-left text-[11px] uppercase tracking-[0.1em] text-wine-900/50">
              <th scope="col" className="px-3 py-2">When</th>
              <th scope="col" className="px-3 py-2">Direction</th>
              <th scope="col" className="px-3 py-2">Type</th>
              <th scope="col" className="px-3 py-2">To / from</th>
              <th scope="col" className="px-3 py-2">Status</th>
              <th scope="col" className="px-3 py-2">Error</th>
              <th scope="col" className="px-3 py-2">Order</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-b border-wine-900/10">
                <td className="px-3 py-3 text-wine-900/70">
                  {new Date(m.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-3 py-3 text-wine-900/80">{m.direction.toLowerCase()}</td>
                <td className="px-3 py-3 text-wine-900/80">
                  {m.messageType}
                  {m.templateName ? (
                    <span className="block text-xs text-wine-900/50">{m.templateName}</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 tabular-nums text-wine-900/70">{m.recipientPhone}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[m.status] ?? "border-wine-900/20 text-wine-900/70"
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-red-800/80">{m.errorCode ?? "—"}</td>
                <td className="px-3 py-3">
                  {m.orderId ? (
                    <Link
                      href={`/client/orders/${m.orderId}`}
                      className="text-xs text-wine-800 underline decoration-gold-400 underline-offset-4"
                    >
                      open
                    </Link>
                  ) : (
                    <span className="text-xs text-wine-900/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {messages.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No messages with this status.
        </p>
      ) : null}
    </AdminShell>
  );
}
