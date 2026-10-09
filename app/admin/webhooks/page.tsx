import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { WebhookEventsTable } from "@/components/admin/webhook-events-table";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listWebhookEvents } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Webhooks · Super admin" };

/**
 * §44/§9 webhook events with manual resolution: the two stuck RECEIVED
 * rows from before a fix (04-OPEN-ITEMS §5) get closed here, click by
 * click with the owner's approval — never via SQL.
 */
export default async function AdminWebhooksPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Webhooks" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit = role === "SUPER_ADMIN";
  if (!canEdit && role !== null) {
    return (
      <AdminShell area="System" title="Webhooks">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const events = await listWebhookEvents();
  const stuck = events.filter(
    (e) => e.status === "RECEIVED" || e.status === "FAILED",
  ).length;

  return (
    <AdminShell
      area="System"
      title="Webhooks"
      intro="Every inbound webhook event, deduped by (provider, external id). “Mark resolved” closes a stuck RECEIVED/FAILED row as PROCESSED — audit-logged, one deliberate click at a time."
    >
      {stuck > 0 ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {stuck} stuck event{stuck === 1 ? "" : "s"} (RECEIVED/FAILED) — review each,
          then mark resolved only if you know why it stalled.
        </p>
      ) : null}

      <WebhookEventsTable events={events} canEdit={canEdit} />
    </AdminShell>
  );
}
