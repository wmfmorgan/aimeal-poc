import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { label: "Overview", to: "/" },
  { label: "Auth", to: "/auth" },
  { label: "Household", to: "/household" },
  { label: "Plan", to: "/plan/sample-plan" },
];

export function AppFrame() {
  return (
    <div className="min-h-screen bg-transparent px-5 py-6 text-[var(--color-ink)] md:px-10 md:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col rounded-[2rem] bg-[rgba(255,255,255,0.52)] p-4 shadow-[var(--shadow-soft)] backdrop-blur md:p-8">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
              PlanPlate local editorial shell
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-5xl leading-none text-[var(--color-sage-deep)] md:text-7xl">
                Build the meal plan before you polish the recipes.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-[var(--color-muted)] md:text-base">
                Phase 1 keeps the first local pass deliberately narrow: React, routing, and a visible
                Netlify-to-Supabase connectivity proof wrapped in the editorial system that later
                phases inherit.
              </p>
            </div>
          </div>

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
        </header>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
