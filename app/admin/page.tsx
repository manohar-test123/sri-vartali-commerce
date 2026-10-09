import type { Metadata } from "next";
import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { listAuditLogs } from "@/lib/admin/queries";
import { dashboardStats } from "@/lib/orders/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Super admin · Sri Vartali" };

/**
 * §9 system overview: today's order/payment counters (same stats surface
 * the client dashboard uses — RLS scopes both), the integration rollup,
 * and the newest audit events.
 */
export default async function AdminOverviewPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Super admin" />;
  }

  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="System" title="Super admin">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          This area requires the SUPER_ADMIN role (§9). Signed in as{" "}
          {role ?? "anonymous"}.
        </p>
      </AdminShell>
    );
  }

  const [stats, audit] = await Promise.all([
    dashboardStats(),
    listAuditLogs(undefined, 8),
  ]);

  const integrations = [
    { label: "WhatsApp: phone number id", ok: Boolean(env.whatsapp.phoneNumberId) },
    { label: "WhatsApp: access token", ok: Boolean(env.whatsapp.accessToken) },
    { label: "WhatsApp: verify token", ok: Boolean(env.whatsapp.verifyToken) },
    { label: "WhatsApp: app secret", ok: Boolean(env.whatsapp.appSecret) },
    { label: "Cloudinary: cloud name", ok: Boolean(env.cloudinary.cloudName) },
    { label: "Cloudinary: api key", ok: Boolean(env.cloudinary.apiKey) },
    { label: "Cloudinary: api secret", ok: Boolean(env.cloudinary.apiSecret) },
    { label: "Supabase: service role key", ok: Boolean(env.supabase.serviceRoleKey) },
  ];

  return (
    <AdminShell
      area="System"
      title="Overview"
      intro="Store health at a glance — order counters, integration status and the latest audited actions. Everything here is read-only; actions live in their sections."
    >
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Orders today" value={stats.todayOrders} />
        <Stat label="Pending payment" value={stats.pendingPayment} />
        <Stat label="Paid / ready" value={stats.paidReadyToPack} />
        <Stat label="Shipped" value={stats.shipped} />
        <Stat label="Low stock" value={stats.lowStock} />
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Integration rollup
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {integrations.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    item.ok ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                <span className="text-wine-900/75">{item.label}</span>
                <span className="ml-auto text-xs text-wine-900/40">
                  {item.ok ? "set" : "not set"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-5 text-wine-900/50">
            Detail pages never show values — only set / not set:{" "}
            <Link href="/admin/integrations/whatsapp" className="underline decoration-gold-400 underline-offset-4">
              WhatsApp
            </Link>
            {" · "}
            <Link href="/admin/integrations/cloudinary" className="underline decoration-gold-400 underline-offset-4">
              Cloudinary
            </Link>
            . WhatsApp wiring is deliberately deferred by the owner.
          </p>
        </section>

        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Recent audit events
          </h2>
          {audit.length === 0 ? (
            <p className="mt-3 text-sm text-wine-900/50">Nothing audited yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs text-wine-900/80">{a.action}</span>
                  <span className="text-xs text-wine-900/50">
                    {a.entityType ?? ""} {a.entityId ? `· ${a.entityId.slice(0, 8)}…` : ""} ·{" "}
                    {new Date(a.createdAt).toLocaleString("en-IN", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/audit"
            className="mt-4 inline-block text-sm text-wine-800 underline decoration-gold-400 underline-offset-4"
          >
            Full audit log →
          </Link>
        </section>
      </div>

      <p className="mt-8 text-xs text-wine-900/50">
        Signed in: {session.status === "authenticated" ? session.user.email : ""} · SUPER_ADMIN
      </p>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-wine-900/15 bg-white px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.1em] text-wine-900/50">{label}</dt>
      <dd className="mt-1 font-serif text-2xl text-wine-900">{value}</dd>
    </div>
  );
}
