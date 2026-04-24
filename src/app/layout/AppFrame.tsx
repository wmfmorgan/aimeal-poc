import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-state";
import { AUTH_COPY } from "@/lib/auth/auth-copy";
import { useLatestMealPlan } from "@/hooks/use-meal-plan";

const staticNavItems = [
  { label: "Overview", to: "/" },
  { label: "Household", to: "/household" },
  { label: "Dev", to: "/dev" },
];

export function AppFrame() {
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(false);

  // D-01: Resolve the Plan nav to the user's most recent saved plan.
  // Falls back to /plan/new when no plan exists or the lookup errors (conservative).
  const { latestPlanId } = useLatestMealPlan();

  function handlePlanNavClick(e: React.MouseEvent) {
    e.preventDefault();
    navigate(latestPlanId ? `/plan/${latestPlanId}` : "/plan/new");
  }

  async function handleSignOut() {
    setSignOutError(false);
    try {
      await signOut();
      navigate("/auth");
    } catch {
      // signOut failed (e.g. network timeout); do not navigate — session is
      // still valid on the server. Surface a brief error to the user.
      setSignOutError(true);
    }
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-5 text-[var(--color-ink)] md:px-6 md:py-6 xl:px-8 xl:py-7">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[88rem] flex-col rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 shadow-[var(--shadow-soft)] backdrop-blur md:p-6 xl:p-7">
        <header className="mb-6 flex flex-col gap-5 md:mb-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
              PlanPlate
            </p>
            <div className="space-y-2">
              <h1 className="font-display text-4xl leading-[0.98] text-[var(--color-sage-deep)] md:text-6xl xl:text-7xl">
                Build the meal plan before you polish the recipes.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-[var(--color-muted)] md:text-base md:leading-7">
                AI-generated weekly meal plans. Enrich the meals you care about with real recipes.
              </p>
            </div>
          </div>

          {/* Right cluster: nav pills + quiet sign-out utility */}
          <div className="flex flex-col items-start gap-2.5 md:items-end">
            <nav className="flex flex-wrap gap-2 md:max-w-md md:justify-end">
              {staticNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-[var(--color-sage)] text-white"
                        : "bg-white/80 text-[var(--color-sage-deep)] hover:bg-white",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}

              {/* Plan nav pill: programmatic resolution to latest plan or /plan/new */}
              <NavLink
                to={latestPlanId ? `/plan/${latestPlanId}` : "/plan/new"}
                onClick={handlePlanNavClick}
                className={({ isActive }) =>
                  [
                    "flex min-h-[44px] items-center rounded-full px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-[var(--color-sage)] text-white"
                      : "bg-white/80 text-[var(--color-sage-deep)] hover:bg-white",
                  ].join(" ")
                }
              >
                Plan
              </NavLink>
            </nav>

            {/* Quiet sign-out — visible only when authenticated; placed outside the primary nav pills */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                className="min-h-[44px] rounded-full px-4 py-2 text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-sage-deep)]"
              >
                {AUTH_COPY.signOut}
              </button>
            )}
            {signOutError && (
              <p className="text-xs text-[#803b26]" role="alert">
                Sign-out failed. Please try again.
              </p>
            )}
          </div>
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
