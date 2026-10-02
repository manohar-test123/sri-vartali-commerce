import type { Metadata } from "next";

import { PaymentSettingsForm } from "@/components/client/payment-settings-form";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getStoreSettings } from "@/lib/store/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings · Sri Vartali" };

/**
 * Payment & WhatsApp settings (spec §30) plus the integration status
 * surface: what the automation can do right now, and exactly which
 * environment variables are still missing.
 */
export default async function ClientSettingsPage() {
  const session = await getSession();
  const settings = await getStoreSettings();

  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit = role === "CLIENT_OWNER" || role === "SUPER_ADMIN";

  const integration = [
    {
      label: "Phone number id (WHATSAPP_PHONE_NUMBER_ID)",
      ok: Boolean(env.whatsapp.phoneNumberId),
    },
    {
      label: "Access token (WHATSAPP_ACCESS_TOKEN)",
      ok: Boolean(env.whatsapp.accessToken),
    },
    {
      label: "Verify token (WHATSAPP_VERIFY_TOKEN)",
      ok: Boolean(env.whatsapp.verifyToken),
    },
    {
      label: "App secret (WHATSAPP_APP_SECRET)",
      ok: Boolean(env.whatsapp.appSecret),
    },
    {
      label: "Store WhatsApp number",
      ok: Boolean(settings?.whatsapp_store_number),
    },
    { label: "UPI ID", ok: Boolean(settings?.upi_id) },
    { label: "UPI QR image", ok: Boolean(settings?.upi_qr_url) },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">
        Client area
      </p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">
        Payment details power the automatic WhatsApp reply customers receive
        after sending their order (QR image, UPI ID, wording). The store
        WhatsApp number is also where the order hand-off button sends
        customers (§27).
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Payment settings (§30)
          </h2>
          <PaymentSettingsForm
            canEdit={canEdit}
            initial={{
              businessName: settings?.business_name ?? "",
              upiId: settings?.upi_id ?? "",
              upiQrUrl: settings?.upi_qr_url ?? "",
              paymentInstructions: settings?.payment_instructions ?? "",
              whatsappStoreNumber: settings?.whatsapp_store_number ?? "",
            }}
          />
        </section>

        <aside className="h-fit space-y-6">
          <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
              WhatsApp integration status
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {integration.map((item) => (
                <li key={item.label} className="flex items-start gap-2">
                  <span
                    aria-hidden
                    className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${
                      item.ok ? "bg-emerald-500" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-wine-900/75">{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-wine-900/50">
              Amber items without a variable are environment setup steps
              (Vercel project settings); amber store settings are editable
              here. The inbound webhook URL is{" "}
              <code className="rounded bg-gold-50 px-1">
                {env.siteUrl.replace(/\/$/, "")}/api/whatsapp/webhook
              </code>
              .
            </p>
          </section>

          {!canEdit ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Read-only: only the client owner or a super admin may change
              payment settings (§30).
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
