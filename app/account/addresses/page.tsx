import type { Metadata } from "next";
import Link from "next/link";

import { AddressBook } from "@/components/account/address-book";
import { getSession } from "@/lib/auth/session";
import { getAccountAddresses, getAccountCustomer } from "@/lib/account/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your addresses · Sri Vartali" };

/** Customer address book (spec §7 /account/addresses). */
export default async function AccountAddressesPage() {
  const session = await getSession();

  if (session.status !== "authenticated") {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-24">
        <h1 className="font-serif text-3xl text-wine-900">Your addresses</h1>
        <p className="mt-4 text-sm leading-6 text-wine-900/70">
          Please{" "}
          <Link href="/account/login?next=/account/addresses" className="underline decoration-gold-400 underline-offset-2">
            sign in
          </Link>{" "}
          to manage your saved addresses.
        </p>
      </div>
    );
  }

  const addresses = await getAccountAddresses(session.user.id);
  // An empty list is ambiguous (no rows vs no claimed customer row); check
  // the customer link explicitly so the right guidance shows.
  const customer = await getAccountCustomer(session.user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-gold-600">Account</p>
      <h1 className="mt-2 font-serif text-3xl text-wine-900">Your addresses</h1>

      {customer ? (
        <>
          <p className="mt-2 text-sm leading-6 text-wine-900/60">
            Saved delivery addresses for {customer.name} ({customer.phone}).
          </p>
          <div className="mt-8">
            <AddressBook addresses={addresses} />
          </div>
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-wine-900/25 px-6 py-10 text-center">
          <p className="text-sm leading-6 text-wine-900/60">
            Your address book opens once you save your name and the phone
            number you order with in{" "}
            <Link href="/account/profile" className="underline decoration-gold-400 underline-offset-2">
              Profile
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
