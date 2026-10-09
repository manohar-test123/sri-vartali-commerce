import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Cloudinary integration · Super admin" };

/** §9 Cloudinary status surface — set / not set only, never values (§46). */
export default async function AdminCloudinaryPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Cloudinary integration" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="Integrations" title="Cloudinary">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const vars = [
    { label: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", ok: Boolean(env.cloudinary.cloudName) },
    { label: "CLOUDINARY_API_KEY", ok: Boolean(env.cloudinary.apiKey) },
    { label: "CLOUDINARY_API_SECRET", ok: Boolean(env.cloudinary.apiSecret) },
  ];
  const allSet = vars.every((v) => v.ok);

  return (
    <AdminShell
      area="Integrations"
      title="Cloudinary"
      intro="Status only — values are never displayed. Product media rides signed browser uploads; the API secret never reaches the client (§46)."
    >
      <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Environment variables
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {vars.map((item) => (
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
            ? "Signed uploads and f_auto/q_auto delivery transforms are active (§47)."
            : "Amber items are Vercel project settings (owner action) — the MediaManager shows a setup notice until then."}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          How media flows
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-wine-900/70">
          <li>The CMS asks <code className="rounded bg-gold-50 px-1">/api/client/media/signature</code> for a time-boxed upload signature — the secret stays server-side.</li>
          <li>The browser uploads straight to Cloudinary; the CMS stores the delivery URL.</li>
          <li>Delivery URLs gain <code className="rounded bg-gold-50 px-1">f_auto,q_auto,w_&lt;n&gt;</code> transforms per layout width (§47).</li>
        </ul>
      </section>
    </AdminShell>
  );
}
