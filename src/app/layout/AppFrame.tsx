import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "@/lib/auth/auth-state";
import { AUTH_COPY } from "@/lib/auth/auth-copy";

const navItems = [
  { label: "Overview", to: "/" },
  { label: "Household", to: "/household" },
  { label: "Plan", to: "/plan/new" },
  { label: "Dev", to: "/dev" },
];

export function AppFrame() {
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState(false);

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
    <div className="min-h-screen bg-transparent px-5 py-6 text-[var(--color-ink)] md:px-10 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
              PlanPlate
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-5xl leading-none text-[var(--color-sage-deep)] md:text-7xl">
                Build the meal plan before you polish the recipes.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-[var(--color-muted)] md:text-base">
                AI-generated weekly meal plans. Enrich the meals you care about with real recipes.
              </p>
            </div>
          </div>

          {/* Right cluster: nav pills + quiet sign-out utility */}
          <div className="flex flex-col items-end gap-3">
            <nav className="flex flex-wrap gap-2 md:max-w-sm md:justify-end">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      "rounded-full px-4 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-[var(--color-sage)] text-white"
                        : "bg-white/80 text-[var(--color-sage-deep)] hover:bg-white",
                    ].join(" ")
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* Quiet sign-out — visible only when authenticated; placed outside the primary nav pills */}
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full px-4 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-sage-deep)] transition-colors min-h-[44px]"
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
