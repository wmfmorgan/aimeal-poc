/**
 * ProtectedRoute.tsx
 *
 * Guard wrapper that enforces the Phase 2 locked route-access rules (D-07–D-10):
 *
 *   - While auth is still loading: render null (avoids flash of incorrect route)
 *   - Not authenticated: redirect to /auth, preserving the intended destination
 *     in router state so future plans can pick it up after sign-in
 *   - Authenticated: render the protected child route normally
 *
 * Usage:
 *   <ProtectedRoute>
 *     <HouseholdPage />
 *   </ProtectedRoute>
 */

import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-state";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // While the initial session check is in flight, render nothing to avoid
  // a brief flash of the protected page or a premature redirect.
  if (isLoading) {
    return null;
  }

  // Not authenticated — redirect to /auth and preserve the intended destination
  // in router state so post-auth routing can send the user where they wanted to go.
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
