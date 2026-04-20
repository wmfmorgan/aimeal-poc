/**
 * AuthRoute.tsx
 *
 * Inverse of ProtectedRoute — enforces the Phase 2 rule (D-10):
 *
 *   - While auth is loading: render null (same no-flash pattern)
 *   - Already authenticated: redirect immediately to /household
 *   - Not authenticated: render the auth surface (sign-in/up/reset page)
 *
 * Usage:
 *   <AuthRoute>
 *     <AuthPage />
 *   </AuthRoute>
 */

import type { PropsWithChildren } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-state";

export function AuthRoute({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/household" replace />;
  }

  return <>{children}</>;
}
