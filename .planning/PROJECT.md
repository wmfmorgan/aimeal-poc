# PlanPlate

## What This Is

PlanPlate is an AI-first weekly meal planner for busy households. It generates a personalized weekly draft in seconds, lets users enrich only the meals they care about with real recipe data, and is now moving from feature-complete PoC into production-ready UI refinement.

## Core Value

Users see a complete draft meal plan in under 2 seconds (via streaming), then stay in control of exactly which meals get enriched with full recipes.

## Current Milestone: v1.1 Meal Experience UI Refactor & Polish

**Goal:** Make the app feel production-ready by reducing layout waste, letting the meal plan use more horizontal space, standardizing meal cards across the app, and moving full meal detail into a canonical flyout.

**Target features:**
- Decrease page margins across the app so the layout uses more of the available width, especially on the meal-plan experience
- Refactor the plan page so multi-day plans remain readable when showing 4+ days and up to the full 21-meal view
- Make every meal render as a consistent card, whether it appears in a dense plan grid or a focused single-meal context
- Reduce grid-card content to the essentials: title, status, favorite state, and primary actions
- Remove redundant meal-type labels inside cards when the row or surrounding layout already communicates breakfast, lunch, or dinner
- Open the flyout when a meal card is clicked, and remove the separate `View details` action
- Make the flyout the canonical full-detail view for description, nutrition, ingredients, instructions, and richer meal actions
- Replace `Delete meal` text with a compact icon treatment where appropriate
- Expand cleanup beyond the plan page as needed so flyout, navigation, shared controls, and related meal surfaces feel consistent

## Requirements

### Validated

- ✓ Users can sign up, log in, reset passwords, and stay authenticated across sessions
- ✓ Users can configure a household with members, dietary preferences, avoidances, appliances, and cooking skill
- ✓ Users can generate a 7-day draft meal plan with streaming-first perceived performance
- ✓ Users can revisit a persisted plan, delete meals, and regenerate single slots
- ✓ Users can enrich meals with Spoonacular recipe data and review recipes in a flyout
- ✓ Users can finalize a plan into a shopping list and save enriched meals to a favorites library

### Validated

- ✓ App shell and page containers use production-ready spacing that favors content width over decorative margin — Phase 8
- ✓ Meal cards present the same core information across grid and single-meal contexts — Phase 9
- ✓ Dense grid cards prioritize title, status, and primary actions only — Phase 9
- ✓ Card-click opens flyout, replacing separate View details action — Phase 9
- ✓ Redundant meal-type labels removed from cards in grid context — Phase 9
- ✓ Star favorite affordance moved to flyout — Phase 9

### Active

- [ ] The meal flyout is the canonical detailed meal surface across the app
- [ ] Plan-page and adjacent meal surfaces feel visually consistent, responsive, and easier to scan

### Out of Scope

- New meal-generation logic or model changes — this milestone is UI and interaction focused
- New backend enrichment/favorites capabilities — existing behavior should be reused, not expanded
- Calendar navigation and week-switching — captured in backlog as `999.1`
- Saved-meal input into generation — captured in backlog as `999.2`
- Auth scope changes for `/dev` — captured in backlog as `999.3`
- Production hosting/CI work — still deferred beyond this milestone

## Context

Milestone v1.0 is functionally complete, but the main meal-planning experience still looks and behaves like a PoC. The current plan page becomes cramped beyond roughly 3 days, repeated meal-type labels waste horizontal space, and too much descriptive text remains in dense grid cards.

The intended direction is to make meal information density adaptive without changing the underlying product model: compact cards in the grid, richer detail in the flyout, and consistent meal presentation whether a user is viewing one meal or a full 21-meal week. Global shell spacing also needs tightening so the plan can use more of the viewport.

The existing code already centers the relevant surfaces in `AppFrame`, `MealPlanGrid`, `MealCard`, `MealDetailFlyout`, favorites, and plan-finalization components. This milestone should reuse that structure rather than introduce a second parallel meal-detail pattern.

## Constraints

- **Product**: Preserve the streaming-first draft generation and current meal-plan behaviors — polish cannot regress the core value
- **UI architecture**: Reuse the existing meal-plan, favorites, and flyout flows — refactor toward consistency instead of introducing duplicate surfaces
- **Design system**: Stay within the editorial cookbook visual direction already established in the project
- **Responsiveness**: The plan page must remain readable from mobile through full-width desktop layouts
- **Accessibility**: Clickable meal cards, icon actions, and flyout interactions must remain keyboard- and screen-reader-usable

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Make the flyout the canonical detailed meal view | Rich detail belongs in a focused surface, not repeated in a cramped grid | Phase 10 target |
| Standardize meal cards around a compact core payload | Users should recognize the same meal shape whether viewing 1 or 21 meals | ✓ Phase 9 |
| Reduce global page margins to favor content width | The plan grid needs more usable horizontal space to feel production-ready | ✓ Phase 8 |
| Remove redundant meal-type labels from cards when the layout already communicates context | Repeated labels waste space and add noise in dense multi-day views | ✓ Phase 9 |
| Replace `View details` with card-click behavior | The card itself should be the natural entry point into full meal detail | ✓ Phase 9 |
| Move star favorite affordance from card to flyout | Cards should stay compact; richer actions belong in the focused detail surface | ✓ Phase 9 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-24 after Phase 9*
