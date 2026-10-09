"use client";

/**
 * §9 users/roles management: per-profile role picker backed by the
 * setUserRole server action (SUPER_ADMIN-only, audit-logged, last-super-
 * admin-safe). Read-only when the viewer isn't a super admin.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setUserRole } from "@/lib/admin/actions";
import type { ProfileListRow } from "@/lib/admin/queries";
import { APP_ROLES, type AppRole } from "@/lib/auth/roles";

export function UsersTable({
  profiles,
  currentUserId,
  canEdit,
}: {
  profiles: ProfileListRow[];
  currentUserId: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function change(profileId: string, role: AppRole) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await setUserRole(profileId, role);
      if (result.ok) {
        setNotice(result.message ?? "Role saved.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div>
      {notice ? (
        <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-wine-900/15 text-left text-[11px] uppercase tracking-[0.1em] text-wine-900/50">
              <th scope="col" className="px-3 py-2">Email</th>
              <th scope="col" className="px-3 py-2">Name</th>
              <th scope="col" className="px-3 py-2">Phone</th>
              <th scope="col" className="px-3 py-2">Role</th>
              <th scope="col" className="px-3 py-2">Joined</th>
              <th scope="col" className="px-3 py-2 text-right">Change role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-wine-900/10">
                <td className="px-3 py-3 font-medium text-wine-900">
                  {p.email ?? p.id.slice(0, 8) + "…"}
                  {p.id === currentUserId ? (
                    <span className="ml-2 rounded-full border border-gold-400 bg-gold-50 px-2 py-0.5 text-[11px] font-medium text-wine-900">
                      you
                    </span>
                  ) : null}
                  {!p.isActive ? (
                    <span className="ml-2 rounded-full border border-wine-900/20 px-2 py-0.5 text-[11px] text-wine-900/50">
                      inactive
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-wine-900/80">{p.fullName ?? "—"}</td>
                <td className="px-3 py-3 tabular-nums text-wine-900/70">
                  {p.phone ?? "—"}
                </td>
                <td className="px-3 py-3">
                  <span className="rounded-full border border-wine-900/20 px-2.5 py-0.5 text-[11px] font-medium text-wine-900/80">
                    {p.role}
                  </span>
                </td>
                <td className="px-3 py-3 text-wine-900/70">
                  {new Date(p.createdAt).toLocaleDateString("en-IN", {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-3 py-3 text-right">
                  {canEdit ? (
                    <select
                      aria-label={`Role for ${p.email ?? p.id.slice(0, 8)}`}
                      defaultValue={p.role}
                      disabled={pending}
                      onChange={(event) => change(p.id, event.target.value as AppRole)}
                      className="rounded-lg border border-wine-900/20 bg-white px-2 py-1.5 text-sm text-wine-900 focus:border-gold-400 focus:outline-none disabled:opacity-50"
                    >
                      {APP_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-wine-900/40">read-only</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {profiles.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No profiles yet — profiles appear on first sign-up.
        </p>
      ) : null}
    </div>
  );
}
