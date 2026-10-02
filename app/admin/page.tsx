import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Super admin" };

/**
 * Super admin area (spec §9/§10 — full panel lands Phase 10).
 * SUPER_ADMIN-only, enforced by proxy.ts and, again, by RLS on every table.
 */
export default async function AdminPage() {
  const session = await getSession();

  if (session.status === "unconfigured") {
    return (
      <Shell>
        <h1 className="font-serif text-3xl text-wine-900">Super admin</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-wine-900/70">
          Supabase is not configured. See <code className="rounded bg-gold-50 px-1">.env.example</code>{" "}
          and <code className="rounded bg-gold-50 px-1">docs/db/schema.sql</code> — the gate activates
          once configured.
        </p>
      </Shell>
    );
  }

  const who =
    session.status === "authenticated"
      ? `${session.user.email ?? session.user.id} · ${session.user.role}`
      : "not signed in (gate inactive)";

  return (
    <Shell>
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Phase 10 preview</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Super admin</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-wine-900/70">
        Users, roles, WhatsApp/Cloudinary integration status, webhook logs,
        failed messages, audit logs and diagnostics arrive with Phase 10.
      </p>
      <p className="mt-4 text-xs text-wine-900/50">Signed in: {who}</p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-ivory-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">{children}</div>
    </div>
  );
}
