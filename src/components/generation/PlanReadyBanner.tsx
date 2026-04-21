import { GENERATION_COPY } from "@/lib/generation/types";

export function PlanReadyBanner() {
  return (
    <p
      className="rounded-xl bg-[rgba(74,103,65,0.10)] px-4 py-3 text-sm leading-6 text-[var(--color-sage-deep)]"
      role="alert"
    >
      {GENERATION_COPY.planReadyBanner}
    </p>
  );
}
