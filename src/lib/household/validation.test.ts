import { describe, expect, it } from "vitest";

import {
  addTag,
  hasHouseholdErrors,
  removeTag,
  toggleChip,
  validateHousehold,
  validateHouseholdName,
  validateMemberName,
} from "./validation";
import type { MemberDraft } from "./types";

function member(overrides: Partial<MemberDraft> = {}): MemberDraft {
  return {
    name: "Alex",
    allergies: [],
    avoidances: [],
    dietType: "",
    isExpanded: false,
    isConfirmingDelete: false,
    ...overrides,
  };
}

describe("validateHouseholdName", () => {
  it("returns an error for an empty value", () => {
    expect(validateHouseholdName("")).toBe("Household name is required.");
  });

  it("returns an error for whitespace only", () => {
    expect(validateHouseholdName("   ")).toBe("Household name is required.");
  });

  it("returns null for a valid household name", () => {
    expect(validateHouseholdName("The Morgans")).toBeNull();
  });
});

describe("validateMemberName", () => {
  it("returns an error for an empty member name", () => {
    expect(validateMemberName("")).toBe("Member name is required.");
  });

  it("returns an error for whitespace only", () => {
    expect(validateMemberName("   ")).toBe("Member name is required.");
  });

  it("returns null for a valid member name", () => {
    expect(validateMemberName("Alex")).toBeNull();
  });
});

describe("validateHousehold", () => {
  it("returns both errors when name and members are missing", () => {
    expect(validateHousehold("", [])).toEqual({
      name: "Household name is required.",
      members: "Add at least one household member before saving.",
    });
  });

  it("returns a member error when only members are missing", () => {
    expect(validateHousehold("My House", [])).toEqual({
      members: "Add at least one household member before saving.",
    });
  });

  it("returns no errors for a valid household", () => {
    expect(validateHousehold("My House", [member()])).toEqual({});
  });
});

describe("toggleChip", () => {
  it("removes an existing chip", () => {
    expect(toggleChip(["Milk"], "Milk")).toEqual([]);
  });

  it("adds a new chip", () => {
    expect(toggleChip(["Milk"], "Eggs")).toEqual(["Milk", "Eggs"]);
  });
});

describe("addTag", () => {
  it("adds a new tag", () => {
    expect(addTag([], "mushrooms")).toEqual(["mushrooms"]);
  });

  it("does not duplicate an existing tag", () => {
    expect(addTag(["mushrooms"], "mushrooms")).toEqual(["mushrooms"]);
  });

  it("ignores whitespace-only tags", () => {
    expect(addTag(["mushrooms"], "  ")).toEqual(["mushrooms"]);
  });
});

describe("removeTag", () => {
  it("removes the matching tag", () => {
    expect(removeTag(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });
});

describe("hasHouseholdErrors", () => {
  it("returns false for an empty record", () => {
    expect(hasHouseholdErrors({})).toBe(false);
  });

  it("returns true when a field contains an error", () => {
    expect(hasHouseholdErrors({ name: "required" })).toBe(true);
  });
});
