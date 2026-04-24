import { Link } from "react-router-dom";

import { usePingStatus } from "../hooks/use-ping-status";

export function HomePage() {
  const { connected, error, isLoading, updatedAt } = usePingStatus();

  const badgeLabel = connected ? "API Connected" : "API Error";
  const badgeTone = connected
    ? "bg-[rgba(74,103,65,0.14)] text-[var(--color-sage-deep)]"
    : "bg-[rgba(128,59,38,0.12)] text-[#803b26]";

  return (
    <section
      className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)] xl:gap-8"
      data-testid="home-page-layout"
    >
      <div className="space-y-5">
        <div className="max-w-[42rem] space-y-4" data-testid="home-page-hero">
          <p className="text-sm uppercase tracking-[0.26em] text-[var(--color-muted)]">
            Local developer cockpit
          </p>
          <h2 className="font-display text-4xl leading-tight text-[var(--color-sage-deep)] md:text-5xl">
            Netlify fronts the app so the same request shape survives local and hosted runs.
          </h2>
          <p className="text-base leading-7 text-[var(--color-muted)]">
            This starter route proves the frontend can reach the local Supabase tRPC edge function
            through Netlify rather than by hard-coding per-service localhost ports. If this badge
            turns green, the proxy path is working.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-[1.5rem] bg-white/70 p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Local entrypoint
            </p>
            <p className="mt-3 font-display text-3xl text-[var(--color-sage-deep)]">`netlify dev`</p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              Browser traffic lands on port 8888 and is forwarded to Vite on 5173 plus Supabase
              APIs on 54331 through rewrite rules.
            </p>
          </article>
          <article className="rounded-[1.5rem] bg-[rgba(215,200,163,0.26)] p-5 md:p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
              Phase 1 routes
            </p>
            <p className="mt-3 font-display text-3xl text-[var(--color-sage-deep)]">4 surfaces</p>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              Home, auth, household, and plan shells are wired now so the next phases can fill them
              in without replacing the router skeleton.
            </p>
          </article>
        </div>
      </div>

      <aside className="flex max-w-[24rem] flex-col gap-4 rounded-[1.75rem] bg-[rgba(255,255,255,0.78)] p-5 md:p-6 lg:justify-self-end">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
            Connectivity badge
          </p>
          <span className={`rounded-full px-4 py-2 text-sm font-semibold ${badgeTone}`}>
            {badgeLabel}
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-sm leading-7 text-[var(--color-muted)]">
            The home screen calls the `ping` procedure at the relative Netlify proxy path
            `/functions/v1/trpc`.
          </p>
          <p className="text-sm leading-7 text-[var(--color-muted)]">
            {isLoading
              ? "Waiting for the local Supabase/tRPC stack to answer through Netlify."
              : connected
                ? `Last successful ping at ${updatedAt}.`
                : error ?? "The local stack has not answered yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 text-sm text-[var(--color-sage-deep)]">
          <Link className="rounded-full bg-white px-4 py-2" to="/auth">
            View Auth
          </Link>
          <Link className="rounded-full bg-white px-4 py-2" to="/household">
            View Household
          </Link>
        </div>
      </aside>
    </section>
  );
}
