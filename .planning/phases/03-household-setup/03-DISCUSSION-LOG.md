# Phase 3: Household Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 03-household-setup
**Areas discussed:** Setup flow structure, Dietary data entry, Post-setup routing, Member management UX

---

## Setup flow structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrolling page | One page with household basics + members inline. Simple, no step state. | ✓ |
| Multi-step wizard | Step 1: basics. Step 2: members. Step 3: per-member prefs. Progress indicator. | |

**User's choice:** Single scrolling page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, both modes | `/household` detects existing household and pre-fills. Save = create or update. | ✓ |
| Distinct create vs edit | Onboarding feel for first visit; settings page feel for return. More code paths. | |

**User's choice:** Same page, both modes

---

## Dietary data entry

| Option | Description | Selected |
|--------|-------------|----------|
| Free-text tag input | Open-ended tags, user types anything. Best for LLM. | |
| Predefined checkboxes | Fixed list of common allergens. Fast but limited. | |
| Presets + freeform combo | Quick-select chips for common allergens + tag input for custom. | ✓ |

**User's choice:** Presets + freeform combo

---

| Option | Description | Selected |
|--------|-------------|----------|
| Big 9 allergens | FDA-recognized top allergens. Covers 90% of cases. | ✓ |
| Big 9 + common lifestyle | Big 9 plus vegan, vegetarian, halal, kosher, low-FODMAP. | |
| You decide | Pick a sensible preset list. | |

**User's choice:** Big 9 allergens (Milk, Eggs, Fish, Shellfish, Tree nuts, Peanuts, Wheat/Gluten, Soy, Sesame)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Two separate sections | Allergies (medical) + Avoidances (preferences). | |
| One combined 'avoid list' | Merged field, loses medical vs preference distinction. | |
| Three sections: allergies + avoidances + diet type | Full coverage matching DB schema. | ✓ |

**User's choice:** Three sections — Allergies, Avoidances, Diet type

---

## Post-setup routing

| Option | Description | Selected |
|--------|-------------|----------|
| Stay on /household with success state | Save completes, confirmation shown in place. No redirect. | ✓ |
| Redirect to placeholder 'ready' page | Push to /plan or /generate with CTA. | |
| Redirect to /household (self-redirect, edit mode) | URL stays same, state resets. | |

**User's choice:** Stay on /household with success state

---

| Option | Description | Selected |
|--------|-------------|----------|
| Nudge but don't force | Welcome message on first visit; user can skip. | ✓ |
| Required before proceeding | Locked to /household until household created. | |
| No special first-time handling | Blank form, no copy. | |

**User's choice:** Nudge but don't force

---

## Member management UX

| Option | Description | Selected |
|--------|-------------|----------|
| Expandable inline rows | [Edit] expands row in-place with dietary fields. No modal. | ✓ |
| Dialog/modal per member | Edit opens a modal. Compact list but adds modal state. | |

**User's choice:** Expandable inline rows

---

| Option | Description | Selected |
|--------|-------------|----------|
| Soft confirmation + immediate delete | Inline "Are you sure?" before delete. | ✓ |
| Delete immediately, no confirmation | One click removes. | |
| You decide | Standard shadcn destructive action pattern. | |

**User's choice:** Soft confirmation + immediate delete

---

## Claude's Discretion

- Exact diet_type dropdown values
- Welcome nudge copy, success banner text, validation error messages
- Allergen chip visual pattern (toggle/pill vs checkbox)
- Appliances input pattern

## Deferred Ideas

- Household sharing (v2.0)
- Macro/calorie targets (v2.5)
- Member photo/avatar (post-PoC)
- Import dietary preferences from external source (v1 out of scope)
