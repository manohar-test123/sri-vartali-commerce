"use client";

/**
 * The whole /account/addresses book: saved cards with default/delete/edit,
 * plus the add form. Server actions re-check ownership; this component is
 * only presentation + local open/close state.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AddressForm } from "@/components/account/address-form";
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from "@/lib/account/actions";
import type { AccountAddress } from "@/lib/account/queries";

export function AddressBook({ addresses }: { addresses: AccountAddress[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(addresses.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ status: string; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.status === "error" && result.error) setActionError(result.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {addresses.length === 0 && !adding ? (
        <p className="rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center text-sm text-wine-900/50">
          No saved addresses yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="rounded-xl border border-wine-900/15 bg-white p-4"
            >
              {editingId === address.id ? (
                <AddressForm editing={address} onDone={() => setEditingId(null)} />
              ) : (
                <>
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-wine-900">
                    {address.label ? `${address.label} — ` : ""}
                    {address.house}, {address.street}
                    {address.is_default ? (
                      <span className="rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-medium text-gold-700">
                        Default
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-wine-900/70">
                    {address.area}
                    {address.landmark ? ` · ${address.landmark}` : ""}
                    <br />
                    {[address.locality, address.district, address.state]
                      .filter(Boolean)
                      .join(", ")}
                    {address.locality || address.district || address.state ? (
                      <br />
                    ) : null}
                    {address.pincode}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(address.id)}
                      className="rounded-full border border-wine-900/30 px-4 py-1.5 text-xs font-medium text-wine-900 transition-colors hover:bg-ivory-100 disabled:opacity-50"
                      disabled={pending}
                    >
                      Edit
                    </button>
                    {!address.is_default ? (
                      <button
                        type="button"
                        onClick={() => run(() => setDefaultAddressAction(address.id))}
                        className="rounded-full border border-wine-900/30 px-4 py-1.5 text-xs font-medium text-wine-900 transition-colors hover:bg-ivory-100 disabled:opacity-50"
                        disabled={pending}
                      >
                        Set as default
                      </button>
                    ) : null}
                    {confirmingId === address.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => run(() => deleteAddressAction(address.id))}
                          className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-50 disabled:opacity-50"
                          disabled={pending}
                        >
                          Delete for real
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="text-xs text-wine-900/60 underline underline-offset-2"
                        >
                          Keep
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(address.id)}
                        className="rounded-full border border-red-200 px-4 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                        disabled={pending}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {actionError ? (
        <p role="alert" className="mt-3 text-xs text-red-700">
          {actionError}
        </p>
      ) : null}

      {adding ? (
        <div className="mt-4 rounded-xl border border-wine-900/15 bg-white p-4">
          <h3 className="font-serif text-lg text-wine-900">New address</h3>
          <div className="mt-3">
            <AddressForm onDone={() => setAdding(false)} />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="mt-4 rounded-full border border-wine-900/30 px-5 py-2 text-sm font-medium text-wine-900 transition-colors hover:bg-white"
        >
          + Add an address
        </button>
      )}
    </div>
  );
}
