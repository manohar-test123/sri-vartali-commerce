import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout · Sri Vartali" };

/**
 * /checkout (Phase 33): WhatsApp is the only ordering channel — the
 * conventional checkout (address form, payment verification pipeline)
 * was removed per owner direction. This route redirects to /cart where
 * the Buy via WhatsApp button carries the full prefilled order.
 */
export default function CheckoutPage() {
  redirect("/cart");
}
