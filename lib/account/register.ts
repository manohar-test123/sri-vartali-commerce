/**
 * Registration validation (Phase 20). Pure — the server action and any
 * future client-side pre-check call the same rules, and the unit suite
 * exercises every rejection path.
 */

export interface RegistrationInput {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegistrationFieldErrors = Record<string, string>;

export const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 60;

export function validateRegistration(
  input: RegistrationInput,
): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};
  const name = input.name.trim();

  if (name.length < 2) {
    errors.name = "Enter your full name (at least 2 characters).";
  } else if (name.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (!/[a-z]/i.test(input.password) || !/\d/.test(input.password)) {
    errors.password = "Password needs at least one letter and one number.";
  }

  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

/** Friendly mapping of Supabase auth error messages for sign-up. */
export function mapSignUpError(message: string): string {
  if (message.includes("already registered")) {
    return "An account with this email already exists. Sign in instead, or use the one-time link option.";
  }
  if (message.toLowerCase().includes("password")) {
    return `Password is too weak — use at least ${MIN_PASSWORD_LENGTH} characters with a letter and a number.`;
  }
  if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("too many")) {
    return "Too many attempts right now. Please try again in a little while.";
  }
  return "Account could not be created. Please try again.";
}
