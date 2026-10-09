import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { env, isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "System · Super admin" };

/**
 * §9 diagnostics: what /api/health reports (mirrors its logic — the route
 * itself is a thin config probe), the environment matrix (set / not set,
 * never values), and the backup posture (§46 backups).
 */
export default async function AdminSystemPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="System" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="System" title="System">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const health = {
    status: "ok",
    configured: { supabase: isSupabaseConfigured() },
    time: new Date().toISOString(),
  };

  const matrix: Array<{ group: string; label: string; ok: boolean }> = [
    { group: "Supabase", label: "NEXT_PUBLIC_SUPABASE_URL", ok: Boolean(env.supabase.url) },
    { group: "Supabase", label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(env.supabase.anonKey) },
    { group: "Supabase", label: "SUPABASE_SERVICE_ROLE_KEY", ok: Boolean(env.supabase.serviceRoleKey) },
    { group: "Cloudinary", label: "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", ok: Boolean(env.cloudinary.cloudName) },
    { group: "Cloudinary", label: "CLOUDINARY_API_KEY", ok: Boolean(env.cloudinary.apiKey) },
    { group: "Cloudinary", label: "CLOUDINARY_API_SECRET", ok: Boolean(env.cloudinary.apiSecret) },
    { group: "WhatsApp", label: "WHATSAPP_PHONE_NUMBER_ID", ok: Boolean(env.whatsapp.phoneNumberId) },
    { group: "WhatsApp", label: "WHATSAPP_ACCESS_TOKEN", ok: Boolean(env.whatsapp.accessToken) },
    { group: "WhatsApp", label: "WHATSAPP_VERIFY_TOKEN", ok: Boolean(env.whatsapp.verifyToken) },
    { group: "WhatsApp", label: "WHATSAPP_APP_SECRET", ok: Boolean(env.whatsapp.appSecret) },
    { group: "Site", label: "NEXT_PUBLIC_SITE_URL (or Vercel fallback)", ok: true },
    { group: "Site", label: "SUPER_ADMIN_EMAIL", ok: Boolean(env.superAdminEmail) },
  ];
  const groups = [...new Set(matrix.map((m) => m.group))];

  return (
    <AdminShell
      area="System"
      title="System"
      intro="Liveness, configuration and backup posture. Values are never shown — only set / not set (§46)."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            /api/health (this deployment)
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-wine-900/5 p-3 font-mono text-xs leading-5 text-wine-900/80">
{JSON.stringify(health, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-wine-900/50">
            The public probe lives at{" "}
            <code className="rounded bg-gold-50 px-1">/api/health</code> — same output.
          </p>
        </section>

        <section className="rounded-2xl border border-wine-900/15 bg-white p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
            Backup posture
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-wine-900/70">
            <li>Platform daily WAL-G backups: on (Supabase Free).</li>
            <li>Point-in-time recovery: off — paid feature, deliberately declined (GOVERNANCE 2026-10-02).</li>
            <li>Weekly schema-only dump: <code className="rounded bg-gold-50 px-1">.github/workflows/db-schema-backup.yml</code> (public repo — artifacts stay PII-free).</li>
            <li>Restore runbooks: <code className="rounded bg-gold-50 px-1">docs/ops</code>.</li>
          </ul>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Environment matrix
        </h2>
        {groups.map((group) => (
          <div key={group} className="mt-4 first:mt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-wine-900/60">
              {group}
            </h3>
            <ul className="mt-2 space-y-1.5 text-sm">
              {matrix
                .filter((m) => m.group === group)
                .map((m) => (
                  <li key={m.label} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                        m.ok ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                    />
                    <code className="font-mono text-xs text-wine-900/80">{m.label}</code>
                    <span className="ml-auto text-xs text-wine-900/40">
                      {m.ok ? "set" : "not set"}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
    </AdminShell>
  );
}
