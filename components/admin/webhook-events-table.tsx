"use client";

/**
 * §44 webhook events with manual resolution: stuck RECEIVED/FAILED rows can
 * be closed as PROCESSED by a super admin (the 04-OPEN-ITEMS §5 cleanup —
 * each click is owner-approved and audit-logged server-side).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { markWebhookEventResolved } from "@/lib/admin/actions";
import type { WebhookEventRow } from "@/lib/admin/queries";

const STATUS_STYLES: Record<string, string> = {
  RECEIVED: "border-amber-200 bg-amber-50 text-amber-800",
  PROCESSED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
  DUPLICATE: "border-wine-900/20 bg-wine-900/5 text-wine-900/60",
};

export function WebhookEventsTable({
  events,
  canEdit,
}: {
  events: WebhookEventRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function resolve(eventId: string) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await markWebhookEventResolved(eventId);
      if (result.ok) {
        setNotice(result.message ?? "Resolved.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {notice ? (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-wine-900/15 text-left text-[11px] uppercase tracking-[0.1em] text-wine-900/50">
              <th scope="col" className="px-3 py-2">Provider</th>
              <th scope="col" className="px-3 py-2">Event</th>
              <th scope="col" className="px-3 py-2">External id</th>
              <th scope="col" className="px-3 py-2">Status</th>
              <th scope="col" className="px-3 py-2">Received</th>
              <th scope="col" className="px-3 py-2">Error</th>
              {canEdit ? <th scope="col" className="px-3 py-2 text-right">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {events.map((w) => (
              <tr key={w.id} className="border-b border-wine-900/10 align-top">
                <td className="px-3 py-3 font-medium text-wine-900">{w.provider}</td>
                <td className="px-3 py-3 text-wine-900/80">{w.eventType ?? "—"}</td>
                <td className="px-3 py-3 font-mono text-xs text-wine-900/60">
                  {w.externalEventId.length > 18
                    ? `${w.externalEventId.slice(0, 18)}…`
                    : w.externalEventId}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                      STATUS_STYLES[w.status] ?? "border-wine-900/20 text-wine-900/70"
                    }`}
                  >
                    {w.status}
                  </span>
                  {w.processedAt ? (
                    <span className="mt-1 block text-[11px] text-wine-900/40">
                      processed{" "}
                      {new Date(w.processedAt).toLocaleDateString("en-IN", {
                        dateStyle: "medium",
                      })}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-wine-900/70">
                  {new Date(w.receivedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="max-w-[220px] px-3 py-3 text-xs text-red-800/80">
                  {w.error ?? "—"}
                </td>
                {canEdit ? (
                  <td className="px-3 py-3 text-right">
                    {w.status === "RECEIVED" || w.status === "FAILED" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Mark this ${w.status} webhook event as resolved (PROCESSED)? The decision is audit-logged.`,
                            )
                          ) {
                            resolve(w.id);
                          }
                        }}
                        className="rounded-full border border-wine-900/25 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 disabled:opacity-50"
                      >
                        Mark resolved
                      </button>
                    ) : (
                      <span className="text-xs text-wine-900/40">—</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {events.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No webhook events recorded yet.
        </p>
      ) : null}
    </div>
  );
}
