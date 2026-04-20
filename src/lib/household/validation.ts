import type { MemberDraft } from "./types";
import { HOUSEHOLD_COPY } from "./types";

export interface HouseholdErrors extends Record<string, string | undefined> {
  name?: string;
  members?: string;
}

export function validateHouseholdName(value: string): string | null {
  if (!value.trim()) return HOUSEHOLD_COPY.validationNameRequired;
  return null;
}

export function validateMemberName(value: string): string | null {
  if (!value.trim()) return HOUSEHOLD_COPY.validationMemberNameRequired;
  return null;
}

export function validateHousehold(name: string, members: MemberDraft[]): HouseholdErrors {
  const errors: HouseholdErrors = {};
  const nameError = validateHouseholdName(name);
  if (nameError) errors.name = nameError;
  if (members.length === 0) errors.members = HOUSEHOLD_COPY.validationAtLeastOneMember;
  return errors;
}

export function toggleChip(selected: string[], value: string): string[] {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}

export function addTag(tags: string[], input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return tags;
  return tags.includes(trimmed) ? tags : [...tags, trimmed];
}

export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((item) => item !== tag);
}

export function hasHouseholdErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((value) => value !== undefined);
}
