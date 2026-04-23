import type { ShoppingListGroup as ShoppingListGroupType } from "@/lib/generation/types";

type ShoppingListGroupProps = {
  group: ShoppingListGroupType;
};

export function ShoppingListGroup({ group }: ShoppingListGroupProps) {
  return (
    <section className="rounded-[1.5rem] bg-white/72 p-6">
      <h3 className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
        {group.heading}
      </h3>
      <ul className="mt-4 space-y-3">
        {group.items.map((item) => (
          <li key={item.key} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-sage-deep)]">{item.name}</p>
              {item.originalExamples[0] ? (
                <p className="text-sm leading-7 text-[var(--color-muted)]">{item.originalExamples[0]}</p>
              ) : null}
            </div>
            <span className="shrink-0 text-sm font-semibold text-[var(--color-ink)]">
              {item.quantityLabel}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
