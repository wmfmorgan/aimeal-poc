export function AuthPage() {
  return (
    <section className="max-w-3xl space-y-4 rounded-[1.75rem] bg-white/72 p-8">
      <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">Auth surface</p>
      <h2 className="font-display text-4xl text-[var(--color-sage-deep)]">Auth placeholder</h2>
      <p className="text-sm leading-7 text-[var(--color-muted)]">
        Phase 2 will introduce email/password sign-up, login, reset flows, and route protection.
        Phase 1 leaves the route open so the router shape is fixed before auth logic lands.
      </p>
    </section>
  );
}
