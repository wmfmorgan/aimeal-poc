import { useLlmLogs } from "@/hooks/use-llm-logs";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DevPage() {
  const { logs, isLoading, error } = useLlmLogs();

  return (
    <div className="space-y-8">
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
          Dev Tools
        </p>
        <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">
          LLM Requests
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Last 10 LLM calls made during draft generation.
        </p>

        <div className="mt-6 space-y-4">
          {isLoading && <p className="text-sm text-[var(--color-muted)]">Loading…</p>}
          {error && (
            <p className="rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
              Failed to load LLM logs.
            </p>
          )}
          {!isLoading && !error && logs.length === 0 && (
            <p className="text-sm text-[var(--color-muted)]">
              No LLM calls yet. Generate a plan to see logs here.
            </p>
          )}

          {logs.map((log) => {
            const totalTokens = (log.prompt_tokens ?? 0) + (log.completion_tokens ?? 0);

            return (
              <div
                key={log.id}
                className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                  <span className="text-sm font-semibold text-[var(--color-ink)]">{log.model}</span>
                  <span className="shrink-0 text-xs text-[var(--color-muted)]">
                    {totalTokens.toLocaleString()} tokens · {formatTimestamp(log.created_at)}
                  </span>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-[var(--color-muted)] hover:text-[var(--color-sage-deep)]">
                    View prompt / response
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        Prompt
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs leading-5 text-[var(--color-ink)]">
                        {log.prompt}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        Response
                      </p>
                      <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs leading-5 text-[var(--color-ink)]">
                        {log.response}
                      </pre>
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-8 py-8 shadow-[var(--shadow-soft)] backdrop-blur-sm opacity-50">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
          Dev Tools
        </p>
        <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">
          Spoonacular Usage
        </h2>
        <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">Coming in Phase 6.</p>
      </section>
    </div>
  );
}
