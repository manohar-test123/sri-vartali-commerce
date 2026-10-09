import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { getStoreSettings } from "@/lib/store/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "WhatsApp integration · Super admin" };

/**
 * §9 WhatsApp status surface — set / not set only, never values (§46).
 * Wiring itself (phone id, token, app secret, webhook subscription) is
 * deliberately deferred by the owner; this page shows exactly where it
 * stands without nagging.
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
  const vars = [
    { label: "WHATSAPP_PHONE_NUMBER_ID", ok: Boolean(env.whatsapp.phoneNumberId) },
    { label: "WHATSAPP_ACCESS_TOKEN", ok: Boolean(env.whatsapp.accessToken) },
    { label: "WHATSAPP_VERIFY_TOKEN", ok: Boolean(env.whatsapp.verifyToken) },
    { label: "WHATSAPP_APP_SECRET", ok: Boolean(env.whatsapp.appSecret) },
  ];
  const storeRows = [
    { label: "Store WhatsApp number (§27 target)", ok: Boolean(settings?.whatsapp_store_number) },
  ];

  const allSet = vars.every((v) => v.ok);

  return (
    <AdminShell
      area="Integrations"
      title="WhatsApp"
      intro="Status only — values are never displayed. Until the owner wires Meta credentials, outbound sends log NOT_CONFIGURED and the dashboard honestly shows “Tracking missing”."
    >
      <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Environment variables
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {[...vars, ...storeRows].map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                  item.ok ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              <code className="font-mono text-xs text-wine-900/80">{item.label}</code>
              <span className="ml-auto text-xs text-wine-900/40">
                {item.ok ? "set" : "not set"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-wine-900/50">
          {allSet
            ? "All Meta credentials present — the webhook also needs its subscription in the Meta dashboard to receive events."
            : "Amber env items are Vercel project settings (owner action); wiring is deliberately deferred."}{" "}
          The inbound webhook URL is{" "}
          <code className="rounded bg-gold-50 px-1 font-mono text-xs">
            {env.siteUrl.replace(/\/$/, "")}/api/whatsapp/webhook
          </code>
          .
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Behaviour while unwired
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-wine-900/70">
          <li>Outbound sends are attempted, logged, and marked NOT_CONFIGURED — nothing is silently dropped (§43).</li>
          <li>Inbound webhook signature verification is built; without a subscription no events arrive (§44).</li>
          <li>“PAID” from a customer only ever sets CUSTOMER_CLAIMS_PAID — verification stays manual (rule 15).</li>
        </ul>
        <p className="mt-3 text-xs text-wine-900/50">
          Message-level evidence: <a href="/admin/logs" className="underline decoration-gold-400 underline-offset-4">Message log</a>.
        </p>
      </section>
    </AdminShell>
  );
}
