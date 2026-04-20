/**
 * auth-page.tsx
 *
 * Single `/auth` surface for all authentication flows:
 *   - sign-in        (default)
 *   - create-account
 *   - reset-request  (forgot password)
 *   - reset-complete (return from email link with recovery session)
 *
 * Decisions honoured:
 *   D-01  /auth is the only top-level auth route
 *   D-02  in-place mode switching (sign in ↔ create account)
 *   D-03  reset entry from the same /auth surface
 *   D-04  navigate to /household on success
 *   D-07–D-09  protected by AuthRoute in router; this page is signed-out-only
 *   D-13–D-15  full in-app reset (no Supabase hosted UI)
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/lib/supabase/client";
import { usePingStatus } from "@/hooks/use-ping-status";
import { AUTH_COPY } from "@/lib/auth/auth-copy";
import {
  validateSignIn,
  validateCreateAccount,
  validateResetRequest,
  validateResetComplete,
  hasErrors,
} from "@/lib/auth/validation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AuthMode = "sign-in" | "create-account" | "reset-request" | "reset-complete";

// ---------------------------------------------------------------------------
// Small shared primitives
// ---------------------------------------------------------------------------

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-sm text-[#803b26]" role="alert">
      {message}
    </p>
  );
}

function SubmitBanner({ message, tone }: { message: string; tone: "error" | "success" }) {
  const colours =
    tone === "error"
      ? "bg-[rgba(128,59,38,0.08)] text-[#803b26]"
      : "bg-[rgba(74,103,65,0.10)] text-[var(--color-sage-deep)]";
  return (
    <p className={`rounded-xl px-4 py-3 text-sm leading-6 ${colours}`} role="alert">
      {message}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Connectivity proof (reused from home page pattern)
// ---------------------------------------------------------------------------

function ConnectivityProof() {
  const { connected, isLoading, updatedAt, error } = usePingStatus();

  const badgeTone = connected
    ? "bg-[rgba(74,103,65,0.14)] text-[var(--color-sage-deep)]"
    : "bg-[rgba(128,59,38,0.12)] text-[#803b26]";

  return (
    <aside className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-white/60 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {AUTH_COPY.connectivityEyebrow}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-xs leading-6 text-[var(--color-muted)]">
          {isLoading
            ? "Checking…"
            : connected
              ? `Last ping ${updatedAt}`
              : (error ?? "No response")}
        </span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeTone}`}>
          {connected ? AUTH_COPY.connectivityConnected : AUTH_COPY.connectivityError}
        </span>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// AuthPage
// ---------------------------------------------------------------------------

export function AuthPage() {
  const navigate = useNavigate();

  // Detect recovery session from URL hash on mount (Supabase sends #access_token=...&type=recovery)
  const [mode, setMode] = useState<AuthMode>("sign-in");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset-complete");
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Shared field state
  // ---------------------------------------------------------------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ---------------------------------------------------------------------------
  // Per-mode error state (populated on submit, cleared on blur after submit)
  // ---------------------------------------------------------------------------
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Flag set after a successful password reset so the timed transition to
  // sign-in mode can be driven from a useEffect with proper cleanup.
  const [redirectToSignIn, setRedirectToSignIn] = useState(false);

  // Track whether the form has been submitted once (for blur re-validation)
  const hasSubmitted = useRef(false);

  // ---------------------------------------------------------------------------
  // Mode switching — reset errors and success messages
  // ---------------------------------------------------------------------------
  function switchMode(next: AuthMode) {
    setMode(next);
    setFieldErrors({});
    setSubmitError(null);
    setSubmitSuccess(null);
    hasSubmitted.current = false;
  }

  // After a successful password reset, transition to sign-in after a short
  // delay. Using useEffect ensures the timer is cancelled if the component
  // unmounts before the 2.5 s elapses, avoiding state updates on stale instances.
  useEffect(() => {
    if (!redirectToSignIn) return;
    const id = setTimeout(() => {
      switchMode("sign-in");
      setRedirectToSignIn(false);
    }, 2500);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectToSignIn]);

  // ---------------------------------------------------------------------------
  // Blur re-validation (only after first submit attempt)
  // ---------------------------------------------------------------------------
  function revalidateOnBlur(field: "email" | "password" | "confirm") {
    if (!hasSubmitted.current) return;
    let errors = { ...fieldErrors };
    if (field === "email") {
      const err = validateSignIn(email, password).email;
      errors = { ...errors, email: err };
    }
    if (field === "password") {
      const err =
        mode === "sign-in"
          ? validateSignIn(email, password).password
          : mode === "create-account"
            ? validateCreateAccount(email, password).password
            : validateResetComplete(password, confirmPassword).password;
      errors = { ...errors, password: err };
    }
    if (field === "confirm") {
      const err = validateResetComplete(password, confirmPassword).confirm;
      errors = { ...errors, confirm: err };
    }
    setFieldErrors(errors);
  }

  // ---------------------------------------------------------------------------
  // Sign in
  // ---------------------------------------------------------------------------
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    hasSubmitted.current = true;
    const errors = validateSignIn(email, password);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setSubmitError(AUTH_COPY.genericError);
      } else {
        navigate("/household");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Create account
  // ---------------------------------------------------------------------------
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    hasSubmitted.current = true;
    const errors = validateCreateAccount(email, password);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setSubmitError(AUTH_COPY.genericError);
      } else if (data.session) {
        navigate("/household");
      } else {
        // Email confirmation required — session is null until confirmed
        setSubmitSuccess("Check your inbox to confirm your account before signing in.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reset request
  // ---------------------------------------------------------------------------
  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    hasSubmitted.current = true;
    const errors = validateResetRequest(email);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth`
          : "http://127.0.0.1:8888/auth";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) {
        setSubmitError(AUTH_COPY.genericError);
      } else {
        setSubmitSuccess(AUTH_COPY.resetEmailSent);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reset complete
  // ---------------------------------------------------------------------------
  async function handleResetComplete(e: React.FormEvent) {
    e.preventDefault();
    hasSubmitted.current = true;
    const errors = validateResetComplete(password, confirmPassword);
    setFieldErrors(errors);
    if (hasErrors(errors)) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setSubmitError(AUTH_COPY.genericError);
      } else {
        setSubmitSuccess(AUTH_COPY.passwordUpdated);
        // Clear recovery hash from URL
        window.history.replaceState(null, "", window.location.pathname);
        // Trigger the timed sign-in transition via useEffect (allows cleanup on unmount)
        setRedirectToSignIn(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Shared input class helper
  // ---------------------------------------------------------------------------
  function inputCls(hasError: boolean) {
    return [
      "w-full rounded-xl border px-4 py-3 text-base text-[var(--color-ink)] bg-white/80",
      "placeholder:text-[var(--color-muted)] transition-colors outline-none",
      hasError
        ? "border-[#803b26] focus:ring-2 focus:ring-[#803b26]/30"
        : "border-[rgba(74,103,65,0.2)] focus:border-[#4A6741] focus:ring-2 focus:ring-[#4A6741]/20",
    ].join(" ");
  }

  // ---------------------------------------------------------------------------
  // Shared submit button class helper
  // ---------------------------------------------------------------------------
  function submitCls() {
    return [
      "w-full rounded-xl bg-[#4A6741] px-6 text-white font-semibold text-sm tracking-wide",
      "transition-opacity disabled:opacity-60",
      "min-h-[44px]",
    ].join(" ");
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8">
      {/* Auth card */}
      <div className="w-full max-w-[32rem] rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">

        {/* Eyebrow + heading */}
        <div className="mb-6 space-y-3">
          <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
            {AUTH_COPY.eyebrow}
          </p>
          <h2 className="font-display text-[20px] font-semibold leading-snug text-[var(--color-sage-deep)]">
            {mode === "reset-request"
              ? AUTH_COPY.modeResetPassword
              : mode === "reset-complete"
                ? AUTH_COPY.modeResetPassword
                : "Sign in to PlanPlate"}
          </h2>
          {mode === "sign-in" && (
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              {AUTH_COPY.emptyStateBody}
            </p>
          )}
        </div>

        {/* Mode switcher (only for sign-in / create-account) */}
        {(mode === "sign-in" || mode === "create-account") && (
          <div className="mb-6 flex rounded-xl bg-[rgba(74,103,65,0.06)] p-1">
            {(["sign-in", "create-account"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={[
                  "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors min-h-[44px]",
                  mode === m
                    ? "bg-[#4A6741] text-white shadow-sm"
                    : "text-[var(--color-sage-deep)] hover:bg-white/60",
                ].join(" ")}
              >
                {m === "sign-in" ? AUTH_COPY.modeSignIn : AUTH_COPY.modeCreateAccount}
              </button>
            ))}
          </div>
        )}

        {/* Submit-level feedback banners */}
        {submitError && (
          <div className="mb-4">
            <SubmitBanner message={submitError} tone="error" />
          </div>
        )}
        {submitSuccess && (
          <div className="mb-4">
            <SubmitBanner message={submitSuccess} tone="success" />
          </div>
        )}

        {/* ——— Sign in form ——— */}
        {mode === "sign-in" && (
          <form onSubmit={handleSignIn} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldEmail}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => revalidateOnBlur("email")}
                className={inputCls(!!fieldErrors.email)}
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldPassword}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => revalidateOnBlur("password")}
                className={inputCls(!!fieldErrors.password)}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={submitCls()}
            >
              {isSubmitting ? AUTH_COPY.ctaSignInLoading : AUTH_COPY.ctaSignIn}
            </button>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => switchMode("reset-request")}
                className="text-sm text-[var(--color-sage-deep)] hover:underline min-h-[44px] px-0"
              >
                {AUTH_COPY.forgotPassword}
              </button>
            </div>
          </form>
        )}

        {/* ——— Create account form ——— */}
        {mode === "create-account" && (
          <form onSubmit={handleCreateAccount} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldEmail}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => revalidateOnBlur("email")}
                className={inputCls(!!fieldErrors.email)}
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldPassword}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => revalidateOnBlur("password")}
                className={inputCls(!!fieldErrors.password)}
                placeholder="8 characters minimum"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={submitCls()}
            >
              {isSubmitting ? AUTH_COPY.ctaCreateAccountLoading : AUTH_COPY.ctaCreateAccount}
            </button>
          </form>
        )}

        {/* ——— Reset request form ——— */}
        {mode === "reset-request" && (
          <form onSubmit={handleResetRequest} noValidate className="space-y-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Enter the email address you signed up with and we will send you a reset link.
            </p>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldEmail}
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => revalidateOnBlur("email")}
                className={inputCls(!!fieldErrors.email)}
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.email} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={submitCls()}
            >
              {isSubmitting ? AUTH_COPY.ctaRequestResetLoading : AUTH_COPY.ctaRequestReset}
            </button>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => switchMode("sign-in")}
                className="text-sm text-[var(--color-sage-deep)] hover:underline min-h-[44px] px-0"
              >
                {AUTH_COPY.backToSignIn}
              </button>
            </div>
          </form>
        )}

        {/* ——— Reset complete form ——— */}
        {mode === "reset-complete" && (
          <form onSubmit={handleResetComplete} noValidate className="space-y-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              Choose a new password for your account.
            </p>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldNewPassword}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => revalidateOnBlur("password")}
                className={inputCls(!!fieldErrors.password)}
                placeholder="8 characters minimum"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.password} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-ink)] mb-2">
                {AUTH_COPY.fieldConfirmPassword}
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => revalidateOnBlur("confirm")}
                className={inputCls(!!fieldErrors.confirm)}
                placeholder="••••••••"
                disabled={isSubmitting}
              />
              <FieldError message={fieldErrors.confirm} />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={submitCls()}
            >
              {isSubmitting ? AUTH_COPY.ctaSetPasswordLoading : AUTH_COPY.ctaSetPassword}
            </button>
          </form>
        )}
      </div>

      {/* Connectivity proof (signed-out Netlify → Supabase smoke path) */}
      <div className="w-full max-w-[32rem]">
        <ConnectivityProof />
      </div>
    </div>
  );
}
