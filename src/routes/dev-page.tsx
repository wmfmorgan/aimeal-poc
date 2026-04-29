import { useLlmLogs } from "@/hooks/use-llm-logs";
import { useSpoonacularUsage } from "@/hooks/use-spoonacular-usage";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function DevPage() {
  const { logs, isLoading, error } = useLlmLogs();
  const { usage, isLoading: isUsageLoading, error: usageError } = useSpoonacularUsage();

  return (
    <div className="space-y-6 md:space-y-7" data-testid="dev-page-layout">
      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
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

      <section className="rounded-[1.75rem] bg-[rgba(255,255,255,0.72)] px-6 py-6 shadow-[var(--shadow-soft)] backdrop-blur-sm md:px-7 md:py-6">
        <p className="text-xs uppercase tracking-[0.26em] text-[var(--color-muted)]">
          Dev Tools
        </p>
        <h2 className="mt-3 font-display text-4xl leading-tight text-[var(--color-sage-deep)]">
          Spoonacular Usage
        </h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
          Today&apos;s usage, cache posture, and recent per-call quota activity.
        </p>

        {isUsageLoading ? <p className="mt-6 text-sm text-[var(--color-muted)]">Loading…</p> : null}
        {usageError ? (
          <p className="mt-6 rounded-xl bg-[rgba(128,59,38,0.08)] px-4 py-3 text-sm text-[#803b26]" role="alert">
            Failed to load Spoonacular usage.
          </p>
        ) : null}

        {usage ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Today&apos;s usage</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">
                  {usage.today.points_used} / {usage.today.daily_limit}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Requests made</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">{usage.today.requests_made}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Cache hits</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">{usage.today.cache_hits}</p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Cache misses</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">{usage.today.cache_misses}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">First-call hit rate</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">
                  {formatPercent(usage.kpis.firstCallHitRate)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {usage.kpis.firstCallDenominator} live enrichments
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Enum drop rate</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">
                  {formatPercent(usage.kpis.enumDropRate)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {usage.kpis.enumDropDenominator} emitted enum values
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Empty instructions rate</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-sage-deep)]">
                  {formatPercent(usage.kpis.emptyInstructionsRate)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {usage.kpis.emptyInstructionsDenominator} cached recipes
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {usage.recent.map((entry) => (
                <div
                  key={`${entry.created_at}-${entry.endpoint}`}
                  className="rounded-[1.25rem] border border-[rgba(74,103,65,0.12)] bg-white/60 px-5 py-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{entry.endpoint}</span>
                    <span className="text-xs text-[var(--color-muted)]">
                      {entry.cache_hit ? "Cache hit" : "Live call"} · {formatTimestamp(entry.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    {entry.points_used} points · quota used {entry.quota_used ?? "—"} · quota left {entry.quota_left ?? "—"}
                  </p>
                  {(entry.request_text || entry.response_text) ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs text-[var(--color-muted)] hover:text-[var(--color-sage-deep)]">
                        View request / response
                      </summary>
                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Request
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs leading-5 text-[var(--color-ink)]">
                            {entry.request_text ?? "No request payload captured."}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                            Response
                          </p>
                          <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs leading-5 text-[var(--color-ink)]">
                            {entry.response_text ?? "No response payload captured."}
                          </pre>
                        </div>
                      </div>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
