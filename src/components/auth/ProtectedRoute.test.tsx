/**
 * ProtectedRoute.test.tsx
 *
 * Unit coverage for the Phase 2 route-guard decisions:
 *   - Signed-out visit to a protected route redirects to /auth
 *   - Authenticated visit to /auth redirects to /household (via AuthRoute)
 *   - Loading state renders nothing (no flash)
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AuthRoute } from "./AuthRoute";

// ---------------------------------------------------------------------------
// Mock the auth-state module — lets tests control session/loading state
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();
vi.mock("@/lib/auth/auth-state", () => ({
  useAuth: () => mockUseAuth(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderProtectedRoute(authState: {
  isLoading: boolean;
  isAuthenticated: boolean;
}) {
  mockUseAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={["/household"]}>
      <Routes>
        <Route
          path="/household"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div>Auth Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderAuthRoute(authState: {
  isLoading: boolean;
  isAuthenticated: boolean;
}) {
  mockUseAuth.mockReturnValue(authState);
  return render(
    <MemoryRouter initialEntries={["/auth"]}>
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <div>Auth Page</div>
            </AuthRoute>
          }
        />
        <Route path="/household" element={<div>Household Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ---------------------------------------------------------------------------
// ProtectedRoute — signed-out tests
// ---------------------------------------------------------------------------

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while auth is loading", () => {
    const { container } = renderProtectedRoute({
      isLoading: true,
      isAuthenticated: false,
    });
    // ProtectedRoute returns null during loading
    expect(container.firstChild).toBeNull();
  });

  it("redirects an unauthenticated user to /auth", () => {
    renderProtectedRoute({ isLoading: false, isAuthenticated: false });
    expect(screen.getByText("Auth Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders protected children for an authenticated user", () => {
    renderProtectedRoute({ isLoading: false, isAuthenticated: true });
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("Auth Page")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AuthRoute — inverse guard tests
// ---------------------------------------------------------------------------

describe("AuthRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while auth is loading", () => {
    const { container } = renderAuthRoute({
      isLoading: true,
      isAuthenticated: false,
    });
    expect(container.firstChild).toBeNull();
  });

  it("redirects an authenticated user away from /auth to /household", () => {
    renderAuthRoute({ isLoading: false, isAuthenticated: true });
    expect(screen.getByText("Household Page")).toBeInTheDocument();
    expect(screen.queryByText("Auth Page")).not.toBeInTheDocument();
  });

  it("renders the auth page for an unauthenticated user", () => {
    renderAuthRoute({ isLoading: false, isAuthenticated: false });
    expect(screen.getByText("Auth Page")).toBeInTheDocument();
    expect(screen.queryByText("Household Page")).not.toBeInTheDocument();
  });
});
