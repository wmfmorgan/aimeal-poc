import type { SpoonacularUsageEntry, SpoonacularUsageSummary } from "./types";

type NumericInput = number | string | null | undefined;

export type BuildUsageEventInput = {
  meal_id?: string | null;
  meal_plan_id?: string | null;
  spoonacular_recipe_id?: number | null;
  cache_hit: boolean;
  endpoint: string;
  points_used?: NumericInput;
  quota_request?: NumericInput;
  quota_used?: NumericInput;
  quota_left?: NumericInput;
  created_at?: string | Date;
};

function toInteger(value: NumericInput): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function toIsoString(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toUtcDateString(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10);
}

export function buildUsageEvent(input: BuildUsageEventInput): SpoonacularUsageEntry {
  const createdAt = toIsoString(input.created_at);
  const quotaRequest = toInteger(input.quota_request);
  const quotaUsed = toInteger(input.quota_used);
  const quotaLeft = toInteger(input.quota_left);

  return {
    meal_id: input.meal_id ?? null,
    meal_plan_id: input.meal_plan_id ?? null,
    spoonacular_recipe_id: input.spoonacular_recipe_id ?? null,
    cache_hit: input.cache_hit,
    endpoint: input.endpoint,
    points_used: toInteger(input.points_used) ?? quotaRequest ?? 0,
    quota_request: quotaRequest,
    quota_used: quotaUsed,
    quota_left: quotaLeft,
    usage_date_utc: toUtcDateString(createdAt),
    created_at: createdAt,
  };
}

export function summarizeUsageByUtcDay(
  entries: SpoonacularUsageEntry[],
  dailyLimit = 50
): SpoonacularUsageSummary[] {
  const grouped = new Map<
    string,
    SpoonacularUsageSummary & { latest_created_at: string }
  >();

  for (const entry of entries) {
    const existing = grouped.get(entry.usage_date_utc);
    const derivedDailyLimit =
      entry.quota_used != null && entry.quota_left != null
        ? entry.quota_used + entry.quota_left
        : dailyLimit;

    if (!existing) {
      grouped.set(entry.usage_date_utc, {
        usage_date_utc: entry.usage_date_utc,
        requests_made: entry.cache_hit ? 0 : 1,
        cache_hits: entry.cache_hit ? 1 : 0,
        cache_misses: entry.cache_hit ? 0 : 1,
        points_used: entry.quota_used ?? entry.points_used,
        quota_used: entry.quota_used,
        quota_left: entry.quota_left,
        daily_limit: derivedDailyLimit,
        latest_created_at: entry.created_at,
      });
      continue;
    }

    existing.requests_made += entry.cache_hit ? 0 : 1;
    existing.cache_hits += entry.cache_hit ? 1 : 0;
    existing.cache_misses += entry.cache_hit ? 0 : 1;

    const currentLatest = new Date(existing.latest_created_at).getTime();
    const entryTimestamp = new Date(entry.created_at).getTime();

    if (
      entryTimestamp >= currentLatest &&
      (entry.quota_used != null || entry.quota_left != null)
    ) {
      existing.points_used = entry.quota_used ?? existing.points_used;
      existing.quota_used = entry.quota_used ?? existing.quota_used;
      existing.quota_left = entry.quota_left ?? existing.quota_left;
      existing.daily_limit = derivedDailyLimit;
      existing.latest_created_at = entry.created_at;
    }
  }

  return [...grouped.values()]
    .sort((left, right) => right.usage_date_utc.localeCompare(left.usage_date_utc))
    .map(({ latest_created_at: _latestCreatedAt, ...summary }) => summary);
}
