/**
 * Pure account-profile rules. Checkout keeps a phone-keyed customer book
 * (place_order upserts customers by phone, user_id unset), so linking an
 * account to its order history means claiming that row. The plan is a
 * pure function so the ownership rules are unit-testable.
 */

export type ExistingCustomerRow = { id: string; user_id: string | null };

export type PhoneClaimPlan =
  | { action: "create" }
  | { action: "claim"; rowId: string }
  | { action: "update"; rowId: string }
  | { action: "reject"; reason: "phone_taken" };

/**
 * What to do when a signed-in user saves name + phone on /account/profile:
 * - no customers row with that phone → create one owned by them
 * - row exists, unowned (placed orders as guest) → claim it
 * - row exists, already theirs → plain profile update
 * - row exists, owned by someone else → refuse
 */
export function planPhoneClaim(
  existing: ExistingCustomerRow | null,
  userId: string,
): PhoneClaimPlan {
  if (!existing) return { action: "create" };
  if (existing.user_id === null) return { action: "claim", rowId: existing.id };
  if (existing.user_id === userId) return { action: "update", rowId: existing.id };
  return { action: "reject", reason: "phone_taken" };
}
