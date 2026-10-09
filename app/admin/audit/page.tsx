import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listAuditLogs } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit · Super admin" };

/** §45/§9 audit browser: newest first, filter by action. Append-only. */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Audit" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="System" title="Audit">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const cleanAction = action?.trim() ?? "";
  const [logs, recent] = await Promise.all([
    listAuditLogs(cleanAction === "" ? undefined : cleanAction),
    listAuditLogs(undefined, 100),
  ]);
  // Filter vocabulary from what actually exists — no invented actions.
  const actions = [...new Set(recent.map((a) => a.action))].sort();

  return (
    <AdminShell
      area="System"
      title="Audit"
      intro="Every dashboard mutation with actor and old/new values (§45). Append-only: entries are never edited or deleted."
    >
      <nav aria-label="Filter by action" className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/audit"
          aria-current={cleanAction === "" ? "page" : undefined}
          className={`rounded-full border px-4 py-1.5 transition-colors ${
            cleanAction === ""
              ? "border-wine-900 bg-wine-900 text-ivory-50"
              : "border-wine-900/20 bg-white text-wine-900/70 hover:border-wine-900/40"
          }`}
        >
          All
        </Link>
        {actions.map((a) => (
          <Link
            key={a}
            href={`/admin/audit?action=${encodeURIComponent(a)}`}
            aria-current={cleanAction === a ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 font-mono text-xs transition-colors ${
              cleanAction === a
                ? "border-wine-900 bg-wine-900 text-ivory-50"
                : "border-wine-900/20 bg-white text-wine-900/70 hover:border-wine-900/40"
            }`}
          >
            {a}
          </Link>
        ))}
      </nav>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-wine-900/15 text-left text-[11px] uppercase tracking-[0.1em] text-wine-900/50">
              <th scope="col" className="px-3 py-2">When</th>
              <th scope="col" className="px-3 py-2">Action</th>
              <th scope="col" className="px-3 py-2">Actor</th>
              <th scope="col" className="px-3 py-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((a) => (
              <tr key={a.id} className="border-b border-wine-900/10">
                <td className="px-3 py-3 text-wine-900/70">
                  {new Date(a.createdAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-3 py-3 font-mono text-xs text-wine-900">{a.action}</td>
                <td className="px-3 py-3 text-wine-900/70">
                  {a.actorRole ?? "—"}
                  {a.actorProfileId ? (
                    <span className="block text-[11px] text-wine-900/40">
                      {a.actorProfileId.slice(0, 8)}…
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-wine-900/70">
                  {a.entityType ?? "—"}
                  {a.entityId ? (
                    <span className="block font-mono text-[11px] text-wine-900/40">
                      {a.entityId.length > 18 ? `${a.entityId.slice(0, 18)}…` : a.entityId}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No audit entries{cleanAction ? ` for ${cleanAction}` : ""} yet.
        </p>
      ) : null}
    </AdminShell>
  );
}
