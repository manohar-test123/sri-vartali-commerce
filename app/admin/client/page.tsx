import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listProfiles } from "@/lib/admin/queries";
import { getStoreSettings } from "@/lib/store/settings";
import { formatPaise } from "@/lib/catalog/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Client account · Super admin" };

/**
 * §9 read-only view of the client side: who holds client roles and the
 * §30 store settings singleton. Nothing editable here — the client owner
 * manages settings at /client/settings.
 */
export default async function AdminClientPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Client account" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="System" title="Client account">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const [profiles, settings] = await Promise.all([
    listProfiles(),
    getStoreSettings(),
  ]);
  const clientTeam = profiles.filter(
    (p) => p.role === "CLIENT_OWNER" || p.role === "CLIENT_STAFF",
  );

  return (
    <AdminShell
      area="System"
      title="Client account"
      intro="Read-only: the store's team and its payment/WhatsApp settings (§30). Edits happen in the client area itself."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Client team
          </h2>
          {clientTeam.length === 0 ? (
            <p className="mt-3 text-sm text-wine-900/50">
              No client-role profiles yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {clientTeam.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="text-wine-900">{p.email ?? p.id.slice(0, 8) + "…"}</span>
                  <span className="rounded-full border border-wine-900/20 px-2.5 py-0.5 text-[11px] font-medium text-wine-900/80">
                    {p.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Store settings (§30)
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Business name" value={settings?.business_name ?? "—"} />
            <Row label="UPI ID" value={settings?.upi_id ?? "not set"} />
            <Row label="UPI QR image" value={settings?.upi_qr_url ? "set" : "not set"} />
            <Row
              label="Payment instructions"
              value={settings?.payment_instructions ? "custom" : "default wording"}
            />
            <Row label="Store WhatsApp number" value={settings?.whatsapp_store_number ?? "not set"} />
            <Row
              label="Shipping fee"
              value={settings ? formatPaise(settings.default_shipping_paise) : "—"}
            />
            <Row
              label="Free shipping over"
              value={
                settings?.free_shipping_threshold_paise
                  ? formatPaise(settings.free_shipping_threshold_paise)
                  : "—"
              }
            />
          </dl>
        </section>
      </div>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-wine-900/60">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-wine-900">{value}</dd>
    </div>
  );
}
