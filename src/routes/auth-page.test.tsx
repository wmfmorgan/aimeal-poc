/**
 * auth-page.test.tsx
 *
 * Component-level tests for the single /auth surface:
 *   - Default mode is sign-in
 *   - Mode switching between sign-in and create-account
 *   - Entering reset-request mode via "Forgot password?"
 *   - reset-complete mode when URL hash contains type=recovery
 *   - Loading state during form submission
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthPage } from "./auth-page";
import { useAuth } from "@/lib/auth/auth-state";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
  },
}));

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(() => ({
    isPasswordRecovery: false,
    isLoading: false,
    isAuthenticated: false,
    session: null,
    user: null,
    signOut: vi.fn(),
  })),
}));

vi.mock("@/lib/auth/auth-state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/auth-state")>();
  return { ...actual, useAuth: mockUseAuth };
});

vi.mock("@/hooks/use-ping-status", () => ({
  usePingStatus: () => ({
    connected: true,
    isLoading: false,
    updatedAt: "just now",
    error: null,
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setWindowHash(hash: string) {
  Object.defineProperty(window, "location", {
    value: {
      hash,
      origin: "http://127.0.0.1:8888",
      pathname: "/auth",
      href: `http://127.0.0.1:8888/auth${hash}`,
    },
    writable: true,
    configurable: true,
  });
}

function renderAuthPage() {
  return render(
    <MemoryRouter initialEntries={["/auth"]}>
      <AuthPage />
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// Default mode
// ---------------------------------------------------------------------------

describe("AuthPage — default sign-in mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWindowHash("");
  });

  afterEach(() => {
    setWindowHash("");
  });

  it("shows the sign-in heading on initial render", () => {
    renderAuthPage();
    expect(screen.getByText("Sign in to PlanPlate")).toBeInTheDocument();
  });

  it("shows email and password placeholder fields in sign-in mode", () => {
    renderAuthPage();
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });

  it("shows the 'Forgot password?' link in sign-in mode", () => {
    renderAuthPage();
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("shows the mode-switcher with both Sign in and Create account tabs", () => {
    renderAuthPage();
    // Both mode-switcher tabs and submit button exist; use getAllByRole to check presence
    const signInButtons = screen.getAllByRole("button", { name: /^sign in$/i });
    expect(signInButtons.length).toBeGreaterThanOrEqual(1);
    const createAccountButtons = screen.getAllByRole("button", { name: /^create account$/i });
    expect(createAccountButtons.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Mode switching
// ---------------------------------------------------------------------------

describe("AuthPage — mode switching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setWindowHash("");
  });

  it("switches to create-account mode when the tab is clicked", () => {
    renderAuthPage();
    // In sign-in mode, "Create account" is only the tab (type=button); click it
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    // "Forgot password?" link is only in sign-in mode
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
    // Now there will be multiple "Create account" buttons (tab + submit)
    const allCreateButtons = screen.getAllByRole("button", { name: /create account/i });
    expect(allCreateButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("switches back to sign-in mode from create-account", () => {
    renderAuthPage();
    // Click the "Create account" tab
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    // Click the "Sign in" tab (type=button)
    const signInButtons = screen.getAllByRole("button", { name: /^sign in$/i });
    const signInTab = signInButtons.find((b) => b.getAttribute("type") === "button")!;
    fireEvent.click(signInTab);
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
  });

  it("switches to reset-request mode via Forgot password? link", () => {
    renderAuthPage();
    fireEvent.click(screen.getByText("Forgot password?"));
    expect(screen.getByText("Send reset link")).toBeInTheDocument();
    // Mode switcher (sign-in/create-account) is hidden in reset modes
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
  });

  it("switches from reset-request back to sign-in via Back to sign in", () => {
    renderAuthPage();
    fireEvent.click(screen.getByText("Forgot password?"));
    fireEvent.click(screen.getByText("Back to sign in"));
    expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    expect(screen.queryByText("Send reset link")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Reset-complete mode (recovery hash)
// ---------------------------------------------------------------------------

describe("AuthPage — reset-complete mode (PASSWORD_RECOVERY event)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      isPasswordRecovery: true,
      isLoading: false,
      isAuthenticated: true,
      session: null,
      user: null,
      signOut: vi.fn(),
    });
  });

  it("enters reset-complete mode when isPasswordRecovery is true", () => {
    renderAuthPage();
    expect(screen.getByText("Set new password")).toBeInTheDocument();
    // Mode switcher not shown in reset-complete
    expect(screen.queryByText("Forgot password?")).not.toBeInTheDocument();
  });

  it("shows new-password and confirm fields in reset-complete mode", () => {
    renderAuthPage();
    expect(screen.getByPlaceholderText("8 characters minimum")).toBeInTheDocument();
    const passwordFields = screen.getAllByPlaceholderText("••••••••");
    expect(passwordFields.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Submit / loading states
// ---------------------------------------------------------------------------

describe("AuthPage — submit / loading states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isPasswordRecovery: false, isLoading: false, isAuthenticated: false, session: null, user: null, signOut: vi.fn() });
    setWindowHash("");
  });

  it("shows validation errors when sign-in is submitted with empty fields", async () => {
    renderAuthPage();
    // The submit button is type="submit"; click it to trigger validation
    const submitButton = screen.getAllByRole("button", { name: /^sign in$/i }).find(
      (b) => b.getAttribute("type") === "submit"
    )!;
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });

  it("shows in-flight loading text while sign-in is processing", async () => {
    mockSignInWithPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 200))
    );

    renderAuthPage();
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "validpassword" },
    });
    const submitButton = screen.getAllByRole("button", { name: /^sign in$/i }).find(
      (b) => b.getAttribute("type") === "submit"
    )!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Signing in…")).toBeInTheDocument();
    });
  });

  it("navigates to /household on successful sign-in", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });

    renderAuthPage();
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "validpassword" },
    });
    const submitButton = screen.getAllByRole("button", { name: /^sign in$/i }).find(
      (b) => b.getAttribute("type") === "submit"
    )!;
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/household");
    });
  });

  it("shows validation errors when create-account submitted with empty password", async () => {
    renderAuthPage();
    // Switch to create-account mode by clicking the tab (type="button")
    const createTab = screen.getAllByRole("button", { name: /^create account$/i }).find(
      (b) => b.getAttribute("type") === "button"
    )!;
    fireEvent.click(createTab);
    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@example.com" },
    });
    // In create-account mode the tab (type=button) and submit (type=submit) both have the same label
    const submitButton = screen.getAllByRole("button", { name: /^create account$/i }).find(
      (b) => b.getAttribute("type") === "submit"
    )!;
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
  });
});
