import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getStoreSettings } from "@/lib/store/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "WhatsApp integration · Super admin" };

/**
 * §9 WhatsApp status surface (Phase 33 rework) — shows the ACTUAL state:
 * the store runs on wa.me deep links (no credentials needed) for all
 * ordering; the Meta Cloud API credentials below are only needed for
 * automated outbound messages and inbound webhook events, which is a
 * separate optional layer the owner hasn't wired.
 */
export default async function AdminWhatsappPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="WhatsApp integration" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="Integrations" title="WhatsApp">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const settings = await getStoreSettings();
  const storeNumberSet = Boolean(settings?.whatsapp_store_number);
  const cloudVars = [
    { label: "WHATSAPP_PHONE_NUMBER_ID", ok: Boolean(env.whatsapp.phoneNumberId) },
    { label: "WHATSAPP_ACCESS_TOKEN", ok: Boolean(env.whatsapp.accessToken) },
    { label: "WHATSAPP_VERIFY_TOKEN", ok: Boolean(env.whatsapp.verifyToken) },
    { label: "WHATSAPP_APP_SECRET", ok: Boolean(env.whatsapp.appSecret) },
  ];

  return (
    <AdminShell
      area="Integrations"
      title="WhatsApp"
      intro="The store's ordering runs entirely through wa.me deep links to the configured business number — no API credentials are needed for this. The Meta Cloud API below is an optional automation layer."
    >
      {/* Active ordering channel */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Active · WhatsApp deep-link ordering
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <code className="font-mono text-xs text-wine-900/80">wa.me deep links</code>
            <span className="ml-auto text-xs text-emerald-700">active — all ordering flows use this</span>
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className={`inline-block h-2 w-2 shrink-0 rounded-full ${storeNumberSet ? "bg-emerald-500" : "bg-amber-400"}`}
            />
            <code className="font-mono text-xs text-wine-900/80">Store WhatsApp number</code>
            <span className="ml-auto text-xs text-wine-900/40">
              {storeNumberSet ? "set (database)" : "not set — configure in Client Dashboard → Settings"}
            </span>
          </li>
        </ul>
        <p className="mt-3 text-xs leading-5 text-wine-900/50">
          Buy via WhatsApp (cart, product pages, contact dock) opens the customer&apos;s
          WhatsApp with the full order prefilled — no server-side API needed.
        </p>
      </section>

      {/* Optional automation layer */}
      <section className="mt-6 rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Optional · Meta Cloud API (automation)
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {cloudVars.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${item.ok ? "bg-emerald-500" : "bg-wine-900/20"}`}
              />
              <code className="font-mono text-xs text-wine-900/80">{item.label}</code>
              <span className="ml-auto text-xs text-wine-900/40">
                {item.ok ? "set" : "not needed for current flow"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-wine-900/50">
          These enable automated order acknowledgements, payment instructions, and
          tracking notifications. Obtain from{" "}
          <a
            href="https://developers.facebook.com/apps"
            className="underline decoration-gold-400 underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            Meta for Developers
          </a>{" "}
          (Business account → WhatsApp → API setup). The webhook URL is{" "}
          <code className="rounded bg-gold-50 px-1 font-mono text-xs">
            {env.siteUrl.replace(/\/$/, "")}/api/whatsapp/webhook
          </code>
          .
        </p>
      </section>
    </AdminShell>
  );
}
