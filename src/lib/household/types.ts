/**
 * household/types.ts
 *
 * Type definitions, draft state shapes, UI constants, and copy strings
 * for the household setup surface.
 */

export const BIG_9_ALLERGENS = [
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Tree Nuts",
  "Peanuts",
  "Wheat/Gluten",
  "Soy",
  "Sesame",
] as const;

export type Big9Allergen = (typeof BIG_9_ALLERGENS)[number];

export const DIET_TYPES = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "other", label: "Other" },
] as const;

export const APPLIANCE_PRESETS = [
  "Instant Pot",
  "Air Fryer",
  "Slow Cooker",
  "Wok",
  "Stand Mixer",
  "Blender",
  "Toaster Oven",
  "Grill / BBQ",
  "Sous Vide",
] as const;

export const COOKING_SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;

export type CookingSkillLevel = (typeof COOKING_SKILL_LEVELS)[number];

export type MemberDraft = {
  id?: string;
  name: string;
  allergies: string[];
  avoidances: string[];
  dietType: string;
  isExpanded: boolean;
  isConfirmingDelete: boolean;
};

export type HouseholdDraft = {
  id?: string;
  name: string;
  cookingSkillLevel: CookingSkillLevel | "";
  appliances: string[];
  members: MemberDraft[];
};

export const HOUSEHOLD_COPY = {
  pageEyebrow: "Your Household",
  pageHeading: "Build a household the planner can actually cook for.",
  pageBody:
    "Capture the realities of your kitchen, then keep every household member editable on the same page.",
  basicsEyebrow: "Household Basics",
  basicsHeading: "Household Details",
  basicsBody: "Name the household once, choose a cooking skill level, and keep the structure simple.",
  nameLabel: "Household Name",
  namePlaceholder: "e.g. The Morgans",
  skillLabel: "Cooking Skill Level",
  skillBeginner: "Beginner",
  skillIntermediate: "Intermediate",
  skillAdvanced: "Advanced",
  membersEyebrow: "Who's Eating",
  membersHeading: "Household Members",
  membersBody:
    "Each member keeps their own allergies, avoidances, and diet type so the meal plan can honor real constraints.",
  memberNameLabel: "Name",
  memberNamePlaceholder: "e.g. Alex",
  allergiesLabel: "Allergies",
  allergiesHelper: "Select all that apply. These are treated as strict constraints.",
  allergiesTagPlaceholder: "Add another allergy and press Enter",
  avoidancesLabel: "Avoidances",
  avoidancesHelper: "Strong dislikes, not medical. The planner will avoid these when it can.",
  avoidancesTagPlaceholder: "Type an avoidance and press Enter",
  dietTypeLabel: "Diet Type",
  dietTypePlaceholder: "Select diet type…",
  addMemberCta: "+ Add Member",
  expandMemberAction: "Edit Member",
  collapseMemberAction: "Done Editing",
  deleteMemberAction: "Remove",
  deleteCancelAction: "Cancel",
  deleteConfirmPrompt: "Are you sure you want to remove this member?",
  noConstraints: "No dietary restrictions",
  emptyMembersState: "No members yet. Add at least one person so the AI can personalize your plan.",
  appliancesEyebrow: "Your Kitchen",
  appliancesHeading: "Available Appliances",
  appliancesHelper: "The AI will only suggest recipes that use what you actually have.",
  saveCta: "Save Household",
  saveCtaLoading: "Saving…",
  successBanner: "Household saved. Your meal plans will reflect these preferences.",
  errorBanner: "We couldn't save your household right now. Please try again.",
  validationNameRequired: "Household name is required.",
  validationSkillRequired: "Select a cooking skill level.",
  validationMemberNameRequired: "Member name is required.",
  validationAtLeastOneMember: "Add at least one household member before saving.",
  nudgeHeading: "Set up your household to get personalised plans",
  nudgeBody:
    "Start with the people, allergies, and appliances you actually cook around. You can refine everything later without leaving this page.",
  loadingLabel: "Loading your household…",
} as const;
