export function SkeletonMealCard() {
  return (
    <article className="animate-pulse rounded-[1.5rem] bg-white/70 p-6">
      <div className="h-3 w-16 rounded bg-[rgba(74,103,65,0.12)]" />
      <div className="mt-2 h-5 w-3/4 rounded bg-[rgba(74,103,65,0.12)]" />
      <div className="mt-2 h-3 w-full rounded bg-[rgba(74,103,65,0.08)]" />
      <div className="mt-1 h-3 w-5/6 rounded bg-[rgba(74,103,65,0.08)]" />
    </article>
  );
}
