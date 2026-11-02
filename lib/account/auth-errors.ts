/**
 * Honest auth-failure messaging (Phase 23).
 *
 * Root cause this fixes: the login/OTP actions collapsed EVERY provider
 * failure into "Email or password is incorrect." — so an unreachable
 * auth provider (project paused, network split) or a non-deliverable
 * address told users their CORRECT credentials were wrong, which read as
 * "sign-in is broken". Pure functions — the unit suite pins every branch.
 *
 * Message policy: invalid credentials stay vague (never confirm which
 * part was wrong); infrastructure failures say so plainly and ask for a
 * retry; provider policies (rate limits, unconfirmed email, invalid
 * address domains) name the actual problem.
 */

export interface AuthErrorLike {
  message?: string | null;
  code?: string | null;
  status?: number | null;
}

function text(e: AuthErrorLike): string {
  return `${e.message ?? ""} ${e.code ?? ""}`.toLowerCase();
}

/** fetch/network failures — supabase-js surfaces these as TypeError-ish
 *  messages with no HTTP status; the provider never saw the request. */
export function isAuthNetworkFailure(e: AuthErrorLike): boolean {
  if (e.status === 0) return true;
  return /fetch failed|failed to fetch|networkerror|econnrefused|enotfound|timed? ?out|load failed/.test(
    text(e),
  );
}

/** Password sign-in: invalid credentials are the expected wrong answer;
 *  everything else gets its true cause. */
export function passwordAuthErrorMessage(e: AuthErrorLike): string {
  if (isAuthNetworkFailure(e)) {
    return "Sign-in is temporarily unavailable — please try again in a moment.";
  }
  const t = text(e);
  if (t.includes("email not confirmed")) {
    return "Your email isn't confirmed yet — open the confirmation link we sent you, then sign in.";
  }
  if (t.includes("over_email_send_rate_limit") || t.includes("too many")) {
    return "Too many sign-in attempts. Please wait a little and try again.";
  }
  // Provider's verdict on the pair itself (GoTrue: "Invalid login credentials").
  return "Email or password is incorrect.";
}

/** One-time-link (OTP) requests: no credential verdict exists here, so
 *  every failure names its cause. */
export function otpAuthErrorMessage(e: AuthErrorLike): string {
  if (isAuthNetworkFailure(e)) {
    return "Sign-in is temporarily unavailable — please try again in a moment.";
  }
  const t = text(e);
  if (t.includes("email_address_invalid")) {
    return "This email address can't receive sign-in links (its domain isn't valid for email). Use password sign-in, or a different address.";
  }
  if (t.includes("over_email_send_rate_limit") || t.includes("too many")) {
    return "Too many link requests — please wait a minute and try again.";
  }
  if (t.includes("email not confirmed")) {
    return "Your email isn't confirmed yet — open the confirmation link we sent you first.";
  }
  return "The sign-in link could not be sent. Please try again.";
}
