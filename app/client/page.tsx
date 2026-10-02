import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata = { title: "Client dashboard" };

/**
 * Client dashboard home (spec §8/§38 — full UI lands Phase 3/6).
 * The proxy already gated this area; the page shows bring-up status.
 */
export default async function ClientDashboardPage() {
  const session = await getSession();

  if (session.status === "unconfigured") {
    return (
      <DashboardShell>
        <SetupNotice />
      </DashboardShell>
    );
  }

  const who =
    session.status === "authenticated"
      ? `${session.user.email ?? session.user.id} · ${session.user.role}`
      : "not signed in (gate inactive)";

  return (
    <DashboardShell>
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Phase 3+ preview</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Client dashboard</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-wine-900/70">
        Products, inventory, orders, payment verification and shipping arrive
        with Phase 3 and Phase 6. The area is gated to client roles by{" "}
        <code className="rounded bg-gold-50 px-1">proxy.ts</code>.
      </p>
      <p className="mt-4 text-xs text-wine-900/50">Signed in: {who}</p>
    </DashboardShell>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-ivory-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">{children}</div>
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl text-wine-900">Client dashboard</h1>
      <p className="mt-3 text-sm leading-6 text-wine-900/70">
        Supabase is not configured. Fill <code className="rounded bg-gold-50 px-1">.env.local</code>{" "}
        from <code className="rounded bg-gold-50 px-1">.env.example</code> and apply{" "}
        <code className="rounded bg-gold-50 px-1">docs/db/schema.sql</code> first — the auth gate
        activates automatically once configured.
      </p>
    </div>
  );
}
