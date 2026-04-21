import { describe, expect, it } from "vitest";

import { buildExpectedSlots, buildSlotKey, parseMealLine } from "./stream-parser";

describe("generation stream parser", () => {
  it("parses a valid NDJSON meal line", () => {
    expect(
      parseMealLine(
        JSON.stringify({
          day_of_week: "Monday",
          meal_type: "breakfast",
          title: "Savory oats",
          short_description: "Steel cut oats with eggs and greens.",
          rationale: "ignored by client parser",
        })
      )
    ).toEqual({
      day_of_week: "Monday",
      meal_type: "breakfast",
      title: "Savory oats",
      short_description: "Steel cut oats with eggs and greens.",
    });
  });

  it("returns null for malformed or incomplete payloads", () => {
    expect(parseMealLine("nope")).toBeNull();
    expect(parseMealLine(JSON.stringify({ title: "Missing fields" }))).toBeNull();
    expect(
      parseMealLine(
        JSON.stringify({
          day_of_week: "Funday",
          meal_type: "brunch",
          title: "Wrong",
          short_description: "Wrong",
        })
      )
    ).toBeNull();
  });

  it("builds slot keys and expected slot order from day count and meal types", () => {
    expect(buildSlotKey("Monday", "dinner")).toBe("Monday:dinner");
    expect(buildExpectedSlots(2, ["breakfast", "dinner"])).toEqual([
      "Monday:breakfast",
      "Monday:dinner",
      "Tuesday:breakfast",
      "Tuesday:dinner",
    ]);
  });
});
