import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { AppFrame } from "./layout/AppFrame";
import { AuthPage } from "../routes/auth-page";
import { HomePage } from "../routes/home-page";
import { HouseholdPage } from "../routes/household-page";
import { PlanPage } from "../routes/plan-page";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppFrame />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "auth",
        element: <AuthPage />,
      },
      {
        path: "household",
        element: <HouseholdPage />,
      },
      {
        path: "plan/:id",
        element: <PlanPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
