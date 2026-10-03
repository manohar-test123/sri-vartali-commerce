"use client";

/**
 * Add / edit one address on /account/addresses. Field set matches the
 * checkout form so saved addresses read exactly like delivery addresses.
 */

import { useActionState } from "react";

import { saveAddressAction, type AccountActionResult } from "@/lib/account/actions";
import type { AccountAddress } from "@/lib/account/queries";

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2.5 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-500 focus:outline-none";

const initial: AccountActionResult | null = null;

export function AddressForm({
  editing,
  onDone,
}: {
  /** Present values when editing an existing address; null when adding. */
  editing?: AccountAddress;
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState(saveAddressAction, initial);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {editing ? <input type="hidden" name="addressId" value={editing.id} /> : null}

      <div className="sm:col-span-2">
        <label htmlFor={`label-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          Label (optional)
        </label>
        <input
          id={`label-${editing?.id ?? "new"}`}
          name="label"
          type="text"
          maxLength={40}
          placeholder="Home, Office…"
          defaultValue={editing?.label ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`house-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          House / flat *
        </label>
        <input
          id={`house-${editing?.id ?? "new"}`}
          name="house"
          type="text"
          required
          autoComplete="address-line1"
          defaultValue={editing?.house ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`street-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          Street *
        </label>
        <input
          id={`street-${editing?.id ?? "new"}`}
          name="street"
          type="text"
          required
          autoComplete="address-line2"
          defaultValue={editing?.street ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`area-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          Area / locality *
        </label>
        <input
          id={`area-${editing?.id ?? "new"}`}
          name="area"
          type="text"
          required
          defaultValue={editing?.area ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`landmark-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          Landmark
        </label>
        <input
          id={`landmark-${editing?.id ?? "new"}`}
          name="landmark"
          type="text"
          defaultValue={editing?.landmark ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`town-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          Town / city
        </label>
        <input
          id={`town-${editing?.id ?? "new"}`}
          name="locality"
          type="text"
          defaultValue={editing?.locality ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`district-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          District
        </label>
        <input
          id={`district-${editing?.id ?? "new"}`}
          name="district"
          type="text"
          defaultValue={editing?.district ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`state-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          State
        </label>
        <input
          id={`state-${editing?.id ?? "new"}`}
          name="state"
          type="text"
          defaultValue={editing?.state ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor={`pin-${editing?.id ?? "new"}`} className="block text-xs text-wine-900/60">
          PIN code *
        </label>
        <input
          id={`pin-${editing?.id ?? "new"}`}
          name="pinCode"
          type="text"
          required
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="postal-code"
          defaultValue={editing?.pincode ?? ""}
          className={inputClass}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-wine-900/70 sm:col-span-2">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={editing?.is_default ?? false}
          className="h-4 w-4 accent-wine-800"
        />
        Use as default address
      </label>

      {state?.status === "error" ? (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {state.error}
        </p>
      ) : null}
      {state?.status === "ok" && state.message ? (
        <p role="status" className="text-sm text-emerald-800 sm:col-span-2">
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-wine-900 px-6 py-2.5 text-sm font-semibold text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : editing ? "Save address" : "Add address"}
        </button>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-wine-900/60 underline underline-offset-2 hover:text-wine-900"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
