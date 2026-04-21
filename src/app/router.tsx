import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";

import { AppFrame } from "./layout/AppFrame";
import { AuthPage } from "../routes/auth-page";
import { HomePage } from "../routes/home-page";
import { HouseholdPage } from "../routes/household-page";
import { PlanPage } from "../routes/plan-page";
import { DevPage } from "../routes/dev-page";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { AuthRoute } from "../components/auth/AuthRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppFrame />,
    children: [
      {
        // `/` is a protected surface; redirect unauthenticated users to /auth
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        // `/auth` is signed-out-only; authenticated users are sent to /household
        path: "auth",
        element: (
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        ),
      },
      {
        path: "household",
        element: (
          <ProtectedRoute>
            <HouseholdPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "plan/:id",
        element: (
          <ProtectedRoute>
            <PlanPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "dev",
        element: <DevPage />,
      },
      {
        // Catch-all: unknown paths redirect to home (which guards itself)
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
