import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { UsersTable } from "@/components/admin/users-table";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listProfiles } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Roles · Super admin" };

const ROLE_NOTES: Record<string, string> = {
  SUPER_ADMIN: "Full platform access (§9 area, RLS super-admin policies).",
  CLIENT_OWNER: "Runs the store: catalogue, orders, payments, settings (§6).",
  CLIENT_STAFF: "Store operations; cannot change payment settings (§30).",
  CUSTOMER: "Default on sign-up; storefront + own account only.",
};

/** §9 role matrix: distribution + the assignment table (same audited action). */
export default async function AdminRolesPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Roles" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit = role === "SUPER_ADMIN";
  if (!canEdit && role !== null) {
    return (
      <AdminShell area="System" title="Roles">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const profiles = await listProfiles();
  const counts = profiles.reduce<Record<string, number>>((acc, p) => {
    acc[p.role] = (acc[p.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <AdminShell
      area="System"
      title="Roles"
      intro="Who holds which role. Assignments happen below — same audited action as the Users page, with the last-super-admin guard."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(ROLE_NOTES).map(([name, note]) => (
          <div key={name} className="rounded-xl border border-wine-900/15 bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.1em] text-wine-900/50">{name}</p>
            <p className="mt-1 font-serif text-2xl text-wine-900">{counts[name] ?? 0}</p>
            <p className="mt-1 text-xs leading-5 text-wine-900/60">{note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <UsersTable
          profiles={profiles}
          currentUserId={session.status === "authenticated" ? session.user.id : null}
          canEdit={canEdit}
        />
      </div>
    </AdminShell>
  );
}
