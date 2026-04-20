/**
 * auth/validation.ts
 *
 * Field-level validation helpers for all auth form modes.
 * Returns a human-readable error string or null (valid).
 */

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a valid email address.";
  // Basic RFC-compliant shape check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password must be at least 8 characters.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validatePasswordConfirm(
  password: string,
  confirm: string
): string | null {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}

export interface SignInErrors extends Record<string, string | undefined> {
  email?: string;
  password?: string;
}

export interface CreateAccountErrors extends Record<string, string | undefined> {
  email?: string;
  password?: string;
}

export interface ResetRequestErrors extends Record<string, string | undefined> {
  email?: string;
}

export interface ResetCompleteErrors extends Record<string, string | undefined> {
  password?: string;
  confirm?: string;
}

export function validateSignIn(email: string, password: string): SignInErrors {
  const errors: SignInErrors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passwordErr = validatePassword(password);
  if (passwordErr) errors.password = passwordErr;
  return errors;
}

export function validateCreateAccount(
  email: string,
  password: string
): CreateAccountErrors {
  const errors: CreateAccountErrors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  const passwordErr = validatePassword(password);
  if (passwordErr) errors.password = passwordErr;
  return errors;
}

export function validateResetRequest(email: string): ResetRequestErrors {
  const errors: ResetRequestErrors = {};
  const emailErr = validateEmail(email);
  if (emailErr) errors.email = emailErr;
  return errors;
}

export function validateResetComplete(
  password: string,
  confirm: string
): ResetCompleteErrors {
  const errors: ResetCompleteErrors = {};
  const passwordErr = validatePassword(password);
  if (passwordErr) errors.password = passwordErr;
  const confirmErr = validatePasswordConfirm(password, confirm);
  if (confirmErr) errors.confirm = confirmErr;
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((v) => v !== undefined);
}
