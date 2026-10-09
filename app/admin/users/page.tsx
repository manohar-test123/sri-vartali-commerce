import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { UsersTable } from "@/components/admin/users-table";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";
import { listProfiles } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Users · Super admin" };

/** §9 user directory: every profile with its role; role changes audit-logged. */
export default async function AdminUsersPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Users" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  const canEdit = role === "SUPER_ADMIN";
  if (!canEdit && role !== null) {
    return (
      <AdminShell area="System" title="Users">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  const profiles = await listProfiles();

  return (
    <AdminShell
      area="System"
      title="Users"
      intro="Every account profile. Role changes are SUPER_ADMIN-only, audit-logged (§45), and the last super admin can never be demoted."
    >
      <UsersTable
        profiles={profiles}
        currentUserId={session.status === "authenticated" ? session.user.id : null}
        canEdit={canEdit}
      />
    </AdminShell>
  );
}
