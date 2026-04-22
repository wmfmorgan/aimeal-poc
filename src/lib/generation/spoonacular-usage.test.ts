import { describe, expect, it } from "vitest";

import { buildUsageEvent, summarizeUsageByUtcDay } from "./spoonacular-usage";

describe("spoonacular usage helpers", () => {
  it("normalizes quota headers and derives the UTC usage day", () => {
    expect(
      buildUsageEvent({
        meal_id: "meal-1",
        meal_plan_id: "plan-1",
        spoonacular_recipe_id: 90210,
        cache_hit: false,
        endpoint: "recipes/90210/information",
        quota_request: "3",
        quota_used: "14",
        quota_left: "36",
        created_at: "2026-04-22T23:59:59.000Z",
      })
    ).toEqual({
      meal_id: "meal-1",
      meal_plan_id: "plan-1",
      spoonacular_recipe_id: 90210,
      cache_hit: false,
      endpoint: "recipes/90210/information",
      points_used: 3,
      quota_request: 3,
      quota_used: 14,
      quota_left: 36,
      usage_date_utc: "2026-04-22",
      created_at: "2026-04-22T23:59:59.000Z",
    });
  });

  it("groups usage entries by UTC day and keeps request/cache totals", () => {
    const summaries = summarizeUsageByUtcDay([
      buildUsageEvent({
        cache_hit: false,
        endpoint: "recipes/1/information",
        quota_request: 2,
        quota_used: 10,
        quota_left: 40,
        created_at: "2026-04-22T10:00:00.000Z",
      }),
      buildUsageEvent({
        cache_hit: true,
        endpoint: "cache",
        points_used: 0,
        quota_request: 0,
        quota_used: 10,
        quota_left: 40,
        created_at: "2026-04-22T12:00:00.000Z",
      }),
      buildUsageEvent({
        cache_hit: false,
        endpoint: "recipes/2/information",
        quota_request: 1,
        quota_used: 3,
        quota_left: 47,
        created_at: "2026-04-21T08:00:00.000Z",
      }),
    ]);

    expect(summaries).toEqual([
      {
        usage_date_utc: "2026-04-22",
        requests_made: 1,
        cache_hits: 1,
        cache_misses: 1,
        points_used: 10,
        quota_used: 10,
        quota_left: 40,
        daily_limit: 50,
      },
      {
        usage_date_utc: "2026-04-21",
        requests_made: 1,
        cache_hits: 0,
        cache_misses: 1,
        points_used: 3,
        quota_used: 3,
        quota_left: 47,
        daily_limit: 50,
      },
    ]);
  });

  it("keeps the latest quota snapshot for a day even when older rows are processed later", () => {
    const summaries = summarizeUsageByUtcDay([
      buildUsageEvent({
        cache_hit: false,
        endpoint: "recipes/123/information",
        quota_request: 2,
        quota_used: 14,
        quota_left: 36,
        created_at: "2026-04-22T18:00:00.000Z",
      }),
      buildUsageEvent({
        cache_hit: false,
        endpoint: "recipes/complexSearch",
        quota_request: 1,
        quota_used: 12,
        quota_left: 38,
        created_at: "2026-04-22T10:00:00.000Z",
      }),
    ]);

    expect(summaries).toEqual([
      {
        usage_date_utc: "2026-04-22",
        requests_made: 2,
        cache_hits: 0,
        cache_misses: 2,
        points_used: 14,
        quota_used: 14,
        quota_left: 36,
        daily_limit: 50,
      },
    ]);
  });
});
