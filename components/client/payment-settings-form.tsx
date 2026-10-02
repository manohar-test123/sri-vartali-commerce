"use client";

/**
 * §30 payment settings form. The store number field doubles as the §27
 * deep-link target — long settable only via SQL, now owner-editable here.
 */

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updatePaymentSettingsAction } from "@/lib/settings/actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-wine-900/20 bg-white px-3 py-2 text-sm text-wine-900 placeholder:text-wine-900/30 focus:border-gold-400 focus:outline-none disabled:bg-ivory-50 disabled:text-wine-900/40";

export function PaymentSettingsForm({
  canEdit,
  initial,
}: {
  canEdit: boolean;
  initial: {
    businessName: string;
    upiId: string;
    upiQrUrl: string;
    paymentInstructions: string;
    whatsappStoreNumber: string;
  };
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage(null);
    setErrors({});
    startTransition(async () => {
      const result = await updatePaymentSettingsAction(new FormData(form));
      if (result.ok) {
        setMessage(result.message);
        setErrors({});
        router.refresh();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
      {message ? (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {errors._form ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors._form}
        </p>
      ) : null}

      <label className="block text-sm font-medium text-wine-900">
        Business name
        <input
          type="text"
          name="businessName"
          defaultValue={initial.businessName}
          required
          maxLength={80}
          disabled={!canEdit || pending}
          className={inputClass}
        />
        {errors.businessName ? (
          <span className="mt-1 block text-xs font-normal text-red-700">
            {errors.businessName}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-wine-900">
        UPI ID
        <input
          type="text"
          name="upiId"
          defaultValue={initial.upiId}
          placeholder="storename@bank"
          disabled={!canEdit || pending}
          className={inputClass}
        />
        {errors.upiId ? (
          <span className="mt-1 block text-xs font-normal text-red-700">
            {errors.upiId}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-wine-900">
        QR image URL
        <input
          type="url"
          name="upiQrUrl"
          defaultValue={initial.upiQrUrl}
          placeholder="https://res.cloudinary.com/…/qr.png"
          disabled={!canEdit || pending}
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-wine-900/50">
          Sent as the payment QR after the instructions message. Host the
          image anywhere public (e.g. Cloudinary) and paste the https link.
        </span>
        {errors.upiQrUrl ? (
          <span className="mt-1 block text-xs font-normal text-red-700">
            {errors.upiQrUrl}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-wine-900">
        Payment instructions
        <textarea
          name="paymentInstructions"
          defaultValue={initial.paymentInstructions}
          rows={4}
          maxLength={1000}
          disabled={!canEdit || pending}
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-wine-900/50">
          Optional. Replaces the standard “complete your payment using the QR
          code below” sentence in the automatic reply.
        </span>
        {errors.paymentInstructions ? (
          <span className="mt-1 block text-xs font-normal text-red-700">
            {errors.paymentInstructions}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-wine-900">
        Store WhatsApp number
        <input
          type="text"
          name="whatsappStoreNumber"
          defaultValue={initial.whatsappStoreNumber}
          placeholder="+91 98765 43210"
          disabled={!canEdit || pending}
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-wine-900/50">
          Where the “Send order on WhatsApp” button takes customers (§27).
        </span>
        {errors.whatsappStoreNumber ? (
          <span className="mt-1 block text-xs font-normal text-red-700">
            {errors.whatsappStoreNumber}
          </span>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={!canEdit || pending}
        className="rounded-full bg-wine-900 px-6 py-2 text-sm text-ivory-50 transition-colors hover:bg-wine-800 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
