/**
 * auth/auth-copy.ts
 *
 * Centralised UI copy strings for the auth surface.
 * Edits here propagate everywhere without touching JSX.
 */

export const AUTH_COPY = {
  // Page-level
  eyebrow: "Start with your email",
  emptyStateBody:
    "Create an account or sign in to continue to household setup. If you already began, return with the same email address.",

  // Mode labels
  modeSignIn: "Sign in",
  modeCreateAccount: "Create account",
  modeResetPassword: "Reset password",

  // Field labels
  fieldEmail: "Email address",
  fieldPassword: "Password",
  fieldNewPassword: "New password",
  fieldConfirmPassword: "Confirm new password",

  // Submit CTAs
  ctaSignIn: "Sign in",
  ctaCreateAccount: "Create account",
  ctaRequestReset: "Send reset link",
  ctaSetPassword: "Set new password",

  // In-flight states
  ctaSignInLoading: "Signing in…",
  ctaCreateAccountLoading: "Creating account…",
  ctaRequestResetLoading: "Sending…",
  ctaSetPasswordLoading: "Saving…",

  // Contextual helper actions
  forgotPassword: "Forgot password?",
  backToSignIn: "Back to sign in",

  // Feedback
  resetEmailSent: "Check your email for a reset link.",
  genericError:
    "We couldn't complete that request. Check your email and password, then try again. If you're resetting a password, request a fresh link and reopen it from the newest email.",
  passwordUpdated:
    "Your password has been updated. Sign in with your new password.",

  // Shell
  signOut: "Sign out",
  signedOut: "You've been signed out.",

  // Connectivity proof (mirrors home page panel, shown on /auth for signed-out users)
  connectivityEyebrow: "Connectivity",
  connectivityConnected: "API Connected",
  connectivityError: "API Error",
} as const;
